-- Never discard a registry containing physical files or historical references.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM author_media) THEN RAISE EXCEPTION 'Retain media registry: remove only verified unreferenced objects before rollback'; END IF;
END $$;
DROP TRIGGER author_revision_media_complete ON authored_revision;
DROP TABLE author_revision_media;
DROP TABLE author_draft_media;
DROP TABLE author_media_usage;
DROP TABLE author_media;
DROP FUNCTION author_revision_media_complete();
DROP FUNCTION author_revision_media_transaction();
DROP FUNCTION author_media_reference_ready();
DROP FUNCTION author_media_guard();
