-- Additive after 0012. Replaces the fixed list of 18 Arena favourite keys with a pattern, so a new Arena problem
-- no longer needs a new migration before it can be favourited. The API still accepts only keys in lib/arena/index.json, so the
-- pattern is a shape check, not the catalogue gate. authored:<uuid> keys keep their exact pattern and trigger guard.
-- Every key the old list allowed matches the pattern, so existing rows stay valid. No data is written.
LOCK TABLE community_favourite IN ACCESS EXCLUSIVE MODE;
ALTER TABLE community_favourite DROP CONSTRAINT community_favourite_key_check;
ALTER TABLE community_favourite ADD CONSTRAINT community_favourite_key_check CHECK(
 problem_key ~ '^authored:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 OR problem_key ~ '^arena:arena-[a-z0-9]+(-[a-z0-9]+)*$'
);
