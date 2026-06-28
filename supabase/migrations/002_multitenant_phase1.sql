-- ============================================================================
-- Multi-tenancy — Phase 1 (non-breaking)
-- Adds current_org_id(), which RLS policies (Phase 2) use to scope every
-- query to the caller's organization. The create-user Edge Function now
-- stamps new accounts with the creator's organization_id and sets the same
-- value in the auth user's app_metadata.
-- ============================================================================

create or replace function current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.users where auth_id = auth.uid() limit 1;
$$;

comment on function current_org_id() is
  'Returns the organization_id of the currently authenticated user (for RLS).';
