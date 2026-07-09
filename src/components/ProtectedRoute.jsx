import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function ProtectedRoute({ children }) {
  const { loading, user, isAdmin, isFullyAuthed, needsMfaChallenge, aal } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ash text-ink/50 text-sm">
        Loading…
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />
  }

  if (needsMfaChallenge) {
    return <Navigate to="/login" replace />
  }

  // Admin, no MFA factor enrolled yet at all — force them to set one up.
  if (aal && aal.currentLevel === 'aal1' && aal.nextLevel === 'aal1') {
    return <Navigate to="/mfa-setup" replace />
  }

  if (!isFullyAuthed) {
    return <Navigate to="/login" replace />
  }

  return children
}
