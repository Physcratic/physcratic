-- Roll back exposure first. Never erase permission/reveal audit or assisted history.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM authored_solution_permission) OR EXISTS(SELECT 1 FROM authored_solution_reveal) OR EXISTS(SELECT 1 FROM authored_attempt WHERE assisted)
 THEN RAISE EXCEPTION 'Retain solution permissions, reveal ledger and assisted attempts: populated rollback is forbidden'; END IF;
END $$;
CREATE OR REPLACE FUNCTION authored_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_revision uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Authored attempts are immutable'; END IF;
 SELECT published_revision_id INTO current_revision FROM authored_problem WHERE id=NEW.problem_id AND state='published' FOR SHARE;
 IF current_revision IS NULL OR current_revision<>NEW.revision_id THEN RAISE EXCEPTION 'Attempt requires the current published revision'; END IF;
 RETURN NEW;
END $$;
ALTER TABLE authored_attempt ADD CONSTRAINT authored_attempt_assisted_check CHECK(assisted=false);
DROP TABLE authored_solution_permission_media;
DROP TABLE authored_solution_reveal;
DROP TABLE authored_solution_permission;
DROP FUNCTION authored_solution_media_guard();
DROP FUNCTION authored_solution_reveal_guard();
DROP FUNCTION authored_solution_permission_guard();
