-- Requires exposure OFF. Keep all recorded awards, including revoked awards.
LOCK TABLE community_external_medal IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM community_external_medal) THEN
    RAISE EXCEPTION 'Preserve external medal verification history';
  END IF;
END $$;
DROP TRIGGER community_medal_external_slot_guard ON community_medal_claim;
DROP FUNCTION community_medal_external_slot_guard();
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
ALTER FUNCTION community_badge_selection_guard() SECURITY INVOKER;
ALTER FUNCTION community_badge_selection_guard() RESET search_path;
DROP FUNCTION community_external_medal_revoke(uuid,text);
DROP FUNCTION community_external_medal_award(text,text,text,integer,text,text,text);
DROP FUNCTION community_external_medal_recipient(text,text);
DROP VIEW community_external_approved_medal;
DROP TABLE community_external_medal_audit,community_external_medal;
