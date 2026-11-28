\set ON_ERROR_STOP on
\set VERBOSITY terse
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL search_path = pg_catalog, public, pg_temp;
SET LOCAL timezone = 'UTC';
SET LOCAL lock_timeout = '4s';
SET LOCAL statement_timeout = '35s';
SET LOCAL idle_in_transaction_session_timeout = '15s';
SET LOCAL transaction_timeout = '40s';
SET LOCAL log_statement = 'none';
SET LOCAL log_min_error_statement = 'panic';
SET LOCAL log_parameter_max_length_on_error = 0;

DO $target$
BEGIN
 IF current_database() <> 'physcratic_restore_test' OR session_user <> 'postgres'
  OR inet_client_addr() IS NOT NULL OR current_setting('listen_addresses') <> ''
  OR current_setting('server_version_num') <> '180007' OR pg_is_in_recovery()
  OR current_setting('session_replication_role') <> 'origin'
  OR NOT EXISTS (SELECT FROM pg_database WHERE datname=current_database() AND datdba='restore_owner'::regrole)
  OR EXISTS (SELECT FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid())
 THEN
  RAISE EXCEPTION 'Restore database is not isolated';
 END IF;
END $target$;

SET LOCAL ROLE restore_owner;
SELECT set_config('physcratic.restore_approval', :'approved_document', true) AS approved_input,
       set_config('physcratic.restore_nonce', :'approved_nonce', true) AS approved_hash \gset

