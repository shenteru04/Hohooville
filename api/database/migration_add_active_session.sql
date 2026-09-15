-- Enforce one active browser session per account. Run once against technical_db.
ALTER TABLE tbl_users
    ADD COLUMN active_session_id CHAR(64) NULL DEFAULT NULL AFTER login_locked_until,
    ADD COLUMN active_session_started_at DATETIME NULL DEFAULT NULL AFTER active_session_id;

CREATE INDEX idx_users_active_session_id ON tbl_users (active_session_id);
