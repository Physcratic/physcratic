DO $$ BEGIN IF EXISTS(SELECT 1 FROM community_comment) THEN RAISE EXCEPTION 'Preserve discussion history; disable flags instead'; END IF; END $$;
DROP TABLE community_comment_like;
DROP TABLE community_comment;
DROP TABLE community_comment_limit;
DROP TABLE community_comment_spam;
DROP FUNCTION community_comment_guard();
DROP FUNCTION community_comment_like_guard();
DROP FUNCTION community_comment_score();
