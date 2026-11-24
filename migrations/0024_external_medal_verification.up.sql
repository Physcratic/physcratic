-- Requires 0011, 0015 and 0018 in the same trusted schema. Apply in a transaction.
CREATE TABLE community_external_medal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  competition text NOT NULL CHECK (competition IN ('IPhO','APhO','EuPhO','National')),
  award text NOT NULL CHECK (award IN ('gold','silver','bronze','honourable-mention')),
  year integer NOT NULL CHECK (year BETWEEN 1959 AND 2100),
  country text NOT NULL CHECK (country ~ '^([A-Z]{2})?$'),
  competition_name text NOT NULL CHECK (length(competition_name)<=120 AND competition_name=btrim(competition_name)),
  tally_reference text NOT NULL UNIQUE CHECK (tally_reference ~ '^[A-Za-z0-9_-]{1,100}$'),
  revoked_at timestamptz,
  CHECK (competition<>'National' OR (length(country)=2 AND length(competition_name)>0))
);

CREATE UNIQUE INDEX community_external_medal_active_slot ON community_external_medal
  (user_id,competition,year,(CASE WHEN competition='National' THEN country ELSE '' END),
    (CASE WHEN competition='National' THEN lower(competition_name) ELSE '' END))
  WHERE revoked_at IS NULL;
CREATE INDEX community_external_medal_user_idx ON community_external_medal (user_id);

CREATE TABLE community_external_medal_audit (
  medal_id uuid NOT NULL REFERENCES community_external_medal(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('award','revoke')),
  operator text NOT NULL DEFAULT session_user,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(medal_id,action)
);

-- The owner-backed view intentionally exposes only the existing medal projection.
CREATE VIEW community_external_approved_medal WITH (security_barrier=true) AS
  SELECT 'medal:'||id::text AS id,user_id,competition,award,year,country,competition_name AS "competitionName"
  FROM community_external_medal WHERE revoked_at IS NULL;
REVOKE ALL ON community_external_medal,community_external_medal_audit,community_external_approved_medal FROM PUBLIC;

CREATE FUNCTION community_external_medal_recipient(email_input text,handle_input text)
RETURNS TABLE(account_id text,email text,handle text) LANGUAGE plpgsql STABLE AS $$
DECLARE email_ids text[]; handle_ids text[]; target_id text;
BEGIN
  email_input:=nullif(btrim(email_input),'');
  handle_input:=nullif(btrim(handle_input),'');
  IF (email_input IS NULL AND handle_input IS NULL) OR length(email_input)>254 OR length(handle_input)>30 THEN
    RAISE EXCEPTION 'Enter a valid account email or handle' USING ERRCODE='22023';
  END IF;
  IF email_input IS NOT NULL THEN
    SELECT ARRAY(SELECT u.id FROM "user" u WHERE lower(u.email)=lower(email_input) LIMIT 2) INTO email_ids;
    IF cardinality(email_ids)<>1 THEN RAISE EXCEPTION 'Email must identify exactly one account' USING ERRCODE='22023'; END IF;
  END IF;
  IF handle_input IS NOT NULL THEN
    SELECT ARRAY(SELECT p.user_id FROM community_profile p WHERE lower(p.handle)=lower(handle_input) LIMIT 2) INTO handle_ids;
    IF cardinality(handle_ids)<>1 THEN RAISE EXCEPTION 'Handle must identify exactly one account' USING ERRCODE='22023'; END IF;
  END IF;
  IF email_ids IS NOT NULL AND handle_ids IS NOT NULL AND email_ids[1]<>handle_ids[1] THEN
    RAISE EXCEPTION 'Email and handle identify different accounts' USING ERRCODE='22023';
  END IF;
  target_id:=coalesce(email_ids[1],handle_ids[1]);
  IF target_id='__physcratic_deleted_principal_v1__' THEN RAISE EXCEPTION 'A live account is required' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT u.id,u.email::text,p.handle::text FROM "user" u
    LEFT JOIN community_profile p ON p.user_id=u.id WHERE u.id=target_id;
END $$;

CREATE FUNCTION community_external_medal_award(
  target_id text, event_competition text, event_award text, event_year integer,
  event_country text, event_name text, submission_reference text
) RETURNS TABLE(medal_id uuid, result text) LANGUAGE plpgsql AS $$
DECLARE existing community_external_medal%ROWTYPE; created_id uuid;
BEGIN
  event_country:=btrim(event_country);
  event_name:=btrim(event_name);
  submission_reference:=btrim(submission_reference);
  IF event_year>extract(year FROM clock_timestamp() AT TIME ZONE 'UTC') THEN
    RAISE EXCEPTION 'Medal year cannot be in the future' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM "user" u WHERE u.id=target_id AND u.id<>'__physcratic_deleted_principal_v1__' FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'A live account is required' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(target_id,24));

  SELECT * INTO existing FROM community_external_medal WHERE tally_reference=submission_reference;
  IF FOUND THEN
    IF (existing.user_id,existing.competition,existing.award,existing.year,existing.country,existing.competition_name)
        IS DISTINCT FROM (target_id,event_competition,event_award,event_year,event_country,event_name) THEN
      RAISE EXCEPTION 'Tally reference is already bound to another award' USING ERRCODE='23505';
    END IF;
    RETURN QUERY SELECT existing.id,CASE WHEN existing.revoked_at IS NULL THEN 'already awarded' ELSE 'already revoked' END;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM community_medal_claim c WHERE c.user_id=target_id AND c.competition=event_competition
      AND c.year=event_year AND c.state IN ('uploading','pending','more-info','approved')
      AND (event_competition<>'National' OR (c.country=event_country AND lower(c.competition_name)=lower(event_name)))) THEN
    RAISE EXCEPTION 'An active internal claim occupies this medal slot' USING ERRCODE='23505';
  END IF;

  INSERT INTO community_external_medal(user_id,competition,award,year,country,competition_name,tally_reference)
    VALUES(target_id,event_competition,event_award,event_year,event_country,event_name,submission_reference) RETURNING id INTO created_id;
  INSERT INTO community_external_medal_audit(medal_id,action) VALUES(created_id,'award');
  RETURN QUERY SELECT created_id,'awarded'::text;
