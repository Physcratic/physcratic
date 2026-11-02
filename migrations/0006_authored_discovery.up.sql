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
