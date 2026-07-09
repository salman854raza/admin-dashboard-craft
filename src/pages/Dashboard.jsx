import { useEffect, useState, useCallback } from 'react'
import { apiGet } from '../lib/api'
import { supabase } from '../lib/supabaseClient'
import StatCard from '../components/StatCard'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await apiGet('stats')
      setStats(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Live-refresh counts whenever a new message or newsletter signup arrives.
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, load)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'newsletter_subscribers' },
        load
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load])

  return (
    <div>
      <h1 className="text-xl font-serif mb-1">Overview</h1>
      <p className="text-sm text-ink/50 mb-6">Live snapshot of Ashlar Studio activity.</p>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-ink/40">Loading stats…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total registered users" value={stats?.totalUsers} />
            <StatCard label="New signups today" value={stats?.signupsToday} />
            <StatCard label="New signups this week" value={stats?.signupsThisWeek} />
            <StatCard label="Active users" value={stats?.confirmedUsers} sublabel="Email confirmed" />
            <StatCard
              label="Unconfirmed users"
              value={stats?.unconfirmedUsers}
              sublabel="Awaiting confirmation"
            />
            <StatCard label="Total messages" value={stats?.totalMessages} />
            <StatCard label="New messages today" value={stats?.messagesToday} />
            <StatCard label="Newsletter subscribers" value={stats?.newsletterSubscribers} />
          </div>
        </>
      )}
    </div>
  )
}
