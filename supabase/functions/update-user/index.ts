// PerfTrail — update-user Edge Function
// Lets an authenticated HR or Manager edit an account (profile + optional
// password) server-side. Enforces who-can-edit-whom.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'Not authenticated' }, 401)

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: uErr,
    } = await userClient.auth.getUser()
    if (uErr || !user) return json({ error: 'Invalid session' }, 401)

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: caller } = await admin
      .from('users')
      .select('id, role, team_id')
      .eq('auth_id', user.id)
      .single()
    if (!caller) return json({ error: 'No profile linked to caller' }, 403)

    const body = await req.json().catch(() => ({}))
    const targetId = body.id ?? ''
    if (!targetId) return json({ error: 'Missing user id' }, 400)

    const { data: target } = await admin
      .from('users')
      .select('id, role, team_id, auth_id')
      .eq('id', targetId)
      .single()
    if (!target) return json({ error: 'User not found' }, 404)

    // Permission: HR edits anyone; Manager edits employees on their own team.
    const canEdit =
      caller.role === 'hr'
        ? true
        : caller.role === 'manager'
        ? target.role === 'employee' && target.team_id === caller.team_id
        : false
    if (!canEdit)
      return json({ error: `A ${caller.role} cannot edit this ${target.role}.` }, 403)

    // Build the profile update from allowed fields.
    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim()
      updates.initials = body.name
        .trim()
        .split(/\s+/)
        .map((p: string) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    }
    if (body.title !== undefined) updates.title = (body.title ?? '').trim() || null

    // Role/team changes — only HR may reassign role; managers keep employees
    // on their own team.
    if (caller.role === 'hr') {
      if (body.role) {
        if (!['employee', 'manager', 'hr'].includes(body.role))
          return json({ error: 'Invalid role' }, 400)
        // Don't let an HR demote themselves (avoid locking out admin access).
        if (target.id === caller.id && body.role !== 'hr')
          return json({ error: 'You cannot change your own role.' }, 400)
        updates.role = body.role
      }
      if (body.team_id !== undefined) updates.team_id = body.team_id || null
    }

    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await admin
        .from('users')
        .update(updates)
        .eq('id', target.id)
      if (upErr) return json({ error: upErr.message }, 400)
    }

    // Optional password reset.
    if (body.password) {
      if (String(body.password).length < 6)
        return json({ error: 'Password must be at least 6 characters' }, 400)
      if (target.auth_id) {
        const { error: pwErr } = await admin.auth.admin.updateUserById(
          target.auth_id,
          { password: body.password }
        )
        if (pwErr) return json({ error: pwErr.message }, 400)
      }
    }

    const { data: fresh } = await admin
      .from('users')
      .select('*')
      .eq('id', target.id)
      .single()

    return json({ user: fresh }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
