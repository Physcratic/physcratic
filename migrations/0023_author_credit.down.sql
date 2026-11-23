-- Run in a single transaction on an unused installation. Preserve recorded consent.
LOCK TABLE public.community_profile IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.community_profile WHERE author_credit_acknowledged_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Preserve author credit evidence and disable the feature';
  END IF;
END
$$;
ALTER TABLE public.community_profile
  DROP CONSTRAINT community_profile_author_credit_evidence,
  DROP COLUMN author_credit_policy_version,
  DROP COLUMN author_credit_acknowledged_at,
  DROP COLUMN author_credit_withdrawn_at;
