-- Migration: Fix batch trigger to allow closing with active enrollments
-- Date: 2026-04-20
-- Purpose: Allow batches to close even when they have active enrollments

-- Drop the existing trigger that prevents batch closure with active enrollments
DROP TRIGGER IF EXISTS `trg_batch_before_close`;

-- Create a new trigger that allows batch closure regardless of active enrollments
DELIMITER $$
CREATE TRIGGER `trg_batch_before_close` BEFORE UPDATE ON `tbl_batch` FOR EACH ROW 
BEGIN
    -- Empty trigger - allows batch to close with active enrollments
    SET @dummy = 1;
END$$
DELIMITER ;
