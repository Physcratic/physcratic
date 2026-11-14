-- REVIEW ONLY. Never imported/executed by build, startup, deployment or migrations.
-- Separate owner approval binds target, runtime_role, database_name and file hash.
-- psql -X -v ON_ERROR_STOP=1 -v runtime_role=physcratic_runtime_app
--      -v database_name=neondb -f scripts/runtime-role/provision.review.sql
-- New role only. No password is embedded or accepted as a script parameter.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
-- Console/binding inspection establishes project/branch/endpoint before this.
SELECT 1 / ((current_database()=:'database_name'
  AND current_setting('server_version_num')='180007')::integer) AS approved_database_and_version;
CREATE ROLE :"runtime_role" LOGIN PASSWORD NULL NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
-- Reject inherited PUBLIC DDL/privileged capabilities; do not silently change
-- shared ACLs. CREATE ROLE fails if the identifier exists. Reruns are not repairs.
SELECT 1 / ((NOT has_database_privilege(:'runtime_role',current_database(),'CREATE')
  AND NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname NOT LIKE 'pg_%'
    AND nspname<>'information_schema' AND has_schema_privilege(:'runtime_role',oid,'CREATE'))
  AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname<>:'runtime_role'
    AND pg_has_role(:'runtime_role',oid,'MEMBER')))::integer) AS no_inherited_ddl_or_membership;
GRANT CONNECT ON DATABASE :"database_name" TO :"runtime_role";
GRANT USAGE ON SCHEMA public TO :"runtime_role";

-- Existing Better Auth adapter and account security. No user DELETE.
GRANT SELECT,INSERT,UPDATE ON public."user" TO :"runtime_role";
GRANT SELECT,INSERT,UPDATE,DELETE ON public.account,public.session,
  public.verification,public."rateLimit" TO :"runtime_role";

-- Current authoring, publication, private media and server grading.
GRANT SELECT,INSERT,DELETE ON public.authored_problem,public.authored_draft,
  public.authored_draft_private_part,public.author_media,
  public.author_draft_media,public.authored_solution_permission_media TO :"runtime_role";
GRANT UPDATE(state,published_revision_id,updated_at) ON public.authored_problem TO :"runtime_role";
GRANT UPDATE(content,version,updated_at) ON public.authored_draft TO :"runtime_role";
GRANT UPDATE(state) ON public.author_media TO :"runtime_role";
GRANT SELECT,INSERT ON public.author_media_usage,public.authored_write_limit,
  public.authored_student_rate,public.authored_revision,public.authored_revision_part,
  public.authored_revision_private_part,public.author_revision_media,
  public.authored_attempt,public.authored_solution_permission,
  public.authored_solution_reveal TO :"runtime_role";
GRANT UPDATE(day,attempts) ON public.author_media_usage TO :"runtime_role";
GRANT UPDATE(window_start,requests) ON public.authored_write_limit TO :"runtime_role";
GRANT UPDATE(window_start,requests,submissions) ON public.authored_student_rate TO :"runtime_role";
GRANT UPDATE(authorization_id,version,enabled,expires_at) ON public.authored_solution_permission TO :"runtime_role";
GRANT EXECUTE ON FUNCTION public.authored_discovery_terms(jsonb) TO :"runtime_role";
-- Preserve canonical PUBLIC account_deletion_mutation_allowed EXECUTE, unchanged.
-- Invoker triggers use the table/column rights above; no trigger EXECUTE grant.

-- Existing saved solutions, evidence, current ratings and archive notes.
GRANT SELECT,INSERT ON public.solution_attempt,public.solution_check,
  public.individual_rating_event,public.individual_rating,public.archive_progress TO :"runtime_role";
GRANT SELECT,INSERT,DELETE ON public.solution_evidence TO :"runtime_role";
GRANT UPDATE(rating,"ratedAttempts","updatedAt") ON public.individual_rating TO :"runtime_role";
GRANT UPDATE(notes,answer,reviewed,"updatedAt") ON public.archive_progress TO :"runtime_role";
GRANT SELECT ON public.problem_rating,public.practice_attempt TO :"runtime_role";
-- PostgreSQL row locking requires UPDATE on at least one column, even FOR SHARE.
-- Grant metadata timestamps, never keys, check definitions or reviewer identity.
GRANT UPDATE("updatedAt") ON public.problem_rating TO :"runtime_role";

-- Current contests, including existing administrator UI and immutable attempts.
GRANT SELECT,INSERT ON public.contest,public.contest_attempt TO :"runtime_role";
GRANT UPDATE(name,description,"startsAt","durationMinutes","problemIds",
  "launchOnPublish",version,published,"publishedAt","registrationOpen",rated)
  ON public.contest TO :"runtime_role";
GRANT SELECT,INSERT,DELETE ON public.contest_registration,public.contest_problem TO :"runtime_role";
GRANT SELECT ON public.contest_admin,public.contest_rating TO :"runtime_role";
GRANT UPDATE("createdAt") ON public.contest_admin,public.contest_registration TO :"runtime_role";
-- No sequences: current permitted inserts use caller IDs/UUID defaults, not
-- sequence defaults. Owner-run definer triggers retain their own sequence rights.
-- No coaching_inquiry grant: active forms use Tally. Keep the table unchanged.
-- No community/favourites/profile/practice_check/deletion/operator grants.
-- No ALTER OWNER, membership, PUBLIC ACL or default-ACL changes.
COMMIT;
-- Password remains NULL: usable password login is intentionally not established.
-- After separately authorized credential setup, use interactive psql \password
-- with SCRAM, then verify real direct AND pooled LOGIN. Never SQL-literal secrets.
