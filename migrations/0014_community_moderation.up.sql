-- Requires 0010 staff and 0013 comments (and their authored prerequisites).
CREATE TABLE community_comment_review (
 comment_id uuid PRIMARY KEY REFERENCES community_comment(id) ON DELETE RESTRICT,
 content_version integer NOT NULL CHECK(content_version>0), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 state text NOT NULL CHECK(state IN ('visible','held','hidden')), restricted boolean NOT NULL,
 codes text[] NOT NULL DEFAULT '{}', policy_version text NOT NULL DEFAULT 'unreviewed',
 reviewer_id text, reason text NOT NULL DEFAULT '', updated_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 CHECK(cardinality(codes)<=10),CHECK(length(reason)<=1000)
);
CREATE INDEX community_comment_review_queue ON community_comment_review(state,comment_id);
CREATE TABLE community_comment_evidence (
 comment_id uuid NOT NULL REFERENCES community_comment(id) ON DELETE RESTRICT,content_version integer NOT NULL,
 body text NOT NULL CHECK(length(body)<=2000 AND octet_length(body)<=8000),deleted boolean NOT NULL,
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(comment_id,content_version)
);
CREATE TABLE community_thread_lock (
 root_id uuid PRIMARY KEY REFERENCES community_comment(id) ON DELETE RESTRICT, problem_key text NOT NULL,
 locked boolean NOT NULL,version integer NOT NULL CHECK(version>0),actor_id text NOT NULL,reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 1000),
 updated_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),FOREIGN KEY(problem_key,root_id) REFERENCES community_comment(problem_key,id)
);
CREATE TABLE community_report (
 id uuid PRIMARY KEY,reporter_id text REFERENCES "user"(id) ON DELETE SET NULL,request_id uuid NOT NULL,
 subject jsonb NOT NULL CHECK(jsonb_typeof(subject)='object' AND octet_length(subject::text)<=2048),subject_key text NOT NULL,
 reason text NOT NULL CHECK(reason IN ('abuse','hate','threat','spam','privacy','rights','other')),
 details text NOT NULL CHECK(length(details)<=1000),request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','triaged','dismissed','actioned')),version integer NOT NULL DEFAULT 1 CHECK(version>0),
 resolution text NOT NULL DEFAULT '' CHECK(length(resolution)<=1000),created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(reporter_id,request_id)
);
CREATE UNIQUE INDEX community_report_active ON community_report(reporter_id,subject_key) WHERE state IN ('open','triaged');
CREATE INDEX community_report_queue ON community_report(state,id);
CREATE INDEX community_report_owner ON community_report(reporter_id,id);
CREATE TABLE community_moderation_appeal (
 id uuid PRIMARY KEY,user_id text REFERENCES "user"(id) ON DELETE SET NULL,request_id uuid NOT NULL,
 comment_id uuid NOT NULL REFERENCES community_comment(id),content_version integer NOT NULL,review_version integer NOT NULL,
 reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 1000),state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','accepted','rejected')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),resolution text NOT NULL DEFAULT '' CHECK(length(resolution)<=1000),
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(user_id,request_id),UNIQUE(comment_id,content_version,review_version)
);
CREATE INDEX community_appeal_queue ON community_moderation_appeal(state,id);
CREATE INDEX community_appeal_owner ON community_moderation_appeal(user_id,id);
CREATE TABLE community_moderation_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id text,action text NOT NULL,target text NOT NULL,version integer NOT NULL,
 reason text NOT NULL CHECK(length(reason)<=1000),data jsonb NOT NULL CHECK(octet_length(data::text)<=4096),created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX community_moderation_audit_target ON community_moderation_audit(target,id DESC);
