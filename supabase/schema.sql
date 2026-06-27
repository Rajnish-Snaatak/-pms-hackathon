-- ============================================================================
-- PerfTrail — schema. Run this FIRST in the Supabase SQL editor, then seed.sql.
-- ============================================================================

-- TEAMS
create table teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  full_name text,
  color text,
  manager_name text,
  dept text,
  created_at timestamptz default now()
);

-- USERS
create table users (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  initials text,
  role text check (role in ('employee','manager','hr')),
  team_id uuid references teams(id),
  title text,
  manager_name text,
  created_at timestamptz default now()
);

-- GOALS
create table goals (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references users(id),
  title text not null,
  metric text,
  weight integer default 10,
  progress integer default 0,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  source text check (source in ('manager','employee')),
  goal_type text check (goal_type in ('core','additional')),
  assigned_by text,
  due_date date,
  team_id uuid references teams(id),
  category text,
  created_at timestamptz default now()
);

-- TIMELINE EVENTS
create table events (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references users(id),
  type text check (type in ('progress','achievement','checkin','evidence')),
  text text not null,
  added_by text,
  added_by_role text,
  goal_id uuid references goals(id),
  team_id uuid references teams(id),
  created_at timestamptz default now()
);

-- REVIEWS
create table reviews (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references users(id),
  manager_id uuid references users(id),
  rating integer check (rating between 1 and 5),
  comment text,
  status text default 'draft' check (status in ('draft','submitted')),
  created_at timestamptz default now()
);

-- TEAM MEMBERS (join table with extra fields)
create table team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id),
  user_id uuid references users(id),
  role_title text,
  manager_name text
);

-- DISABLE RLS for hackathon (enable later for production)
alter table teams disable row level security;
alter table users disable row level security;
alter table goals disable row level security;
alter table events disable row level security;
alter table reviews disable row level security;
alter table team_members disable row level security;

-- SEED TEAMS
insert into teams (name, full_name, color, manager_name, dept) values
  ('COE',     'Centre of Excellence',  '#7b2fff', 'Riya Sharma',  'Engineering'),
  ('AWS',     'Cloud Infrastructure',  '#188038', 'Preeti Joshi', 'Infrastructure'),
  ('Central', 'Central Engineering',   '#1a73e8', 'Suresh Nair',  'Engineering'),
  ('Olly',    'Observability',         '#e8710a', 'Amit Rao',     'Engineering');
