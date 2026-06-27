// PerfTrail — delete-user Edge Function
// Lets an authenticated HR or Manager remove an account (profile + auth user)
// server-side. Enforces who-can-delete-whom and cleans up related rows.
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
      .select('id, role, team_id, name, auth_id')
      .eq('id', targetId)
      .single()
    if (!target) return json({ error: 'User not found' }, 404)

    if (target.id === caller.id)
      return json({ error: 'You cannot delete your own account.' }, 400)

    // Permission matrix.
    const canDelete =
      caller.role === 'hr'
        ? true
        : caller.role === 'manager'
        ? target.role === 'employee' && target.team_id === caller.team_id
        : false
    if (!canDelete)
      return json(
        { error: `A ${caller.role} cannot delete this ${target.role}.` },
        403
      )

    // Clean up rows that reference this user (FKs would otherwise block it).
    await admin.from('events').delete().eq('employee_id', target.id)
    await admin.from('goals').delete().eq('employee_id', target.id)
    await admin.from('reviews').delete().eq('employee_id', target.id)
    await admin.from('reviews').delete().eq('manager_id', target.id)
    await admin.from('team_members').delete().eq('user_id', target.id)

    const { error: delErr } = await admin.from('users').delete().eq('id', target.id)
    if (delErr) return json({ error: delErr.message }, 400)

    // Remove the auth user too (ignore if already gone).
    if (target.auth_id) {
      await admin.auth.admin.deleteUser(target.auth_id).catch(() => {})
    }

    return json({ id: target.id, name: target.name }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
