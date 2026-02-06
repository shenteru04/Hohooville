CREATE TABLE IF NOT EXISTS `tbl_scholarship_type` (
  `scholarship_type_id` int(11) NOT NULL AUTO_INCREMENT,
  `scholarship_name` varchar(100) NOT NULL,
  `description` text,
  `status` enum('active','inactive') DEFAULT 'active',
  PRIMARY KEY (`scholarship_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional: Add is_offered column to tbl_course if not present
-- ALTER TABLE `tbl_course` ADD COLUMN `is_offered` TINYINT(1) DEFAULT 1;