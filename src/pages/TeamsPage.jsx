import { useMemo, useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import StatCard from '../components/StatCard'
import MemberTable from '../components/MemberTable'
import Badge from '../components/Badge'
import ProgressBar from '../components/ProgressBar'

const SWATCHES = [
  '#7b2fff', '#188038', '#1a73e8', '#e8710a',
  '#d93025', '#34a853', '#f29900', '#9334e6',
]

function initialsFrom(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('')
}

export default function TeamsPage() {
  const role = useStore((s) => s.currentRole)
  const teams = useStore((s) => s.teams)
  const users = useStore((s) => s.users)
  const goals = useStore((s) => s.goals)
  const events = useStore((s) => s.events)
  const reviews = useStore((s) => s.reviews)
  const teamMembers = useStore((s) => s.teamMembers)
  const addTeam = useStore((s) => s.addTeam)
  const addMember = useStore((s) => s.addMember)
  const removeMember = useStore((s) => s.removeMember)

  const canEdit = role === 'manager' || role === 'hr'

  const [selectedId, setSelectedId] = useState('')
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [team, setTeam] = useState({
    name: '',
    full_name: '',
    manager_name: '',
    color: SWATCHES[0],
  })

  useEffect(() => {
    if (!selectedId && teams.length) setSelectedId(teams[0].id)
  }, [teams, selectedId])

  const membersOf = (teamId) => teamMembers[teamId] || []

  const reviewPctOf = (teamId) => {
    const m = membersOf(teamId).filter((x) => x.user_id)
    if (m.length === 0) return 0
    const done = m.filter((x) => {
      const rev = reviews.find((r) => r.employee_id === x.user_id)
      return rev?.status === 'submitted'
    }).length
    return Math.round((done / m.length) * 100)
  }

  const totalMembers = teams.reduce((s, t) => s + membersOf(t.id).length, 0)
  const goalsAssigned = goals.length
  const overallReview = teams.length
    ? Math.round(teams.reduce((s, t) => s + reviewPctOf(t.id), 0) / teams.length)
    : 0

  const selected = teams.find((t) => t.id === selectedId)
  const selMembers = selected ? membersOf(selected.id) : []
  const teamGoals = selected ? goals.filter((g) => g.team_id === selected.id) : []
  const teamGoalAvg =
    teamGoals.length > 0
      ? Math.round(teamGoals.reduce((s, g) => s + (g.progress || 0), 0) / teamGoals.length)
      : 0
  const teamEvents = selected
    ? events.filter((e) => e.team_id === selected.id).length
    : 0

  const managerOptions = useMemo(() => {
    const fromUsers = users.filter((u) => u.role === 'manager').map((u) => u.name)
    const fromTeams = teams.map((t) => t.manager_name).filter(Boolean)
    return [...new Set([...fromUsers, ...fromTeams])]
  }, [users, teams])

  async function createTeam(e) {
    e.preventDefault()
    if (!team.name.trim()) return
    const created = await addTeam({
      name: team.name.trim().slice(0, 8),
      full_name: team.full_name.trim() || null,
      manager_name: team.manager_name || null,
      color: team.color,
      dept: null,
    })
    if (created) {
      setSelectedId(created.id)
      setTeam({ name: '', full_name: '', manager_name: '', color: SWATCHES[0] })
      setShowTeamForm(false)
    }
  }

  async function handleAddMember(memberData) {
    if (!selected) return
    await addMember(selected.id, {
      ...memberData,
      initials: initialsFrom(memberData.name),
      user_id: null,
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Teams</h1>
        <p className="text-sm text-ink-muted">
          {role === 'hr' ? 'Manage teams and members company-wide' : 'Your teams and their members'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total teams" value={teams.length} />
        <StatCard label="Total members" value={totalMembers} />
        <StatCard label="Goals assigned" value={goalsAssigned} subColor="#4285f4" />
        <StatCard label="Review readiness" value={`${overallReview}%`} subColor="#34a853" />
      </div>

      {/* Team chips filter bar */}
      <div className="flex flex-wrap gap-2">
        {teams.map((t) => {
          const active = t.id === selectedId
          return (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`pill border ${active ? 'text-white' : 'bg-white text-ink-muted hover:bg-surface'}`}
              style={active ? { background: t.color, borderColor: t.color } : { borderColor: '#e8eaed' }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: active ? '#fff' : t.color }}
              />
              {t.name}
            </button>
          )
        })}
        {canEdit && (
          <button
            onClick={() => setShowTeamForm((v) => !v)}
            className="pill border border-dashed border-brand text-brand hover:bg-brand-50"
          >
            + Add team
          </button>
        )}
      </div>

      {showTeamForm && canEdit && (
        <form onSubmit={createTeam} className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-ink">Create team</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Short name (max 8)</label>
              <input
                className="input"
                maxLength={8}
                value={team.name}
                onChange={(e) => setTeam({ ...team, name: e.target.value })}
                placeholder="e.g. SRE"
                required
              />
            </div>
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                value={team.full_name}
                onChange={(e) => setTeam({ ...team, full_name: e.target.value })}
                placeholder="e.g. Site Reliability"
              />
            </div>
          </div>
          <div>
            <label className="label">Manager</label>
            <select
              className="input"
              value={team.manager_name}
              onChange={(e) => setTeam({ ...team, manager_name: e.target.value })}
            >
              <option value="">Select manager…</option>
              {managerOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setTeam({ ...team, color: c })}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    team.color === c ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Create team</button>
            <button type="button" className="btn-ghost" onClick={() => setShowTeamForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Team list panel */}
        <div className="card p-2 h-fit">
          {teams.map((t) => {
            const active = t.id === selectedId
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left ${
                  active ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-ink truncate">{t.name}</span>
                  <span className="block text-[11px] text-ink-faint">{membersOf(t.id).length} members</span>
                </span>
                <Badge variant={reviewPctOf(t.id) >= 80 ? 'green' : reviewPctOf(t.id) >= 50 ? 'yellow' : 'gray'}>
                  {reviewPctOf(t.id)}%
                </Badge>
              </button>
            )
          })}
        </div>

        {/* Selected team detail */}
        {selected ? (
          <div className="space-y-4 min-w-0">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-white"
                  style={{ background: selected.color }}
                >
                  {selected.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="text-base font-bold text-ink">{selected.full_name || selected.name}</p>
                  <p className="text-xs text-ink-muted">Manager · {selected.manager_name || '—'}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-lg font-extrabold text-ink">{selMembers.length}</p>
                  <p className="text-[11px] text-ink-muted">Members</p>
                </div>
                <div>
                  <p className="text-lg font-extrabold text-ink">{teamGoals.length}</p>
                  <p className="text-[11px] text-ink-muted">Goals</p>
                </div>
                <div>
                  <p className="text-lg font-extrabold text-success">{teamGoalAvg}%</p>
                  <p className="text-[11px] text-ink-muted">Avg progress</p>
                </div>
                <div>
                  <p className="text-lg font-extrabold text-ink">{reviewPctOf(selected.id)}%</p>
                  <p className="text-[11px] text-ink-muted">Reviews</p>
                </div>
              </div>
            </div>

            <MemberTable
              members={selMembers}
              goals={goals}
              events={events}
              reviews={reviews}
              teamColor={selected.color}
              canEdit={canEdit}
              onAddMember={handleAddMember}
              onRemoveMember={(id) => removeMember(selected.id, id)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-4">
                <h3 className="text-sm font-bold text-ink mb-3">Shared team goals</h3>
                {teamGoals.length === 0 ? (
                  <p className="text-sm text-ink-muted">No goals for this team yet.</p>
                ) : (
                  <div className="space-y-3">
                    {teamGoals.slice(0, 3).map((g) => (
                      <div key={g.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-ink truncate pr-2">{g.title}</span>
                          <Badge variant={g.goal_type === 'core' ? 'purple' : 'blue'}>
                            {g.goal_type}
                          </Badge>
                        </div>
                        <ProgressBar value={g.progress || 0} showLabel />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-bold text-ink mb-3">Team health</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Avg goal progress</span>
                    <span className="font-semibold text-ink">{teamGoalAvg}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Timeline events</span>
                    <span className="font-semibold text-ink">{teamEvents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Goals assigned</span>
                    <span className="font-semibold text-ink">{teamGoals.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Review readiness</span>
                    <span className="font-semibold text-ink">{reviewPctOf(selected.id)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-ink-muted">
            No team selected.
          </div>
        )}
      </div>
    </div>
  )
}
