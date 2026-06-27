-- ============================================================================
-- PerfTrail — full setup (schema + seed) in one run. Safe to re-run.
-- ============================================================================

-- Clean slate (children first via cascade)
drop table if exists team_members cascade;
drop table if exists reviews cascade;
drop table if exists events cascade;
drop table if exists goals cascade;
drop table if exists users cascade;
drop table if exists teams cascade;

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

-- TEAM MEMBERS (with display fields used by the UI)
create table team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id),
  user_id uuid references users(id),
  name text,
  initials text,
  role_title text,
  manager_name text
);

-- DISABLE RLS for hackathon
alter table teams        disable row level security;
alter table users        disable row level security;
alter table goals        disable row level security;
alter table events       disable row level security;
alter table reviews      disable row level security;
alter table team_members disable row level security;

-- ---- SEED TEAMS ------------------------------------------------------------
insert into teams (name, full_name, color, manager_name, dept) values
  ('COE',     'Centre of Excellence',  '#7b2fff', 'Riya Sharma',  'Engineering'),
  ('AWS',     'Cloud Infrastructure',  '#188038', 'Preeti Joshi', 'Infrastructure'),
  ('Central', 'Central Engineering',   '#1a73e8', 'Suresh Nair',  'Engineering'),
  ('Olly',    'Observability',         '#e8710a', 'Amit Rao',     'Engineering');

-- ---- USERS -----------------------------------------------------------------
insert into users (name, initials, role, team_id, title, manager_name) values
  ('Priya Mehta',  'PM', 'employee', (select id from teams where name = 'COE'),     'Senior Software Engineer', 'Riya Sharma'),
  ('Riya Sharma',  'RS', 'manager',  (select id from teams where name = 'COE'),     'Engineering Manager',      null),
  ('Anjali Desai', 'AD', 'hr',       (select id from teams where name = 'Central'), 'HR Business Partner',      null),
  ('Nisha Singh',  'NS', 'employee', (select id from teams where name = 'COE'),     'Software Engineer',        'Riya Sharma'),
  ('Arjun Kumar',  'AK', 'employee', (select id from teams where name = 'COE'),     'Software Engineer',        'Riya Sharma'),
  ('Vikram Rao',   'VR', 'employee', (select id from teams where name = 'AWS'),     'Cloud Engineer',           'Preeti Joshi');

-- ---- GOALS -----------------------------------------------------------------
insert into goals (employee_id, title, metric, weight, progress, status, source, goal_type, assigned_by, due_date, team_id, category) values
  ((select id from users where name = 'Priya Mehta'), 'Reduce API latency by 30%', 'p95 under 200ms',     25, 100, 'approved', 'manager', 'core', 'Riya Sharma', '2025-10-15', (select id from teams where name = 'COE'), 'Engineering'),
  ((select id from users where name = 'Priya Mehta'), 'Onboarding redesign',       'User testing passed', 30, 75,  'approved', 'manager', 'core', 'Riya Sharma', '2025-09-30', (select id from teams where name = 'COE'), 'Process'),
  ((select id from users where name = 'Priya Mehta'), 'Team mentorship program',   '3 mentees onboarded', 20, 40,  'approved', 'manager', 'core', 'Riya Sharma', '2025-11-01', (select id from teams where name = 'COE'), 'Leadership');

insert into goals (employee_id, title, metric, weight, progress, status, source, goal_type, assigned_by, due_date, team_id, category) values
  ((select id from users where name = 'Priya Mehta'), 'AWS Solutions Architect certification', 'Pass SAA-C03 exam',        10, 45, 'approved', 'employee', 'additional', null, '2025-09-30', (select id from teams where name = 'COE'), 'Learning'),
  ((select id from users where name = 'Priya Mehta'), 'Write 2 internal tech blog posts',      'Published on Opstree blog', 5, 50, 'pending',  'employee', 'additional', null, '2025-09-30', (select id from teams where name = 'COE'), 'Growth');

insert into goals (employee_id, title, metric, weight, progress, status, source, goal_type, assigned_by, due_date, team_id, category) values
  ((select id from users where name = 'Nisha Singh'), 'Improve test coverage to 80%', null, 30, 35, 'pending',  'manager', 'core', 'Riya Sharma',  null, (select id from teams where name = 'COE'), 'Quality'),
  ((select id from users where name = 'Arjun Kumar'), 'Ship auth v2 module',          null, 40, 90, 'approved', 'manager', 'core', 'Riya Sharma',  null, (select id from teams where name = 'COE'), 'Engineering'),
  ((select id from users where name = 'Vikram Rao'),  'Own Q3 release process',       null, 35, 20, 'pending',  'manager', 'core', 'Preeti Joshi', null, (select id from teams where name = 'AWS'), 'Process');

