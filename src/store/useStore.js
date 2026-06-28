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
    email: user.email,
    team: team ? team.name : null,
    teamId: user.team_id,
    role: user.role,
    title: user.title,
    organizationId: user.organization_id,
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
      // Resolve the session FIRST so RLS-scoped queries run as the logged-in
      // user (and thus return only their organization's rows).
      const { data: sessionData } = await supabase.auth.getSession()
      const authId = sessionData?.session?.user?.id

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
      const sessionUser = authId ? users.find((u) => u.auth_id === authId) : null

      set({
        teams,
        users,
        goals: goalsRes.data || [],
        events: eventsRes.data || [],
        reviews: reviewsRes.data || [],
        teamMembers: groupMembers(tmRes.data || []),
        currentUser: sessionUser ? toCurrentUser(sessionUser, teams) : null,
        currentRole: sessionUser ? sessionUser.role : 'employee',
        loading: false,
      })
    } catch (err) {
      set({ error: err.message || String(err), loading: false })
    }
  },

  // ---- Auth (real Supabase email/password) ---------------------------------
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) return { error: error.message }

    // Reload data now that we're authenticated — under RLS this returns only
    // the user's organization, and sets currentUser from the session.
    await get().loadAll()
    if (!get().currentUser) {
      await supabase.auth.signOut()
      set({ currentUser: null })
      return { error: 'No PerfTrail profile is linked to this account.' }
    }
    return {}
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ currentUser: null, currentRole: 'employee' })
  },

  // Self-service password change. Verifies the current password first by
  // re-authenticating, then updates to the new one.
  changePassword: async (currentPassword, newPassword) => {
    const { currentUser } = get()
    if (!currentUser?.email) return { error: 'You are not signed in.' }
    const { error: vErr } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword,
    })
    if (vErr) return { error: 'Current password is incorrect.' }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }
    return {}
  },

  // Re-pull users after an admin adds someone (keeps the list fresh).
  refreshUsers: async () => {
    const res = await supabase.from('users').select('*').order('created_at')
    if (!res.error) set({ users: res.data || [] })
    return res.data || []
  },

  // ---- Admin: create a new account (HR / Manager) --------------------------
  // Calls the create-user Edge Function (runs with the service role key).
  createUser: async (payload) => {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: payload,
    })
    // functions.invoke surfaces non-2xx as an error with the response body.
    if (error) {
      let msg = error.message
      try {
        const ctx = await error.context?.json?.()
        if (ctx?.error) msg = ctx.error
      } catch (_) {}
      return { error: msg }
    }
    if (data?.error) return { error: data.error }
    if (data?.user) {
      set((s) => ({ users: [...s.users, data.user] }))
    }
    return { user: data?.user }
  },

  // ---- Admin: edit an account (HR / Manager) -------------------------------
  updateUser: async (id, changes) => {
    const { data, error } = await supabase.functions.invoke('update-user', {
      body: { id, ...changes },
    })
    if (error) {
      let msg = error.message
      try {
        const ctx = await error.context?.json?.()
        if (ctx?.error) msg = ctx.error
      } catch (_) {}
      return { error: msg }
    }
    if (data?.error) return { error: data.error }
    if (data?.user) {
      set((s) => ({
        users: s.users.map((u) => (u.id === id ? data.user : u)),
      }))
    }
    return { user: data?.user }
  },

  // ---- Admin: delete an account (HR / Manager) -----------------------------
  deleteUser: async (id) => {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { id },
    })
    if (error) {
      let msg = error.message
      try {
        const ctx = await error.context?.json?.()
        if (ctx?.error) msg = ctx.error
      } catch (_) {}
      return { error: msg }
    }
    if (data?.error) return { error: data.error }
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }))
    return { id }
  },

  // ---- Goals ---------------------------------------------------------------
  addGoal: async (goalData) => {
    const { data, error } = await supabase
      .from('goals')
      .insert({ ...goalData, organization_id: get().currentUser?.organizationId })
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
      .insert({ ...eventData, organization_id: get().currentUser?.organizationId })
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
      organization_id: currentUser?.organizationId,
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
      .insert({ ...teamData, organization_id: get().currentUser?.organizationId })
      .select()
      .single()
    if (error) {
      set({ error: error.message })
      return null
    }
    set((s) => ({ teams: [...s.teams, data] }))
    return data
  },

  updateTeam: async (id, changes) => {
    const { data, error } = await supabase
      .from('teams')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error: error.message }
    set((s) => ({ teams: s.teams.map((t) => (t.id === id ? data : t)) }))
    return { team: data }
  },

  deleteTeam: async (id) => {
    // Block deletion while the team still has member accounts.
    const memberCount = get().users.filter((u) => u.team_id === id).length
    if (memberCount > 0) {
      return {
        error: `This team still has ${memberCount} member${
          memberCount === 1 ? '' : 's'
        }. Reassign or remove them (via People) first.`,
      }
    }
    // Clear stray references so the FK delete succeeds, then delete the team.
    await supabase.from('events').update({ team_id: null }).eq('team_id', id)
    await supabase.from('goals').update({ team_id: null }).eq('team_id', id)
    await supabase.from('team_members').delete().eq('team_id', id)
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (error) return { error: error.message }
    set((s) => ({ teams: s.teams.filter((t) => t.id !== id) }))
    return { id }
  },

  // ---- Team members --------------------------------------------------------
  addMember: async (teamId, memberData) => {
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        ...memberData,
        team_id: teamId,
        organization_id: get().currentUser?.organizationId,
      })
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
