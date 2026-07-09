import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../lib/api'
import { supabase } from '../lib/supabaseClient'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'created_at', dir: 'desc' })
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    apiGet('users')
      .then((data) => setUsers(data.users || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let rows = users
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.full_name?.toLowerCase().includes(q)
      )
    }
    const sorted = [...rows].sort((a, b) => {
      const av = a[sort.key] ?? ''
      const bv = b[sort.key] ?? ''
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [users, search, sort])

  function toggleSort(key) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )
  }

  const columns = [
    { key: 'username', label: 'Username' },
    { key: 'full_name', label: 'Full name' },
    { key: 'email', label: 'Email' },
    { key: 'created_at', label: 'Joined' },
    { key: 'confirmed', label: 'Status' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-serif mb-1">Users</h1>
          <p className="text-sm text-ink/50">{users.length} registered</p>
        </div>
        <input
          type="text"
          placeholder="Search username, name, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-line rounded-md px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-brass/40"
        />
      </div>

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-ash/60">
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className="text-left px-4 py-2 font-medium text-ink/60 cursor-pointer select-none"
                >
                  {c.label} {sort.key === c.key ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className="border-b border-line last:border-0 hover:bg-ash/40 cursor-pointer"
                >
                  <td className="px-4 py-2">{u.username || '—'}</td>
                  <td className="px-4 py-2">{u.full_name || '—'}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        u.confirmed
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {u.confirmed ? 'Confirmed' : 'Unconfirmed'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && <UserMessagesModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function UserMessagesModal({ user, onClose }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('messages')
      .select('*')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMessages(data || []))
      .finally(() => setLoading(false))
  }, [user])

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <div className="font-medium">{user.full_name || user.username || user.email}</div>
            <div className="text-xs text-ink/50">{user.email}</div>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-sm">
            Close ✕
          </button>
        </div>
        <div className="p-5 space-y-3">
          {loading ? (
            <div className="text-sm text-ink/40">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-ink/40">No messages submitted by this user.</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="border border-line rounded-md p-3">
                <div className="flex justify-between text-xs text-ink/50 mb-1">
                  <span>{m.project_type}</span>
                  <span>{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm">{m.message}</p>
                <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-ash text-ink/60">
                  {m.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
