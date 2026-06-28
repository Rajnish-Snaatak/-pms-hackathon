import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'

export default function SignupPage() {
  const createOrganization = useStore((s) => s.createOrganization)

  const [orgName, setOrgName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await createOrganization({ orgName, name, email, password })
    setBusy(false)
    // On success the store signs the admin in and the app renders automatically.
    if (error) setError(error)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-2xl font-extrabold tracking-tight">
            <span className="text-ink">Perf</span>
            <span className="text-brand">Trail</span>
          </span>
          <p className="mt-1 text-sm text-ink-muted">Create your organization</p>
        </div>

        <form onSubmit={onSubmit} className="card p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Set up your workspace
          </p>

          {error && (
            <div className="rounded-lg border-l-[3px] border-l-danger bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">
              {error}
            </div>
          )}

          <div>
            <label className="label">Organization name</label>
            <input
              className="input"
              placeholder="e.g. Acme Corp"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Your name</label>
            <input
              className="input"
              placeholder="e.g. Jordan Lee"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Work email</label>
            <input
              type="email"
              autoComplete="username"
              className="input"
              placeholder="you@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="input"
              placeholder="min 6 characters"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Create organization'}
          </button>

          <p className="text-center text-xs text-ink-muted">
            You'll be the admin (HR) and can invite your team from the People page.
          </p>
        </form>

        <p className="mt-4 text-center text-xs text-ink-faint">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
