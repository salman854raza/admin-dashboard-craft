import { createClient } from '@supabase/supabase-js'

// This client uses the service_role key and must NEVER be imported into
// anything that ships to the browser. It only ever runs inside /api
// serverless functions on Vercel's server.
export function getServiceClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Server misconfigured: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// A plain anon-key client, used only to validate a caller's access token
// (auth.getUser verifies the JWT signature against Supabase).
export function getAnonClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY_SERVER || process.env.VITE_SUPABASE_ANON_KEY
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
