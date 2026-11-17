-- PROPOSAL ONLY. Separate owner approval of target, role and SHA-256 required.
-- Target: divine-mode-82940461 / br-quiet-dawn-b7m2zrt3 / neondb (PostgreSQL 18.7).
-- Preserve existing UPDATE(state,published_revision_id,updated_at) and Batch A.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
REVOKE UPDATE(id) ON TABLE public.authored_problem FROM physcratic_runtime_app;
COMMIT;
