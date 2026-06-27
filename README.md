# PerfTrail — Performance Management System

A role-based performance management app for Opstree. Built for a 52-hour hackathon.

**Stack:** React + Vite · Tailwind CSS · Zustand · Supabase · React Router v6

## Features

Three roles, switchable from the top-right pill — no login required for the demo:

- **Employee (Priya Mehta)** — readiness score, own goals (core vs additional), timeline, read-only review.
- **Manager (Riya Sharma)** — approve/reject goals, assign core goals, team table, write reviews, manage teams.
- **HR (Anjali Desai)** — company-wide stats, review readiness by team, goal-type breakdown, full team admin.

## Setup

### 1. Database (Supabase)

In the Supabase SQL editor, run in order:

1. `supabase/schema.sql` — creates tables, disables RLS (hackathon mode), seeds teams.
2. `supabase/seed.sql` — seeds users, goals, timeline events, reviews, and team members.

> `seed.sql` is idempotent — it clears app data (keeping teams) and re-inserts, so it's safe to re-run.

### 2. Environment

Copy `.env.example` to `.env` and fill in your project values:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_publishable_key
```

> ⚠️ Use the **anon / publishable** key (Dashboard → Project Settings → API), **not** a `sb_secret_...` key. Anything in a `VITE_` var ships to the browser and is publicly readable.

### 3. Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
```

## Project structure

```
src/
├── lib/supabase.js          Supabase client
├── store/useStore.js        Zustand store (all state + async actions, optimistic updates)
├── components/              TopNav, StatCard, GoalCard, TimelineItem, Badge,
│                            ProgressBar, ScoreRing, CycleBar, AddGoalForm,
│                            AddEntryForm, MemberTable
├── pages/
│   ├── dashboard/           EmployeeDashboard, ManagerDashboard, HRDashboard
│   ├── GoalsPage.jsx
│   ├── TimelinePage.jsx
│   ├── ReviewPage.jsx
│   └── TeamsPage.jsx
├── App.jsx                  Router + loadAll() bootstrap
└── main.jsx
```

## Goal-type logic

| Added by | source | goal_type | status | border |
|----------|--------|-----------|--------|--------|
| Manager  | `manager`  | `core`       | `approved` (auto) | purple |
| Employee | `employee` | `additional` | `pending`         | blue   |
