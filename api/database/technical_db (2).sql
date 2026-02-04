-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 27, 2026 at 06:15 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


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
  `status` enum('present','absent','late') DEFAULT 'present',
  `remarks` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_attendance_dtl`
--

INSERT INTO `tbl_attendance_dtl` (`attendance_dtl_id`, `attendance_hdr_id`, `trainee_id`, `status`, `remarks`) VALUES
(9, 1, 2, 'present', ''),
(10, 1, 3, 'present', ''),
(11, 2, 2, 'present', ''),
(12, 2, 3, 'present', '');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_attendance_hdr`
--

CREATE TABLE `tbl_attendance_hdr` (
  `attendance_hdr_id` int(11) NOT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `date_recorded` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_attendance_hdr`
--

INSERT INTO `tbl_attendance_hdr` (`attendance_hdr_id`, `batch_id`, `date_recorded`) VALUES
(1, 1, '2026-01-13'),
(2, 1, '2026-01-14');

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

--
-- Dumping data for table `tbl_batch`
--

INSERT INTO `tbl_batch` (`batch_id`, `batch_name`, `start_date`, `end_date`, `status`) VALUES
(1, 'Batch 2025', '2025-12-28', '2025-12-28', 'open');

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

--
-- Dumping data for table `tbl_certificate`
--

INSERT INTO `tbl_certificate` (`certificate_id`, `trainee_id`, `course_id`, `issue_date`, `validity_date`, `certificate_status`) VALUES
(3, 2, 1, '2026-01-13', '2026-02-13', 'valid');

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
  `status` enum('active','inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_course`
--

INSERT INTO `tbl_course` (`course_id`, `course_name`, `ctpr_number`, `training_cost`, `description`, `duration`, `status`) VALUES
(1, 'Electrical Installation and Maintenance NC II', 'CTPR-0001-2024', 18000.00, 'Electrical Installation and Maintenance NC II equips learners with skills to install, maintain, and repair electrical wiring and equipment in residential and commercial buildings, following safety standards and the Philippine Electrical Code.', '720 hours', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_enrolled_trainee`
--

CREATE TABLE `tbl_enrolled_trainee` (
  `enrolled_id` int(11) NOT NULL,
  `enrollment_id` int(11) NOT NULL,
  `trainee_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_enrolled_trainee`
--

INSERT INTO `tbl_enrolled_trainee` (`enrolled_id`, `enrollment_id`, `trainee_id`) VALUES
(1, 1, 2),
(2, 2, 3),
(3, 3, 4);

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

--
-- Dumping data for table `tbl_enrollment`
--

INSERT INTO `tbl_enrollment` (`enrollment_id`, `trainee_id`, `offered_id`, `batch_id`, `enrollment_date`, `status`) VALUES
(1, 2, 1, 1, '2026-01-11', 'approved'),
(2, 3, 1, 1, '2026-01-11', 'approved'),
(3, 4, 1, 1, '2026-01-27', 'approved');

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
  `date_recorded` date DEFAULT curdate(),
  `pre_test` decimal(5,2) DEFAULT 0.00,
  `post_test` decimal(5,2) DEFAULT 0.00,
  `activities` decimal(5,2) DEFAULT 0.00,
  `quizzes` decimal(5,2) DEFAULT 0.00,
  `task_sheets` decimal(5,2) DEFAULT 0.00
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
  `lesson_description` text DEFAULT NULL
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

--
-- Dumping data for table `tbl_module`
--

INSERT INTO `tbl_module` (`module_id`, `course_id`, `module_title`, `module_description`) VALUES
(1, 1, 'Introduction', 'Test Module'),
(2, 1, 'Module 1', 'Test');

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

--
-- Dumping data for table `tbl_offered_courses`
--

INSERT INTO `tbl_offered_courses` (`offered_id`, `course_id`, `trainer_id`, `start_date`, `end_date`, `schedule`, `room`) VALUES
(1, 1, 1, NULL, NULL, 'Day Shift (8:00 AM - 5:00 PM)', 'Room1');

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
(1, 'admin'),
(2, 'trainer'),
(3, 'trainee'),
(4, 'registrar');

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

--
-- Dumping data for table `tbl_scholarship`
--

INSERT INTO `tbl_scholarship` (`scholarship_id`, `trainee_id`, `scholarship_name`, `amount`, `sponsor`, `date_granted`) VALUES
(1, 2, 'TWSP', NULL, NULL, '2026-01-11'),
(2, 3, 'TTSP', NULL, NULL, '2026-01-11'),
(3, 3, 'TTSP', NULL, NULL, '2026-01-11'),
(4, 4, 'STEP', NULL, NULL, '2026-01-27'),
(5, 4, 'TWSP', NULL, NULL, '2026-01-27');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_scholarship_type`
--

CREATE TABLE `tbl_scholarship_type` (
  `scholarship_type_id` int(11) NOT NULL,
  `scholarship_name` varchar(50) NOT NULL,
  `scholarship_provider` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_scholarship_type`
--

INSERT INTO `tbl_scholarship_type` (`scholarship_type_id`, `scholarship_name`, `scholarship_provider`, `description`, `status`, `created_at`) VALUES
(1, 'TWSP', 'TESDA', 'Training for Work Scholarship Program', 'active', '2026-01-11 03:40:12'),
(2, 'TTSP', 'TESDA', 'Tulong Trabaho Scholarship Program', 'active', '2026-01-11 03:40:12'),
(3, 'STEP', 'TESDA', 'Special Training for Employment Program', 'active', '2026-01-11 03:40:12'),
(4, 'PESFA', 'TESDA', 'Private Education Student Financial Assistance', 'active', '2026-01-11 03:40:12');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_score_type`
--

CREATE TABLE `tbl_score_type` (
  `score_type_id` int(11) NOT NULL,
  `score_type_name` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `status` enum('active','inactive') DEFAULT 'active',
  `valid_id_file` varchar(255) DEFAULT NULL,
  `birth_cert_file` varchar(255) DEFAULT NULL,
  `photo_file` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_trainee`
--

INSERT INTO `tbl_trainee` (`trainee_id`, `user_id`, `first_name`, `last_name`, `birth_certificate_no`, `email`, `phone_number`, `address`, `ctpr_no`, `nominal_duration`, `status`, `valid_id_file`, `birth_cert_file`, `photo_file`) VALUES
(2, 8, 'Shankai', 'Bai', NULL, 'shangkaibai@hotel.com', '09678715483', 'Zone 1', NULL, NULL, 'active', 'valid_id_1768108215_dasfasasf.png', 'birth_1768108215_dasfasasf.png', 'photo_1768108215_dasfasasf.png'),
(3, 9, 'Christian', 'Boncales', NULL, 'christianboncales@gmail.com', '1324148934', 'Zon12', NULL, NULL, 'active', 'valid_id_1768109034_Screenshot (1).png', 'birth_1768109034_Screenshot (3).png', 'photo_1768109034_Screenshot (6).png'),
(4, 11, 'Christian', 'vill', '65467457', 'christianboncales@gmail.com', '09123456789', 'guiguig', 'CTPR-0001-2024', '720 hours', 'active', 'valid_id_1769485809_94d16014-07a6-4a8b-b3eb-562432a3b819.jfif', 'birth_1769485809_64563a22-b1b4-487a-b7a0-9627907c3c5e.jfif', 'photo_1769485809_228a2415-a38e-4f27-b762-37d2ae1aec3a.jfif');

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

--
-- Dumping data for table `tbl_trainer`
--

INSERT INTO `tbl_trainer` (`trainer_id`, `user_id`, `first_name`, `last_name`, `email`, `phone_number`, `specialization`, `address`, `nttc_no`, `nttc_file`, `tm_file`, `nc_level`, `nc_file`, `experience_file`, `status`) VALUES
(1, 10, 'Juan', 'Dela cruz', 'juan@gmail.com', '09123456789', 'Electrical Installation and Maintenance NC II', 'Zone 3 balani', 'NTTC-2023-045678', 'nttc_1768116930_Screenshot (2).png', 'tm_1768116930_Screenshot (5).png', 'NC II', 'nc_1768116930_Screenshot (6).png', 'exp_1768116930_Screenshot (5).png', 'active');

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
(1, 1, 'admin', '$2y$10$Vsq9xQNQ.nmTxYIPKE3jauARXhMCyaPUMBBEdU6dXDHhJv4.iUxIG', 'admin@technical.com', 'active', '2025-12-22 11:20:13'),
(8, 3, 'bai', '$2y$10$3nA/U0QXNvwvIHH6x/wLheYpF6Za4qf11dfsXhNSv0.5iwpwaudmW', 'shangkaibai@hotel.com', 'active', '2026-01-11 14:14:45'),
(9, 3, 'christiand', '$2y$10$uY4EambD.iM1a1b6qUVCZOYXvEBrqwKYo3gC0BtTJhKtsq8yWtcrK', 'christianboncales@gmail.com', 'active', '2026-01-11 14:15:30'),
(10, 2, 'Juan', '$2y$10$pVNvO.T.Ealmtuc6buthQO8/Vy1IRUKqKcpNXwWkgTYus4EM3Obuu', 'juan@gmail.com', 'active', '2026-01-11 19:21:40'),
(11, 4, 'vill', '$2y$10$Qfd/GTh3M/KUMcK5sPnQUeBA/ZNFu/fPKry5Es5bmsdNvgQIBdhmi', 'christianboncales1@gmail.com', 'active', '2026-01-27 11:50:25');

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
-- Indexes for table `tbl_scholarship_type`
--
ALTER TABLE `tbl_scholarship_type`
  ADD PRIMARY KEY (`scholarship_type_id`);

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
  MODIFY `attendance_dtl_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `tbl_attendance_hdr`
--
ALTER TABLE `tbl_attendance_hdr`
  MODIFY `attendance_hdr_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_batch`
--
ALTER TABLE `tbl_batch`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_certificate`
--
ALTER TABLE `tbl_certificate`
  MODIFY `certificate_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_course`
--
ALTER TABLE `tbl_course`
  MODIFY `course_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_enrolled_trainee`
--
ALTER TABLE `tbl_enrolled_trainee`
  MODIFY `enrolled_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_enrollment`
--
ALTER TABLE `tbl_enrollment`
  MODIFY `enrollment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
  MODIFY `grades_hdr_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_lessons`
--
ALTER TABLE `tbl_lessons`
  MODIFY `lesson_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_module`
--
ALTER TABLE `tbl_module`
  MODIFY `module_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_offered_courses`
--
ALTER TABLE `tbl_offered_courses`
  MODIFY `offered_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_role`
--
ALTER TABLE `tbl_role`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_scholarship`
--
ALTER TABLE `tbl_scholarship`
  MODIFY `scholarship_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_scholarship_type`
--
ALTER TABLE `tbl_scholarship_type`
  MODIFY `scholarship_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

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
  MODIFY `trainee_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_trainer`
--
ALTER TABLE `tbl_trainer`
  MODIFY `trainer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_training`
--
ALTER TABLE `tbl_training`
  MODIFY `training_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

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

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
