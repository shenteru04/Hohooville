-- Migration: Add trainer_type column to tbl_trainer
-- Purpose: Specify whether a trainer is part-time or full-time
-- Date: 2026-08-16

ALTER TABLE `tbl_trainer` 
ADD COLUMN `trainer_type` ENUM('part timer', 'full timer') NOT NULL DEFAULT 'full timer' AFTER `status`;

-- Drop the schedule_requests table as the feature is being removed
DROP TABLE IF EXISTS `tbl_schedule_requests`;
