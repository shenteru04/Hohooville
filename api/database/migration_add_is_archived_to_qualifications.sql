-- Migration: Add is_archived column to tbl_qualifications
-- This allows soft-deleting qualifications instead of permanently deleting them

ALTER TABLE tbl_qualifications ADD COLUMN is_archived INT DEFAULT 0 AFTER status;

-- Create index for better query performance
CREATE INDEX idx_qualifications_is_archived ON tbl_qualifications(is_archived);
