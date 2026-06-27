# 📈 PerfTrail — Performance Management System

`React` · `Vite` · `Tailwind CSS` · `Zustand` · `Supabase` · `PostgreSQL`

🌐 **Live Demo → [perftrail.vercel.app](https://perftrail.vercel.app)**

A full-stack, role-based **Performance Management System** built for Opstree in a hackathon. Manages the complete performance cycle — goal setting, progress tracking, evidence timelines, and manager reviews — across three roles (**Employee, Manager, HR**) with real authentication and UI-driven user administration.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Roles & Permissions](#-roles--permissions)
- [Goal-Type Logic](#-goal-type-logic)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Edge Functions](#-edge-functions)
- [Setup & Installation](#-setup--installation)
- [Demo Walkthrough](#-demo-walkthrough)
- [Team](#-team)

---

## 🎯 Overview

PerfTrail handles every stage of an employee's performance cycle — from a manager assigning core goals, to the employee logging progress and evidence, to the manager writing the final review — with HR overseeing the whole organisation.

Built as a hackathon MVP with a focus on:

- A working, **demo-ready** product over feature completeness
- **Real authentication** (Supabase Auth) with per-role access
- **UI-driven administration** — create, edit, and delete user accounts without touching the database
- A clean, role-aware single-page app with minimal dependencies

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         SIGN-IN (public)                              │
│                                                                        │
│   /login  →  Supabase Auth (email + password, JWT session)           │
└──────────────────────────────────────────────────────────────────────┘
                                    │
┌──────────────────────────────────────────────────────────────────────┐
│                    ROLE-AWARE APP (authenticated)                     │
│                                                                        │
│  ┌───────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌───────┐ ┌──────┐ │
│  │ Dashboard │ │ Goals  │ │ Timeline │ │ Review │ │ Teams │ │People│ │
│  │ (per role)│ │        │ │          │ │        │ │ (M/HR)│ │(M/HR)│ │
│  └───────────┘ └────────┘ └──────────┘ └────────┘ └───────┘ └──────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                    │
┌──────────────────────────────────────────────────────────────────────┐
│                     React 18 + Vite SPA                               │
│                                                                        │
│   React Router v6 (role guards)  →  Zustand store (state + actions)  │
│                                  →  @supabase/supabase-js (browser)  │
└──────────────────────────────────────────────────────────────────────┘
                                    │
┌──────────────────────────────────────────────────────────────────────┐
│                             Supabase                                   │
│                                                                        │
│   Supabase Auth (JWT)        PostgreSQL                               │
│   • Email + password         • teams / users / goals / events         │
│   • Sessions & self-serve      reviews / team_members                 │
│     password change          • users linked to auth.users (auth_id)   │
│                                                                        │
│   Edge Functions (Deno, service-role) — admin user management:        │
│   • create-user   • update-user   • delete-user                       │
│     (permission matrix enforced server-side)                          │
└──────────────────────────────────────────────────────────────────────┘
```

The **service-role key never reaches the browser** — all privileged account operations run inside Supabase Edge Functions, which verify the caller's JWT and role before acting.

---

## 👥 Roles & Permissions

| Capability                         | Employee | Manager | HR  |
| ---------------------------------- | :------: | :-----: | :-: |
| Sign in / change own password      |    ✅    |   ✅    | ✅  |
| View own dashboard, goals, timeline|    ✅    |   ✅    | ✅  |
| Add additional (self) goals        |    ✅    |   ✅    | ✅  |
| Approve / reject goals             |    —     |   ✅    | ✅  |
| Assign core goals                  |    —     |   ✅    | ✅  |
| Write reviews                      |    —     |   ✅    | ✅  |
| Teams admin                        |    —     |   ✅    | ✅  |
| People — **add** accounts          |    —     | Employees (own team) | Any role |
| People — **edit** accounts         |    —     | Employees (own team) | Anyone (incl. role/team) |
| People — **delete** accounts       |    —     | Employees (own team) | Anyone (except self) |
| Company-wide stats                 |    —     |   —     | ✅  |

The People permission matrix is enforced **both** in the UI and inside the Edge Functions.

---

## 🔀 Goal-Type Logic

| Added by | `source`   | `goal_type`  | `status`            | Border |
| -------- | ---------- | ------------ | ------------------- | ------ |
| Manager  | `manager`  | `core`       | `approved` (auto)   | Purple |
| Employee | `employee` | `additional` | `pending` (approval)| Blue   |

Core goals are assigned top-down and weighted; additional goals are self-driven growth items that a manager approves.

---

## ✨ Features

### 🔐 Authentication
- **Email + password sign-in** via Supabase Auth (hashed passwords, JWT sessions)
- **Session persistence** — stay logged in across refreshes
- **Self-service password change** for every user (verifies the current password first)
- **Log out** from the top-right account menu

### 👤 Employee
- **Readiness score** ring summarising goal progress
- **My Goals** — core vs additional, weights, progress bars
- **Add additional goals** for self-driven growth (enters as `pending`)
- **Timeline** of progress, achievements, check-ins, and evidence
- **Read-only review** view

### 🧑‍💼 Manager
- **Approve / reject** employee goals
- **Assign core goals** to team members
- **Team table** — members, goals, progress, review readiness
- **Write reviews** with 1–5 ratings and comments
- **Teams admin** — create teams, manage members
- **People admin** — add / edit / delete **employees on their own team**

### 🛡️ HR
- **Company-wide stats** — headcount, goal-type breakdown, review readiness by team
- **Full Teams admin** across the organisation
- **People admin** — add / edit / delete **any** account, change roles and teams

### 🗂️ People (admin console)
- **Search** by name, email, or title
- **Filter** by role (with live counts) and by team
- **Pagination** (10 per page) for large rosters
- **Add account** — creates a real auth login + profile in one step
- **Edit account** — name, title, role, team, and **password reset**
- **Delete account** — removes the login + profile and cleans up related rows
- Role-aware controls: you only see actions you're permitted to perform

### 🧭 Teams
- Live, **derived manager** names (from the actual manager user on each team — never stale)
- Per-team stats: members, goals, average progress, review readiness
- Member table with goals, progress, timeline, and review status

---

## 🛠️ Tech Stack

| Layer            | Technology                | Purpose                                   |
| ---------------- | ------------------------- | ----------------------------------------- |
| Framework        | React 18 + Vite           | SPA, fast dev server, optimized builds    |
| Routing          | React Router v6           | Role-guarded client-side routing          |
| State            | Zustand                   | Global store + async actions              |
| Styling          | Tailwind CSS v3           | Utility-first responsive UI               |
| Database         | Supabase (PostgreSQL)     | Data persistence                          |
| Auth             | Supabase Auth             | Email/password login, JWT sessions        |
| Admin functions  | Supabase Edge Functions   | Server-side user management (service role)|
| Client SDK       | @supabase/supabase-js     | Browser data + auth client                |
| Deployment       | Vercel                    | Zero-config production deploy (SPA)       |

---

## 📁 Project Structure

```
pms-hackathon/
│
├── src/
│   ├── main.jsx                          # App entry + BrowserRouter
│   ├── App.jsx                           # Routes + role guards + auth gate
│   ├── index.css                         # Tailwind directives + UI classes
│   │
│   ├── lib/
│   │   └── supabase.js                   # Supabase browser client
│   │
│   ├── store/
│   │   └── useStore.js                   # Zustand store — data, auth, admin actions
│   │
│   ├── pages/
│   │   ├── LoginPage.jsx                 # 🔐 Email + password sign-in
│   │   ├── GoalsPage.jsx                 # 🎯 Goals (core vs additional)
│   │   ├── TimelinePage.jsx              # 🕒 Progress / evidence timeline
│   │   ├── ReviewPage.jsx                # ⭐ Manager review writing
│   │   ├── TeamsPage.jsx                 # 👥 Teams + members (live manager)
│   │   ├── PeoplePage.jsx                # 🗂️ Admin console (add/edit/delete users)
│   │   └── dashboard/
│   │       ├── EmployeeDashboard.jsx     # Readiness score + own goals
│   │       ├── ManagerDashboard.jsx      # Team overview + approvals
│   │       └── HRDashboard.jsx           # Company-wide stats
│   │
│   └── components/
│       ├── TopNav.jsx                    # Nav + account menu (password / logout)
│       ├── ChangePasswordModal.jsx       # Self-service password change
│       ├── MemberTable.jsx               # Team member table
│       ├── GoalCard.jsx                  # Goal card + actions
│       ├── AddGoalForm.jsx               # Add goal form
│       ├── AddEntryForm.jsx              # Add timeline entry
│       ├── TimelineItem.jsx              # Timeline event row
│       ├── ScoreRing.jsx                 # Readiness score ring
│       ├── ProgressBar.jsx · CycleBar.jsx · StatCard.jsx · Badge.jsx
│
├── supabase/
│   ├── schema.sql                        # Tables + RLS + team seed
│   ├── seed.sql                          # Users, goals, events, reviews, members
│   ├── setup.sql                         # Combined schema + seed (one-shot, idempotent)
│   └── functions/
│       ├── create-user/index.ts          # ➕ Create account (auth + profile)
│       ├── update-user/index.ts          # ✏️ Edit account + password reset
│       └── delete-user/index.ts          # 🗑️ Delete account + cascade cleanup
│
├── vercel.json                           # SPA rewrite for client-side routing
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## 🗄️ Database Schema

### Core tables

```
teams           id · name · full_name · color · manager_name · dept · created_at
users           id · name · initials · role · team_id · title · manager_name
                · email · auth_id            (auth_id links to auth.users)
goals           id · employee_id · title · metric · weight · progress
                · status · source · goal_type · assigned_by · due_date
                · team_id · category
events          id · employee_id · type · text · added_by · added_by_role
                · goal_id · team_id · created_at
reviews         id · employee_id · manager_id · rating · comment · status
team_members    id · team_id · user_id · name · initials · role_title · manager_name
```

### Constraints & enums

```
users.role        ∈ { employee, manager, hr }
goals.status      ∈ { pending, approved, rejected }
goals.source      ∈ { manager, employee }
goals.goal_type   ∈ { core, additional }
events.type       ∈ { progress, achievement, checkin, evidence }
reviews.status    ∈ { draft, submitted }
reviews.rating    1–5
users.email       unique     users.auth_id  unique → auth.users(id)
```

> **Auth linking:** each app `users` row is linked to a Supabase Auth user via `auth_id` + `email`. RLS is disabled for the hackathon (the browser uses the safe **anon** key); privileged writes go through Edge Functions with the service-role key.

---

## ⚡ Edge Functions

Server-side (Deno) functions that manage accounts with the service-role key. Each verifies the caller's JWT, looks up their role, and enforces the permission matrix.

| Function       | Action                                   | Who can call                              |
| -------------- | ---------------------------------------- | ----------------------------------------- |
| `create-user`  | Create auth login + profile              | HR (any role) · Manager (employees, own team) |
| `update-user`  | Edit name/title + role/team (HR) + password reset | HR (anyone) · Manager (own-team employees) |
| `delete-user`  | Delete login + profile + cascade cleanup | HR (anyone) · Manager (own-team employees); never self |

Functions read the platform-injected `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` — no secrets are committed or shipped to the browser.

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+
- A Supabase project (free tier is sufficient)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (only needed to deploy Edge Functions)

### 1. Clone the repository
```bash
git clone https://github.com/Rajnish-Snaatak/-pms-hackathon.git
cd -pms-hackathon
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-publishable-key
```
> ⚠️ Use the **anon / publishable** key (Dashboard → Project Settings → API), **not** a `sb_secret_…` key. Anything in a `VITE_` var ships to the browser.

### 4. Create the database
In Supabase Dashboard → **SQL Editor**, run the one-shot setup (idempotent — safe to re-run):
```
supabase/setup.sql
```
This creates all tables, disables RLS (hackathon mode), and seeds teams, users, goals, events, reviews, and team members. (You can also run `schema.sql` then `seed.sql` separately.)

### 5. Create auth logins for the seed users
Each seed user needs a matching Supabase Auth account linked via `auth_id`. Create them in **Authentication → Users** (Auto Confirm ✅) and set each row's `email` + `auth_id`, **or** script it with the service-role key (server-side only).

Demo accounts (example): `priya.mehta@…` (Employee), `riya.sharma@…` (Manager), `anjali.desai@…` (HR).

### 6. Deploy the Edge Functions (for People admin)
```bash
supabase link --project-ref your-project-ref
supabase functions deploy create-user
supabase functions deploy update-user
supabase functions deploy delete-user
```

### 7. Start the dev server
```bash
npm run dev      # http://localhost:5173
npm run build    # production build
```

### 8. Deploy to Vercel
The repo includes `vercel.json` (SPA rewrite). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project, then:
```bash
vercel --prod
```

---

## 🎬 Demo Walkthrough

```
Step 1 ── Visit the app → Sign in as HR (anjali.desai@…)
          See company-wide stats across all teams.

Step 2 ── HR → People → "+ Add account"
          Create a Manager (role + team), then an Employee.
          ✅ Real login created — sign in as them to verify.

Step 3 ── Sign in as the Manager
          Goals → approve a pending goal / assign a core goal.
          Teams → manager name shows the real manager (live-derived).

Step 4 ── Sign in as an Employee
          Dashboard → readiness score.
          Goals → add an "additional" goal (enters as pending).
          Timeline → log a progress entry / evidence.

Step 5 ── Manager → Review
          Give a 1–5 rating + comment, submit the review.

Step 6 ── Any user → top-right menu → "Change password"
          Verify current password, set a new one, sign back in.

Step 7 ── HR → People → search / filter / paginate
          Edit a user (role, team, password) or delete an account.
```

---

## 👥 Team

- Rajnish Sharma
- Tina Bhatnagar
- Mehul Sharma
- Imran Ahmad

---

<sub>Built with ❤️ for the Opstree hackathon · Deployed on [Vercel](https://perftrail.vercel.app)</sub>