END $$;

CREATE FUNCTION community_external_medal_revoke(target_medal uuid, expected_user text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE existing community_external_medal%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(expected_user,24));
  SELECT * INTO existing FROM community_external_medal WHERE id=target_medal AND user_id=expected_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Medal does not belong to the confirmed account' USING ERRCODE='22023'; END IF;
  IF existing.revoked_at IS NOT NULL THEN RETURN 'already revoked'; END IF;
  UPDATE community_external_medal SET revoked_at=clock_timestamp() WHERE id=target_medal;
  INSERT INTO community_external_medal_audit(medal_id,action) VALUES(target_medal,'revoke');
  RETURN 'revoked';
END $$;

-- Preserve the legacy upload/review guards and serialize across the two sources.
CREATE FUNCTION community_medal_external_slot_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.state NOT IN ('uploading','pending','more-info','approved') THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id,24));
  IF EXISTS (SELECT 1 FROM community_external_medal m WHERE m.user_id=NEW.user_id
      AND m.competition=NEW.competition AND m.year=NEW.year AND m.revoked_at IS NULL
      AND (m.competition<>'National' OR (m.country=NEW.country AND lower(m.competition_name)=lower(NEW.competition_name)))) THEN
    RAISE EXCEPTION 'An active external medal occupies this slot' USING ERRCODE='23505';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER community_medal_external_slot_guard BEFORE INSERT OR UPDATE ON community_medal_claim
  FOR EACH ROW EXECUTE FUNCTION community_medal_external_slot_guard();

CREATE OR REPLACE FUNCTION community_badge_selection_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE progress record; progress_loaded boolean:=false; badge text; required integer; count_value integer;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.user_id,NEW.created_at) IS DISTINCT FROM (OLD.user_id,OLD.created_at) THEN
    RAISE EXCEPTION 'Showcase identity is immutable' USING ERRCODE='23514';
  END IF;
  FOREACH badge IN ARRAY NEW.badge_ids LOOP
    IF badge ~ '^medal:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      PERFORM 1 FROM community_external_medal WHERE id=substring(badge FROM 7)::uuid
        AND user_id=NEW.user_id AND revoked_at IS NULL FOR SHARE;
      IF NOT FOUND THEN
        PERFORM 1 FROM community_medal_claim WHERE id=substring(badge FROM 7)::uuid
          AND user_id=NEW.user_id AND state='approved' FOR SHARE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Medal is not currently eligible' USING ERRCODE='23514'; END IF;
      END IF;
      CONTINUE;
    END IF;
    IF NOT progress_loaded THEN
      SELECT * INTO progress FROM community_achievement_progress(NEW.user_id);
      progress_loaded:=true;
    END IF;
    required:=CASE badge WHEN 'first-spark' THEN 1 WHEN 'problem-weaver' THEN 5 WHEN 'equation-architect' THEN 15
      WHEN 'master-problem-setter' THEN 50 WHEN 'first-breakthrough' THEN 1 WHEN 'persistent-solver' THEN 10
      WHEN 'olympiad-pathfinder' THEN 50 ELSE NULL END;
    count_value:=CASE WHEN badge IN ('first-spark','problem-weaver','equation-architect','master-problem-setter')
      THEN progress.author_count ELSE progress.solve_count END;
    IF required IS NULL OR count_value IS NULL OR count_value<required THEN
      RAISE EXCEPTION 'Achievement is not currently eligible' USING ERRCODE='23514';
    END IF;
  END LOOP;
  NEW.updated_at:=clock_timestamp(); RETURN NEW;
END $$;

-- Pin named trusted schema and place temp last for every entry point, including operator functions.
DO $migration$
DECLARE trusted_schema text := pg_catalog.current_schema(); signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY['community_badge_selection_guard()', 'community_medal_external_slot_guard()',
    'community_external_medal_recipient(text,text)', 'community_external_medal_award(text,text,text,integer,text,text,text)',
    'community_external_medal_revoke(uuid,text)']
  LOOP
    EXECUTE pg_catalog.format('ALTER FUNCTION %I.%s SET search_path TO pg_catalog,%I,pg_temp',trusted_schema,signature,trusted_schema);
  END LOOP;
END $migration$;
REVOKE ALL ON FUNCTION community_medal_external_slot_guard(),community_badge_selection_guard(),
  community_external_medal_recipient(text,text),community_external_medal_award(text,text,text,integer,text,text,text),
  community_external_medal_revoke(uuid,text) FROM PUBLIC;
