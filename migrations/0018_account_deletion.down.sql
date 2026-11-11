-- Empty-install rollback only. Once an erasure/review/publication decision exists,
-- disable exposure and use reviewed recovery; never resurrect erased identities.
DO $$
DECLARE item record;
BEGIN
 IF EXISTS(SELECT 1 FROM account_deletion_receipt_store) OR EXISTS(SELECT 1 FROM account_deletion_outbox)
 OR EXISTS(SELECT 1 FROM account_deletion_evidence) OR EXISTS(SELECT 1 FROM account_deletion_request)
 OR EXISTS(SELECT 1 FROM account_deletion_publication)
 THEN RAISE EXCEPTION 'Populated account deletion requires reviewed recovery';END IF;
 -- CREATE OR REPLACE restores bodies/settings while retaining original owner and ACL.
 FOR item IN SELECT definition FROM account_deletion_guard_backup LOOP EXECUTE item.definition;END LOOP;
 FOR item IN SELECT t.tgname,t.tgrelid::regclass AS relation FROM pg_trigger t
 JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname=current_schema() AND p.proname LIKE 'account_deletion_%'
 LOOP EXECUTE format('DROP TRIGGER %I ON %s',item.tgname,item.relation);END LOOP;
 DELETE FROM "user" WHERE id='__physcratic_deleted_principal_v1__';
 FOR item IN SELECT p.oid::regprocedure AS routine FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname=current_schema() AND p.proname LIKE 'account_deletion_%'
 LOOP EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE',item.routine);END LOOP;
 FOR item IN SELECT c.oid::regclass AS relation FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname=current_schema() AND c.relkind='r' AND c.relname LIKE 'account_deletion_%'
 LOOP EXECUTE format('DROP TABLE %s CASCADE',item.relation);END LOOP;
END $$;
