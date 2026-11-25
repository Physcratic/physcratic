\set ON_ERROR_STOP on
\if :install
BEGIN;
\else
BEGIN READ ONLY;
\endif
SET LOCAL search_path = public, pg_catalog;
SET LOCAL timezone = 'UTC';
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

SELECT current_database() = :'expected_database' AND session_user = :'expected_login'
 AND current_user = session_user AND pg_is_in_recovery() = false
 AND current_setting('server_version_num') = :'expected_version'
 AND EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl) AS expected_target \gset
\if :expected_target
\else
DO $$ BEGIN RAISE EXCEPTION 'Unexpected database, login, server version, recovery or TLS state'; END $$;
\endif
SET LOCAL ROLE :"migration_owner";
SELECT current_user = :'migration_owner' AND current_schema() = 'public'
 AND NOT (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS expected_owner \gset
\if :expected_owner
\else
DO $$ BEGIN RAISE EXCEPTION 'Unexpected or superuser migration owner'; END $$;
\endif

\if :install
SELECT pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0));
LOCK TABLE public.physcratic_production_migrations,
 public.author_media,public.community_profile_media,public.community_medal_claim,public.solution_evidence,
 public.account_deletion_outbox IN SHARE ROW EXCLUSIVE MODE;
\endif

SELECT set_config('physcratic.pkg_role', :'runtime_role', true) IS NOT NULL AS role_configured \gset
DO $preflight$
DECLARE
 runtime pg_roles%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.physcratic_production_migrations
   WHERE id='0018_account_deletion'
     AND sha256='378ff9140a5eab9d62c70505eb764ad1f621ebe26f6d840c62826aee00d61cda'
     AND result='verified') THEN
  RAISE EXCEPTION 'Missing or mismatched verified predecessor 0018';
 END IF;
 SELECT * INTO runtime FROM pg_roles WHERE rolname=current_setting('physcratic.pkg_role');
 IF NOT FOUND OR NOT runtime.rolcanlogin OR runtime.rolinherit OR runtime.rolsuper
   OR runtime.rolcreaterole OR runtime.rolcreatedb OR runtime.rolreplication OR runtime.rolbypassrls
   OR runtime.rolname IN (current_user, session_user)
   OR NOT has_database_privilege(runtime.oid,current_database(),'CONNECT')
   OR NOT has_schema_privilege(runtime.oid,'public','USAGE')
   OR has_schema_privilege(runtime.oid,'public','CREATE')
   OR has_database_privilege(runtime.oid,current_database(),'CREATE')
   OR EXISTS(SELECT 1 FROM pg_roles r WHERE r.oid<>runtime.oid AND pg_has_role(runtime.oid,r.oid,'MEMBER'))
   OR EXISTS(SELECT 1 FROM pg_roles r WHERE r.oid<>runtime.oid AND r.rolcanlogin AND NOT r.rolsuper
             AND pg_has_role(r.oid,runtime.oid,'MEMBER')) THEN
  RAISE EXCEPTION 'Unexpected serving LOGIN attributes, privileges or memberships';
 END IF;
 IF EXISTS(
  SELECT 1 FROM (VALUES ('public.account_deletion_execute(text,text,text,text)'),
   ('public.account_deletion_cleanup(text,text,text,text,jsonb)')) s(signature)
  LEFT JOIN pg_proc p ON p.oid=to_regprocedure(s.signature)
  WHERE p.oid IS NULL OR p.proowner<>current_user::regrole OR NOT p.prosecdef
     OR p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, pg_temp']::text[]
     OR has_function_privilege(runtime.oid,p.oid,'EXECUTE')
 ) THEN RAISE EXCEPTION 'Unexpected eraser or cleanup owner, ACL or search path'; END IF;
 IF has_table_privilege(runtime.oid,'public."user"','DELETE') OR EXISTS(
   SELECT 1 FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relname LIKE 'account_deletion_%'
    AND c.relkind IN ('r','p','v','m','f')
    AND (has_table_privilege(runtime.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
         OR has_any_column_privilege(runtime.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
 ) THEN RAISE EXCEPTION 'The serving LOGIN can access protected deletion state'; END IF;
 IF EXISTS(
    SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname LIKE 'account_deletion_%'
     AND p.proname NOT IN ('account_deletion_mutation_allowed','account_deletion_upload_finished')
     AND has_function_privilege(runtime.oid,p.oid,'EXECUTE')
 ) THEN RAISE EXCEPTION 'Unexpected serving LOGIN access to a deletion routine'; END IF;
END $preflight$;

-- Use one deterministic digest for the already approved ledger, excluding only
-- the new row in Verify. Include both the actual attribution and the timestamp.
SELECT encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.id),'[]')::text,'UTF8')),'hex')
 AS ledger_sha
 FROM public.physcratic_production_migrations m WHERE id<>'0026_account_deletion_blockers' \gset

