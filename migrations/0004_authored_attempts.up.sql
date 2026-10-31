-- Explicit additive migration after 0003. No startup/build application hook.
CREATE TABLE authored_student_rate (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL, requests integer NOT NULL CHECK(requests BETWEEN 1 AND 61),
 submissions integer NOT NULL CHECK(submissions BETWEEN 0 AND 21)
);
CREATE TABLE authored_attempt (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 problem_id uuid NOT NULL, revision_id uuid NOT NULL, part_id uuid NOT NULL,
 idempotency_key uuid NOT NULL, answer jsonb NOT NULL,
 status text NOT NULL, reason text NOT NULL,
 engine_version text NOT NULL CHECK(engine_version IN ('numeric-v1','symbolic-v1')),
 attempt_number bigint NOT NULL CHECK(attempt_number > 0),
 spoiler_policy text NOT NULL DEFAULT 'no-reveal-v1' CHECK(spoiler_policy='no-reveal-v1'),
 assisted boolean NOT NULL DEFAULT false CHECK(assisted=false),
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 -- Ordinal uniqueness prevents duplicate numbering; it is not an attempt cap.
 UNIQUE(user_id,idempotency_key), UNIQUE(user_id,revision_id,part_id,attempt_number),
 FOREIGN KEY(problem_id,revision_id) REFERENCES authored_revision(problem_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(revision_id,part_id) REFERENCES authored_revision_part(revision_id,part_id) ON DELETE RESTRICT,
 CHECK((jsonb_typeof(answer)='object' AND octet_length(answer::text)<=20000 AND CASE answer->>'kind'
  WHEN 'numeric' THEN answer-ARRAY['kind','value','units']='{}'::jsonb AND jsonb_typeof(answer->'value')='number' AND abs((answer->>'value')::numeric)<=1.7976931348623157e308 AND jsonb_typeof(answer->'units')='string' AND length(answer->>'units')<=80
  WHEN 'expression' THEN answer-ARRAY['kind','expression']='{}'::jsonb AND jsonb_typeof(answer->'expression')='string' AND length(answer->>'expression') BETWEEN 1 AND 180
  WHEN 'manual' THEN answer-ARRAY['kind','text']='{}'::jsonb AND jsonb_typeof(answer->'text')='string' AND length(answer->>'text')<=4000
  ELSE false END) IS TRUE),
 CHECK((status='correct' AND reason IN ('within-tolerance','symbolic-equivalent'))
  OR (status='incorrect' AND reason IN ('outside-tolerance','symbolic-counterexample'))
  OR (status='needs-review' AND reason IN ('units-unsupported','units-mismatch','answer-mode-unsupported','key-unavailable','service-unavailable','symbolic-unsupported','symbolic-domain','symbolic-resource-limit','symbolic-inconclusive'))
  OR (status='ungraded' AND reason IN ('invalid-input','not-authorized','revision-unavailable','manual')))
);
CREATE INDEX authored_attempt_history_idx ON authored_attempt(user_id,created_at DESC,id DESC);
CREATE INDEX authored_attempt_problem_idx ON authored_attempt(user_id,problem_id,created_at DESC,id DESC);
CREATE INDEX authored_attempt_revision_idx ON authored_attempt(revision_id,part_id);
CREATE FUNCTION authored_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_revision uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Authored attempts are immutable'; END IF;
 SELECT published_revision_id INTO current_revision FROM authored_problem WHERE id=NEW.problem_id AND state='published' FOR SHARE;
 IF current_revision IS NULL OR current_revision<>NEW.revision_id THEN RAISE EXCEPTION 'Attempt requires the current published revision'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER authored_attempt_guard BEFORE INSERT OR UPDATE OR DELETE ON authored_attempt FOR EACH ROW EXECUTE FUNCTION authored_attempt_guard();
