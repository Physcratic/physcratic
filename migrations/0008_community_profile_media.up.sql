-- Explicit operator apply after 0007. COMMUNITY_PROFILE_MEDIA_ENABLED defaults OFF.
CREATE TABLE community_profile_media (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES community_profile(user_id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK(kind IN ('avatar','banner')),
  pathname text NOT NULL UNIQUE CHECK(pathname='community-profile-media/'||id::text||'.webp'),
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','active','retired','deleting')),
  bytes integer NOT NULL CHECK(bytes BETWEEN 1 AND 1048576),
  delete_after timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '1 hour'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX community_profile_media_active ON community_profile_media(user_id,kind) WHERE state='active';
CREATE INDEX community_profile_media_owner ON community_profile_media(user_id,created_at);
CREATE FUNCTION community_profile_media_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.state<>'deleting' THEN RAISE EXCEPTION 'Retire media before removing registry' USING ERRCODE='23514'; END IF;
    RETURN OLD;
  END IF;
  IF (NEW.id,NEW.user_id,NEW.kind,NEW.pathname,NEW.bytes,NEW.created_at)
    IS DISTINCT FROM (OLD.id,OLD.user_id,OLD.kind,OLD.pathname,OLD.bytes,OLD.created_at) THEN
    RAISE EXCEPTION 'Profile media identity is immutable' USING ERRCODE='23514';
  END IF;
  IF NOT ((OLD.state='pending' AND NEW.state IN ('active','retired','deleting')) OR
    (OLD.state='active' AND NEW.state='retired') OR
    (OLD.state='retired' AND NEW.state='deleting') OR
    (OLD.state='deleting' AND NEW.state='retired')) THEN
    RAISE EXCEPTION 'Invalid profile media transition' USING ERRCODE='23514';
  END IF;
  NEW.updated_at := clock_timestamp(); RETURN NEW;
END $$;
CREATE TRIGGER community_profile_media_guard BEFORE UPDATE OR DELETE ON community_profile_media
  FOR EACH ROW EXECUTE FUNCTION community_profile_media_guard();
CREATE TABLE community_profile_media_limit (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  minute_start timestamptz NOT NULL,
  requests integer NOT NULL CHECK(requests BETWEEN 1 AND 6),
  day_start timestamptz NOT NULL,
  uploads integer NOT NULL CHECK(uploads BETWEEN 0 AND 21)
);
REVOKE ALL ON community_profile_media,community_profile_media_limit FROM PUBLIC;
REVOKE ALL ON FUNCTION community_profile_media_guard() FROM PUBLIC;
-- Grant runtime SELECT,INSERT,UPDATE,DELETE on media; SELECT,INSERT,UPDATE on limit.
