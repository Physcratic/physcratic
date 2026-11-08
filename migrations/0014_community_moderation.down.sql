DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM community_moderation_audit) OR EXISTS(SELECT 1 FROM community_report) OR EXISTS(SELECT 1 FROM community_moderation_appeal) THEN RAISE EXCEPTION 'Preserve moderation history; disable gates instead'; END IF;
END $$;
DROP TRIGGER community_moderation_capture ON community_comment;
DROP TABLE community_comment_evidence,community_comment_review,community_thread_lock,community_report,community_moderation_appeal,community_moderation_audit,community_moderation_limit,community_content_limit;
DROP FUNCTION community_staff_role_locked(text),community_thread_root(uuid),community_moderation_capture(),community_apply_content_policy(uuid,text,text,text[],text),community_moderation_decide(text,text,uuid,integer,integer,text,text,text),community_case_guard(),community_case_log();
