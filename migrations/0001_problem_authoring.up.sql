-- Additive only. Run explicitly in a reviewed transaction, never automatically at build/start.
CREATE TABLE authored_problem (
 id uuid PRIMARY KEY, slug text NOT NULL UNIQUE,
 owner_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 state text NOT NULL DEFAULT 'draft', published_revision_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT authored_problem_state_check CHECK (state IN ('draft','published','archived')),
 CONSTRAINT authored_problem_slug_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug)<=120),
 CONSTRAINT authored_problem_publication_check CHECK (state<>'published' OR published_revision_id IS NOT NULL)
);
CREATE INDEX authored_problem_owner_idx ON authored_problem(owner_id);
CREATE TABLE authored_draft (
 problem_id uuid PRIMARY KEY REFERENCES authored_problem(id) ON DELETE CASCADE,
 version integer NOT NULL DEFAULT 1 CONSTRAINT authored_draft_version_check CHECK(version>0),
 content jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE authored_revision (
 id uuid PRIMARY KEY, problem_id uuid NOT NULL REFERENCES authored_problem(id) ON DELETE RESTRICT,
 number integer NOT NULL, schema_version integer NOT NULL DEFAULT 1, content jsonb NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT authored_revision_number_key UNIQUE(problem_id,number),
 CONSTRAINT authored_revision_problem_id_key UNIQUE(problem_id,id),
 CONSTRAINT authored_revision_version_check CHECK(number>0 AND schema_version=1)
);
ALTER TABLE authored_problem ADD CONSTRAINT authored_problem_revision_fk FOREIGN KEY(id,published_revision_id) REFERENCES authored_revision(problem_id,id);
CREATE TABLE authored_draft_private_part (
 problem_id uuid NOT NULL REFERENCES authored_draft(problem_id) ON DELETE CASCADE,
 part_id uuid NOT NULL, data jsonb NOT NULL, PRIMARY KEY(problem_id,part_id),
 CONSTRAINT authored_draft_private_identity_check CHECK((jsonb_typeof(data)='object' AND jsonb_typeof(data->'partId')='string' AND data->>'partId'=part_id::text) IS TRUE)
);
CREATE TABLE authored_revision_part (
 revision_id uuid NOT NULL REFERENCES authored_revision(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 part_id uuid NOT NULL, answer_mode text NOT NULL,
 PRIMARY KEY(revision_id,part_id), CONSTRAINT authored_revision_part_mode_key UNIQUE(revision_id,part_id,answer_mode),
 CONSTRAINT authored_revision_part_mode_check CHECK(answer_mode IN ('numeric','expression','manual'))
);
CREATE TABLE authored_revision_private_part (
 revision_id uuid NOT NULL, part_id uuid NOT NULL, answer_mode text NOT NULL, data jsonb NOT NULL,
 PRIMARY KEY(revision_id,part_id),
 CONSTRAINT authored_revision_private_part_fk FOREIGN KEY(revision_id,part_id,answer_mode) REFERENCES authored_revision_part(revision_id,part_id,answer_mode) DEFERRABLE INITIALLY DEFERRED,
 CONSTRAINT authored_revision_private_identity_check CHECK((jsonb_typeof(data)='object' AND jsonb_typeof(data->'partId')='string' AND data->>'partId'=part_id::text AND data ? 'key' AND jsonb_typeof(data->'key')='object' AND data->'key' ? 'kind' AND data->'key'->>'kind'=answer_mode) IS TRUE)
);
-- Every revision part must have exactly one matching private row at commit.
ALTER TABLE authored_revision_part ADD CONSTRAINT authored_revision_part_private_fk FOREIGN KEY(revision_id,part_id) REFERENCES authored_revision_private_part(revision_id,part_id) DEFERRABLE INITIALLY DEFERRED;
CREATE FUNCTION authored_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Published revision content is immutable'; END $$;
CREATE TRIGGER authored_revision_immutable BEFORE UPDATE OR DELETE ON authored_revision FOR EACH ROW EXECUTE FUNCTION authored_immutable();
CREATE TRIGGER authored_revision_part_immutable BEFORE UPDATE OR DELETE ON authored_revision_part FOR EACH ROW EXECUTE FUNCTION authored_immutable();
CREATE TRIGGER authored_revision_private_immutable BEFORE UPDATE OR DELETE ON authored_revision_private_part FOR EACH ROW EXECUTE FUNCTION authored_immutable();
-- Construct parts/keys first in the publication transaction; the revision insert seals them.
CREATE FUNCTION authored_revision_sealed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.revision_id::text,0));
 IF EXISTS(SELECT 1 FROM authored_revision WHERE id=NEW.revision_id) THEN
  RAISE EXCEPTION 'Cannot add parts or keys to an existing revision';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER authored_revision_part_sealed BEFORE INSERT ON authored_revision_part FOR EACH ROW EXECUTE FUNCTION authored_revision_sealed();
CREATE TRIGGER authored_revision_private_sealed BEFORE INSERT ON authored_revision_private_part FOR EACH ROW EXECUTE FUNCTION authored_revision_sealed();

-- A final revision seals the exact relational part map represented by its document.
CREATE FUNCTION authored_revision_parts_match() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected integer; actual integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text,0));
 SELECT count(*) INTO expected FROM jsonb_array_elements(NEW.content->'sections') s CROSS JOIN LATERAL jsonb_array_elements(s->'parts') p;
 SELECT count(*) INTO actual FROM authored_revision_part WHERE revision_id=NEW.id;
 IF expected=0 OR expected<>actual OR EXISTS (
  SELECT 1 FROM jsonb_array_elements(NEW.content->'sections') s CROSS JOIN LATERAL jsonb_array_elements(s->'parts') p
  WHERE NOT EXISTS (SELECT 1 FROM authored_revision_part r WHERE r.revision_id=NEW.id AND r.part_id=(p->>'id')::uuid AND r.answer_mode=p->>'answerMode')
 ) THEN RAISE EXCEPTION 'Revision document and relational parts disagree'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER authored_revision_parts_match BEFORE INSERT ON authored_revision FOR EACH ROW EXECUTE FUNCTION authored_revision_parts_match();

-- A concurrent transaction cannot attach rows prepared before a revision was sealed.
CREATE FUNCTION authored_revision_same_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE same_transaction boolean;
BEGIN
 EXECUTE format('SELECT r.xmin=c.xmin FROM authored_revision r JOIN %I c ON c.revision_id=r.id WHERE c.revision_id=$1 AND c.part_id=$2',TG_TABLE_NAME)
 INTO same_transaction USING NEW.revision_id,NEW.part_id;
 IF same_transaction IS DISTINCT FROM true THEN RAISE EXCEPTION 'Revision parts and keys must be created in the revision transaction'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER authored_revision_part_transaction AFTER INSERT ON authored_revision_part DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION authored_revision_same_transaction();
CREATE CONSTRAINT TRIGGER authored_revision_private_transaction AFTER INSERT ON authored_revision_private_part DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION authored_revision_same_transaction();
