-- Requires 0009 and 0010. Preserve every existing selection and its ordering.
CREATE FUNCTION community_showcase_ids_valid(ids text[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT NOT EXISTS(SELECT 1 FROM unnest(ids) id WHERE NOT(id=ANY(ARRAY['first-spark','problem-weaver','equation-architect','master-problem-setter','first-breakthrough','persistent-solver','olympiad-pathfinder']::text[])) AND id !~ '^medal:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
$$;
ALTER TABLE community_badge_selection DROP CONSTRAINT community_badge_selection_ids_check;
ALTER TABLE community_badge_selection ADD CONSTRAINT community_badge_selection_ids_check CHECK((
    cardinality(badge_ids)<=2 AND (cardinality(badge_ids)=0 OR (array_ndims(badge_ids)=1 AND array_lower(badge_ids,1)=1))
    AND array_position(badge_ids,NULL) IS NULL
    AND (cardinality(badge_ids)<2 OR badge_ids[1]<>badge_ids[2])
    AND community_showcase_ids_valid(badge_ids)
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
      IF badge ~ '^medal:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        PERFORM 1 FROM community_medal_claim WHERE id=substring(badge FROM 7)::uuid AND user_id=NEW.user_id AND state='approved' FOR SHARE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Medal is not currently eligible' USING ERRCODE='23514'; END IF;
        CONTINUE;
      END IF;
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
CREATE VIEW community_approved_medal WITH (security_invoker=true) AS
 SELECT 'medal:'||id::text AS id,user_id,competition,award,year,country,competition_name AS "competitionName"
 FROM community_medal_claim WHERE state='approved';
REVOKE ALL ON community_approved_medal FROM PUBLIC;
REVOKE ALL ON FUNCTION community_showcase_ids_valid(text[]) FROM PUBLIC;
