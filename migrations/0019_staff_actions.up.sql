-- Additive. Requires Better Auth user/session, authored 0001 and moderation 0014.
-- Install only in a reviewed operator transaction. No application runtime DDL/grants.
CREATE TABLE community_restriction (
 kind text NOT NULL CHECK(kind IN ('problem','user')), target_id text NOT NULL,
 problem_id uuid REFERENCES authored_problem(id) ON DELETE CASCADE,
 user_id text REFERENCES "user"(id) ON DELETE CASCADE,
 restricted boolean NOT NULL, version integer NOT NULL CHECK(version>0),
 PRIMARY KEY(kind,target_id),
 CHECK((kind='problem' AND problem_id IS NOT NULL AND target_id=problem_id::text AND user_id IS NULL)
    OR (kind='user' AND user_id IS NOT NULL AND target_id=user_id AND problem_id IS NULL))
);
CREATE UNIQUE INDEX community_restriction_user ON community_restriction(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX community_restriction_problem ON community_restriction(problem_id) WHERE problem_id IS NOT NULL;
-- Reason/actor evidence stays in the existing immutable moderation audit, whose
-- reviewed 0018 inventory/redaction path already covers actor IDs and target text.
DO $migration$
DECLARE s text:=pg_catalog.current_schema();
BEGIN
 EXECUTE pg_catalog.format($definition$
 CREATE FUNCTION %1$I.community_restriction_decide(actor text,subject_kind text,subject text,expected integer,decision boolean,note text)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO %1$I, pg_catalog, pg_temp AS $body$
 DECLARE staff_role text; subject_owner text; previous %1$I.community_restriction; next_version integer;
 BEGIN
  staff_role:=%1$I.community_staff_role_locked(actor);
  IF staff_role NOT IN ('admin','moderator') OR EXISTS(SELECT 1 FROM %1$I.community_restriction WHERE kind='user' AND user_id=actor AND restricted)
   THEN RAISE EXCEPTION 'Current staff permission required' USING ERRCODE='42501';END IF;
  IF subject_kind IS NULL OR subject_kind NOT IN ('problem','user') OR subject IS NULL OR length(subject) NOT BETWEEN 1 AND 128
    OR expected IS NULL OR expected<0 OR expected>=2147483647 OR decision IS NULL OR note IS NULL
    OR length(trim(note)) NOT BETWEEN 1 AND 1000
   THEN RAISE EXCEPTION 'Invalid decision' USING ERRCODE='23514';END IF;
  IF NOT decision AND staff_role<>'admin' THEN RAISE EXCEPTION 'Admin required for restoration' USING ERRCODE='42501';END IF;
  IF subject_kind='user' THEN
   -- Same lock as session guard. Session creation cannot race across a ban commit.
   SELECT id INTO subject_owner FROM %1$I."user" WHERE id=subject FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Account not found' USING ERRCODE='P0002';END IF;
   IF subject=actor OR %1$I.community_staff_role_locked(subject) IN ('admin','moderator')
    THEN RAISE EXCEPTION 'Staff accounts and self are protected' USING ERRCODE='42501';END IF;
  ELSE
   SELECT owner_id INTO subject_owner FROM %1$I.authored_problem p WHERE id=subject::uuid AND EXISTS(SELECT 1 FROM %1$I.authored_revision r WHERE r.problem_id=p.id) FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Published question not found' USING ERRCODE='P0002';END IF;
   IF subject_owner=actor THEN RAISE EXCEPTION 'Independent staff required' USING ERRCODE='42501';END IF;
  END IF;
  SELECT * INTO previous FROM %1$I.community_restriction WHERE kind=subject_kind AND target_id=subject FOR UPDATE;
  IF coalesce(previous.version,0)<>expected OR coalesce(previous.restricted,false)=decision
   THEN RAISE EXCEPTION 'Stale or duplicate decision' USING ERRCODE='23514';END IF;
  next_version:=expected+1;
  INSERT INTO %1$I.community_restriction(kind,target_id,problem_id,user_id,restricted,version)
   VALUES(subject_kind,subject,CASE WHEN subject_kind='problem' THEN subject::uuid END,CASE WHEN subject_kind='user' THEN subject END,decision,next_version)
   ON CONFLICT(kind,target_id) DO UPDATE SET restricted=excluded.restricted,version=excluded.version;
  -- Durable withdrawal also protects readers if the new feature gate is later
  -- disabled. Keep the immutable pointer/history. Restoration permits a fresh
  -- author publication and never overrides an author's subsequent withdrawal.
  IF subject_kind='problem' AND decision THEN
   UPDATE %1$I.authored_problem SET state='archived',updated_at=clock_timestamp() WHERE id=subject::uuid AND state='published';
  END IF;
  IF subject_kind='user' AND decision THEN DELETE FROM %1$I."session" WHERE "userId"=subject;END IF;
  INSERT INTO %1$I.community_moderation_audit(actor_id,action,target,version,reason,data)
   VALUES(actor,CASE WHEN subject_kind='user' THEN CASE WHEN decision THEN 'ban' ELSE 'unban' END ELSE CASE WHEN decision THEN 'remove-question' ELSE 'restore-question' END END,
    'restriction-'||subject_kind||':'||subject,next_version,note,jsonb_build_object('restricted',decision,'staffRole',staff_role));
  RETURN next_version;
 END $body$
 $definition$,s);
 EXECUTE pg_catalog.format($definition$
 CREATE FUNCTION %1$I.community_session_restriction_guard() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO %1$I, pg_catalog, pg_temp AS $body$
 BEGIN
  PERFORM 1 FROM %1$I."user" WHERE id=NEW."userId" FOR SHARE;
  IF EXISTS(SELECT 1 FROM %1$I.community_restriction WHERE kind='user' AND user_id=NEW."userId" AND restricted)
   THEN RAISE EXCEPTION 'Account is banned' USING ERRCODE='42501';END IF;
  RETURN NEW;
 END $body$
 $definition$,s);
 EXECUTE pg_catalog.format($definition$
 CREATE FUNCTION %1$I.community_publication_restriction_guard() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO %1$I, pg_catalog, pg_temp AS $body$
 BEGIN
  IF NEW.state='published' AND (NEW.state,NEW.published_revision_id) IS DISTINCT FROM (OLD.state,OLD.published_revision_id)
   AND EXISTS(SELECT 1 FROM %1$I.community_restriction WHERE kind='problem' AND problem_id=NEW.id AND restricted)
   THEN RAISE EXCEPTION 'Question removed by moderation' USING ERRCODE='42501';END IF;
  RETURN NEW;
 END $body$
 $definition$,s);
 EXECUTE pg_catalog.format('CREATE TRIGGER community_session_restriction BEFORE INSERT OR UPDATE ON %I."session" FOR EACH ROW EXECUTE FUNCTION %I.community_session_restriction_guard()',s,s);
 EXECUTE pg_catalog.format('CREATE TRIGGER community_publication_restriction BEFORE UPDATE ON %I.authored_problem FOR EACH ROW EXECUTE FUNCTION %I.community_publication_restriction_guard()',s,s);
END $migration$;
REVOKE ALL ON community_restriction FROM PUBLIC;
REVOKE ALL ON FUNCTION community_restriction_decide(text,text,text,integer,boolean,text),community_session_restriction_guard(),community_publication_restriction_guard() FROM PUBLIC;
