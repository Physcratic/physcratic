-- READ ONLY. Owner-authorized metadata only; never a write probe.
-- psql -X -v ON_ERROR_STOP=1 -v runtime_role=physcratic_runtime_app -f this-file
-- Before provisioning, role_absent is expected. Review PUBLIC/default ACLs then.
-- After provisioning, the final result must have ZERO rows. Failures stop cutover.
BEGIN READ ONLY;
SET LOCAL statement_timeout='10s';
SET LOCAL lock_timeout='1s';
SELECT current_database(),current_user,session_user,
 current_setting('server_version_num') AS server_version_num,
 current_setting('transaction_read_only') AS read_only,
 s.ssl,s.version AS tls_version
FROM pg_stat_ssl s WHERE pid=pg_backend_pid();
-- Project/branch/endpoint and app credential/alias binding need console evidence.
SELECT rolname,rolsuper,rolcreaterole FROM pg_roles WHERE rolname=current_user;
-- Before provisioning, confirm this authorized administrator can CREATE ROLE
-- and grant the inventoried objects. Database ownership alone is insufficient.
SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreatedb,rolcreaterole,
 rolreplication,rolbypassrls FROM pg_roles WHERE rolname=:'runtime_role';
SELECT has_database_privilege(oid,current_database(),'CONNECT') AS can_connect,
 has_database_privilege(oid,current_database(),'TEMP') AS existing_public_temp,
 has_database_privilege(oid,current_database(),'CREATE') AS forbidden_database_create
FROM pg_roles WHERE rolname=:'runtime_role';
SELECT r.rolname AS member_of FROM pg_roles app CROSS JOIN pg_roles r
WHERE app.rolname=:'runtime_role' AND r.oid<>app.oid AND pg_has_role(app.oid,r.oid,'MEMBER');
-- PUBLIC/default rights can defeat narrow direct grants. No shared ACL changes.
SELECT n.nspname,c.relname,c.relkind,c.relowner::regrole AS owner,c.relacl,
 c.relrowsecurity,c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
 AND c.relkind IN ('r','p','v','m','S') ORDER BY 1,2;
SELECT polrelid::regclass AS relation,polname,polcmd,polroles,
 pg_get_expr(polqual,polrelid) AS using_expression,
 pg_get_expr(polwithcheck,polrelid) AS check_expression FROM pg_policy ORDER BY 1,2;
SELECT defaclrole::regrole,defaclnamespace::regnamespace,defaclobjtype,defaclacl
FROM pg_default_acl ORDER BY 1,2,3;
SELECT datname,datdba::regrole,datacl FROM pg_database WHERE datname=current_database();
SELECT nspname,nspowner::regrole,nspacl FROM pg_namespace
WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema';
-- Inspect every app-schema routine: no invocation, including the boolean probe.
SELECT p.oid::regprocedure AS routine,p.proowner::regrole AS owner,p.prosecdef,
 p.proconfig,p.proacl,has_function_privilege(app.oid,p.oid,'EXECUTE') AS executable
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
LEFT JOIN pg_roles app ON app.rolname=:'runtime_role'
WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
ORDER BY 1;

