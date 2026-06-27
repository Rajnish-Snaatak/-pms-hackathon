import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function ChangePasswordModal({ onClose }) {
  const changePassword = useStore((s) => s.changePassword)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (next.length < 6) return setError('New password must be at least 6 characters.')
    if (next !== confirm) return setError('New passwords do not match.')
    if (next === current) return setError('New password must differ from the current one.')

    setBusy(true)
    const { error } = await changePassword(current, next)
    setBusy(false)
    if (error) return setError(error)
    setOk(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={() => !busy && onClose()}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="card w-full max-w-sm p-5 space-y-3"
      >
        <h3 className="text-base font-bold text-ink">Change password</h3>

        {ok ? (
          <>
            <div className="rounded-lg border-l-[3px] border-l-success bg-[#e6f4ea] px-3 py-2 text-sm text-[#137333]">
              Your password has been updated.
            </div>
            <button type="button" className="btn-primary w-full" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            {error && (
              <div className="rounded-lg border-l-[3px] border-l-danger bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">
                {error}
              </div>
            )}

            <div>
              <label className="label">Current password</label>
              <input
                type="password"
                autoComplete="current-password"
                className="input"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">New password</label>
              <input
                type="password"
                autoComplete="new-password"
                className="input"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="min 6 characters"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                type="password"
                autoComplete="new-password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Updating…' : 'Update password'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
