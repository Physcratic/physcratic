-- Additive Phase 6C-A. No old solution content or historical attempt is changed.
CREATE TABLE authored_solution_permission (
 problem_id uuid NOT NULL, revision_id uuid NOT NULL, part_id uuid NOT NULL,
 approved_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 authorization_id uuid NOT NULL UNIQUE, version integer NOT NULL CHECK(version>0),
 enabled boolean NOT NULL DEFAULT false, expires_at timestamptz(3),
 updated_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(revision_id,part_id), UNIQUE(revision_id,part_id,authorization_id),
 FOREIGN KEY(problem_id,revision_id) REFERENCES authored_revision(problem_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(revision_id,part_id) REFERENCES authored_revision_part(revision_id,part_id) ON DELETE RESTRICT,
 CHECK(enabled OR expires_at IS NULL)
);
CREATE TABLE authored_solution_permission_media (
 revision_id uuid NOT NULL, part_id uuid NOT NULL, authorization_id uuid NOT NULL,
 media_id uuid NOT NULL, PRIMARY KEY(revision_id,part_id,media_id),
 FOREIGN KEY(revision_id,part_id,authorization_id) REFERENCES authored_solution_permission(revision_id,part_id,authorization_id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(revision_id,media_id) REFERENCES author_revision_media(revision_id,media_id) ON DELETE RESTRICT
);
CREATE TABLE authored_solution_reveal (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 problem_id uuid NOT NULL, revision_id uuid NOT NULL, part_id uuid NOT NULL,
 authorization_id uuid NOT NULL,
 policy text NOT NULL DEFAULT 'explicit-solution-v1' CHECK(policy='explicit-solution-v1'),
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(user_id,revision_id,part_id,authorization_id),
 FOREIGN KEY(problem_id,revision_id) REFERENCES authored_revision(problem_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(revision_id,part_id) REFERENCES authored_revision_part(revision_id,part_id) ON DELETE RESTRICT
);
-- The unique user/revision/part/generation index also serves assistance EXISTS.
CREATE INDEX authored_solution_reveal_authorization_idx ON authored_solution_reveal(authorization_id);
CREATE FUNCTION authored_solution_permission_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p authored_problem;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Revoke solution permissions rather than deleting them'; END IF;
 SELECT * INTO p FROM authored_problem WHERE id=NEW.problem_id FOR UPDATE;
 IF p.owner_id IS DISTINCT FROM NEW.approved_by THEN RAISE EXCEPTION 'Permission requires problem owner'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (NEW.problem_id,NEW.revision_id,NEW.part_id,NEW.approved_by) IS DISTINCT FROM (OLD.problem_id,OLD.revision_id,OLD.part_id,OLD.approved_by)
   OR OLD.version=2147483647 OR NEW.version<>OLD.version+1 OR NEW.authorization_id=OLD.authorization_id
  THEN RAISE EXCEPTION 'Permission requires a new authorization generation and version'; END IF;
 ELSE
  IF NEW.version<>1 THEN RAISE EXCEPTION 'Initial permission version must be one'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM authored_solution_reveal WHERE authorization_id=NEW.authorization_id) THEN RAISE EXCEPTION 'Do not reuse a revealed authorization generation'; END IF;
 IF NEW.enabled AND (p.state<>'published' OR p.published_revision_id IS DISTINCT FROM NEW.revision_id OR (NEW.expires_at IS NOT NULL AND NEW.expires_at<=clock_timestamp())) THEN RAISE EXCEPTION 'Permission requires current publication and future expiry'; END IF;
 NEW.updated_at:=clock_timestamp(); RETURN NEW;
END $$;
CREATE TRIGGER authored_solution_permission_guard BEFORE INSERT OR UPDATE OR DELETE ON authored_solution_permission FOR EACH ROW EXECUTE FUNCTION authored_solution_permission_guard();
CREATE FUNCTION authored_solution_media_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE perm authored_solution_permission; rid uuid; pid uuid; aid uuid; mid uuid;
BEGIN
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Replace permission media bindings'; END IF;
 IF TG_OP='DELETE' THEN rid:=OLD.revision_id;pid:=OLD.part_id;aid:=OLD.authorization_id;mid:=OLD.media_id;
 ELSE rid:=NEW.revision_id;pid:=NEW.part_id;aid:=NEW.authorization_id;mid:=NEW.media_id; END IF;
 -- Author operations always lock parent before permission; never acquire a student lock here.
 PERFORM 1 FROM authored_problem p JOIN authored_revision r ON r.problem_id=p.id WHERE r.id=rid FOR UPDATE OF p;
 SELECT * INTO perm FROM authored_solution_permission WHERE revision_id=rid AND part_id=pid FOR UPDATE;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF perm.enabled IS DISTINCT FROM true OR perm.authorization_id IS DISTINCT FROM aid THEN RAISE EXCEPTION 'Media requires active matching permission'; END IF;
 IF NOT EXISTS(SELECT 1 FROM author_revision_media rm JOIN author_media m ON m.id=rm.media_id AND m.problem_id=rm.problem_id AND m.purpose=rm.purpose
  WHERE rm.revision_id=rid AND rm.problem_id=perm.problem_id AND rm.media_id=mid AND m.state='ready' AND
   (rm.purpose='solution-pdf' OR (rm.purpose='solution-image' AND EXISTS(SELECT 1 FROM authored_revision_private_part k,
    LATERAL jsonb_array_elements(k.data->'solution') b WHERE k.revision_id=rid AND k.part_id=pid AND b->>'kind'='image' AND b->>'mediaId'=mid::text))))
 THEN RAISE EXCEPTION 'Media must belong to this revision and worked solution'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER authored_solution_media_guard BEFORE INSERT OR UPDATE OR DELETE ON authored_solution_permission_media FOR EACH ROW EXECUTE FUNCTION authored_solution_media_guard();
CREATE FUNCTION authored_solution_reveal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_revision uuid; perm authored_solution_permission;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Solution reveal records are immutable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('authored-student:'||NEW.user_id,6));
 SELECT published_revision_id INTO current_revision FROM authored_problem WHERE id=NEW.problem_id AND state='published' FOR SHARE;
 IF current_revision IS DISTINCT FROM NEW.revision_id THEN RAISE EXCEPTION 'Reveal requires current published revision'; END IF;
 SELECT * INTO perm FROM authored_solution_permission WHERE revision_id=NEW.revision_id AND part_id=NEW.part_id FOR SHARE;
 IF perm.enabled IS DISTINCT FROM true OR perm.authorization_id IS DISTINCT FROM NEW.authorization_id OR (perm.expires_at IS NOT NULL AND perm.expires_at<=clock_timestamp()) THEN RAISE EXCEPTION 'Reveal requires current explicit authorization'; END IF;
 NEW.created_at:=clock_timestamp(); RETURN NEW;
END $$;
CREATE TRIGGER authored_solution_reveal_guard BEFORE INSERT OR UPDATE OR DELETE ON authored_solution_reveal FOR EACH ROW EXECUTE FUNCTION authored_solution_reveal_guard();
ALTER TABLE authored_attempt DROP CONSTRAINT authored_attempt_assisted_check;
CREATE OR REPLACE FUNCTION authored_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_revision uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Authored attempts are immutable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('authored-student:'||NEW.user_id,6));
 SELECT published_revision_id INTO current_revision FROM authored_problem WHERE id=NEW.problem_id AND state='published' FOR SHARE;
 IF current_revision IS NULL OR current_revision<>NEW.revision_id THEN RAISE EXCEPTION 'Attempt requires the current published revision'; END IF;
 -- Conservative multipart policy: any committed reveal on this revision assists ALL later parts.
 -- This survives revocation/expiry; no historical attempt is rewritten. Never trust client flags.
 NEW.assisted:=EXISTS(SELECT 1 FROM authored_solution_reveal WHERE user_id=NEW.user_id AND revision_id=NEW.revision_id);
 RETURN NEW;
END $$;
