// PerfTrail — create-organization Edge Function (public signup)
// Creates a brand-new organization plus its first admin (HR) account.
// Runs with the service role; rolls back cleanly if any step fails.
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

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'org'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const body = await req.json().catch(() => ({}))
    const orgName = (body.orgName ?? '').trim()
    const name = (body.name ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    const password = body.password ?? ''

    if (!orgName || !name || !email || !password)
      return json(
        { error: 'Organization name, your name, email and password are required' },
        400
      )
    if (password.length < 6)
      return json({ error: 'Password must be at least 6 characters' }, 400)

    // Unique slug for the org.
    const base = slugify(orgName)
    let slug = base
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await admin
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (!clash) break
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`
    }

    // 1. Create the organization.
    const { data: org, error: orgErr } = await admin
      .from('organizations')
      .insert({ name: orgName, slug })
      .select()
      .single()
    if (orgErr) return json({ error: orgErr.message }, 400)

    // 2. Create the first admin (HR) auth user.
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'hr' },
      app_metadata: { organization_id: org.id, role: 'hr' },
    })
    if (cErr) {
      await admin.from('organizations').delete().eq('id', org.id)
      const msg = /registered|already/i.test(cErr.message)
        ? 'That email is already in use. Try signing in instead.'
        : cErr.message
      return json({ error: msg }, 400)
    }

    // 3. Create the admin profile.
    const initials = name
      .split(/\s+/)
      .map((p: string) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    const { data: profile, error: pErr } = await admin
      .from('users')
      .insert({
        name,
        email,
        role: 'hr',
        title: 'Administrator',
        initials,
        auth_id: created.user.id,
        organization_id: org.id,
      })
      .select()
      .single()

    if (pErr) {
      await admin.auth.admin.deleteUser(created.user.id)
      await admin.from('organizations').delete().eq('id', org.id)
      return json({ error: pErr.message }, 400)
    }

    return json({ organization: org, user: profile }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
