import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function LoginPage() {
  const signIn = useStore((s) => s.signIn)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError(error)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-2xl font-extrabold tracking-tight">
            <span className="text-ink">Perf</span>
            <span className="text-brand">Trail</span>
          </span>
          <p className="mt-1 text-sm text-ink-muted">
            Performance Management System · Opstree
          </p>
        </div>

        <form onSubmit={onSubmit} className="card p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Sign in
          </p>

          {error && (
            <div className="rounded-lg border-l-[3px] border-l-danger bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">
              {error}
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              autoComplete="username"
              className="input"
              placeholder="you@perftrail.demo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-faint">
          Accounts are managed by HR. Contact your administrator for access.
        </p>
      </div>
    </div>
  )
}
