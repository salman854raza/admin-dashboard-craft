import { getServiceClient } from './_lib/supabaseAdmin.js'
import { requireAdmin } from './_lib/verifyAdmin.js'

async function listAllUsers(admin) {
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
  const user = await requireAdmin(req, res)
  if (!user) return

  try {
    const admin = getServiceClient()

    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setUTCHours(0, 0, 0, 0)
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay())

    const users = await listAllUsers(admin)
    const totalUsers = users.length
    const confirmedUsers = users.filter((u) => !!u.email_confirmed_at).length
    const unconfirmedUsers = totalUsers - confirmedUsers
    const signupsToday = users.filter((u) => new Date(u.created_at) >= startOfToday).length
    const signupsThisWeek = users.filter((u) => new Date(u.created_at) >= startOfWeek).length

    const [
      { count: totalMessages },
      { count: messagesToday },
      { count: newsletterSubscribers },
    ] = await Promise.all([
      admin.from('messages').select('*', { count: 'exact', head: true }),
      admin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfToday.toISOString()),
      admin.from('newsletter_subscribers').select('*', { count: 'exact', head: true }),
    ])

    res.status(200).json({
      totalUsers,
      confirmedUsers,
      unconfirmedUsers,
      signupsToday,
      signupsThisWeek,
      totalMessages: totalMessages ?? 0,
      messagesToday: messagesToday ?? 0,
      newsletterSubscribers: newsletterSubscribers ?? 0,
    })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load stats' })
  }
}
