BEGIN;

-- Install with deletion off, using the trusted 0026 eraser owner and schema.
DO $$
BEGIN
 IF NOT EXISTS (SELECT FROM pg_proc WHERE oid = to_regprocedure('account_deletion_upload_finished(text,text,text)')
                AND proowner = current_user::regrole)
    OR NOT EXISTS (SELECT FROM pg_proc WHERE oid = to_regprocedure('account_deletion_execute(text,text,text,text)')
                   AND proowner = current_user::regrole AND prosecdef)
 THEN RAISE EXCEPTION 'Install after 0026 as the trusted erasure owner'; END IF;
 IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid=to_regclass('community_external_medal')
      AND attname='tally_reference' AND atttypid='text'::regtype AND NOT attisdropped)
 THEN RAISE EXCEPTION 'Install the reviewed 0024 medal reference before 0027'; END IF;
END $$;

ALTER TABLE account_deletion_receipt_store
 ADD COLUMN arm_intent_sha256 text CHECK (arm_intent_sha256 ~ '^[a-f0-9]{64}$');

ALTER TABLE account_deletion_request
 ADD COLUMN arm_intent_sha256 text UNIQUE CHECK (arm_intent_sha256 ~ '^[a-f0-9]{64}$'),
 ADD COLUMN armed_scope_sha256 text CHECK (armed_scope_sha256 ~ '^[a-f0-9]{64}$'),
 ADD COLUMN armed_until timestamptz,
 ADD COLUMN revoked_arm_intents text[] NOT NULL DEFAULT '{}',
 ADD CONSTRAINT account_deletion_arm_fields CHECK (
   num_nonnulls(arm_intent_sha256, armed_scope_sha256, armed_until) IN (0, 3)
 );

-- Called inside the eraser by its trusted owner. Locks fence inserts, updates
-- and phantom rows between the scope check and erasure. NOWAIT makes contention
-- retryable without holding up unrelated writes while waiting for this fence.
CREATE FUNCTION account_deletion_scope(subject text) RETURNS jsonb
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE snapshot jsonb;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
   RAISE EXCEPTION 'Erasure scope requires a current snapshot' USING ERRCODE='25000';
 END IF;
 LOCK TABLE authored_problem, author_media, author_revision_media, solution_evidence,
  community_profile_media, community_medal_claim, community_external_medal,
  account_deletion_pending_upload, account_deletion_publication IN SHARE ROW EXCLUSIVE MODE NOWAIT;
 WITH owned AS (
   SELECT p.id, p.state, p.published_revision_id, d.continuing_display_authorized, d.reviewed_revision_id,
          d.review_reference, encode(sha256(convert_to(d.rights_basis,'UTF8')),'hex') AS rights_basis_sha256
   FROM authored_problem p LEFT JOIN account_deletion_publication d ON d.problem_id=p.id
   WHERE p.owner_id=subject
 ), paths AS (
   SELECT 'author' AS provider, m.pathname,
     EXISTS(SELECT FROM author_revision_media r WHERE r.media_id=m.id) AS revision_dependency
   FROM author_media m JOIN owned p ON p.id=m.problem_id
   UNION ALL SELECT 'author', pathname, false FROM solution_evidence WHERE "userId"=subject
   UNION ALL SELECT 'profile', pathname, false FROM community_profile_media WHERE user_id=subject
   UNION ALL SELECT 'medal', pathname, false FROM community_medal_claim WHERE user_id=subject
 )
 SELECT jsonb_build_object(
   'publications', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM owned p), '[]'),
   'paths', coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.provider,m.pathname,m.revision_dependency) FROM paths m), '[]'),
   'tallyReferences', coalesce((SELECT jsonb_agg(tally_reference ORDER BY tally_reference)
     FROM community_external_medal WHERE user_id=subject), '[]')
 ) INTO snapshot;
 RETURN snapshot;
END $$;

