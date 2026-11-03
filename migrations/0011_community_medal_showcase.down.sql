DO $$ BEGIN IF EXISTS(SELECT 1 FROM community_badge_selection s,unnest(s.badge_ids) b WHERE b LIKE 'medal:%') THEN RAISE EXCEPTION 'Preserve medal selections'; END IF; END $$;
DROP VIEW community_approved_medal;
ALTER TABLE community_badge_selection DROP CONSTRAINT community_badge_selection_ids_check;
ALTER TABLE community_badge_selection ADD CONSTRAINT community_badge_selection_ids_check CHECK((
    cardinality(badge_ids)<=2 AND (cardinality(badge_ids)=0 OR (array_ndims(badge_ids)=1 AND array_lower(badge_ids,1)=1))
    AND array_position(badge_ids,NULL) IS NULL
    AND (cardinality(badge_ids)<2 OR badge_ids[1]<>badge_ids[2])
    AND badge_ids <@ ARRAY['first-spark','problem-weaver','equation-architect','master-problem-setter','first-breakthrough','persistent-solver','olympiad-pathfinder']::text[]
  ) IS TRUE);
CREATE OR REPLACE FUNCTION community_badge_selection_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
DROP FUNCTION community_showcase_ids_valid(text[]);
