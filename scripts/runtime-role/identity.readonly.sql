-- Run directly as the proposed LOGIN, on both approved direct and pooled hosts.
-- Owner must require database=neondb, both identities=approved runtime role,
-- version=180007 and read_only=on, plus independently verified client TLS.
-- Record ssl/version and establish which transport segment the provider exposes;
-- a pooler's backend SSL row alone cannot attest frontend certificate checking.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5s';
SELECT current_database() AS database,current_user,session_user,
 current_setting('server_version_num') AS server_version_num,
 current_setting('transaction_read_only') AS read_only,s.ssl,s.version AS tls_version
FROM pg_stat_ssl s WHERE pid=pg_backend_pid();
COMMIT;
-- A SQL result cannot attest the Neon project/branch, hostname verification or
-- Vercel's chosen credential. Inspect those independently. Never SET ROLE.