-- ---- TIMELINE EVENTS -------------------------------------------------------
insert into events (employee_id, type, text, added_by, added_by_role, goal_id, team_id, created_at) values
  ((select id from users where name = 'Priya Mehta'), 'achievement', 'API latency reduced to 180ms — exceeded target by 30%',                       'Priya Mehta', 'employee', (select id from goals where title = 'Reduce API latency by 30%'), (select id from teams where name = 'COE'), '2025-06-24'),
  ((select id from users where name = 'Priya Mehta'), 'progress',    'Onboarding redesign at 75% — user testing complete, dev handoff done',          'Priya Mehta', 'employee', (select id from goals where title = 'Onboarding redesign'),       (select id from teams where name = 'COE'), '2025-06-20'),
  ((select id from users where name = 'Priya Mehta'), 'checkin',     '1:1 with Riya — discussed mentorship goal timeline, first session planned next week', 'Riya Sharma', 'manager',  (select id from goals where title = 'Team mentorship program'),   (select id from teams where name = 'COE'), '2025-06-14'),
  ((select id from users where name = 'Priya Mehta'), 'progress',    'AWS cert: 3 of 6 modules done, exam booked for Sep 12',                         'Priya Mehta', 'employee', (select id from goals where title = 'AWS Solutions Architect certification'), (select id from teams where name = 'COE'), '2025-05-30'),
  ((select id from users where name = 'Priya Mehta'), 'evidence',    'Published blog post: Lessons from our API optimisation sprint — 340 views',     'Priya Mehta', 'employee', (select id from goals where title = 'Write 2 internal tech blog posts'), (select id from teams where name = 'COE'), '2025-06-10'),
  ((select id from users where name = 'Arjun Kumar'), 'achievement', 'Auth v2 core module shipped to staging — zero P0 bugs in first sprint',         'Arjun Kumar', 'employee', (select id from goals where title = 'Ship auth v2 module'),       (select id from teams where name = 'COE'), '2025-06-18'),
  ((select id from users where name = 'Nisha Singh'), 'progress',    'Test coverage at 35%, framework setup done, starting unit tests this week',      'Nisha Singh', 'employee', (select id from goals where title = 'Improve test coverage to 80%'), (select id from teams where name = 'COE'), '2025-06-12'),
  ((select id from users where name = 'Nisha Singh'), 'checkin',     '1:1 with Riya — struggling with test framework, pair session with Priya planned', 'Riya Sharma', 'manager',  null,                                                            (select id from teams where name = 'COE'), '2025-06-05'),
  ((select id from users where name = 'Priya Mehta'), 'progress',    'Latency profiling done, 3 N+1 queries fixed, down from 310ms to 240ms',          'Priya Mehta', 'employee', (select id from goals where title = 'Reduce API latency by 30%'), (select id from teams where name = 'COE'), '2025-05-20'),
  ((select id from users where name = 'Arjun Kumar'), 'evidence',    'Load test results: auth module handles 10k RPS without degradation',            'Arjun Kumar', 'employee', (select id from goals where title = 'Ship auth v2 module'),       (select id from teams where name = 'COE'), '2025-06-22');

-- ---- REVIEWS ---------------------------------------------------------------
insert into reviews (employee_id, manager_id, rating, comment, status) values
  ((select id from users where name = 'Priya Mehta'), (select id from users where name = 'Riya Sharma'), null, '', 'draft'),
  ((select id from users where name = 'Arjun Kumar'), (select id from users where name = 'Riya Sharma'), 4, 'Strong Q3. Auth v2 delivery was excellent and the load test results speak for themselves.', 'submitted');

-- ---- TEAM MEMBERS ----------------------------------------------------------
insert into team_members (team_id, user_id, name, initials, role_title, manager_name) values
  ((select id from teams where name = 'COE'),     (select id from users where name = 'Priya Mehta'), 'Priya Mehta', 'PM', 'Senior Software Engineer', 'Riya Sharma'),
  ((select id from teams where name = 'COE'),     (select id from users where name = 'Nisha Singh'), 'Nisha Singh', 'NS', 'Software Engineer',        'Riya Sharma'),
  ((select id from teams where name = 'COE'),     (select id from users where name = 'Arjun Kumar'), 'Arjun Kumar', 'AK', 'Software Engineer',        'Riya Sharma'),
  ((select id from teams where name = 'AWS'),     (select id from users where name = 'Vikram Rao'),  'Vikram Rao',  'VR', 'Cloud Engineer',           'Preeti Joshi'),
  ((select id from teams where name = 'Central'), (select id from users where name = 'Anjali Desai'),'Anjali Desai','AD', 'HR Business Partner',      null);
