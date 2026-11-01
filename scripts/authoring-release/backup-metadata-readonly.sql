-- Separate READ-ONLY operator preflight; contains no connection strings/passwords.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog,public;
SET LOCAL statement_timeout='30s';
SELECT current_database(),current_user,session_user,current_setting('server_version'),
 pg_database_size(current_database()) AS database_bytes;
SELECT datname,pg_get_userbyid(datdba) AS owner,pg_encoding_to_char(encoding) AS encoding,
 datlocprovider,datcollate,datctype,datlocale,datcollversion,datacl
FROM pg_database WHERE datname=current_database();
SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls
FROM pg_roles WHERE rolname=current_user;
SELECT pg_get_userbyid(roleid) AS role,pg_get_userbyid(member) AS member,admin_option,inherit_option,set_option
FROM pg_auth_members ORDER BY role,member;
SELECT extname,extversion,n.nspname AS schema FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace ORDER BY extname;
SELECT nspname,pg_get_userbyid(nspowner) AS owner,nspacl FROM pg_namespace
WHERE nspname !~ '^pg_' AND nspname<>'information_schema' ORDER BY nspname;
SELECT n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner,c.relacl
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' ORDER BY n.nspname,c.relname;
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_userbyid(p.proowner) AS owner,p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' ORDER BY n.nspname,p.proname,p.oid;
SELECT pg_get_userbyid(defaclrole) AS role,coalesce(n.nspname,'ALL') AS schema,defaclobjtype,defaclacl
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace ORDER BY role,schema,defaclobjtype;
SELECT count(*) AS large_objects FROM pg_largeobject_metadata;
SELECT has_table_privilege('pg_catalog.pg_largeobject','SELECT') AS can_fingerprint_existing_large_objects;
-- Logical replication/subscriptions/foreign servers are not portable application
-- data; disclose definitions only under a separate credential-sensitive review.
SELECT count(oid) AS subscriptions_requiring_separate_review FROM pg_subscription
WHERE subdbid=(SELECT oid FROM pg_database WHERE datname=current_database());
SELECT count(*) AS foreign_servers_requiring_separate_review FROM pg_foreign_server;
COMMIT;
