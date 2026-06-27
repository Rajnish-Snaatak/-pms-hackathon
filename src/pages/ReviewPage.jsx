import { useMemo, useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import Badge from '../components/Badge'
import ProgressBar from '../components/ProgressBar'

function Stars({ value = 0, onChange, readOnly = false }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || value) >= n
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(0)}
            onClick={() => !readOnly && onChange(n)}
            className={`text-2xl leading-none transition-transform ${
              readOnly ? 'cursor-default' : 'hover:scale-110 cursor-pointer'
            }`}
            style={{ color: filled ? '#f29900' : '#dadce0' }}
          >
            ★
          </button>
        )
      })}
      <span className="ml-2 text-sm font-semibold text-ink-muted">
        {value ? `${value}/5` : 'Not rated'}
      </span>
    </div>
  )
}

function GoalOutcome({ goal, linkedEvents = [] }) {
  const isCore = goal.goal_type === 'core'
  return (
    <div className="rounded-lg border border-line border-l-[3px] p-3" style={{ borderLeftColor: isCore ? '#7b2fff' : '#4285f4' }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{goal.title}</p>
        <Badge variant={goal.progress >= 100 ? 'green' : goal.progress >= 50 ? 'yellow' : 'gray'}>
          {goal.progress}%
        </Badge>
      </div>
      {goal.metric && <p className="text-xs text-ink-muted mt-0.5">Metric: {goal.metric}</p>}
      <div className="mt-2">
        <ProgressBar value={goal.progress || 0} />
      </div>
      {linkedEvents.length > 0 && (
        <ul className="mt-2 space-y-1">
          {linkedEvents.map((e) => (
            <li key={e.id} className="text-xs text-ink-muted flex gap-1.5">
              <span className="text-ink-faint">•</span>
              <span>{e.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ReviewPage() {
  const role = useStore((s) => s.currentRole)
  const currentUser = useStore((s) => s.currentUser)
  const users = useStore((s) => s.users)
  const goals = useStore((s) => s.goals)
  const events = useStore((s) => s.events)
  const reviews = useStore((s) => s.reviews)
  const submitReview = useStore((s) => s.submitReview)

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
  const allEmployees = useMemo(() => users.filter((u) => u.role === 'employee'), [users])

  // Who is being reviewed depends on role.
  const selectable = role === 'manager' ? reports : role === 'hr' ? allEmployees : []
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    if (role === 'employee') setSelectedId(currentUser?.id || '')
    else setSelectedId(selectable[0]?.id || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, currentUser])

  const subject = users.find((u) => u.id === selectedId)
  const review = reviews.find((r) => r.employee_id === selectedId)

  const subjectGoals = goals.filter((g) => g.employee_id === selectedId)
  const core = subjectGoals.filter((g) => g.goal_type === 'core')
  const additional = subjectGoals.filter((g) => g.goal_type === 'additional')
  const subjectEvents = events.filter((e) => e.employee_id === selectedId)
  const notable = subjectEvents.filter((e) => e.type === 'achievement' || e.type === 'checkin')
  const linkedTo = (goalId) => subjectEvents.filter((e) => e.goal_id === goalId)

  // Editor state (manager only).
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    setRating(review?.rating || 0)
    setComment(review?.comment || '')
    setSavedMsg('')
  }, [selectedId, review?.id])

  async function save(status) {
    setSaving(true)
    await submitReview(selectedId, rating || null, comment, status)
    setSaving(false)
    setSavedMsg(status === 'submitted' ? 'Review submitted ✓' : 'Draft saved ✓')
  }

  if (!subject) {
    return (
      <div className="card p-8 text-center text-sm text-ink-muted">
        No one to review here.
      </div>
    )
  }

  const isManagerEditor = role === 'manager'
  const status = review?.status || 'not started'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Performance review</h1>
          <p className="text-sm text-ink-muted">Jun 2026 cycle</p>
        </div>
        {selectable.length > 0 && (
          <select className="input max-w-xs" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {selectable.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Subject header */}
      <div className="card p-4 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white bg-brand">
          {subject.initials}
        </span>
        <div className="flex-1">
          <p className="text-base font-bold text-ink">{subject.name}</p>
          <p className="text-xs text-ink-muted">{subject.title} · Manager {subject.manager_name}</p>
        </div>
        {status === 'submitted' ? (
          <Badge variant="green">Submitted</Badge>
        ) : status === 'draft' ? (
          <Badge variant="yellow">Draft</Badge>
        ) : (
          <Badge variant="gray">Not started</Badge>
        )}
      </div>

      {/* Employee read-only banner */}
      {role === 'employee' && (
        <div
          className="card p-3 border-l-[3px] text-sm font-medium"
          style={{
            borderLeftColor: status === 'submitted' ? '#34a853' : '#f29900',
            background: status === 'submitted' ? '#e6f4ea' : '#fef7e0',
            color: status === 'submitted' ? '#1e8e3e' : '#b06000',
          }}
        >
          {status === 'submitted'
            ? 'Your manager has submitted your review. See the rating and comments below.'
            : 'Your review is still being prepared by your manager.'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Goals + events */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-purple mb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-purple" /> Core goals — manager assigned
            </p>
            <div className="space-y-3">
              {core.map((g) => (
                <GoalOutcome key={g.id} goal={g} linkedEvents={linkedTo(g.id)} />
              ))}
              {core.length === 0 && <p className="text-sm text-ink-muted">No core goals.</p>}
            </div>
          </div>

          <div className="card p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-brand mb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Additional goals — self added
            </p>
            <div className="space-y-3">
              {additional.map((g) => (
                <GoalOutcome key={g.id} goal={g} linkedEvents={linkedTo(g.id)} />
              ))}
              {additional.length === 0 && <p className="text-sm text-ink-muted">No additional goals.</p>}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink mb-3">Notable events</h3>
            {notable.length === 0 ? (
              <p className="text-sm text-ink-muted">No notable events logged.</p>
            ) : (
              <ul className="space-y-2">
                {notable.map((e) => (
                  <li key={e.id} className="flex items-start gap-2">
                    <Badge variant={e.type === 'achievement' ? 'yellow' : 'blue'}>
                      {e.type === 'achievement' ? 'Achievement' : 'Check-in'}
                    </Badge>
                    <span className="text-sm text-ink flex-1">{e.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Rating panel */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-ink mb-3">Overall rating</h3>
            <Stars
              value={isManagerEditor ? rating : review?.rating || 0}
              onChange={setRating}
              readOnly={!isManagerEditor}
            />

            <h3 className="text-sm font-bold text-ink mt-5 mb-2">Manager comment</h3>
            {isManagerEditor ? (
              <textarea
                className="input min-h-[140px] resize-y"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Summarise performance, strengths, and growth areas…"
              />
            ) : (
              <p className="text-sm text-ink whitespace-pre-wrap">
                {review?.comment ? review.comment : <span className="text-ink-muted">No comment yet.</span>}
              </p>
            )}

            {isManagerEditor && (
              <div className="mt-4 flex flex-col gap-2">
                {savedMsg && <p className="text-xs font-semibold text-success">{savedMsg}</p>}
                <div className="flex gap-2">
                  <button className="btn-ghost flex-1" disabled={saving} onClick={() => save('draft')}>
                    Save draft
                  </button>
                  <button className="btn-primary flex-1" disabled={saving || !rating} onClick={() => save('submitted')}>
                    {saving ? 'Saving…' : 'Submit review'}
                  </button>
                </div>
                {!rating && <p className="text-[11px] text-ink-faint">Add a star rating to submit.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
