import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import CycleBar from '../../components/CycleBar'
import StatCard from '../../components/StatCard'
import ProgressBar from '../../components/ProgressBar'
import Badge from '../../components/Badge'

export default function HRDashboard() {
  const users = useStore((s) => s.users)
  const teams = useStore((s) => s.teams)
  const goals = useStore((s) => s.goals)
  const reviews = useStore((s) => s.reviews)

  const employees = useMemo(() => users.filter((u) => u.role === 'employee'), [users])

  const submitted = reviews.filter((r) => r.status === 'submitted').length
  const reviewPct = employees.length ? Math.round((submitted / employees.length) * 100) : 0

  const approvedGoals = goals.filter((g) => g.status === 'approved').length
  const goalApprovedPct = goals.length ? Math.round((approvedGoals / goals.length) * 100) : 0

  // At-risk: employees whose average goal progress is below 50%.
  const atRisk = employees.filter((u) => {
    const eg = goals.filter((g) => g.employee_id === u.id)
    if (eg.length === 0) return false
    const avg = eg.reduce((s, g) => s + (g.progress || 0), 0) / eg.length
    return avg < 50
  }).length

  const coreCount = goals.filter((g) => g.goal_type === 'core').length
  const additionalCount = goals.filter((g) => g.goal_type === 'additional').length
  const maxType = Math.max(coreCount, additionalCount, 1)

  const teamReadiness = teams.map((t) => {
    const teamEmployees = employees.filter((u) => u.team_id === t.id)
    const done = teamEmployees.filter((u) => {
      const rev = reviews.find((r) => r.employee_id === u.id)
      return rev?.status === 'submitted'
    }).length
    const pct = teamEmployees.length ? Math.round((done / teamEmployees.length) * 100) : 0
    return { ...t, count: teamEmployees.length, done, pct }
  })

  return (
    <div className="space-y-5">
      <CycleBar />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total employees" value={employees.length} sub={`${teams.length} teams`} />
        <StatCard label="Reviews complete" value={`${reviewPct}%`} sub={`${submitted}/${employees.length} submitted`} subColor="#34a853" />
        <StatCard label="Goals approved" value={`${goalApprovedPct}%`} sub={`${approvedGoals}/${goals.length} goals`} subColor="#4285f4" />
        <StatCard label="At-risk employees" value={atRisk} sub="avg progress < 50%" subColor={atRisk ? '#d93025' : '#34a853'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-ink mb-4">Review readiness by team</h3>
          <div className="space-y-3">
            {teamReadiness.map((t) => (
              <div key={t.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                    <span className="text-sm font-semibold text-ink">{t.name}</span>
                    <span className="text-[11px] text-ink-faint">{t.full_name}</span>
                  </div>
                  <span className="text-xs font-semibold text-ink-muted tabular-nums">
                    {t.done}/{t.count}
                  </span>
                </div>
                <ProgressBar value={t.pct} showLabel />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold text-ink mb-4">Goal type breakdown</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-purple">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple" /> Core — manager assigned
                </span>
                <span className="text-sm font-bold tabular-nums">{coreCount}</span>
              </div>
              <div className="h-2.5 rounded-full bg-[#f1f3f4] overflow-hidden">
                <div className="h-full rounded-full bg-purple" style={{ width: `${(coreCount / maxType) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-brand">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Additional — self added
                </span>
                <span className="text-sm font-bold tabular-nums">{additionalCount}</span>
              </div>
              <div className="h-2.5 rounded-full bg-[#f1f3f4] overflow-hidden">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(additionalCount / maxType) * 100}%` }} />
              </div>
            </div>
            <div className="pt-2 border-t border-line grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-extrabold text-ink">{goals.length}</p>
                <p className="text-[11px] text-ink-muted">Total goals</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-success">{approvedGoals}</p>
                <p className="text-[11px] text-ink-muted">Approved</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink mb-3">All teams</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((t) => {
            const teamUsers = users.filter((u) => u.team_id === t.id)
            return (
              <div key={t.id} className="card p-4 border-t-[3px]" style={{ borderTopColor: t.color }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ background: t.color }}
                    >
                      {t.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">{t.full_name || t.name}</p>
                      <p className="text-[11px] text-ink-muted">Manager · {t.manager_name}</p>
                    </div>
                  </div>
                  <Badge variant="gray">{teamUsers.length} members</Badge>
                </div>
                {teamUsers.length === 0 ? (
                  <p className="text-xs text-ink-muted">No members yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {teamUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-2 text-sm">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ background: t.color }}
                        >
                          {u.initials}
                        </span>
                        <span className="text-ink">{u.name}</span>
                        <span className="text-[11px] text-ink-faint">· {u.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
