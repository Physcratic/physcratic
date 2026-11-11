BEGIN;
-- Explicit operator installation only. No role/grant/flag or Terms activation.
-- Requires trusted schema and a migration owner with required DML rights.
CREATE TABLE account_deletion_policy (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), approved boolean NOT NULL DEFAULT false,
 purpose text NOT NULL, legal_basis text NOT NULL, responsible_operator text NOT NULL,
 access_rules text NOT NULL, review_criteria text NOT NULL, disposal_criteria text NOT NULL,
 receipt_lifetime interval NOT NULL CHECK(receipt_lifetime>interval '0'),
 max_evidence_lifetime interval NOT NULL CHECK(max_evidence_lifetime>interval '0'),
 max_review_gap interval NOT NULL CHECK(max_review_gap>interval '0'),
 access_lifetime interval NOT NULL CHECK(access_lifetime>interval '0'),
 operator_approval_reference text NOT NULL, approved_at timestamptz NOT NULL
);
-- Deliberately NO default policy/approval row. Enabled execution refuses absent approval.
CREATE TABLE account_deletion_case_link (subject_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,source_relation text NOT NULL,source_key jsonb NOT NULL,expires_at timestamptz NOT NULL,PRIMARY KEY(subject_id,source_relation,source_key));
REVOKE ALL ON account_deletion_case_link FROM PUBLIC;
CREATE TABLE account_deletion_receipt_store (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nonce text NOT NULL UNIQUE CHECK(nonce~'^[a-f0-9]{64}$'),
 actor_tag text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),expires_at timestamptz NOT NULL
);
CREATE TABLE account_deletion_request (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 nonce text NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),expires_at timestamptz NOT NULL
);
REVOKE ALL ON account_deletion_request FROM PUBLIC;
CREATE TABLE account_deletion_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), deletion_id uuid NOT NULL REFERENCES account_deletion_receipt_store(id),
 provider text NOT NULL CHECK(provider IN ('author','profile','medal')), pathname text NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','leased','complete')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),lease_token uuid,lease_until timestamptz,
 available_at timestamptz NOT NULL DEFAULT clock_timestamp(),last_error text NOT NULL DEFAULT '',completed_at timestamptz,
 UNIQUE(provider,pathname)
);
CREATE TABLE account_deletion_mutation (
 backend integer NOT NULL,transaction_id bigint NOT NULL,relation oid NOT NULL,operation text NOT NULL,
 old_record jsonb NOT NULL,new_record jsonb
);
CREATE TABLE account_deletion_rate (
 user_id text PRIMARY KEY,window_start timestamptz NOT NULL,requests integer NOT NULL
);
CREATE TABLE account_deletion_publication (
 problem_id uuid PRIMARY KEY REFERENCES authored_problem(id), continuing_display_authorized boolean NOT NULL DEFAULT false,
 rights_basis text, review_reference text,prior_state text,prior_revision_id uuid,
 CHECK((NOT continuing_display_authorized OR (length(trim(rights_basis))>0 AND length(trim(review_reference))>0)) IS TRUE)
);
CREATE TABLE account_deletion_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),subject_id text,source_relation text NOT NULL,source_key jsonb NOT NULL,
 source_digest text NOT NULL,retained jsonb NOT NULL DEFAULT '{}',replacement jsonb,
 purpose text NOT NULL CHECK(purpose IN ('active-report','active-appeal','security-incident','legal-obligation','erase')),
 necessity text NOT NULL,legal_basis text NOT NULL,responsible_operator text NOT NULL,
 review_criteria text NOT NULL,disposal_criteria text NOT NULL,review_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,
 created_by text NOT NULL,approved_by text,approved_at timestamptz,restricted boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),CHECK(review_at<=expires_at),
 CHECK(length(trim(necessity)) BETWEEN 5 AND 2000),CHECK(length(trim(legal_basis)) BETWEEN 5 AND 2000),
 CHECK(length(trim(responsible_operator)) BETWEEN 3 AND 300),CHECK(length(trim(review_criteria)) BETWEEN 5 AND 2000),
 CHECK(length(trim(disposal_criteria)) BETWEEN 5 AND 2000),CHECK(jsonb_typeof(retained)='object' AND octet_length(retained::text)<=100000)
);
CREATE TABLE account_deletion_access (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,evidence_id uuid,operator_tag text NOT NULL,
 purpose text NOT NULL CHECK(length(trim(purpose)) BETWEEN 5 AND 500),action text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),expires_at timestamptz NOT NULL
);
REVOKE ALL ON account_deletion_policy,account_deletion_receipt_store,account_deletion_outbox,
 account_deletion_mutation,account_deletion_rate,account_deletion_publication,
 account_deletion_evidence,account_deletion_access FROM PUBLIC;

-- Only a transient exact-row permit created by the privileged eraser can bypass a guard.
CREATE FUNCTION account_deletion_mutation_allowed(rel oid,op text,old_row jsonb,new_row jsonb)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path FROM CURRENT AS $$
 SELECT EXISTS(SELECT 1 FROM account_deletion_mutation WHERE backend=pg_backend_pid()
 AND transaction_id=txid_current() AND relation=rel AND operation=op
 AND old_record=old_row AND new_record IS NOT DISTINCT FROM new_row)
$$;
-- This boolean capability check is intentionally callable by ordinary trigger invokers.
-- It returns no records and cannot create permits. All mutation/admin routines are revoked.
GRANT EXECUTE ON FUNCTION account_deletion_mutation_allowed(oid,text,jsonb,jsonb) TO PUBLIC;

CREATE FUNCTION account_deletion_permit_delete(rel regclass,predicate text,subject text)
RETURNS void LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 EXECUTE format('INSERT INTO account_deletion_mutation SELECT pg_backend_pid(),txid_current(),$2,''DELETE'',to_jsonb(t),NULL FROM %s t WHERE %s',rel,predicate) USING subject,rel::oid;
 EXECUTE format('DELETE FROM %s t WHERE %s',rel,predicate) USING subject;
