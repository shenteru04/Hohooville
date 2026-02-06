--
-- This script renames `tbl_course` to `tbl_qualifications` and `tbl_offered_courses` to `tbl_offered_qualifications`.
-- It also updates their primary keys and all foreign keys that reference them.
--
-- IMPORTANT: BACK UP YOUR DATABASE BEFORE RUNNING THIS SCRIPT.
--

SET FOREIGN_KEY_CHECKS=0;

-- Step 1: Drop old foreign key constraints from their ORIGINAL tables
ALTER TABLE `tbl_certificate` DROP FOREIGN KEY `tbl_certificate_ibfk_2`;
ALTER TABLE `tbl_enrollment` DROP FOREIGN KEY `tbl_enrollment_ibfk_2`;
ALTER TABLE `tbl_grades` DROP FOREIGN KEY `fk_grades_course`;
ALTER TABLE `tbl_module` DROP FOREIGN KEY `tbl_module_ibfk_1`;
ALTER TABLE `tbl_offered_courses` DROP FOREIGN KEY `tbl_offered_courses_ibfk_1`;
ALTER TABLE `tbl_training` DROP FOREIGN KEY `tbl_training_ibfk_3`;

-- Step 2: Rename the main tables
ALTER TABLE `tbl_course` RENAME TO `tbl_qualifications`;
ALTER TABLE `tbl_offered_courses` RENAME TO `tbl_offered_qualifications`;

-- Step 3: Change the primary key column names in the renamed tables
ALTER TABLE `tbl_qualifications` CHANGE `course_id` `qualification_id` INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `tbl_offered_qualifications` CHANGE `offered_id` `offered_qualification_id` INT(11) NOT NULL AUTO_INCREMENT;

-- Step 4: Change the foreign key column names in all dependent tables
ALTER TABLE `tbl_batch` CHANGE `course_id` `qualification_id` INT(11) DEFAULT NULL;
ALTER TABLE `tbl_certificate` CHANGE `course_id` `qualification_id` INT(11) DEFAULT NULL;
ALTER TABLE `tbl_enrollment` CHANGE `offered_id` `offered_qualification_id` INT(11) DEFAULT NULL;
ALTER TABLE `tbl_grades` CHANGE `course_id` `qualification_id` INT(11) NOT NULL;
ALTER TABLE `tbl_module` CHANGE `course_id` `qualification_id` INT(11) NOT NULL;
ALTER TABLE `tbl_offered_qualifications` CHANGE `course_id` `qualification_id` INT(11) NOT NULL;
ALTER TABLE `tbl_training` CHANGE `course_id` `qualification_id` INT(11) DEFAULT NULL;

-- Step 5: Add new foreign key constraints with the updated names
ALTER TABLE `tbl_batch` 
  ADD CONSTRAINT `fk_batch_qualification` FOREIGN KEY (`qualification_id`) REFERENCES `tbl_qualifications` (`qualification_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `tbl_certificate` 
  ADD CONSTRAINT `fk_certificate_qualification` FOREIGN KEY (`qualification_id`) REFERENCES `tbl_qualifications` (`qualification_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tbl_enrollment` 
  ADD CONSTRAINT `fk_enrollment_offered_qualification` FOREIGN KEY (`offered_qualification_id`) REFERENCES `tbl_offered_qualifications` (`offered_qualification_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tbl_grades` 
  ADD CONSTRAINT `fk_grades_qualification` FOREIGN KEY (`qualification_id`) REFERENCES `tbl_qualifications` (`qualification_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tbl_module` 
  ADD CONSTRAINT `fk_module_qualification` FOREIGN KEY (`qualification_id`) REFERENCES `tbl_qualifications` (`qualification_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tbl_offered_qualifications` 
  ADD CONSTRAINT `fk_offered_qualification_qualification` FOREIGN KEY (`qualification_id`) REFERENCES `tbl_qualifications` (`qualification_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tbl_training` 
  ADD CONSTRAINT `fk_training_qualification` FOREIGN KEY (`qualification_id`) REFERENCES `tbl_qualifications` (`qualification_id`) ON DELETE CASCADE ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS=1;

COMMIT;