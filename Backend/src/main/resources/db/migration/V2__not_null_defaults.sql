-- Backfill NULLs (possible in rows imported from the old Express backend) and make the
-- columns NOT NULL so they match the JPA entity (primitive boolean / non-null timestamps).

UPDATE applications SET follow_up = FALSE WHERE follow_up IS NULL;
UPDATE applications SET status_updated_at = CURRENT_TIMESTAMP WHERE status_updated_at IS NULL;
UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

ALTER TABLE applications ALTER COLUMN follow_up SET DEFAULT FALSE;
ALTER TABLE applications ALTER COLUMN follow_up SET NOT NULL;
ALTER TABLE applications ALTER COLUMN status_updated_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE applications ALTER COLUMN status_updated_at SET NOT NULL;
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;

-- Speeds up case-insensitive login lookups (findByEmailIgnoreCase -> upper(email)).
CREATE INDEX IF NOT EXISTS idx_users_email_upper ON users (UPPER(email));
