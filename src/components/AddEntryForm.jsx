import { useState } from 'react'

const TYPES = [
  { key: 'progress', label: 'Progress', color: '#34a853' },
  { key: 'achievement', label: 'Achievement', color: '#f29900' },
  { key: 'checkin', label: 'Check-in', color: '#4285f4' },
  { key: 'evidence', label: 'Evidence', color: '#e8710a' },
]

export default function AddEntryForm({
  role,
  currentUser,
  employees = [],
  goals = [],
  onSubmit,
  onCancel,
}) {
  const isManager = role === 'manager'
  const [employeeId, setEmployeeId] = useState(
    isManager ? employees[0]?.id || '' : currentUser?.id || ''
  )
  const [type, setType] = useState('progress')
  const [goalId, setGoalId] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // In manager mode the goal list narrows to the picked employee's goals.
  const targetId = isManager ? employeeId : currentUser?.id
  const goalOptions = goals.filter((g) => g.employee_id === targetId)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)

    const targetUser = employees.find((u) => u.id === targetId)
    const eventData = {
      employee_id: targetId,
      type,
      text: text.trim(),
      added_by: currentUser?.name || null,
      added_by_role: currentUser?.role || role,
      goal_id: goalId || null,
      team_id: targetUser?.team_id || currentUser?.teamId || null,
    }

    await onSubmit(eventData)
    setSubmitting(false)
    setText('')
    setGoalId('')
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3">
      <h3 className="text-sm font-bold text-ink">Add timeline entry</h3>

      {isManager && (
        <div>
          <label className="label">Team member</label>
          <select
            className="input"
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value)
              setGoalId('')
            }}
          >
            {employees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Entry type</label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => {
            const active = type === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className="pill border transition-colors"
                style={{
                  background: active ? t.color : '#fff',
                  color: active ? '#fff' : t.color,
                  borderColor: t.color,
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="label">Linked goal (optional)</label>
        <select
          className="input"
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
        >
          <option value="">No linked goal</option>
          {goalOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Details</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What happened?"
          required
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save entry'}
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
