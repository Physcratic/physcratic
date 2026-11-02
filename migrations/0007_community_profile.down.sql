-- Disposable verification only. Disable exposure first. Never discard populated profiles.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM community_profile) THEN
    RAISE EXCEPTION 'Refusing to remove existing community profiles' USING ERRCODE='55000';
  END IF;
END $$;
DROP TABLE community_profile_write_limit;
DROP TABLE community_profile;
DROP FUNCTION community_profile_guard_update();
