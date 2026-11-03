-- Disposable/reviewed rollback only. Never discard saved preferences implicitly.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM community_favorite) THEN RAISE EXCEPTION 'Saved favourites exist'; END IF;
END $$;
DROP INDEX community_completion_candidate;
DROP TABLE community_interaction_limit;
DROP TABLE community_favorite;
