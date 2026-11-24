\set ON_ERROR_STOP on
\set email ''
\getenv email PHYSCRATIC_MEDAL_EMAIL
\set handle ''
\getenv handle PHYSCRATIC_MEDAL_HANDLE
\set competition ''
\getenv competition PHYSCRATIC_MEDAL_COMPETITION
\set award ''
\getenv award PHYSCRATIC_MEDAL_AWARD
\set year ''
\getenv year PHYSCRATIC_MEDAL_YEAR
\set country ''
\getenv country PHYSCRATIC_MEDAL_COUNTRY
\set competition_name ''
\getenv competition_name PHYSCRATIC_MEDAL_COMPETITION_NAME
\set tally_reference ''
\getenv tally_reference PHYSCRATIC_MEDAL_TALLY_REFERENCE
\set medal_id ''
\getenv medal_id PHYSCRATIC_MEDAL_MEDAL_ID
BEGIN ISOLATION LEVEL READ COMMITTED;
\if :lookup
SET TRANSACTION READ ONLY;
\endif
SET LOCAL statement_timeout='10s';
SET LOCAL lock_timeout='3s';
SET LOCAL search_path TO pg_catalog, public, pg_temp;
SELECT account_id,email,coalesce(handle,'') AS handle FROM public.community_external_medal_recipient(:'email',:'handle') \gset recipient_
SELECT current_database() AS database, session_user AS operator,
  :'recipient_account_id' AS account_id, :'recipient_email' AS email,
  nullif(:'recipient_handle','') AS handle;
\if :lookup
SELECT m.id,m.competition,m.award,m.year,m.country,m.competition_name,m.tally_reference,
  a.operator AS awarded_by,a.recorded_at AS awarded_at,r.operator AS revoked_by,m.revoked_at
FROM public.community_external_medal m
JOIN public.community_external_medal_audit a ON a.medal_id=m.id AND a.action='award'
LEFT JOIN public.community_external_medal_audit r ON r.medal_id=m.id AND r.action='revoke'
WHERE m.user_id=:'recipient_account_id' ORDER BY a.recorded_at DESC LIMIT 100;
COMMIT;
\else
  \if :award_operation
  SELECT :'competition' AS competition, :'award' AS award, :'year'::integer AS year,
    :'country' AS country, :'competition_name' AS competition_name, :'tally_reference' AS tally_reference;
  \else
  SELECT id,competition,award,year,country,competition_name,revoked_at
  FROM public.community_external_medal WHERE id=:'medal_id'::uuid AND user_id=:'recipient_account_id' \gset rev_
  SELECT :'rev_id' AS medal_id, :'rev_competition' AS competition, :'rev_award' AS award,
    :'rev_year' AS year, :'rev_country' AS country, :'rev_competition_name' AS competition_name;
  \endif
  \prompt 'Enter yes to record this operation: ' confirmed
  SELECT :'confirmed'='yes' AS recorded \gset
  \if :recorded
    \if :award_operation
    SELECT * FROM public.community_external_medal_award(:'recipient_account_id',:'competition',:'award',
      :'year'::integer,:'country',:'competition_name',:'tally_reference');
    \else
    SELECT public.community_external_medal_revoke(:'medal_id'::uuid, :'recipient_account_id') AS result;
    \endif
  COMMIT;
  \else
  ROLLBACK;
  \endif
\endif
