-- Explicit operator apply only. Keep COMMUNITY_PROFILES_ENABLED disabled until installed/granted.
-- Does not alter Better Auth or any existing table, nor initialize/publish existing accounts.
CREATE TABLE community_profile (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  handle text NOT NULL,
  display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name)<=80),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio)<=500),
  education_level text NOT NULL DEFAULT 'prefer-not-to-say'
    CHECK (education_level IN ('high-school','university','other','prefer-not-to-say')),
  favorite_topic_ids text[] NOT NULL DEFAULT '{}' CHECK (
    cardinality(favorite_topic_ids)<=6 AND (cardinality(favorite_topic_ids)=0 OR array_ndims(favorite_topic_ids)=1)
    AND array_position(favorite_topic_ids,NULL) IS NULL
    AND favorite_topic_ids <@ ARRAY['mechanics','electromagnetism','waves','thermodynamics','optics','modern-physics']::text[]),
  public_visibility boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT community_profile_handle_format CHECK (handle ~ '^[a-z0-9][a-z0-9_]{2,23}$'),
  CONSTRAINT community_profile_handle_reserved CHECK (handle NOT IN (
    'admin','administrator','moderator','mod','physcratic','support','root','system','api','auth','me',
    'profile','profiles','settings','account','login','logout','dashboard','deleted','null','undefined','official','staff'))
);
CREATE UNIQUE INDEX community_profile_handle_unique ON community_profile(lower(handle));

-- Identity and creation time are server-owned. No rename/redirect/recycling API in Batch 1A.
CREATE FUNCTION community_profile_guard_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.handle IS DISTINCT FROM OLD.handle
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Profile identity is immutable' USING ERRCODE='23514';
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END
$$;
CREATE TRIGGER community_profile_guard_update BEFORE UPDATE ON community_profile
  FOR EACH ROW EXECUTE FUNCTION community_profile_guard_update();

CREATE TABLE community_profile_write_limit (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  requests integer NOT NULL CHECK (requests BETWEEN 1 AND 11)
);
REVOKE ALL ON community_profile,community_profile_write_limit FROM PUBLIC;
REVOKE ALL ON FUNCTION community_profile_guard_update() FROM PUBLIC;
-- Operator separately grants SELECT,INSERT,UPDATE on both tables to the reviewed runtime role.
