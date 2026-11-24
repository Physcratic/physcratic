-- Disable the feature before rollback. Run this only in a single transaction.
LOCK TABLE public.personal_problem_completion, public.personal_completion_write_limit IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.personal_problem_completion) THEN
    RAISE EXCEPTION 'Preserve personal completion records and disable the feature';
  END IF;
END
$$;
DROP TABLE public.personal_completion_write_limit, public.personal_problem_completion;
