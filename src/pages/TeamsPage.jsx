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


export default function TeamsPage() {
  const role = useStore((s) => s.currentRole)
  const teams = useStore((s) => s.teams)
  const users = useStore((s) => s.users)
  const goals = useStore((s) => s.goals)
  const events = useStore((s) => s.events)
  const reviews = useStore((s) => s.reviews)
  const addTeam = useStore((s) => s.addTeam)
  const updateTeam = useStore((s) => s.updateTeam)
  const deleteTeam = useStore((s) => s.deleteTeam)

  const canEdit = role === 'manager' || role === 'hr'

  const [selectedId, setSelectedId] = useState('')
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [team, setTeam] = useState({
    name: '',
    full_name: '',
    manager_name: '',
    color: SWATCHES[0],
  })

  // Edit-team modal state
  const [editTeam, setEditTeam] = useState(null)
  const [teamErr, setTeamErr] = useState('')
  const [teamBusy, setTeamBusy] = useState(false)

  useEffect(() => {
    if (!selectedId && teams.length) setSelectedId(teams[0].id)
  }, [teams, selectedId])

  // Members are the real user accounts on a team (managed via the People page),
  // mapped into the shape MemberTable expects.
  const membersOf = (teamId) =>
    users
      .filter((u) => u.team_id === teamId)
      .map((u) => ({
        id: u.id,
        user_id: u.id,
        name: u.name,
        initials: u.initials,
        role_title: u.title,
      }))

  // Derive the team's manager(s) from the actual manager users assigned to the
  // team. No stale fallback — if no manager user exists, show "No manager".
  const teamManagerName = (teamId) => {
    const mgrs = users
      .filter((u) => u.role === 'manager' && u.team_id === teamId)
      .map((u) => u.name)
    return mgrs.length ? mgrs.join(', ') : 'No manager'
  }

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

  // Live manager list: actual manager users (no stale team text).
  const managerOptions = useMemo(() => {
    return [
      ...new Set(users.filter((u) => u.role === 'manager').map((u) => u.name)),
    ].sort((a, b) => a.localeCompare(b))
  }, [users])

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

  function openEditTeam(t) {
    setTeamErr('')
    setEditTeam({
      id: t.id,
      name: t.name || '',
      full_name: t.full_name || '',
      manager_name: t.manager_name || '',
      color: t.color || SWATCHES[0],
    })
  }

  async function saveEditTeam(e) {
    e.preventDefault()
    if (!editTeam.name.trim()) return
    setTeamErr('')
    setTeamBusy(true)
    const { error } = await updateTeam(editTeam.id, {
      name: editTeam.name.trim().slice(0, 8),
      full_name: editTeam.full_name.trim() || null,
      manager_name: editTeam.manager_name || null,
      color: editTeam.color,
    })
    setTeamBusy(false)
    if (error) return setTeamErr(error)
    setEditTeam(null)
  }

  async function handleDeleteTeam(t) {
    if (!window.confirm(`Delete team "${t.name}"? This cannot be undone.`)) return
    const { error } = await deleteTeam(t.id)
    if (error) {
      window.alert(error)
      return
    }
    if (selectedId === t.id) setSelectedId(teams.find((x) => x.id !== t.id)?.id || '')
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
                  <span className="block text-[11px] text-ink-faint truncate">
                    {membersOf(t.id).length} members · {teamManagerName(t.id)}
                  </span>
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
              <div className="flex items-start gap-3">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-white"
                  style={{ background: selected.color }}
                >
                  {selected.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-ink">{selected.full_name || selected.name}</p>
                  <p className="text-xs text-ink-muted">Manager · {teamManagerName(selected.id)}</p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditTeam(selected)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink-muted hover:bg-surface hover:text-ink"
                      title="Edit team"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zM15.7 6.3a1 1 0 000-1.4l-1.6-1.6a1 1 0 00-1.4 0l-1.2 1.2 2.5 2.5 1.7-1.7z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(selected)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-danger hover:bg-[#fce8e6]"
                      title="Delete team"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M4 6h12M8 6V4.5A1.5 1.5 0 019.5 3h1A1.5 1.5 0 0112 4.5V6m-6 0v9a1.5 1.5 0 001.5 1.5h5A1.5 1.5 0 0014 15V6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
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
              managerName={teamManagerName(selected.id)}
              canEdit={false}
            />
            {canEdit && (
              <p className="-mt-2 text-[11px] text-ink-faint">
                Members are accounts on this team — add or remove them from the{' '}
                <span className="font-semibold">People</span> page.
              </p>
            )}

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

      {/* Edit team modal */}
      {editTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => !teamBusy && setEditTeam(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveEditTeam}
            className="card w-full max-w-md p-5 space-y-3"
          >
            <h3 className="text-base font-bold text-ink">Edit team</h3>

            {teamErr && (
              <div className="rounded-lg border-l-[3px] border-l-danger bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">
                {teamErr}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Short name (max 8)</label>
                <input
                  className="input"
                  maxLength={8}
                  value={editTeam.name}
                  onChange={(e) => setEditTeam({ ...editTeam, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Full name</label>
                <input
                  className="input"
                  value={editTeam.full_name}
                  onChange={(e) => setEditTeam({ ...editTeam, full_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label">Manager</label>
              <select
                className="input"
                value={editTeam.manager_name}
                onChange={(e) => setEditTeam({ ...editTeam, manager_name: e.target.value })}
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
                    onClick={() => setEditTeam({ ...editTeam, color: c })}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      editTeam.color === c ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''
                    }`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primary" disabled={teamBusy}>
                {teamBusy ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setEditTeam(null)}
                disabled={teamBusy}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