END $$;
CREATE FUNCTION account_deletion_permit_update(rel regclass,predicate text,changes jsonb,subject text)
RETURNS void LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE assignment text; cols text;
BEGIN
 SELECT string_agg(format('%1$I=x.%1$I',key),',') INTO assignment FROM jsonb_object_keys(changes) key;
 EXECUTE format('INSERT INTO account_deletion_mutation SELECT pg_backend_pid(),txid_current(),$2,''UPDATE'',to_jsonb(t),to_jsonb(x) FROM %1$s t CROSS JOIN LATERAL jsonb_populate_record(NULL::%1$s,to_jsonb(t)||$3) x WHERE %2$s',rel,predicate) USING subject,rel::oid,changes;
 EXECUTE format('UPDATE %1$s t SET %2$s FROM jsonb_populate_record(NULL::%1$s,$2) x WHERE %3$s',rel,assignment,predicate) USING subject,changes;
END $$;
REVOKE ALL ON FUNCTION account_deletion_permit_delete(regclass,text,text),account_deletion_permit_update(regclass,text,jsonb,text) FROM PUBLIC;

CREATE TABLE account_deletion_guard_backup (function_oid oid PRIMARY KEY, definition text NOT NULL);
REVOKE ALL ON account_deletion_guard_backup FROM PUBLIC;

-- Preserve installed trigger bodies/owner/ACL/other settings and add only an exact-row
-- permission check. No trigger is disabled and no historical migration is changed.
DO $$
DECLARE fn record; definition text; source text; patched text;
BEGIN
 FOR fn IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname=current_schema() AND p.proname=ANY(ARRAY[
 'practice_check_attempt_guard','authored_attempt_guard','authored_solution_reveal_guard',
 'authored_solution_permission_guard','authored_solution_media_guard','community_immutable_audit',
 'community_staff_guard','community_medal_guard','community_medal_log','community_case_guard',
 'community_comment_guard','community_comment_like_guard','community_moderation_capture']) AND p.prorettype='trigger'::regtype LOOP
  SELECT prosrc,pg_get_functiondef(fn.oid) INTO source,definition FROM pg_proc WHERE oid=fn.oid;
  INSERT INTO account_deletion_guard_backup VALUES(fn.oid,definition);
  IF source LIKE '%account_deletion_mutation_allowed%' THEN RAISE EXCEPTION 'Deletion guards already installed'; END IF;
  patched:=regexp_replace(source,'\mBEGIN\M',format(E'BEGIN\n IF TG_OP IN (''UPDATE'',''DELETE'') AND %I.account_deletion_mutation_allowed(TG_RELID,TG_OP,to_jsonb(OLD),CASE WHEN TG_OP=''DELETE'' THEN NULL ELSE to_jsonb(NEW) END) THEN\n IF TG_OP=''DELETE'' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;',current_schema()),'i');
  IF patched=source THEN RAISE EXCEPTION 'Unrecognized trigger body %',fn.proname; END IF;
  EXECUTE replace(definition,source,patched);
 END LOOP;
END $$;

CREATE FUNCTION account_deletion_policy_ready() RETURNS void LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 PERFORM 1 FROM account_deletion_policy WHERE approved AND approved_at<=clock_timestamp() AND length(trim(purpose))>0
 AND length(trim(legal_basis))>0 AND length(trim(responsible_operator))>0 AND length(trim(access_rules))>0
 AND length(trim(review_criteria))>0 AND length(trim(disposal_criteria))>0 AND length(trim(operator_approval_reference))>0 FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Operator-approved deletion policy is missing' USING ERRCODE='55000'; END IF;
