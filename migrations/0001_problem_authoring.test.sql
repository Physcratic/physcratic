\set ON_ERROR_STOP on
INSERT INTO "user"(id) VALUES ('author');
INSERT INTO authored_problem(id,slug,owner_id) VALUES ('10000000-0000-4000-8000-000000000001','test-problem','author'),('10000000-0000-4000-8000-000000000002','other-problem','author');
INSERT INTO authored_draft(problem_id,content) VALUES ('10000000-0000-4000-8000-000000000001','{}');
DO $$ BEGIN
 BEGIN INSERT INTO authored_problem(id,slug,owner_id) VALUES ('10000000-0000-4000-8000-000000000003','missing-owner','missing'); RAISE EXCEPTION 'owner FK missing'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN UPDATE authored_draft SET version=0; RAISE EXCEPTION 'version check missing'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO authored_draft_private_part VALUES ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','{}'); RAISE EXCEPTION 'identity check missing'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO authored_draft_private_part VALUES ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','{"partId":null}'); RAISE EXCEPTION 'null identity allowed'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO authored_revision_private_part VALUES ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','manual','{"partId":"20000000-0000-4000-8000-000000000001"}'); RAISE EXCEPTION 'missing key allowed'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO authored_revision_private_part VALUES ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','manual','{"partId":"20000000-0000-4000-8000-000000000001","key":null}'); RAISE EXCEPTION 'null key allowed'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE authored_problem SET state='published' WHERE slug='test-problem'; RAISE EXCEPTION 'unversioned publication allowed'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
BEGIN;
INSERT INTO authored_revision_part VALUES ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','manual');
INSERT INTO authored_revision_private_part VALUES ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','manual','{"partId":"20000000-0000-4000-8000-000000000001","key":{"kind":"manual"},"hints":[],"solution":[]}');
INSERT INTO authored_revision(id,problem_id,number,content) VALUES ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,'{"sections":[{"parts":[{"id":"20000000-0000-4000-8000-000000000001","answerMode":"manual"}]}]}');
UPDATE authored_problem SET state='published',published_revision_id='30000000-0000-4000-8000-000000000001' WHERE slug='test-problem';
COMMIT;
DO $$ BEGIN
 BEGIN INSERT INTO authored_revision_private_part VALUES ('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000001','manual','{"partId":"20000000-0000-4000-8000-000000000001","key":{"kind":"numeric"}}'); RAISE EXCEPTION 'mode mismatch allowed'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO authored_revision_part VALUES ('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000001','manual');
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'orphan part allowed';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN
  INSERT INTO authored_revision_part VALUES ('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000001','manual');
  INSERT INTO authored_revision_private_part VALUES ('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000001','manual','{"partId":"20000000-0000-4000-8000-000000000001","key":{"kind":"manual"}}');
  INSERT INTO authored_revision(id,problem_id,number,content) VALUES ('30000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000001',1,'{"sections":[{"parts":[{"id":"20000000-0000-4000-8000-000000000001","answerMode":"manual"}]}]}');
  RAISE EXCEPTION 'duplicate revision number allowed';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  INSERT INTO authored_revision(id,problem_id,number,content) VALUES ('30000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000001',9,'{"sections":[{"parts":[{"id":"20000000-0000-4000-8000-000000000001","answerMode":"manual"}]}]}');
  RAISE EXCEPTION 'part map mismatch allowed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='part map mismatch allowed' THEN RAISE; END IF; END;
 BEGIN UPDATE authored_problem SET state='published' ,published_revision_id='30000000-0000-4000-8000-000000000001' WHERE slug='other-problem'; RAISE EXCEPTION 'cross-problem pointer allowed'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN UPDATE authored_revision SET content='{}'; RAISE EXCEPTION 'revision mutable'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='revision mutable' THEN RAISE; END IF; END;
 BEGIN DELETE FROM authored_revision_private_part; RAISE EXCEPTION 'key mutable'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='key mutable' THEN RAISE; END IF; END;
 BEGIN INSERT INTO authored_revision_part VALUES ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','manual'); RAISE EXCEPTION 'late part allowed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='late part allowed' THEN RAISE; END IF; END;
 BEGIN INSERT INTO authored_revision(id,problem_id,number,content) VALUES ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',2,'{"sections":[]}'); RAISE EXCEPTION 'empty revision allowed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='empty revision allowed' THEN RAISE; END IF; END;
