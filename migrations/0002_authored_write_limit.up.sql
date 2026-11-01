-- Apply explicitly in a reviewed transaction after 0001; no startup/build migration.
-- One fixed-window bucket per user, bounded storage and atomic cross-instance updates.
CREATE TABLE authored_write_limit (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL,
 requests integer NOT NULL CHECK(requests>0)
);
