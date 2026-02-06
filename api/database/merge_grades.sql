--
-- SQL script to merge tbl_grades_hdr and tbl_grades_dtl into a single tbl_grades table.
--

-- 1. Create the new unified table `tbl_grades`.
-- This table will store each individual grade entry directly linked to a trainee and a test.
CREATE TABLE `tbl_grades` (
  `grade_id` int(11) NOT NULL AUTO_INCREMENT,
  `trainee_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `test_id` int(11) NOT NULL,
  `score` decimal(10,2) DEFAULT NULL,
  `remarks` varchar(100) DEFAULT NULL,
  `date_recorded` date DEFAULT curdate(),
  PRIMARY KEY (`grade_id`),
  KEY `trainee_id` (`trainee_id`),
  KEY `course_id` (`course_id`),
  KEY `test_id` (`test_id`),
  CONSTRAINT `fk_grades_trainee` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_grades_course` FOREIGN KEY (`course_id`) REFERENCES `tbl_course` (`course_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_grades_test` FOREIGN KEY (`test_id`) REFERENCES `tbl_test` (`test_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Migrate the data from the old tables into the new `tbl_grades` table.
INSERT INTO `tbl_grades` (`trainee_id`, `course_id`, `test_id`, `score`, `remarks`, `date_recorded`)
SELECT h.trainee_id, h.course_id, d.test_id, d.score, d.remarks, h.date_recorded
FROM `tbl_grades_dtl` d
JOIN `tbl_grades_hdr` h ON d.grades_hdr_id = h.grades_hdr_id;

-- 3. (Optional) After verifying the data migration, you can drop the old tables.
-- DROP TABLE `tbl_grades_dtl`;
-- DROP TABLE `tbl_grades_hdr`;
