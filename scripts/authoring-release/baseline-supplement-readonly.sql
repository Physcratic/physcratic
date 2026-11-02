-- READ ONLY supplement to the exact v3-v6 canonical migration-owned catalogs.
-- No DDL/DML, account creation, lock acquisition or ledger repair.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog,public;
SET LOCAL statement_timeout='30s';
SELECT current_setting('transaction_read_only') AS read_only,
 current_setting('session_replication_role') AS replication_role;
-- Every migration-owned FK needs four enabled internal RI triggers, including
-- the referenced table's triggers. OID-derived trigger names are not baselines.
WITH owned AS (
 SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname ~ '^(authored_|author_media($|_)|author_draft_media($|_)|author_revision_media($|_))'
), fks AS (
 SELECT x.* FROM pg_constraint x WHERE x.contype='f'
 AND (x.conrelid IN (SELECT oid FROM owned) OR x.confrelid IN (SELECT oid FROM owned))
)
SELECT x.conname,x.conrelid::regclass::text AS relation,x.confrelid::regclass::text AS referenced_relation,
 count(t.oid) AS internal_trigger_count,coalesce(bool_and(t.tgenabled='O'),false) AS all_origin_enabled,
 jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'function',t.tgfoid::regproc::text,
 'enabled',t.tgenabled,'deferrable',t.tgdeferrable,'initially_deferred',t.tginitdeferred) ORDER BY t.tgrelid,t.tgfoid) AS triggers
FROM fks x LEFT JOIN pg_trigger t ON t.tgconstraint=x.oid AND t.tgisinternal
GROUP BY x.oid,x.conname,x.conrelid,x.confrelid ORDER BY relation,x.conname;
-- Auth prerequisite comparison is against lib/db/schema.ts and initialized
-- Better Auth 1.7.14, not the test fixture's deliberately minimal user table.
SELECT c.relname AS relation,a.attname AS column,format_type(a.atttypid,a.atttypmod) AS type,
 a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid,false) AS default_expression
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
WHERE n.nspname='public' AND c.relname IN ('user','session','account','verification')
AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum;
-- Default collation is an environmental prerequisite, not a portable OID.
SELECT datcollate,datctype,datlocale,datcollversion,pg_database_collation_actual_version(oid) AS actual_collation_version
FROM pg_database WHERE datname=current_database();
COMMIT;
