-- Additive groundwork. Ordinary Better Auth inserts omit both signup fields.
ALTER TABLE public."user"
  ADD COLUMN "profileSignupHandle" text,
  ADD COLUMN "profileSignupPolicyVersion" text,
  ADD CONSTRAINT user_profile_signup_pair CHECK (
    ("profileSignupHandle" IS NULL AND "profileSignupPolicyVersion" IS NULL)
    OR ("profileSignupHandle" IS NOT NULL AND "profileSignupPolicyVersion" IS NOT NULL
      AND char_length("profileSignupPolicyVersion") BETWEEN 1 AND 80)
  );

ALTER TABLE public.community_profile
  ADD COLUMN publication_basis text,
  ADD COLUMN publication_policy_version text,
  ADD COLUMN publication_recorded_at timestamptz,
  ADD COLUMN deactivated_at timestamptz,
  ADD CONSTRAINT community_profile_publication_record CHECK (
    (publication_basis IS NULL AND publication_policy_version IS NULL
      AND publication_recorded_at IS NULL AND deactivated_at IS NULL)
    OR (publication_basis IS NOT NULL AND publication_basis IN ('signup', 'legacy_acknowledgement')
      AND publication_policy_version IS NOT NULL AND char_length(publication_policy_version) BETWEEN 1 AND 80
      AND publication_recorded_at IS NOT NULL)
  );

-- Runs with the inserting role's existing B1 INSERT rights, inside Better Auth's
-- PostgreSQL signup transaction. The existing handle index arbitrates all claims.
CREATE FUNCTION public.community_profile_claim_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  INSERT INTO public.community_profile
    (user_id, handle, publication_basis, publication_policy_version, publication_recorded_at)
    VALUES (NEW.id, NEW."profileSignupHandle", 'signup', NEW."profileSignupPolicyVersion", clock_timestamp());
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION public.community_profile_claim_signup() FROM PUBLIC;
CREATE TRIGGER community_profile_claim_signup AFTER INSERT ON public."user"
  FOR EACH ROW WHEN (NEW."profileSignupHandle" IS NOT NULL)
  EXECUTE FUNCTION public.community_profile_claim_signup();

-- Acknowledgement can add a first record. A record or deactivation already
-- written cannot be replaced by edits, retries or a concurrent acknowledgement.
CREATE FUNCTION public.community_profile_guard_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF OLD.publication_basis IS NOT NULL AND
    (NEW.publication_basis, NEW.publication_policy_version, NEW.publication_recorded_at)
      IS DISTINCT FROM (OLD.publication_basis, OLD.publication_policy_version, OLD.publication_recorded_at)
  THEN
    RAISE EXCEPTION 'Profile publication evidence is immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD.publication_basis IS NULL AND NEW.publication_basis = 'signup' THEN
    RAISE EXCEPTION 'Signup evidence must be set at creation' USING ERRCODE = '23514';
  END IF;
  IF OLD.deactivated_at IS NOT NULL AND NEW.deactivated_at IS DISTINCT FROM OLD.deactivated_at THEN
    RAISE EXCEPTION 'Profile deactivation is permanent in this release' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION public.community_profile_guard_publication() FROM PUBLIC;
CREATE TRIGGER community_profile_guard_publication BEFORE UPDATE OF
  publication_basis, publication_policy_version, publication_recorded_at, deactivated_at
  ON public.community_profile FOR EACH ROW EXECUTE FUNCTION public.community_profile_guard_publication();
