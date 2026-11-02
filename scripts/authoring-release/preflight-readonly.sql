-- READ-ONLY OPERATOR ARTIFACT. Do not run against remote Neon in this task.
-- psql -X -qAt -v ON_ERROR_STOP=1 -f preflight-readonly.sql
-- Use a secure service/password source, NEVER a URI in argv or shell tracing.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
\ir catalog-readonly.sql
-- psql executes only generated SELECT statements, with identifiers quoted by %I.
SELECT CASE WHEN to_regclass('public.physcratic_integration_migrations') IS NULL
 THEN 'SELECT jsonb_build_object(''kind'',''ledger'',''status'',''MISSING'')'
 ELSE 'SELECT jsonb_build_object(''kind'',''ledger'',''rows'',coalesce(jsonb_agg(jsonb_build_object(''id'',id,''sha256'',sha256,''source_commit'',source_commit,''applied_at'',applied_at,''applied_by'',applied_by,''result'',result) ORDER BY id),''[]''::jsonb)) FROM public.physcratic_integration_migrations'
 END
\gexec
SELECT CASE WHEN has_table_privilege(c.oid,'SELECT') AND NOT row_security_active(c.oid)
 THEN format('SELECT jsonb_build_object(''kind'',''row_count'',''table'',%L,''rows'',count(*)::text) FROM public.%I',c.relname,c.relname)
 ELSE format('SELECT jsonb_build_object(''kind'',''row_count'',''table'',%L,''status'',''UNVERIFIABLE_PRIVILEGES_OR_RLS'')',c.relname)
 END
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname
\gexec
COMMIT;
