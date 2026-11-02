-- Disposable rollback only. Disable exposure first; preserve saved preferences in production.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM community_badge_selection) THEN
    RAISE EXCEPTION 'Refusing to remove saved achievement selections' USING ERRCODE='55000';
  END IF;
END $$;
DROP TABLE community_achievement_write_limit;
DROP TABLE community_badge_selection;
DROP FUNCTION community_badge_selection_guard();
DROP FUNCTION community_achievement_progress(text);
DROP FUNCTION community_achievement_problem_solved(text,uuid);
DROP INDEX community_achievement_attempt_idx;
DROP INDEX community_achievement_author_idx;