CREATE TRIGGER moderation_audit_immutable BEFORE UPDATE OR DELETE ON community_moderation_audit FOR EACH ROW EXECUTE FUNCTION community_immutable_audit();
CREATE TRIGGER comment_evidence_immutable BEFORE UPDATE OR DELETE ON community_comment_evidence FOR EACH ROW EXECUTE FUNCTION community_immutable_audit();
CREATE TRIGGER moderation_audit_no_truncate BEFORE TRUNCATE ON community_moderation_audit FOR EACH STATEMENT EXECUTE FUNCTION community_immutable_audit();
CREATE TRIGGER comment_evidence_no_truncate BEFORE TRUNCATE ON community_comment_evidence FOR EACH STATEMENT EXECUTE FUNCTION community_immutable_audit();
CREATE TABLE community_moderation_limit (
 bucket text PRIMARY KEY,minute timestamptz NOT NULL,requests integer NOT NULL CHECK(requests BETWEEN 1 AND 121),
 day date NOT NULL,reports integer NOT NULL DEFAULT 0 CHECK(reports BETWEEN 0 AND 11),appeals integer NOT NULL DEFAULT 0 CHECK(appeals BETWEEN 0 AND 4)
);
CREATE TABLE community_content_limit (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,day date NOT NULL,writes integer NOT NULL CHECK(writes BETWEEN 1 AND 101)
);
CREATE FUNCTION community_staff_role_locked(actor text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE staff_role text;
BEGIN SELECT role INTO staff_role FROM community_staff WHERE user_id=actor FOR SHARE;RETURN coalesce(staff_role,'none');END $$;
CREATE FUNCTION community_thread_root(target uuid) RETURNS uuid LANGUAGE sql STABLE AS $$
 WITH RECURSIVE ancestry AS (
  SELECT id,parent_id,0 AS steps FROM community_comment WHERE id=target
  UNION ALL SELECT p.id,p.parent_id,a.steps+1 FROM community_comment p JOIN ancestry a ON p.id=a.parent_id WHERE a.steps<64
 ) SELECT id FROM ancestry WHERE parent_id IS NULL LIMIT 1;
$$;
CREATE FUNCTION community_moderation_capture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE v integer;next_state text;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.body,NEW.version,NEW.deleted_at) IS NOT DISTINCT FROM (OLD.body,OLD.version,OLD.deleted_at) THEN RETURN NEW; END IF;
 INSERT INTO community_comment_evidence(comment_id,content_version,body,deleted) VALUES(NEW.id,NEW.version,NEW.body,NEW.deleted_at IS NOT NULL);
 INSERT INTO community_comment_review(comment_id,content_version,state,restricted,codes)
 VALUES(NEW.id,NEW.version,'held',false,ARRAY['unreviewed']) ON CONFLICT(comment_id) DO UPDATE SET
 content_version=NEW.version,version=community_comment_review.version+1,
 state=CASE WHEN community_comment_review.restricted THEN community_comment_review.state ELSE 'held' END,
 codes=ARRAY['unreviewed'],reviewer_id=CASE WHEN community_comment_review.restricted THEN community_comment_review.reviewer_id ELSE NULL END,reason=CASE WHEN community_comment_review.restricted THEN community_comment_review.reason ELSE '' END,updated_at=clock_timestamp() RETURNING version,state INTO v,next_state;
 INSERT INTO community_moderation_audit(actor_id,action,target,version,reason,data)
 VALUES(NEW.user_id,CASE WHEN NEW.deleted_at IS NULL THEN 'content' ELSE 'soft-delete' END,'comment:'||NEW.id,v,'Content snapshot',jsonb_build_object('contentVersion',NEW.version,'state',next_state));
 RETURN NEW;
