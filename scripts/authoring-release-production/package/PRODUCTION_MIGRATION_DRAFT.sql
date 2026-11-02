-- REVIEW DRAFT ONLY: no execution authorization is implied. No remote invocation supplied.
BEGIN;
SET LOCAL search_path=pg_catalog,public;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
SET LOCAL idle_in_transaction_session_timeout='120s';
SELECT pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0));
DO $pre$ DECLARE r jsonb; BEGIN IF current_database()<>'neondb' OR current_user<>'neondb_owner' OR session_user<>'neondb_owner' OR current_setting('server_version_num')<>'180006' OR current_setting('session_replication_role')<>'origin' THEN RAISE EXCEPTION 'WRONG_TARGET_IDENTITY_OR_VERSION'; END IF;
 IF current_setting('physcratic.production_approval',true) IS DISTINCT FROM '2c35d61a5fcf6680a4054380a4bfcff1b71bc9e6:reviewed-production-window-and-recovery' THEN RAISE EXCEPTION 'SEPARATE_PRODUCTION_APPROVAL_REQUIRED'; END IF;
 SELECT report INTO r FROM(-- Catalog only: no row values, credentials, temporary objects or state changes.
SELECT jsonb_build_object(
 'identity',jsonb_build_object('database',current_database(),'current_user',current_user,'session_user',session_user,'server_version_num',current_setting('server_version_num')::int,'read_only',current_setting('transaction_read_only'),'replication_role',current_setting('session_replication_role')),
 'database',(SELECT jsonb_build_object('encoding',pg_encoding_to_char(encoding),'collate',datcollate,'ctype',datctype,'provider',datlocprovider,'locale',datlocale,'collation_version',datcollversion) FROM pg_database WHERE datname=current_database()),
 'tables',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'name',c.relname,'owner',c.relowner::regrole::text,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
  'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
  'constraints',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',conname,'type',contype,'definition',pg_get_constraintdef(oid,false),'validated',convalidated) ORDER BY conname) FROM pg_constraint WHERE conrelid=c.oid),'[]'::jsonb),
  'indexes',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',i.relname,'definition',pg_get_indexdef(x.indexrelid),'valid',x.indisvalid,'ready',x.indisready,'constraint_index',EXISTS(SELECT 1 FROM pg_constraint k WHERE k.conindid=x.indexrelid)) ORDER BY i.relname) FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid WHERE x.indrelid=c.oid),'[]'::jsonb),
  'triggers',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',tgname,'definition',pg_get_triggerdef(oid,false),'enabled',tgenabled) ORDER BY tgname) FROM pg_trigger WHERE tgrelid=c.oid AND NOT tgisinternal),'[]'::jsonb)
 ) ORDER BY c.relname) FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN('r','p')),'[]'::jsonb),
 'functions',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid),'security_definer',p.prosecdef) ORDER BY p.proname,pg_get_function_identity_arguments(p.oid)) FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.pronamespace='public'::regnamespace AND p.prokind IN('f','p') AND l.lanname IN('sql','plpgsql')),'[]'::jsonb),
 'sequences',COALESCE((SELECT jsonb_agg(c.relname ORDER BY c.relname) FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='S'),'[]'::jsonb),
 'views',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'definition',pg_get_viewdef(c.oid,false)) ORDER BY c.relname) FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN('v','m')),'[]'::jsonb),
 'types',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',t.typname,'kind',t.typtype) ORDER BY t.typname) FROM pg_type t WHERE t.typnamespace='public'::regnamespace AND t.typtype IN('e','d')),'[]'::jsonb),
 'policies',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='public'),'[]'::jsonb)
) AS report)c;
 IF encode(sha256(convert_to((r-'identity'-'database')::text,'UTF8')),'hex')<>'f28774f723be5c3393c3268384f4f8abfcbc35d4912bf7b9bc482ae9f9638c7f' OR r->'database'<>'{"ctype":"C.UTF-8","locale":"C.UTF-8","collate":"C.UTF-8","encoding":"UTF8","provider":"b","collation_version":"1"}'::jsonb THEN RAISE EXCEPTION 'PRODUCTION_BASELINE_DRIFT'; END IF;
 IF NOT has_schema_privilege(current_user,'public','CREATE') OR NOT has_language_privilege(current_user,'sql','USAGE') THEN RAISE EXCEPTION 'DDL_PRIVILEGE_CHECK_FAILED'; END IF;
END $pre$;
-- Freeze existing rows too: no compliant or noncompliant concurrent writer can change them.
LOCK TABLE public."account",public."archive_progress",public."coaching_inquiry",public."contest",public."contest_rating",public."contest_registration",public."individual_rating",public."individual_rating_event",public."practice_attempt",public."problem_rating",public."session",public."solution_attempt",public."solution_check",public."solution_evidence",public."user",public."verification" IN SHARE ROW EXCLUSIVE MODE;
SELECT set_config('physcratic.before_fingerprints',(jsonb_build_object('account',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."account" r),'archive_progress',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."archive_progress" r),'coaching_inquiry',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."coaching_inquiry" r),'contest',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."contest" r),'contest_rating',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."contest_rating" r),'contest_registration',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."contest_registration" r),'individual_rating',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."individual_rating" r),'individual_rating_event',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."individual_rating_event" r),'practice_attempt',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."practice_attempt" r),'problem_rating',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."problem_rating" r),'session',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."session" r),'solution_attempt',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."solution_attempt" r),'solution_check',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."solution_check" r),'solution_evidence',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."solution_evidence" r),'user',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."user" r),'verification',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."verification" r)))::text,true);
SET LOCAL search_path=public,pg_catalog;
CREATE TABLE public.physcratic_production_migrations (
 id text PRIMARY KEY,sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 source_commit text NOT NULL,applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 applied_by text NOT NULL DEFAULT CURRENT_USER,result text NOT NULL CHECK(result='verified')
);

-- BEGIN CANONICAL migrations/0001_problem_authoring.up.sql sha256=83ec2e53f95829aa6932a327dfd0362a3c197e190ddbcfb00a67d24a05c93d09
-- Additive only. Run explicitly in a reviewed transaction, never automatically at build/start.
CREATE TABLE authored_problem (
 id uuid PRIMARY KEY, slug text NOT NULL UNIQUE,
 owner_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 state text NOT NULL DEFAULT 'draft', published_revision_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT authored_problem_state_check CHECK (state IN ('draft','published','archived')),
 CONSTRAINT authored_problem_slug_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug)<=120),
 CONSTRAINT authored_problem_publication_check CHECK (state<>'published' OR published_revision_id IS NOT NULL)
);
CREATE INDEX authored_problem_owner_idx ON authored_problem(owner_id);
CREATE TABLE authored_draft (
 problem_id uuid PRIMARY KEY REFERENCES authored_problem(id) ON DELETE CASCADE,
 version integer NOT NULL DEFAULT 1 CONSTRAINT authored_draft_version_check CHECK(version>0),
 content jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE authored_revision (
 id uuid PRIMARY KEY, problem_id uuid NOT NULL REFERENCES authored_problem(id) ON DELETE RESTRICT,
 number integer NOT NULL, schema_version integer NOT NULL DEFAULT 1, content jsonb NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT authored_revision_number_key UNIQUE(problem_id,number),
 CONSTRAINT authored_revision_problem_id_key UNIQUE(problem_id,id),
 CONSTRAINT authored_revision_version_check CHECK(number>0 AND schema_version=1)
);
ALTER TABLE authored_problem ADD CONSTRAINT authored_problem_revision_fk FOREIGN KEY(id,published_revision_id) REFERENCES authored_revision(problem_id,id);
CREATE TABLE authored_draft_private_part (
 problem_id uuid NOT NULL REFERENCES authored_draft(problem_id) ON DELETE CASCADE,
 part_id uuid NOT NULL, data jsonb NOT NULL, PRIMARY KEY(problem_id,part_id),
 CONSTRAINT authored_draft_private_identity_check CHECK((jsonb_typeof(data)='object' AND jsonb_typeof(data->'partId')='string' AND data->>'partId'=part_id::text) IS TRUE)
);
CREATE TABLE authored_revision_part (
 revision_id uuid NOT NULL REFERENCES authored_revision(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 part_id uuid NOT NULL, answer_mode text NOT NULL,
 PRIMARY KEY(revision_id,part_id), CONSTRAINT authored_revision_part_mode_key UNIQUE(revision_id,part_id,answer_mode),
 CONSTRAINT authored_revision_part_mode_check CHECK(answer_mode IN ('numeric','expression','manual'))
);
CREATE TABLE authored_revision_private_part (
 revision_id uuid NOT NULL, part_id uuid NOT NULL, answer_mode text NOT NULL, data jsonb NOT NULL,
 PRIMARY KEY(revision_id,part_id),
 CONSTRAINT authored_revision_private_part_fk FOREIGN KEY(revision_id,part_id,answer_mode) REFERENCES authored_revision_part(revision_id,part_id,answer_mode) DEFERRABLE INITIALLY DEFERRED,
 CONSTRAINT authored_revision_private_identity_check CHECK((jsonb_typeof(data)='object' AND jsonb_typeof(data->'partId')='string' AND data->>'partId'=part_id::text AND data ? 'key' AND jsonb_typeof(data->'key')='object' AND data->'key' ? 'kind' AND data->'key'->>'kind'=answer_mode) IS TRUE)
);
-- Every revision part must have exactly one matching private row at commit.
ALTER TABLE authored_revision_part ADD CONSTRAINT authored_revision_part_private_fk FOREIGN KEY(revision_id,part_id) REFERENCES authored_revision_private_part(revision_id,part_id) DEFERRABLE INITIALLY DEFERRED;
CREATE FUNCTION authored_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Published revision content is immutable'; END $$;
CREATE TRIGGER authored_revision_immutable BEFORE UPDATE OR DELETE ON authored_revision FOR EACH ROW EXECUTE FUNCTION authored_immutable();
CREATE TRIGGER authored_revision_part_immutable BEFORE UPDATE OR DELETE ON authored_revision_part FOR EACH ROW EXECUTE FUNCTION authored_immutable();
CREATE TRIGGER authored_revision_private_immutable BEFORE UPDATE OR DELETE ON authored_revision_private_part FOR EACH ROW EXECUTE FUNCTION authored_immutable();
-- Construct parts/keys first in the publication transaction; the revision insert seals them.
CREATE FUNCTION authored_revision_sealed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.revision_id::text,0));
 IF EXISTS(SELECT 1 FROM authored_revision WHERE id=NEW.revision_id) THEN
  RAISE EXCEPTION 'Cannot add parts or keys to an existing revision';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER authored_revision_part_sealed BEFORE INSERT ON authored_revision_part FOR EACH ROW EXECUTE FUNCTION authored_revision_sealed();
