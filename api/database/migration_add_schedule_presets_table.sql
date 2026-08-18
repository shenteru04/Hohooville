-- Migration: Add schedule presets table and preserve existing request preset references
CREATE TABLE IF NOT EXISTS `tbl_schedule_presets` (
    `preset_id` INT AUTO_INCREMENT PRIMARY KEY,
    `preset_name` VARCHAR(255) NOT NULL,
    `schedule` VARCHAR(255) NOT NULL,
    `created_by_user_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_schedule` (`schedule`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `tbl_schedule_requests`
    ADD COLUMN IF NOT EXISTS `preset_id` INT NULL AFTER `scope_type`;
