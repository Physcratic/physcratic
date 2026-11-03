-- Additive after authored 0001-0006; independent of profiles/achievements.
CREATE TABLE community_problem_total (
 problem_key text PRIMARY KEY, favourites bigint NOT NULL DEFAULT 0 CHECK(favourites>=0)
);
CREATE TABLE community_favourite (
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 problem_key text NOT NULL,
 authored_problem_id uuid GENERATED ALWAYS AS (CASE WHEN problem_key LIKE 'authored:%' THEN substring(problem_key FROM 10)::uuid END) STORED REFERENCES authored_problem(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,problem_key),
 CONSTRAINT community_favourite_key_check CHECK(problem_key ~ '^authored:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR problem_key=ANY(ARRAY['arena:arena-mind-the-gap','arena:arena-the-bubble-treaty','arena:arena-the-cosmic-kitchen','arena:arena-the-five-fold-collision','arena:arena-the-phantom-charge','arena:arena-the-string-that-answered-back','arena:arena-the-clock-in-the-racing-mirror','arena:arena-the-dodecahedron-conspiracy','arena:arena-the-gas-with-elbows','arena:arena-the-quantum-escape-room','arena:arena-the-three-way-wave-split','arena:arena-titans-double-take','arena:arena-a-grin-and-a-wiggle','arena:arena-an-atom-with-stage-fright','arena:arena-the-invisible-brake','arena:arena-the-bending-beam-riddle','arena:arena-the-capacitors-missing-energy','arena:arena-the-infinite-v']::text[]))
);
CREATE INDEX community_favourite_problem_idx ON community_favourite(problem_key,user_id);
CREATE INDEX community_favourite_authored_idx ON community_favourite(authored_problem_id) WHERE authored_problem_id IS NOT NULL;
CREATE TABLE community_favourite_limit (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL, requests integer NOT NULL CHECK(requests BETWEEN 1 AND 61)
);
CREATE FUNCTION community_favourite_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Favourite identity is immutable' USING ERRCODE='23514'; END IF;
 IF NEW.problem_key LIKE 'authored:%' THEN
  PERFORM 1 FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id AND r.problem_id=p.id WHERE p.id=substring(NEW.problem_key FROM 10)::uuid AND p.state='published' FOR SHARE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Public problem required' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER community_favourite_guard BEFORE INSERT OR UPDATE ON community_favourite FOR EACH ROW EXECUTE FUNCTION community_favourite_guard();
-- Only trigger-derived deltas may change totals. Capture trusted operator search_path.
CREATE FUNCTION community_favourite_total() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO community_problem_total(problem_key,favourites) VALUES(NEW.problem_key,1)
   ON CONFLICT(problem_key) DO UPDATE SET favourites=community_problem_total.favourites+1;
  RETURN NEW;
 END IF;
 UPDATE community_problem_total SET favourites=favourites-1 WHERE problem_key=OLD.problem_key;
 RETURN OLD;
END $$;
-- Explicit pg_temp last prevents caller-created temporary relations shadowing owner tables.
DO $$ DECLARE trusted_schema text:=current_schema(); BEGIN
 EXECUTE pg_catalog.format('ALTER FUNCTION %I.community_favourite_total() SET search_path TO %I, pg_catalog, pg_temp',trusted_schema,trusted_schema);
END $$;
CREATE TRIGGER community_favourite_total AFTER INSERT OR DELETE ON community_favourite FOR EACH ROW EXECUTE FUNCTION community_favourite_total();
CREATE INDEX community_solve_scan_idx ON authored_attempt(revision_id,part_id,user_id)
 WHERE status='correct' AND assisted=false;
REVOKE ALL ON community_favourite,community_problem_total,community_favourite_limit FROM PUBLIC;
REVOKE ALL ON FUNCTION community_favourite_guard(),community_favourite_total() FROM PUBLIC;
