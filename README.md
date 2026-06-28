# 📈 PerfTrail — Performance Management System

`React` · `Vite` · `Tailwind CSS` · `Zustand` · `Supabase` · `PostgreSQL` · `Multi-Tenant`

🌐 **Live Demo → [perftrail.vercel.app](https://perftrail.vercel.app)**

A full-stack, role-based **Performance Management System** built as a **multi-tenant SaaS**. Manages the complete performance cycle — goal setting, progress tracking, evidence timelines, and manager reviews — across three roles (**Employee, Manager, HR**), with real authentication, UI-driven user administration, and full per-organization data isolation. Any company can sign up and get its own private workspace.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Multi-Tenancy](#-multi-tenancy)
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

Built as a hackathon MVP, then evolved into a multi-tenant SaaS, with a focus on:

- A working, **demo-ready** product over feature completeness
- **Real authentication** (Supabase Auth) with per-role access
- **Multi-tenant isolation** — each organization's data is private, enforced by Postgres Row Level Security
- **Self-serve onboarding** — any company can create its own workspace
- **UI-driven administration** — create, edit, and delete user accounts without touching the database

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     PUBLIC (signed out)                               │
│                                                                        │
│   /login   →  Supabase Auth (email + password, JWT session)          │
│   /signup  →  Create a new organization + its first HR admin         │
└──────────────────────────────────────────────────────────────────────┘
                                    │
┌──────────────────────────────────────────────────────────────────────┐
│              ROLE-AWARE APP (authenticated, scoped to org)            │
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
│   Supabase Auth (JWT)        PostgreSQL + Row Level Security          │
│   • Email + password         • organizations (tenant root)            │
│   • app_metadata: org + role • every table has organization_id        │
│   • Sessions & self-serve    • RLS: rows visible only where           │
│     password change            organization_id = current_org_id()     │
│                              • teams/users/goals/events/reviews/...    │
│                                                                        │
│   Edge Functions (Deno, service-role) — privileged + tenant-aware:    │
│   • create-organization (public signup)                               │
│   • create-user · update-user · delete-user (same-org enforced)       │
└──────────────────────────────────────────────────────────────────────┘
```

**Two layers of isolation:**
- **In the browser** — the anon key is RLS-restricted; every query is automatically scoped to the logged-in user's organization via `current_org_id()`.
- **In Edge Functions** — the service-role key bypasses RLS, so each function re-checks that the caller and target belong to the **same organization** in code. The service-role key never reaches the browser.

---

## 🏢 Multi-Tenancy

PerfTrail uses **pooled multi-tenancy**: one database, one `organization_id` on every tenant table, and **Row Level Security** to guarantee each org only ever sees its own rows. The application logic (roles, goals, reviews, People/Teams admin) is identical for every tenant — isolation happens transparently at the database layer.

**How it works**
- An **`organizations`** table is the tenant root; every other table carries `organization_id NOT NULL`.
- A `SECURITY DEFINER` function **`current_org_id()`** resolves the caller's org from `auth.uid()`.
- **RLS policies** on all tables enforce `organization_id = current_org_id()` for select / insert / update / delete.
- New users are stamped with their creator's org (in the profile **and** the auth user's `app_metadata`).
- **Self-serve signup** (`/signup`) creates a fresh org + its first HR admin via the `create-organization` Edge Function.

**Verified isolation** — signed in to org A you cannot read *or* write any of org B's data; an unauthenticated client sees nothing.

The rollout is split into reproducible, low-risk phases under `supabase/migrations/`:

| Migration | Phase | What it does |
| --------- | :---: | ------------ |
| `001_multitenant_phase0.sql` | 0 | `organizations` table + `organization_id` columns, backfill default org |
| `002_multitenant_phase1.sql` | 1 | `current_org_id()` function (used by RLS) |
| `003_multitenant_phase2_rls.sql` | 2 | Enable RLS + org-isolation policies on all tables |
| `004_multitenant_phase4_notnull.sql` | 4 | `organization_id NOT NULL` invariant |

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

### 🏢 Organizations (multi-tenant)
- **Self-serve signup** (`/signup`) — create a new company workspace and become its HR admin
- **Complete data isolation** — each org sees only its own teams, people, goals, and reviews (RLS-enforced)
- **Org name shown in the nav** so users always know which workspace they're in

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
| Multi-tenancy    | Postgres Row Level Security | Per-organization data isolation         |
| Admin functions  | Supabase Edge Functions   | Server-side user/org management (service role)|
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
│   │   ├── SignupPage.jsx                # 🏢 Create a new organization
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
│   ├── schema.sql                        # Base tables + team seed
│   ├── seed.sql                          # Users, goals, events, reviews, members
│   ├── setup.sql                         # Combined schema + seed (one-shot, idempotent)
│   ├── migrations/                       # Multi-tenancy rollout (phases 0–4)
│   │   ├── 001_multitenant_phase0.sql    #   orgs table + organization_id + backfill
│   │   ├── 002_multitenant_phase1.sql    #   current_org_id() function
│   │   ├── 003_multitenant_phase2_rls.sql#   enable RLS + isolation policies
│   │   └── 004_multitenant_phase4_notnull.sql  # NOT NULL invariant
│   └── functions/
│       ├── create-organization/index.ts  # 🏢 Public signup (org + first admin)
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
organizations   id · name · slug · plan · created_at          (tenant root)
teams           id · name · full_name · color · manager_name · dept · organization_id
users           id · name · initials · role · team_id · title · manager_name
                · email · auth_id · organization_id   (auth_id links to auth.users)
goals           id · employee_id · title · metric · weight · progress
                · status · source · goal_type · assigned_by · due_date
                · team_id · category · organization_id
events          id · employee_id · type · text · added_by · added_by_role
                · goal_id · team_id · organization_id · created_at
reviews         id · employee_id · manager_id · rating · comment · status · organization_id
team_members    id · team_id · user_id · name · initials · role_title · organization_id
```

Every tenant table carries `organization_id NOT NULL` referencing `organizations(id)`.

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

> **Auth linking:** each app `users` row is linked to a Supabase Auth user via `auth_id` + `email`.
>
> **Row Level Security is enabled** on all tenant tables. Every policy enforces `organization_id = current_org_id()`, so the browser's **anon** key can only ever touch the logged-in user's organization. Privileged, cross-cutting writes go through Edge Functions with the service-role key (which re-check org in code).

---

## ⚡ Edge Functions

Server-side (Deno) functions that run with the service-role key. Each verifies the caller's JWT, looks up their role + organization, and enforces both the permission matrix **and** same-org isolation.

| Function              | Action                                   | Who can call                              |
| --------------------- | ---------------------------------------- | ----------------------------------------- |
| `create-organization` | Create a new org + its first HR admin    | **Public** (signup)                       |
| `create-user`         | Create auth login + profile (stamped with creator's org) | HR (any role) · Manager (employees, own team) |
| `update-user`         | Edit name/title + role/team (HR) + password reset | HR (anyone) · Manager (own-team employees) |
| `delete-user`         | Delete login + profile + cascade cleanup | HR (anyone) · Manager (own-team employees); never self |

All account functions reject any target outside the caller's organization. Functions read the platform-injected `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` — no secrets are committed or shipped to the browser.

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
This creates the base tables and seeds teams, users, goals, events, reviews, and team members.

### 5. Apply the multi-tenancy migrations (in order)
```
supabase/migrations/001_multitenant_phase0.sql   # orgs table + organization_id + backfill
supabase/migrations/002_multitenant_phase1.sql   # current_org_id()
supabase/migrations/003_multitenant_phase2_rls.sql  # enable RLS + isolation policies
supabase/migrations/004_multitenant_phase4_notnull.sql  # NOT NULL invariant
```
After this, RLS is **on** and every query is scoped to the caller's organization.

### 6. Deploy the Edge Functions
```bash
supabase link --project-ref your-project-ref
supabase functions deploy create-organization   # public signup
supabase functions deploy create-user
supabase functions deploy update-user
supabase functions deploy delete-user
```

### 7. Create your first organization
The cleanest path is the app itself: open **`/signup`** and create an organization — you become its HR admin, then invite your team from the **People** page. (For the seeded demo org, link the seed `users` rows to Supabase Auth accounts via `auth_id` + `app_metadata.organization_id`, scripted with the service-role key.)

### 8. Start the dev server
```bash
npm run dev      # http://localhost:5173
npm run build    # production build
```

### 9. Deploy to Vercel
The repo includes `vercel.json` (SPA rewrite). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project, then:
```bash
vercel --prod
```

---

## 🎬 Demo Walkthrough

```
Step 0 ── Visit /signup → create a new organization
          You become its HR admin and land in a private, empty workspace.
          (Or sign in to the existing demo org as HR.)

Step 1 ── Sign in as HR → see company-wide stats across your org only.
          (Other organizations' data is never visible — RLS isolation.)

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

<sub>Built with ❤️ for the Opstree hackathon · Multi-tenant SaaS · Deployed on [Vercel](https://perftrail.vercel.app)</sub>