END $$;
-- Unpublishing never deletes or mutates historical revisions or their keys.
UPDATE authored_problem SET state='archived',published_revision_id=NULL WHERE slug='test-problem';
SELECT 'migration constraints passed' AS result;
-- Canonical private JSON survives the PostgreSQL UUID column's case normalization.
INSERT INTO authored_draft_private_part(problem_id,part_id,data)
VALUES ('10000000-0000-4000-8000-000000000001','ABCDEFAB-CDEF-4ABC-8ABC-ABCDEFABCDEF',
 '{"partId":"abcdefab-cdef-4abc-8abc-abcdefabcdef","key":null,"hints":[],"solution":[]}');
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM authored_draft_private_part WHERE part_id='abcdefab-cdef-4abc-8abc-abcdefabcdef' AND data->>'partId'=part_id::text)
 THEN RAISE EXCEPTION 'canonical private-part round trip failed'; END IF;
END $$;

-- Regressions: counts and one-way membership cannot prove exact set equality.
DO $$
DECLARE parts jsonb;
BEGIN
 FOR parts IN SELECT value FROM jsonb_array_elements('[
  [{"id":"abcdefab-cdef-4abc-8abc-abcdefabcdef","answerMode":"manual"},{"id":"abcdefab-cdef-4abc-8abc-abcdefabcdef","answerMode":"manual"}],
  [{"id":"abcdefab-cdef-4abc-8abc-abcdefabcdef","answerMode":"manual"},{"id":"ABCDEFAB-CDEF-4ABC-8ABC-ABCDEFABCDEF","answerMode":"manual"}],
  [{"id":"abcdefab-cdef-4abc-8abc-abcdefabcdef","answerMode":"manual"}],
  [{"id":"abcdefab-cdef-4abc-8abc-abcdefabcdef","answerMode":"manual"},{"id":"bcdefabc-defa-4bcd-8bcd-bcdefabcdefa","answerMode":"manual"},{"id":"cdefabcd-efab-4cde-8cde-cdefabcdefab","answerMode":"manual"}],
  [{"id":"abcdefab-cdef-4abc-8abc-abcdefabcdef","answerMode":"numeric"},{"id":"bcdefabc-defa-4bcd-8bcd-bcdefabcdefa","answerMode":"manual"}],
  [{"id":null,"answerMode":"manual"},{"id":"bcdefabc-defa-4bcd-8bcd-bcdefabcdefa","answerMode":"manual"}],
  [{"id":"abcdefab-cdef-4abc-8abc-abcdefabcdef"},{"id":"bcdefabc-defa-4bcd-8bcd-bcdefabcdefa","answerMode":"manual"}]
 ]'::jsonb) LOOP
  BEGIN
   INSERT INTO authored_revision_part VALUES
    ('30000000-0000-4000-8000-000000000010','abcdefab-cdef-4abc-8abc-abcdefabcdef','manual'),
    ('30000000-0000-4000-8000-000000000010','bcdefabc-defa-4bcd-8bcd-bcdefabcdefa','manual');
   INSERT INTO authored_revision_private_part
    SELECT revision_id,part_id,answer_mode,jsonb_build_object('partId',part_id,'key',jsonb_build_object('kind',answer_mode),'hints','[]'::jsonb,'solution','[]'::jsonb)
    FROM authored_revision_part WHERE revision_id='30000000-0000-4000-8000-000000000010';
   INSERT INTO authored_revision(id,problem_id,number,content) VALUES
    ('30000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001',10,jsonb_build_object('sections',jsonb_build_array(jsonb_build_object('parts',parts))));
   RAISE EXCEPTION 'inexact part map accepted: %',parts;
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'Revision document and relational parts disagree' THEN RAISE; END IF;
  END;
 END LOOP;
END $$;
-- Exact correspondence succeeds with reordered document parts split across sections.
BEGIN;
INSERT INTO authored_revision_part VALUES
 ('30000000-0000-4000-8000-000000000011','abcdefab-cdef-4abc-8abc-abcdefabcdef','manual'),
 ('30000000-0000-4000-8000-000000000011','bcdefabc-defa-4bcd-8bcd-bcdefabcdefa','manual');
INSERT INTO authored_revision_private_part
 SELECT revision_id,part_id,answer_mode,jsonb_build_object('partId',part_id,'key',jsonb_build_object('kind',answer_mode),'hints','[]'::jsonb,'solution','[]'::jsonb)
 FROM authored_revision_part WHERE revision_id='30000000-0000-4000-8000-000000000011';
INSERT INTO authored_revision(id,problem_id,number,content) VALUES
 ('30000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001',11,
 '{"sections":[{"parts":[{"id":"bcdefabc-defa-4bcd-8bcd-bcdefabcdefa","answerMode":"manual"}]},{"parts":[{"id":"abcdefab-cdef-4abc-8abc-abcdefabcdef","answerMode":"manual"}]}]}');
COMMIT;
SELECT 'review regression constraints passed' AS result;