-- Exact manifest comparison, including effective PUBLIC/inherited COLUMN rights.
-- Generated from the reviewed permissions.json; focused test compares the ACLs.
WITH expected(name,privileges,update_columns) AS (VALUES
 ('user',ARRAY['SELECT','INSERT','UPDATE']::text[],ARRAY[]::text[]),
 ('account',ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[],ARRAY[]::text[]),
 ('session',ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[],ARRAY[]::text[]),
 ('verification',ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[],ARRAY[]::text[]),
 ('rateLimit',ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[],ARRAY[]::text[]),
 ('authored_problem',ARRAY['SELECT','INSERT','DELETE']::text[],ARRAY['state','published_revision_id','updated_at']::text[]),
 ('authored_draft',ARRAY['SELECT','INSERT','DELETE']::text[],ARRAY['content','version','updated_at']::text[]),
 ('authored_draft_private_part',ARRAY['SELECT','INSERT','DELETE']::text[],ARRAY[]::text[]),
 ('authored_revision',ARRAY['SELECT','INSERT']::text[],ARRAY[]::text[]),
 ('authored_revision_part',ARRAY['SELECT','INSERT']::text[],ARRAY[]::text[]),
 ('authored_revision_private_part',ARRAY['SELECT','INSERT']::text[],ARRAY[]::text[]),
 ('author_media',ARRAY['SELECT','INSERT','DELETE']::text[],ARRAY['state']::text[]),
 ('author_media_usage',ARRAY['SELECT','INSERT']::text[],ARRAY['day','attempts']::text[]),
 ('authored_write_limit',ARRAY['SELECT','INSERT']::text[],ARRAY['window_start','requests']::text[]),
 ('authored_student_rate',ARRAY['SELECT','INSERT']::text[],ARRAY['window_start','requests','submissions']::text[]),
 ('author_draft_media',ARRAY['SELECT','INSERT','DELETE']::text[],ARRAY[]::text[]),
 ('author_revision_media',ARRAY['SELECT','INSERT']::text[],ARRAY[]::text[]),
 ('authored_attempt',ARRAY['SELECT','INSERT']::text[],ARRAY[]::text[]),
 ('authored_solution_permission',ARRAY['SELECT','INSERT']::text[],ARRAY['authorization_id','version','enabled','expires_at']::text[]),
 ('authored_solution_permission_media',ARRAY['SELECT','INSERT','DELETE']::text[],ARRAY[]::text[]),
 ('authored_solution_reveal',ARRAY['SELECT','INSERT']::text[],ARRAY[]::text[]),
 ('solution_attempt',ARRAY['SELECT','INSERT']::text[],ARRAY[]::text[]),
 ('solution_evidence',ARRAY['SELECT','INSERT','DELETE']::text[],ARRAY[]::text[]),
 ('solution_check',ARRAY['SELECT','INSERT']::text[],ARRAY[]::text[]),
 ('individual_rating',ARRAY['SELECT','INSERT']::text[],ARRAY['rating','ratedAttempts','updatedAt']::text[]),
 ('individual_rating_event',ARRAY['SELECT','INSERT']::text[],ARRAY[]::text[]),
 ('problem_rating',ARRAY['SELECT']::text[],ARRAY['updatedAt']::text[]),
 ('practice_attempt',ARRAY['SELECT']::text[],ARRAY[]::text[]),
 ('archive_progress',ARRAY['SELECT','INSERT']::text[],ARRAY['notes','answer','reviewed','updatedAt']::text[]),
 ('contest',ARRAY['SELECT','INSERT']::text[],ARRAY['name','description','startsAt','durationMinutes','problemIds','launchOnPublish','version','published','publishedAt','registrationOpen','rated']::text[]),
 ('contest_admin',ARRAY['SELECT']::text[],ARRAY['createdAt']::text[]),
 ('contest_registration',ARRAY['SELECT','INSERT','DELETE']::text[],ARRAY['createdAt']::text[]),
 ('contest_problem',ARRAY['SELECT','INSERT','DELETE']::text[],ARRAY[]::text[]),
 ('contest_attempt',ARRAY['SELECT','INSERT']::text[],ARRAY[]::text[]),
 ('contest_rating',ARRAY['SELECT']::text[],ARRAY[]::text[])
), app AS (SELECT * FROM pg_roles WHERE rolname=:'runtime_role'),
objects AS (
 SELECT c.*,n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
), problems(kind,object,detail) AS (
 SELECT 'role_absent',:'runtime_role','Proposed LOGIN does not exist'
 WHERE NOT EXISTS(SELECT 1 FROM app)
 UNION ALL
 SELECT 'public_relation_privilege',o.nspname||'.'||o.relname,a.privilege_type
 FROM objects o CROSS JOIN LATERAL aclexplode(o.relacl) a
 WHERE a.grantee=0 AND o.relkind IN ('r','p','v','m','f','S')
 UNION ALL
 SELECT 'public_schema_create',n.nspname,'PUBLIC has trusted schema CREATE'
 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
 AND a.grantee=0 AND a.privilege_type='CREATE'
 UNION ALL
 SELECT 'public_database_create',d.datname,'PUBLIC has database CREATE'
 FROM pg_database d CROSS JOIN LATERAL aclexplode(coalesce(d.datacl,acldefault('d',d.datdba))) a
 WHERE d.datname=current_database() AND a.grantee=0 AND a.privilege_type='CREATE'
 UNION ALL
 SELECT 'public_privileged_routine',p.oid::regprocedure::text,'PUBLIC SECURITY DEFINER EXECUTE'
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
 AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE'
 AND p.oid<>'public.account_deletion_mutation_allowed(oid,text,jsonb,jsonb)'::regprocedure
 UNION ALL
 SELECT 'public_default_acl',d.defaclrole::regrole::text,a.privilege_type
 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
 WHERE d.defaclobjtype IN ('r','S') AND a.grantee=0
 UNION ALL
 SELECT 'role_attribute',rolname,'LOGIN/NOINHERIT and nonprivileged attributes required'
 FROM app WHERE NOT rolcanlogin OR rolinherit OR rolsuper OR rolcreatedb
 OR rolcreaterole OR rolreplication OR rolbypassrls
 UNION ALL
 SELECT 'role_membership',r.rolname,'Any outbound membership blocks acceptance'
 FROM app CROSS JOIN pg_roles r WHERE r.oid<>app.oid AND pg_has_role(app.oid,r.oid,'MEMBER')
 UNION ALL
 SELECT 'database_right',current_database(),'CONNECT required, CREATE forbidden'
 FROM app WHERE NOT has_database_privilege(app.oid,current_database(),'CONNECT')
 OR has_database_privilege(app.oid,current_database(),'CREATE')
 UNION ALL
 SELECT 'schema_right',n.nspname,'Trusted schema CREATE forbidden; public USAGE required'
 FROM app CROSS JOIN pg_namespace n
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
 AND (has_schema_privilege(app.oid,n.oid,'CREATE')
 OR (n.nspname='public' AND NOT has_schema_privilege(app.oid,n.oid,'USAGE')))
 UNION ALL
 SELECT 'owner',o.nspname||'.'||o.relname,'Runtime owns a relation/sequence/view'
 FROM objects o CROSS JOIN app WHERE o.relowner=app.oid
 UNION ALL
 SELECT 'owner',n.nspname,'Runtime owns a schema'
 FROM pg_namespace n CROSS JOIN app WHERE n.nspowner=app.oid
 UNION ALL
 SELECT 'owner',d.datname,'Runtime owns a database'
 FROM pg_database d CROSS JOIN app WHERE d.datdba=app.oid
 UNION ALL
 SELECT 'owner',p.oid::regprocedure::text,'Runtime owns a routine'
 FROM pg_proc p CROSS JOIN app WHERE p.proowner=app.oid
 UNION ALL
 SELECT 'missing_table',e.name,'Expected ordinary public table missing'
 FROM expected e LEFT JOIN objects o ON o.nspname='public' AND o.relname=e.name AND o.relkind IN ('r','p')
 WHERE o.oid IS NULL
 UNION ALL
 SELECT 'row_security',e.name,'RLS on a required table needs separate policy qualification'
 FROM expected e JOIN objects o ON o.nspname='public' AND o.relname=e.name
 WHERE o.relrowsecurity OR o.relforcerowsecurity
 UNION ALL
 SELECT 'table_privilege',o.nspname||'.'||o.relname,p.privilege
 FROM objects o CROSS JOIN app CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
 ('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege)
 LEFT JOIN expected e ON o.nspname='public' AND o.relname=e.name
 WHERE o.relkind IN ('r','p','v','m','f') AND
 has_table_privilege(app.oid,o.oid,p.privilege) IS DISTINCT FROM coalesce(p.privilege=ANY(e.privileges),false)
 UNION ALL
 SELECT 'column_privilege',o.nspname||'.'||o.relname||'.'||a.attname,p.privilege
 FROM objects o JOIN pg_attribute a ON a.attrelid=o.oid AND a.attnum>0 AND NOT a.attisdropped
 CROSS JOIN app CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) p(privilege)
 LEFT JOIN expected e ON o.nspname='public' AND o.relname=e.name
 WHERE o.relkind IN ('r','p','v','m','f') AND has_column_privilege(app.oid,o.oid,a.attnum,p.privilege)
 IS DISTINCT FROM coalesce(p.privilege=ANY(e.privileges)
 OR (p.privilege='UPDATE' AND a.attname=ANY(e.update_columns)),false)
 UNION ALL
 SELECT 'sequence_privilege',o.nspname||'.'||o.relname,p.privilege
 FROM objects o CROSS JOIN app CROSS JOIN (VALUES ('SELECT'),('USAGE'),('UPDATE')) p(privilege)
 WHERE o.relkind='S' AND has_sequence_privilege(app.oid,o.oid,p.privilege)
 UNION ALL
 SELECT 'table_grant_option',o.nspname||'.'||o.relname,p.privilege
 FROM objects o CROSS JOIN app CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
 ('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege)
 WHERE o.relkind IN ('r','p','v','m','f')
 AND has_table_privilege(app.oid,o.oid,p.privilege||' WITH GRANT OPTION')
 UNION ALL
 SELECT 'column_grant_option',o.nspname||'.'||o.relname||'.'||a.attname,p.privilege
 FROM objects o JOIN pg_attribute a ON a.attrelid=o.oid AND a.attnum>0 AND NOT a.attisdropped
 CROSS JOIN app CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) p(privilege)
 WHERE o.relkind IN ('r','p','v','m','f')
 AND has_column_privilege(app.oid,o.oid,a.attnum,p.privilege||' WITH GRANT OPTION')
 UNION ALL
 SELECT 'schema_grant_option',n.nspname,p.privilege
 FROM pg_namespace n CROSS JOIN app CROSS JOIN (VALUES ('USAGE'),('CREATE')) p(privilege)
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
 AND has_schema_privilege(app.oid,n.oid,p.privilege||' WITH GRANT OPTION')
 UNION ALL
 SELECT 'database_grant_option',current_database(),p.privilege
 FROM app CROSS JOIN (VALUES ('CONNECT'),('TEMP'),('CREATE')) p(privilege)
 WHERE has_database_privilege(app.oid,current_database(),p.privilege||' WITH GRANT OPTION')
 UNION ALL
 SELECT 'routine_grant_option',p.oid::regprocedure::text,'EXECUTE WITH GRANT OPTION'
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN app
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
 AND has_function_privilege(app.oid,p.oid,'EXECUTE WITH GRANT OPTION')
 UNION ALL
 SELECT 'privileged_routine',p.oid::regprocedure::text,'Unexpected SECURITY DEFINER EXECUTE'
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN app
 WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
 AND p.prosecdef AND has_function_privilege(app.oid,p.oid,'EXECUTE')
 AND p.oid<> 'public.account_deletion_mutation_allowed(oid,text,jsonb,jsonb)'::regprocedure
 UNION ALL
 SELECT 'required_routine',s.signature,'Required EXECUTE missing'
 FROM (VALUES ('public.authored_discovery_terms(jsonb)'),
 ('public.account_deletion_mutation_allowed(oid,text,jsonb,jsonb)')) s(signature) CROSS JOIN app
 WHERE NOT has_function_privilege(app.oid,s.signature,'EXECUTE')
 UNION ALL
 SELECT 'direct_routine_grant',p.oid::regprocedure::text,'Unlisted direct EXECUTE grant'
 FROM pg_proc p CROSS JOIN app CROSS JOIN LATERAL aclexplode(p.proacl) a
 WHERE a.grantee=app.oid AND a.privilege_type='EXECUTE'
 AND p.oid<>'public.authored_discovery_terms(jsonb)'::regprocedure
)
SELECT * FROM problems ORDER BY kind,object,detail;
COMMIT;
-- Final ZERO rows is necessary, not sufficient: inspect owner/default ACL,
-- routine search-path and identity/transport inventories above and existing
-- scripts/activation/runtime-readonly.sql. Do not SET ROLE for LOGIN evidence.