CREATE TRIGGER authored_revision_private_sealed BEFORE INSERT ON authored_revision_private_part FOR EACH ROW EXECUTE FUNCTION authored_revision_sealed();

-- A final revision seals the exact relational part map represented by its document.
CREATE FUNCTION authored_revision_parts_match() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mismatched boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text,0));
 -- Compare canonical UUID/mode pairs in both directions; counts alone miss [A,A] vs {A,B}.
 WITH document_parts AS (
  SELECT (p->>'id')::uuid AS id, p->>'answerMode' AS answer_mode
  FROM jsonb_array_elements(NEW.content->'sections') s
  CROSS JOIN LATERAL jsonb_array_elements(s->'parts') p
 ), relational_parts AS (
  SELECT part_id AS id, answer_mode FROM authored_revision_part WHERE revision_id=NEW.id
 )
 SELECT NOT EXISTS (SELECT 1 FROM document_parts)
  OR EXISTS (SELECT 1 FROM document_parts WHERE id IS NULL OR answer_mode IS NULL)
  OR EXISTS (SELECT 1 FROM document_parts GROUP BY id HAVING count(*)>1)
  OR EXISTS (SELECT * FROM document_parts EXCEPT SELECT * FROM relational_parts)
  OR EXISTS (SELECT * FROM relational_parts EXCEPT SELECT * FROM document_parts)
 INTO mismatched;
 IF mismatched THEN RAISE EXCEPTION 'Revision document and relational parts disagree'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER authored_revision_parts_match BEFORE INSERT ON authored_revision FOR EACH ROW EXECUTE FUNCTION authored_revision_parts_match();

-- A concurrent transaction cannot attach rows prepared before a revision was sealed.
CREATE FUNCTION authored_revision_same_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE same_transaction boolean;
BEGIN
 EXECUTE format('SELECT r.xmin=c.xmin FROM authored_revision r JOIN %I c ON c.revision_id=r.id WHERE c.revision_id=$1 AND c.part_id=$2',TG_TABLE_NAME)
 INTO same_transaction USING NEW.revision_id,NEW.part_id;
 IF same_transaction IS DISTINCT FROM true THEN RAISE EXCEPTION 'Revision parts and keys must be created in the revision transaction'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER authored_revision_part_transaction AFTER INSERT ON authored_revision_part DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION authored_revision_same_transaction();
CREATE CONSTRAINT TRIGGER authored_revision_private_transaction AFTER INSERT ON authored_revision_private_part DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION authored_revision_same_transaction();

-- END CANONICAL migrations/0001_problem_authoring.up.sql
INSERT INTO public.physcratic_production_migrations(id,sha256,source_commit,result) VALUES('0001_problem_authoring','83ec2e53f95829aa6932a327dfd0362a3c197e190ddbcfb00a67d24a05c93d09','2c35d61a5fcf6680a4054380a4bfcff1b71bc9e6','verified');

-- BEGIN CANONICAL migrations/0002_authored_write_limit.up.sql sha256=c10cd7ecb9d6da65e0e95012a7dd199edac02e7a54b4fc8de86bb6c59bdc553b
-- Apply explicitly in a reviewed transaction after 0001; no startup/build migration.
-- One fixed-window bucket per user, bounded storage and atomic cross-instance updates.
CREATE TABLE authored_write_limit (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL,
 requests integer NOT NULL CHECK(requests>0)
);

-- END CANONICAL migrations/0002_authored_write_limit.up.sql
INSERT INTO public.physcratic_production_migrations(id,sha256,source_commit,result) VALUES('0002_authored_write_limit','c10cd7ecb9d6da65e0e95012a7dd199edac02e7a54b4fc8de86bb6c59bdc553b','2c35d61a5fcf6680a4054380a4bfcff1b71bc9e6','verified');

-- BEGIN CANONICAL migrations/0003_author_media.up.sql sha256=db4e91998388dafd964507571fc408f2f74fdd8b1af466469674911dc4b6db3a
-- Explicit, additive migration after 0002. All physical blobs remain private.
CREATE TABLE author_media (
 id uuid PRIMARY KEY, problem_id uuid NOT NULL REFERENCES authored_problem(id) ON DELETE RESTRICT,
 purpose text NOT NULL CHECK(purpose IN ('statement-image','solution-image','statement-pdf','solution-pdf')),
 pathname text NOT NULL UNIQUE, filename text NOT NULL,
 media_type text NOT NULL CHECK(media_type IN ('image/png','image/jpeg','image/webp','application/pdf')),
 bytes integer NOT NULL CHECK(bytes>0 AND bytes<=3145728), sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','ready','deleting')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,problem_id,purpose),
 CHECK((purpose IN ('statement-pdf','solution-pdf'))=(media_type='application/pdf'))
);
CREATE INDEX author_media_problem_idx ON author_media(problem_id);
CREATE INDEX author_media_cleanup_idx ON author_media(state,created_at);
CREATE TABLE author_media_usage (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 day date NOT NULL, attempts integer NOT NULL CHECK(attempts>0 AND attempts<=31)
);
CREATE TABLE author_draft_media (
 problem_id uuid NOT NULL REFERENCES authored_draft(problem_id) ON DELETE CASCADE,
 media_id uuid NOT NULL, purpose text NOT NULL,
 PRIMARY KEY(problem_id,media_id),
 FOREIGN KEY(media_id,problem_id,purpose) REFERENCES author_media(id,problem_id,purpose) ON DELETE RESTRICT
);
CREATE INDEX author_draft_media_media_idx ON author_draft_media(media_id);
CREATE TABLE author_revision_media (
 revision_id uuid NOT NULL, problem_id uuid NOT NULL, media_id uuid NOT NULL, purpose text NOT NULL,
 PRIMARY KEY(revision_id,media_id),
 FOREIGN KEY(problem_id,revision_id) REFERENCES authored_revision(problem_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(media_id,problem_id,purpose) REFERENCES author_media(id,problem_id,purpose) ON DELETE RESTRICT
);
CREATE INDEX author_revision_media_media_idx ON author_revision_media(media_id);
CREATE TRIGGER author_revision_media_immutable BEFORE UPDATE OR DELETE ON author_revision_media FOR EACH ROW EXECUTE FUNCTION authored_immutable();
CREATE TRIGGER author_draft_media_no_update BEFORE UPDATE ON author_draft_media FOR EACH ROW EXECUTE FUNCTION authored_immutable();
CREATE TRIGGER author_revision_media_sealed BEFORE INSERT ON author_revision_media FOR EACH ROW EXECUTE FUNCTION authored_revision_sealed();
CREATE FUNCTION author_media_reference_ready() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_state text;
BEGIN
 SELECT state INTO current_state FROM author_media WHERE id=NEW.media_id AND problem_id=NEW.problem_id AND purpose=NEW.purpose FOR UPDATE;
 IF current_state IS DISTINCT FROM 'ready' THEN RAISE EXCEPTION 'Media is unavailable for reference'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER author_draft_media_ready BEFORE INSERT ON author_draft_media FOR EACH ROW EXECUTE FUNCTION author_media_reference_ready();
CREATE TRIGGER author_revision_media_ready BEFORE INSERT ON author_revision_media FOR EACH ROW EXECUTE FUNCTION author_media_reference_ready();
CREATE FUNCTION author_media_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.problem_id,NEW.purpose,NEW.pathname,NEW.filename,NEW.media_type,NEW.bytes,NEW.sha256) IS DISTINCT FROM ROW(OLD.id,OLD.problem_id,OLD.purpose,OLD.pathname,OLD.filename,OLD.media_type,OLD.bytes,OLD.sha256)
  THEN RAISE EXCEPTION 'Media identity and content are immutable'; END IF;
  IF (OLD.state='deleting' AND NEW.state<>'deleting') OR (OLD.state='ready' AND NEW.state='pending') THEN RAISE EXCEPTION 'Invalid media lifecycle transition'; END IF;
 END IF;
 IF TG_OP='DELETE' OR NEW.state='deleting' THEN
  IF EXISTS(SELECT 1 FROM author_draft_media WHERE media_id=OLD.id) OR EXISTS(SELECT 1 FROM author_revision_media WHERE media_id=OLD.id)
  THEN RAISE EXCEPTION 'Referenced media must be retained'; END IF;
  IF TG_OP='DELETE' AND OLD.state<>'deleting' THEN RAISE EXCEPTION 'Media must be retired before deletion'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER author_media_guard BEFORE UPDATE OR DELETE ON author_media FOR EACH ROW EXECUTE FUNCTION author_media_guard();
CREATE FUNCTION author_revision_media_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE matches boolean;
BEGIN
 SELECT r.xmin=m.xmin INTO matches FROM authored_revision r JOIN author_revision_media m ON m.revision_id=r.id WHERE m.revision_id=NEW.revision_id AND m.media_id=NEW.media_id;
 IF matches IS DISTINCT FROM true THEN RAISE EXCEPTION 'Media bindings must share the revision transaction'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER author_revision_media_transaction AFTER INSERT ON author_revision_media DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION author_revision_media_transaction();
