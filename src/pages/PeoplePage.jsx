import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import Badge from '../components/Badge'

const ROLE_BADGE = { employee: 'blue', manager: 'purple', hr: 'yellow' }
const PAGE_SIZE = 10

export default function PeoplePage() {
  const role = useStore((s) => s.currentRole)
  const currentUser = useStore((s) => s.currentUser)
  const users = useStore((s) => s.users)
  const teams = useStore((s) => s.teams)
  const createUser = useStore((s) => s.createUser)
  const updateUser = useStore((s) => s.updateUser)
  const deleteUser = useStore((s) => s.deleteUser)

  // Who the current user is allowed to delete.
  function canDeleteUser(u) {
    if (u.id === currentUser?.id) return false
    if (role === 'hr') return true
    if (role === 'manager') return u.role === 'employee' && u.team_id === currentUser?.teamId
    return false
  }

  // Who the current user is allowed to edit (HR edits anyone incl. self;
  // Manager edits employees on their own team).
  function canEditUser(u) {
    if (role === 'hr') return true
    if (role === 'manager') return u.role === 'employee' && u.team_id === currentUser?.teamId
    return false
  }

  const [deletingId, setDeletingId] = useState(null)

  // Edit modal state
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editBusy, setEditBusy] = useState(false)
  const [editErr, setEditErr] = useState('')

  // Pagination
  const [page, setPage] = useState(1)

  // HR can create any role; Manager can only create employees on their team.
  const creatableRoles =
    role === 'hr' ? ['employee', 'manager', 'hr'] : role === 'manager' ? ['employee'] : []

  const teamName = (id) => teams.find((t) => t.id === id)?.name || '—'

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: creatableRoles[0] || 'employee',
    team_id: role === 'manager' ? currentUser?.teamId || '' : '',
    title: '',
  })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  // Filters
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('all')

  const roleCounts = useMemo(() => {
    const c = { all: users.length, employee: 0, manager: 0, hr: 0 }
    users.forEach((u) => {
      if (c[u.role] != null) c[u.role] += 1
    })
    return c
  }, [users])

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...users]
      .filter((u) => roleFilter === 'all' || u.role === roleFilter)
      .filter((u) => teamFilter === 'all' || u.team_id === teamFilter)
      .filter((u) => {
        if (!q) return true
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.title?.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [users, query, roleFilter, teamFilter])

  // Reset to first page whenever the filtered set changes.
  useEffect(() => {
    setPage(1)
  }, [query, roleFilter, teamFilter])

  const pageCount = Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pagedUsers = visibleUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  function reset() {
    setForm({
      name: '',
      email: '',
      password: '',
      role: creatableRoles[0] || 'employee',
      team_id: role === 'manager' ? currentUser?.teamId || '' : '',
      title: '',
    })
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setOk('')
    setBusy(true)
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      title: form.title.trim() || null,
      // Managers are forced to their own team server-side; send anyway for HR.
      team_id: form.team_id || null,
    }
    const { error, user } = await createUser(payload)
    setBusy(false)
    if (error) {
      setError(error)
      return
    }
    setOk(`Account created for ${user.name} (${user.email}).`)
    reset()
    setOpen(false)
  }

  async function onDelete(u) {
    if (!window.confirm(`Delete ${u.name}'s account? This removes their login and data. This cannot be undone.`))
      return
    setError('')
    setOk('')
    setDeletingId(u.id)
    const { error } = await deleteUser(u.id)
    setDeletingId(null)
    if (error) {
      setError(error)
      return
    }
    setOk(`Deleted ${u.name}'s account.`)
  }

  function openEdit(u) {
    setEditErr('')
    setEditUser(u)
    setEditForm({
      name: u.name || '',
      title: u.title || '',
      role: u.role,
      team_id: u.team_id || '',
      password: '',
    })
  }

  async function saveEdit(e) {
    e.preventDefault()
    setEditErr('')
    setEditBusy(true)
    const changes = {
      name: editForm.name.trim(),
      title: editForm.title.trim(),
    }
    // Only HR may change role/team.
    if (role === 'hr') {
      changes.role = editForm.role
      changes.team_id = editForm.team_id || null
    }
    if (editForm.password) changes.password = editForm.password
    const { error, user } = await updateUser(editUser.id, changes)
    setEditBusy(false)
    if (error) {
      setEditErr(error)
      return
    }
    setOk(`Updated ${user.name}'s account.`)
    setEditUser(null)
    setEditForm(null)
  }

  if (role !== 'hr' && role !== 'manager') {
    return <p className="text-sm text-ink-muted">You don’t have access to this page.</p>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink">People</h1>
          <p className="text-sm text-ink-muted">
            {role === 'hr'
              ? 'Manage accounts company-wide'
              : 'Add employees to your team'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setOpen((v) => !v)}>
          {open ? 'Close' : '+ Add account'}
        </button>
      </div>

      {ok && (
        <div className="card border-l-[3px] border-l-success bg-[#e6f4ea] p-3 text-sm text-[#137333]">
          {ok}
        </div>
      )}

      {open && (
        <form onSubmit={onSubmit} className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-ink">Create account</h3>

          {error && (
            <div className="rounded-lg border-l-[3px] border-l-danger bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Karan Verma"
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="karan.verma@perftrail.demo"
                required
              />
            </div>
            <div>
              <label className="label">Temporary password</label>
              <input
                type="text"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min 6 characters"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                disabled={creatableRoles.length === 1}
              >
                {creatableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Team</label>
              <select
                className="input"
                value={form.team_id}
                onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                disabled={role === 'manager'}
              >
                <option value="">No team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {role === 'manager' && (
                <p className="mt-1 text-[11px] text-ink-faint">
                  New members join your team ({currentUser?.team || '—'}).
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.7" />
            <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input
            className="input pl-9"
            placeholder="Search name, email, or title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role pills */}
          {[
            { key: 'all', label: 'All' },
            { key: 'employee', label: 'Employees' },
            { key: 'manager', label: 'Managers' },
            { key: 'hr', label: 'HR' },
          ].map((r) => (
            <button
              key={r.key}
              onClick={() => setRoleFilter(r.key)}
              className={`pill border ${
                roleFilter === r.key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-ink-muted border-line hover:bg-surface'
              }`}
            >
              {r.label}
              <span className={roleFilter === r.key ? 'text-white/80' : 'text-ink-faint'}>
                {roleCounts[r.key] ?? 0}
              </span>
            </button>
          ))}

          {/* Team filter */}
          <select
            className="input w-auto py-1.5"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          >
            <option value="all">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-line">
          <span className="text-xs text-ink-muted">
            Showing <span className="font-semibold text-ink">{visibleUsers.length}</span> of{' '}
            {users.length}
          </span>
          {(query || roleFilter !== 'all' || teamFilter !== 'all') && (
            <button
              onClick={() => {
                setQuery('')
                setRoleFilter('all')
                setTeamFilter('all')
              }}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Email</th>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5 font-semibold">Team</th>
              <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-muted">
                  No people match your filters.
                </td>
              </tr>
            )}
            {pagedUsers.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5">
                  <span className="font-semibold text-ink">{u.name}</span>
                  {u.id === currentUser?.id && (
                    <span className="ml-1.5 text-[10px] font-semibold text-brand">(you)</span>
                  )}
                  {u.title && (
                    <span className="block text-[11px] text-ink-faint">{u.title}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-ink-muted">{u.email || '—'}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={ROLE_BADGE[u.role] || 'gray'}>{u.role}</Badge>
                </td>
                <td className="px-4 py-2.5 text-ink-muted">{teamName(u.team_id)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {canEditUser(u) && (
                      <button
                        onClick={() => openEdit(u)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink-muted hover:bg-surface hover:text-ink"
                        title={`Edit ${u.name}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                          <path
                            d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zM15.7 6.3a1 1 0 000-1.4l-1.6-1.6a1 1 0 00-1.4 0l-1.2 1.2 2.5 2.5 1.7-1.7z"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Edit
                      </button>
                    )}
                    {u.id === currentUser?.id ? (
                      <span className="text-[11px] text-ink-faint px-1">—</span>
                    ) : canDeleteUser(u) ? (
                      <button
                        onClick={() => onDelete(u)}
                        disabled={deletingId === u.id}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-danger hover:bg-[#fce8e6] disabled:opacity-50"
                        title={`Delete ${u.name}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                          <path
                            d="M4 6h12M8 6V4.5A1.5 1.5 0 019.5 3h1A1.5 1.5 0 0112 4.5V6m-6 0v9a1.5 1.5 0 001.5 1.5h5A1.5 1.5 0 0014 15V6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {deletingId === u.id ? 'Deleting…' : 'Delete'}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {visibleUsers.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-line">
            <span className="text-xs text-ink-muted">
              Page {currentPage} of {pageCount}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-ghost px-2.5 py-1 text-xs disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage === pageCount}
                className="btn-ghost px-2.5 py-1 text-xs disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editUser && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => !editBusy && setEditUser(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveEdit}
            className="card w-full max-w-md p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Edit account</h3>
              <span className="text-xs text-ink-faint">{editUser.email}</span>
            </div>

            {editErr && (
              <div className="rounded-lg border-l-[3px] border-l-danger bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">
                {editErr}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Full name</label>
                <input
                  className="input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Title</label>
                <input
                  className="input"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  disabled={role !== 'hr'}
                >
                  {['employee', 'manager', 'hr'].map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Team</label>
                <select
                  className="input"
                  value={editForm.team_id}
                  onChange={(e) => setEditForm({ ...editForm, team_id: e.target.value })}
                  disabled={role !== 'hr'}
                >
                  <option value="">No team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Reset password (optional)</label>
              <input
                type="text"
                className="input"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep current password"
                minLength={6}
              />
            </div>

            {role !== 'hr' && (
              <p className="text-[11px] text-ink-faint">
                Only HR can change role or team.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primary" disabled={editBusy}>
                {editBusy ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setEditUser(null)}
                disabled={editBusy}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
