import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// Map a loaded user row + teams into the lightweight currentUser shape.
function toCurrentUser(user, teams) {
  if (!user) return null
  const team = teams.find((t) => t.id === user.team_id)
  return {
    id: user.id,
    name: user.name,
    initials: user.initials,
    team: team ? team.name : null,
    teamId: user.team_id,
    role: user.role,
    title: user.title,
  }
}

// Group team_members rows by team_id -> [members].
function groupMembers(rows) {
  return rows.reduce((acc, row) => {
    if (!acc[row.team_id]) acc[row.team_id] = []
    acc[row.team_id].push(row)
    return acc
  }, {})
}

export const useStore = create((set, get) => ({
  currentRole: 'employee',
  currentUser: null,
  teams: [],
  users: [],
  goals: [],
  events: [],
  reviews: [],
  teamMembers: {},
  loading: false,
  error: null,

  // ---- Bootstrap -----------------------------------------------------------
  loadAll: async () => {
    set({ loading: true, error: null })
    try {
      const [teamsRes, usersRes, goalsRes, eventsRes, reviewsRes, tmRes] =
        await Promise.all([
          supabase.from('teams').select('*').order('created_at'),
          supabase.from('users').select('*').order('created_at'),
          supabase.from('goals').select('*').order('created_at'),
          supabase.from('events').select('*').order('created_at', { ascending: false }),
          supabase.from('reviews').select('*').order('created_at'),
          supabase.from('team_members').select('*'),
        ])

      const firstError =
        teamsRes.error ||
        usersRes.error ||
        goalsRes.error ||
        eventsRes.error ||
        reviewsRes.error ||
        tmRes.error
      if (firstError) throw firstError

      const teams = teamsRes.data || []
      const users = usersRes.data || []

      // Default to the employee user on first load.
      const employee = users.find((u) => u.role === 'employee')

      set({
        teams,
        users,
        goals: goalsRes.data || [],
        events: eventsRes.data || [],
        reviews: reviewsRes.data || [],
        teamMembers: groupMembers(tmRes.data || []),
        currentUser: toCurrentUser(employee, teams),
        currentRole: 'employee',
        loading: false,
      })
    } catch (err) {
      set({ error: err.message || String(err), loading: false })
    }
  },

  // ---- Role switching ------------------------------------------------------
  setRole: (role) => {
    const { users, teams } = get()
    const user = users.find((u) => u.role === role)
    set({ currentRole: role, currentUser: toCurrentUser(user, teams) })
  },

  // ---- Goals ---------------------------------------------------------------
  addGoal: async (goalData) => {
    const { data, error } = await supabase
      .from('goals')
      .insert(goalData)
      .select()
      .single()
    if (error) {
      set({ error: error.message })
      return null
    }
    set((s) => ({ goals: [...s.goals, data] }))
    return data
  },

  approveGoal: async (id) => {
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, status: 'approved' } : g)),
    }))
    const { error } = await supabase
      .from('goals')
      .update({ status: 'approved' })
      .eq('id', id)
    if (error) set({ error: error.message })
  },

  rejectGoal: async (id) => {
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, status: 'rejected' } : g)),
    }))
    const { error } = await supabase
      .from('goals')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) set({ error: error.message })
  },

  updateProgress: async (goalId, percent) => {
    const value = Math.max(0, Math.min(100, Math.round(percent)))
    set((s) => ({
      goals: s.goals.map((g) => (g.id === goalId ? { ...g, progress: value } : g)),
    }))
    const { error } = await supabase
      .from('goals')
      .update({ progress: value })
      .eq('id', goalId)
    if (error) set({ error: error.message })
  },

  // ---- Events --------------------------------------------------------------
  addEvent: async (eventData) => {
    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()
    if (error) {
      set({ error: error.message })
      return null
    }
    set((s) => ({ events: [data, ...s.events] }))
    return data
  },

  // ---- Reviews -------------------------------------------------------------
  submitReview: async (employeeId, rating, comment, status = 'submitted') => {
    const { currentUser, reviews } = get()
    const existing = reviews.find((r) => r.employee_id === employeeId)
    const payload = {
      employee_id: employeeId,
      manager_id: currentUser ? currentUser.id : null,
      rating,
      comment,
      status,
    }

    if (existing) {
      set((s) => ({
        reviews: s.reviews.map((r) =>
          r.id === existing.id ? { ...r, ...payload } : r
        ),
      }))
      const { error } = await supabase
        .from('reviews')
        .update(payload)
        .eq('id', existing.id)
      if (error) set({ error: error.message })
    } else {
      const { data, error } = await supabase
        .from('reviews')
        .insert(payload)
        .select()
        .single()
      if (error) {
        set({ error: error.message })
        return
      }
      set((s) => ({ reviews: [...s.reviews, data] }))
    }
  },

  // ---- Teams ---------------------------------------------------------------
  addTeam: async (teamData) => {
    const { data, error } = await supabase
      .from('teams')
      .insert(teamData)
      .select()
      .single()
    if (error) {
      set({ error: error.message })
      return null
    }
    set((s) => ({ teams: [...s.teams, data] }))
    return data
  },

  // ---- Team members --------------------------------------------------------
  addMember: async (teamId, memberData) => {
    const { data, error } = await supabase
      .from('team_members')
      .insert({ ...memberData, team_id: teamId })
      .select()
      .single()
    if (error) {
      set({ error: error.message })
      return null
    }
    set((s) => ({
      teamMembers: {
        ...s.teamMembers,
        [teamId]: [...(s.teamMembers[teamId] || []), data],
      },
    }))
    return data
  },

  removeMember: async (teamId, memberId) => {
    set((s) => ({
      teamMembers: {
        ...s.teamMembers,
        [teamId]: (s.teamMembers[teamId] || []).filter((m) => m.id !== memberId),
      },
    }))
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)
    if (error) set({ error: error.message })
  },

  clearError: () => set({ error: null }),
}))
