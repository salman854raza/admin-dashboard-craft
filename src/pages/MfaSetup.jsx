import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

// Run once per admin account: after signing in with just a password (aal1),
// visit /mfa-setup to enroll an authenticator app (Google Authenticator / Authy).
// Once a TOTP factor exists, future logins require it — this page becomes moot.
export default function MfaSetup() {
  const { user, aal, refreshAal } = useAuth()
  const navigate = useNavigate()

  const [enrollment, setEnrollment] = useState(null) // { factorId, qrCode, secret }
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    // Already enrolled and verified — nothing to do here.
    if (aal && aal.currentLevel === 'aal2') {
      setDone(true)
      return
    }
    enroll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function enroll() {
    setError('')
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const existingUnverified = factors?.totp?.find((f) => f.status === 'unverified')
    if (existingUnverified) {
      await supabase.auth.mfa.unenroll({ factorId: existingUnverified.id })
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (enrollError) {
      setError(enrollError.message)
      return
    }
    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    })
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollment.factorId,
      })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: challenge.id,
        code: code.trim(),
      })
      if (verifyError) throw verifyError

      await refreshAal()
      setDone(true)
    } catch (err) {
      setError(err.message || 'Verification failed. Check the code and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ash px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-serif mb-2">Two-factor authentication is active</h1>
          <p className="text-sm text-ink/60 mb-6">
            This account now requires an authenticator code on every sign-in.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-ink text-white rounded-md px-4 py-2 text-sm hover:bg-brass-dark"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ash px-4">
      <div className="w-full max-w-sm bg-white border border-line rounded-lg p-6 shadow-sm">
        <h1 className="text-lg font-serif mb-1">Set up two-factor authentication</h1>
        <p className="text-sm text-ink/60 mb-4">
          Scan this with Google Authenticator or Authy, then enter the 6-digit code to confirm.
        </p>

        {enrollment ? (
          <>
            <img
              src={enrollment.qrCode}
              alt="TOTP QR code"
              className="mx-auto mb-3 border border-line rounded-md"
              width={200}
              height={200}
            />
            <p className="text-xs text-ink/50 text-center mb-4 break-all">
              Manual key: <span className="font-mono">{enrollment.secret}</span>
            </p>

            <form onSubmit={handleVerify} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full border border-line rounded-md px-3 py-2 text-center text-lg tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-brass/40"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full bg-ink text-white rounded-md py-2 text-sm font-medium hover:bg-brass-dark disabled:opacity-50"
              >
                {busy ? 'Confirming…' : 'Confirm & activate'}
              </button>
            </form>
          </>
        ) : (
          error && <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  )
}
