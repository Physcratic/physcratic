-- Hide exposure first. Never discard public consent or rewrite history.
LOCK TABLE authored_revision IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM authored_revision WHERE solution_policy<>'legacy-private-v1' OR solution_consented_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Public solution consent must be retained: populated rollback is forbidden'; END IF;
END $$;
CREATE OR REPLACE FUNCTION community_achievement_problem_solved(target_user text,target_problem uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM authored_problem p JOIN authored_revision r
    ON r.id=p.published_revision_id AND r.problem_id=p.id
    WHERE p.id=target_problem AND p.state='published' AND p.owner_id<>target_user AND r.schema_version=1
      AND EXISTS(SELECT 1 FROM authored_revision_part rp WHERE rp.revision_id=r.id)
      AND NOT EXISTS(SELECT 1 FROM authored_revision_part rp WHERE rp.revision_id=r.id AND
        (rp.answer_mode NOT IN ('numeric','expression') OR NOT EXISTS(
          SELECT 1 FROM authored_attempt a WHERE a.user_id=target_user AND a.problem_id=p.id
            AND a.revision_id=r.id AND a.part_id=rp.part_id AND a.status='correct' AND a.assisted=false
            AND ((rp.answer_mode='numeric' AND a.engine_version='numeric-v1' AND a.reason='within-tolerance' AND a.answer->>'kind'='numeric')
              OR (rp.answer_mode='expression' AND a.engine_version='symbolic-v1' AND a.reason='symbolic-equivalent' AND a.answer->>'kind'='expression'))
        ))));
$$;

CREATE OR REPLACE FUNCTION community_achievement_progress(target_user text)
RETURNS TABLE(author_count integer,solve_count integer) LANGUAGE plpgsql STABLE AS $$
DECLARE cursor_id uuid; next_id uuid; examined integer:=0; completed integer:=0; authored integer;
BEGIN
  SELECT count(*)::integer INTO authored FROM (
    SELECT p.id FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id AND r.problem_id=p.id
    WHERE p.owner_id=target_user AND p.state='published' ORDER BY p.id LIMIT 50
  ) publications;
  -- Loose index seeks skip repeated submissions rather than scanning raw attempt history.
  SELECT problem_id INTO cursor_id FROM authored_attempt WHERE user_id=target_user
    AND status='correct' AND assisted=false ORDER BY problem_id LIMIT 1;
  WHILE cursor_id IS NOT NULL LOOP
    examined:=examined+1;
    IF community_achievement_problem_solved(target_user,cursor_id) THEN completed:=completed+1; END IF;
    EXIT WHEN completed>=50;
    SELECT problem_id INTO next_id FROM authored_attempt WHERE user_id=target_user
      AND status='correct' AND assisted=false AND problem_id>cursor_id ORDER BY problem_id LIMIT 1;
    IF next_id IS NOT NULL AND examined>=2000 THEN
      -- Unknown is not zero. Author progress remains independently available.
      RETURN QUERY SELECT authored,NULL::integer; RETURN;
    END IF;
    cursor_id:=next_id;
  END LOOP;
  RETURN QUERY SELECT authored,completed;
END $$;

ALTER TABLE authored_revision DROP CONSTRAINT authored_revision_solution_consent_check,
 DROP COLUMN solution_consented_at, DROP COLUMN solution_policy;
