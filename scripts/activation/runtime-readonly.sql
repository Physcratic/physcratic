-- Owner-authorized inspection only. No Production execution by this task.
-- psql -X -v ON_ERROR_STOP=1 -v runtime_role=reviewed_role -f this-file
-- PGPASSWORD is supplied only via a hidden prompt, never a command argument.
-- Migration reader and actual runtime identities must be checked independently.
-- Owner-run metadata inspection only. No migration/operator replay.
-- Confirm the exact Neon Production branch in the console before running.
-- Replace CONFIRMED_RUNTIME_ROLE with the actual deployed application's role.
-- Run with an authorized metadata reader, then repeat the identity/TLS SELECT
-- through the actual application connection. Do not SET ROLE as a substitute.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';

SELECT current_database() AS database, current_user, session_user,
       current_setting('server_version_num') AS server_version_num,
       current_setting('transaction_read_only') AS read_only,
       ssl, version AS tls_version
FROM pg_stat_ssl WHERE pid = pg_backend_pid();

SELECT id, sha256, source_commit, applied_by, applied_at, result
FROM public.physcratic_production_migrations ORDER BY id;
-- Require exactly canonical 0001..0018, verified results and original provenance.
-- Compare each SHA-256 with scripts/production-upgrade/migrations.json at the
-- reviewed deployed commit. 0019 is outside this release. No baseline preflight.

SELECT conrelid::regclass::text AS relation, conname
FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated;
SELECT indexrelid::regclass::text AS index_name, indisvalid, indisready
FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid
WHERE c.relnamespace='public'::regnamespace AND (NOT indisvalid OR NOT indisready);
SELECT tgrelid::regclass::text AS relation, tgname, tgenabled
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
WHERE c.relnamespace='public'::regnamespace AND t.tgenabled='D';

SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls,
       has_schema_privilege(oid, 'public', 'USAGE') AS schema_usage,
       has_schema_privilege(oid, 'public', 'CREATE') AS schema_create
FROM pg_roles WHERE rolname = :'runtime_role';
-- Zero rows means the proposed runtime identity has not been established.

SELECT r.rolname AS inherited_or_settable_role
FROM pg_roles r, pg_roles app
WHERE app.rolname = :'runtime_role' AND r.oid <> app.oid
  AND pg_has_role(app.oid, r.oid, 'MEMBER');

SELECT c.relname, c.relowner::regrole::text AS owner,
       pg_has_role(app.oid, c.relowner, 'MEMBER') AS owner_membership
FROM pg_class c CROSS JOIN pg_roles app
WHERE app.rolname = :'runtime_role'
  AND c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p','v')
  AND (c.relname LIKE 'community_%' OR c.relname LIKE 'practice_check_%'
       OR c.relname LIKE 'account_deletion_%') ORDER BY c.relname;

-- First-batch table privileges, plus separate profile/practice candidates.
-- A false table SELECT can be satisfied by exact sufficient column grants;
-- inspect those below before declaring a column-restricted role deficient.
WITH required(feature, relation_name, privileges) AS (VALUES
 ('favourites', 'community_problem_total', 'SELECT'),
 ('favourites', 'community_favourite', 'SELECT,INSERT,DELETE'),
 ('favourites', 'community_favourite_limit', 'SELECT,INSERT,UPDATE'),
 ('favourites', 'authored_problem', 'SELECT'),
 ('favourites', 'authored_revision', 'SELECT'),
 ('favourites', 'authored_revision_part', 'SELECT'),
 ('favourites', 'authored_attempt', 'SELECT'),
 ('profiles', 'community_profile', 'SELECT,INSERT,UPDATE'),
 ('profiles', 'community_profile_write_limit', 'SELECT,INSERT,UPDATE'),
 ('practice', 'practice_check_attempt', 'SELECT,INSERT'),
 ('practice', 'practice_check_part', 'SELECT,INSERT,UPDATE'),
 ('practice', 'practice_check_rate', 'SELECT,INSERT,UPDATE')
)
SELECT feature, relation_name, p.privilege,
       to_regclass('public.' || relation_name) IS NOT NULL AS object_present,
       has_table_privilege(app.oid, to_regclass('public.' || relation_name), p.privilege) AS allowed
FROM required CROSS JOIN LATERAL unnest(string_to_array(privileges, ',')) p(privilege)
CROSS JOIN pg_roles app WHERE app.rolname = :'runtime_role'
ORDER BY feature, relation_name, privilege;

