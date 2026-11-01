-- Disable submission writes first; never erase historical student work in rollback.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM authored_attempt) THEN RAISE EXCEPTION 'Retain authored attempts: populated rollback is forbidden'; END IF;
END $$;
DROP TABLE authored_attempt;
DROP TABLE authored_student_rate;
DROP FUNCTION authored_attempt_guard();
