-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 22, 2025 at 04:23 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `technical_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `tbl_activities_type`
--

CREATE TABLE `tbl_activities_type` (
  `activity_type_id` int(11) NOT NULL,
  `activity_name` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_attendance_dtl`
--

CREATE TABLE `tbl_attendance_dtl` (
  `attendance_dtl_id` int(11) NOT NULL,
  `attendance_hdr_id` int(11) DEFAULT NULL,
  `trainee_id` int(11) DEFAULT NULL,
  `status` enum('present','absent','late') DEFAULT 'present'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_attendance_hdr`
--

CREATE TABLE `tbl_attendance_hdr` (
  `attendance_hdr_id` int(11) NOT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `date_recorded` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_batch`
--

CREATE TABLE `tbl_batch` (
  `batch_id` int(11) NOT NULL,
  `batch_name` varchar(100) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('open','closed') DEFAULT 'open'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_certificate`
--

CREATE TABLE `tbl_certificate` (
  `certificate_id` int(11) NOT NULL,
  `trainee_id` int(11) DEFAULT NULL,
  `course_id` int(11) DEFAULT NULL,
  `issue_date` date DEFAULT curdate(),
  `validity_date` date DEFAULT NULL,
  `certificate_status` enum('valid','expired') DEFAULT 'valid'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_course`
--

CREATE TABLE `tbl_course` (
  `course_id` int(11) NOT NULL,
  `course_name` varchar(150) NOT NULL,
  `ctpr_number` varchar(100) DEFAULT NULL,
  `training_cost` decimal(10,2) DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `duration` varchar(50) DEFAULT NULL,
  `status` enum('active','inactive','pending','rejected') DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_enrolled_trainee`
--

CREATE TABLE `tbl_enrolled_trainee` (
  `enrolled_id` int(11) NOT NULL,
  `enrollment_id` int(11) NOT NULL,
  `trainee_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_enrollment`
--

CREATE TABLE `tbl_enrollment` (
  `enrollment_id` int(11) NOT NULL,
  `trainee_id` int(11) DEFAULT NULL,
  `offered_id` int(11) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `enrollment_date` date DEFAULT curdate(),
  `status` enum('pending','approved','rejected') DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_feedback`
--

CREATE TABLE `tbl_feedback` (
  `feedback_id` int(11) NOT NULL,
  `trainee_id` int(11) DEFAULT NULL,
  `trainer_id` int(11) DEFAULT NULL,
  `feedback_text` text DEFAULT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` between 1 and 5),
  `date_submitted` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_finance_record`
--

CREATE TABLE `tbl_finance_record` (
  `finance_id` int(11) NOT NULL,
  `trainee_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `payment_method` enum('cash','gcash','card') DEFAULT 'cash',
  `reference_no` varchar(100) DEFAULT NULL,
  `remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_grades_dtl`
--

CREATE TABLE `tbl_grades_dtl` (
  `grades_dtl_id` int(11) NOT NULL,
  `grades_hdr_id` int(11) DEFAULT NULL,
  `test_id` int(11) DEFAULT NULL,
  `score` decimal(10,2) DEFAULT NULL,
  `remarks` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_grades_hdr`
--

CREATE TABLE `tbl_grades_hdr` (
  `grades_hdr_id` int(11) NOT NULL,
  `trainee_id` int(11) DEFAULT NULL,
  `course_id` int(11) DEFAULT NULL,
  `total_grade` decimal(5,2) DEFAULT NULL,
  `remarks` varchar(100) DEFAULT NULL,
  `date_recorded` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_lessons`
--

CREATE TABLE `tbl_lessons` (
  `lesson_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `day_number` int(11) DEFAULT NULL,
  `lesson_title` varchar(150) DEFAULT NULL,
  `lesson_description` text DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `posting_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_module`
--

CREATE TABLE `tbl_module` (
  `module_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `module_title` varchar(150) DEFAULT NULL,
  `module_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_offered_courses`
--

CREATE TABLE `tbl_offered_courses` (
  `offered_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `trainer_id` int(11) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `schedule` varchar(100) DEFAULT NULL,
  `room` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_quiz_options`
--

CREATE TABLE `tbl_quiz_options` (
  `option_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `option_text` text NOT NULL,
  `is_correct` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_quiz_questions`
--

CREATE TABLE `tbl_quiz_questions` (
  `question_id` int(11) NOT NULL,
  `test_id` int(11) NOT NULL,
  `question_text` text NOT NULL,
  `question_type` enum('multiple_choice','true_false') DEFAULT 'multiple_choice'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_role`
--

CREATE TABLE `tbl_role` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_role`
--

INSERT INTO `tbl_role` (`role_id`, `role_name`) VALUES
(1, 'admin');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_scholarship`
--

CREATE TABLE `tbl_scholarship` (
  `scholarship_id` int(11) NOT NULL,
  `trainee_id` int(11) DEFAULT NULL,
  `scholarship_name` varchar(150) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `sponsor` varchar(150) DEFAULT NULL,
  `date_granted` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_score_type`
--

CREATE TABLE `tbl_score_type` (
  `score_type_id` int(11) NOT NULL,
  `score_type_name` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_score_type`
--

INSERT INTO `tbl_score_type` (`score_type_id`, `score_type_name`, `description`) VALUES
(1, 'Raw Score', 'Total number of correct answers'),
(2, 'Percentage', 'Score in percentage');

--
-- Dumping data for table `tbl_activities_type`
--

INSERT INTO `tbl_activities_type` (`activity_type_id`, `activity_name`, `description`) VALUES
(1, 'Quiz', 'Written assessment or multiple choice questions'),
(2, 'Task Sheet', 'Practical demonstration or hands-on activity');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_test`
--

CREATE TABLE `tbl_test` (
  `test_id` int(11) NOT NULL,
  `lesson_id` int(11) DEFAULT NULL,
  `activity_type_id` int(11) DEFAULT NULL,
  `score_type_id` int(11) DEFAULT NULL,
  `max_score` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_trainee`
--

CREATE TABLE `tbl_trainee` (
  `trainee_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `birth_certificate_no` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `ctpr_no` varchar(100) DEFAULT NULL,
  `nominal_duration` varchar(100) DEFAULT NULL,
  `valid_id_file` varchar(255) DEFAULT NULL,
  `birth_cert_file` varchar(255) DEFAULT NULL,
  `photo_file` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_trainer`
--

CREATE TABLE `tbl_trainer` (
  `trainer_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `specialization` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `nttc_no` varchar(100) DEFAULT NULL,
  `nttc_file` varchar(255) DEFAULT NULL,
  `tm_file` varchar(255) DEFAULT NULL,
  `nc_level` varchar(100) DEFAULT NULL,
  `nc_file` varchar(255) DEFAULT NULL,
  `experience_file` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_training`
--

CREATE TABLE `tbl_training` (
  `training_id` int(11) NOT NULL,
  `trainee_id` int(11) DEFAULT NULL,
  `trainer_id` int(11) DEFAULT NULL,
  `course_id` int(11) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('ongoing','completed','dropped') DEFAULT 'ongoing'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_users`
--

CREATE TABLE `tbl_users` (
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `date_created` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_users`
--

INSERT INTO `tbl_users` (`user_id`, `role_id`, `username`, `password`, `email`, `status`, `date_created`) VALUES
(1, 1, 'admin', '$2y$10$7z0iVb55/tLTETSXSFWNveaQTtrYyuejAwDfm1pWaHqRWUItO/7qK', 'admin@technical.com', 'active', '2025-12-22 11:20:13');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_activities_type`
--
ALTER TABLE `tbl_activities_type`
  ADD PRIMARY KEY (`activity_type_id`);

--
-- Indexes for table `tbl_attendance_dtl`
--
ALTER TABLE `tbl_attendance_dtl`
  ADD PRIMARY KEY (`attendance_dtl_id`),
  ADD KEY `attendance_hdr_id` (`attendance_hdr_id`),
  ADD KEY `trainee_id` (`trainee_id`);

--
-- Indexes for table `tbl_attendance_hdr`
--
ALTER TABLE `tbl_attendance_hdr`
  ADD PRIMARY KEY (`attendance_hdr_id`),
  ADD KEY `batch_id` (`batch_id`);

--
-- Indexes for table `tbl_batch`
--
ALTER TABLE `tbl_batch`
  ADD PRIMARY KEY (`batch_id`);

--
-- Indexes for table `tbl_certificate`
--
ALTER TABLE `tbl_certificate`
  ADD PRIMARY KEY (`certificate_id`),
  ADD KEY `trainee_id` (`trainee_id`),
  ADD KEY `course_id` (`course_id`);

--
-- Indexes for table `tbl_course`
--
ALTER TABLE `tbl_course`
  ADD PRIMARY KEY (`course_id`);

--
-- Indexes for table `tbl_enrolled_trainee`
--
ALTER TABLE `tbl_enrolled_trainee`
  ADD PRIMARY KEY (`enrolled_id`),
  ADD KEY `enrollment_id` (`enrollment_id`),
  ADD KEY `trainee_id` (`trainee_id`);

--
-- Indexes for table `tbl_enrollment`
--
ALTER TABLE `tbl_enrollment`
  ADD PRIMARY KEY (`enrollment_id`),
  ADD KEY `trainee_id` (`trainee_id`),
  ADD KEY `offered_id` (`offered_id`),
  ADD KEY `batch_id` (`batch_id`);

--
-- Indexes for table `tbl_feedback`
--
ALTER TABLE `tbl_feedback`
  ADD PRIMARY KEY (`feedback_id`),
  ADD KEY `trainee_id` (`trainee_id`),
  ADD KEY `trainer_id` (`trainer_id`);

--
-- Indexes for table `tbl_finance_record`
--
ALTER TABLE `tbl_finance_record`
  ADD PRIMARY KEY (`finance_id`),
  ADD KEY `trainee_id` (`trainee_id`);

--
-- Indexes for table `tbl_grades_dtl`
--
ALTER TABLE `tbl_grades_dtl`
  ADD PRIMARY KEY (`grades_dtl_id`),
  ADD KEY `grades_hdr_id` (`grades_hdr_id`),
  ADD KEY `test_id` (`test_id`);

--
-- Indexes for table `tbl_grades_hdr`
--
ALTER TABLE `tbl_grades_hdr`
  ADD PRIMARY KEY (`grades_hdr_id`),
  ADD KEY `trainee_id` (`trainee_id`),
  ADD KEY `course_id` (`course_id`);

--
-- Indexes for table `tbl_lessons`
--
ALTER TABLE `tbl_lessons`
  ADD PRIMARY KEY (`lesson_id`),
  ADD KEY `module_id` (`module_id`);

--
-- Indexes for table `tbl_module`
--
ALTER TABLE `tbl_module`
  ADD PRIMARY KEY (`module_id`),
  ADD KEY `course_id` (`course_id`);

--
-- Indexes for table `tbl_offered_courses`
--
ALTER TABLE `tbl_offered_courses`
  ADD PRIMARY KEY (`offered_id`),
  ADD KEY `course_id` (`course_id`),
  ADD KEY `trainer_id` (`trainer_id`);

--
-- Indexes for table `tbl_quiz_options`
--
ALTER TABLE `tbl_quiz_options`
  ADD PRIMARY KEY (`option_id`),
  ADD KEY `question_id` (`question_id`);

--
-- Indexes for table `tbl_quiz_questions`
--
ALTER TABLE `tbl_quiz_questions`
  ADD PRIMARY KEY (`question_id`),
  ADD KEY `test_id` (`test_id`);

--
-- Indexes for table `tbl_role`
--
ALTER TABLE `tbl_role`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `tbl_scholarship`
--
ALTER TABLE `tbl_scholarship`
  ADD PRIMARY KEY (`scholarship_id`),
  ADD KEY `trainee_id` (`trainee_id`);

--
-- Indexes for table `tbl_score_type`
--
ALTER TABLE `tbl_score_type`
  ADD PRIMARY KEY (`score_type_id`);

--
-- Indexes for table `tbl_test`
--
ALTER TABLE `tbl_test`
  ADD PRIMARY KEY (`test_id`),
  ADD KEY `lesson_id` (`lesson_id`),
  ADD KEY `activity_type_id` (`activity_type_id`),
  ADD KEY `score_type_id` (`score_type_id`);

--
-- Indexes for table `tbl_trainee`
--
ALTER TABLE `tbl_trainee`
  ADD PRIMARY KEY (`trainee_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `tbl_trainer`
--
ALTER TABLE `tbl_trainer`
  ADD PRIMARY KEY (`trainer_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `tbl_training`
--
ALTER TABLE `tbl_training`
  ADD PRIMARY KEY (`training_id`),
  ADD KEY `trainee_id` (`trainee_id`),
  ADD KEY `trainer_id` (`trainer_id`),
  ADD KEY `course_id` (`course_id`);

--
-- Indexes for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `role_id` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tbl_activities_type`
--
ALTER TABLE `tbl_activities_type`
  MODIFY `activity_type_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_attendance_dtl`
--
ALTER TABLE `tbl_attendance_dtl`
  MODIFY `attendance_dtl_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_attendance_hdr`
--
ALTER TABLE `tbl_attendance_hdr`
  MODIFY `attendance_hdr_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_batch`
--
ALTER TABLE `tbl_batch`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_certificate`
--
ALTER TABLE `tbl_certificate`
  MODIFY `certificate_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_course`
--
ALTER TABLE `tbl_course`
  MODIFY `course_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_enrolled_trainee`
--
ALTER TABLE `tbl_enrolled_trainee`
  MODIFY `enrolled_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_enrollment`
--
ALTER TABLE `tbl_enrollment`
  MODIFY `enrollment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_feedback`
--
ALTER TABLE `tbl_feedback`
  MODIFY `feedback_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_finance_record`
--
ALTER TABLE `tbl_finance_record`
  MODIFY `finance_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_grades_dtl`
--
ALTER TABLE `tbl_grades_dtl`
  MODIFY `grades_dtl_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_grades_hdr`
--
ALTER TABLE `tbl_grades_hdr`
  MODIFY `grades_hdr_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_lessons`
--
ALTER TABLE `tbl_lessons`
  MODIFY `lesson_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_module`
--
ALTER TABLE `tbl_module`
  MODIFY `module_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_offered_courses`
--
ALTER TABLE `tbl_offered_courses`
  MODIFY `offered_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_quiz_options`
--
ALTER TABLE `tbl_quiz_options`
  MODIFY `option_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_quiz_questions`
--
ALTER TABLE `tbl_quiz_questions`
  MODIFY `question_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_role`
--
ALTER TABLE `tbl_role`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_scholarship`
--
ALTER TABLE `tbl_scholarship`
  MODIFY `scholarship_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_score_type`
--
ALTER TABLE `tbl_score_type`
  MODIFY `score_type_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_test`
--
ALTER TABLE `tbl_test`
  MODIFY `test_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_trainee`
--
ALTER TABLE `tbl_trainee`
  MODIFY `trainee_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_trainer`
--
ALTER TABLE `tbl_trainer`
  MODIFY `trainer_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_training`
--
ALTER TABLE `tbl_training`
  MODIFY `training_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tbl_attendance_dtl`
--
ALTER TABLE `tbl_attendance_dtl`
  ADD CONSTRAINT `tbl_attendance_dtl_ibfk_1` FOREIGN KEY (`attendance_hdr_id`) REFERENCES `tbl_attendance_hdr` (`attendance_hdr_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_attendance_dtl_ibfk_2` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_attendance_hdr`
--
ALTER TABLE `tbl_attendance_hdr`
  ADD CONSTRAINT `tbl_attendance_hdr_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_certificate`
--
ALTER TABLE `tbl_certificate`
  ADD CONSTRAINT `tbl_certificate_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_certificate_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `tbl_course` (`course_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_enrolled_trainee`
--
ALTER TABLE `tbl_enrolled_trainee`
  ADD CONSTRAINT `tbl_enrolled_trainee_ibfk_1` FOREIGN KEY (`enrollment_id`) REFERENCES `tbl_enrollment` (`enrollment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_enrolled_trainee_ibfk_2` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_enrollment`
--
ALTER TABLE `tbl_enrollment`
  ADD CONSTRAINT `tbl_enrollment_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_enrollment_ibfk_2` FOREIGN KEY (`offered_id`) REFERENCES `tbl_offered_courses` (`offered_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_enrollment_ibfk_3` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `tbl_feedback`
--
ALTER TABLE `tbl_feedback`
  ADD CONSTRAINT `tbl_feedback_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_feedback_ibfk_2` FOREIGN KEY (`trainer_id`) REFERENCES `tbl_trainer` (`trainer_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_finance_record`
--
ALTER TABLE `tbl_finance_record`
  ADD CONSTRAINT `tbl_finance_record_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_grades_dtl`
--
ALTER TABLE `tbl_grades_dtl`
  ADD CONSTRAINT `tbl_grades_dtl_ibfk_1` FOREIGN KEY (`grades_hdr_id`) REFERENCES `tbl_grades_hdr` (`grades_hdr_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_grades_dtl_ibfk_2` FOREIGN KEY (`test_id`) REFERENCES `tbl_test` (`test_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_grades_hdr`
--
ALTER TABLE `tbl_grades_hdr`
  ADD CONSTRAINT `tbl_grades_hdr_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_grades_hdr_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `tbl_course` (`course_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_lessons`
--
ALTER TABLE `tbl_lessons`
  ADD CONSTRAINT `tbl_lessons_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `tbl_module` (`module_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_module`
--
ALTER TABLE `tbl_module`
  ADD CONSTRAINT `tbl_module_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `tbl_course` (`course_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_offered_courses`
--
ALTER TABLE `tbl_offered_courses`
  ADD CONSTRAINT `tbl_offered_courses_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `tbl_course` (`course_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_offered_courses_ibfk_2` FOREIGN KEY (`trainer_id`) REFERENCES `tbl_trainer` (`trainer_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `tbl_quiz_options`
--
ALTER TABLE `tbl_quiz_options`
  ADD CONSTRAINT `tbl_quiz_options_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `tbl_quiz_questions` (`question_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_quiz_questions`
--
ALTER TABLE `tbl_quiz_questions`
  ADD CONSTRAINT `tbl_quiz_questions_ibfk_1` FOREIGN KEY (`test_id`) REFERENCES `tbl_test` (`test_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_scholarship`
--
ALTER TABLE `tbl_scholarship`
  ADD CONSTRAINT `tbl_scholarship_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_test`
--
ALTER TABLE `tbl_test`
  ADD CONSTRAINT `tbl_test_ibfk_1` FOREIGN KEY (`lesson_id`) REFERENCES `tbl_lessons` (`lesson_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_test_ibfk_2` FOREIGN KEY (`activity_type_id`) REFERENCES `tbl_activities_type` (`activity_type_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_test_ibfk_3` FOREIGN KEY (`score_type_id`) REFERENCES `tbl_score_type` (`score_type_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_trainee`
--
ALTER TABLE `tbl_trainee`
  ADD CONSTRAINT `tbl_trainee_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_trainer`
--
ALTER TABLE `tbl_trainer`
  ADD CONSTRAINT `tbl_trainer_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_training`
--
ALTER TABLE `tbl_training`
  ADD CONSTRAINT `tbl_training_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_training_ibfk_2` FOREIGN KEY (`trainer_id`) REFERENCES `tbl_trainer` (`trainer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_training_ibfk_3` FOREIGN KEY (`course_id`) REFERENCES `tbl_course` (`course_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD CONSTRAINT `tbl_users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `tbl_role` (`role_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
