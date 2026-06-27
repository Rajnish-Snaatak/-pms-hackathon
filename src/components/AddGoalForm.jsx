import { useState } from 'react'

const CATEGORIES = [
  'Engineering',
  'Quality',
  'Process',
  'Learning',
  'Growth',
  'Leadership',
]

export default function AddGoalForm({ role, currentUser, employees = [], onSubmit, onCancel }) {
  const isManager = role === 'manager'
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '')
  const [title, setTitle] = useState('')
  const [metric, setMetric] = useState('')
  const [weight, setWeight] = useState(10)
  const [dueDate, setDueDate] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)

    const targetId = isManager ? employeeId : currentUser?.id
    const targetUser = employees.find((u) => u.id === targetId)

    const goalData = isManager
      ? {
          employee_id: targetId,
          title: title.trim(),
          metric: metric.trim() || null,
          weight: Number(weight) || 0,
          progress: 0,
          status: 'approved',
          source: 'manager',
          goal_type: 'core',
          assigned_by: currentUser?.name || null,
          due_date: dueDate || null,
          team_id: targetUser?.team_id || currentUser?.teamId || null,
          category,
        }
      : {
          employee_id: currentUser?.id,
          title: title.trim(),
          metric: metric.trim() || null,
          weight: Number(weight) || 0,
          progress: 0,
          status: 'pending',
          source: 'employee',
          goal_type: 'additional',
          assigned_by: null,
          due_date: dueDate || null,
          team_id: currentUser?.teamId || null,
          category,
        }

    await onSubmit(goalData)
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">
          {isManager ? 'Assign core goal' : 'Add additional goal'}
        </h3>
        <span
          className="pill"
          style={{
            background: isManager ? '#f3ebff' : '#e8f0fe',
            color: isManager ? '#7b2fff' : '#1a73e8',
          }}
        >
          {isManager ? 'Core · auto-approved' : 'Additional · needs approval'}
        </span>
      </div>

      {isManager && (
        <div>
          <label className="label">Employee</label>
          <select
            className="input"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
          >
            {employees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} {u.title ? `· ${u.title}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Goal title</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Reduce API latency by 30%"
          required
        />
      </div>

      <div>
        <label className="label">Success metric</label>
        <input
          className="input"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          placeholder="e.g. p95 under 200ms"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Weight</label>
          <input
            type="number"
            min="0"
            max="100"
            className="input"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Due date</label>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : isManager ? 'Assign goal' : 'Submit for approval'}
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
