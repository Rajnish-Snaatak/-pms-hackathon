import { useMemo, useState } from 'react'
import Badge from './Badge'
import ProgressBar from './ProgressBar'

function Avatar({ initials, color = '#4285f4' }) {
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
      style={{ background: color }}
    >
      {initials}
    </span>
  )
}

function reviewBadge(status) {
  if (status === 'submitted') return <Badge variant="green">Submitted</Badge>
  if (status === 'draft') return <Badge variant="yellow">Draft</Badge>
  return <Badge variant="gray">Not started</Badge>
}

export default function MemberTable({
  members = [],
  goals = [],
  events = [],
  reviews = [],
  teamColor = '#4285f4',
  canEdit = false,
  onAddMember,
  onRemoveMember,
  onView,
}) {
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', role_title: '', manager_name: '' })

  const rows = useMemo(() => {
    return members
      .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
      .map((m) => {
        const memberGoals = goals.filter((g) => g.employee_id === m.user_id)
        const memberEvents = events.filter((e) => e.employee_id === m.user_id)
        const review = reviews.find((r) => r.employee_id === m.user_id)
        const avg =
          memberGoals.length > 0
            ? Math.round(
                memberGoals.reduce((s, g) => s + (g.progress || 0), 0) /
                  memberGoals.length
              )
            : 0
        return {
          ...m,
          goalCount: memberGoals.length,
          eventCount: memberEvents.length,
          avg,
          reviewStatus: review?.status || null,
        }
      })
  }, [members, goals, events, reviews, query])

  async function submitMember(e) {
    e.preventDefault()
    if (!form.name.trim() || !onAddMember) return
    await onAddMember({
      name: form.name.trim(),
      role_title: form.role_title.trim() || null,
      manager_name: form.manager_name.trim() || null,
    })
    setForm({ name: '', role_title: '', manager_name: '' })
    setAdding(false)
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-3 border-b border-line">
        <input
          className="input max-w-xs"
          placeholder="Search members…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {canEdit && (
          <button className="btn-primary py-1.5" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Close' : '+ Add member'}
          </button>
        )}
      </div>

      {adding && canEdit && (
        <form
          onSubmit={submitMember}
          className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 bg-surface border-b border-line"
        >
          <input
            className="input"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Role / title"
            value={form.role_title}
            onChange={(e) => setForm({ ...form, role_title: e.target.value })}
          />
          <input
            className="input"
            placeholder="Manager"
            value={form.manager_name}
            onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      )}

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-ink-muted">
          {query ? 'No members match your search.' : 'No members yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-faint border-b border-line">
                <th className="px-3 py-2 font-semibold">Member</th>
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">Manager</th>
                <th className="px-3 py-2 font-semibold">Goals</th>
                <th className="px-3 py-2 font-semibold w-40">Progress</th>
                <th className="px-3 py-2 font-semibold">Timeline</th>
                <th className="px-3 py-2 font-semibold">Review</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar initials={m.initials} color={teamColor} />
                      <span className="font-semibold text-ink">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-ink-muted">{m.role_title || '—'}</td>
                  <td className="px-3 py-2.5 text-ink-muted">{m.manager_name || '—'}</td>
                  <td className="px-3 py-2.5 tabular-nums">{m.goalCount}</td>
                  <td className="px-3 py-2.5">
                    <ProgressBar value={m.avg} showLabel />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{m.eventCount}</td>
                  <td className="px-3 py-2.5">{reviewBadge(m.reviewStatus)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      {onView && (
                        <button
                          className="text-xs font-semibold text-brand hover:underline"
                          onClick={() => onView(m)}
                        >
                          View
                        </button>
                      )}
                      {canEdit && onRemoveMember && (
                        <button
                          className="text-xs font-semibold text-danger hover:underline"
                          onClick={() => onRemoveMember(m.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
