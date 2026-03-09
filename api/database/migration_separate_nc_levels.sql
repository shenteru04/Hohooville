-- Migration: Separate NC Levels from Qualification Names
-- Purpose: Normalize database structure by creating a dedicated NC Levels table
-- Date: March 3, 2026

-- Step 1: Create the tbl_nc_levels reference table
CREATE TABLE `tbl_nc_levels` (
  `nc_level_id` int(11) NOT NULL AUTO_INCREMENT,
  `nc_level_code` varchar(20) NOT NULL UNIQUE,
  `nc_level_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`nc_level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert standard Philippine NC Levels
INSERT INTO `tbl_nc_levels` (`nc_level_code`, `nc_level_name`, `description`, `status`) VALUES
('NC I', 'National Certificate I', 'Entry-level national certification', 'active'),
('NC II', 'National Certificate II', 'Intermediate-level national certification', 'active'),
('NC III', 'National Certificate III', 'Advanced-level national certification', 'active'),
('NC IV', 'National Certificate IV', 'Highest-level national certification', 'active');

-- Step 2: Add nc_level_id column to tbl_qualifications
ALTER TABLE `tbl_qualifications`
ADD COLUMN `nc_level_id` int(11) DEFAULT NULL AFTER `qualification_name`,
ADD FOREIGN KEY (`nc_level_id`) REFERENCES `tbl_nc_levels` (`nc_level_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 3: Update tbl_qualifications to map existing NC levels
-- This query extracts NC level from qualification names and maps to nc_level_id
UPDATE `tbl_qualifications` q
SET q.`nc_level_id` = (
  SELECT nc_level_id FROM `tbl_nc_levels` 
  WHERE nc_level_code = CASE
    WHEN q.`qualification_name` LIKE '%NC IV%' THEN 'NC IV'
    WHEN q.`qualification_name` LIKE '%NC III%' THEN 'NC III'
    WHEN q.`qualification_name` LIKE '%NC II%' THEN 'NC II'
    WHEN q.`qualification_name` LIKE '%NC I%' THEN 'NC I'
    ELSE NULL
  END
);

-- Step 4: Create updated qualification names (remove NC level from end)
-- Create a temporary column to store the new names
ALTER TABLE `tbl_qualifications`
ADD COLUMN `qualification_name_new` varchar(150) DEFAULT NULL;

-- Update the new column with cleaned names
UPDATE `tbl_qualifications`
SET `qualification_name_new` = TRIM(
  CASE
    WHEN `qualification_name` LIKE '%NC IV' THEN TRIM(SUBSTRING(`qualification_name`, 1, LENGTH(`qualification_name`) - 5))
    WHEN `qualification_name` LIKE '%NC III' THEN TRIM(SUBSTRING(`qualification_name`, 1, LENGTH(`qualification_name`) - 6))
    WHEN `qualification_name` LIKE '%NC II' THEN TRIM(SUBSTRING(`qualification_name`, 1, LENGTH(`qualification_name`) - 5))
    WHEN `qualification_name` LIKE '%NC I' THEN TRIM(SUBSTRING(`qualification_name`, 1, LENGTH(`qualification_name`) - 4))
    ELSE `qualification_name`
  END
);

-- Step 5: Swap the old and new column names
ALTER TABLE `tbl_qualifications` DROP COLUMN `qualification_name`;
ALTER TABLE `tbl_qualifications` CHANGE COLUMN `qualification_name_new` `qualification_name` varchar(150) NOT NULL;

-- Step 6: Add proper indexing for better query performance
ALTER TABLE `tbl_qualifications` ADD INDEX `idx_nc_level_id` (`nc_level_id`);
ALTER TABLE `tbl_nc_levels` ADD INDEX `idx_nc_level_code` (`nc_level_code`);

-- Step 7: (Optional) Update tbl_trainer to reference the NC Levels table
-- First, add the nc_level_id column
ALTER TABLE `tbl_trainer`
ADD COLUMN `trainer_nc_level_id` int(11) DEFAULT NULL AFTER `tm_file`,
ADD FOREIGN KEY (`trainer_nc_level_id`) REFERENCES `tbl_nc_levels` (`nc_level_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Update trainer nc_level_id based on existing nc_level values
UPDATE `tbl_trainer` t
SET t.`trainer_nc_level_id` = (
  SELECT nc_level_id FROM `tbl_nc_levels`
  WHERE nc_level_code = t.`nc_level`
)
WHERE t.`nc_level` IS NOT NULL;

-- Step 8: (Optional) Create a view for backward compatibility
-- This view will allow existing queries to continue working
CREATE OR REPLACE VIEW `vw_qualifications_with_nc` AS
SELECT 
  q.`qualification_id`,
  CONCAT(q.`qualification_name`, ' ', COALESCE(nc.`nc_level_code`, '')) AS `qualification_name_with_nc`,
  q.`qualification_name`,
  nc.`nc_level_id`,
  nc.`nc_level_code`,
  nc.`nc_level_name`,
  q.`ctpr_number`,
  q.`training_cost`,
  q.`description`,
  q.`duration`,
  q.`status`,
  q.`is_archived`
FROM `tbl_qualifications` q
LEFT JOIN `tbl_nc_levels` nc ON q.`nc_level_id` = nc.`nc_level_id`;

-- Note: After verifying the migration is correct, you may optionally:
-- 1. Keep the old tbl_trainer.nc_level column for backward compatibility or drop it (ALTER TABLE tbl_trainer DROP COLUMN nc_level;)
-- 2. Update tbl_trainer_qualifications similarly to reference nc_level_id instead of storing the string
-- 3. Update your application code to use the new normalized structure
