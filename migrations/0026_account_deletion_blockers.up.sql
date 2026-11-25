BEGIN;

ALTER TABLE account_deletion_publication
 ADD COLUMN reviewed_revision_id uuid,
 ADD CONSTRAINT account_deletion_reviewed_revision_fk FOREIGN KEY(problem_id,reviewed_revision_id)
   REFERENCES authored_revision(problem_id,id);

-- Reservations outlive account and registry deletion. No runtime role has table access.
CREATE TABLE account_deletion_pending_upload (
 provider text NOT NULL CHECK(provider IN ('author','profile','medal')),
 pathname text NOT NULL,
 token_hash bytea CHECK(octet_length(token_hash)=32),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(provider,pathname)
);
REVOKE ALL ON account_deletion_pending_upload FROM PUBLIC;

-- Pre-upgrade writers have no acknowledgement capability or single-attempt
-- guarantee. Keep all registered paths until their old operations are reconciled.
LOCK TABLE author_media,community_profile_media,community_medal_claim,solution_evidence,account_deletion_outbox
 IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO account_deletion_pending_upload(provider,pathname)
 SELECT 'author',pathname FROM author_media
 UNION SELECT 'profile',pathname FROM community_profile_media
 UNION SELECT 'medal',pathname FROM community_medal_claim
 UNION SELECT 'author',pathname FROM solution_evidence
 UNION SELECT provider,pathname FROM account_deletion_outbox WHERE state<>'complete';

CREATE FUNCTION account_deletion_upload_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE token text;
BEGIN
 IF TG_OP='INSERT' THEN
  IF EXISTS(SELECT 1 FROM account_deletion_outbox WHERE provider=TG_ARGV[0] AND pathname=NEW.pathname) THEN
   RAISE EXCEPTION 'A registered cleanup path cannot be reused' USING ERRCODE='23514';
  END IF;
  token:=nullif(current_setting('physcratic.private_upload_token',true),'');
  IF token IS NOT NULL AND token !~ '^[a-f0-9]{64}$' THEN
   RAISE EXCEPTION 'Invalid upload capability' USING ERRCODE='23514';
  END IF;
  INSERT INTO account_deletion_pending_upload(provider,pathname,token_hash)
   VALUES(TG_ARGV[0],NEW.pathname,sha256(convert_to(token,'UTF8')));
  RETURN NEW;
 END IF;

 -- Ordinary cleanup cannot forget a reservation unless erasure has durably
 -- transferred the exact path to the outbox in the same or an earlier commit.
 IF EXISTS(SELECT 1 FROM account_deletion_pending_upload WHERE provider=TG_ARGV[0] AND pathname=OLD.pathname)
 AND NOT EXISTS(SELECT 1 FROM account_deletion_outbox WHERE provider=TG_ARGV[0] AND pathname=OLD.pathname AND state<>'complete') THEN
  RAISE EXCEPTION 'Upload outcome is unconfirmed' USING ERRCODE='55000';
 END IF;
 RETURN OLD;
END $$;

