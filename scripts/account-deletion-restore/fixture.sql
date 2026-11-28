SET ROLE restore_owner;
SET search_path = public, pg_catalog;
INSERT INTO account_deletion_policy VALUES (
  true, true, 'Synthetic erasure', 'Synthetic basis', 'Synthetic operator',
  'Synthetic access', 'Synthetic review', 'Synthetic disposal',
  interval '1 day', interval '1 day', interval '1 hour', interval '1 day',
  'TEST-ONLY', clock_timestamp()
);
INSERT INTO "user"(id, name, email, "emailVerified", "createdAt", "updatedAt")
SELECT id, id, id || '@example.invalid', true, '2026-01-01', '2026-01-01'
FROM (VALUES ('synthetic-restore-a'), ('synthetic-restore-b')) AS actors(id);
INSERT INTO account(id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
SELECT 'fixture-account-' || id, id, 'credential', id, 'NONFUNCTIONAL-HASH', now(), now()
FROM "user" WHERE id LIKE 'synthetic-restore-%';
INSERT INTO session(id, "userId", token, "createdAt", "updatedAt", "expiresAt")
SELECT 'fixture-session-' || id, id, 'EXPIRED-' || id, now() - interval '1 day', now() - interval '1 day', now() - interval '1 hour'
FROM "user" WHERE id LIKE 'synthetic-restore-%';
INSERT INTO community_profile(user_id, handle, bio)
VALUES ('synthetic-restore-a', 'synthetic_restore_a', 'Private synthetic profile A'),
       ('synthetic-restore-b', 'synthetic_restore_b', 'Private synthetic profile B');
\if :with_completions
INSERT INTO personal_problem_completion(user_id, problem_key)
VALUES ('synthetic-restore-a', 'arena:arena-mind-the-gap'), ('synthetic-restore-b', 'arena:arena-mind-the-gap');
INSERT INTO personal_completion_write_limit VALUES ('synthetic-restore-a', now(), 1), ('synthetic-restore-b', now(), 2);
\endif
INSERT INTO verification(id, identifier, value, "expiresAt", "createdAt", "updatedAt")
VALUES ('fixture-verification-a', 'synthetic-restore-a@example.invalid', 'NONFUNCTIONAL-VERIFICATION', now()-interval '1 hour', now(), now());
INSERT INTO coaching_inquiry(id, pathway, audience, current_level, goals, contact)
VALUES ('60000000-0000-4000-8000-000000000001', 'Synthetic', 'Synthetic', 'Synthetic', 'Reviewed fixture', 'synthetic-restore-a@example.invalid'),
       ('60000000-0000-4000-8000-000000000002', 'Synthetic', 'Synthetic', 'Synthetic', 'Unrelated fixture', 'synthetic-restore-b@example.invalid');
INSERT INTO account_deletion_evidence(subject_id, source_relation, source_key, source_digest,
  purpose, necessity, legal_basis, responsible_operator, review_criteria, disposal_criteria,
  review_at, expires_at, created_by, approved_by, approved_at)
SELECT 'synthetic-restore-a', relation_name, record_key, digest, 'erase',
 'Synthetic reviewed necessity', 'Synthetic legal basis', 'Synthetic operator',
 'Synthetic review criteria', 'Synthetic disposal criteria',
 now()+interval '1 hour', now()+interval '2 hours', 'fixture-reviewer-a', 'fixture-reviewer-b', now()
FROM account_deletion_inventory('synthetic-restore-a') WHERE relation_name='coaching_inquiry';

BEGIN;
INSERT INTO authored_problem(id, slug, owner_id)
VALUES ('00000000-0000-4000-8000-000000000001','licensed','synthetic-restore-a'),
       ('00000000-0000-4000-8000-000000000002','stale-rights','synthetic-restore-a'),
       ('00000000-0000-4000-8000-000000000003','other-author','synthetic-restore-b'),
       ('00000000-0000-4000-8000-000000000004','private-draft','synthetic-restore-a');
CREATE TEMP TABLE fixture_revisions AS
SELECT lpad(n::text, 12, '0') AS suffix,
  ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid AS problem,
  ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid AS revision,
  ('20000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid AS part, 1 AS version
FROM generate_series(1,3) AS n
UNION ALL SELECT '000000000005', '00000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005', 2;
INSERT INTO authored_revision_part SELECT revision, part, 'numeric' FROM fixture_revisions;
INSERT INTO authored_revision_private_part
SELECT revision, part, 'numeric', jsonb_build_object('partId', part, 'key', '{"kind":"numeric"}'::jsonb)
FROM fixture_revisions;
INSERT INTO authored_revision(id, problem_id, number, content)
SELECT revision, problem, version, jsonb_build_object('sections', jsonb_build_array(
  jsonb_build_object('parts', jsonb_build_array(jsonb_build_object('id', part, 'answerMode', 'numeric')))))
FROM fixture_revisions;
UPDATE authored_problem p SET state='published', published_revision_id=r.revision
FROM fixture_revisions r WHERE p.id=r.problem AND r.suffix<>'000000000002';
DROP TABLE fixture_revisions;
COMMIT;
INSERT INTO account_deletion_publication(problem_id, continuing_display_authorized, rights_basis, review_reference, reviewed_revision_id)
VALUES ('00000000-0000-4000-8000-000000000001', true, 'Existing synthetic licence', 'TEST-RIGHTS-1', '10000000-0000-4000-8000-000000000001'),
       ('00000000-0000-4000-8000-000000000002', true, 'Existing synthetic licence', 'TEST-RIGHTS-2', '10000000-0000-4000-8000-000000000002');

INSERT INTO author_media(id, problem_id, purpose, pathname, filename, media_type, bytes, sha256, state)
VALUES ('30000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004',
        'statement-image','author-media/synthetic-restore/pending.png','private.png','image/png',1,repeat('a',64),'ready');
SELECT set_config('physcratic.private_upload_token', repeat('a',64), false);
INSERT INTO solution_evidence(id, "userId", pathname, filename, "mediaType", bytes, sha256)
VALUES ('40000000-0000-4000-8000-000000000001', 'synthetic-restore-a',
        'solution-evidence/synthetic-restore/held.png', 'held.png', 'image/png', 1, repeat('a',64));
SELECT set_config('physcratic.private_upload_token', '', false);
WITH receipt AS (
  INSERT INTO account_deletion_receipt_store(nonce, actor_tag, expires_at)
  VALUES (repeat('b',64), 'unrelated-tag', now()+interval '1 day') RETURNING id
)
INSERT INTO account_deletion_outbox(deletion_id, provider, pathname, state, attempts, lease_token, lease_until)
SELECT id, 'author', 'author-media/synthetic-restore/unrelated.png', 'leased', 2,
  '50000000-0000-4000-8000-000000000001', now()+interval '1 hour' FROM receipt;

CREATE TABLE physcratic_production_migrations (id text PRIMARY KEY, sha256 text NOT NULL, result text NOT NULL);
-- These are fixture metadata. The fixture installs the actual migrations before seeding.
INSERT INTO physcratic_production_migrations VALUES
 ('0018_account_deletion', '378ff9140a5eab9d62c70505eb764ad1f621ebe26f6d840c62826aee00d61cda', 'verified'),
 ('0026_account_deletion_blockers', '3b904c1eb01fc75e5446744acc90474cdbe4aba62c6dffc95b9f7c35bfc6c78a', 'verified');
