-- Add current_trainees column to tbl_batches
ALTER TABLE `tbl_batch` 
ADD COLUMN `current_trainees` INT NOT NULL DEFAULT 0 COMMENT 'Current number of active trainees';

-- Update the count based on existing trainees
-- This assumes a table named 'tbl_trainees' exists with 'batch_id' and 'status' columns
UPDATE `tbl_batch` b
SET `current_trainees` = (
    SELECT COUNT(*)
    FROM `tbl_enrollment` t
    WHERE t.batch_id = b.batch_id
    AND t.status IN ('active', 'enrolled', 'completed')
);