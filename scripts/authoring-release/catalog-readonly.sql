-- SELECT-only catalog inspection. Run inside an explicitly READ ONLY transaction.
-- No application records, connection strings or credential settings are selected.
WITH owned AS (
 SELECT c.oid,c.relname FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
 AND c.relname ~ '^(authored_|author_media($|_)|author_draft_media($|_)|author_revision_media($|_))'
), tables AS (
 SELECT c.relname AS name,c.relkind::text AS kind,c.relpersistence::text AS persistence,
 c.relrowsecurity AS rls,c.relforcerowsecurity AS force_rls
 FROM pg_catalog.pg_class c JOIN owned o ON o.oid=c.oid
), columns AS (
 SELECT o.relname AS relation,a.attnum AS position,a.attname AS name,
 pg_catalog.format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS not_null,
 pg_catalog.pg_get_expr(d.adbin,d.adrelid,false) AS default_expression,
 a.attidentity::text AS identity,a.attgenerated::text AS generated
 FROM owned o JOIN pg_catalog.pg_attribute a ON a.attrelid=o.oid
 LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
 WHERE a.attnum>0 AND NOT a.attisdropped
), constraints AS (
 SELECT o.relname AS relation,c.conname AS name,c.contype::text AS type,
 pg_catalog.pg_get_constraintdef(c.oid,false) AS definition,
 c.condeferrable AS deferrable,c.condeferred AS initially_deferred,c.convalidated AS validated
 FROM owned o JOIN pg_catalog.pg_constraint c ON c.conrelid=o.oid
), indexes AS (
 SELECT o.relname AS relation,c.relname AS name,
 pg_catalog.pg_get_indexdef(i.indexrelid,0,false) AS definition,
 i.indisvalid AS valid,i.indisready AS ready,i.indisunique AS unique_index,
 i.indisprimary AS primary_index,i.indimmediate AS immediate
 FROM owned o JOIN pg_catalog.pg_index i ON i.indrelid=o.oid
 JOIN pg_catalog.pg_class c ON c.oid=i.indexrelid
), triggers AS (
 SELECT o.relname AS relation,t.tgname AS name,t.tgenabled::text AS enabled,
 pg_catalog.pg_get_triggerdef(t.oid,false) AS definition
 FROM owned o JOIN pg_catalog.pg_trigger t ON t.tgrelid=o.oid WHERE NOT t.tgisinternal
), functions AS (
 SELECT p.proname AS name,pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
 pg_catalog.pg_get_functiondef(p.oid) AS definition,p.prosecdef AS security_definer,
 p.provolatile::text AS volatility,p.proparallel::text AS parallel,p.proconfig AS configuration
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind='f'
 AND p.proname ~ '^(authored_|author_media|author_revision_media|author_draft_media)'
), policies AS (
 SELECT o.relname AS relation,p.polname AS name,p.polcmd::text AS command,p.polpermissive AS permissive,
 pg_catalog.pg_get_expr(p.polqual,p.polrelid,false) AS using_expression,
 pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid,false) AS check_expression
 FROM owned o JOIN pg_catalog.pg_policy p ON p.polrelid=o.oid
)
SELECT jsonb_build_object(
 'identity',jsonb_build_object('database',current_database(),'server_version',current_setting('server_version'),
   'server_version_num',current_setting('server_version_num')::integer,'current_user',current_user,
   'session_user',session_user,'current_schema',current_schema(),'read_only',current_setting('transaction_read_only'),
   'isolation',current_setting('transaction_isolation'),'replication_role',current_setting('session_replication_role'),'search_path',current_setting('search_path'),
   'server_address',inet_server_addr()::text,'server_port',inet_server_port(),'observed_at',transaction_timestamp()),
 'schemas',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
   'usage',has_schema_privilege(n.oid,'USAGE'),'create',has_schema_privilege(n.oid,'CREATE')) ORDER BY n.nspname),'[]'::jsonb)
   FROM pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'),
 'role',(SELECT jsonb_build_object('superuser',rolsuper,'bypass_rls',rolbypassrls,'create_db',rolcreatedb,
   'create_role',rolcreaterole,'replication',rolreplication) FROM pg_roles WHERE rolname=current_user),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'oid',c.oid::text,'kind',c.relkind,
   'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
   'rls_active',CASE WHEN c.relkind IN ('r','p') THEN row_security_active(c.oid) ELSE false END,
   'can_select',has_table_privilege(c.oid,'SELECT'),
   'has_inheritance',EXISTS(SELECT 1 FROM pg_inherits h WHERE h.inhrelid=c.oid OR h.inhparent=c.oid)) ORDER BY c.relname),'[]'::jsonb)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')),
 'auth_columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'name',a.attname,
   'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull) ORDER BY c.relname,a.attnum),'[]'::jsonb)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
   WHERE n.nspname='public' AND c.relname IN ('user','account','session','verification') AND a.attnum>0 AND NOT a.attisdropped),
 'ledger_columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
   'not_null',a.attnotnull,'default_expression',pg_get_expr(d.adbin,d.adrelid,false)) ORDER BY a.attnum),'[]'::jsonb)
   FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
   WHERE a.attrelid=to_regclass('public.physcratic_integration_migrations') AND a.attnum>0 AND NOT a.attisdropped),
 'ledger_constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('type',c.contype,'definition',pg_get_constraintdef(c.oid,false)) ORDER BY c.contype,pg_get_constraintdef(c.oid,false)),'[]'::jsonb)
   FROM pg_constraint c WHERE c.conrelid=to_regclass('public.physcratic_integration_migrations')),
 'public_constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',r.relname,'name',c.conname,'type',c.contype,
   'definition',pg_get_constraintdef(c.oid,false),'validated',c.convalidated) ORDER BY r.relname,c.conname),'[]'::jsonb)
   FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public'),
 'public_indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',r.relname,'name',x.relname,
   'definition',pg_get_indexdef(i.indexrelid,0,false),'valid',i.indisvalid,'ready',i.indisready) ORDER BY r.relname,x.relname),'[]'::jsonb)
   FROM pg_index i JOIN pg_class r ON r.oid=i.indrelid JOIN pg_namespace n ON n.oid=r.relnamespace JOIN pg_class x ON x.oid=i.indexrelid WHERE n.nspname='public'),
 'public_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',r.relname,'name',t.tgname,
   'definition',pg_get_triggerdef(t.oid,false),'enabled',t.tgenabled) ORDER BY r.relname,t.tgname),'[]'::jsonb)
   FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal),
 'other_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),
   'language',l.lanname,'security_definer',p.prosecdef,'source_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')) ORDER BY p.proname,p.oid),'[]'::jsonb)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
   WHERE n.nspname='public' AND p.proname !~ '^(authored_|author_media|author_revision_media|author_draft_media)'),
 'foreign_key_health',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY relation,name),'[]'::jsonb) FROM (
   SELECT x.conrelid::regclass::text AS relation,x.conname AS name,count(t.oid)::integer AS trigger_count,
     coalesce(bool_and(t.tgenabled='O'),false) AS all_origin_enabled
   FROM pg_constraint x LEFT JOIN pg_trigger t ON t.tgconstraint=x.oid AND t.tgisinternal
   WHERE x.contype='f' AND (x.conrelid IN (SELECT oid FROM owned) OR x.confrelid IN (SELECT oid FROM owned))
   GROUP BY x.oid,x.conrelid,x.conname
 ) f),
 'catalog',jsonb_build_object(
   'tables',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY name),'[]'::jsonb) FROM tables t),
   'columns',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY relation,position),'[]'::jsonb) FROM columns t),
   'constraints',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY relation,name),'[]'::jsonb) FROM constraints t),
   'indexes',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY relation,name),'[]'::jsonb) FROM indexes t),
   'triggers',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY relation,name),'[]'::jsonb) FROM triggers t),
   'functions',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY name,arguments),'[]'::jsonb) FROM functions t),
   'policies',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY relation,name),'[]'::jsonb) FROM policies t)
 )) AS report;
