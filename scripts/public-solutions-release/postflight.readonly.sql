-- Run the preflight again too, comparing owners/ACLs/guard receipts to the retained before evidence.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';
SELECT id,sha256,source_commit,result FROM public.physcratic_production_migrations WHERE id='0020_authored_public_solutions';
SELECT conname,convalidated,pg_get_constraintdef(oid) AS definition FROM pg_constraint
WHERE conrelid='public.authored_revision'::regclass AND conname='authored_revision_solution_consent_check';
SELECT solution_policy,count(*) AS revisions,count(solution_consented_at) AS consent_timestamps FROM public.authored_revision GROUP BY solution_policy;
SELECT count(*) AS inconsistent_consent FROM public.authored_revision
WHERE (solution_policy='legacy-private-v1' AND solution_consented_at IS NOT NULL)
 OR (solution_policy='public-solutions-v1' AND (solution_consented_at IS NULL OR solution_consented_at<>published_at))
 OR solution_policy NOT IN ('legacy-private-v1','public-solutions-v1');
SELECT pg_get_functiondef('public.community_achievement_problem_solved(text,uuid)'::regprocedure) AS eligibility_definition,
 pg_get_functiondef('public.community_achievement_progress(text)'::regprocedure) AS progress_definition;
COMMIT;
