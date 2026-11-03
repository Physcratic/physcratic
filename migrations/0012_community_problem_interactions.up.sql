-- Operator controlled. Independent of optional profile/medal schema.
CREATE TABLE community_favorite (
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 problem_key text NOT NULL CHECK (length(problem_key)<=160 AND
   (problem_key ~ '^arena:[a-z0-9][a-z0-9-]*$' OR problem_key ~ '^authored:[0-9a-f-]{36}$')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,problem_key)
);
CREATE INDEX community_favorite_problem ON community_favorite(problem_key,user_id);
CREATE TABLE community_interaction_limit (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL, requests integer NOT NULL CHECK(requests BETWEEN 1 AND 31)
);
CREATE INDEX community_completion_candidate ON authored_attempt(problem_id,revision_id,user_id,part_id)
 WHERE status='correct' AND assisted=false;
