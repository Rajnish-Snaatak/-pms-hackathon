import { useState } from 'react'
import Badge from './Badge'
import ProgressBar from './ProgressBar'

const STATUS_VARIANT = {
  approved: 'green',
  pending: 'yellow',
  rejected: 'red',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function GoalCard({
  goal,
  role,
  ownerName,
  onApprove,
  onReject,
  onUpdateProgress,
}) {
  const isCore = goal.goal_type === 'core'
  const [draft, setDraft] = useState(goal.progress ?? 0)

  const borderColor = isCore ? '#7b2fff' : '#4285f4'
  const canManage = role === 'manager' && goal.status === 'pending'
  const canEditProgress =
    role === 'employee' && goal.status === 'approved'

  return (
    <div
      className="card p-4 border-l-[3px]"
      style={{ borderLeftColor: borderColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge variant={isCore ? 'purple' : 'blue'}>
            {isCore ? 'Core — manager assigned' : 'Additional — self added'}
          </Badge>
          <h3 className="mt-2 text-sm font-bold text-ink leading-snug">
            {goal.title}
          </h3>
          {ownerName && (
            <p className="text-xs text-ink-muted mt-0.5">{ownerName}</p>
          )}
        </div>
        <Badge variant={STATUS_VARIANT[goal.status] || 'gray'}>
          {goal.status}
        </Badge>
      </div>

      {goal.metric && (
        <p className="mt-2 text-xs text-ink-muted">
          <span className="font-semibold text-ink">Metric:</span> {goal.metric}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-faint">
        <span>
          <span className="font-semibold text-ink-muted">Weight</span> {goal.weight}
        </span>
        <span>
          <span className="font-semibold text-ink-muted">Due</span>{' '}
          {fmtDate(goal.due_date)}
        </span>
        {goal.assigned_by && (
          <span>
            <span className="font-semibold text-ink-muted">By</span>{' '}
            {goal.assigned_by}
          </span>
        )}
        {goal.category && (
          <span>
            <span className="font-semibold text-ink-muted">Category</span>{' '}
            {goal.category}
          </span>
        )}
      </div>

      <div className="mt-3">
        <ProgressBar value={goal.progress ?? 0} showLabel height={8} />
      </div>

      {canEditProgress && (
        <div className="mt-3 pt-3 border-t border-line">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={draft}
              onChange={(e) => setDraft(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-10 text-right text-xs font-semibold text-ink tabular-nums">
              {draft}%
            </span>
            <button
              className="btn-primary py-1.5 px-3"
              disabled={draft === goal.progress}
              onClick={() => onUpdateProgress && onUpdateProgress(goal.id, draft)}
            >
              Update
            </button>
          </div>
        </div>
      )}

      {canManage && (
        <div className="mt-3 pt-3 border-t border-line flex gap-2">
          <button
            className="btn-success flex-1 py-1.5"
            onClick={() => onApprove && onApprove(goal.id)}
          >
            Approve
          </button>
          <button
            className="btn-danger flex-1 py-1.5"
            onClick={() => onReject && onReject(goal.id)}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}
