-- Normalize trainer addresses into a dedicated table.
-- Run this once on the target database.

CREATE TABLE IF NOT EXISTS `tbl_trainer_address` (
  `address_id` int(11) NOT NULL AUTO_INCREMENT,
  `house_no_street` varchar(255) DEFAULT NULL,
  `barangay` varchar(255) DEFAULT NULL,
  `district` varchar(255) DEFAULT NULL,
  `city_municipality` varchar(255) DEFAULT NULL,
  `province` varchar(255) DEFAULT NULL,
  `region` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`address_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `tbl_trainer`
  ADD COLUMN `address_id` int(11) DEFAULT NULL AFTER `qualification_id`;

ALTER TABLE `tbl_trainer`
  ADD INDEX `idx_trainer_address_id` (`address_id`);

ALTER TABLE `tbl_trainer`
  ADD CONSTRAINT `fk_trainer_address`
  FOREIGN KEY (`address_id`) REFERENCES `tbl_trainer_address` (`address_id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

