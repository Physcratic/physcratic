-- Owner-operated metadata inspection only. This task never executes Production SQL.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';
SELECT current_database(),current_user,session_user,current_setting('server_version_num') AS server_version_num;
SELECT ssl,version AS tls_version FROM pg_stat_ssl WHERE pid=pg_backend_pid();
SELECT id,sha256,source_commit,result FROM public.physcratic_production_migrations ORDER BY id;
SELECT a.attname,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) AS default_value
FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
WHERE a.attrelid='public.authored_revision'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum;
SELECT p.oid::regprocedure AS routine,p.proowner::regrole AS owner,p.prosecdef,p.proconfig,p.proacl,md5(pg_get_functiondef(p.oid)) AS definition_receipt
FROM pg_proc p WHERE p.oid IN ('public.community_achievement_progress(text)'::regprocedure,'public.community_achievement_problem_solved(text,uuid)'::regprocedure,'public.authored_attempt_guard()'::regprocedure);
SELECT function_oid,md5(definition) AS backup_definition_receipt FROM public.account_deletion_guard_backup ORDER BY function_oid;
SELECT r.rolname,r.rolsuper,r.rolcreaterole,r.rolcreatedb,r.rolbypassrls,
 has_schema_privilege(r.oid,'public','USAGE') AS schema_usage,has_schema_privilege(r.oid,'public','CREATE') AS forbidden_schema_create
FROM pg_roles r WHERE r.rolname=:'runtime_role';
SELECT rel,privilege,has_table_privilege(:'runtime_role',rel,privilege) AS allowed
FROM (VALUES('public.authored_revision'),('public.authored_revision_private_part'),('public.author_revision_media'),('public.author_media'),('public.authored_attempt')) t(rel)
CROSS JOIN (VALUES('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE')) p(privilege);
SELECT c.relname,c.relowner::regrole AS owner,pg_has_role(:'runtime_role',c.relowner,'MEMBER') AS forbidden_owner_membership
FROM pg_class c WHERE c.oid IN ('public.authored_revision'::regclass,'public.authored_attempt'::regclass);
COMMIT;
