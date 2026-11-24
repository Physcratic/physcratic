-- Additive and empty on install. Apply in a reviewed transaction.
CREATE TABLE public.personal_problem_completion (
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  problem_key text NOT NULL,
  completed_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, problem_key),
  CONSTRAINT personal_problem_completion_key_check CHECK (
    length(problem_key) <= 128 AND (
      problem_key ~ '^arena:arena-[a-z0-9]+(-[a-z0-9]+)*$'
      OR problem_key ~ '^authored:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
  )
);
CREATE INDEX personal_problem_completion_history_idx
  ON public.personal_problem_completion (user_id, completed_at DESC, problem_key DESC);

CREATE TABLE public.personal_completion_write_limit (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  requests integer NOT NULL CHECK (requests BETWEEN 1 AND 61)
);

REVOKE ALL ON public.personal_problem_completion, public.personal_completion_write_limit FROM PUBLIC;