DO $reconcile$
DECLARE
 approved jsonb := convert_from(decode(current_setting('physcratic.restore_approval'), 'base64'), 'UTF8')::jsonb;
 approval_nonce text := current_setting('physcratic.restore_nonce');
 subject text := approved->>'subjectId';
 actual_fingerprint text;
 receipt_actor_tag text;
 receipt_expires_at timestamptz;
 source_case uuid := (approved#>>'{sourceAuthorization,caseId}')::uuid;
 source_intent text := approved#>>'{sourceAuthorization,intentSha256}';
 source_receipt boolean := false;
 source_row jsonb;
 receipt_subject_nonce text;
 post_0027 boolean;
 companion_definitions text;
 authorization_definitions text;
 trigger_definitions text;
 account_foreign_keys jsonb;
 completion_relation regclass;
 has_completion_rows boolean;
 eraser regprocedure := 'public.account_deletion_execute(text,text,text,text)'::regprocedure;
 definition text := pg_get_functiondef(eraser);
 owned uuid[];
 approved_rights jsonb;
 current_rights jsonb;
 already_reconciled boolean;
 outcome jsonb;
 edit text[];
BEGIN
 post_0027 := EXISTS (SELECT FROM public.physcratic_production_migrations WHERE id ~ '^0027($|_)');
 IF (approved->>'version'='1' AND post_0027)
    OR (approved->>'version'='2' AND (
        (approved->>'targetRevision'='0027') IS DISTINCT FROM post_0027
        OR NOT EXISTS (SELECT FROM pg_database WHERE datname=current_database() AND oid=(approved->>'databaseOid')::oid)))
    OR EXISTS (SELECT FROM public.physcratic_production_migrations WHERE id ~ '^00(2[89]|[3-9][0-9])($|_)')
 THEN
  RAISE EXCEPTION 'Installed erasure revision is not reviewed';
 END IF;

 SELECT encode(sha256(convert_to(string_agg(pg_get_functiondef(p.oid), E'\n' ORDER BY p.proname),'UTF8')),'hex')
 INTO companion_definitions FROM pg_proc p
 WHERE p.pronamespace='public'::regnamespace AND p.proowner=current_user::regrole AND p.proname IN (
  'account_deletion_policy_ready', 'account_deletion_inventory', 'account_deletion_mutation_allowed',
  'account_deletion_permit_delete', 'account_deletion_permit_update', 'account_deletion_receipt',
  'account_deletion_queue', 'account_deletion_cleanup', 'account_deletion_upload_guard',
  'account_deletion_guard_continuing_display');
 SELECT encode(sha256(convert_to(string_agg(pg_get_triggerdef(t.oid), E'\n' ORDER BY c.relname,t.tgname),'UTF8')),'hex')
 INTO trigger_definitions FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 WHERE c.relnamespace='public'::regnamespace AND t.tgenabled IN ('O','A')
 AND t.tgname IN ('account_deletion_guard_continuing_display','account_deletion_reserve_upload','account_deletion_preserve_upload');

 IF post_0027 THEN
  SELECT encode(sha256(convert_to(string_agg(pg_get_functiondef(p.oid), E'\n' ORDER BY p.proname),'UTF8')),'hex')
  INTO authorization_definitions FROM pg_proc p
  WHERE p.pronamespace='public'::regnamespace AND p.proowner=current_user::regrole AND p.proname IN (
   'account_deletion_open_request','account_deletion_scope','account_deletion_arm_scope',
   'account_deletion_arm','account_deletion_disarm');
  IF (SELECT count(*) FROM public.physcratic_production_migrations WHERE id ~ '^0027($|_)')<>1
     OR NOT EXISTS (SELECT FROM public.physcratic_production_migrations WHERE id='0027_account_deletion_authorization'
       AND sha256='de7fa4287c32f05c5c636be537ff1b09fa9d8f1df50e0d881d63906479c8f0e4' AND result='verified')
     OR encode(sha256(convert_to(definition,'UTF8')),'hex') <> 'c4aa4d374391e1667234e7fd9a1624b86f083e41b75ed59bbfbe95ce0cd8f0cf'
     OR authorization_definitions IS DISTINCT FROM '7a439ef20dd8f374331bb98c6ede98a3bff1603faa99b2cebdb6cea726b33584'
     OR NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid='public.account_deletion_receipt_store'::regclass
                     AND attname='arm_intent_sha256' AND NOT attisdropped AND atttypid='text'::regtype)
     OR (SELECT count(*) FROM pg_attribute WHERE attrelid='public.account_deletion_request'::regclass AND NOT attisdropped
           AND attname IN ('arm_intent_sha256','armed_scope_sha256','armed_until','revoked_arm_intents'))<>4
  THEN RAISE EXCEPTION 'Installed erasure revision is not reviewed'; END IF;

  -- Only the disposable recovery transaction uses the pre-gate routine body.
  -- The independent approval and the recorded source intent replace live proof.
  FOREACH edit SLICE 1 IN ARRAY ARRAY[
   ARRAY[$live$approved_request account_deletion_request%ROWTYPE;
BEGIN
 PERFORM account_deletion_policy_ready();$live$,$restore$BEGIN
 PERFORM account_deletion_policy_ready();$restore$],
   ARRAY[$live$ IF credential_hash IS NULL OR credential_hash='' THEN
   RAISE EXCEPTION 'Fresh credential proof required' USING ERRCODE='42501';
 END IF;
 PERFORM account_deletion_auth(actor,session_token,credential_hash);
 PERFORM pg_advisory_xact_lock(hashtextextended('authored-student:'||actor,6));
 SELECT * INTO approved_request FROM account_deletion_request r
   WHERE r.user_id=actor AND r.nonce=nonce_hash AND r.expires_at>clock_timestamp()
     AND r.armed_until>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Owner authorization required' USING ERRCODE='P0027'; END IF;
 IF approved_request.armed_scope_sha256 IS DISTINCT FROM
   encode(sha256(convert_to(account_deletion_scope(actor)::text,'UTF8')),'hex')
 THEN RAISE EXCEPTION 'Reviewed erasure scope changed' USING ERRCODE='P0028'; END IF;$live$,$restore$ PERFORM account_deletion_auth(actor,session_token,credential_hash);
 PERFORM pg_advisory_xact_lock(hashtextextended('authored-student:'||actor,6));$restore$],
   ARRAY[$live$INSERT INTO account_deletion_receipt_store(id,nonce,actor_tag,expires_at,arm_intent_sha256) VALUES(approved_request.id,nonce_hash,receipt_tag,clock_timestamp()+policy.receipt_lifetime,approved_request.arm_intent_sha256)$live$,$restore$INSERT INTO account_deletion_receipt_store(nonce,actor_tag,expires_at) VALUES(nonce_hash,receipt_tag,clock_timestamp()+policy.receipt_lifetime)$restore$]
  ] LOOP
   IF strpos(definition,edit[1])=0 OR strpos(substr(definition,strpos(definition,edit[1])+length(edit[1])),edit[1])<>0
   THEN RAISE EXCEPTION 'Installed erasure revision is not reviewed'; END IF;
   definition:=replace(definition,edit[1],edit[2]);
  END LOOP;
 END IF;

 IF NOT EXISTS (SELECT FROM public.physcratic_production_migrations WHERE id='0018_account_deletion'
                AND sha256='378ff9140a5eab9d62c70505eb764ad1f621ebe26f6d840c62826aee00d61cda' AND result='verified')
    OR NOT EXISTS (SELECT FROM public.physcratic_production_migrations WHERE id='0026_account_deletion_blockers'
                   AND sha256='3b904c1eb01fc75e5446744acc90474cdbe4aba62c6dffc95b9f7c35bfc6c78a' AND result='verified')
    OR NOT EXISTS (SELECT FROM pg_proc WHERE oid=eraser AND proowner=current_user::regrole)
    OR encode(sha256(convert_to(definition,'UTF8')),'hex') <> '4ad545c7e20c98c37347b072e022e29cb41f0e476d1761368420781debeaea5a'
    OR companion_definitions IS DISTINCT FROM '625831a6db0f0ec2299bad6f1a903ca7cec2928ebfe8d9f046565be1ca94cd05'
    OR trigger_definitions IS DISTINCT FROM 'c62156768bc1cfa062956b193e0066380e5b7d71b62d97c4b01d10a0c3fadd6a'
 THEN
  RAISE EXCEPTION 'Installed erasure revision is not reviewed';
 END IF;

 -- Guard the cascade and anonymization paths relied on by the eraser, including
 -- transitive deletes. The disposable fixture pins the PostgreSQL 18.7 output.
 WITH RECURSIVE parents(rel) AS (
  SELECT 'public."user"'::regclass
  UNION
  SELECT c.conrelid::regclass FROM pg_constraint c JOIN parents p ON c.confrelid=p.rel
  WHERE c.contype='f' AND c.confdeltype='c'
 ), dependencies AS (
  SELECT CASE c.conrelid
           WHEN to_regclass('public.community_restriction') THEN '0019'
           WHEN to_regclass('public.personal_problem_completion') THEN '0025'
           WHEN to_regclass('public.personal_completion_write_limit') THEN '0025'
           ELSE 'core'
         END AS scope,
         c.conrelid::regclass::text AS relation,
         pg_get_constraintdef(c.oid) AS definition,
         c.convalidated, c.conenforced,
         (SELECT string_agg(t.tgenabled::text,'' ORDER BY t.tgenabled)
          FROM pg_trigger t WHERE t.tgconstraint=c.oid AND t.tgisinternal) AS triggers
  FROM pg_constraint c JOIN parents p ON c.confrelid=p.rel
  WHERE c.contype='f' AND c.confdeltype IN ('c','n','d')
 ), fingerprints AS (
  SELECT d.scope, encode(sha256(convert_to(jsonb_agg(
      jsonb_build_array(d.relation,d.definition,d.convalidated,d.conenforced,d.triggers)
      ORDER BY d.relation COLLATE "C", d.definition COLLATE "C")::text,'UTF8')),'hex') AS digest
  FROM dependencies d GROUP BY d.scope
 )
 SELECT jsonb_object_agg(scope,digest) INTO account_foreign_keys FROM fingerprints;
 IF account_foreign_keys->>'core' IS DISTINCT FROM '92b822cec623067975001dfad6f1e5b5cd5f3f4a46567443f23dbd921a6b8da5'
  OR (to_regclass('public.community_restriction') IS NOT NULL AND
      account_foreign_keys->>'0019' IS DISTINCT FROM '2bd74b4041ab6e7aeac58d5711607717fe0dca1077175938052914f1c7c4defd')
  OR ((to_regclass('public.personal_problem_completion') IS NOT NULL
       OR to_regclass('public.personal_completion_write_limit') IS NOT NULL) AND
      account_foreign_keys->>'0025' IS DISTINCT FROM '1b36e6a00514e65643cd08255571782546a475cd7f7f11bb41b5aabd65214fb2')
 THEN
  RAISE EXCEPTION 'Account erasure foreign keys differ from the reviewed fixture';
 END IF;

 IF (approved->>'approvedAt')::timestamptz > clock_timestamp()
    OR (approved->>'expiresAt')::timestamptz <= clock_timestamp() THEN
  RAISE EXCEPTION 'Erasure authorization is outside its approved window';
 END IF;
 IF subject !~ '^synthetic-[A-Za-z0-9-]{1,100}$' OR approved->>'database' <> current_database() THEN
  RAISE EXCEPTION 'Authorized restored account does not match';
 END IF;

 SELECT encode(sha256(convert_to(jsonb_build_array(id, "createdAt")::text,'UTF8')),'hex')
 INTO actual_fingerprint FROM public."user" WHERE id=subject FOR UPDATE;
 SELECT r.actor_tag, r.expires_at INTO receipt_actor_tag, receipt_expires_at
 FROM public.account_deletion_receipt_store r WHERE r.nonce=approval_nonce;
 already_reconciled := FOUND;
 receipt_subject_nonce := approval_nonce;

 IF source_case IS NOT NULL AND post_0027 THEN
  SELECT to_jsonb(r) INTO source_row FROM public.account_deletion_receipt_store r WHERE r.id=source_case;
  IF FOUND THEN
   IF already_reconciled OR source_row->>'arm_intent_sha256' IS DISTINCT FROM source_intent
   THEN RAISE EXCEPTION 'Restored authorization differs from independent approval'; END IF;
   source_receipt := true;
   already_reconciled := true;
   receipt_subject_nonce := source_row->>'nonce';
   receipt_actor_tag := source_row->>'actor_tag';
   receipt_expires_at := (source_row->>'expires_at')::timestamptz;
  ELSE
   SELECT to_jsonb(r) INTO source_row FROM public.account_deletion_request r WHERE r.id=source_case;
   IF FOUND AND (source_row->>'user_id' IS DISTINCT FROM subject
     OR (source_row->>'arm_intent_sha256' IS NOT NULL AND source_row->>'arm_intent_sha256' IS DISTINCT FROM source_intent)
     OR (source_row->>'arm_intent_sha256'=source_intent
       AND source_row->>'armed_scope_sha256' IS DISTINCT FROM approved->>'verifiedIntentScopeSha256')
     OR (source_row->'revoked_arm_intents') ? source_intent)
   THEN RAISE EXCEPTION 'Restored authorization differs from independent approval'; END IF;
  END IF;
 END IF;
 IF already_reconciled THEN
  IF actual_fingerprint IS NOT NULL OR receipt_expires_at<=clock_timestamp()
     OR receipt_actor_tag IS DISTINCT FROM encode(sha256(convert_to(subject||':'||receipt_subject_nonce,'UTF8')),'hex') THEN
   RAISE EXCEPTION 'Existing reconciliation receipt conflicts with restored account';
  END IF;
 ELSE
  IF actual_fingerprint IS NULL OR actual_fingerprint IS DISTINCT FROM approved->>'subjectFingerprint' THEN
   RAISE EXCEPTION 'Authorized restored account does not match';
  END IF;
  SELECT coalesce(array_agg(p.id),'{}') INTO owned
  FROM (SELECT id FROM public.authored_problem WHERE owner_id=subject ORDER BY id FOR UPDATE) p;
 END IF;

 IF approved->>'version'='2' AND NOT already_reconciled AND EXISTS (
   SELECT FROM public.community_external_medal m WHERE m.user_id=subject
     AND NOT (approved->'tallyReferences' ? m.tally_reference)
 ) THEN
  RAISE EXCEPTION 'Restored authorization differs from independent approval';
 END IF;
 SELECT coalesce(jsonb_agg(item ORDER BY item->>'problemId'),'[]') INTO approved_rights
 FROM jsonb_array_elements(approved->'publications') AS items(item);
 IF NOT already_reconciled THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('problemId',p.id,'revisionId',p.published_revision_id,
         'digest',encode(sha256(convert_to(jsonb_build_array(r.rights_basis,r.review_reference)::text,'UTF8')),'hex'))
         ORDER BY p.id),'[]')
  INTO current_rights FROM public.authored_problem p JOIN public.account_deletion_publication r ON r.problem_id=p.id
  WHERE p.id=ANY(owned) AND p.state='published' AND r.continuing_display_authorized
   AND r.reviewed_revision_id=p.published_revision_id;
  IF current_rights IS DISTINCT FROM approved_rights THEN
   RAISE EXCEPTION 'Continuing publication rights differ from independent approval';
  END IF;

  -- The installed routine above is pinned byte for byte. Only this connection can
  -- resolve the temporary copy. The independently authorized subject is locked above.
  definition := replace(definition,
   'public.account_deletion_execute(actor text, session_token text, credential_hash text, nonce_hash text)',
   'pg_temp.restore_erasure_execute(actor text, nonce_hash text)');
  definition := replace(definition, 'SECURITY DEFINER', 'SECURITY INVOKER');
  definition := replace(definition, ' PERFORM account_deletion_auth(actor,session_token,credential_hash);',
   ' -- Independent authorization and exact subject row lock verified by the local restore transaction.');
  EXECUTE definition;
  REVOKE ALL ON FUNCTION pg_temp.restore_erasure_execute(text,text) FROM PUBLIC;
  outcome := pg_temp.restore_erasure_execute(subject, approval_nonce);
  DROP FUNCTION pg_temp.restore_erasure_execute(text,text);

  IF post_0027 THEN
   UPDATE public.account_deletion_receipt_store SET arm_intent_sha256=source_intent WHERE nonce=approval_nonce;
  END IF;
  IF coalesce(outcome->>'state','') NOT IN ('complete','database-erased-cleanup-pending') THEN
   RAISE EXCEPTION 'Erasure did not commit the expected database state';
  END IF;
 ELSE
  SELECT coalesce(array_agg(id),'{}') INTO owned FROM (
   SELECT (item->>'problemId')::uuid AS id FROM jsonb_array_elements(approved_rights) AS items(item)
   UNION
   SELECT value::uuid FROM jsonb_array_elements_text(approved->'verifiedIntentProblemIds')
  ) AS recorded;
  IF EXISTS (SELECT FROM public.authored_problem p WHERE p.id=ANY(owned) AND p.state='published'
      AND (p.owner_id IS DISTINCT FROM '__physcratic_deleted_principal_v1__'
       OR NOT EXISTS (SELECT FROM jsonb_array_elements(approved_rights) AS rights(item)
                      WHERE (item->>'problemId')::uuid=p.id)))
  THEN RAISE EXCEPTION 'Continuing publication rights differ from independent approval'; END IF;
 END IF;

 IF EXISTS (SELECT FROM public."user" WHERE id=subject)
    OR EXISTS (SELECT FROM public.session WHERE "userId"=subject)
    OR EXISTS (SELECT FROM public.account WHERE "userId"=subject) THEN
  RAISE EXCEPTION 'Erasure did not commit the expected database state';
 END IF;
 FOREACH completion_relation IN ARRAY ARRAY[
  to_regclass('public.personal_problem_completion'), to_regclass('public.personal_completion_write_limit')
 ] LOOP
  IF completion_relation IS NOT NULL THEN
   EXECUTE format('SELECT EXISTS (SELECT FROM %s WHERE user_id=$1)',completion_relation) INTO has_completion_rows USING subject;
   IF has_completion_rows THEN
    RAISE EXCEPTION 'Erasure did not commit the expected database state';
   END IF;
  END IF;
 END LOOP;

 SELECT coalesce(jsonb_agg(jsonb_build_object('problemId',p.id,'revisionId',p.published_revision_id,
        'digest',encode(sha256(convert_to(jsonb_build_array(r.rights_basis,r.review_reference)::text,'UTF8')),'hex'))
        ORDER BY p.id),'[]')
 INTO current_rights FROM public.authored_problem p JOIN public.account_deletion_publication r ON r.problem_id=p.id
 WHERE p.id=ANY(owned) AND p.state='published' AND p.owner_id='__physcratic_deleted_principal_v1__'
  AND r.continuing_display_authorized AND r.reviewed_revision_id=p.published_revision_id;
 IF current_rights IS DISTINCT FROM approved_rights THEN
  RAISE EXCEPTION 'Continuing publication rights differ from independent approval';
 END IF;

 -- Existing retained obligations, including any other account's jobs, remain in
 -- place. A signed pending obligation lost from the recovery point prevents commit.
 IF EXISTS (SELECT FROM jsonb_to_recordset(approved->'cleanup') AS expected(provider text,pathname text,held boolean)
            WHERE NOT EXISTS (SELECT FROM public.account_deletion_outbox o
                              WHERE o.provider=expected.provider AND o.pathname=expected.pathname AND o.state<>'complete')
            OR (expected.held AND NOT EXISTS (SELECT FROM public.account_deletion_pending_upload h
                              WHERE h.provider=expected.provider AND h.pathname=expected.pathname)))
 THEN
  RAISE EXCEPTION 'Expected cleanup obligation or upload hold is absent';
 END IF;
 IF approved->>'version'='2' AND EXISTS (
   SELECT FROM public.account_deletion_outbox o JOIN public.account_deletion_receipt_store r ON r.id=o.deletion_id
   WHERE (r.nonce=approval_nonce OR (source_receipt AND r.id=source_case)) AND o.state<>'complete'
     AND NOT EXISTS (SELECT FROM jsonb_to_recordset(approved->'cleanup') AS expected(provider text,pathname text)
       WHERE expected.provider=o.provider AND expected.pathname=o.pathname)
 ) THEN
  RAISE EXCEPTION 'Restored authorization differs from independent approval';
 END IF;
 IF (approved->>'expiresAt')::timestamptz <= clock_timestamp() THEN
  RAISE EXCEPTION 'Erasure authorization is outside its approved window';
 END IF;
 PERFORM set_config('physcratic.restore_result',
  CASE WHEN already_reconciled THEN 'ALREADY_RECONCILED' ELSE 'RECONCILED' END, true);
END $reconcile$;

SELECT current_setting('physcratic.restore_result') AS restore_result \gset
COMMIT;
\echo :restore_result
