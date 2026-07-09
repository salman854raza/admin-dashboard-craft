import { getServiceClient } from './_lib/supabaseAdmin.js'
import { requireAdmin } from './_lib/verifyAdmin.js'

async function listAllAuthUsers(admin) {
  const perPage = 1000
  let page = 1
  let all = []
  for (let i = 0; i < 10; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    all = all.concat(data.users)
    if (data.users.length < perPage) break
    page += 1
  }
  return all
}

export default async function handler(req, res) {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return

  try {
    const admin = getServiceClient()

    const [authUsers, { data: profiles, error: profilesError }] = await Promise.all([
      listAllAuthUsers(admin),
      admin.from('profiles').select('id, username, full_name, created_at'),
    ])
    if (profilesError) throw profilesError

    const profileById = new Map((profiles || []).map((p) => [p.id, p]))

    const users = authUsers.map((u) => {
      const profile = profileById.get(u.id)
      return {
        id: u.id,
        email: u.email,
        username: profile?.username || null,
        full_name: profile?.full_name || null,
        created_at: u.created_at,
        confirmed: !!u.email_confirmed_at,
      }
    })

    res.status(200).json({ users })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load users' })
  }
}
