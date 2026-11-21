-- V3: job URL, on/off-campus + referral, archive, tags, interviews (+ reminders),
-- status history and password reset tokens.
-- Every change is additive; existing rows keep their data.

-- ---------------------------------------------------------------- applications
ALTER TABLE applications ADD COLUMN job_url VARCHAR(2048);
ALTER TABLE applications ADD COLUMN opening_type VARCHAR(20)
    CHECK (opening_type IN ('ON_CAMPUS', 'OFF_CAMPUS'));
ALTER TABLE applications ADD COLUMN referral BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- A referral only makes sense for an off-campus opening. Written NULL-safe: a plain
-- "opening_type = 'OFF_CAMPUS'" is NULL (not false) for unset rows and would pass the CHECK.
ALTER TABLE applications ADD CONSTRAINT chk_referral_off_campus
    CHECK (NOT referral OR (opening_type IS NOT NULL AND opening_type = 'OFF_CAMPUS'));

CREATE INDEX idx_applications_user_archived ON applications (user_id, archived);

-- ------------------------------------------------------------------------ tags
CREATE TABLE application_tags (
    application_id INT         NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
    tag            VARCHAR(30) NOT NULL,
    PRIMARY KEY (application_id, tag)
);

-- ------------------------------------------------------------------ interviews
CREATE TABLE interviews (
    id               SERIAL PRIMARY KEY,
    application_id   INT          NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
    round            VARCHAR(100) NOT NULL,
    scheduled_at     TIMESTAMPTZ  NOT NULL,
    time_zone        VARCHAR(64)  NOT NULL DEFAULT 'UTC',
    location         VARCHAR(500),
    notes            TEXT,
    reminder_sent_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interviews_application ON interviews (application_id);
-- Used by the reminder job: "unsent reminders for interviews in the next 24h".
CREATE INDEX idx_interviews_pending_reminder ON interviews (scheduled_at) WHERE reminder_sent_at IS NULL;

-- -------------------------------------------------------------- status history
CREATE TABLE status_history (
    id             SERIAL PRIMARY KEY,
    application_id INT         NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
    from_status    VARCHAR(20),
    to_status      VARCHAR(20) NOT NULL,
    changed_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status_history_application ON status_history (application_id, changed_at);

-- Backfill a best-effort history for existing applications: every application starts
-- as "Applied" on its applied date; if it has since moved on, record one transition at
-- status_updated_at (the only timestamp we have for it).
-- The app writes TIMESTAMP columns in UTC, so convert explicitly with AT TIME ZONE 'UTC'
-- instead of relying on the session time zone.
INSERT INTO status_history (application_id, from_status, to_status, changed_at)
SELECT id, NULL, 'Applied', applied_date::timestamp AT TIME ZONE 'UTC'
FROM applications;

INSERT INTO status_history (application_id, from_status, to_status, changed_at)
SELECT id, 'Applied', status, GREATEST(status_updated_at, applied_date::timestamp) AT TIME ZONE 'UTC'
FROM applications
WHERE status <> 'Applied';

-- ------------------------------------------------------------ password resets
CREATE TABLE password_reset_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- SHA-256 hex of the token; the raw token only ever exists in the email link.
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);
