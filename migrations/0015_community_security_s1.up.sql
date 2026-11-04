-- Requires 0010. Correct existing routines in place: preserve OIDs, owners and ACLs.
-- Never install from an untrusted schema. No data, role assignment or grant changes.
DO $migration$
DECLARE trusted_schema text := pg_catalog.current_schema();
BEGIN
 IF pg_catalog.to_regprocedure(pg_catalog.format('%I.community_admin_locked(text)',trusted_schema)) IS NULL
 OR pg_catalog.to_regprocedure(pg_catalog.format('%I.community_medal_log()',trusted_schema)) IS NULL THEN
  RAISE EXCEPTION '0015 requires installed 0010 routines in the selected trusted schema';
 END IF;
 EXECUTE pg_catalog.format($definition$
  CREATE OR REPLACE FUNCTION %1$I.community_admin_locked(target text) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO %1$I, pg_catalog, pg_temp AS $body$
  BEGIN
   PERFORM 1 FROM %1$I.community_staff WHERE user_id=target AND role='admin' FOR SHARE;
   RETURN FOUND;
  END $body$
 $definition$,trusted_schema);
 EXECUTE pg_catalog.format($definition$
  CREATE OR REPLACE FUNCTION %1$I.community_medal_log() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO %1$I, pg_catalog, pg_temp AS $body$
  BEGIN
   INSERT INTO %1$I.community_medal_audit(claim_id,version,actor_id,state,reason)
   VALUES(NEW.id,NEW.version,coalesce(NEW.reviewer_id,NEW.user_id),NEW.state,NEW.reason);
   RETURN NEW;
  END $body$
 $definition$,trusted_schema);
END $migration$;
