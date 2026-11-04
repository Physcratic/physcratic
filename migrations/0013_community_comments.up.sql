-- Additive after authored 0001-0006 and Better Auth. No 0007-0012 dependency.
CREATE TABLE community_comment (
 id uuid PRIMARY KEY, problem_key text NOT NULL, user_id text REFERENCES "user"(id) ON DELETE SET NULL,
 parent_id uuid, request_id uuid NOT NULL, body text NOT NULL, depth integer NOT NULL DEFAULT 0 CHECK(depth BETWEEN 0 AND 64),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), score bigint NOT NULL DEFAULT 0 CHECK(score>=0),
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 edited_at timestamptz(3), deleted_at timestamptz(3),
 authored_problem_id uuid GENERATED ALWAYS AS (CASE WHEN problem_key LIKE 'authored:%' THEN substring(problem_key FROM 10)::uuid END) STORED REFERENCES authored_problem(id) ON DELETE RESTRICT,
 UNIQUE(user_id,request_id), UNIQUE(problem_key,id),
 FOREIGN KEY(problem_key,parent_id) REFERENCES community_comment(problem_key,id) ON DELETE RESTRICT,
 CONSTRAINT community_comment_key_check CHECK(problem_key ~ '^authored:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR problem_key=ANY(ARRAY['arena:arena-mind-the-gap','arena:arena-the-bubble-treaty','arena:arena-the-cosmic-kitchen','arena:arena-the-five-fold-collision','arena:arena-the-phantom-charge','arena:arena-the-string-that-answered-back','arena:arena-the-clock-in-the-racing-mirror','arena:arena-the-dodecahedron-conspiracy','arena:arena-the-gas-with-elbows','arena:arena-the-quantum-escape-room','arena:arena-the-three-way-wave-split','arena:arena-titans-double-take','arena:arena-a-grin-and-a-wiggle','arena:arena-an-atom-with-stage-fright','arena:arena-the-invisible-brake','arena:arena-the-bending-beam-riddle','arena:arena-the-capacitors-missing-energy','arena:arena-the-infinite-v']::text[])),
 CHECK((deleted_at IS NULL AND char_length(body) BETWEEN 1 AND 2000 AND octet_length(body)<=8000) OR (deleted_at IS NOT NULL AND body=''))
);
CREATE INDEX community_comment_newest_idx ON community_comment(problem_key,parent_id,created_at DESC,id DESC);
CREATE INDEX community_comment_top_idx ON community_comment(problem_key,parent_id,score DESC,created_at DESC,id DESC);
CREATE INDEX community_comment_authored_idx ON community_comment(authored_problem_id) WHERE authored_problem_id IS NOT NULL;
CREATE TABLE community_comment_like (
 comment_id uuid NOT NULL REFERENCES community_comment(id) ON DELETE RESTRICT,
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 PRIMARY KEY(comment_id,user_id)
);
CREATE TABLE community_comment_limit (
 bucket text PRIMARY KEY, minute timestamptz NOT NULL, requests integer NOT NULL CHECK(requests BETWEEN 1 AND 121),
 post_minute timestamptz NOT NULL, minute_posts integer NOT NULL DEFAULT 0 CHECK(minute_posts BETWEEN 0 AND 7),
 day date NOT NULL, posts integer NOT NULL DEFAULT 0 CHECK(posts BETWEEN 0 AND 51)
);
CREATE TABLE community_comment_spam (
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 body_hash text NOT NULL CHECK(body_hash ~ '^[0-9a-f]{64}$'), last_post timestamptz NOT NULL,
 PRIMARY KEY(user_id,body_hash)
);
CREATE FUNCTION community_comment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_depth integer;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Soft deletion required' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
  -- Account deletion anonymizes existing text via FK, preserving thread identity/history.
  -- Runtime is never granted UPDATE(user_id).
  IF OLD.user_id IS NOT NULL AND NEW.user_id IS NULL AND
   (NEW.id,NEW.problem_key,NEW.parent_id,NEW.request_id,NEW.depth,NEW.created_at,NEW.body,NEW.version,NEW.score,NEW.deleted_at,NEW.edited_at,NEW.updated_at) IS NOT DISTINCT FROM
   (OLD.id,OLD.problem_key,OLD.parent_id,OLD.request_id,OLD.depth,OLD.created_at,OLD.body,OLD.version,OLD.score,OLD.deleted_at,OLD.edited_at,OLD.updated_at) THEN RETURN NEW; END IF;
  IF (NEW.id,NEW.problem_key,NEW.user_id,NEW.parent_id,NEW.request_id,NEW.depth,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.problem_key,OLD.user_id,OLD.parent_id,OLD.request_id,OLD.depth,OLD.created_at) THEN RAISE EXCEPTION 'Comment identity is immutable' USING ERRCODE='23514'; END IF;
  IF NEW.score<>OLD.score THEN
   IF (NEW.body,NEW.version,NEW.deleted_at,NEW.edited_at,NEW.updated_at) IS DISTINCT FROM (OLD.body,OLD.version,OLD.deleted_at,OLD.edited_at,OLD.updated_at) THEN RAISE EXCEPTION 'Separate reactions from edits' USING ERRCODE='23514'; END IF;
   RETURN NEW;
  END IF;
  IF OLD.deleted_at IS NOT NULL OR OLD.version=2147483647 OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Comment conflict' USING ERRCODE='23514'; END IF;
  IF NEW.deleted_at IS NOT NULL THEN NEW.body:='';NEW.deleted_at:=clock_timestamp();NEW.edited_at:=OLD.edited_at;
  ELSE NEW.edited_at:=clock_timestamp(); END IF;
  NEW.updated_at:=clock_timestamp();RETURN NEW;
 END IF;
 IF NEW.user_id IS NULL OR NEW.version<>1 OR NEW.score<>0 OR NEW.deleted_at IS NOT NULL OR NEW.edited_at IS NOT NULL THEN RAISE EXCEPTION 'Invalid initial comment' USING ERRCODE='23514'; END IF;
 IF NEW.problem_key LIKE 'authored:%' THEN
  PERFORM 1 FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id AND r.problem_id=p.id WHERE p.id=substring(NEW.problem_key FROM 10)::uuid AND p.state='published' FOR SHARE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Public problem required' USING ERRCODE='23514'; END IF;
 END IF;
 IF NEW.parent_id IS NULL THEN NEW.depth:=0;
 ELSE
  SELECT depth INTO parent_depth FROM community_comment WHERE id=NEW.parent_id AND problem_key=NEW.problem_key FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parent must belong to this problem' USING ERRCODE='23514'; END IF;
  NEW.depth:=parent_depth+1;
 END IF;
 NEW.created_at:=clock_timestamp();NEW.updated_at:=NEW.created_at;RETURN NEW;
