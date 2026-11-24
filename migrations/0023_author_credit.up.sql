-- Existing profiles retain their handles and start with no author credit consent.
ALTER TABLE public.community_profile
  ADD COLUMN author_credit_policy_version text,
  ADD COLUMN author_credit_acknowledged_at timestamptz,
  ADD COLUMN author_credit_withdrawn_at timestamptz,
  ADD CONSTRAINT community_profile_author_credit_evidence CHECK (
    (author_credit_policy_version IS NULL AND author_credit_acknowledged_at IS NULL
      AND author_credit_withdrawn_at IS NULL)
    OR (author_credit_policy_version IS NOT NULL AND author_credit_acknowledged_at IS NOT NULL
      AND char_length(author_credit_policy_version) BETWEEN 1 AND 80
      AND (author_credit_withdrawn_at IS NULL OR author_credit_withdrawn_at > author_credit_acknowledged_at))
  );