CREATE FUNCTION account_deletion_upload_finished(upload_provider text,upload_path text,upload_token text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
 IF upload_token IS NULL OR upload_token !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'Invalid upload acknowledgement' USING ERRCODE='42501';
 END IF;
 DELETE FROM account_deletion_pending_upload
 WHERE provider=upload_provider AND pathname=upload_path
 AND token_hash=sha256(convert_to(upload_token,'UTF8'));
 IF NOT FOUND THEN RAISE EXCEPTION 'Upload acknowledgement unavailable' USING ERRCODE='42501'; END IF;
END $$;

CREATE TRIGGER account_deletion_reserve_upload AFTER INSERT ON author_media
 FOR EACH ROW WHEN (NEW.state='pending') EXECUTE FUNCTION account_deletion_upload_guard('author');
CREATE TRIGGER account_deletion_reserve_upload AFTER INSERT ON community_profile_media
 FOR EACH ROW WHEN (NEW.state='pending') EXECUTE FUNCTION account_deletion_upload_guard('profile');
CREATE TRIGGER account_deletion_reserve_upload AFTER INSERT ON community_medal_claim
 FOR EACH ROW WHEN (NEW.state='uploading') EXECUTE FUNCTION account_deletion_upload_guard('medal');
CREATE TRIGGER account_deletion_reserve_upload AFTER INSERT ON solution_evidence
 FOR EACH ROW EXECUTE FUNCTION account_deletion_upload_guard('author');

CREATE TRIGGER account_deletion_preserve_upload BEFORE DELETE ON author_media
 FOR EACH ROW EXECUTE FUNCTION account_deletion_upload_guard('author');
CREATE TRIGGER account_deletion_preserve_upload BEFORE DELETE ON community_profile_media
 FOR EACH ROW EXECUTE FUNCTION account_deletion_upload_guard('profile');
CREATE TRIGGER account_deletion_preserve_upload BEFORE DELETE ON community_medal_claim
 FOR EACH ROW EXECUTE FUNCTION account_deletion_upload_guard('medal');
CREATE TRIGGER account_deletion_preserve_upload BEFORE DELETE ON solution_evidence
 FOR EACH ROW EXECUTE FUNCTION account_deletion_upload_guard('author');

CREATE FUNCTION account_deletion_guard_continuing_display() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
 IF NEW.owner_id='__physcratic_deleted_principal_v1__' AND NEW.state='published'
 AND NOT EXISTS(SELECT 1 FROM account_deletion_publication d WHERE d.problem_id=NEW.id
  AND d.continuing_display_authorized AND d.reviewed_revision_id=NEW.published_revision_id) THEN
  RAISE EXCEPTION 'Continuing display requires revision-specific approval' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER account_deletion_guard_continuing_display BEFORE UPDATE OF owner_id,state,published_revision_id ON authored_problem
 FOR EACH ROW EXECUTE FUNCTION account_deletion_guard_continuing_display();

-- Keep the established eraser and operator signatures, OIDs, owners and grants.
-- Every edit must match the reviewed predecessor exactly once or installation stops.
DO $migration$
DECLARE
 schema_name text:=current_schema(); signature text; definition text; edit text[];
BEGIN
 FOREACH signature IN ARRAY ARRAY['account_deletion_upload_guard()', 'account_deletion_upload_finished(text,text,text)',
  'account_deletion_guard_continuing_display()']
 LOOP
  EXECUTE format('ALTER FUNCTION %I.%s SET search_path=pg_catalog,%I,pg_temp',schema_name,signature,schema_name);
  EXECUTE format('REVOKE ALL ON FUNCTION %I.%s FROM PUBLIC',schema_name,signature);
 END LOOP;

 FOREACH signature IN ARRAY ARRAY['account_deletion_execute(text,text,text,text)','account_deletion_cleanup(text,text,text,text,jsonb)']
 LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=format('%I.%s',schema_name,signature)::regprocedure AND proowner=current_user::regrole) THEN
   RAISE EXCEPTION 'Install with the trusted account deletion routine owner: %',signature;
  END IF;
  definition:=pg_get_functiondef(format('%I.%s',schema_name,signature)::regprocedure);
  FOREACH edit SLICE 1 IN ARRAY CASE WHEN signature LIKE 'account_deletion_execute%' THEN ARRAY[
   ARRAY[$old$'subject_key','profile:deleted'$old$,$new$'subject_key','profile:deleted:'||(rec.record_key->>'id')$new$],
   ARRAY[$old$SELECT coalesce(array_agg(id),'{}') INTO ids FROM authored_problem WHERE owner_id=actor;$old$,
         $new$SELECT coalesce(array_agg(p.id),'{}') INTO ids
 FROM (SELECT id FROM authored_problem WHERE owner_id=actor ORDER BY id FOR UPDATE) p;$new$],
   ARRAY[$old$ON CONFLICT(problem_id) DO NOTHING;
 UPDATE authored_problem p SET state='archived',published_revision_id=NULL WHERE p.id=ANY(ids)
 AND EXISTS(SELECT 1 FROM account_deletion_publication a WHERE a.problem_id=p.id AND NOT a.continuing_display_authorized);$old$,
         $new$ON CONFLICT(problem_id) DO UPDATE SET prior_state=excluded.prior_state,prior_revision_id=excluded.prior_revision_id;
 UPDATE authored_problem p SET state='archived',published_revision_id=NULL WHERE p.id=ANY(ids)
 AND EXISTS(SELECT 1 FROM account_deletion_publication a WHERE a.problem_id=p.id
  AND (NOT a.continuing_display_authorized OR a.reviewed_revision_id IS NULL
       OR a.reviewed_revision_id IS DISTINCT FROM p.published_revision_id));$new$]
  ] ELSE ARRAY[
   ARRAY[$old$SELECT * INTO job FROM account_deletion_outbox WHERE available_at<=clock_timestamp() AND
   (state='pending' OR(state='leased' AND lease_until<=clock_timestamp())) ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1;$old$,
         $new$SELECT o.* INTO job FROM account_deletion_outbox o WHERE o.available_at<=clock_timestamp()
   AND (o.state='pending' OR(o.state='leased' AND o.lease_until<=clock_timestamp()))
   AND NOT EXISTS(SELECT 1 FROM account_deletion_pending_upload u WHERE u.provider=o.provider AND u.pathname=o.pathname)
   ORDER BY o.available_at,o.id FOR UPDATE OF o SKIP LOCKED LIMIT 1;$new$],
   ARRAY[$old$AND lease_token=(payload->>'leaseToken')::uuid AND state='leased' FOR UPDATE;$old$,
         $new$AND lease_token=(payload->>'leaseToken')::uuid AND state='leased' AND lease_until>clock_timestamp() FOR UPDATE;$new$],
   ARRAY[$old$IF action='complete' THEN UPDATE account_deletion_outbox$old$,
         $new$IF action='complete' AND EXISTS(
   SELECT 1 FROM account_deletion_pending_upload WHERE provider=job.provider AND pathname=job.pathname
  ) THEN RAISE EXCEPTION 'Upload outcome is unconfirmed' USING ERRCODE='55000'; END IF;
  IF action='complete' THEN UPDATE account_deletion_outbox$new$]
  ] END
  LOOP
   IF strpos(definition,edit[1])=0 OR strpos(substr(definition,strpos(definition,edit[1])+length(edit[1])),edit[1])<>0 THEN
    RAISE EXCEPTION 'Unexpected account deletion routine definition: %',signature;
   END IF;
   definition:=replace(definition,edit[1],edit[2]);
  END LOOP;
  EXECUTE definition;
 END LOOP;
END $migration$;

-- The separately reviewed runtime grant is only EXECUTE on upload_finished.
-- No default grant and no deletion, operator, or table privileges are added here.
COMMIT;
