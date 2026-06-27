import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import CycleBar from '../../components/CycleBar'
import StatCard from '../../components/StatCard'
import ScoreRing, { computeScore } from '../../components/ScoreRing'
import GoalCard from '../../components/GoalCard'
import TimelineItem from '../../components/TimelineItem'
import Badge from '../../components/Badge'

export default function EmployeeDashboard() {
  const navigate = useNavigate()
  const currentUser = useStore((s) => s.currentUser)
  const goals = useStore((s) => s.goals)
  const events = useStore((s) => s.events)
  const reviews = useStore((s) => s.reviews)
  const updateProgress = useStore((s) => s.updateProgress)

  const uid = currentUser?.id

  const myGoals = useMemo(() => goals.filter((g) => g.employee_id === uid), [goals, uid])
  const myEvents = useMemo(
    () => events.filter((e) => e.employee_id === uid),
    [events, uid]
  )
  const myReview = reviews.find((r) => r.employee_id === uid)

  const core = myGoals.filter((g) => g.goal_type === 'core')
  const additional = myGoals.filter((g) => g.goal_type === 'additional')
  const approved = myGoals.filter((g) => g.status === 'approved')
  const avg =
    myGoals.length > 0
      ? Math.round(myGoals.reduce((s, g) => s + (g.progress || 0), 0) / myGoals.length)
      : 0

  const score = computeScore({
    approvedGoals: approved.length,
    events: myEvents.length,
    avgProgress: avg,
  })

  const reviewStatus = myReview?.status || 'not started'
  const goalTitleById = (id) => goals.find((g) => g.id === id)?.title

  const checklist = [
    { label: 'Goals set for the cycle', done: myGoals.length >= 3 },
    { label: 'All core goals approved', done: core.length > 0 && core.every((g) => g.status === 'approved') },
    { label: 'Logged 3+ timeline updates', done: myEvents.length >= 3 },
    { label: 'Average progress above 60%', done: avg >= 60 },
  ]

  const pending = []
  additional
    .filter((g) => g.status === 'pending')
    .forEach((g) => pending.push({ text: `“${g.title}” awaiting manager approval`, tag: 'Goal', variant: 'yellow' }))
  approved
    .filter((g) => (g.progress || 0) < 100)
    .slice(0, 3)
    .forEach((g) => pending.push({ text: `Update progress on “${g.title}” (${g.progress || 0}%)`, tag: 'Progress', variant: 'blue' }))
  if (reviewStatus === 'submitted')
    pending.push({ text: 'Your performance review is ready to read', tag: 'Review', variant: 'green' })

  return (
    <div className="space-y-5">
      <CycleBar />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My goals" value={myGoals.length} sub={`${core.length} core · ${additional.length} additional`} />
        <StatCard label="Avg progress" value={`${avg}%`} sub={`${approved.length} approved`} subColor="#34a853" />
        <StatCard label="Timeline updates" value={myEvents.length} sub="this cycle" />
        <StatCard
          label="Review status"
          value={reviewStatus === 'submitted' ? 'Ready' : reviewStatus === 'draft' ? 'In progress' : 'Pending'}
          sub={reviewStatus}
          subColor={reviewStatus === 'submitted' ? '#34a853' : '#f29900'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 flex flex-col items-center justify-center">
          <ScoreRing score={score} />
          <div className="mt-4 w-full space-y-2">
            {checklist.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                    c.done ? 'bg-success' : 'bg-[#dadce0]'
                  }`}
                >
                  {c.done ? '✓' : ''}
                </span>
                <span className={c.done ? 'text-ink' : 'text-ink-muted'}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold text-ink mb-3">Pending actions</h3>
          {pending.length === 0 ? (
            <p className="text-sm text-ink-muted">You're all caught up. 🎉</p>
          ) : (
            <div className="space-y-2">
              {pending.slice(0, 4).map((p, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-line p-2.5">
                  <Badge variant={p.variant}>{p.tag}</Badge>
                  <span className="text-sm text-ink flex-1">{p.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-ink">Active goals</h3>
          <button className="text-xs font-semibold text-brand hover:underline" onClick={() => navigate('/goals')}>
            View all →
          </button>
        </div>

        <p className="flex items-center gap-2 text-xs font-bold text-purple mb-2">
          <span className="h-2 w-2 rounded-full bg-purple" /> Core — manager assigned
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {core.map((g) => (
            <GoalCard key={g.id} goal={g} role="employee" onUpdateProgress={updateProgress} />
          ))}
          {core.length === 0 && <p className="text-sm text-ink-muted">No core goals yet.</p>}
        </div>

        <p className="flex items-center gap-2 text-xs font-bold text-brand mb-2">
          <span className="h-2 w-2 rounded-full bg-brand" /> Additional — self added
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {additional.map((g) => (
            <GoalCard key={g.id} goal={g} role="employee" onUpdateProgress={updateProgress} />
          ))}
          {additional.length === 0 && <p className="text-sm text-ink-muted">No additional goals yet.</p>}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-ink">Recent timeline</h3>
          <button className="text-xs font-semibold text-brand hover:underline" onClick={() => navigate('/timeline')}>
            View all →
          </button>
        </div>
        {myEvents.slice(0, 3).map((e, i, arr) => (
          <TimelineItem
            key={e.id}
            event={e}
            goalTitle={goalTitleById(e.goal_id)}
            isLast={i === arr.length - 1}
          />
        ))}
        {myEvents.length === 0 && <p className="text-sm text-ink-muted">No timeline entries yet.</p>}
      </div>
    </div>
  )
}
