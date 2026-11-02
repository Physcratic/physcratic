DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM community_medal_claim) OR EXISTS(SELECT 1 FROM community_staff_audit) THEN RAISE EXCEPTION 'Refusing to remove verification history'; END IF;
END $$;
DROP TABLE community_medal_limit,community_medal_audit,community_medal_claim,community_staff_audit,community_staff;
DROP FUNCTION community_medal_log(),community_medal_guard(),community_staff_guard(),community_immutable_audit();

DROP FUNCTION community_admin_locked(text);
