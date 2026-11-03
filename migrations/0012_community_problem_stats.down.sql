DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM community_favourite) THEN RAISE EXCEPTION 'Preserve saved favourites; disable flags instead'; END IF;
END $$;
DROP TABLE community_favourite;
DROP FUNCTION community_favourite_guard();
DROP FUNCTION community_favourite_total();
DROP TABLE community_problem_total;
DROP TABLE community_favourite_limit;
DROP INDEX community_solve_scan_idx;
