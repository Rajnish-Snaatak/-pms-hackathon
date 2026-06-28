-- ============================================================================
-- Multi-tenancy — Phase 0 (non-breaking groundwork)
-- Adds an organizations table + organization_id to every tenant table and
-- backfills all existing rows into a default organization. Columns stay
-- NULLABLE and RLS stays disabled, so current behavior is unchanged.
-- Safe / idempotent: re-running will not duplicate the default org.
-- ============================================================================

-- 1. Organizations table
create table if not exists organizations (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  slug       text unique,
  plan       text default 'free',
  created_at timestamptz default now()
);

alter table organizations disable row level security;

-- 2. Default organization for all existing data
insert into organizations (name, slug)
select 'Opstree', 'opstree'
where not exists (select 1 from organizations where slug = 'opstree');

-- 3. Add organization_id to every tenant-scoped table (nullable for now)
alter table teams        add column if not exists organization_id uuid references organizations(id);
alter table users        add column if not exists organization_id uuid references organizations(id);
alter table goals        add column if not exists organization_id uuid references organizations(id);
alter table events       add column if not exists organization_id uuid references organizations(id);
alter table reviews      add column if not exists organization_id uuid references organizations(id);
alter table team_members add column if not exists organization_id uuid references organizations(id);

-- 4. Backfill all existing rows into the default organization
do $$
declare
  org uuid;
begin
  select id into org from organizations where slug = 'opstree';

  update teams        set organization_id = org where organization_id is null;
  update users        set organization_id = org where organization_id is null;
  update goals        set organization_id = org where organization_id is null;
  update events       set organization_id = org where organization_id is null;
  update reviews      set organization_id = org where organization_id is null;
  update team_members set organization_id = org where organization_id is null;
end $$;

-- 5. Indexes for tenant-scoped lookups
create index if not exists teams_org_idx        on teams(organization_id);
create index if not exists users_org_idx        on users(organization_id);
create index if not exists goals_org_idx        on goals(organization_id);
create index if not exists events_org_idx       on events(organization_id);
create index if not exists reviews_org_idx      on reviews(organization_id);
create index if not exists team_members_org_idx on team_members(organization_id);
