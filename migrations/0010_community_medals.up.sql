-- Additive; requires only the existing Better Auth user table. No automatic apply.
CREATE TABLE community_staff (user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE RESTRICT, role text NOT NULL CHECK(role IN ('admin','moderator','none')), reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 500), updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE community_staff_audit (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id text NOT NULL REFERENCES "user"(id),old_role text,new_role text NOT NULL,reason text NOT NULL,operator text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE FUNCTION community_immutable_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Immutable history' USING ERRCODE='23514'; END $$;
CREATE TRIGGER staff_audit_immutable BEFORE UPDATE OR DELETE ON community_staff_audit FOR EACH ROW EXECUTE FUNCTION community_immutable_audit();
CREATE FUNCTION community_staff_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Revoke by setting role none' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' AND NEW.user_id<>OLD.user_id THEN RAISE EXCEPTION 'Immutable identity' USING ERRCODE='23514'; END IF;
 NEW.updated_at:=clock_timestamp();
 INSERT INTO community_staff_audit(user_id,old_role,new_role,reason,operator) VALUES(NEW.user_id,CASE WHEN TG_OP='UPDATE' THEN OLD.role END,NEW.role,NEW.reason,session_user);
 RETURN NEW;
END $$;
CREATE TRIGGER staff_guard BEFORE INSERT OR UPDATE OR DELETE ON community_staff FOR EACH ROW EXECUTE FUNCTION community_staff_guard();
CREATE TABLE community_medal_claim (
 id uuid PRIMARY KEY,user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 competition text NOT NULL CHECK(competition IN ('IPhO','APhO','EuPhO','National')),award text NOT NULL CHECK(award IN ('gold','silver','bronze','honourable-mention')),
 year integer NOT NULL CHECK(year BETWEEN 1959 AND 2100),country text NOT NULL CHECK(length(country)<=2),competition_name text NOT NULL CHECK(length(competition_name)<=120),certificate_name text NOT NULL CHECK(length(certificate_name) BETWEEN 1 AND 160),
 CHECK(competition<>'National' OR (country ~ '^[A-Z]{2}$' AND length(competition_name)>0)),
 pathname text NOT NULL UNIQUE CHECK(pathname='community-medal-proof/'||id::text||'.pdf'),bytes integer NOT NULL CHECK(bytes BETWEEN 1 AND 5242880),sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'uploading' CHECK(state IN ('uploading','pending','approved','rejected','more-info','revoked')),
 version integer NOT NULL DEFAULT 1,reviewer_id text REFERENCES "user"(id),reason text NOT NULL DEFAULT '' CHECK(length(reason)<=1000),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX community_medal_owner ON community_medal_claim(user_id,created_at DESC,id);
CREATE INDEX community_medal_queue ON community_medal_claim(state,created_at,id);
CREATE UNIQUE INDEX community_medal_pending ON community_medal_claim(user_id,competition,year,(CASE WHEN competition='National' THEN country ELSE '' END),(CASE WHEN competition='National' THEN lower(competition_name) ELSE '' END)) WHERE state IN ('uploading','pending','more-info','approved');
CREATE TABLE community_medal_audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,claim_id uuid NOT NULL REFERENCES community_medal_claim(id),version integer NOT NULL,actor_id text NOT NULL REFERENCES "user"(id),state text NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(claim_id,version));
CREATE TRIGGER medal_audit_immutable BEFORE UPDATE OR DELETE ON community_medal_audit FOR EACH ROW EXECUTE FUNCTION community_immutable_audit();
CREATE FUNCTION community_medal_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Preserve claims' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'uploading' OR NEW.version<>1 OR NEW.reviewer_id IS NOT NULL OR NEW.reason<>'' THEN RAISE EXCEPTION 'Invalid initial state' USING ERRCODE='23514'; END IF;
 ELSE
  IF (NEW.id,NEW.user_id,NEW.competition,NEW.award,NEW.year,NEW.country,NEW.competition_name,NEW.certificate_name,NEW.pathname,NEW.bytes,NEW.sha256,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.user_id,OLD.competition,OLD.award,OLD.year,OLD.country,OLD.competition_name,OLD.certificate_name,OLD.pathname,OLD.bytes,OLD.sha256,OLD.created_at) OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Immutable submission or stale version' USING ERRCODE='23514'; END IF;
  IF OLD.state='uploading' AND NEW.state='pending' THEN
   IF NEW.reviewer_id IS NOT NULL OR NEW.reason<>'' THEN RAISE EXCEPTION 'Invalid upload completion' USING ERRCODE='23514'; END IF;
  ELSE
   IF NOT ((OLD.state IN ('pending','more-info') AND NEW.state IN ('approved','rejected','more-info') AND NEW.state<>OLD.state) OR (OLD.state='approved' AND NEW.state='revoked')) OR NEW.reviewer_id IS NULL OR NEW.reviewer_id=NEW.user_id OR length(trim(NEW.reason))=0 THEN RAISE EXCEPTION 'Invalid review' USING ERRCODE='23514'; END IF;
   IF NOT community_admin_locked(NEW.reviewer_id) THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  END IF;
 END IF;
 NEW.updated_at:=clock_timestamp(); RETURN NEW;
END $$;
CREATE TRIGGER medal_guard BEFORE INSERT OR UPDATE OR DELETE ON community_medal_claim FOR EACH ROW EXECUTE FUNCTION community_medal_guard();
CREATE FUNCTION community_medal_log() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO community_medal_audit(claim_id,version,actor_id,state,reason) VALUES(NEW.id,NEW.version,coalesce(NEW.reviewer_id,NEW.user_id),NEW.state,NEW.reason); RETURN NEW;
END $$;
CREATE TRIGGER medal_log AFTER INSERT OR UPDATE ON community_medal_claim FOR EACH ROW EXECUTE FUNCTION community_medal_log();
CREATE TABLE community_medal_limit(user_id text PRIMARY KEY REFERENCES "user"(id),minute timestamptz NOT NULL,requests integer NOT NULL,day date NOT NULL,uploads integer NOT NULL,CHECK(requests BETWEEN 1 AND 31),CHECK(uploads BETWEEN 0 AND 6));
REVOKE ALL ON community_staff,community_staff_audit,community_medal_claim,community_medal_audit,community_medal_limit FROM PUBLIC;
REVOKE ALL ON FUNCTION community_immutable_audit(),community_staff_guard(),community_medal_guard(),community_medal_log() FROM PUBLIC;
-- Locked read without granting runtime UPDATE on staff. Pin trusted migration search_path.
CREATE FUNCTION community_admin_locked(target text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$ BEGIN
 PERFORM 1 FROM community_staff WHERE user_id=target AND role='admin' FOR SHARE;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION community_admin_locked(text) FROM PUBLIC;
ALTER FUNCTION community_medal_log() SECURITY DEFINER;
ALTER FUNCTION community_medal_log() SET search_path FROM CURRENT;
