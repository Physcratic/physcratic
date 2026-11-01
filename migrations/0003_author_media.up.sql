-- Explicit, additive migration after 0002. All physical blobs remain private.
CREATE TABLE author_media (
 id uuid PRIMARY KEY, problem_id uuid NOT NULL REFERENCES authored_problem(id) ON DELETE RESTRICT,
 purpose text NOT NULL CHECK(purpose IN ('statement-image','solution-image','statement-pdf','solution-pdf')),
 pathname text NOT NULL UNIQUE, filename text NOT NULL,
 media_type text NOT NULL CHECK(media_type IN ('image/png','image/jpeg','image/webp','application/pdf')),
 bytes integer NOT NULL CHECK(bytes>0 AND bytes<=3145728), sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','ready','deleting')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,problem_id,purpose),
 CHECK((purpose IN ('statement-pdf','solution-pdf'))=(media_type='application/pdf'))
);
CREATE INDEX author_media_problem_idx ON author_media(problem_id);
CREATE INDEX author_media_cleanup_idx ON author_media(state,created_at);
CREATE TABLE author_media_usage (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 day date NOT NULL, attempts integer NOT NULL CHECK(attempts>0 AND attempts<=31)
);
CREATE TABLE author_draft_media (
 problem_id uuid NOT NULL REFERENCES authored_draft(problem_id) ON DELETE CASCADE,
 media_id uuid NOT NULL, purpose text NOT NULL,
 PRIMARY KEY(problem_id,media_id),
 FOREIGN KEY(media_id,problem_id,purpose) REFERENCES author_media(id,problem_id,purpose) ON DELETE RESTRICT
);
CREATE INDEX author_draft_media_media_idx ON author_draft_media(media_id);
CREATE TABLE author_revision_media (
 revision_id uuid NOT NULL, problem_id uuid NOT NULL, media_id uuid NOT NULL, purpose text NOT NULL,
 PRIMARY KEY(revision_id,media_id),
 FOREIGN KEY(problem_id,revision_id) REFERENCES authored_revision(problem_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(media_id,problem_id,purpose) REFERENCES author_media(id,problem_id,purpose) ON DELETE RESTRICT
);
CREATE INDEX author_revision_media_media_idx ON author_revision_media(media_id);
CREATE TRIGGER author_revision_media_immutable BEFORE UPDATE OR DELETE ON author_revision_media FOR EACH ROW EXECUTE FUNCTION authored_immutable();
CREATE TRIGGER author_draft_media_no_update BEFORE UPDATE ON author_draft_media FOR EACH ROW EXECUTE FUNCTION authored_immutable();
CREATE TRIGGER author_revision_media_sealed BEFORE INSERT ON author_revision_media FOR EACH ROW EXECUTE FUNCTION authored_revision_sealed();
CREATE FUNCTION author_media_reference_ready() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_state text;
BEGIN
 SELECT state INTO current_state FROM author_media WHERE id=NEW.media_id AND problem_id=NEW.problem_id AND purpose=NEW.purpose FOR UPDATE;
 IF current_state IS DISTINCT FROM 'ready' THEN RAISE EXCEPTION 'Media is unavailable for reference'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER author_draft_media_ready BEFORE INSERT ON author_draft_media FOR EACH ROW EXECUTE FUNCTION author_media_reference_ready();
CREATE TRIGGER author_revision_media_ready BEFORE INSERT ON author_revision_media FOR EACH ROW EXECUTE FUNCTION author_media_reference_ready();
CREATE FUNCTION author_media_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.problem_id,NEW.purpose,NEW.pathname,NEW.filename,NEW.media_type,NEW.bytes,NEW.sha256) IS DISTINCT FROM ROW(OLD.id,OLD.problem_id,OLD.purpose,OLD.pathname,OLD.filename,OLD.media_type,OLD.bytes,OLD.sha256)
  THEN RAISE EXCEPTION 'Media identity and content are immutable'; END IF;
  IF (OLD.state='deleting' AND NEW.state<>'deleting') OR (OLD.state='ready' AND NEW.state='pending') THEN RAISE EXCEPTION 'Invalid media lifecycle transition'; END IF;
 END IF;
 IF TG_OP='DELETE' OR NEW.state='deleting' THEN
  IF EXISTS(SELECT 1 FROM author_draft_media WHERE media_id=OLD.id) OR EXISTS(SELECT 1 FROM author_revision_media WHERE media_id=OLD.id)
  THEN RAISE EXCEPTION 'Referenced media must be retained'; END IF;
  IF TG_OP='DELETE' AND OLD.state<>'deleting' THEN RAISE EXCEPTION 'Media must be retired before deletion'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER author_media_guard BEFORE UPDATE OR DELETE ON author_media FOR EACH ROW EXECUTE FUNCTION author_media_guard();
CREATE FUNCTION author_revision_media_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE matches boolean;
BEGIN
 SELECT r.xmin=m.xmin INTO matches FROM authored_revision r JOIN author_revision_media m ON m.revision_id=r.id WHERE m.revision_id=NEW.revision_id AND m.media_id=NEW.media_id;
 IF matches IS DISTINCT FROM true THEN RAISE EXCEPTION 'Media bindings must share the revision transaction'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER author_revision_media_transaction AFTER INSERT ON author_revision_media DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION author_revision_media_transaction();
-- Seal exactly all attachment/private-image references, so cleanup can never
-- overlook an object used by an immutable historical revision.
CREATE FUNCTION author_revision_media_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mismatch boolean;
BEGIN
 WITH document_refs AS (
  SELECT (a->>'id')::uuid AS id,a->>'purpose' AS purpose FROM jsonb_array_elements(coalesce(NEW.content->'attachments','[]'::jsonb)) a
  UNION
  SELECT (b #>> '{}')::uuid,'statement-image' FROM jsonb_path_query(NEW.content,'$.** ? (@.kind == "image").mediaId') b
  UNION
  SELECT (b->>'mediaId')::uuid,'solution-image' FROM authored_revision_private_part k
   CROSS JOIN LATERAL jsonb_array_elements(coalesce(k.data->'hints','[]'::jsonb)||coalesce(k.data->'solution','[]'::jsonb)) b
   WHERE k.revision_id=NEW.id AND b->>'kind'='image'
 ), bindings AS (SELECT media_id AS id,purpose FROM author_revision_media WHERE revision_id=NEW.id)
 SELECT EXISTS(SELECT * FROM document_refs EXCEPT SELECT * FROM bindings) OR EXISTS(SELECT * FROM bindings EXCEPT SELECT * FROM document_refs) INTO mismatch;
 IF mismatch THEN RAISE EXCEPTION 'Revision media bindings are incomplete'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER author_revision_media_complete BEFORE INSERT ON authored_revision FOR EACH ROW EXECUTE FUNCTION author_revision_media_complete();
