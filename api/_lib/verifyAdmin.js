import { getAnonClient } from './supabaseAdmin.js'

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    const json = Buffer.from(payload, 'base64url').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Every /api function calls this first. It:
// 1. Requires a Bearer access token (the admin's own session token — never the service key)
// 2. Verifies the token's signature is valid by asking Supabase to resolve the user
// 3. Confirms app_metadata.role === 'admin' (server-set, not user-editable)
// 4. Confirms the session actually completed TOTP (aal2), not just a password step
export async function requireAdmin(req, res) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' })
    return null
  }

  const anon = getAnonClient()
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data?.user) {
    res.status(401).json({ error: 'Invalid or expired session' })
    return null
  }

  const user = data.user
  if (user.app_metadata?.role !== 'admin') {
    res.status(403).json({ error: 'Not authorized' })
    return null
  }

  const payload = decodeJwtPayload(token)
  if (payload?.aal !== 'aal2') {
    res.status(403).json({ error: 'Two-factor verification required' })
    return null
  }

  return user
}
