-- DESTRUCTIVE. Disposable DB only, or separately approved recovery before authored data exists.
ALTER TABLE authored_problem DROP CONSTRAINT authored_problem_revision_fk;
ALTER TABLE authored_revision_part DROP CONSTRAINT authored_revision_part_private_fk;
DROP TABLE authored_revision_private_part;
DROP TABLE authored_revision_part;
DROP TABLE authored_draft_private_part;
DROP TABLE authored_revision;
DROP TABLE authored_draft;
DROP TABLE authored_problem;
DROP FUNCTION authored_revision_sealed();
DROP FUNCTION authored_immutable();
DROP FUNCTION authored_revision_parts_match();
DROP FUNCTION authored_revision_same_transaction();
