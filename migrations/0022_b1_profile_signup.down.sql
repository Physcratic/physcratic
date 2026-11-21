-- Disposable rollback only. Preserve claims and publication evidence after use.
LOCK TABLE public."user", public.community_profile IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public."user" WHERE "profileSignupHandle" IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.community_profile WHERE publication_basis IS NOT NULL)
  THEN
    RAISE EXCEPTION 'Preserve B1 publication records and disable exposure instead';
  END IF;
END
$$;

DROP TRIGGER community_profile_guard_publication ON public.community_profile;
DROP FUNCTION public.community_profile_guard_publication();
DROP TRIGGER community_profile_claim_signup ON public."user";
DROP FUNCTION public.community_profile_claim_signup();
ALTER TABLE public.community_profile
  DROP CONSTRAINT community_profile_publication_record,
  DROP COLUMN publication_basis,
  DROP COLUMN publication_policy_version,
  DROP COLUMN publication_recorded_at,
  DROP COLUMN deactivated_at;
ALTER TABLE public."user"
  DROP CONSTRAINT user_profile_signup_pair,
  DROP COLUMN "profileSignupHandle",
  DROP COLUMN "profileSignupPolicyVersion";
