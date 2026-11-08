-- Intentionally retain security hardening during rollback. No unsafe restoration,
-- ownership/ACL changes, history deletion or production exposure is permitted.
-- Application rollback uses default-off gates. Up can be safely reapplied after
-- this no-op down in a disposable up/down/up verification.
DO $$ BEGIN RAISE NOTICE '0015 security hardening retained; no data or privileges changed'; END $$;
