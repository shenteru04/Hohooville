-- ============================================================
-- Hohoo-ville Database Schema Fixes
-- Date: 2026-08-17
-- Purpose: Apply audit fixes from COMPREHENSIVE_AUDIT_REPORT.md
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- ============================================================
-- ISSUE #1 (CRITICAL): Fix trainer_type ENUM Mismatch
-- Problem: ENUM values must be 'part timer', 'full timer' (with spaces)
-- Solution: Add or modify trainer_type column on tbl_trainer
-- ============================================================

-- Check if trainer_type column exists; if not, add it with correct ENUM values
-- If it exists with wrong values, update it to correct values

-- Step 1: Check if trainer_type column exists
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tbl_trainer' 
      AND COLUMN_NAME = 'trainer_type'
);

-- Step 2a: If column exists, rename it temporarily
SET @alter_sql = IF(@column_exists = 1,
    'ALTER TABLE `tbl_trainer` CHANGE COLUMN `trainer_type` `trainer_type_old` VARCHAR(50)',
    'SELECT 1'
);
PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2b: Add new column with correct ENUM values
ALTER TABLE `tbl_trainer`
ADD COLUMN `trainer_type` ENUM('part timer', 'full timer') DEFAULT 'full timer';

-- Step 3: Copy data from old column if it exists
SET @update_sql = IF(@column_exists = 1,
    'UPDATE `tbl_trainer` 
    SET `trainer_type` = CASE 
        WHEN `trainer_type_old` IN (\'part-time\', \'part timer\') THEN \'part timer\'
        WHEN `trainer_type_old` IN (\'full-time\', \'full timer\') THEN \'full timer\'
        ELSE \'full timer\'
    END
    WHERE `trainer_type_old` IS NOT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @update_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Drop the old column if it exists
SET @drop_sql = IF(@column_exists = 1,
    'ALTER TABLE `tbl_trainer` DROP COLUMN `trainer_type_old`',
    'SELECT 1'
);
PREPARE stmt FROM @drop_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- ISSUE #1B (CRITICAL): Fix legacy tbl_trainer_qualifications schema
-- Problem: older database dumps use nc_level instead of nc_level_id,
-- but the runtime queries expect nc_level_id for list/detail screens.
-- Solution: add nc_level_id if missing and backfill from legacy nc_level
-- ============================================================

SET @qual_table_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tbl_trainer_qualifications'
);

SET @nc_level_id_exists = IF(@qual_table_exists = 1,
    (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'tbl_trainer_qualifications'
          AND COLUMN_NAME = 'nc_level_id'
    ),
    0
);

SET @add_nc_level_id_sql = IF(@qual_table_exists = 1 AND @nc_level_id_exists = 0,
    'ALTER TABLE `tbl_trainer_qualifications` ADD COLUMN `nc_level_id` INT NULL AFTER `qualification_id`',
    'SELECT 1'
);
PREPARE stmt FROM @add_nc_level_id_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @copy_nc_level_sql = IF(@qual_table_exists = 1 AND @nc_level_id_exists = 0,
    'UPDATE `tbl_trainer_qualifications` tq
     LEFT JOIN `tbl_nc_levels` nc ON nc.nc_level_code = tq.nc_level
     SET tq.nc_level_id = nc.nc_level_id
     WHERE tq.nc_level IS NOT NULL AND tq.nc_level_id IS NULL',
    'SELECT 1'
);
PREPARE stmt FROM @copy_nc_level_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @legacy_nc_level_index = IF(@qual_table_exists = 1,
    'ALTER TABLE `tbl_trainer_qualifications` ADD INDEX IF NOT EXISTS `idx_trainer_qual_nc_level_id` (`nc_level_id`)',
    'SELECT 1'
);
PREPARE stmt FROM @legacy_nc_level_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- ISSUE #2 (HIGH): Remove orphaned tbl_schedule_requests table
-- Problem: Feature was removed from backend and frontend
-- Solution: Drop the table safely
-- ============================================================

DROP TABLE IF EXISTS `tbl_schedule_requests`;

-- ============================================================
-- VERIFICATION QUERIES
-- Run these after applying fixes to verify success
-- Make sure you're in the correct database first!
-- ============================================================

-- Verify trainer_type ENUM values are correct
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tbl_trainer' 
  AND COLUMN_NAME = 'trainer_type';

-- Verify tbl_nc_levels exists
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tbl_nc_levels';

-- Check how many trainers have trainer_type set
SELECT trainer_type, COUNT(*) as count
FROM tbl_trainer
GROUP BY trainer_type
ORDER BY trainer_type;

-- ============================================================
-- ISSUE #3 (CRITICAL): Fix Missing tbl_users Schema Columns
-- Problem: Authentication.php requires columns not in old dumps
-- Solution: Add missing columns needed for login and auth
-- ============================================================

ALTER TABLE `tbl_users` 
ADD COLUMN IF NOT EXISTS `failed_login_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `login_locked_until` DATETIME NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `last_login` TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS `first_name` VARCHAR(100),
ADD COLUMN IF NOT EXISTS `last_name` VARCHAR(100),
ADD COLUMN IF NOT EXISTS `phone` VARCHAR(20);

-- Add missing index for login lockout
ALTER TABLE `tbl_users` 
ADD INDEX IF NOT EXISTS `idx_login_locked_until` (`login_locked_until`);

-- ============================================================
-- COMMIT TRANSACTION
-- ============================================================
COMMIT;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
-- If you see this, all fixes have been applied successfully!
-- Next steps:
-- 1. Run the VERIFICATION QUERIES above to confirm changes
-- 2. Test trainer add/edit forms in the application
-- 3. Create a fresh database backup
-- ============================================================