-- Invoker rights deliberately restrict preview, arm and disarm to the owner.
-- The external file retains its subject and authorized disposition. The
-- database stores only the pinned file digest and the current scope digest.
CREATE FUNCTION account_deletion_arm_scope(case_id uuid) RETURNS jsonb
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE subject text; snapshot jsonb;
BEGIN
 SELECT user_id INTO subject FROM account_deletion_request
 WHERE id=case_id AND expires_at>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pending request not found' USING ERRCODE='P0027'; END IF;
 snapshot:=account_deletion_scope(subject);
 RETURN jsonb_build_object('subject', subject, 'scope', snapshot, 'scopeSha256',
   encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'));
END $$;

CREATE FUNCTION account_deletion_arm(case_id uuid, expected_subject text, expected_scope text,
 intent_sha256 text, expires timestamptz) RETURNS uuid
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE current_scope jsonb; existing account_deletion_request%ROWTYPE;
BEGIN
 IF expected_subject IS NULL OR (expected_scope ~ '^[a-f0-9]{64}$') IS NOT TRUE
    OR (intent_sha256 ~ '^[a-f0-9]{64}$') IS NOT TRUE
    OR (expires>clock_timestamp() AND expires<=clock_timestamp()+interval '24 hours') IS NOT TRUE
 THEN RAISE EXCEPTION 'Invalid arm intent'; END IF;
 current_scope:=account_deletion_arm_scope(case_id);
 IF current_scope->>'subject' IS DISTINCT FROM expected_subject
    OR current_scope->>'scopeSha256' IS DISTINCT FROM expected_scope THEN
   RAISE EXCEPTION 'Reviewed erasure scope changed' USING ERRCODE='P0028';
 END IF;
 SELECT * INTO STRICT existing FROM account_deletion_request WHERE id=case_id;
 IF expires>existing.expires_at THEN RAISE EXCEPTION 'Approval exceeds the request lifetime'; END IF;
 IF intent_sha256=ANY(existing.revoked_arm_intents) THEN RAISE EXCEPTION 'Arm intent was revoked'; END IF;
 IF existing.arm_intent_sha256 IS NOT NULL THEN
   IF existing.arm_intent_sha256=intent_sha256 AND existing.armed_scope_sha256=expected_scope
      AND existing.armed_until=expires THEN RETURN case_id; END IF;
   RAISE EXCEPTION 'Request already has a different arm intent';
 END IF;
 UPDATE account_deletion_request SET arm_intent_sha256=intent_sha256,
   armed_scope_sha256=expected_scope, armed_until=expires WHERE id=case_id;
 RETURN case_id;
END $$;

CREATE FUNCTION account_deletion_disarm(case_id uuid, intent_sha256 text) RETURNS boolean
LANGUAGE sql SET search_path FROM CURRENT AS $$
 WITH disarmed AS (
   UPDATE account_deletion_request r SET arm_intent_sha256=NULL, armed_scope_sha256=NULL, armed_until=NULL,
     revoked_arm_intents=array_append(r.revoked_arm_intents,r.arm_intent_sha256)
   WHERE r.id=case_id AND r.arm_intent_sha256=intent_sha256 RETURNING 1
 )
 SELECT EXISTS (SELECT FROM disarmed)
$$;

REVOKE ALL ON FUNCTION account_deletion_scope(text), account_deletion_arm_scope(uuid),
 account_deletion_arm(uuid,text,text,text,timestamptz), account_deletion_disarm(uuid,text) FROM PUBLIC;

-- Patch the installed routine in place to preserve its owner, existing ACLs,
-- and 0026 controls. There is no alternate callable eraser.
DO $migration$
DECLARE definition text; edit text[]; signature text; schema_name text:=current_schema();
BEGIN
 FOREACH signature IN ARRAY ARRAY['account_deletion_scope(text)', 'account_deletion_arm_scope(uuid)',
  'account_deletion_arm(uuid,text,text,text,timestamptz)', 'account_deletion_disarm(uuid,text)']
 LOOP
  EXECUTE format('ALTER FUNCTION %I.%s SET search_path=pg_catalog,%I,pg_temp',schema_name,signature,schema_name);
  -- Refuse unexpected default EXECUTE ACLs for these owner-only routines.
  IF EXISTS (SELECT FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a
   WHERE p.oid=format('%I.%s',schema_name,signature)::regprocedure AND a.grantee<>p.proowner)
  THEN RAISE EXCEPTION 'Unexpected owner-only erasure ACL'; END IF;
 END LOOP;
 definition:=pg_get_functiondef('account_deletion_execute(text,text,text,text)'::regprocedure);
 IF strpos(definition, 'a.reviewed_revision_id IS DISTINCT FROM p.published_revision_id') = 0 THEN
   RAISE EXCEPTION 'Unexpected 0026 erasure definition';
 END IF;
 FOREACH edit SLICE 1 IN ARRAY ARRAY[
   ARRAY[$old$BEGIN
 PERFORM account_deletion_policy_ready();$old$,
         $new$approved_request account_deletion_request%ROWTYPE;
BEGIN
 PERFORM account_deletion_policy_ready();$new$],
   ARRAY[$old$ PERFORM account_deletion_auth(actor,session_token,credential_hash);
 PERFORM pg_advisory_xact_lock(hashtextextended('authored-student:'||actor,6));$old$,
         $new$ IF credential_hash IS NULL OR credential_hash='' THEN
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
 THEN RAISE EXCEPTION 'Reviewed erasure scope changed' USING ERRCODE='P0028'; END IF;$new$],
   ARRAY[$old$INSERT INTO account_deletion_receipt_store(nonce,actor_tag,expires_at) VALUES(nonce_hash,receipt_tag,clock_timestamp()+policy.receipt_lifetime)$old$,
         $new$INSERT INTO account_deletion_receipt_store(id,nonce,actor_tag,expires_at,arm_intent_sha256) VALUES(approved_request.id,nonce_hash,receipt_tag,clock_timestamp()+policy.receipt_lifetime,approved_request.arm_intent_sha256)$new$]
 ] LOOP
   IF strpos(definition,edit[1])=0 OR strpos(substr(definition,strpos(definition,edit[1])+length(edit[1])),edit[1])<>0 THEN
     RAISE EXCEPTION 'Unexpected account deletion routine definition';
   END IF;
   definition:=replace(definition,edit[1],edit[2]);
 END LOOP;
 EXECUTE definition;

 definition:=pg_get_functiondef('account_deletion_open_request(text,text,text,text)'::regprocedure);
 edit:=ARRAY[$old$ PERFORM account_deletion_policy_ready();PERFORM account_deletion_auth(actor,session_token,credential_hash);$old$,
   $new$ IF credential_hash IS NULL OR credential_hash='' THEN
   RAISE EXCEPTION 'Fresh credential proof required' USING ERRCODE='42501';
 END IF;
 PERFORM account_deletion_policy_ready();PERFORM account_deletion_auth(actor,session_token,credential_hash);$new$];
 IF strpos(definition,edit[1])=0 OR strpos(substr(definition,strpos(definition,edit[1])+length(edit[1])),edit[1])<>0 THEN
   RAISE EXCEPTION 'Unexpected request preparation definition';
 END IF;
 EXECUTE replace(definition,edit[1],edit[2]);
END $migration$;

COMMIT;
