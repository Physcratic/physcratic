-- Additive, explicitly installed only. No application startup/build migration.
CREATE TABLE practice_check_rate (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL,
 requests integer NOT NULL CHECK(requests BETWEEN 1 AND 61),
 submissions integer NOT NULL CHECK(submissions BETWEEN 0 AND 21)
);
CREATE TABLE practice_check_attempt (
 id uuid PRIMARY KEY,
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN ('practice','arena')),
 problem_id text NOT NULL CHECK(problem_id ~ '^[a-z]+(-[a-z]+)*$' AND length(problem_id)<=100),
 version text NOT NULL CHECK(version ~ '^[a-f0-9]{64}$'),
 idempotency_key uuid NOT NULL,
 answers jsonb NOT NULL CHECK(jsonb_typeof(answers)='array' AND jsonb_array_length(answers) BETWEEN 1 AND 64 AND octet_length(answers::text)<=100000),
 results jsonb NOT NULL CHECK(jsonb_typeof(results)='array' AND jsonb_array_length(results) BETWEEN 1 AND 64 AND octet_length(results::text)<=100000),
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(user_id,idempotency_key),
 UNIQUE(id,user_id,kind,problem_id,version)
);
CREATE INDEX practice_check_owner_time ON practice_check_attempt(user_id,created_at DESC,id DESC);
CREATE INDEX practice_check_selection ON practice_check_attempt(user_id,kind,problem_id,version,created_at);
CREATE TABLE practice_check_part (
 user_id text NOT NULL,
 kind text NOT NULL,
 problem_id text NOT NULL,
 version text NOT NULL,
 part_id text NOT NULL CHECK(part_id ~ '^[a-z0-9]+([.-][a-z0-9]+)*$' AND length(part_id)<=100),
 correct boolean NOT NULL,
 last_attempt_id uuid NOT NULL,
 checked_at timestamptz(3) NOT NULL,
 PRIMARY KEY(user_id,kind,problem_id,version,part_id),
 FOREIGN KEY(last_attempt_id,user_id,kind,problem_id,version) REFERENCES practice_check_attempt(id,user_id,kind,problem_id,version) ON DELETE RESTRICT
);
CREATE FUNCTION practice_check_attempt_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 RAISE EXCEPTION 'Practice checks are immutable';
END $$;
REVOKE ALL ON FUNCTION practice_check_attempt_guard() FROM PUBLIC;
CREATE TRIGGER practice_check_attempt_guard BEFORE UPDATE OR DELETE ON practice_check_attempt FOR EACH ROW EXECUTE FUNCTION practice_check_attempt_guard();
