-- ============================================================================
-- Multi-tenancy — Phase 4: lock in the invariant
-- Every row is now stamped with an organization_id (backfilled + enforced by
-- the app and Edge Functions), so make the column NOT NULL on all tenant
-- tables. Prevents any future row from being created without a tenant.
-- ============================================================================

alter table teams        alter column organization_id set not null;
alter table users        alter column organization_id set not null;
alter table goals        alter column organization_id set not null;
alter table events       alter column organization_id set not null;
alter table reviews      alter column organization_id set not null;
alter table team_members alter column organization_id set not null;