SELECT has_column_privilege(:'runtime_role','public.user','id','SELECT') AS verified_user_id_read,
       has_column_privilege(:'runtime_role','public.user','emailVerified','SELECT') AS verified_user_status_read,
       has_column_privilege(:'runtime_role','public.authored_problem','id','UPDATE') AS authored_row_lock_permission;

SELECT table_name, column_name, privilege_type FROM information_schema.column_privileges
WHERE table_schema='public' AND grantee=:'runtime_role'
ORDER BY table_name, column_name, privilege_type;

-- Expected false for ordinary runtime on every listed protected operation.
WITH protected(name) AS (VALUES ('community_staff'),('community_staff_audit'),
 ('community_medal_audit'),('community_moderation_audit'),
 ('community_comment_evidence'),('community_comment_review'),
 ('account_deletion_policy'),('account_deletion_mutation'),
 ('account_deletion_outbox'),('account_deletion_evidence'),
 ('community_problem_total'),('practice_check_attempt'))
SELECT name, p.privilege,
       has_table_privilege(app.oid,to_regclass('public.'||name),p.privilege) AS forbidden_privilege_present
FROM protected CROSS JOIN (VALUES ('UPDATE'),('DELETE'),('TRUNCATE')) p(privilege)
CROSS JOIN pg_roles app WHERE app.rolname=:'runtime_role'
ORDER BY name, privilege;

WITH forbidden(name, privilege) AS (VALUES
 ('community_staff','INSERT'),('community_staff_audit','INSERT'),
 ('community_medal_audit','INSERT'),('community_moderation_audit','INSERT'),
 ('community_comment_evidence','INSERT'),('community_comment_review','INSERT'),
 ('account_deletion_policy','INSERT'),('account_deletion_mutation','INSERT'),
 ('account_deletion_outbox','INSERT'),('account_deletion_evidence','INSERT'),
 ('community_problem_total','INSERT'),('community_favourite','UPDATE'),
 ('community_profile','DELETE'),('practice_check_part','DELETE'),('practice_check_rate','DELETE')
)
SELECT name, privilege,
       has_table_privilege(app.oid,to_regclass('public.'||name),privilege) AS forbidden_privilege_present
FROM forbidden CROSS JOIN pg_roles app
WHERE app.rolname=:'runtime_role' ORDER BY name, privilege;

-- Inspect owner, fixed search paths and effective EXECUTE without invoking any
-- function. PUBLIC exact-row boolean probe is deliberate; never revoke it.
SELECT p.oid::regprocedure::text AS routine, p.proowner::regrole::text AS owner,
       p.prosecdef AS security_definer, p.proconfig, p.proacl,
       has_function_privilege(app.oid,p.oid,'EXECUTE') AS runtime_execute,
       EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
               WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
FROM pg_proc p CROSS JOIN pg_roles app
WHERE app.rolname=:'runtime_role' AND p.pronamespace='public'::regnamespace
  AND (p.proname LIKE 'community_%' OR p.proname LIKE 'account_deletion_%')
ORDER BY routine;

SELECT defaclrole::regrole::text AS creator,
       defaclnamespace::regnamespace::text AS schema,
       defaclobjtype, defaclacl
FROM pg_default_acl ORDER BY defaclrole,defaclnamespace,defaclobjtype;

COMMIT;
-- Never invoke deletion/policy/staff/helper decision functions as a "read test".
-- The runtime's ordinary request limiter can also WRITE during HTTP GETs.

-- Effective column grants can confer forbidden mutation even when table checks
-- are false. Include inherited/PUBLIC rights through has_column_privilege.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5s';
SELECT c.relname,a.attname,p.privilege
FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid
CROSS JOIN (VALUES ('INSERT'),('UPDATE')) p(privilege)
WHERE c.relnamespace='public'::regnamespace AND a.attnum>0 AND NOT a.attisdropped
AND (c.relname IN ('community_problem_total','community_staff','community_staff_audit',
'community_medal_audit','community_moderation_audit','community_comment_evidence',
'community_comment_review') OR c.relname LIKE 'account_deletion_%')
AND has_column_privilege(:'runtime_role',c.oid,a.attnum,p.privilege)
ORDER BY c.relname,a.attnum,p.privilege;
COMMIT;