-- Seal exactly all attachment/private-image references, so cleanup can never
-- overlook an object used by an immutable historical revision.
CREATE FUNCTION author_revision_media_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mismatch boolean;
BEGIN
 WITH document_refs AS (
  SELECT (a->>'id')::uuid AS id,a->>'purpose' AS purpose FROM jsonb_array_elements(coalesce(NEW.content->'attachments','[]'::jsonb)) a
  UNION
  SELECT (b #>> '{}')::uuid,'statement-image' FROM jsonb_path_query(NEW.content,'$.** ? (@.kind == "image").mediaId') b
  UNION
  SELECT (b->>'mediaId')::uuid,'solution-image' FROM authored_revision_private_part k
   CROSS JOIN LATERAL jsonb_array_elements(coalesce(k.data->'hints','[]'::jsonb)||coalesce(k.data->'solution','[]'::jsonb)) b
   WHERE k.revision_id=NEW.id AND b->>'kind'='image'
 ), bindings AS (SELECT media_id AS id,purpose FROM author_revision_media WHERE revision_id=NEW.id)
 SELECT EXISTS(SELECT * FROM document_refs EXCEPT SELECT * FROM bindings) OR EXISTS(SELECT * FROM bindings EXCEPT SELECT * FROM document_refs) INTO mismatch;
 IF mismatch THEN RAISE EXCEPTION 'Revision media bindings are incomplete'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER author_revision_media_complete BEFORE INSERT ON authored_revision FOR EACH ROW EXECUTE FUNCTION author_revision_media_complete();

-- END CANONICAL migrations/0003_author_media.up.sql
INSERT INTO public.physcratic_production_migrations(id,sha256,source_commit,result) VALUES('0003_author_media','db4e91998388dafd964507571fc408f2f74fdd8b1af466469674911dc4b6db3a','2c35d61a5fcf6680a4054380a4bfcff1b71bc9e6','verified');

-- BEGIN CANONICAL migrations/0004_authored_attempts.up.sql sha256=e52abd4fa47e2c8abdc609fdc79c32c2f78a284df90b859463ae217abed7e423
-- Explicit additive migration after 0003. No startup/build application hook.
CREATE TABLE authored_student_rate (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL, requests integer NOT NULL CHECK(requests BETWEEN 1 AND 61),
 submissions integer NOT NULL CHECK(submissions BETWEEN 0 AND 21)
);
CREATE TABLE authored_attempt (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 problem_id uuid NOT NULL, revision_id uuid NOT NULL, part_id uuid NOT NULL,
 idempotency_key uuid NOT NULL, answer jsonb NOT NULL,
 status text NOT NULL, reason text NOT NULL,
 engine_version text NOT NULL CHECK(engine_version IN ('numeric-v1','symbolic-v1')),
 attempt_number bigint NOT NULL CHECK(attempt_number > 0),
 spoiler_policy text NOT NULL DEFAULT 'no-reveal-v1' CHECK(spoiler_policy='no-reveal-v1'),
 assisted boolean NOT NULL DEFAULT false CHECK(assisted=false),
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 -- Ordinal uniqueness prevents duplicate numbering; it is not an attempt cap.
 UNIQUE(user_id,idempotency_key), UNIQUE(user_id,revision_id,part_id,attempt_number),
 FOREIGN KEY(problem_id,revision_id) REFERENCES authored_revision(problem_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(revision_id,part_id) REFERENCES authored_revision_part(revision_id,part_id) ON DELETE RESTRICT,
 CHECK((jsonb_typeof(answer)='object' AND octet_length(answer::text)<=20000 AND CASE answer->>'kind'
  WHEN 'numeric' THEN answer-ARRAY['kind','value','units']='{}'::jsonb AND jsonb_typeof(answer->'value')='number' AND abs((answer->>'value')::numeric)<=1.7976931348623157e308 AND jsonb_typeof(answer->'units')='string' AND length(answer->>'units')<=80
  WHEN 'expression' THEN answer-ARRAY['kind','expression']='{}'::jsonb AND jsonb_typeof(answer->'expression')='string' AND length(answer->>'expression') BETWEEN 1 AND 180
  WHEN 'manual' THEN answer-ARRAY['kind','text']='{}'::jsonb AND jsonb_typeof(answer->'text')='string' AND length(answer->>'text')<=4000
  ELSE false END) IS TRUE),
 CHECK((status='correct' AND reason IN ('within-tolerance','symbolic-equivalent'))
  OR (status='incorrect' AND reason IN ('outside-tolerance','symbolic-counterexample'))
  OR (status='needs-review' AND reason IN ('units-unsupported','units-mismatch','answer-mode-unsupported','key-unavailable','service-unavailable','symbolic-unsupported','symbolic-domain','symbolic-resource-limit','symbolic-inconclusive'))
  OR (status='ungraded' AND reason IN ('invalid-input','not-authorized','revision-unavailable','manual')))
);
CREATE INDEX authored_attempt_history_idx ON authored_attempt(user_id,created_at DESC,id DESC);
CREATE INDEX authored_attempt_problem_idx ON authored_attempt(user_id,problem_id,created_at DESC,id DESC);
CREATE INDEX authored_attempt_revision_idx ON authored_attempt(revision_id,part_id);
CREATE FUNCTION authored_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_revision uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Authored attempts are immutable'; END IF;
 SELECT published_revision_id INTO current_revision FROM authored_problem WHERE id=NEW.problem_id AND state='published' FOR SHARE;
 IF current_revision IS NULL OR current_revision<>NEW.revision_id THEN RAISE EXCEPTION 'Attempt requires the current published revision'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER authored_attempt_guard BEFORE INSERT OR UPDATE OR DELETE ON authored_attempt FOR EACH ROW EXECUTE FUNCTION authored_attempt_guard();

-- END CANONICAL migrations/0004_authored_attempts.up.sql
INSERT INTO public.physcratic_production_migrations(id,sha256,source_commit,result) VALUES('0004_authored_attempts','e52abd4fa47e2c8abdc609fdc79c32c2f78a284df90b859463ae217abed7e423','2c35d61a5fcf6680a4054380a4bfcff1b71bc9e6','verified');

-- BEGIN CANONICAL migrations/0005_authored_solution_access.up.sql sha256=65dfc1a1137cf963b7e579931fde6d8c315d0bfb8dbd6c465a8cc70d741335e4
-- Additive Phase 6C-A. No old solution content or historical attempt is changed.
CREATE TABLE authored_solution_permission (
 problem_id uuid NOT NULL, revision_id uuid NOT NULL, part_id uuid NOT NULL,
 approved_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 authorization_id uuid NOT NULL UNIQUE, version integer NOT NULL CHECK(version>0),
 enabled boolean NOT NULL DEFAULT false, expires_at timestamptz(3),
 updated_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(revision_id,part_id), UNIQUE(revision_id,part_id,authorization_id),
 FOREIGN KEY(problem_id,revision_id) REFERENCES authored_revision(problem_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(revision_id,part_id) REFERENCES authored_revision_part(revision_id,part_id) ON DELETE RESTRICT,
 CHECK(enabled OR expires_at IS NULL)
);
CREATE TABLE authored_solution_permission_media (
 revision_id uuid NOT NULL, part_id uuid NOT NULL, authorization_id uuid NOT NULL,
 media_id uuid NOT NULL, PRIMARY KEY(revision_id,part_id,media_id),
 FOREIGN KEY(revision_id,part_id,authorization_id) REFERENCES authored_solution_permission(revision_id,part_id,authorization_id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(revision_id,media_id) REFERENCES author_revision_media(revision_id,media_id) ON DELETE RESTRICT
);
CREATE TABLE authored_solution_reveal (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 problem_id uuid NOT NULL, revision_id uuid NOT NULL, part_id uuid NOT NULL,
 authorization_id uuid NOT NULL,
 policy text NOT NULL DEFAULT 'explicit-solution-v1' CHECK(policy='explicit-solution-v1'),
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(user_id,revision_id,part_id,authorization_id),
 FOREIGN KEY(problem_id,revision_id) REFERENCES authored_revision(problem_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(revision_id,part_id) REFERENCES authored_revision_part(revision_id,part_id) ON DELETE RESTRICT
);
-- The unique user/revision/part/generation index also serves assistance EXISTS.
CREATE INDEX authored_solution_reveal_authorization_idx ON authored_solution_reveal(authorization_id);
CREATE FUNCTION authored_solution_permission_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p authored_problem;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Revoke solution permissions rather than deleting them'; END IF;
 SELECT * INTO p FROM authored_problem WHERE id=NEW.problem_id FOR UPDATE;
 IF p.owner_id IS DISTINCT FROM NEW.approved_by THEN RAISE EXCEPTION 'Permission requires problem owner'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (NEW.problem_id,NEW.revision_id,NEW.part_id,NEW.approved_by) IS DISTINCT FROM (OLD.problem_id,OLD.revision_id,OLD.part_id,OLD.approved_by)
   OR OLD.version=2147483647 OR NEW.version<>OLD.version+1 OR NEW.authorization_id=OLD.authorization_id
  THEN RAISE EXCEPTION 'Permission requires a new authorization generation and version'; END IF;
 ELSE
  IF NEW.version<>1 THEN RAISE EXCEPTION 'Initial permission version must be one'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM authored_solution_reveal WHERE authorization_id=NEW.authorization_id) THEN RAISE EXCEPTION 'Do not reuse a revealed authorization generation'; END IF;
 IF NEW.enabled AND (p.state<>'published' OR p.published_revision_id IS DISTINCT FROM NEW.revision_id OR (NEW.expires_at IS NOT NULL AND NEW.expires_at<=clock_timestamp())) THEN RAISE EXCEPTION 'Permission requires current publication and future expiry'; END IF;
 NEW.updated_at:=clock_timestamp(); RETURN NEW;
END $$;
CREATE TRIGGER authored_solution_permission_guard BEFORE INSERT OR UPDATE OR DELETE ON authored_solution_permission FOR EACH ROW EXECUTE FUNCTION authored_solution_permission_guard();
CREATE FUNCTION authored_solution_media_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE perm authored_solution_permission; rid uuid; pid uuid; aid uuid; mid uuid;
BEGIN
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Replace permission media bindings'; END IF;
 IF TG_OP='DELETE' THEN rid:=OLD.revision_id;pid:=OLD.part_id;aid:=OLD.authorization_id;mid:=OLD.media_id;
 ELSE rid:=NEW.revision_id;pid:=NEW.part_id;aid:=NEW.authorization_id;mid:=NEW.media_id; END IF;
 -- Author operations always lock parent before permission; never acquire a student lock here.
 PERFORM 1 FROM authored_problem p JOIN authored_revision r ON r.problem_id=p.id WHERE r.id=rid FOR UPDATE OF p;
 SELECT * INTO perm FROM authored_solution_permission WHERE revision_id=rid AND part_id=pid FOR UPDATE;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF perm.enabled IS DISTINCT FROM true OR perm.authorization_id IS DISTINCT FROM aid THEN RAISE EXCEPTION 'Media requires active matching permission'; END IF;
 IF NOT EXISTS(SELECT 1 FROM author_revision_media rm JOIN author_media m ON m.id=rm.media_id AND m.problem_id=rm.problem_id AND m.purpose=rm.purpose
  WHERE rm.revision_id=rid AND rm.problem_id=perm.problem_id AND rm.media_id=mid AND m.state='ready' AND
   (rm.purpose='solution-pdf' OR (rm.purpose='solution-image' AND EXISTS(SELECT 1 FROM authored_revision_private_part k,
    LATERAL jsonb_array_elements(k.data->'solution') b WHERE k.revision_id=rid AND k.part_id=pid AND b->>'kind'='image' AND b->>'mediaId'=mid::text))))
 THEN RAISE EXCEPTION 'Media must belong to this revision and worked solution'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER authored_solution_media_guard BEFORE INSERT OR UPDATE OR DELETE ON authored_solution_permission_media FOR EACH ROW EXECUTE FUNCTION authored_solution_media_guard();
CREATE FUNCTION authored_solution_reveal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_revision uuid; perm authored_solution_permission;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Solution reveal records are immutable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('authored-student:'||NEW.user_id,6));
 SELECT published_revision_id INTO current_revision FROM authored_problem WHERE id=NEW.problem_id AND state='published' FOR SHARE;
 IF current_revision IS DISTINCT FROM NEW.revision_id THEN RAISE EXCEPTION 'Reveal requires current published revision'; END IF;
 SELECT * INTO perm FROM authored_solution_permission WHERE revision_id=NEW.revision_id AND part_id=NEW.part_id FOR SHARE;
 IF perm.enabled IS DISTINCT FROM true OR perm.authorization_id IS DISTINCT FROM NEW.authorization_id OR (perm.expires_at IS NOT NULL AND perm.expires_at<=clock_timestamp()) THEN RAISE EXCEPTION 'Reveal requires current explicit authorization'; END IF;
 NEW.created_at:=clock_timestamp(); RETURN NEW;
END $$;
CREATE TRIGGER authored_solution_reveal_guard BEFORE INSERT OR UPDATE OR DELETE ON authored_solution_reveal FOR EACH ROW EXECUTE FUNCTION authored_solution_reveal_guard();
ALTER TABLE authored_attempt DROP CONSTRAINT authored_attempt_assisted_check;
CREATE OR REPLACE FUNCTION authored_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_revision uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Authored attempts are immutable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('authored-student:'||NEW.user_id,6));
 SELECT published_revision_id INTO current_revision FROM authored_problem WHERE id=NEW.problem_id AND state='published' FOR SHARE;
 IF current_revision IS NULL OR current_revision<>NEW.revision_id THEN RAISE EXCEPTION 'Attempt requires the current published revision'; END IF;
 -- Conservative multipart policy: any committed reveal on this revision assists ALL later parts.
 -- This survives revocation/expiry; no historical attempt is rewritten. Never trust client flags.
 NEW.assisted:=EXISTS(SELECT 1 FROM authored_solution_reveal WHERE user_id=NEW.user_id AND revision_id=NEW.revision_id);
 RETURN NEW;
END $$;

-- END CANONICAL migrations/0005_authored_solution_access.up.sql
INSERT INTO public.physcratic_production_migrations(id,sha256,source_commit,result) VALUES('0005_authored_solution_access','65dfc1a1137cf963b7e579931fde6d8c315d0bfb8dbd6c465a8cc70d741335e4','2c35d61a5fcf6680a4054380a4bfcff1b71bc9e6','verified');

-- BEGIN CANONICAL migrations/0006_authored_discovery.up.sql sha256=3ed763699a4e58512604fe6b738dc7e8440c1f2291501e1c29fa2da07dd8a37f
-- Explicit, additive discovery indexes only; no content is imported or published.
-- Search only the public metadata also selected by the discovery serializer.
CREATE FUNCTION authored_discovery_terms(document jsonb) RETURNS tsvector
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT to_tsvector('simple'::regconfig,
    coalesce(document->>'title','') || ' ' ||
    coalesce((document->'topicTags')::text,'') || ' ' ||
    coalesce((document->'methodTags')::text,'') || ' ' ||
    coalesce(document->>'estimatedDifficulty','') || ' ' ||
    coalesce(document->'provenance'->>'source',''))
$$;
CREATE INDEX authored_problem_discovery_idx ON authored_problem(id) WHERE state='published';
CREATE INDEX authored_revision_discovery_search_idx ON authored_revision USING gin(authored_discovery_terms(content));
CREATE INDEX authored_revision_discovery_metadata_idx ON authored_revision USING gin(content jsonb_path_ops);
CREATE INDEX authored_revision_discovery_difficulty_idx ON authored_revision((content->>'estimatedDifficulty'));

-- END CANONICAL migrations/0006_authored_discovery.up.sql
INSERT INTO public.physcratic_production_migrations(id,sha256,source_commit,result) VALUES('0006_authored_discovery','3ed763699a4e58512604fe6b738dc7e8440c1f2291501e1c29fa2da07dd8a37f','2c35d61a5fcf6680a4054380a4bfcff1b71bc9e6','verified');

SET LOCAL search_path=pg_catalog,public;
DO $post$ DECLARE h text; actual_legacy jsonb; BEGIN
 IF (jsonb_build_object('account',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."account" r),'archive_progress',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."archive_progress" r),'coaching_inquiry',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."coaching_inquiry" r),'contest',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."contest" r),'contest_rating',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."contest_rating" r),'contest_registration',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."contest_registration" r),'individual_rating',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."individual_rating" r),'individual_rating_event',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."individual_rating_event" r),'practice_attempt',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."practice_attempt" r),'problem_rating',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."problem_rating" r),'session',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."session" r),'solution_attempt',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."solution_attempt" r),'solution_check',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."solution_check" r),'solution_evidence',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."solution_evidence" r),'user',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."user" r),'verification',(SELECT jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex')) FROM public."verification" r)))<>current_setting('physcratic.before_fingerprints')::jsonb THEN RAISE EXCEPTION 'LEGACY_RECORD_PRESERVATION_FAILED'; END IF;
 SELECT encode(sha256(convert_to((report->'catalog')::text,'UTF8')),'hex') INTO h FROM(-- SELECT-only catalog inspection. Run inside an explicitly READ ONLY transaction.
-- No application records, connection strings or credential settings are selected.
WITH owned AS (
 SELECT c.oid,c.relname FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
 AND c.relname ~ '^(authored_|author_media($|_)|author_draft_media($|_)|author_revision_media($|_))'
), tables AS (
 SELECT c.relname AS name,c.relkind::text AS kind,c.relpersistence::text AS persistence,
 c.relrowsecurity AS rls,c.relforcerowsecurity AS force_rls
 FROM pg_catalog.pg_class c JOIN owned o ON o.oid=c.oid
), columns AS (
 SELECT o.relname AS relation,a.attnum AS position,a.attname AS name,
 pg_catalog.format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS not_null,
 pg_catalog.pg_get_expr(d.adbin,d.adrelid,false) AS default_expression,
 a.attidentity::text AS identity,a.attgenerated::text AS generated
 FROM owned o JOIN pg_catalog.pg_attribute a ON a.attrelid=o.oid
 LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
 WHERE a.attnum>0 AND NOT a.attisdropped
), constraints AS (
 SELECT o.relname AS relation,c.conname AS name,c.contype::text AS type,
 pg_catalog.pg_get_constraintdef(c.oid,false) AS definition,
 c.condeferrable AS deferrable,c.condeferred AS initially_deferred,c.convalidated AS validated
 FROM owned o JOIN pg_catalog.pg_constraint c ON c.conrelid=o.oid
), indexes AS (
 SELECT o.relname AS relation,c.relname AS name,
 pg_catalog.pg_get_indexdef(i.indexrelid,0,false) AS definition,
 i.indisvalid AS valid,i.indisready AS ready,i.indisunique AS unique_index,
 i.indisprimary AS primary_index,i.indimmediate AS immediate
 FROM owned o JOIN pg_catalog.pg_index i ON i.indrelid=o.oid
 JOIN pg_catalog.pg_class c ON c.oid=i.indexrelid
), triggers AS (
 SELECT o.relname AS relation,t.tgname AS name,t.tgenabled::text AS enabled,
 pg_catalog.pg_get_triggerdef(t.oid,false) AS definition
 FROM owned o JOIN pg_catalog.pg_trigger t ON t.tgrelid=o.oid WHERE NOT t.tgisinternal
), functions AS (
 SELECT p.proname AS name,pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
 pg_catalog.pg_get_functiondef(p.oid) AS definition,p.prosecdef AS security_definer,
 p.provolatile::text AS volatility,p.proparallel::text AS parallel,p.proconfig AS configuration
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind='f'
 AND p.proname ~ '^(authored_|author_media|author_revision_media|author_draft_media)'
), policies AS (
 SELECT o.relname AS relation,p.polname AS name,p.polcmd::text AS command,p.polpermissive AS permissive,
 pg_catalog.pg_get_expr(p.polqual,p.polrelid,false) AS using_expression,
 pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid,false) AS check_expression
 FROM owned o JOIN pg_catalog.pg_policy p ON p.polrelid=o.oid
)
SELECT jsonb_build_object(
 'identity',jsonb_build_object('database',current_database(),'server_version',current_setting('server_version'),
   'server_version_num',current_setting('server_version_num')::integer,'current_user',current_user,
   'session_user',session_user,'current_schema',current_schema(),'read_only',current_setting('transaction_read_only'),
   'isolation',current_setting('transaction_isolation'),'replication_role',current_setting('session_replication_role'),'search_path',current_setting('search_path'),
   'server_address',inet_server_addr()::text,'server_port',inet_server_port(),'observed_at',transaction_timestamp()),
 'schemas',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
   'usage',has_schema_privilege(n.oid,'USAGE'),'create',has_schema_privilege(n.oid,'CREATE')) ORDER BY n.nspname),'[]'::jsonb)
   FROM pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'),
 'role',(SELECT jsonb_build_object('superuser',rolsuper,'bypass_rls',rolbypassrls,'create_db',rolcreatedb,
   'create_role',rolcreaterole,'replication',rolreplication) FROM pg_roles WHERE rolname=current_user),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'oid',c.oid::text,'kind',c.relkind,
   'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
   'rls_active',CASE WHEN c.relkind IN ('r','p') THEN row_security_active(c.oid) ELSE false END,
   'can_select',has_table_privilege(c.oid,'SELECT'),
   'has_inheritance',EXISTS(SELECT 1 FROM pg_inherits h WHERE h.inhrelid=c.oid OR h.inhparent=c.oid)) ORDER BY c.relname),'[]'::jsonb)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')),
 'auth_columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'name',a.attname,
   'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull) ORDER BY c.relname,a.attnum),'[]'::jsonb)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
   WHERE n.nspname='public' AND c.relname IN ('user','account','session','verification') AND a.attnum>0 AND NOT a.attisdropped),
 'ledger_columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
   'not_null',a.attnotnull,'default_expression',pg_get_expr(d.adbin,d.adrelid,false)) ORDER BY a.attnum),'[]'::jsonb)
   FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
   WHERE a.attrelid=to_regclass('public.physcratic_integration_migrations') AND a.attnum>0 AND NOT a.attisdropped),
 'ledger_constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('type',c.contype,'definition',pg_get_constraintdef(c.oid,false)) ORDER BY c.contype,pg_get_constraintdef(c.oid,false)),'[]'::jsonb)
   FROM pg_constraint c WHERE c.conrelid=to_regclass('public.physcratic_integration_migrations')),
 'public_constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',r.relname,'name',c.conname,'type',c.contype,
   'definition',pg_get_constraintdef(c.oid,false),'validated',c.convalidated) ORDER BY r.relname,c.conname),'[]'::jsonb)
   FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public'),
 'public_indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',r.relname,'name',x.relname,
   'definition',pg_get_indexdef(i.indexrelid,0,false),'valid',i.indisvalid,'ready',i.indisready) ORDER BY r.relname,x.relname),'[]'::jsonb)
   FROM pg_index i JOIN pg_class r ON r.oid=i.indrelid JOIN pg_namespace n ON n.oid=r.relnamespace JOIN pg_class x ON x.oid=i.indexrelid WHERE n.nspname='public'),
 'public_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',r.relname,'name',t.tgname,
   'definition',pg_get_triggerdef(t.oid,false),'enabled',t.tgenabled) ORDER BY r.relname,t.tgname),'[]'::jsonb)
   FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal),
 'other_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),
   'language',l.lanname,'security_definer',p.prosecdef,'source_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')) ORDER BY p.proname,p.oid),'[]'::jsonb)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
   WHERE n.nspname='public' AND p.proname !~ '^(authored_|author_media|author_revision_media|author_draft_media)'),
 'foreign_key_health',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY relation,name),'[]'::jsonb) FROM (
   SELECT x.conrelid::regclass::text AS relation,x.conname AS name,count(t.oid)::integer AS trigger_count,
     coalesce(bool_and(t.tgenabled='O'),false) AS all_origin_enabled
   FROM pg_constraint x LEFT JOIN pg_trigger t ON t.tgconstraint=x.oid AND t.tgisinternal
   WHERE x.contype='f' AND (x.conrelid IN (SELECT oid FROM owned) OR x.confrelid IN (SELECT oid FROM owned))
   GROUP BY x.oid,x.conrelid,x.conname
 ) f),
 'catalog',jsonb_build_object(
   'tables',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY name),'[]'::jsonb) FROM tables t),
   'columns',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY relation,position),'[]'::jsonb) FROM columns t),
   'constraints',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY relation,name),'[]'::jsonb) FROM constraints t),
   'indexes',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY relation,name),'[]'::jsonb) FROM indexes t),
   'triggers',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY relation,name),'[]'::jsonb) FROM triggers t),
   'functions',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY name,arguments),'[]'::jsonb) FROM functions t),
   'policies',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY relation,name),'[]'::jsonb) FROM policies t)
 )) AS report)c;
 IF h<>'1861da3a0225efcd379feeb23383fbea804e4498ec35995fe0d8de90945fe293' THEN RAISE EXCEPTION 'CANONICAL_V6_CATALOG_MISMATCH'; END IF;
 SELECT jsonb_agg(elem ORDER BY elem->>'name') INTO actual_legacy FROM(-- Catalog only: no row values, credentials, temporary objects or state changes.
SELECT jsonb_build_object(
 'identity',jsonb_build_object('database',current_database(),'current_user',current_user,'session_user',session_user,'server_version_num',current_setting('server_version_num')::int,'read_only',current_setting('transaction_read_only'),'replication_role',current_setting('session_replication_role')),
 'database',(SELECT jsonb_build_object('encoding',pg_encoding_to_char(encoding),'collate',datcollate,'ctype',datctype,'provider',datlocprovider,'locale',datlocale,'collation_version',datcollversion) FROM pg_database WHERE datname=current_database()),
 'tables',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'name',c.relname,'owner',c.relowner::regrole::text,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
  'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
  'constraints',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',conname,'type',contype,'definition',pg_get_constraintdef(oid,false),'validated',convalidated) ORDER BY conname) FROM pg_constraint WHERE conrelid=c.oid),'[]'::jsonb),
  'indexes',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',i.relname,'definition',pg_get_indexdef(x.indexrelid),'valid',x.indisvalid,'ready',x.indisready,'constraint_index',EXISTS(SELECT 1 FROM pg_constraint k WHERE k.conindid=x.indexrelid)) ORDER BY i.relname) FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid WHERE x.indrelid=c.oid),'[]'::jsonb),
  'triggers',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',tgname,'definition',pg_get_triggerdef(oid,false),'enabled',tgenabled) ORDER BY tgname) FROM pg_trigger WHERE tgrelid=c.oid AND NOT tgisinternal),'[]'::jsonb)
 ) ORDER BY c.relname) FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN('r','p')),'[]'::jsonb),
 'functions',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid),'security_definer',p.prosecdef) ORDER BY p.proname,pg_get_function_identity_arguments(p.oid)) FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.pronamespace='public'::regnamespace AND p.prokind IN('f','p') AND l.lanname IN('sql','plpgsql')),'[]'::jsonb),
 'sequences',COALESCE((SELECT jsonb_agg(c.relname ORDER BY c.relname) FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='S'),'[]'::jsonb),
 'views',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'definition',pg_get_viewdef(c.oid,false)) ORDER BY c.relname) FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN('v','m')),'[]'::jsonb),
 'types',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',t.typname,'kind',t.typtype) ORDER BY t.typname) FROM pg_type t WHERE t.typnamespace='public'::regnamespace AND t.typtype IN('e','d')),'[]'::jsonb),
 'policies',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='public'),'[]'::jsonb)
) AS report)c CROSS JOIN LATERAL jsonb_array_elements(report->'tables')elem WHERE elem->>'name'=ANY(ARRAY['account','archive_progress','coaching_inquiry','contest','contest_rating','contest_registration','individual_rating','individual_rating_event','practice_attempt','problem_rating','session','solution_attempt','solution_check','solution_evidence','user','verification']);
 IF actual_legacy<>'[{"rls":false,"kind":"r","name":"account","owner":"neondb_owner","columns":[{"name":"id","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"accountId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"providerId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"userId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"accessToken","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"refreshToken","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"idToken","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"accessTokenExpiresAt","type":"timestamp without time zone","default":null,"identity":"","not_null":false,"generated":""},{"name":"refreshTokenExpiresAt","type":"timestamp without time zone","default":null,"identity":"","not_null":false,"generated":""},{"name":"scope","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"password","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"createdAt","type":"timestamp without time zone","default":"now()","identity":"","not_null":true,"generated":""},{"name":"updatedAt","type":"timestamp without time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"account_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX account_pkey ON public.account USING btree (id)","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"account_accountId_not_null","type":"n","validated":true,"definition":"NOT NULL \"accountId\""},{"name":"account_createdAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"createdAt\""},{"name":"account_id_not_null","type":"n","validated":true,"definition":"NOT NULL id"},{"name":"account_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (id)"},{"name":"account_providerId_not_null","type":"n","validated":true,"definition":"NOT NULL \"providerId\""},{"name":"account_updatedAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"updatedAt\""},{"name":"account_userId_fkey","type":"f","validated":true,"definition":"FOREIGN KEY (\"userId\") REFERENCES \"user\"(id) ON DELETE CASCADE"},{"name":"account_userId_not_null","type":"n","validated":true,"definition":"NOT NULL \"userId\""}]},{"rls":false,"kind":"r","name":"archive_progress","owner":"neondb_owner","columns":[{"name":"userId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"taskId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"reviewed","type":"boolean","default":"false","identity":"","not_null":true,"generated":""},{"name":"notes","type":"text","default":"''''::text","identity":"","not_null":true,"generated":""},{"name":"answer","type":"text","default":"''''::text","identity":"","not_null":true,"generated":""},{"name":"updatedAt","type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"archive_progress_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX archive_progress_pkey ON public.archive_progress USING btree (\"userId\", \"taskId\")","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"archive_progress_answer_not_null","type":"n","validated":true,"definition":"NOT NULL answer"},{"name":"archive_progress_notes_not_null","type":"n","validated":true,"definition":"NOT NULL notes"},{"name":"archive_progress_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (\"userId\", \"taskId\")"},{"name":"archive_progress_reviewed_not_null","type":"n","validated":true,"definition":"NOT NULL reviewed"},{"name":"archive_progress_taskId_not_null","type":"n","validated":true,"definition":"NOT NULL \"taskId\""},{"name":"archive_progress_updatedAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"updatedAt\""},{"name":"archive_progress_userId_not_null","type":"n","validated":true,"definition":"NOT NULL \"userId\""}]},{"rls":false,"kind":"r","name":"coaching_inquiry","owner":"neondb_owner","columns":[{"name":"id","type":"uuid","default":"gen_random_uuid()","identity":"","not_null":true,"generated":""},{"name":"pathway","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"audience","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"current_level","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"goals","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"contact","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"created_at","type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"coaching_inquiry_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX coaching_inquiry_pkey ON public.coaching_inquiry USING btree (id)","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"coaching_inquiry_audience_not_null","type":"n","validated":true,"definition":"NOT NULL audience"},{"name":"coaching_inquiry_contact_not_null","type":"n","validated":true,"definition":"NOT NULL contact"},{"name":"coaching_inquiry_created_at_not_null","type":"n","validated":true,"definition":"NOT NULL created_at"},{"name":"coaching_inquiry_current_level_not_null","type":"n","validated":true,"definition":"NOT NULL current_level"},{"name":"coaching_inquiry_goals_not_null","type":"n","validated":true,"definition":"NOT NULL goals"},{"name":"coaching_inquiry_id_not_null","type":"n","validated":true,"definition":"NOT NULL id"},{"name":"coaching_inquiry_pathway_not_null","type":"n","validated":true,"definition":"NOT NULL pathway"},{"name":"coaching_inquiry_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (id)"}]},{"rls":false,"kind":"r","name":"contest","owner":"neondb_owner","columns":[{"name":"id","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"name","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"description","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"startsAt","type":"timestamp with time zone","default":null,"identity":"","not_null":true,"generated":""},{"name":"durationMinutes","type":"integer","default":null,"identity":"","not_null":true,"generated":""},{"name":"published","type":"boolean","default":"false","identity":"","not_null":true,"generated":""},{"name":"rated","type":"boolean","default":"false","identity":"","not_null":true,"generated":""},{"name":"registrationOpen","type":"boolean","default":"false","identity":"","not_null":true,"generated":""},{"name":"problemIds","type":"jsonb","default":"''[]''::jsonb","identity":"","not_null":true,"generated":""},{"name":"creators","type":"jsonb","default":"''[]''::jsonb","identity":"","not_null":true,"generated":""},{"name":"createdAt","type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"contest_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX contest_pkey ON public.contest USING btree (id)","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"contest_createdAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"createdAt\""},{"name":"contest_creators_not_null","type":"n","validated":true,"definition":"NOT NULL creators"},{"name":"contest_description_not_null","type":"n","validated":true,"definition":"NOT NULL description"},{"name":"contest_durationMinutes_check","type":"c","validated":true,"definition":"CHECK ((\"durationMinutes\" > 0))"},{"name":"contest_durationMinutes_not_null","type":"n","validated":true,"definition":"NOT NULL \"durationMinutes\""},{"name":"contest_id_not_null","type":"n","validated":true,"definition":"NOT NULL id"},{"name":"contest_name_not_null","type":"n","validated":true,"definition":"NOT NULL name"},{"name":"contest_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (id)"},{"name":"contest_problemIds_not_null","type":"n","validated":true,"definition":"NOT NULL \"problemIds\""},{"name":"contest_published_not_null","type":"n","validated":true,"definition":"NOT NULL published"},{"name":"contest_rated_not_null","type":"n","validated":true,"definition":"NOT NULL rated"},{"name":"contest_registrationOpen_not_null","type":"n","validated":true,"definition":"NOT NULL \"registrationOpen\""},{"name":"contest_startsAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"startsAt\""}]},{"rls":false,"kind":"r","name":"contest_rating","owner":"neondb_owner","columns":[{"name":"id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"userId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"contestId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"publicHandle","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"rating","type":"integer","default":null,"identity":"","not_null":true,"generated":""},{"name":"change","type":"integer","default":null,"identity":"","not_null":true,"generated":""},{"name":"createdAt","type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"contest_rating_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX contest_rating_pkey ON public.contest_rating USING btree (id)","constraint_index":true},{"name":"contest_rating_userId_contestId_key","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX \"contest_rating_userId_contestId_key\" ON public.contest_rating USING btree (\"userId\", \"contestId\")","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"contest_rating_change_not_null","type":"n","validated":true,"definition":"NOT NULL change"},{"name":"contest_rating_contestId_not_null","type":"n","validated":true,"definition":"NOT NULL \"contestId\""},{"name":"contest_rating_createdAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"createdAt\""},{"name":"contest_rating_id_not_null","type":"n","validated":true,"definition":"NOT NULL id"},{"name":"contest_rating_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (id)"},{"name":"contest_rating_rating_check","type":"c","validated":true,"definition":"CHECK ((rating >= 0))"},{"name":"contest_rating_rating_not_null","type":"n","validated":true,"definition":"NOT NULL rating"},{"name":"contest_rating_userId_contestId_key","type":"u","validated":true,"definition":"UNIQUE (\"userId\", \"contestId\")"},{"name":"contest_rating_userId_not_null","type":"n","validated":true,"definition":"NOT NULL \"userId\""}]},{"rls":false,"kind":"r","name":"contest_registration","owner":"neondb_owner","columns":[{"name":"userId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"contestId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"createdAt","type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"contest_registration_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX contest_registration_pkey ON public.contest_registration USING btree (\"userId\", \"contestId\")","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"contest_registration_contestId_not_null","type":"n","validated":true,"definition":"NOT NULL \"contestId\""},{"name":"contest_registration_createdAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"createdAt\""},{"name":"contest_registration_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (\"userId\", \"contestId\")"},{"name":"contest_registration_userId_not_null","type":"n","validated":true,"definition":"NOT NULL \"userId\""}]},{"rls":false,"kind":"r","name":"individual_rating","owner":"neondb_owner","columns":[{"name":"userId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"rating","type":"integer","default":"1200","identity":"","not_null":true,"generated":""},{"name":"ratedAttempts","type":"integer","default":"0","identity":"","not_null":true,"generated":""},{"name":"updatedAt","type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"individual_rating_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX individual_rating_pkey ON public.individual_rating USING btree (\"userId\")","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"individual_rating_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (\"userId\")"},{"name":"individual_rating_ratedAttempts_check","type":"c","validated":true,"definition":"CHECK ((\"ratedAttempts\" >= 0))"},{"name":"individual_rating_ratedAttempts_not_null","type":"n","validated":true,"definition":"NOT NULL \"ratedAttempts\""},{"name":"individual_rating_rating_check","type":"c","validated":true,"definition":"CHECK (((rating >= 0) AND (rating <= 4000)))"},{"name":"individual_rating_rating_not_null","type":"n","validated":true,"definition":"NOT NULL rating"},{"name":"individual_rating_updatedAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"updatedAt\""},{"name":"individual_rating_userId_not_null","type":"n","validated":true,"definition":"NOT NULL \"userId\""}]},{"rls":false,"kind":"r","name":"individual_rating_event","owner":"neondb_owner","columns":[{"name":"id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"userId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"attemptId","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"problemId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"sourceVersion","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"ratingVersion","type":"integer","default":null,"identity":"","not_null":true,"generated":""},{"name":"problemRating","type":"integer","default":null,"identity":"","not_null":true,"generated":""},{"name":"beforeRating","type":"integer","default":null,"identity":"","not_null":true,"generated":""},{"name":"afterRating","type":"integer","default":null,"identity":"","not_null":true,"generated":""},{"name":"change","type":"integer","default":null,"identity":"","not_null":true,"generated":""},{"name":"score","type":"double precision","default":null,"identity":"","not_null":true,"generated":""},{"name":"expectedScore","type":"double precision","default":null,"identity":"","not_null":true,"generated":""},{"name":"kFactor","type":"integer","default":"32","identity":"","not_null":true,"generated":""},{"name":"createdAt","type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"individual_rating_event_attemptId_key","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX \"individual_rating_event_attemptId_key\" ON public.individual_rating_event USING btree (\"attemptId\")","constraint_index":true},{"name":"individual_rating_event_once","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX individual_rating_event_once ON public.individual_rating_event USING btree (\"userId\", \"problemId\")","constraint_index":true},{"name":"individual_rating_event_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX individual_rating_event_pkey ON public.individual_rating_event USING btree (id)","constraint_index":true},{"name":"individual_rating_event_user_created_idx","ready":true,"valid":true,"definition":"CREATE INDEX individual_rating_event_user_created_idx ON public.individual_rating_event USING btree (\"userId\", \"createdAt\" DESC)","constraint_index":false}],"triggers":[],"force_rls":false,"constraints":[{"name":"individual_rating_event_afterRating_check","type":"c","validated":true,"definition":"CHECK (((\"afterRating\" >= 0) AND (\"afterRating\" <= 4000)))"},{"name":"individual_rating_event_afterRating_not_null","type":"n","validated":true,"definition":"NOT NULL \"afterRating\""},{"name":"individual_rating_event_attemptId_key","type":"u","validated":true,"definition":"UNIQUE (\"attemptId\")"},{"name":"individual_rating_event_attemptId_not_null","type":"n","validated":true,"definition":"NOT NULL \"attemptId\""},{"name":"individual_rating_event_beforeRating_check","type":"c","validated":true,"definition":"CHECK (((\"beforeRating\" >= 0) AND (\"beforeRating\" <= 4000)))"},{"name":"individual_rating_event_beforeRating_not_null","type":"n","validated":true,"definition":"NOT NULL \"beforeRating\""},{"name":"individual_rating_event_change_not_null","type":"n","validated":true,"definition":"NOT NULL change"},{"name":"individual_rating_event_check","type":"c","validated":true,"definition":"CHECK ((change = (\"afterRating\" - \"beforeRating\")))"},{"name":"individual_rating_event_createdAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"createdAt\""},{"name":"individual_rating_event_expectedScore_check","type":"c","validated":true,"definition":"CHECK (((\"expectedScore\" >= (0)::double precision) AND (\"expectedScore\" <= (1)::double precision)))"},{"name":"individual_rating_event_expectedScore_not_null","type":"n","validated":true,"definition":"NOT NULL \"expectedScore\""},{"name":"individual_rating_event_id_not_null","type":"n","validated":true,"definition":"NOT NULL id"},{"name":"individual_rating_event_kFactor_check","type":"c","validated":true,"definition":"CHECK ((\"kFactor\" = 32))"},{"name":"individual_rating_event_kFactor_not_null","type":"n","validated":true,"definition":"NOT NULL \"kFactor\""},{"name":"individual_rating_event_once","type":"u","validated":true,"definition":"UNIQUE (\"userId\", \"problemId\")"},{"name":"individual_rating_event_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (id)"},{"name":"individual_rating_event_problemId_not_null","type":"n","validated":true,"definition":"NOT NULL \"problemId\""},{"name":"individual_rating_event_problemRating_check","type":"c","validated":true,"definition":"CHECK (((\"problemRating\" >= 0) AND (\"problemRating\" <= 4000)))"},{"name":"individual_rating_event_problemRating_not_null","type":"n","validated":true,"definition":"NOT NULL \"problemRating\""},{"name":"individual_rating_event_ratingVersion_check","type":"c","validated":true,"definition":"CHECK ((\"ratingVersion\" > 0))"},{"name":"individual_rating_event_ratingVersion_not_null","type":"n","validated":true,"definition":"NOT NULL \"ratingVersion\""},{"name":"individual_rating_event_score_check","type":"c","validated":true,"definition":"CHECK (((score >= (0)::double precision) AND (score <= (1)::double precision)))"},{"name":"individual_rating_event_score_not_null","type":"n","validated":true,"definition":"NOT NULL score"},{"name":"individual_rating_event_sourceVersion_not_null","type":"n","validated":true,"definition":"NOT NULL \"sourceVersion\""},{"name":"individual_rating_event_userId_not_null","type":"n","validated":true,"definition":"NOT NULL \"userId\""}]},{"rls":false,"kind":"r","name":"practice_attempt","owner":"neondb_owner","columns":[{"name":"id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"userId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"problemId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"idempotencyKey","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"answer","type":"double precision","default":null,"identity":"","not_null":true,"generated":""},{"name":"working","type":"text","default":"''''::text","identity":"","not_null":true,"generated":""},{"name":"correct","type":"boolean","default":null,"identity":"","not_null":true,"generated":""},{"name":"createdAt","type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"practice_attempt_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX practice_attempt_pkey ON public.practice_attempt USING btree (id)","constraint_index":true},{"name":"practice_attempt_userId_idempotencyKey_key","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX \"practice_attempt_userId_idempotencyKey_key\" ON public.practice_attempt USING btree (\"userId\", \"idempotencyKey\")","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"practice_attempt_answer_not_null","type":"n","validated":true,"definition":"NOT NULL answer"},{"name":"practice_attempt_correct_not_null","type":"n","validated":true,"definition":"NOT NULL correct"},{"name":"practice_attempt_createdAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"createdAt\""},{"name":"practice_attempt_id_not_null","type":"n","validated":true,"definition":"NOT NULL id"},{"name":"practice_attempt_idempotencyKey_not_null","type":"n","validated":true,"definition":"NOT NULL \"idempotencyKey\""},{"name":"practice_attempt_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (id)"},{"name":"practice_attempt_problemId_not_null","type":"n","validated":true,"definition":"NOT NULL \"problemId\""},{"name":"practice_attempt_userId_idempotencyKey_key","type":"u","validated":true,"definition":"UNIQUE (\"userId\", \"idempotencyKey\")"},{"name":"practice_attempt_userId_not_null","type":"n","validated":true,"definition":"NOT NULL \"userId\""},{"name":"practice_attempt_working_not_null","type":"n","validated":true,"definition":"NOT NULL working"}]},{"rls":false,"kind":"r","name":"problem_rating","owner":"neondb_owner","columns":[{"name":"problemId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"sourceVersion","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"rating","type":"integer","default":null,"identity":"","not_null":false,"generated":""},{"name":"ratingVersion","type":"integer","default":"1","identity":"","not_null":true,"generated":""},{"name":"ratedEnabled","type":"boolean","default":"false","identity":"","not_null":true,"generated":""},{"name":"checks","type":"jsonb","default":"''[]''::jsonb","identity":"","not_null":true,"generated":""},{"name":"reviewedBy","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"updatedAt","type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"problem_rating_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX problem_rating_pkey ON public.problem_rating USING btree (\"problemId\")","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"problem_rating_check","type":"c","validated":true,"definition":"CHECK (((NOT \"ratedEnabled\") OR ((rating IS NOT NULL) AND (\"reviewedBy\" IS NOT NULL) AND (jsonb_array_length(checks) > 0))))"},{"name":"problem_rating_checks_check","type":"c","validated":true,"definition":"CHECK ((jsonb_typeof(checks) = ''array''::text))"},{"name":"problem_rating_checks_not_null","type":"n","validated":true,"definition":"NOT NULL checks"},{"name":"problem_rating_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (\"problemId\")"},{"name":"problem_rating_problemId_not_null","type":"n","validated":true,"definition":"NOT NULL \"problemId\""},{"name":"problem_rating_ratedEnabled_not_null","type":"n","validated":true,"definition":"NOT NULL \"ratedEnabled\""},{"name":"problem_rating_ratingVersion_check","type":"c","validated":true,"definition":"CHECK ((\"ratingVersion\" > 0))"},{"name":"problem_rating_ratingVersion_not_null","type":"n","validated":true,"definition":"NOT NULL \"ratingVersion\""},{"name":"problem_rating_rating_check","type":"c","validated":true,"definition":"CHECK (((rating >= 0) AND (rating <= 4000)))"},{"name":"problem_rating_sourceVersion_check","type":"c","validated":true,"definition":"CHECK ((\"sourceVersion\" ~ ''^[a-f0-9]{64}$''::text))"},{"name":"problem_rating_sourceVersion_not_null","type":"n","validated":true,"definition":"NOT NULL \"sourceVersion\""},{"name":"problem_rating_updatedAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"updatedAt\""}]},{"rls":false,"kind":"r","name":"session","owner":"neondb_owner","columns":[{"name":"id","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"expiresAt","type":"timestamp without time zone","default":null,"identity":"","not_null":true,"generated":""},{"name":"token","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"createdAt","type":"timestamp without time zone","default":"now()","identity":"","not_null":true,"generated":""},{"name":"updatedAt","type":"timestamp without time zone","default":"now()","identity":"","not_null":true,"generated":""},{"name":"ipAddress","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"userAgent","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"userId","type":"text","default":null,"identity":"","not_null":true,"generated":""}],"indexes":[{"name":"session_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX session_pkey ON public.session USING btree (id)","constraint_index":true},{"name":"session_token_key","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX session_token_key ON public.session USING btree (token)","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"session_createdAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"createdAt\""},{"name":"session_expiresAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"expiresAt\""},{"name":"session_id_not_null","type":"n","validated":true,"definition":"NOT NULL id"},{"name":"session_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (id)"},{"name":"session_token_key","type":"u","validated":true,"definition":"UNIQUE (token)"},{"name":"session_token_not_null","type":"n","validated":true,"definition":"NOT NULL token"},{"name":"session_updatedAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"updatedAt\""},{"name":"session_userId_fkey","type":"f","validated":true,"definition":"FOREIGN KEY (\"userId\") REFERENCES \"user\"(id) ON DELETE CASCADE"},{"name":"session_userId_not_null","type":"n","validated":true,"definition":"NOT NULL \"userId\""}]},{"rls":false,"kind":"r","name":"solution_attempt","owner":"neondb_owner","columns":[{"name":"id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"userId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"problemId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"problemVersion","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"partId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"payload","type":"jsonb","default":null,"identity":"","not_null":true,"generated":""},{"name":"status","type":"text","default":"''awaiting-reference''::text","identity":"","not_null":true,"generated":""},{"name":"idempotencyKey","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"createdAt","type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"solution_attempt_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX solution_attempt_pkey ON public.solution_attempt USING btree (id)","constraint_index":true},{"name":"solution_attempt_userId_idempotencyKey_key","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX \"solution_attempt_userId_idempotencyKey_key\" ON public.solution_attempt USING btree (\"userId\", \"idempotencyKey\")","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"solution_attempt_createdAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"createdAt\""},{"name":"solution_attempt_id_not_null","type":"n","validated":true,"definition":"NOT NULL id"},{"name":"solution_attempt_idempotencyKey_not_null","type":"n","validated":true,"definition":"NOT NULL \"idempotencyKey\""},{"name":"solution_attempt_partId_not_null","type":"n","validated":true,"definition":"NOT NULL \"partId\""},{"name":"solution_attempt_payload_not_null","type":"n","validated":true,"definition":"NOT NULL payload"},{"name":"solution_attempt_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (id)"},{"name":"solution_attempt_problemId_not_null","type":"n","validated":true,"definition":"NOT NULL \"problemId\""},{"name":"solution_attempt_problemVersion_not_null","type":"n","validated":true,"definition":"NOT NULL \"problemVersion\""},{"name":"solution_attempt_status_check","type":"c","validated":true,"definition":"CHECK ((status = ''awaiting-reference''::text))"},{"name":"solution_attempt_status_not_null","type":"n","validated":true,"definition":"NOT NULL status"},{"name":"solution_attempt_userId_idempotencyKey_key","type":"u","validated":true,"definition":"UNIQUE (\"userId\", \"idempotencyKey\")"},{"name":"solution_attempt_userId_not_null","type":"n","validated":true,"definition":"NOT NULL \"userId\""}]},{"rls":false,"kind":"r","name":"solution_check","owner":"neondb_owner","columns":[{"name":"attemptId","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"userId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"problemId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"partId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"sourceVersion","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"ratingVersion","type":"integer","default":null,"identity":"","not_null":true,"generated":""},{"name":"matched","type":"boolean","default":null,"identity":"","not_null":true,"generated":""},{"name":"maxPoints","type":"double precision","default":null,"identity":"","not_null":true,"generated":""},{"name":"awardedPoints","type":"double precision","default":null,"identity":"","not_null":true,"generated":""},{"name":"createdAt","type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"solution_check_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX solution_check_pkey ON public.solution_check USING btree (\"attemptId\")","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"solution_check_attemptId_not_null","type":"n","validated":true,"definition":"NOT NULL \"attemptId\""},{"name":"solution_check_awardedPoints_not_null","type":"n","validated":true,"definition":"NOT NULL \"awardedPoints\""},{"name":"solution_check_check","type":"c","validated":true,"definition":"CHECK (((\"awardedPoints\" >= (0)::double precision) AND (\"awardedPoints\" <= \"maxPoints\")))"},{"name":"solution_check_createdAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"createdAt\""},{"name":"solution_check_matched_not_null","type":"n","validated":true,"definition":"NOT NULL matched"},{"name":"solution_check_maxPoints_check","type":"c","validated":true,"definition":"CHECK ((\"maxPoints\" > (0)::double precision))"},{"name":"solution_check_maxPoints_not_null","type":"n","validated":true,"definition":"NOT NULL \"maxPoints\""},{"name":"solution_check_partId_not_null","type":"n","validated":true,"definition":"NOT NULL \"partId\""},{"name":"solution_check_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (\"attemptId\")"},{"name":"solution_check_problemId_not_null","type":"n","validated":true,"definition":"NOT NULL \"problemId\""},{"name":"solution_check_ratingVersion_not_null","type":"n","validated":true,"definition":"NOT NULL \"ratingVersion\""},{"name":"solution_check_sourceVersion_not_null","type":"n","validated":true,"definition":"NOT NULL \"sourceVersion\""},{"name":"solution_check_userId_not_null","type":"n","validated":true,"definition":"NOT NULL \"userId\""}]},{"rls":false,"kind":"r","name":"solution_evidence","owner":"neondb_owner","columns":[{"name":"id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"userId","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"pathname","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"filename","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"mediaType","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"bytes","type":"integer","default":null,"identity":"","not_null":true,"generated":""},{"name":"sha256","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"createdAt","type":"timestamp with time zone","default":"now()","identity":"","not_null":true,"generated":""}],"indexes":[{"name":"solution_evidence_pathname_key","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX solution_evidence_pathname_key ON public.solution_evidence USING btree (pathname)","constraint_index":true},{"name":"solution_evidence_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX solution_evidence_pkey ON public.solution_evidence USING btree (id)","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"solution_evidence_bytes_check","type":"c","validated":true,"definition":"CHECK (((bytes > 0) AND (bytes <= 3145728)))"},{"name":"solution_evidence_bytes_not_null","type":"n","validated":true,"definition":"NOT NULL bytes"},{"name":"solution_evidence_createdAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"createdAt\""},{"name":"solution_evidence_filename_not_null","type":"n","validated":true,"definition":"NOT NULL filename"},{"name":"solution_evidence_id_not_null","type":"n","validated":true,"definition":"NOT NULL id"},{"name":"solution_evidence_mediaType_not_null","type":"n","validated":true,"definition":"NOT NULL \"mediaType\""},{"name":"solution_evidence_pathname_key","type":"u","validated":true,"definition":"UNIQUE (pathname)"},{"name":"solution_evidence_pathname_not_null","type":"n","validated":true,"definition":"NOT NULL pathname"},{"name":"solution_evidence_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (id)"},{"name":"solution_evidence_sha256_not_null","type":"n","validated":true,"definition":"NOT NULL sha256"},{"name":"solution_evidence_userId_not_null","type":"n","validated":true,"definition":"NOT NULL \"userId\""}]},{"rls":false,"kind":"r","name":"user","owner":"neondb_owner","columns":[{"name":"id","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"name","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"email","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"emailVerified","type":"boolean","default":"false","identity":"","not_null":true,"generated":""},{"name":"image","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"createdAt","type":"timestamp without time zone","default":"now()","identity":"","not_null":true,"generated":""},{"name":"updatedAt","type":"timestamp without time zone","default":"now()","identity":"","not_null":true,"generated":""},{"name":"termsAcceptedVersion","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"termsAcceptedAt","type":"timestamp with time zone","default":null,"identity":"","not_null":false,"generated":""}],"indexes":[{"name":"user_email_key","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX user_email_key ON public.\"user\" USING btree (email)","constraint_index":true},{"name":"user_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX user_pkey ON public.\"user\" USING btree (id)","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"user_createdAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"createdAt\""},{"name":"user_emailVerified_not_null","type":"n","validated":true,"definition":"NOT NULL \"emailVerified\""},{"name":"user_email_key","type":"u","validated":true,"definition":"UNIQUE (email)"},{"name":"user_email_not_null","type":"n","validated":true,"definition":"NOT NULL email"},{"name":"user_id_not_null","type":"n","validated":true,"definition":"NOT NULL id"},{"name":"user_name_not_null","type":"n","validated":true,"definition":"NOT NULL name"},{"name":"user_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (id)"},{"name":"user_updatedAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"updatedAt\""}]},{"rls":false,"kind":"r","name":"verification","owner":"neondb_owner","columns":[{"name":"id","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"identifier","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"value","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"expiresAt","type":"timestamp without time zone","default":null,"identity":"","not_null":true,"generated":""},{"name":"createdAt","type":"timestamp without time zone","default":"now()","identity":"","not_null":false,"generated":""},{"name":"updatedAt","type":"timestamp without time zone","default":"now()","identity":"","not_null":false,"generated":""}],"indexes":[{"name":"verification_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX verification_pkey ON public.verification USING btree (id)","constraint_index":true}],"triggers":[],"force_rls":false,"constraints":[{"name":"verification_expiresAt_not_null","type":"n","validated":true,"definition":"NOT NULL \"expiresAt\""},{"name":"verification_id_not_null","type":"n","validated":true,"definition":"NOT NULL id"},{"name":"verification_identifier_not_null","type":"n","validated":true,"definition":"NOT NULL identifier"},{"name":"verification_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (id)"},{"name":"verification_value_not_null","type":"n","validated":true,"definition":"NOT NULL value"}]}]'::jsonb THEN RAISE EXCEPTION 'LEGACY_SCHEMA_PRESERVATION_FAILED'; END IF;
 IF (SELECT count(*) FROM public.physcratic_production_migrations)<>6 OR EXISTS(SELECT 1 FROM(VALUES ('0001_problem_authoring','83ec2e53f95829aa6932a327dfd0362a3c197e190ddbcfb00a67d24a05c93d09'),('0002_authored_write_limit','c10cd7ecb9d6da65e0e95012a7dd199edac02e7a54b4fc8de86bb6c59bdc553b'),('0003_author_media','db4e91998388dafd964507571fc408f2f74fdd8b1af466469674911dc4b6db3a'),('0004_authored_attempts','e52abd4fa47e2c8abdc609fdc79c32c2f78a284df90b859463ae217abed7e423'),('0005_authored_solution_access','65dfc1a1137cf963b7e579931fde6d8c315d0bfb8dbd6c465a8cc70d741335e4'),('0006_authored_discovery','3ed763699a4e58512604fe6b738dc7e8440c1f2291501e1c29fa2da07dd8a37f'))e(id,sha) LEFT JOIN public.physcratic_production_migrations l USING(id) WHERE l.sha256 IS DISTINCT FROM e.sha OR l.source_commit<>'2c35d61a5fcf6680a4054380a4bfcff1b71bc9e6' OR l.result<>'verified') THEN RAISE EXCEPTION 'PRODUCTION_LEDGER_MISMATCH'; END IF;
 IF EXISTS(SELECT 1 FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated) OR EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='public'::regnamespace AND t.tgisinternal AND t.tgenabled NOT IN('O','A')) THEN RAISE EXCEPTION 'CONSTRAINT_ENFORCEMENT_MISMATCH'; END IF;
END $post$;
COMMIT;
