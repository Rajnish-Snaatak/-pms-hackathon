import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_url') {
  // Surfaced in the console so a missing .env is obvious during the hackathon.
  console.warn(
    '[PerfTrail] Supabase env vars missing. Set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY in .env, then restart the dev server.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
