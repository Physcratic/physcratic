-- Removes only authoring rate-limit state. Disable new API writes before rollback.
DROP TABLE authored_write_limit;
