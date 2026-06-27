import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Spinner } from '../App'
import GoalCard from '../components/GoalCard'
import AddGoalForm from '../components/AddGoalForm'

const FILTERS = ['All', 'Core', 'Additional', 'Pending']

export default function GoalsPage() {
  const role = useStore((s) => s.currentRole)
  const currentUser = useStore((s) => s.currentUser)
  const users = useStore((s) => s.users)
  const goals = useStore((s) => s.goals)
  const loading = useStore((s) => s.loading)
  const addGoal = useStore((s) => s.addGoal)
  const approveGoal = useStore((s) => s.approveGoal)
  const rejectGoal = useStore((s) => s.rejectGoal)
  const updateProgress = useStore((s) => s.updateProgress)

  const [filter, setFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)

  const reports = useMemo(
    () => users.filter((u) => u.role === 'employee' && u.manager_name === currentUser?.name),
    [users, currentUser]
  )

  // Visible goals by role.
  const visible = useMemo(() => {
    if (role === 'employee') return goals.filter((g) => g.employee_id === currentUser?.id)
    if (role === 'manager') {
      const ids = reports.map((r) => r.id)
      return goals.filter((g) => ids.includes(g.employee_id))
    }
    return goals // hr sees everything
  }, [goals, role, currentUser, reports])

  const filtered = visible.filter((g) => {
    if (filter === 'Core') return g.goal_type === 'core'
    if (filter === 'Additional') return g.goal_type === 'additional'
    if (filter === 'Pending') return g.status === 'pending'
    return true
  })

  const core = filtered.filter((g) => g.goal_type === 'core')
  const additional = filtered.filter((g) => g.goal_type === 'additional')

  const ownerName = (id) => users.find((u) => u.id === id)?.name
  const canAdd = role === 'employee' || role === 'manager'
  // Manager picks an employee; the employee form needs the current user resolvable.
  const formEmployees = role === 'manager' ? reports : [currentUser].filter(Boolean)

  async function handleAdd(goalData) {
    await addGoal(goalData)
    setShowForm(false)
  }

  if (loading) return <Spinner label="Loading goals…" />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Goals</h1>
          <p className="text-sm text-ink-muted">
            {role === 'hr' ? 'Read-only view of all goals' : 'Track core and additional goals for the cycle'}
          </p>
        </div>
        {canAdd && (
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close' : role === 'manager' ? '+ Assign core goal' : '+ Add additional goal'}
          </button>
        )}
      </div>

      {showForm && canAdd && (
        <AddGoalForm
          role={role}
          currentUser={currentUser}
          employees={formEmployees}
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f === 'All'
              ? visible.length
              : f === 'Core'
              ? visible.filter((g) => g.goal_type === 'core').length
              : f === 'Additional'
              ? visible.filter((g) => g.goal_type === 'additional').length
              : visible.filter((g) => g.status === 'pending').length
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`pill border ${
                active ? 'bg-brand text-white border-brand' : 'bg-white text-ink-muted border-line hover:bg-surface'
              }`}
            >
              {f} <span className="opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      <section>
        <p className="flex items-center gap-2 text-sm font-bold text-purple mb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-purple" /> Core goals — manager assigned
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {core.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              role={role}
              ownerName={role !== 'employee' ? ownerName(g.employee_id) : null}
              onApprove={approveGoal}
              onReject={rejectGoal}
              onUpdateProgress={updateProgress}
            />
          ))}
          {core.length === 0 && <p className="text-sm text-ink-muted">No core goals.</p>}
        </div>
      </section>

      <section>
        <p className="flex items-center gap-2 text-sm font-bold text-brand mb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Additional goals — self added
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {additional.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              role={role}
              ownerName={role !== 'employee' ? ownerName(g.employee_id) : null}
              onApprove={approveGoal}
              onReject={rejectGoal}
              onUpdateProgress={updateProgress}
            />
          ))}
          {additional.length === 0 && <p className="text-sm text-ink-muted">No additional goals.</p>}
        </div>
      </section>
    </div>
  )
}
