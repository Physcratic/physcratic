-- PROPOSAL ONLY. No automatic execution or role/credential/ownership changes.
-- Requires separate owner approval of exact target, runtime role and file hash.
-- psql binding: runtime_role = the independently verified non-owner app role.
-- Preserve already reviewed auth/authoring/contest grants. This is a DELTA,
-- not a complete new-application-role bootstrap. Never apply role-grants.sql whole.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
GRANT USAGE ON SCHEMA public TO :"runtime_role";
GRANT SELECT ON public.community_problem_total TO :"runtime_role";
GRANT SELECT,INSERT,DELETE ON public.community_favourite TO :"runtime_role";
GRANT SELECT,INSERT,UPDATE ON public.community_favourite_limit TO :"runtime_role";
GRANT SELECT ON public.authored_problem,public.authored_revision,
  public.authored_revision_part,public.authored_attempt TO :"runtime_role";
GRANT SELECT(id,"emailVerified") ON public."user" TO :"runtime_role";
-- PostgreSQL row-lock permission. No UPDATE of publication fields is added.
GRANT UPDATE(id) ON public.authored_problem TO :"runtime_role";
-- No direct totals write, trigger EXECUTE, privileged deletion function EXECUTE,
-- staff/evidence access, profile/media/practice grants or owner membership.
COMMIT;
