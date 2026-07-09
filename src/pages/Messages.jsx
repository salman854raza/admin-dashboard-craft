import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const STATUSES = ['new', 'contacted', 'qualified', 'closed']
const STATUS_COLORS = {
  new: 'bg-blue-50 text-blue-700',
  contacted: 'bg-amber-50 text-amber-700',
  qualified: 'bg-purple-50 text-purple-700',
  closed: 'bg-green-50 text-green-700',
}

export default function Messages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
    setMessages(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('messages-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? messages : messages.filter((m) => m.status === filter)),
    [messages, filter]
  )

  async function updateStatus(id, status) {
    // Optimistic update
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)))
    if (selected?.id === id) setSelected((s) => ({ ...s, status }))
    const { error } = await supabase.from('messages').update({ status }).eq('id', id)
    if (error) load() // revert on failure by refetching
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-serif mb-1">Messages</h1>
          <p className="text-sm text-ink/50">{messages.length} total, updating live</p>
        </div>
        <div className="flex gap-1">
          {['all', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border capitalize ${
                filter === s
                  ? 'bg-ink text-white border-ink'
                  : 'border-line text-ink/60 hover:bg-ash'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-ash/60 text-left text-ink/60">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Project type</th>
              <th className="px-4 py-2 font-medium">Message</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                  No messages.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0 hover:bg-ash/40">
                  <td className="px-4 py-2 cursor-pointer" onClick={() => setSelected(m)}>
                    {m.name}
                  </td>
                  <td className="px-4 py-2 cursor-pointer" onClick={() => setSelected(m)}>
                    {m.email}
                  </td>
                  <td className="px-4 py-2 cursor-pointer" onClick={() => setSelected(m)}>
                    {m.project_type}
                  </td>
                  <td
                    className="px-4 py-2 max-w-xs truncate cursor-pointer"
                    onClick={() => setSelected(m)}
                  >
                    {m.message}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={m.status}
                      onChange={(e) => updateStatus(m.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-xs rounded-full px-2 py-1 border-0 capitalize ${STATUS_COLORS[m.status] || 'bg-ash'}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-ink/50">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <MessageModal
          message={selected}
          onClose={() => setSelected(null)}
          onStatusChange={updateStatus}
        />
      )}
    </div>
  )
}

function MessageModal({ message, onClose, onStatusChange }) {
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <div className="font-medium">{message.name}</div>
            <div className="text-xs text-ink/50">{message.email}</div>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-sm">
            Close ✕
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="text-xs text-ink/50">
            {message.project_type} · {new Date(message.created_at).toLocaleString()}
          </div>
          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
          <div className="flex items-center gap-2 pt-2">
            <label className="text-xs text-ink/50">Status</label>
            <select
              value={message.status}
              onChange={(e) => onStatusChange(message.id, e.target.value)}
              className={`text-xs rounded-full px-2 py-1 border-0 capitalize ${STATUS_COLORS[message.status] || 'bg-ash'}`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-line">
          <a
            href={`mailto:${message.email}?subject=${encodeURIComponent(
              `Re: your enquiry with Ashlar Studio`
            )}`}
            className="inline-block bg-ink text-white rounded-md px-4 py-2 text-sm hover:bg-brass-dark"
          >
            Reply by email
          </a>
        </div>
      </div>
    </div>
  )
}
