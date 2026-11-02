-- Explicit operator apply after 0007 and existing authored migrations 0001-0006.
-- Independent of optional 0008/media readiness. No existing row/trigger is changed.
CREATE INDEX community_achievement_author_idx ON authored_problem(owner_id,id) WHERE state='published';
CREATE INDEX community_achievement_attempt_idx ON authored_attempt(user_id,problem_id,revision_id,part_id)
  WHERE status='correct' AND assisted=false;

CREATE FUNCTION community_achievement_problem_solved(target_user text,target_problem uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM authored_problem p JOIN authored_revision r
    ON r.id=p.published_revision_id AND r.problem_id=p.id
    WHERE p.id=target_problem AND p.state='published' AND p.owner_id<>target_user AND r.schema_version=1
      AND EXISTS(SELECT 1 FROM authored_revision_part rp WHERE rp.revision_id=r.id)
      AND NOT EXISTS(SELECT 1 FROM authored_revision_part rp WHERE rp.revision_id=r.id AND
        (rp.answer_mode NOT IN ('numeric','expression') OR NOT EXISTS(
          SELECT 1 FROM authored_attempt a WHERE a.user_id=target_user AND a.problem_id=p.id
            AND a.revision_id=r.id AND a.part_id=rp.part_id AND a.status='correct' AND a.assisted=false
            AND ((rp.answer_mode='numeric' AND a.engine_version='numeric-v1' AND a.reason='within-tolerance' AND a.answer->>'kind'='numeric')
              OR (rp.answer_mode='expression' AND a.engine_version='symbolic-v1' AND a.reason='symbolic-equivalent' AND a.answer->>'kind'='expression'))
        ))));
$$;

CREATE FUNCTION community_achievement_progress(target_user text)
RETURNS TABLE(author_count integer,solve_count integer) LANGUAGE plpgsql STABLE AS $$
DECLARE cursor_id uuid; next_id uuid; examined integer:=0; completed integer:=0; authored integer;
BEGIN
  SELECT count(*)::integer INTO authored FROM (
    SELECT p.id FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id AND r.problem_id=p.id
    WHERE p.owner_id=target_user AND p.state='published' ORDER BY p.id LIMIT 50
  ) publications;
  -- Loose index seeks skip repeated submissions rather than scanning raw attempt history.
  SELECT problem_id INTO cursor_id FROM authored_attempt WHERE user_id=target_user
    AND status='correct' AND assisted=false ORDER BY problem_id LIMIT 1;
  WHILE cursor_id IS NOT NULL LOOP
    examined:=examined+1;
    IF community_achievement_problem_solved(target_user,cursor_id) THEN completed:=completed+1; END IF;
    EXIT WHEN completed>=50;
    SELECT problem_id INTO next_id FROM authored_attempt WHERE user_id=target_user
      AND status='correct' AND assisted=false AND problem_id>cursor_id ORDER BY problem_id LIMIT 1;
    IF next_id IS NOT NULL AND examined>=2000 THEN
      -- Unknown is not zero. Author progress remains independently available.
      RETURN QUERY SELECT authored,NULL::integer; RETURN;
    END IF;
    cursor_id:=next_id;
  END LOOP;
  RETURN QUERY SELECT authored,completed;
END $$;

CREATE TABLE community_badge_selection (
  user_id text PRIMARY KEY REFERENCES community_profile(user_id) ON DELETE CASCADE,
  badge_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT community_badge_selection_ids_check CHECK((
    cardinality(badge_ids)<=2 AND (cardinality(badge_ids)=0 OR (array_ndims(badge_ids)=1 AND array_lower(badge_ids,1)=1))
    AND array_position(badge_ids,NULL) IS NULL
    AND (cardinality(badge_ids)<2 OR badge_ids[1]<>badge_ids[2])
    AND badge_ids <@ ARRAY['first-spark','problem-weaver','equation-architect','master-problem-setter','first-breakthrough','persistent-solver','olympiad-pathfinder']::text[]
  ) IS TRUE)
);
CREATE FUNCTION community_badge_selection_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE progress record; badge text; required integer; count_value integer;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.user_id,NEW.created_at) IS DISTINCT FROM (OLD.user_id,OLD.created_at) THEN
    RAISE EXCEPTION 'Showcase identity is immutable' USING ERRCODE='23514';
  END IF;
  IF cardinality(NEW.badge_ids)>0 THEN
    SELECT * INTO progress FROM community_achievement_progress(NEW.user_id);
    FOREACH badge IN ARRAY NEW.badge_ids LOOP
      required:=CASE badge WHEN 'first-spark' THEN 1 WHEN 'problem-weaver' THEN 5 WHEN 'equation-architect' THEN 15
        WHEN 'master-problem-setter' THEN 50 WHEN 'first-breakthrough' THEN 1 WHEN 'persistent-solver' THEN 10
        WHEN 'olympiad-pathfinder' THEN 50 ELSE NULL END;
      count_value:=CASE WHEN badge IN ('first-spark','problem-weaver','equation-architect','master-problem-setter')
        THEN progress.author_count ELSE progress.solve_count END;
      IF required IS NULL OR count_value IS NULL OR count_value<required THEN
        RAISE EXCEPTION 'Achievement is not currently eligible' USING ERRCODE='23514';
      END IF;
    END LOOP;
  END IF;
  NEW.updated_at:=clock_timestamp(); RETURN NEW;
END $$;
CREATE TRIGGER community_badge_selection_guard BEFORE INSERT OR UPDATE ON community_badge_selection
  FOR EACH ROW EXECUTE FUNCTION community_badge_selection_guard();
CREATE TABLE community_achievement_write_limit (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  requests integer NOT NULL CHECK(requests BETWEEN 1 AND 11)
);
REVOKE ALL ON community_badge_selection,community_achievement_write_limit FROM PUBLIC;
REVOKE ALL ON FUNCTION community_achievement_problem_solved(text,uuid),community_achievement_progress(text),community_badge_selection_guard() FROM PUBLIC;
-- Runtime SELECT/INSERT/UPDATE on new tables; SELECT on community_profile and four authored source tables.
-- Runtime EXECUTE on the two read-only eligibility functions, not the trigger function.
