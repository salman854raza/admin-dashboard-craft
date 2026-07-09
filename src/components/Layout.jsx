import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const links = [
  { to: '/', label: 'Overview', end: true },
  { to: '/users', label: 'Users' },
  { to: '/messages', label: 'Messages' },
  { to: '/newsletter', label: 'Newsletter' },
]

export default function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen flex bg-ash">
      <aside className="w-56 shrink-0 border-r border-line bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-line">
          <div className="text-[10px] tracking-[0.3em] uppercase text-brass-dark">Ashlar Studio</div>
          <div className="text-sm font-serif mt-0.5">Admin</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-ink text-white' : 'text-ink/70 hover:bg-ash'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-line">
          <div className="text-xs text-ink/50 px-3 mb-2 truncate">{user?.email}</div>
          <button
            onClick={signOut}
            className="w-full text-left rounded-md px-3 py-2 text-sm text-ink/70 hover:bg-ash"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