WITH objects(provider,source,path,attributes) AS (
 SELECT 'author','author_media',pathname,to_jsonb(m) FROM public.author_media m
 UNION ALL SELECT 'author','solution_evidence',pathname,to_jsonb(m) FROM public.solution_evidence m
 UNION ALL SELECT 'profile','profile_media',pathname,to_jsonb(m) FROM public.community_profile_media m
 UNION ALL SELECT 'medal','medal_claim',pathname,to_jsonb(m) FROM public.community_medal_claim m
 UNION ALL SELECT provider,'outbox',pathname,to_jsonb(o) FROM public.account_deletion_outbox o
)
SELECT encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_array(provider,source,path,attributes)
 ORDER BY provider,source,path,attributes),'[]')::text,'UTF8')),'hex') AS inventory_sha
FROM objects \gset

SELECT current_database() AS database,session_user AS login,current_user AS migration_owner,
 current_setting('server_version_num') AS server_version,:'ledger_sha' AS ledger_sha256,:'inventory_sha' AS inventory_sha256,
 (SELECT count(*) FROM public.author_media WHERE state='ready') AS ready_author_media,
 (SELECT count(*) FROM public.author_media WHERE state<>'ready') AS other_author_media,
 (SELECT count(*) FROM public.solution_evidence) AS solution_evidence,
 (SELECT count(*) FROM public.community_profile_media) AS profile_media,
 (SELECT count(*) FROM public.community_medal_claim) AS internal_medal_claims,
 (SELECT count(*) FROM public.account_deletion_outbox WHERE state<>'complete') AS open_outbox,
 (SELECT count(*) FROM public.account_deletion_outbox WHERE state='complete') AS completed_outbox,
 (SELECT count(*) FROM public.account_deletion_receipt_store) AS receipts;
SELECT id,sha256,source_commit,applied_by,result FROM public.physcratic_production_migrations ORDER BY id;

\if :install
SELECT NOT EXISTS(SELECT 1 FROM public.physcratic_production_migrations WHERE id~'^0026($|_)')
 AND to_regclass('public.account_deletion_pending_upload') IS NULL
 AND to_regprocedure('public.account_deletion_upload_finished(text,text,text)') IS NULL
 AND NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.account_deletion_publication'::regclass
               AND attname='reviewed_revision_id' AND NOT attisdropped)
 AND clock_timestamp() < :'window_ends'::timestamptz
 AND :'ledger_sha'=:'expected_ledger' AND :'inventory_sha'=:'expected_inventory' AS can_install \gset
\if :can_install
\else
DO $$ BEGIN RAISE EXCEPTION '0026 exists or approved schema, ledger or held inventory changed'; END $$;
\endif

SELECT set_config('physcratic.pkg_predecessor_acl', (jsonb_agg(jsonb_build_array(p.oid,p.proowner,p.proacl,p.prosecdef,p.proconfig)
 ORDER BY p.oid))::text,true) IS NOT NULL AS predecessor_recorded
FROM pg_proc p WHERE p.oid IN ('public.account_deletion_execute(text,text,text,text)'::regprocedure,
 'public.account_deletion_cleanup(text,text,text,text,jsonb)'::regprocedure) \gset

-- INSERT VERIFIED 0026 TRANSACTION BODY HERE

GRANT EXECUTE ON FUNCTION public.account_deletion_upload_finished(text,text,text) TO :"runtime_role";
\endif

\if :verify
SELECT :'ledger_sha'=:'expected_ledger' AND :'inventory_sha'=:'expected_inventory'
 AND (SELECT count(*) FROM public.physcratic_production_migrations WHERE id~'^0026($|_)')=1
 AND EXISTS(SELECT 1 FROM public.physcratic_production_migrations WHERE id='0026_account_deletion_blockers'
   AND sha256=:'migration_sha' AND source_commit='ee236380364a0a0f96145ac1ac753cb5cca11c4f'
   AND applied_by=current_user AND result='verified') AS committed_0026 \gset
\if :committed_0026
\else
DO $$ BEGIN RAISE EXCEPTION 'Exact committed migration, ledger or held inventory check failed'; END $$;
\endif
\endif

-- Apply and Verify run the same ACL and backfill assertions before releasing the writer hold.
\if :install
\set attest true
\else
\set attest :verify
\endif
\if :attest
DO $postflight$
DECLARE
 runtime oid := to_regrole(current_setting('physcratic.pkg_role'));
 owner oid := current_user::regrole;
 ack pg_proc%ROWTYPE;
 pending pg_class%ROWTYPE;
 original_acl text := nullif(current_setting('physcratic.pkg_predecessor_acl',true),'');
