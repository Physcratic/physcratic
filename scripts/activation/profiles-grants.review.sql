-- PROPOSAL ONLY. Separate owner approval of target, role and file hash required.
-- Delta after existing auth/publication grants. No media or achievement rights.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
GRANT USAGE ON SCHEMA public TO :"runtime_role";
GRANT SELECT,INSERT,UPDATE ON public.community_profile,
  public.community_profile_write_limit TO :"runtime_role";
COMMIT;
