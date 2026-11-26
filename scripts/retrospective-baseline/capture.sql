\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog;
SET LOCAL timezone = 'UTC';
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

SELECT current_database() = :'expected_database'
  AND session_user = :'expected_login' AND current_user = session_user
  AND current_setting('server_version_num') = :'expected_version'
  AND current_setting('server_version_num')::int BETWEEN 180000 AND 189999
  AND NOT pg_is_in_recovery()
  AND EXISTS (SELECT FROM pg_stat_ssl WHERE pid = pg_backend_pid() AND ssl)
  AND EXISTS (SELECT FROM pg_roles WHERE rolname = :'runtime_role')
  AND (SELECT count(*)=2 FROM pg_class WHERE relnamespace='public'::regnamespace
       AND relname IN ('authored_revision','physcratic_production_migrations')
       AND relkind='r' AND NOT relrowsecurity AND NOT relforcerowsecurity)
  AS target_matches \gset
\if :target_matches
\else
\warn 'Unexpected target, inspection LOGIN, TLS or evidence-table kind/security.'
SELECT 1/0;
\endif

WITH relations AS (
  SELECT c.*, c.relname IN ('user','session','solution_evidence') AS partial_columns
  FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relname IN (
    'user','session','solution_evidence','authored_problem','authored_revision','authored_revision_part',
    'authored_revision_private_part','author_revision_media','authored_attempt','author_media',
    'community_profile','community_profile_write_limit','community_profile_media',
    'community_favourite','community_favourite_limit','community_problem_total',
    'community_medal_claim','community_approved_medal','community_badge_selection','community_achievement_write_limit',
    'community_external_medal','community_external_medal_audit','community_external_approved_medal','community_restriction',
    'personal_problem_completion','personal_completion_write_limit',
    'account_deletion_publication','account_deletion_outbox','account_deletion_pending_upload',
    'physcratic_production_migrations'
  )
), columns AS (
  SELECT r.relname, a.* FROM relations r JOIN pg_attribute a ON a.attrelid = r.oid
  WHERE a.attnum > 0 AND NOT a.attisdropped
), structural_columns AS (
  SELECT a.* FROM columns a JOIN relations r ON r.oid=a.attrelid
  WHERE NOT r.partial_columns
    OR (r.relname='user' AND a.attname IN ('profileSignupHandle','profileSignupPolicyVersion'))
    OR (r.relname='solution_evidence' AND a.attname='pathname')
), routines AS (
  SELECT p.*, p.oid::regprocedure::text AS signature FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace AND (
    p.oid IN (SELECT tgfoid FROM pg_trigger WHERE tgrelid IN (SELECT oid FROM relations) AND NOT tgisinternal)
    OR p.proname IN ('community_achievement_progress','community_achievement_problem_solved',
      'community_showcase_ids_valid','authored_discovery_terms','community_external_medal_recipient',
      'community_external_medal_award','community_external_medal_revoke','community_profile_claim_signup',
      'community_profile_guard_publication','community_restriction_decide','account_deletion_execute','account_deletion_cleanup',
      'account_deletion_mutation_allowed','account_deletion_upload_finished')
  )
), catalogue AS (
  SELECT 'relation:'||r.relname AS key, jsonb_build_array(r.relkind,r.relpersistence,r.relrowsecurity,r.relforcerowsecurity,
    r.relispartition,coalesce((SELECT array_agg(o ORDER BY o) FROM unnest(r.reloptions) o),'{}'::text[]),
    CASE WHEN r.relkind='v' THEN pg_get_viewdef(r.oid,false) END) AS value FROM relations r
  UNION ALL
  SELECT 'column:'||a.relname||'.'||a.attname, jsonb_build_array(format_type(a.atttypid,a.atttypmod),
    a.attnotnull,a.attidentity,a.attgenerated,
    CASE WHEN a.attcollation<>0 THEN a.attcollation::regcollation::text END, pg_get_expr(d.adbin,d.adrelid,false))
  FROM structural_columns a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
  UNION ALL
  SELECT 'constraint:'||r.relname||'.'||c.conname, jsonb_build_array(pg_get_constraintdef(c.oid,false),
    c.convalidated,c.conenforced,c.condeferrable,c.condeferred,
    coalesce((SELECT jsonb_agg(jsonb_build_array(t.tgrelid::regclass::text,t.tgenabled)
      ORDER BY t.tgrelid::regclass::text,t.tgenabled) FROM pg_trigger t WHERE t.tgconstraint=c.oid AND t.tgisinternal),'[]'))
  FROM pg_constraint c JOIN relations r ON r.oid=c.conrelid
  WHERE NOT r.partial_columns OR EXISTS (
    SELECT FROM structural_columns a WHERE a.attrelid=r.oid AND a.attnum=ANY(c.conkey)
  )
  UNION ALL
  SELECT 'index:'||r.relname||'.'||i.relname,jsonb_build_array(pg_get_indexdef(i.oid,0,false),
    ix.indisvalid,ix.indisready,ix.indislive,ix.indisreplident,
    coalesce((SELECT array_agg(o ORDER BY o) FROM unnest(i.reloptions) o),'{}'::text[]))
  FROM pg_index ix JOIN relations r ON r.oid=ix.indrelid JOIN pg_class i ON i.oid=ix.indexrelid
  WHERE NOT r.partial_columns OR EXISTS (
    SELECT FROM structural_columns a WHERE a.attrelid=r.oid AND a.attnum=ANY(ix.indkey)
  )
  UNION ALL
  SELECT 'trigger:'||r.relname||'.'||t.tgname,jsonb_build_array(pg_get_triggerdef(t.oid,false),t.tgenabled)
  FROM pg_trigger t JOIN relations r ON r.oid=t.tgrelid WHERE NOT t.tgisinternal
  UNION ALL
  SELECT 'routine:'||p.signature,jsonb_build_array(pg_get_functiondef(p.oid),p.prokind,p.prosecdef,p.proleakproof,
    p.provolatile,p.proisstrict,p.proparallel,p.proconfig) FROM routines p
), objects AS (
  SELECT 'relation:'||r.relname AS key,r.oid,r.relowner AS owner,r.relacl AS acl,'r'::"char" AS acl_type FROM relations r
  UNION ALL SELECT 'routine:'||p.signature,p.oid,p.proowner,p.proacl,'f'::"char" FROM routines p
), owners AS (
  SELECT key,pg_get_userbyid(owner) AS owner FROM objects
), acl_rows AS (
  SELECT o.key,'' AS column_name,a.*
  FROM objects o CROSS JOIN LATERAL aclexplode(coalesce(o.acl,acldefault(o.acl_type,o.owner))) a
  WHERE a.grantee<>o.owner
  UNION ALL
  SELECT o.key,c.attname,a.* FROM columns c JOIN objects o ON o.acl_type='r' AND o.oid=c.attrelid
  CROSS JOIN LATERAL aclexplode(c.attacl) a WHERE a.grantee<>o.owner
), runtime AS (
  SELECT * FROM pg_roles WHERE rolname=:'runtime_role'
), role_memberships AS (
  SELECT member.rolname AS member, grantee.rolname AS granted_role,
    pg_has_role(member.oid,grantee.oid,'USAGE') AS inherits,
    pg_has_role(member.oid,grantee.oid,'SET') AS can_set_role
  FROM pg_roles member CROSS JOIN pg_roles grantee
  WHERE member.oid<>grantee.oid AND NOT member.rolsuper
    AND grantee.oid IN (SELECT owner FROM objects UNION SELECT grantee FROM acl_rows UNION SELECT oid FROM runtime)
    AND pg_has_role(member.oid,grantee.oid,'MEMBER')
), effective AS (
  SELECT o.key,
    CASE WHEN o.acl_type='f' THEN
      ARRAY(SELECT 'EXECUTE' WHERE has_function_privilege(r.oid,o.oid,'EXECUTE'))
    ELSE ARRAY(SELECT p FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
       WHERE has_table_privilege(r.oid,o.oid,p) ORDER BY p) END AS rights,
    CASE WHEN o.acl_type='f' THEN has_function_privilege(r.oid,o.oid,'EXECUTE WITH GRANT OPTION')
      ELSE has_table_privilege(r.oid,o.oid,'SELECT WITH GRANT OPTION,INSERT WITH GRANT OPTION,UPDATE WITH GRANT OPTION,DELETE WITH GRANT OPTION,TRUNCATE WITH GRANT OPTION,REFERENCES WITH GRANT OPTION,TRIGGER WITH GRANT OPTION,MAINTAIN WITH GRANT OPTION')
    END AS grant_option
  FROM objects o CROSS JOIN runtime r
), effective_columns AS (
  SELECT 'relation:'||c.relname AS key,c.attname AS column_name,
    ARRAY(SELECT p FROM unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) p
      WHERE has_column_privilege(r.oid,c.attrelid,c.attnum,p) ORDER BY p) AS rights,
    has_column_privilege(r.oid,c.attrelid,c.attnum,'SELECT WITH GRANT OPTION,INSERT WITH GRANT OPTION,UPDATE WITH GRANT OPTION,REFERENCES WITH GRANT OPTION') AS grant_option
  FROM columns c CROSS JOIN runtime r
), default_grants AS (
  SELECT pg_get_userbyid(d.defaclrole) AS creator,coalesce(n.nspname,'') AS schema_name,d.defaclobjtype AS object_type,
    CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
    pg_get_userbyid(a.grantor) AS grantor,a.privilege_type,a.is_grantable
  FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
  LEFT JOIN LATERAL aclexplode(d.defaclacl) a ON true
  WHERE (d.defaclnamespace=0 OR n.nspname='public') AND d.defaclrole IN (SELECT owner FROM objects)
)
SELECT jsonb_build_object(
  'captureVersion',1,
  'target',jsonb_build_object('database',current_database(),'login',session_user,
    'version',current_setting('server_version_num')::int,'capturedAt',statement_timestamp(),
    'tls',(SELECT version FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl),
    'databaseOwner',(SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname=current_database()),
    'schemaOwner',(SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='public')),
  'ledger',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'sha256',sha256,'sourceCommit',source_commit,
    'appliedBy',applied_by,'appliedAt',applied_at,'result',result) ORDER BY id),'[]') FROM public.physcratic_production_migrations),
  'inconsistentConsent',(SELECT count(*) FROM public.authored_revision WHERE NOT coalesce(
    (solution_policy='legacy-private-v1' AND solution_consented_at IS NULL)
    OR (solution_policy='public-solutions-v1' AND solution_consented_at=published_at),false)),
  'catalogue',(SELECT jsonb_object_agg(key,value) FROM catalogue),
  'owners',(SELECT jsonb_object_agg(key,owner) FROM owners),
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_array(key,column_name,
    CASE WHEN grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(grantee) END,
    pg_get_userbyid(grantor),privilege_type,is_grantable) ORDER BY key,column_name,grantee,grantor,privilege_type),'[]') FROM acl_rows),
  'roleMemberships',(SELECT coalesce(jsonb_agg(jsonb_build_array(member,granted_role,inherits,can_set_role)),'[]')
    FROM role_memberships),
  'defaultAcl',(SELECT coalesce(jsonb_agg(jsonb_build_array(creator,schema_name,object_type,
    grantee,grantor,privilege_type,is_grantable)),'[]') FROM default_grants),
  'runtime',(SELECT jsonb_build_object('role',rolname,
    'restricted',rolcanlogin AND NOT (rolinherit OR rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls),
    'memberships',ARRAY(SELECT p.rolname FROM pg_roles p WHERE p.oid<>r.oid AND pg_has_role(r.oid,p.oid,'MEMBER') ORDER BY p.rolname),
    'connect',has_database_privilege(oid,current_database(),'CONNECT'),
    'databaseCreate',has_database_privilege(oid,current_database(),'CREATE'),
    'schemaUsage',has_schema_privilege(oid,'public','USAGE'),
    'schemaCreate',has_schema_privilege(oid,'public','CREATE')) FROM runtime r),
  'publicCreate',EXISTS (
    SELECT FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a
    WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='CREATE'
    UNION ALL
    SELECT FROM pg_database d CROSS JOIN LATERAL aclexplode(coalesce(d.datacl,acldefault('d',d.datdba))) a
    WHERE d.datname=current_database() AND a.grantee=0 AND a.privilege_type='CREATE'
  ),
  'ownerDependenciesOk',(
    SELECT has_table_privilege(v.relowner,m.oid,'SELECT')
      AND has_table_privilege(b.proowner,m.oid,'SELECT')
      AND has_table_privilege(b.proowner,'public.community_medal_claim','SELECT')
      AND has_function_privilege(b.proowner,'public.community_achievement_progress(text)','EXECUTE')
      AND has_table_privilege(g.proowner,m.oid,'SELECT')
    FROM relations v CROSS JOIN relations m CROSS JOIN routines b CROSS JOIN routines g
    WHERE v.relname='community_external_approved_medal' AND m.relname='community_external_medal'
      AND b.proname='community_badge_selection_guard' AND b.pronargs=0
      AND g.proname='community_medal_external_slot_guard' AND g.pronargs=0
  ),
  'effective',(SELECT jsonb_object_agg(key,jsonb_build_object('rights',rights,'grantOption',grant_option)) FROM effective),
  'effectiveColumns',(SELECT jsonb_agg(jsonb_build_array(key,column_name,rights,grant_option) ORDER BY key,column_name) FROM effective_columns)
);
COMMIT;