END $$;
CREATE TRIGGER community_moderation_capture AFTER INSERT OR UPDATE ON community_comment FOR EACH ROW EXECUTE FUNCTION community_moderation_capture();
-- Legacy texts retain identity/body/topology and await review; no unreviewed backfill is made public.
INSERT INTO community_comment_evidence(comment_id,content_version,body,deleted) SELECT id,version,body,deleted_at IS NOT NULL FROM community_comment;
INSERT INTO community_comment_review(comment_id,content_version,state,restricted,codes) SELECT id,version,'held',true,ARRAY['legacy-review'] FROM community_comment;
INSERT INTO community_moderation_audit(actor_id,action,target,version,reason,data) SELECT NULL,'legacy-review','comment:'||id,1,'Legacy text awaits review',jsonb_build_object('contentVersion',version) FROM community_comment;
CREATE FUNCTION community_apply_content_policy(target uuid,actor text,decision text,flags text[],policy text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE c community_comment;r community_comment_review;next_state text;
BEGIN
 SELECT * INTO c FROM community_comment WHERE id=target FOR UPDATE;
 IF c.user_id IS DISTINCT FROM actor OR c.deleted_at IS NOT NULL OR decision NOT IN ('visible','held') OR length(policy)>80 OR cardinality(flags)>10 THEN RAISE EXCEPTION 'Invalid policy record' USING ERRCODE='23514'; END IF;
 SELECT * INTO r FROM community_comment_review WHERE comment_id=target FOR UPDATE;
 IF r.content_version IS DISTINCT FROM c.version THEN RAISE EXCEPTION 'Stale policy record' USING ERRCODE='23514'; END IF;
 next_state:=CASE WHEN r.restricted THEN r.state ELSE decision END;
 UPDATE community_comment_review SET state=next_state,restricted=restricted OR decision='held',codes=flags,policy_version=policy,version=version+1,updated_at=clock_timestamp() WHERE comment_id=target RETURNING * INTO r;
 INSERT INTO community_moderation_audit(actor_id,action,target,version,reason,data) VALUES(actor,'policy','comment:'||target,r.version,'Server content policy',jsonb_build_object('state',next_state,'contentVersion',c.version,'codes',flags,'policy',policy));
END $$;
CREATE FUNCTION community_moderation_decide(actor text,operation text,target uuid,expected integer,content_expected integer,decision text,note text,problem text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
DECLARE staff_role text;c community_comment;r community_comment_review;rep community_report;ap community_moderation_appeal;l community_thread_lock;root uuid;v integer;subject_owner text;
BEGIN
 staff_role:=community_staff_role_locked(actor);
 IF staff_role NOT IN ('admin','moderator') THEN RAISE EXCEPTION 'Staff required' USING ERRCODE='42501'; END IF;
 IF length(trim(note)) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Reason required' USING ERRCODE='23514'; END IF;
 IF operation='report' THEN
  SELECT * INTO rep FROM community_report WHERE id=target FOR UPDATE;
  IF NOT FOUND OR rep.version<>expected THEN RAISE EXCEPTION 'Report conflict' USING ERRCODE='23514'; END IF;
  IF rep.reporter_id=actor THEN RAISE EXCEPTION 'Independent staff required' USING ERRCODE='42501'; END IF;
  IF rep.subject->>'kind'='comment' THEN SELECT user_id INTO subject_owner FROM community_comment WHERE id=(rep.subject->>'id')::uuid;
  ELSIF rep.subject->>'kind'='profile' THEN subject_owner:=substring(rep.subject_key FROM 9);
  ELSIF rep.subject->>'kind'='problem' AND rep.subject->>'key' LIKE 'authored:%' THEN SELECT owner_id INTO subject_owner FROM authored_problem WHERE id=substring(rep.subject->>'key' FROM 10)::uuid; END IF;
  IF subject_owner=actor THEN RAISE EXCEPTION 'Independent staff required' USING ERRCODE='42501'; END IF;
  IF rep.state IN ('dismissed','actioned') AND staff_role<>'admin' THEN RAISE EXCEPTION 'Admin correction required' USING ERRCODE='42501'; END IF;
  IF decision NOT IN ('triaged','dismissed','actioned') OR decision=rep.state THEN RAISE EXCEPTION 'Invalid report transition' USING ERRCODE='23514'; END IF;
  UPDATE community_report SET state=decision,resolution=note,version=version+1,updated_at=clock_timestamp() WHERE id=target RETURNING version INTO v;
 ELSIF operation IN ('comment','thread','appeal') THEN
  IF operation='appeal' THEN
   IF staff_role<>'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
   SELECT * INTO ap FROM community_moderation_appeal WHERE id=target;
   IF NOT FOUND THEN RAISE EXCEPTION 'Appeal not found' USING ERRCODE='23514'; END IF;
   SELECT * INTO c FROM community_comment WHERE id=ap.comment_id;
  ELSE SELECT * INTO c FROM community_comment WHERE id=target; END IF;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Comment not found' USING ERRCODE='23514'; END IF;
  IF c.user_id=actor THEN RAISE EXCEPTION 'Independent staff required' USING ERRCODE='42501'; END IF;
  IF c.problem_key LIKE 'authored:%' THEN PERFORM 1 FROM authored_problem WHERE id=substring(c.problem_key FROM 10)::uuid FOR SHARE; END IF;
  root:=community_thread_root(c.id);PERFORM pg_advisory_xact_lock(hashtextextended('community-thread:'||root,14));
  SELECT * INTO c FROM community_comment WHERE id=c.id FOR UPDATE;
  IF operation='thread' THEN
   IF c.parent_id IS NOT NULL OR c.problem_key IS DISTINCT FROM problem OR decision NOT IN ('locked','open') OR (decision='open' AND staff_role<>'admin') THEN RAISE EXCEPTION 'Invalid thread decision' USING ERRCODE='42501'; END IF;
   SELECT * INTO l FROM community_thread_lock WHERE root_id=target FOR UPDATE;
   IF coalesce(l.version,0)<>expected THEN RAISE EXCEPTION 'Thread conflict' USING ERRCODE='23514'; END IF;
   INSERT INTO community_thread_lock(root_id,problem_key,locked,version,actor_id,reason) VALUES(target,c.problem_key,decision='locked',1,actor,note)
   ON CONFLICT(root_id) DO UPDATE SET locked=excluded.locked,version=community_thread_lock.version+1,actor_id=actor,reason=note,updated_at=clock_timestamp() RETURNING version INTO v;
  ELSE
   SELECT * INTO r FROM community_comment_review WHERE comment_id=c.id FOR UPDATE;
   IF operation='comment' THEN
    IF c.deleted_at IS NOT NULL OR c.version<>content_expected OR r.version<>expected OR decision NOT IN ('visible','hidden') THEN RAISE EXCEPTION 'Comment conflict' USING ERRCODE='23514'; END IF;
    IF decision='visible' AND staff_role<>'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
    UPDATE community_comment_review SET state=decision,restricted=decision<>'visible',reviewer_id=actor,reason=note,version=version+1,updated_at=clock_timestamp() WHERE comment_id=c.id RETURNING version INTO v;
   ELSE
    SELECT * INTO ap FROM community_moderation_appeal WHERE id=target FOR UPDATE;
    IF ap.user_id=actor OR r.reviewer_id=actor THEN RAISE EXCEPTION 'Independent appeal reviewer required' USING ERRCODE='42501'; END IF;
    IF ap.version<>expected OR ap.state<>'open' OR decision NOT IN ('accepted','rejected') THEN RAISE EXCEPTION 'Appeal conflict' USING ERRCODE='23514'; END IF;
    IF decision='accepted' THEN
     IF c.deleted_at IS NOT NULL OR c.version<>ap.content_version OR r.version<>ap.review_version THEN RAISE EXCEPTION 'Stale appeal' USING ERRCODE='23514'; END IF;
     UPDATE community_comment_review SET state='visible',restricted=false,reviewer_id=actor,reason=note,version=version+1,updated_at=clock_timestamp() WHERE comment_id=c.id RETURNING version INTO v;
     INSERT INTO community_moderation_audit(actor_id,action,target,version,reason,data) VALUES(actor,'appeal-correction','comment:'||c.id,v,note,jsonb_build_object('state','visible','appealId',target,'contentVersion',c.version));
    END IF;
    UPDATE community_moderation_appeal SET state=decision,resolution=note,version=version+1,updated_at=clock_timestamp() WHERE id=target RETURNING version INTO v;
   END IF;
  END IF;
 ELSE RAISE EXCEPTION 'Unknown moderation action' USING ERRCODE='23514'; END IF;
 INSERT INTO community_moderation_audit(actor_id,action,target,version,reason,data) VALUES(actor,operation,operation||':'||target,v,note,jsonb_build_object('decision',decision,'contentVersion',c.version,'commentId',c.id,'staffRole',staff_role));
END $$;
CREATE FUNCTION community_case_log() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_TABLE_NAME='community_report' THEN
  INSERT INTO community_moderation_audit(actor_id,action,target,version,reason,data) VALUES(NEW.reporter_id,'report-created','report:'||NEW.id,1,NEW.reason,jsonb_build_object('state','open','kind',NEW.subject->>'kind'));
 ELSE
  INSERT INTO community_moderation_audit(actor_id,action,target,version,reason,data) VALUES(NEW.user_id,'appeal-created','appeal:'||NEW.id,1,NEW.reason,jsonb_build_object('state','open','commentId',NEW.comment_id,'contentVersion',NEW.content_version));
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER community_report_log AFTER INSERT ON community_report FOR EACH ROW EXECUTE FUNCTION community_case_log();
CREATE TRIGGER community_appeal_log AFTER INSERT ON community_moderation_appeal FOR EACH ROW EXECUTE FUNCTION community_case_log();
-- Reports/appeals immutable inputs; only reviewed owner functions update decisions. FK anonymization is permitted.
CREATE FUNCTION community_case_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Preserve cases' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  IF (TG_TABLE_NAME='community_report' AND to_jsonb(NEW)->>'reporter_id' IS NULL) OR (TG_TABLE_NAME='community_moderation_appeal' AND to_jsonb(NEW)->>'user_id' IS NULL) THEN RAISE EXCEPTION 'Case owner required' USING ERRCODE='23514'; END IF;
  IF NEW.version<>1 OR NEW.state<>'open' OR NEW.resolution<>'' THEN RAISE EXCEPTION 'Invalid initial case' USING ERRCODE='23514'; END IF;
  NEW.created_at:=clock_timestamp();NEW.updated_at:=NEW.created_at;RETURN NEW;
 END IF;
 IF TG_TABLE_NAME='community_report' THEN
  IF (to_jsonb(NEW)-ARRAY['reporter_id','state','resolution','version','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['reporter_id','state','resolution','version','updated_at']) OR (NEW.reporter_id IS DISTINCT FROM OLD.reporter_id AND NEW.reporter_id IS NOT NULL) THEN RAISE EXCEPTION 'Immutable report' USING ERRCODE='23514'; END IF;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['user_id','state','resolution','version','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['user_id','state','resolution','version','updated_at']) OR (NEW.user_id IS DISTINCT FROM OLD.user_id AND NEW.user_id IS NOT NULL) THEN RAISE EXCEPTION 'Immutable appeal' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER community_report_guard BEFORE INSERT OR UPDATE OR DELETE ON community_report FOR EACH ROW EXECUTE FUNCTION community_case_guard();
CREATE TRIGGER community_appeal_guard BEFORE INSERT OR UPDATE OR DELETE ON community_moderation_appeal FOR EACH ROW EXECUTE FUNCTION community_case_guard();
DO $$ DECLARE trusted_schema text:=current_schema();name text; BEGIN
 FOREACH name IN ARRAY ARRAY['community_case_log()','community_staff_role_locked(text)','community_moderation_capture()','community_apply_content_policy(uuid,text,text,text[],text)','community_moderation_decide(text,text,uuid,integer,integer,text,text,text)'] LOOP
 EXECUTE pg_catalog.format('ALTER FUNCTION %I.%s SET search_path TO %I, pg_catalog, pg_temp',trusted_schema,name,trusted_schema);
 END LOOP;
END $$;
REVOKE ALL ON community_comment_review,community_comment_evidence,community_thread_lock,community_report,community_moderation_appeal,community_moderation_audit,community_moderation_limit,community_content_limit FROM PUBLIC;
REVOKE ALL ON FUNCTION community_staff_role_locked(text),community_thread_root(uuid),community_moderation_capture(),community_apply_content_policy(uuid,text,text,text[],text),community_moderation_decide(text,text,uuid,integer,integer,text,text,text),community_case_guard(),community_case_log() FROM PUBLIC;
