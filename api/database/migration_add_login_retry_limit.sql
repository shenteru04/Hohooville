-- Migration: add server-side login retry tracking and temporary account lockouts.
-- Policy: five incorrect passwords lock an account for 15 minutes.

ALTER TABLE tbl_users
    ADD COLUMN failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER last_login,
    ADD COLUMN login_locked_until DATETIME NULL DEFAULT NULL AFTER failed_login_attempts;

CREATE INDEX idx_users_login_locked_until
    ON tbl_users (login_locked_until);
