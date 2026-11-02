-- Disposable rollback only. Never lose physical-object registry or active profile images.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM community_profile_media) THEN
    RAISE EXCEPTION 'Profile media registry must be empty before rollback' USING ERRCODE='55000';
  END IF;
END $$;
DROP TABLE community_profile_media_limit;
DROP TABLE community_profile_media;
DROP FUNCTION community_profile_media_guard();
