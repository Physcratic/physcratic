-- Roll back application code without erasing saved checks. Populated DOWN is forbidden.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM practice_check_attempt) THEN RAISE EXCEPTION 'Retain practice checks: populated rollback is forbidden'; END IF;
END $$;
DROP TABLE practice_check_part;
DROP TABLE practice_check_attempt;
DROP TABLE practice_check_rate;
DROP FUNCTION practice_check_attempt_guard();
