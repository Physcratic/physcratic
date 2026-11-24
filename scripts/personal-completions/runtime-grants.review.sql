-- Proposal only. Requires separate approval of the exact target, LOGIN and migration.
GRANT SELECT, DELETE ON public.personal_problem_completion TO :"runtime_role";
GRANT INSERT (user_id, problem_key) ON public.personal_problem_completion TO :"runtime_role";
GRANT SELECT, INSERT ON public.personal_completion_write_limit TO :"runtime_role";
GRANT UPDATE (window_start, requests) ON public.personal_completion_write_limit TO :"runtime_role";
