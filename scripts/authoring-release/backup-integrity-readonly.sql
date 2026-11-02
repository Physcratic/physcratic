-- SELECT-only psql artifact. Caller MUST begin an explicitly READ ONLY transaction.
-- Output contains schema and row hashes, never row content. Encrypt it privately.
\set ON_ERROR_STOP on
SELECT current_setting('transaction_read_only')='on' AND current_setting('server_version_num')='180006' AS safe_version
\gset
\if :safe_version
\else
  \quit 1
\endif
SET LOCAL search_path=pg_catalog,public;
SET LOCAL timezone='UTC';
SET LOCAL datestyle='ISO, YMD';
SET LOCAL intervalstyle='postgres';
SET LOCAL extra_float_digits=3;
SET LOCAL bytea_output='hex';
-- Do not silently omit unreadable tables, RLS-filtered rows or external data.
SELECT NOT EXISTS (
 SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'
 AND (c.relkind='f' OR (c.relkind IN ('r','p','m') AND
 (NOT has_table_privilege(c.oid,'SELECT') OR row_security_active(c.oid))))
) AS safe_visibility
\gset
\if :safe_visibility
\else
  \quit 1
\endif
SELECT jsonb_build_object('kind','relations','items',coalesce(jsonb_agg(jsonb_build_object(
 'schema',n.nspname,'name',c.relname,'kind',c.relkind,'persistence',c.relpersistence,
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity) ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C"),'[]'))
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND c.relkind IN ('r','p','m','v','S','f');
SELECT jsonb_build_object('kind','columns','items',coalesce(jsonb_agg(jsonb_build_object(
 'schema',n.nspname,'table',c.relname,'position',a.attnum,'name',a.attname,
 'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,
 'default',pg_get_expr(d.adbin,d.adrelid,false),'identity',a.attidentity,'generated',a.attgenerated)
 ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C",a.attnum),'[]'))
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND a.attnum>0 AND NOT a.attisdropped
AND c.relkind IN ('r','p','m','v','S');
SELECT jsonb_build_object('kind','constraints','items',coalesce(jsonb_agg(jsonb_build_object(
 'schema',n.nspname,'table',c.relname,'name',x.conname,'definition',pg_get_constraintdef(x.oid,false),
 'validated',x.convalidated) ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C",x.conname COLLATE "C"),'[]'))
FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema';
SELECT jsonb_build_object('kind','indexes','items',coalesce(jsonb_agg(jsonb_build_object(
 'schema',n.nspname,'name',c.relname,'definition',pg_get_indexdef(x.indexrelid,0,false),
 'valid',x.indisvalid,'ready',x.indisready) ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C"),'[]'))
FROM pg_index x JOIN pg_class c ON c.oid=x.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema';
SELECT jsonb_build_object('kind','triggers','items',coalesce(jsonb_agg(jsonb_build_object(
 'schema',n.nspname,'table',c.relname,'name',t.tgname,'definition',pg_get_triggerdef(t.oid,false),'enabled',t.tgenabled)
 ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C",t.tgname COLLATE "C"),'[]'))
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND NOT t.tgisinternal;
SELECT jsonb_build_object('kind','functions','items',coalesce(jsonb_agg(jsonb_build_object(
 'schema',n.nspname,'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),
 'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'))
 ORDER BY n.nspname COLLATE "C",p.proname COLLATE "C",pg_get_function_identity_arguments(p.oid) COLLATE "C"),'[]'))
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND p.prokind IN ('f','p');
SELECT jsonb_build_object('kind','extensions','items',coalesce(jsonb_agg(jsonb_build_object(
 'name',e.extname,'version',e.extversion,'schema',n.nspname) ORDER BY e.extname COLLATE "C"),'[]'))
FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace;
-- ONLY avoids double counting inherited/partitioned parents. Every ordinary
-- child is inventoried separately. Sorted hashes preserve duplicates, not CTIDs.
SELECT format('SELECT jsonb_build_object(''kind'',''row'',''schema'',%L,''table'',%L,''sha256'',h) FROM (SELECT encode(sha256(convert_to(to_jsonb(t)::text,''UTF8'')),''hex'') AS h FROM ONLY %I.%I t) rows ORDER BY h COLLATE "C"',n.nspname,c.relname,n.nspname,c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND c.relkind IN ('r','m')
ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C"
\gexec
SELECT format('SELECT jsonb_build_object(''kind'',''count'',''schema'',%L,''table'',%L,''rows'',count(*)::text) FROM ONLY %I.%I',n.nspname,c.relname,n.nspname,c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND c.relkind IN ('r','m')
ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C"
\gexec
SELECT format('SELECT jsonb_build_object(''kind'',''sequence'',''schema'',%L,''name'',%L,''last_value'',last_value::text,''is_called'',is_called) FROM %I.%I',n.nspname,c.relname,n.nspname,c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND c.relkind='S'
ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C"
\gexec
SELECT jsonb_build_object('kind','large_object_count','objects',count(*)::text) FROM pg_largeobject_metadata;
SELECT EXISTS(SELECT 1 FROM pg_largeobject_metadata) AS has_large_objects
\gset
\if :has_large_objects
SELECT jsonb_build_object('kind','large_object_page','oid',loid::text,'page',pageno,
 'sha256',encode(sha256(data),'hex')) FROM pg_largeobject ORDER BY loid,pageno;
\endif
