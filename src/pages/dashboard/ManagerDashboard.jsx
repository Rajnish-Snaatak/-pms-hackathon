import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import CycleBar from '../../components/CycleBar'
import StatCard from '../../components/StatCard'
import GoalCard from '../../components/GoalCard'
import MemberTable from '../../components/MemberTable'
import Badge from '../../components/Badge'

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const currentUser = useStore((s) => s.currentUser)
  const users = useStore((s) => s.users)
  const teams = useStore((s) => s.teams)
  const goals = useStore((s) => s.goals)
  const events = useStore((s) => s.events)
  const reviews = useStore((s) => s.reviews)
  const approveGoal = useStore((s) => s.approveGoal)
  const rejectGoal = useStore((s) => s.rejectGoal)

  // Direct reports: employees managed by the current manager.
  const reports = useMemo(
    () =>
      users.filter(
        (u) => u.role === 'employee' && u.manager_name === currentUser?.name
      ),
    [users, currentUser]
  )
  const reportIds = reports.map((r) => r.id)

  const teamGoals = goals.filter((g) => reportIds.includes(g.employee_id))
  const pendingGoals = teamGoals.filter((g) => g.status === 'pending')
  const reportsName = (id) => users.find((u) => u.id === id)?.name

  const teamAvg =
    teamGoals.length > 0
      ? Math.round(teamGoals.reduce((s, g) => s + (g.progress || 0), 0) / teamGoals.length)
      : 0

  const reviewsDue = reports.filter((r) => {
    const rev = reviews.find((x) => x.employee_id === r.id)
    return !rev || rev.status !== 'submitted'
  })

  const teamColor = teams.find((t) => t.id === currentUser?.teamId)?.color || '#4285f4'

  const members = reports.map((u) => ({
    id: u.id,
    user_id: u.id,
    name: u.name,
    initials: u.initials,
    role_title: u.title,
    manager_name: u.manager_name,
  }))

  return (
    <div className="space-y-5">
      <CycleBar />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Direct reports" value={reports.length} sub="on your team" />
        <StatCard
          label="Pending approvals"
          value={pendingGoals.length}
          sub={pendingGoals.length ? 'needs action' : 'all clear'}
          subColor={pendingGoals.length ? '#f29900' : '#34a853'}
        />
        <StatCard
          label="Reviews due"
          value={reviewsDue.length}
          sub={`${reports.length - reviewsDue.length} done`}
          subColor={reviewsDue.length ? '#f29900' : '#34a853'}
        />
        <StatCard label="Team avg progress" value={`${teamAvg}%`} sub={`${teamGoals.length} goals`} subColor="#34a853" />
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold text-ink mb-3">
          Pending goal approvals
          {pendingGoals.length > 0 && (
            <Badge variant="yellow" className="ml-2">
              {pendingGoals.length}
            </Badge>
          )}
        </h3>
        {pendingGoals.length === 0 ? (
          <p className="text-sm text-ink-muted">No goals awaiting approval.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingGoals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                role="manager"
                ownerName={reportsName(g.employee_id)}
                onApprove={approveGoal}
                onReject={rejectGoal}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink mb-3">Team performance</h3>
        <MemberTable
          members={members}
          goals={goals}
          events={events}
          reviews={reviews}
          teamColor={teamColor}
          onView={() => navigate('/review')}
        />
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold text-ink mb-3">Reviews to complete</h3>
        <div className="space-y-2">
          {reports.map((r) => {
            const rev = reviews.find((x) => x.employee_id === r.id)
            const status = rev?.status || null
            return (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-line p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: teamColor }}
                  >
                    {r.initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{r.name}</p>
                    <p className="text-[11px] text-ink-muted">{r.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {status === 'submitted' ? (
                    <Badge variant="green">Submitted</Badge>
                  ) : status === 'draft' ? (
                    <Badge variant="yellow">Draft</Badge>
                  ) : (
                    <Badge variant="gray">Not started</Badge>
                  )}
                  <button className="btn-primary py-1.5" onClick={() => navigate('/review')}>
                    {status === 'submitted' ? 'View' : status === 'draft' ? 'Continue' : 'Start'}
                  </button>
                </div>
              </div>
            )
          })}
          {reports.length === 0 && <p className="text-sm text-ink-muted">No reports assigned.</p>}
        </div>
      </div>
    </div>
  )
}
