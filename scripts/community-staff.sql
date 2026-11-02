-- Operator only, direct connection. Never run with application credentials.
-- psql --set=ON_ERROR_STOP=1 --set=user_id=STABLE_ID --set=staff_role=admin --set=reason='approved ticket/reviewer' --file=scripts/community-staff.sql
-- Roles: admin, moderator, none (revocation). No new auth provider or public role API.
BEGIN;
SET LOCAL search_path=public,pg_catalog;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='15s';
INSERT INTO community_staff(user_id,role,reason) VALUES(:'user_id',:'staff_role',:'reason')
ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,reason=excluded.reason;
-- Trigger preserves the old/new role, reason, session_user and server timestamp atomically.
SELECT user_id,old_role,new_role,reason,operator,created_at FROM community_staff_audit WHERE user_id=:'user_id' ORDER BY id DESC LIMIT 1;
COMMIT;