BEGIN
 SELECT * INTO ack FROM pg_proc WHERE oid=to_regprocedure('public.account_deletion_upload_finished(text,text,text)');
 SELECT * INTO pending FROM pg_class WHERE oid=to_regclass('public.account_deletion_pending_upload');
 IF ack.oid IS NULL OR pending.oid IS NULL OR ack.proowner<>owner OR pending.relowner<>owner
  OR NOT ack.prosecdef OR ack.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, pg_temp']::text[]
  OR NOT has_function_privilege(runtime,ack.oid,'EXECUTE')
  OR has_function_privilege(runtime,ack.oid,'EXECUTE WITH GRANT OPTION')
  OR NOT EXISTS(SELECT 1 FROM aclexplode(ack.proacl) a WHERE a.grantor=owner AND a.grantee=runtime
                 AND a.privilege_type='EXECUTE' AND NOT a.is_grantable)
  OR EXISTS(SELECT 1 FROM aclexplode(coalesce(ack.proacl,acldefault('f',owner))) a WHERE a.grantee NOT IN (owner,runtime))
  OR EXISTS(SELECT 1 FROM aclexplode(coalesce(pending.relacl,acldefault('r',owner))) a WHERE a.grantee<>owner)
  OR EXISTS(SELECT 1 FROM pg_attribute col CROSS JOIN LATERAL aclexplode(col.attacl) a
             WHERE col.attrelid=pending.oid AND a.grantee<>owner)
  OR EXISTS(SELECT 1 FROM pg_roles r WHERE r.oid NOT IN (runtime,owner) AND r.rolcanlogin AND NOT r.rolsuper
             AND NOT pg_has_role(r.oid,owner,'MEMBER') AND has_function_privilege(r.oid,ack.oid,'EXECUTE'))
  OR EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
             WHERE p.pronamespace='public'::regnamespace
              AND p.proname IN ('account_deletion_upload_guard','account_deletion_guard_continuing_display')
              AND a.grantee<>owner) THEN
  RAISE EXCEPTION 'Unexpected effective acknowledgement or upload-state privilege';
 END IF;
 IF original_acl IS NOT NULL AND original_acl IS DISTINCT FROM (
   SELECT jsonb_agg(jsonb_build_array(p.oid,p.proowner,p.proacl,p.prosecdef,p.proconfig) ORDER BY p.oid)::text
   FROM pg_proc p WHERE p.oid IN ('public.account_deletion_execute(text,text,text,text)'::regprocedure,
      'public.account_deletion_cleanup(text,text,text,text,jsonb)'::regprocedure)
 ) THEN RAISE EXCEPTION 'Existing eraser/cleanup metadata changed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.account_deletion_publication'::regclass
    AND conname='account_deletion_reviewed_revision_fk' AND confrelid='public.authored_revision'::regclass AND convalidated)
 OR EXISTS(
   SELECT 1 FROM (VALUES ('public.author_media'),('public.solution_evidence'),
      ('public.community_profile_media'),('public.community_medal_claim')) AS registry(name)
   CROSS JOIN (VALUES ('account_deletion_reserve_upload'),('account_deletion_preserve_upload')) AS guard(name)
   WHERE NOT EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid=registry.name::regclass AND tgname=guard.name AND tgenabled='O'
      AND tgfoid='public.account_deletion_upload_guard()'::regprocedure)
 ) OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.authored_problem'::regclass
    AND tgname='account_deletion_guard_continuing_display' AND tgenabled='O'
    AND tgfoid='public.account_deletion_guard_continuing_display()'::regprocedure) THEN
  RAISE EXCEPTION 'Expected 0026 guards or revision binding are missing';
 END IF;
 IF EXISTS(
  WITH expected(provider,pathname) AS (
   SELECT 'author',pathname FROM public.author_media
   UNION SELECT 'author',pathname FROM public.solution_evidence
   UNION SELECT 'profile',pathname FROM public.community_profile_media
   UNION SELECT 'medal',pathname FROM public.community_medal_claim
   UNION SELECT provider,pathname FROM public.account_deletion_outbox WHERE state<>'complete'
  )
  SELECT 1 FROM expected e FULL JOIN public.account_deletion_pending_upload p USING(provider,pathname)
  WHERE e.provider IS NULL OR p.provider IS NULL OR p.token_hash IS NOT NULL
 ) THEN RAISE EXCEPTION 'Pre-upgrade paths were not fully and conservatively held'; END IF;
END $postflight$;
SELECT provider,count(*) AS held_paths FROM public.account_deletion_pending_upload GROUP BY provider ORDER BY provider;
\endif

\if :install
SELECT clock_timestamp() < :'window_ends'::timestamptz AS window_open \gset
\if :window_open
\else
DO $$ BEGIN RAISE EXCEPTION 'Approved installation window elapsed before ledger recording'; END $$;
\endif
INSERT INTO public.physcratic_production_migrations(id,sha256,source_commit,applied_by,result)
 VALUES('0026_account_deletion_blockers',:'migration_sha','ee236380364a0a0f96145ac1ac753cb5cca11c4f',current_user,'verified')
 RETURNING id,sha256,source_commit,applied_by,result;
\endif
COMMIT;
