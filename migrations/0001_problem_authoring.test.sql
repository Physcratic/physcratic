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