END $$;
CREATE TRIGGER community_comment_guard BEFORE INSERT OR UPDATE OR DELETE ON community_comment FOR EACH ROW EXECUTE FUNCTION community_comment_guard();
CREATE FUNCTION community_comment_like_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Reaction identity is immutable' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM community_comment WHERE id=NEW.comment_id AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Visible comment required' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER community_comment_like_guard BEFORE INSERT OR UPDATE ON community_comment_like FOR EACH ROW EXECUTE FUNCTION community_comment_like_guard();
CREATE FUNCTION community_comment_score() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='INSERT' THEN UPDATE community_comment SET score=score+1 WHERE id=NEW.comment_id; RETURN NEW;
 ELSE UPDATE community_comment SET score=score-1 WHERE id=OLD.comment_id; RETURN OLD; END IF;
END $$;
DO $$ DECLARE trusted_schema text:=current_schema(); BEGIN
 EXECUTE pg_catalog.format('ALTER FUNCTION %I.community_comment_score() SET search_path TO %I, pg_catalog, pg_temp',trusted_schema,trusted_schema);
END $$;
CREATE TRIGGER community_comment_score AFTER INSERT OR DELETE ON community_comment_like FOR EACH ROW EXECUTE FUNCTION community_comment_score();
REVOKE ALL ON community_comment,community_comment_like,community_comment_limit,community_comment_spam FROM PUBLIC;
REVOKE ALL ON FUNCTION community_comment_guard(),community_comment_like_guard(),community_comment_score() FROM PUBLIC;
