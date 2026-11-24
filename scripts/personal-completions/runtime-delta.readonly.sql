-- Read-only supplement to the existing runtime audit. Bind runtime_role and completion_owner.
-- Expect no findings after approved grants.
WITH expected(name, table_rights, insert_columns, update_columns) AS (
  VALUES
    ('personal_problem_completion', ARRAY['SELECT','DELETE']::text[], ARRAY['user_id','problem_key']::text[], ARRAY[]::text[]),
    ('personal_completion_write_limit', ARRAY['SELECT','INSERT']::text[], ARRAY[]::text[], ARRAY['window_start','requests']::text[])
), runtime AS (
  SELECT oid FROM pg_roles WHERE rolname=:'runtime_role' AND rolcanlogin
), trusted_owner AS (
  SELECT oid FROM pg_roles WHERE rolname=:'completion_owner'
), relations AS (
  SELECT e.*, c.oid, c.relowner, c.relacl, c.relrowsecurity, c.relforcerowsecurity
  FROM expected e LEFT JOIN pg_class c ON c.relname=e.name AND c.relnamespace='public'::regnamespace AND c.relkind='r'
), findings AS (
  SELECT 'missing_login' AS kind, :'runtime_role' AS object, ''::text AS detail WHERE NOT EXISTS (SELECT 1 FROM runtime)
  UNION ALL
  SELECT 'missing_owner', :'completion_owner', '' WHERE NOT EXISTS (SELECT 1 FROM trusted_owner)
  UNION ALL
  SELECT 'missing_table', name, '' FROM relations WHERE oid IS NULL
  UNION ALL
  SELECT 'owner_or_rls', r.name, '' FROM relations r CROSS JOIN runtime u
    WHERE pg_has_role(u.oid,r.relowner,'MEMBER') OR r.relrowsecurity OR r.relforcerowsecurity
  UNION ALL
  SELECT 'unexpected_owner', r.name, pg_get_userbyid(r.relowner) FROM relations r CROSS JOIN trusted_owner o
    WHERE r.relowner<>o.oid
  UNION ALL
  SELECT 'table_privilege', r.name, p.privilege FROM relations r CROSS JOIN runtime u
    CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege)
    WHERE r.oid IS NOT NULL AND (
      has_table_privilege(u.oid,r.oid,p.privilege) IS DISTINCT FROM (p.privilege=ANY(r.table_rights))
      OR has_table_privilege(u.oid,r.oid,p.privilege||' WITH GRANT OPTION'))
  UNION ALL
  SELECT 'column_privilege', r.name||'.'||a.attname, p.privilege FROM relations r CROSS JOIN runtime u
    JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped
    CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) p(privilege)
    WHERE has_column_privilege(u.oid,r.oid,a.attnum,p.privilege) IS DISTINCT FROM (
      p.privilege=ANY(r.table_rights) OR (p.privilege='INSERT' AND a.attname=ANY(r.insert_columns))
      OR (p.privilege='UPDATE' AND a.attname=ANY(r.update_columns)))
    OR has_column_privilege(u.oid,r.oid,a.attnum,p.privilege||' WITH GRANT OPTION')
  UNION ALL
  SELECT 'public_grant', r.name, acl.privilege_type FROM relations r
    CROSS JOIN LATERAL aclexplode(r.relacl) acl WHERE acl.grantee=0
  UNION ALL
  SELECT 'public_grant', r.name||'.'||a.attname, acl.privilege_type FROM relations r
    JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped
    CROSS JOIN LATERAL aclexplode(a.attacl) acl WHERE acl.grantee=0
  UNION ALL
  SELECT 'unexpected_grantee', r.name, pg_get_userbyid(acl.grantee)||' '||acl.privilege_type
    FROM relations r CROSS JOIN runtime u CROSS JOIN LATERAL aclexplode(r.relacl) acl
    WHERE acl.grantee NOT IN (0,r.relowner,u.oid)
  UNION ALL
  SELECT 'unexpected_grantee', r.name||'.'||a.attname, pg_get_userbyid(acl.grantee)||' '||acl.privilege_type
    FROM relations r JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped
    CROSS JOIN runtime u CROSS JOIN LATERAL aclexplode(a.attacl) acl
    WHERE acl.grantee NOT IN (0,r.relowner,u.oid)
)
SELECT * FROM findings ORDER BY kind,object,detail;
