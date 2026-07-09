import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const { signInWithPassword, needsMfaChallenge, refreshAal, isFullyAuthed } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isFullyAuthed) {
    navigate('/', { replace: true })
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signInWithPassword(email, password)
    } catch (err) {
      setError(err.message || 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleMfaSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) throw factorsError
      const totpFactor = factors.totp?.[0]
      if (!totpFactor) throw new Error('No TOTP factor enrolled for this account yet.')

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: code.trim(),
      })
      if (verifyError) throw verifyError

      await refreshAal()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Verification failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ash px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs tracking-[0.3em] uppercase text-brass-dark">Ashlar Studio</div>
          <h1 className="text-2xl font-serif mt-1">Admin Dashboard</h1>
        </div>

        <div className="bg-white border border-line rounded-lg p-6 shadow-sm">
          {!needsMfaChallenge ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1 text-ink/70">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass/40"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-ink/70">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass/40"
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-ink text-white rounded-md py-2 text-sm font-medium hover:bg-brass-dark transition-colors disabled:opacity-50"
              >
                {busy ? 'Signing in…' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <p className="text-sm text-ink/70">
                Enter the 6-digit code from your authenticator app.
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-line rounded-md px-3 py-2 text-center text-lg tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-brass/40"
                autoFocus
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full bg-ink text-white rounded-md py-2 text-sm font-medium hover:bg-brass-dark transition-colors disabled:opacity-50"
              >
                {busy ? 'Verifying…' : 'Verify'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-ink/40 mt-6">
          First time signing in? Enrolling a new authenticator app requires the{' '}
          <span className="font-mono">/mfa-setup</span> route, run once from a trusted device.
        </p>
      </div>
    </div>
  )
}
