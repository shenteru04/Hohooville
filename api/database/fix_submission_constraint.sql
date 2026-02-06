-- Drop the old unique index that restricts one submission per lesson
ALTER TABLE `tbl_task_sheet_submissions` DROP INDEX `unique_submission`;

-- Add a new unique index that allows one submission per TASK SHEET
ALTER TABLE `tbl_task_sheet_submissions` ADD UNIQUE KEY `unique_submission` (`task_sheet_id`, `trainee_id`);