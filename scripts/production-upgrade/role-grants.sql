-- REVIEW TEMPLATE ONLY. Not loaded by operator.mjs. No role or credential creation.
-- Separately authorized operator binds four distinct confirmed role identifiers.
-- First install the canonical chain. Then provision roles outside this package.
-- Owner transition uses an explicitly inventoried ALTER OWNER list, never REASSIGN
-- OWNED across an unreviewed database or grants of owner membership to services.
GRANT USAGE ON SCHEMA public TO :"runtime_role", :"deletion_role", :"operator_role";
-- Existing auth: no ordinary DELETE on the user identity.
GRANT SELECT,INSERT,UPDATE ON public."user" TO :"runtime_role";
GRANT SELECT,INSERT,UPDATE,DELETE ON public.account,public.session,public.verification,public."rateLimit" TO :"runtime_role";
-- Existing authoring and student contract. Immutable history is never mutable.
GRANT SELECT,INSERT,UPDATE ON public.authored_problem,public.authored_draft,public.authored_draft_private_part,public.author_media,public.author_media_usage,public.authored_write_limit,public.authored_student_rate TO :"runtime_role";
GRANT DELETE ON public.authored_problem,public.authored_draft,public.authored_draft_private_part,public.author_media TO :"runtime_role";
GRANT SELECT,INSERT ON public.authored_revision,public.authored_revision_part,public.authored_revision_private_part,public.author_revision_media,public.authored_attempt,public.authored_solution_reveal TO :"runtime_role";
GRANT SELECT,INSERT,UPDATE ON public.authored_solution_permission TO :"runtime_role";
GRANT SELECT,INSERT,DELETE ON public.authored_solution_permission_media TO :"runtime_role";
GRANT SELECT,INSERT,DELETE ON public.author_draft_media TO :"runtime_role";
-- Existing account-owned legacy grading and contests. No history DELETE grant.
GRANT SELECT,INSERT,UPDATE ON public.solution_attempt,public.solution_evidence,public.practice_attempt,public.archive_progress,public.individual_rating,public.contest,public.contest_registration,public.contest_rating,public.contest_problem TO :"runtime_role";
GRANT SELECT,INSERT ON public.solution_check,public.individual_rating_event,public.contest_attempt TO :"runtime_role";
GRANT DELETE ON public.solution_evidence,public.contest_registration,public.contest_problem TO :"runtime_role";
GRANT SELECT ON public.problem_rating,public.contest_admin TO :"runtime_role";
GRANT INSERT ON public.coaching_inquiry TO :"runtime_role";
-- Community prerequisites, with all existing launch/production locks unchanged.
GRANT SELECT,INSERT,UPDATE ON public.community_profile,public.community_profile_write_limit,public.community_profile_media_limit,public.community_badge_selection,public.community_achievement_write_limit,public.community_medal_claim,public.community_medal_limit,public.community_favourite_limit,public.community_comment_limit,public.community_comment_spam,public.community_moderation_limit,public.community_content_limit TO :"runtime_role";
GRANT SELECT,INSERT,UPDATE,DELETE ON public.community_profile_media TO :"runtime_role";
GRANT SELECT,INSERT,DELETE ON public.community_favourite,public.community_comment_like TO :"runtime_role";
GRANT SELECT,INSERT ON public.community_comment,public.community_report,public.community_moderation_appeal TO :"runtime_role";
GRANT UPDATE(body,deleted_at,version) ON public.community_comment TO :"runtime_role";
GRANT SELECT ON public.community_problem_total,public.community_medal_audit,public.community_approved_medal,public.community_comment_review,public.community_comment_evidence,public.community_thread_lock,public.community_moderation_audit TO :"runtime_role";
GRANT EXECUTE ON FUNCTION public.community_achievement_progress(text),public.community_achievement_problem_solved(text,uuid),public.community_showcase_ids_valid(text[]),public.community_admin_locked(text),public.community_staff_role_locked(text),public.community_thread_root(uuid),public.community_apply_content_policy(uuid,text,text,text[],text),public.community_moderation_decide(text,text,uuid,integer,integer,text,text,text) TO :"runtime_role";
-- B2A. No DELETE or UPDATE of immutable attempts.
GRANT SELECT,INSERT ON public.practice_check_attempt TO :"runtime_role";
GRANT SELECT,INSERT,UPDATE ON public.practice_check_part,public.practice_check_rate TO :"runtime_role";
-- B5 services receive only these routines, never direct table/sequence DML.
GRANT EXECUTE ON FUNCTION public.account_deletion_charge(text,text,boolean),public.account_deletion_receipt(text),public.account_deletion_open_request(text,text,text,text),public.account_deletion_execute(text,text,text,text) TO :"deletion_role";
GRANT EXECUTE ON FUNCTION public.account_deletion_charge(text,text,boolean),public.account_deletion_evidence_control(text,text,text,text,jsonb),public.account_deletion_cleanup(text,text,text,text,jsonb) TO :"operator_role";
-- No PUBLIC grants, ALL TABLES/ALL FUNCTIONS, owner inheritance, staff/audit writes,
-- schema CREATE, sequence blanket grants or ordinary immutable-history DELETE.
-- The harmless exact-row permit probe's canonical PUBLIC EXECUTE stays intact.
