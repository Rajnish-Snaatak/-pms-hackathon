// PerfTrail — create-user Edge Function
// Lets an authenticated HR or Manager create new accounts (auth + profile)
// server-side with the service role key. Enforces who-can-create-whom.
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

    // Identify the caller from their JWT.
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

    // Look up the caller's profile (role decides permissions).
    const { data: caller } = await admin
      .from('users')
      .select('role, team_id')
      .eq('auth_id', user.id)
      .single()
    if (!caller) return json({ error: 'No profile linked to caller' }, 403)

    const body = await req.json().catch(() => ({}))
    const name = (body.name ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    const password = body.password ?? ''
    const role = body.role ?? ''
    const title = (body.title ?? '').trim() || null
    const reqTeamId = body.team_id ?? null

    if (!name || !email || !password || !role)
      return json({ error: 'name, email, password and role are required' }, 400)
    if (!['employee', 'manager', 'hr'].includes(role))
      return json({ error: 'Invalid role' }, 400)
    if (password.length < 6)
      return json({ error: 'Password must be at least 6 characters' }, 400)

    // Permission matrix: HR creates anyone; Manager creates employees only.
    const allowed =
      caller.role === 'hr'
        ? ['employee', 'manager', 'hr']
        : caller.role === 'manager'
        ? ['employee']
        : []
    if (!allowed.includes(role))
      return json({ error: `A ${caller.role} cannot create a ${role}.` }, 403)

    // Managers can only add into their own team.
    const team_id = caller.role === 'manager' ? caller.team_id : reqTeamId

    // Create the auth user (confirmed so they can log in immediately).
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    })
    if (cErr) return json({ error: cErr.message }, 400)

    const initials = name
      .split(/\s+/)
      .map((p: string) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    const { data: profile, error: pErr } = await admin
      .from('users')
      .insert({ name, email, role, team_id, title, initials, auth_id: created.user.id })
      .select()
      .single()

    if (pErr) {
      // Roll back the auth user if the profile insert failed.
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: pErr.message }, 400)
    }

    return json({ user: profile }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
