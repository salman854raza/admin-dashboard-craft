import { supabase } from './supabaseClient'

// Calls our Vercel serverless functions under /api. We pass the admin's own
// Supabase access token in the Authorization header; the function verifies it
// server-side (and re-checks app_metadata.role === 'admin' and aal2) before
// touching anything with the service_role key. The service_role key itself
// never leaves the server.
export async function apiGet(path) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(`/api/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.json()
}
