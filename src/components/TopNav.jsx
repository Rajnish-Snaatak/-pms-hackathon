import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useStore } from '../store/useStore'
import ChangePasswordModal from './ChangePasswordModal'

const ROLE_META = {
  employee: { label: 'Employee', color: '#4285f4', bg: '#e8f0fe' },
  manager: { label: 'Manager', color: '#7b2fff', bg: '#f3ebff' },
  hr: { label: 'HR', color: '#e8710a', bg: '#feefe3' },
}

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/goals', label: 'Goals' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/review', label: 'Review' },
  { to: '/teams', label: 'Teams', hideFor: ['employee'] },
  { to: '/people', label: 'People', hideFor: ['employee'] },
]

export default function TopNav() {
  const currentRole = useStore((s) => s.currentRole)
  const currentUser = useStore((s) => s.currentUser)
  const organization = useStore((s) => s.organization)
  const signOut = useStore((s) => s.signOut)

  const [open, setOpen] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const meta = ROLE_META[currentRole]

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-line">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight">
              <span className="text-ink">Perf</span>
              <span className="text-brand">Trail</span>
            </span>
            <span className="pill bg-[#e8f0fe] text-[#1a73e8]">
            {organization?.name || '—'}
          </span>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            {LINKS.filter((l) => !l.hideFor?.includes(currentRole)).map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-[18px] text-sm font-semibold border-b-2 -mb-px transition-colors ${
                    isActive
                      ? 'border-brand text-brand'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-line pl-1 pr-2.5 py-1 hover:bg-surface transition-colors"
          >
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: meta.color }}
            >
              {currentUser?.initials || '—'}
            </span>
            <span className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-xs font-bold text-ink">{currentUser?.name}</span>
              <span
                className="pill px-1.5 py-0 text-[10px]"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.label}
              </span>
            </span>
            <svg width="14" height="14" viewBox="0 0 20 20" className="text-ink-faint">
              <path
                d="M5 8l5 5 5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 card shadow-pop p-1.5 z-40">
              <div className="px-2 py-1.5">
                <p className="text-sm font-bold text-ink truncate">{currentUser?.name}</p>
                <p className="text-[11px] text-ink-faint truncate">{currentUser?.email}</p>
                <span
                  className="pill mt-1 px-1.5 py-0 text-[10px]"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.label}
                </span>
              </div>

              <div className="my-1 border-t border-line" />
              <button
                onClick={() => {
                  setShowPw(true)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surface"
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" className="shrink-0">
                  <rect x="4" y="9" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 9V6.5a3 3 0 016 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="font-semibold">Change password</span>
              </button>
              <button
                onClick={() => {
                  signOut()
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-danger hover:bg-surface"
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" className="shrink-0">
                  <path
                    d="M13 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2v-2M9 10h8m0 0l-3-3m3 3l-3 3"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="font-semibold">Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showPw && <ChangePasswordModal onClose={() => setShowPw(false)} />}
    </header>
  )
}
