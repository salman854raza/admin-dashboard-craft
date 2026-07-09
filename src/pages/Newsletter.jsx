import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Newsletter() {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false })
    setSubs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('newsletter-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'newsletter_subscribers' },
        load
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  function exportCsv() {
    const header = ['email', 'status', 'subscribed_at']
    const rows = subs.map((s) => [s.email, s.status, s.subscribed_at])
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const active = subs.filter((s) => s.status === 'active').length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-serif mb-1">Newsletter</h1>
          <p className="text-sm text-ink/50">
            {subs.length} total · {active} active
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={subs.length === 0}
          className="text-sm bg-ink text-white rounded-md px-4 py-2 hover:bg-brass-dark disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-ash/60 text-left text-ink/60">
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-ink/40">
                  Loading…
                </td>
              </tr>
            ) : subs.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-ink/40">
                  No subscribers yet.
                </td>
              </tr>
            ) : (
              subs.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2">{s.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        s.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-ink/5 text-ink/50'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-ink/50">
                    {new Date(s.subscribed_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
