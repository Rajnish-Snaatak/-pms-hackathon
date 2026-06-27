import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Spinner } from '../App'
import TimelineItem from '../components/TimelineItem'
import AddEntryForm from '../components/AddEntryForm'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'progress', label: 'Progress' },
  { key: 'achievement', label: 'Achievement' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'evidence', label: 'Evidence' },
]

export default function TimelinePage() {
  const role = useStore((s) => s.currentRole)
  const currentUser = useStore((s) => s.currentUser)
  const users = useStore((s) => s.users)
  const goals = useStore((s) => s.goals)
  const events = useStore((s) => s.events)
  const loading = useStore((s) => s.loading)
  const addEvent = useStore((s) => s.addEvent)

  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)

  const reports = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role === 'employee' &&
          ((currentUser?.teamId && u.team_id === currentUser.teamId) ||
            (u.manager_name && u.manager_name === currentUser?.name))
      ),
    [users, currentUser]
  )

  const visible = useMemo(() => {
    if (role === 'employee') return events.filter((e) => e.employee_id === currentUser?.id)
    if (role === 'manager') {
      const ids = reports.map((r) => r.id)
      return events.filter((e) => ids.includes(e.employee_id))
    }
    return events
  }, [events, role, currentUser, reports])

  // Already newest-first from the store, but sort defensively.
  const sorted = [...visible].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )
  const filtered = filter === 'all' ? sorted : sorted.filter((e) => e.type === filter)

  const goalTitle = (id) => goals.find((g) => g.id === id)?.title
  const canAdd = role === 'employee' || role === 'manager'
  const formEmployees = role === 'manager' ? reports : [currentUser].filter(Boolean)

  async function handleAdd(eventData) {
    await addEvent(eventData)
    setShowForm(false)
  }

  if (loading) return <Spinner label="Loading timeline…" />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Timeline</h1>
          <p className="text-sm text-ink-muted">
            {role === 'employee'
              ? 'Your performance updates this cycle'
              : role === 'manager'
              ? 'Updates across your team'
              : 'Read-only view of all activity'}
          </p>
        </div>
        {canAdd && (
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close' : '+ Add entry'}
          </button>
        )}
      </div>

      {showForm && canAdd && (
        <AddEntryForm
          role={role}
          currentUser={currentUser}
          employees={formEmployees}
          goals={goals}
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f.key === 'all' ? visible.length : visible.filter((e) => e.type === f.key).length
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`pill border ${
                active ? 'bg-brand text-white border-brand' : 'bg-white text-ink-muted border-line hover:bg-surface'
              }`}
            >
              {f.label} <span className="opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="card p-5">
        {filtered.length === 0 ? (
          <p className="text-sm text-ink-muted">No timeline entries yet.</p>
        ) : (
          filtered.map((e, i, arr) => (
            <TimelineItem
              key={e.id}
              event={e}
              goalTitle={goalTitle(e.goal_id)}
              isLast={i === arr.length - 1}
            />
          ))
        )}
      </div>
    </div>
  )
}
