-- Migration: Add Module Progression and Learning Outcome Tracking
-- This migration adds support for structured module progression with learning outcomes,
-- quizzes, and task sheets that must be completed sequentially

-- Add columns to tbl_module for progression tracking
ALTER TABLE `tbl_module` ADD COLUMN `module_order` INT(11) DEFAULT 0 COMMENT 'Order of modules within a qualification';
ALTER TABLE `tbl_module` ADD COLUMN `trainer_id` INT(11) COMMENT 'Trainer who created this module';
ALTER TABLE `tbl_module` ADD COLUMN `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Module is active and visible';
ALTER TABLE `tbl_module` ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `tbl_module` ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Modify tbl_lessons to be "Learning Outcomes" with better structure
ALTER TABLE `tbl_lessons` ADD COLUMN `outcome_order` INT(11) DEFAULT 0 COMMENT 'Order within module';
ALTER TABLE `tbl_lessons` ADD COLUMN `is_required` TINYINT(1) DEFAULT 1 COMMENT 'Must complete to progress';
ALTER TABLE `tbl_lessons` ADD COLUMN `quiz_instructions` LONGTEXT COMMENT 'Instructions for quiz';
ALTER TABLE `tbl_lessons` ADD COLUMN `task_instructions` LONGTEXT COMMENT 'Instructions for task sheet';
ALTER TABLE `tbl_lessons` ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `tbl_lessons` ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Create table for tracking trainee progress through learning outcomes
CREATE TABLE IF NOT EXISTS `tbl_learning_outcome_progress` (
  `progress_id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `trainee_id` INT(11) NOT NULL,
  `lesson_id` INT(11) NOT NULL,
  `quiz_completed` TINYINT(1) DEFAULT 0,
  `quiz_score` DECIMAL(5,2) DEFAULT NULL,
  `quiz_passed` TINYINT(1) DEFAULT 0,
  `task_completed` TINYINT(1) DEFAULT 0,
  `task_score` DECIMAL(5,2) DEFAULT NULL,
  `task_passed` TINYINT(1) DEFAULT 0,
  `learning_outcome_completed` TINYINT(1) DEFAULT 0,
  `completed_date` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_trainee_lesson` (`trainee_id`, `lesson_id`),
  FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr`(`trainee_id`),
  FOREIGN KEY (`lesson_id`) REFERENCES `tbl_lessons`(`lesson_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create table for tracking trainee progress through modules
CREATE TABLE IF NOT EXISTS `tbl_module_progress` (
  `module_progress_id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `trainee_id` INT(11) NOT NULL,
  `module_id` INT(11) NOT NULL,
  `started_date` DATETIME DEFAULT NULL,
  `completed_date` DATETIME DEFAULT NULL,
  `all_outcomes_completed` TINYINT(1) DEFAULT 0,
  `status` ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_trainee_module` (`trainee_id`, `module_id`),
  FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr`(`trainee_id`),
  FOREIGN KEY (`module_id`) REFERENCES `tbl_module`(`module_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create index for performance
CREATE INDEX `idx_module_trainer` ON `tbl_module`(`trainer_id`, `qualification_id`);
CREATE INDEX `idx_learning_outcome_progress` ON `tbl_learning_outcome_progress`(`trainee_id`, `lesson_id`);
CREATE INDEX `idx_module_progress` ON `tbl_module_progress`(`trainee_id`, `module_id`);
