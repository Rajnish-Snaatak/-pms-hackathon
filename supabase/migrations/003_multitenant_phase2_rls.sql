-- ============================================================================
-- Multi-tenancy — Phase 2: Row Level Security (tenant isolation)
-- Enables RLS on every tenant table and restricts all access to rows in the
-- caller's organization (via current_org_id()). Service-role calls (Edge
-- Functions) bypass RLS and enforce org isolation in code.
--
-- ⚠️ Behavior-changing: after this runs, the browser (anon/authenticated key)
-- only ever sees the logged-in user's organization.
-- ============================================================================

-- Helper macro pattern applied per table below:
--   enable RLS, then one FOR ALL policy scoped to current_org_id().

-- organizations: a user can see/act on their own org only
alter table organizations enable row level security;
drop policy if exists org_isolation on organizations;
create policy org_isolation on organizations
  for all
  using (id = current_org_id())
  with check (id = current_org_id());

-- teams
alter table teams enable row level security;
drop policy if exists teams_isolation on teams;
create policy teams_isolation on teams
  for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- users
alter table users enable row level security;
drop policy if exists users_isolation on users;
create policy users_isolation on users
  for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- goals
alter table goals enable row level security;
drop policy if exists goals_isolation on goals;
create policy goals_isolation on goals
  for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- events
alter table events enable row level security;
drop policy if exists events_isolation on events;
create policy events_isolation on events
  for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- reviews
alter table reviews enable row level security;
drop policy if exists reviews_isolation on reviews;
create policy reviews_isolation on reviews
  for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- team_members
alter table team_members enable row level security;
drop policy if exists team_members_isolation on team_members;
create policy team_members_isolation on team_members
  for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());