END $$;
CREATE FUNCTION account_deletion_auth(actor text,session_token text,credential_hash text DEFAULT NULL,staff boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE verified boolean; current_hash text;
BEGIN
 IF actor='__physcratic_deleted_principal_v1__' THEN RAISE EXCEPTION 'Invalid principal' USING ERRCODE='42501'; END IF;
 SELECT "emailVerified" INTO verified FROM "user" WHERE id=actor FOR UPDATE;
 IF verified IS DISTINCT FROM true THEN RAISE EXCEPTION 'Verified account required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM "session" WHERE "userId"=actor AND token=session_token AND "expiresAt">clock_timestamp()
 AND "createdAt"<=clock_timestamp() AND "createdAt">=clock_timestamp()-interval '10 minutes' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Recent valid session required' USING ERRCODE='42501'; END IF;
 IF credential_hash IS NOT NULL THEN
  SELECT password INTO current_hash FROM account WHERE "userId"=actor AND "providerId"='credential' FOR UPDATE;
  IF current_hash IS NULL OR current_hash<>credential_hash THEN RAISE EXCEPTION 'Credential changed' USING ERRCODE='42501'; END IF;
 END IF;
 IF staff THEN
  IF to_regclass('community_staff') IS NULL THEN RAISE EXCEPTION 'Staff unavailable' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM community_staff WHERE user_id=actor AND role='admin' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 END IF;
END $$;
CREATE FUNCTION account_deletion_charge(actor text,session_token text,staff boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE used integer;
BEGIN
 PERFORM account_deletion_policy_ready();PERFORM account_deletion_auth(actor,session_token,NULL,staff);
 INSERT INTO account_deletion_rate VALUES(actor,clock_timestamp(),1)
 ON CONFLICT(user_id) DO UPDATE SET requests=CASE WHEN account_deletion_rate.window_start<clock_timestamp()-interval '1 minute' THEN 1 ELSE account_deletion_rate.requests+1 END,
 window_start=CASE WHEN account_deletion_rate.window_start<clock_timestamp()-interval '1 minute' THEN clock_timestamp() ELSE account_deletion_rate.window_start END RETURNING requests INTO used;
 IF used>(CASE WHEN staff THEN 30 ELSE 3 END) THEN RAISE EXCEPTION 'Deletion check limit' USING ERRCODE='P0003'; END IF;
END $$;
-- Receipt-only capability. No identity, email, owner ID, path or individual counts are exposed.
CREATE FUNCTION account_deletion_receipt(nonce_hash text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path FROM CURRENT AS $$
 SELECT jsonb_build_object('deletionId',r.id,'state',CASE WHEN count(o.id) FILTER(WHERE o.state<>'complete')=0 THEN 'complete' ELSE 'database-erased-cleanup-pending' END,
 'pendingObjects',count(o.id) FILTER(WHERE o.state<>'complete')) FROM account_deletion_receipt_store r
 LEFT JOIN account_deletion_outbox o ON o.deletion_id=r.id WHERE r.nonce=nonce_hash AND r.expires_at>clock_timestamp() GROUP BY r.id
$$;

-- Enumerate relationally associated mixed-subject records. Operator adjudication can
-- add specific records found through a privacy request; no claim of automatic PII detection.
CREATE FUNCTION account_deletion_inventory(subject text) RETURNS TABLE(relation_name text,record_key jsonb,record_data jsonb,digest text)
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE spec text[]; statement text; rel regclass;
BEGIN
 FOREACH spec SLICE 1 IN ARRAY ARRAY[
 ['community_comment','id','t.user_id=$1'],
 ['community_comment_evidence','comment_id,content_version','t.comment_id IN (SELECT id FROM community_comment WHERE user_id=$1)'],
 ['community_comment_review','comment_id','t.reviewer_id=$1 OR t.comment_id IN (SELECT id FROM community_comment WHERE user_id=$1)'],
 ['community_thread_lock','root_id','t.actor_id=$1 OR t.root_id IN (SELECT id FROM community_comment WHERE user_id=$1)'],
 ['community_report','id','t.reporter_id=$1 OR t.subject_key=''profile:''||$1 OR t.subject_key IN (SELECT ''comment:''||id::text FROM community_comment WHERE user_id=$1)'],
 ['community_moderation_appeal','id','t.user_id=$1 OR t.comment_id IN (SELECT id FROM community_comment WHERE user_id=$1)'],
 ['community_moderation_audit','id','t.actor_id=$1 OR t.data::text LIKE ''%''||$1||''%'' OR t.target LIKE ''%''||$1||''%'''],
 ['community_staff_audit','id','t.user_id=$1'],
 ['community_medal_claim','id','t.user_id=$1 OR t.reviewer_id=$1'],
 ['community_medal_audit','id','t.actor_id=$1 OR t.claim_id IN (SELECT id FROM community_medal_claim WHERE user_id=$1)'],
 ['contest','id','t."creatorUserId"=$1'],
 ['coaching_inquiry','id','lower(trim(t.contact))=(SELECT lower(email) FROM "user" WHERE id=$1)']
 ] LOOP
  rel:=to_regclass(spec[1]);IF rel IS NULL THEN CONTINUE; END IF;
  statement:=format('SELECT %L,jsonb_object_agg(k,to_jsonb(t)->k),to_jsonb(t),encode(sha256(convert_to(to_jsonb(t)::text,''UTF8'')),''hex'') FROM %s t CROSS JOIN unnest(string_to_array(%L,'','')) k WHERE (%s) OR EXISTS(SELECT 1 FROM account_deletion_case_link l WHERE l.subject_id=$1 AND l.source_relation=%L AND l.expires_at>clock_timestamp() AND to_jsonb(t) @> l.source_key) GROUP BY t',spec[1],rel,spec[2],spec[3],spec[1]);
  RETURN QUERY EXECUTE statement USING subject;
 END LOOP;
END $$;

CREATE FUNCTION account_deletion_evidence_control(actor text,session_token text,credential_hash text,action text,payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE row_data account_deletion_evidence%ROWTYPE; rec record; result jsonb; target text; evidence_id uuid; policy account_deletion_policy%ROWTYPE; key_names text[];
BEGIN
 PERFORM account_deletion_policy_ready();PERFORM account_deletion_auth(actor,session_token,credential_hash,true);
 IF length(trim(coalesce(payload->>'accessPurpose','')))<5 OR length(payload->>'accessPurpose')>500 THEN RAISE EXCEPTION 'Document access necessity';END IF;
 SELECT * INTO policy FROM account_deletion_policy;
 IF action='identify' THEN
  target:=payload->>'subjectId';IF target IS NULL OR target=actor OR NOT EXISTS(SELECT 1 FROM "user" WHERE id=target) THEN RAISE EXCEPTION 'Independent verified subject required' USING ERRCODE='42501';END IF;
  IF payload->>'relation'<>ALL(ARRAY['community_report','community_moderation_appeal','community_moderation_audit','community_comment_review','community_thread_lock','community_staff_audit','community_medal_claim','community_medal_audit','community_comment_evidence']) OR payload->>'relation' IS NULL THEN RAISE EXCEPTION 'Unsupported case relation';END IF;
  IF jsonb_typeof(payload->'key')<>'object' OR payload->'key'='{}' OR octet_length((payload->'key')::text)>1000 THEN RAISE EXCEPTION 'Exact case key required';END IF;
  key_names:=CASE payload->>'relation' WHEN 'community_comment_evidence' THEN ARRAY['comment_id','content_version'] WHEN 'community_comment_review' THEN ARRAY['comment_id'] WHEN 'community_thread_lock' THEN ARRAY['root_id'] ELSE ARRAY['id'] END;
  IF NOT ((payload->'key') ?& key_names) OR EXISTS(SELECT 1 FROM jsonb_object_keys(payload->'key') k WHERE k<>ALL(key_names)) THEN RAISE EXCEPTION 'Exact primary case key required';END IF;
  EXECUTE format('SELECT count(*) FROM %s t WHERE to_jsonb(t) @> $1',to_regclass(payload->>'relation')) INTO result USING payload->'key';
  IF result<>'1'::jsonb THEN RAISE EXCEPTION 'Case key must identify exactly one record';END IF;
  INSERT INTO account_deletion_case_link VALUES(target,payload->>'relation',payload->'key',clock_timestamp()+policy.receipt_lifetime) ON CONFLICT(subject_id,source_relation,source_key) DO UPDATE SET expires_at=excluded.expires_at;
  INSERT INTO account_deletion_access(operator_tag,purpose,action,expires_at) VALUES(actor,payload->>'accessPurpose','identify',clock_timestamp()+policy.access_lifetime);RETURN jsonb_build_object('identified',true);
 ELSIF action='inventory' THEN
  target:=payload->>'subjectId';IF target IS NULL AND payload ? 'requestId' THEN SELECT user_id INTO target FROM account_deletion_request WHERE id=(payload->>'requestId')::uuid AND expires_at>clock_timestamp();END IF;IF target IS NULL OR target=actor THEN RAISE EXCEPTION 'Independent operator required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(i)),'[]') INTO result FROM account_deletion_inventory(target) i;
  INSERT INTO account_deletion_access(operator_tag,purpose,action,expires_at) VALUES(actor,payload->>'accessPurpose','inventory',clock_timestamp()+policy.access_lifetime);RETURN result;
 ELSIF action='prepare' THEN
  target:=payload->>'subjectId';IF target IS NULL AND payload ? 'requestId' THEN SELECT user_id INTO target FROM account_deletion_request WHERE id=(payload->>'requestId')::uuid AND expires_at>clock_timestamp();END IF;IF target IS NULL OR target=actor THEN RAISE EXCEPTION 'Independent operator required' USING ERRCODE='42501'; END IF;
  SELECT * INTO rec FROM account_deletion_inventory(target) WHERE relation_name=payload->>'relation' AND record_key=payload->'key';
  IF NOT FOUND OR rec.digest<>payload->>'digest' THEN RAISE EXCEPTION 'Evidence changed' USING ERRCODE='40001'; END IF;
  IF jsonb_typeof(payload->'retainFields')<>'array' OR jsonb_typeof(payload->'replacement')<>'object' THEN RAISE EXCEPTION 'Invalid disposition'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(payload->'retainFields') k WHERE NOT(rec.record_data ? k)) THEN RAISE EXCEPTION 'Unknown retained field';END IF;
  SELECT coalesce(jsonb_object_agg(k,rec.record_data->k),'{}') INTO result FROM jsonb_array_elements_text(payload->'retainFields') k WHERE rec.record_data ? k;
  IF payload->>'purpose'='erase' AND result<>'{}' THEN RAISE EXCEPTION 'Erasure cannot retain evidence'; END IF;
  IF (payload->>'expiresAt')::timestamptz<=clock_timestamp() OR (payload->>'expiresAt')::timestamptz>clock_timestamp()+policy.max_evidence_lifetime
   OR (payload->>'reviewAt')::timestamptz>clock_timestamp()+policy.max_review_gap OR (payload->>'reviewAt')::timestamptz<=clock_timestamp() THEN RAISE EXCEPTION 'Reviewed bounded disposition dates required'; END IF;
  INSERT INTO account_deletion_evidence(subject_id,source_relation,source_key,source_digest,retained,replacement,purpose,necessity,legal_basis,responsible_operator,review_criteria,disposal_criteria,review_at,expires_at,created_by)
  VALUES(target,rec.relation_name,rec.record_key,rec.digest,result,payload->'replacement',payload->>'purpose',payload->>'necessity',payload->>'legalBasis',payload->>'responsibleOperator',payload->>'reviewCriteria',payload->>'disposalCriteria',(payload->>'reviewAt')::timestamptz,(payload->>'expiresAt')::timestamptz,actor) RETURNING id INTO evidence_id;
  INSERT INTO account_deletion_access(evidence_id,operator_tag,purpose,action,expires_at) VALUES(evidence_id,actor,payload->>'accessPurpose','prepare',clock_timestamp()+policy.access_lifetime);RETURN jsonb_build_object('id',evidence_id);
 ELSE
  SELECT * INTO row_data FROM account_deletion_evidence WHERE id=(payload->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
  IF action='approve' THEN
   IF actor=row_data.created_by OR actor=row_data.subject_id THEN RAISE EXCEPTION 'Independent approver required' USING ERRCODE='42501'; END IF;
   IF row_data.expires_at<=clock_timestamp() OR row_data.review_at<=clock_timestamp() THEN RAISE EXCEPTION 'Review is overdue'; END IF;
   UPDATE account_deletion_evidence SET approved_by=actor,approved_at=clock_timestamp() WHERE id=row_data.id;
  ELSIF action='read' THEN
   IF row_data.approved_at IS NULL OR row_data.restricted OR row_data.review_at<=clock_timestamp() OR row_data.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Evidence access restricted' USING ERRCODE='42501'; END IF;
   result:=row_data.retained;
  ELSIF action='restrict' THEN UPDATE account_deletion_evidence SET restricted=true WHERE id=row_data.id;
  ELSIF action='dispose' THEN
   IF actor=row_data.created_by THEN RAISE EXCEPTION 'Independent disposal operator required' USING ERRCODE='42501'; END IF;
   DELETE FROM account_deletion_evidence WHERE id=row_data.id;
  ELSE RAISE EXCEPTION 'Invalid evidence action'; END IF;
  INSERT INTO account_deletion_access(evidence_id,operator_tag,purpose,action,expires_at) VALUES(row_data.id,actor,payload->>'accessPurpose',action,clock_timestamp()+policy.access_lifetime);
  RETURN coalesce(result,jsonb_build_object('id',row_data.id));
 END IF;
END $$;

-- Shared attribution principal, not the closed account. DB guards make login impossible.
INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt")
 VALUES('__physcratic_deleted_principal_v1__','Deleted user','deleted-principal@account-deletion.invalid',false,clock_timestamp(),clock_timestamp());
CREATE FUNCTION account_deletion_principal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='user' THEN
  IF OLD.id='__physcratic_deleted_principal_v1__' THEN RAISE EXCEPTION 'Non-login principal is immutable' USING ERRCODE='42501'; END IF;
 ELSE
  IF NEW."userId"='__physcratic_deleted_principal_v1__' THEN RAISE EXCEPTION 'Non-login principal cannot authenticate' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER account_deletion_principal_user BEFORE UPDATE OR DELETE ON "user" FOR EACH ROW EXECUTE FUNCTION account_deletion_principal_guard();
CREATE TRIGGER account_deletion_principal_account BEFORE INSERT OR UPDATE ON account FOR EACH ROW EXECUTE FUNCTION account_deletion_principal_guard();
CREATE TRIGGER account_deletion_principal_session BEFORE INSERT OR UPDATE ON "session" FOR EACH ROW EXECUTE FUNCTION account_deletion_principal_guard();

CREATE FUNCTION account_deletion_queue(deletion uuid,provider_name text,path text) RETURNS void LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE retain_until timestamptz;
BEGIN
 IF path IS NULL THEN RETURN; END IF;
 IF (provider_name='author' AND path !~ '^(author-media|solution-evidence)/[A-Za-z0-9/_.-]+$')
 OR(provider_name='profile' AND path !~ '^community-profile-media/[0-9a-f-]{36}\.webp$')
 OR(provider_name='medal' AND path !~ '^community-medal-proof/[0-9a-f-]{36}\.pdf$') OR path LIKE '%..%' THEN RAISE EXCEPTION 'Unrecognized registered private object'; END IF;
 SELECT max(expires_at) INTO retain_until FROM account_deletion_evidence WHERE approved_at IS NOT NULL AND purpose<>'erase'
 AND jsonb_path_exists(retained,'$.** ? (@ == $path)',jsonb_build_object('path',path));
 INSERT INTO account_deletion_outbox(deletion_id,provider,pathname,available_at) VALUES(deletion,provider_name,path,coalesce(retain_until,clock_timestamp()))
 ON CONFLICT(provider,pathname) DO UPDATE SET available_at=greatest(account_deletion_outbox.available_at,excluded.available_at);
END $$;

CREATE FUNCTION account_deletion_execute(actor text,session_token text,credential_hash text,nonce_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE receipt account_deletion_receipt_store%ROWTYPE; policy account_deletion_policy%ROWTYPE;
 rec record; evidence account_deletion_evidence%ROWTYPE; spec text[]; relation regclass; changes jsonb;
 principal constant text:='__physcratic_deleted_principal_v1__'; email_value text; current_digest text; ids uuid[]; path_row record; receipt_tag text; retained_plans uuid[]:='{}';
BEGIN
 PERFORM account_deletion_policy_ready();
 IF nonce_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid receipt capability'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('account-deletion:'||nonce_hash,0));
 receipt_tag:=encode(sha256(convert_to(actor||':'||nonce_hash,'UTF8')),'hex');
 SELECT * INTO receipt FROM account_deletion_receipt_store WHERE nonce=nonce_hash;
 IF FOUND THEN
  IF receipt.actor_tag<>receipt_tag THEN RAISE EXCEPTION 'Receipt belongs to another request' USING ERRCODE='42501'; END IF;
  RETURN account_deletion_receipt(nonce_hash);
 END IF;
 PERFORM account_deletion_auth(actor,session_token,credential_hash);
 PERFORM pg_advisory_xact_lock(hashtextextended('authored-student:'||actor,6));
 SELECT email INTO email_value FROM "user" WHERE id=actor;
 SELECT * INTO policy FROM account_deletion_policy;
 -- Every associated mixed record must have a current, independently approved exact snapshot.
 -- This is a review-required outcome BEFORE personal cleanup, never a deletion-success receipt.
 FOR rec IN SELECT * FROM account_deletion_inventory(actor) LOOP
  EXECUTE format('SELECT encode(sha256(convert_to(to_jsonb(t)::text,''UTF8'')),''hex'') FROM %s t WHERE to_jsonb(t) @> $1 FOR UPDATE',to_regclass(rec.relation_name)) INTO current_digest USING rec.record_key;
  IF current_digest IS DISTINCT FROM rec.digest THEN RAISE EXCEPTION 'Evidence changed during review' USING ERRCODE='40001';END IF;
  SELECT * INTO evidence FROM account_deletion_evidence WHERE subject_id=actor AND source_relation=rec.relation_name
   AND source_key=rec.record_key AND source_digest=rec.digest AND approved_at IS NOT NULL
   AND approved_by<>created_by AND approved_by<>actor AND NOT restricted AND review_at>clock_timestamp() AND expires_at>clock_timestamp()
   ORDER BY approved_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mixed evidence requires adjudication' USING ERRCODE='P0002'; END IF;
 END LOOP;
 INSERT INTO account_deletion_receipt_store(nonce,actor_tag,expires_at) VALUES(nonce_hash,receipt_tag,clock_timestamp()+policy.receipt_lifetime) RETURNING * INTO receipt;

 IF to_regclass('community_comment_like') IS NOT NULL THEN PERFORM account_deletion_permit_delete('community_comment_like','t.user_id=$1',actor);END IF;
 -- Apply reviewed redactions to source case records. State/keys/third-party ownership are fixed.
 -- Necessary selected originals exist only in the bounded staff evidence vault.
 FOR rec IN SELECT * FROM account_deletion_inventory(actor) LOOP
  SELECT * INTO evidence FROM account_deletion_evidence WHERE subject_id=actor AND source_relation=rec.relation_name
   AND source_key=rec.record_key AND source_digest=rec.digest AND approved_at IS NOT NULL AND NOT restricted
   ORDER BY approved_at DESC LIMIT 1;
  IF NOT FOUND OR evidence.review_at<=clock_timestamp() OR evidence.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Evidence review changed' USING ERRCODE='P0002';END IF;
  IF evidence.purpose<>'erase' AND evidence.retained<>'{}' THEN retained_plans:=array_append(retained_plans,evidence.id);END IF;
  relation:=to_regclass(rec.relation_name);
  changes:=coalesce(evidence.replacement,'{}');
  IF position(actor in changes::text)>0 OR position(lower(email_value) in lower(changes::text))>0 THEN RAISE EXCEPTION 'Reviewed replacement still contains account identifiers';END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(changes) k WHERE k<>ALL(CASE rec.relation_name
    WHEN 'community_comment' THEN ARRAY['body'] WHEN 'community_comment_evidence' THEN ARRAY['body']
    WHEN 'community_comment_review' THEN ARRAY['reason'] WHEN 'community_thread_lock' THEN ARRAY['reason']
    WHEN 'community_report' THEN ARRAY['details','resolution','subject'] WHEN 'community_moderation_appeal' THEN ARRAY['reason','resolution']
    WHEN 'community_moderation_audit' THEN ARRAY['reason','data','target'] WHEN 'community_staff_audit' THEN ARRAY['reason','operator']
    WHEN 'community_medal_claim' THEN ARRAY['reason'] WHEN 'community_medal_audit' THEN ARRAY['reason'] WHEN 'contest' THEN ARRAY['creators'] WHEN 'coaching_inquiry' THEN ARRAY[]::text[] ELSE ARRAY[]::text[] END))
   THEN RAISE EXCEPTION 'Disposition cannot change independent records'; END IF;
  CASE rec.relation_name
   WHEN 'community_comment' THEN changes:=changes||jsonb_build_object('body','','user_id',NULL,'deleted_at',clock_timestamp(),'version',(rec.record_data->>'version')::integer+1);
   WHEN 'community_comment_evidence' THEN changes:=changes||jsonb_build_object('body','','deleted',true);
   WHEN 'community_comment_review' THEN changes:=changes||jsonb_build_object('reason',coalesce(changes->>'reason',''));
    IF rec.record_data->>'reviewer_id'=actor THEN changes:=changes||jsonb_build_object('reviewer_id',NULL); END IF;
   WHEN 'community_thread_lock' THEN
    changes:=changes||jsonb_build_object('reason',coalesce(nullif(changes->>'reason',''),'Identity removed'));
    IF rec.record_data->>'actor_id'=actor THEN changes:=changes||jsonb_build_object('actor_id',principal); END IF;
   WHEN 'community_report' THEN
    changes:=changes||jsonb_build_object('details',coalesce(changes->>'details',''),'resolution',coalesce(changes->>'resolution',''));
    IF rec.record_data->>'reporter_id'=actor THEN changes:=changes||jsonb_build_object('reporter_id',NULL); END IF;
    IF rec.record_data->>'subject_key'='profile:'||actor THEN changes:=changes||jsonb_build_object('subject_key','profile:deleted','subject',jsonb_build_object('kind','profile','handle','deleted-user')); END IF;
   WHEN 'community_moderation_appeal' THEN
    changes:=changes||jsonb_build_object('reason',coalesce(nullif(changes->>'reason',''),'Identity removed'),'resolution',coalesce(changes->>'resolution',''));
    IF rec.record_data->>'user_id'=actor THEN changes:=changes||jsonb_build_object('user_id',NULL); END IF;
   WHEN 'community_moderation_audit' THEN
    changes:=changes||jsonb_build_object('reason',coalesce(changes->>'reason',''),'data',coalesce(changes->'data','{}'));
    IF rec.record_data->>'actor_id'=actor THEN changes:=changes||jsonb_build_object('actor_id',NULL); END IF;
    IF position(actor in (rec.record_data->>'target'))>0 THEN changes:=changes||jsonb_build_object('target','deleted-account'); END IF;
   WHEN 'community_staff_audit' THEN changes:=changes||jsonb_build_object('user_id',principal,'reason',coalesce(changes->>'reason',''),'operator',coalesce(changes->>'operator','identity-removed'));
   WHEN 'community_medal_claim' THEN
    IF rec.record_data->>'user_id'=actor THEN CONTINUE; END IF;
    changes:=changes||jsonb_build_object('reviewer_id',principal,'reason',coalesce(changes->>'reason',''));
   WHEN 'contest' THEN
    IF NOT(changes ? 'creators') OR jsonb_typeof(changes->'creators')<>'array' THEN RAISE EXCEPTION 'Reviewed attribution redaction required';END IF;
    changes:=changes||jsonb_build_object('creatorUserId',NULL,'published',false);
   WHEN 'coaching_inquiry' THEN
    IF evidence.purpose<>'erase' AND evidence.retained='{}' THEN RAISE EXCEPTION 'Reviewed private contact disposition required';END IF;
    PERFORM account_deletion_permit_delete(relation,format('to_jsonb(t) @> %L::jsonb',rec.record_key::text),actor);CONTINUE;
   WHEN 'community_medal_audit' THEN
    IF EXISTS(SELECT 1 FROM community_medal_claim WHERE id=(rec.record_data->>'claim_id')::uuid AND user_id=actor) THEN CONTINUE; END IF;
    changes:=changes||jsonb_build_object('actor_id',principal,'reason',coalesce(changes->>'reason',''));
  END CASE;
  PERFORM account_deletion_permit_update(relation,format('to_jsonb(t) @> %L::jsonb',rec.record_key::text),changes,actor);
 END LOOP;
 -- Evidence now retains only approved necessary fields. Remove the general account link.
 DELETE FROM account_deletion_evidence WHERE subject_id=actor AND NOT(id=ANY(retained_plans));
 UPDATE account_deletion_evidence SET subject_id=NULL,replacement=NULL,source_digest='' WHERE subject_id=actor;

 IF to_regclass('solution_evidence') IS NOT NULL THEN
  FOR path_row IN EXECUTE 'SELECT pathname FROM solution_evidence WHERE "userId"=$1' USING actor LOOP PERFORM account_deletion_queue(receipt.id,'author',path_row.pathname);END LOOP;
 END IF;
 IF to_regclass('community_profile_media') IS NOT NULL THEN
  FOR path_row IN SELECT pathname FROM community_profile_media WHERE user_id=actor LOOP PERFORM account_deletion_queue(receipt.id,'profile',path_row.pathname);END LOOP;
  UPDATE community_profile_media SET state='retired' WHERE user_id=actor AND state='active';
  UPDATE community_profile_media SET state='deleting' WHERE user_id=actor AND state IN ('retired','pending');
  DELETE FROM community_profile_media WHERE user_id=actor;
 END IF;
 IF to_regclass('community_medal_claim') IS NOT NULL THEN
  FOR path_row IN SELECT pathname FROM community_medal_claim WHERE user_id=actor LOOP PERFORM account_deletion_queue(receipt.id,'medal',path_row.pathname);END LOOP;
  PERFORM account_deletion_permit_delete('community_medal_audit','t.claim_id IN (SELECT id FROM community_medal_claim WHERE user_id=$1)',actor);
  PERFORM account_deletion_permit_delete('community_medal_claim','t.user_id=$1',actor);
 END IF;
 IF to_regclass('community_staff') IS NOT NULL THEN PERFORM account_deletion_permit_delete('community_staff','t.user_id=$1',actor);END IF;
 IF to_regclass('authored_solution_reveal') IS NOT NULL THEN PERFORM account_deletion_permit_delete('authored_solution_reveal','t.user_id=$1',actor);END IF;
 IF to_regclass('authored_attempt') IS NOT NULL THEN PERFORM account_deletion_permit_delete('authored_attempt','t.user_id=$1',actor);END IF;
 IF to_regclass('practice_check_attempt') IS NOT NULL THEN
  DELETE FROM practice_check_part WHERE user_id=actor;
  PERFORM account_deletion_permit_delete('practice_check_attempt','t.user_id=$1',actor);
 END IF;

 -- Remove private draft copies even when the published revision is preserved.
 SELECT coalesce(array_agg(id),'{}') INTO ids FROM authored_problem WHERE owner_id=actor;
 DELETE FROM authored_draft WHERE problem_id=ANY(ids);
 FOR path_row IN SELECT m.id,m.pathname FROM author_media m WHERE m.problem_id=ANY(ids)
  AND NOT EXISTS(SELECT 1 FROM author_revision_media r WHERE r.media_id=m.id) LOOP
  PERFORM account_deletion_queue(receipt.id,'author',path_row.pathname);
  UPDATE author_media SET state='deleting' WHERE id=path_row.id AND state<>'deleting';DELETE FROM author_media WHERE id=path_row.id;
 END LOOP;
 -- No consent condition is placed on personal deletion. Unknown continuing rights hide display.
 INSERT INTO account_deletion_publication(problem_id,prior_state,prior_revision_id)
 SELECT p.id,p.state,p.published_revision_id FROM authored_problem p WHERE p.id=ANY(ids) AND EXISTS(SELECT 1 FROM authored_revision r WHERE r.problem_id=p.id)
 ON CONFLICT(problem_id) DO NOTHING;
 UPDATE authored_problem p SET state='archived',published_revision_id=NULL WHERE p.id=ANY(ids)
 AND EXISTS(SELECT 1 FROM account_deletion_publication a WHERE a.problem_id=p.id AND NOT a.continuing_display_authorized);
 IF to_regclass('authored_solution_permission') IS NOT NULL THEN
  PERFORM account_deletion_permit_update('authored_solution_permission','t.approved_by=$1',jsonb_build_object('approved_by',principal),actor);
 END IF;
 UPDATE authored_problem SET owner_id=principal WHERE id=ANY(ids) AND EXISTS(SELECT 1 FROM authored_revision r WHERE r.problem_id=authored_problem.id);
 DELETE FROM authored_problem WHERE owner_id=actor;

 FOREACH spec SLICE 1 IN ARRAY ARRAY[
 ['solution_check','userId'],['individual_rating_event','userId'],['individual_rating','userId'],
 ['solution_attempt','userId'],['solution_evidence','userId'],['practice_attempt','userId'],['archive_progress','userId'],
 ['contest_attempt','userId'],['contest_rating','userId'],['contest_registration','userId'],['contest_admin','userId'],
 ['community_medal_limit','user_id'],['account_deletion_rate','user_id']
 ] LOOP
  relation:=to_regclass(spec[1]);IF relation IS NOT NULL THEN EXECUTE format('DELETE FROM %s WHERE %I=$1',relation,spec[2]) USING actor;END IF;
 END LOOP;
 -- Owned contest attribution was explicitly adjudicated above, preserving other contributors.
 IF to_regclass('problem_rating') IS NOT NULL THEN UPDATE problem_rating SET "reviewedBy"='Deleted user' WHERE "reviewedBy" IN (actor,email_value);END IF;
 -- Purge exact supported target-address verification/reset subjects.
 DELETE FROM verification WHERE identifier=email_value
 OR identifier='auth-email-budget:'||encode(sha256(convert_to(lower(trim(email_value)),'UTF8')),'hex')
 OR (value=actor AND (identifier LIKE 'reset-password:%' OR identifier LIKE 'delete-account-%'));
 DELETE FROM "session" WHERE "userId"=actor;
 DELETE FROM account WHERE "userId"=actor;
 DELETE FROM "user" WHERE id=actor;
 -- FK cascades revoke credentials, sessions, profile/preferences/favourites and private limits.
 DELETE FROM account_deletion_mutation WHERE backend=pg_backend_pid() AND transaction_id=txid_current();
 RETURN account_deletion_receipt(nonce_hash);
END $$;

-- Bounded leases and idempotent acknowledgement. A worker never receives a client pathname.
CREATE FUNCTION account_deletion_open_request(actor text,session_token text,credential_hash text,nonce_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE request_id uuid;
BEGIN
 PERFORM account_deletion_policy_ready();PERFORM account_deletion_auth(actor,session_token,credential_hash);
 IF nonce_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid request capability';END IF;
 INSERT INTO account_deletion_request(user_id,nonce,expires_at) VALUES(actor,nonce_hash,clock_timestamp()+(SELECT receipt_lifetime FROM account_deletion_policy))
 ON CONFLICT(nonce) DO UPDATE SET expires_at=excluded.expires_at WHERE account_deletion_request.user_id=actor RETURNING id INTO request_id;
 IF request_id IS NULL THEN RAISE EXCEPTION 'Request belongs to another account' USING ERRCODE='42501';END IF;
 RETURN request_id;
END $$;

CREATE FUNCTION account_deletion_cleanup(actor text,session_token text,credential_hash text,action text,payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE result jsonb; job account_deletion_outbox%ROWTYPE; token uuid;
BEGIN
 PERFORM account_deletion_policy_ready();PERFORM account_deletion_auth(actor,session_token,credential_hash,true);
 IF action='claim' THEN
  -- Expiry is enforced for reads even if cleanup runs late. Disposal clears retained PII.
  DELETE FROM account_deletion_evidence WHERE expires_at<=clock_timestamp();
  DELETE FROM account_deletion_access WHERE expires_at<=clock_timestamp();
  DELETE FROM account_deletion_request WHERE expires_at<=clock_timestamp();
  DELETE FROM account_deletion_case_link WHERE expires_at<=clock_timestamp();
  DELETE FROM account_deletion_outbox o USING account_deletion_receipt_store r WHERE o.deletion_id=r.id AND r.expires_at<=clock_timestamp() AND NOT EXISTS(SELECT 1 FROM account_deletion_outbox pending WHERE pending.deletion_id=r.id AND pending.state<>'complete');
  DELETE FROM account_deletion_receipt_store r WHERE expires_at<=clock_timestamp() AND NOT EXISTS(SELECT 1 FROM account_deletion_outbox o WHERE o.deletion_id=r.id);
  SELECT * INTO job FROM account_deletion_outbox WHERE available_at<=clock_timestamp() AND
   (state='pending' OR(state='leased' AND lease_until<=clock_timestamp())) ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  token:=gen_random_uuid();
  UPDATE account_deletion_outbox SET state='leased',attempts=attempts+1,lease_token=token,lease_until=clock_timestamp()+interval '30 seconds' WHERE id=job.id;
  RETURN jsonb_build_object('id',job.id,'provider',job.provider,'pathname',job.pathname,'leaseToken',token);
 ELSIF action IN ('complete','retry') THEN
  SELECT * INTO job FROM account_deletion_outbox WHERE id=(payload->>'id')::uuid AND lease_token=(payload->>'leaseToken')::uuid AND state='leased' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cleanup lease mismatch' USING ERRCODE='42501'; END IF;
  IF action='complete' THEN UPDATE account_deletion_outbox SET state='complete',completed_at=clock_timestamp(),lease_token=NULL,lease_until=NULL,last_error='' WHERE id=job.id;
  ELSE UPDATE account_deletion_outbox SET state='pending',lease_token=NULL,lease_until=NULL,last_error='Private object deletion unavailable',available_at=clock_timestamp()+make_interval(secs=>least(3600,power(2,least(attempts,10))::integer)) WHERE id=job.id;END IF;
  INSERT INTO account_deletion_access(operator_tag,purpose,action,expires_at) VALUES(actor,'Registered private-object cleanup',action,clock_timestamp()+(SELECT access_lifetime FROM account_deletion_policy));
  RETURN jsonb_build_object('id',job.id,'acknowledged',true);
 ELSE RAISE EXCEPTION 'Invalid cleanup action'; END IF;
END $$;

CREATE FUNCTION account_deletion_live_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE owner_value text;
BEGIN
 owner_value:=to_jsonb(NEW)->>TG_ARGV[0];
 IF owner_value IS NULL AND TG_ARGV[1]='nullable' THEN RETURN NEW;END IF;
 IF TG_OP='UPDATE' AND account_deletion_mutation_allowed(TG_RELID,TG_OP,to_jsonb(OLD),to_jsonb(NEW)) THEN RETURN NEW;END IF;
 IF owner_value IS NULL OR owner_value='__physcratic_deleted_principal_v1__' THEN RAISE EXCEPTION 'Live account required' USING ERRCODE='23503';END IF;
 PERFORM 1 FROM "user" WHERE id=owner_value FOR KEY SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Live account required' USING ERRCODE='23503';END IF;
 RETURN NEW;
END $$;
DO $$
DECLARE spec text[];rel regclass;
BEGIN
 FOREACH spec SLICE 1 IN ARRAY ARRAY[
 ['solution_check','userId','required'],['individual_rating_event','userId','required'],['individual_rating','userId','required'],
 ['solution_attempt','userId','required'],['solution_evidence','userId','required'],['practice_attempt','userId','required'],['archive_progress','userId','required'],
 ['contest_attempt','userId','required'],['contest_rating','userId','required'],['contest_registration','userId','required'],['contest_admin','userId','required'],['contest','creatorUserId','nullable'],
 ['community_comment_review','reviewer_id','nullable'],['community_thread_lock','actor_id','required'],['community_moderation_audit','actor_id','nullable']
 ] LOOP
  rel:=to_regclass(spec[1]);IF rel IS NOT NULL THEN EXECUTE format('CREATE TRIGGER account_deletion_live_owner BEFORE INSERT OR UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION account_deletion_live_owner(%L,%L)',rel,spec[2],spec[3]);END IF;
 END LOOP;
END $$;

-- Harden every new routine to the single trusted installation schema, catalog first,
-- pg_temp last. No caller-controlled search_path or temporary object can replace a table.
DO $$
DECLARE schema_name text:=current_schema();fn record;
BEGIN
 IF schema_name IS NULL OR schema_name IN ('pg_catalog','pg_temp') THEN RAISE EXCEPTION 'Install in the trusted application schema'; END IF;
 FOR fn IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=schema_name AND p.proname LIKE 'account_deletion_%' LOOP
  EXECUTE format('ALTER FUNCTION %s SET search_path=pg_catalog,%I,pg_temp',fn.oid::regprocedure,schema_name);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',fn.oid::regprocedure);
 END LOOP;
 -- Harmless read-only guard capability probe, required by existing invoker triggers.
 EXECUTE format('GRANT EXECUTE ON FUNCTION %I.account_deletion_mutation_allowed(oid,text,jsonb,jsonb) TO PUBLIC',schema_name);
END $$;
-- Operator separately grants ONLY execute on charge/receipt/execute to a dedicated
-- deletion-service role, and evidence_control/cleanup to a separate staff-service role.
-- Neither role receives table DML, trusted-schema CREATE or ordinary attempt DELETE.

COMMIT;
