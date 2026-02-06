-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 05, 2026 at 02:41 AM
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

--
-- Dumping data for table `tbl_activities_type`
--

INSERT INTO `tbl_activities_type` (`activity_type_id`, `activity_name`, `description`) VALUES
(1, 'Quiz', 'Written assessment or multiple choice questions'),
(2, 'Task Sheet', 'Practical demonstration or hands-on activity');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_activity_logs`
--

CREATE TABLE `tbl_activity_logs` (
  `activity_log_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `table_name` varchar(50) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `timestamp` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_activity_logs`
--

INSERT INTO `tbl_activity_logs` (`activity_log_id`, `user_id`, `action`, `table_name`, `record_id`, `details`, `ip_address`, `timestamp`) VALUES
(1, 10, 'login_success', 'tbl_users', 10, 'User logged in successfully', '::1', '2026-01-28 15:49:39'),
(2, 10, 'login_success', 'tbl_users', 10, 'User logged in successfully', '::1', '2026-01-28 15:57:51'),
(3, 15, 'login_success', 'tbl_users', 15, 'User logged in successfully', '::1', '2026-01-29 15:15:26'),
(4, 14, 'login_success', 'tbl_users', 14, 'User logged in successfully', '::1', '2026-01-29 15:16:26'),
(5, 14, 'login_success', 'tbl_users', 14, 'User logged in successfully', '::1', '2026-01-29 15:31:20'),
(6, 10, 'login_success', 'tbl_users', 10, 'User logged in successfully', '::1', '2026-01-29 15:59:54'),
(7, 12, 'login_success', 'tbl_users', 12, 'User logged in successfully', '::1', '2026-01-29 16:03:42'),
(8, 1, 'login_success', 'tbl_users', 1, 'User logged in successfully', '::1', '2026-02-04 19:41:52'),
(9, 1, 'login_success', 'tbl_users', 1, 'User logged in successfully', '::1', '2026-02-04 19:43:11'),
(10, 10, 'login_success', 'tbl_users', 10, 'User logged in successfully', '::1', '2026-02-05 08:35:44'),
(11, 10, 'login_success', 'tbl_users', 10, 'User logged in successfully', '::1', '2026-02-05 09:22:08');

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
  `course_id` int(11) DEFAULT NULL,
  `trainer_id` int(11) DEFAULT NULL,
  `scholarship_type` varchar(100) DEFAULT NULL,
  `scholarship_type_id` int(11) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('open','closed') DEFAULT 'open'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_batch`
--

INSERT INTO `tbl_batch` (`batch_id`, `batch_name`, `course_id`, `trainer_id`, `scholarship_type`, `scholarship_type_id`, `start_date`, `end_date`, `status`) VALUES
(2, 'Batch 2026', 1, 1, 'STEP', 3, '2026-01-27', '2026-01-28', 'open'),
(3, 'Batch 2026.1', 3, 2, 'STEP', 3, '2026-01-29', '2026-02-01', 'open');

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

--
-- Dumping data for table `tbl_course`
--

INSERT INTO `tbl_course` (`course_id`, `course_name`, `ctpr_number`, `training_cost`, `description`, `duration`, `status`) VALUES
(1, 'Electrical Installation and Maintenance NC II', 'CTPR-0001-2024', 18000.00, 'Electrical Installation and Maintenance NC II equips learners with skills to install, maintain, and repair electrical wiring and equipment in residential and commercial buildings, following safety standards and the Philippine Electrical Code.', '120 hours', 'active'),
(3, 'Electronic Products Assembly and Servicing (EPAS) NC II', '523526253', 20000.00, 'This qualification covers the knowledge, skills, and attitudes required to assemble, install, service, and repair electronic products and systems such as consumer electronics, audio-video equipment, and related devices. It includes workplace safety, use of tools and test instruments, interpretation of technical diagrams, and compliance with industry standards.', '240 Hours', 'active');

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
(4, 4, 5),
(6, 6, 7);

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
  `status` enum('pending','qualified','unqualified','approved','rejected') DEFAULT 'pending',
  `scholarship_type` varchar(50) DEFAULT NULL,
  `scholarship_type_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_enrollment`
--

INSERT INTO `tbl_enrollment` (`enrollment_id`, `trainee_id`, `offered_id`, `batch_id`, `enrollment_date`, `status`, `scholarship_type`, `scholarship_type_id`) VALUES
(4, 5, 1, 2, '2026-01-27', 'approved', 'STEP', 3),
(6, 7, 2, 3, '2026-01-29', 'approved', 'TWSP', 1);

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

--
-- Dumping data for table `tbl_grades_dtl`
--

INSERT INTO `tbl_grades_dtl` (`grades_dtl_id`, `grades_hdr_id`, `test_id`, `score`, `remarks`) VALUES
(1, 9, 4, 10.00, NULL);

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

--
-- Dumping data for table `tbl_grades_hdr`
--

INSERT INTO `tbl_grades_hdr` (`grades_hdr_id`, `trainee_id`, `course_id`, `total_grade`, `remarks`, `date_recorded`, `pre_test`, `post_test`, `activities`, `quizzes`, `task_sheets`) VALUES
(9, 5, 1, NULL, NULL, '2026-01-28', 0.00, 0.00, 0.00, 0.00, 0.00);

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
  `posting_date` datetime DEFAULT NULL,
  `task_sheet_file` varchar(255) DEFAULT NULL,
  `lesson_file_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_lessons`
--

INSERT INTO `tbl_lessons` (`lesson_id`, `module_id`, `day_number`, `lesson_title`, `lesson_description`, `posting_date`, `task_sheet_file`, `lesson_file_path`) VALUES
(2, 3, NULL, 'LEARNING OUTCOME 1: PLAN AND PREPARE WORK', '', '2026-01-29 18:26:00', 'task_1769617613_598706627_3335430083274662_7994946475721277614_n (1).png', NULL),
(3, 3, NULL, 'LEARNING OUTCOME 2: INSTALL ELECTRICAL PROTECTIVE DEVICES', '', NULL, NULL, NULL),
(4, 3, NULL, 'LEARNING OUTCOME 3: INSTALL LIGHTING FIXTURES AND AUXILIARY', '', NULL, NULL, NULL),
(5, 3, NULL, 'LEARNING OUTCOME 4: NOTIFY COMPLETION OF WORK', '', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_lesson_contents`
--

CREATE TABLE `tbl_lesson_contents` (
  `content_id` int(11) NOT NULL,
  `lesson_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` longtext DEFAULT NULL,
  `display_order` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_lesson_contents`
--

INSERT INTO `tbl_lesson_contents` (`content_id`, `lesson_id`, `title`, `content`, `display_order`) VALUES
(1, 2, 'Information Sheet 2.1-1', '', 0),
(2, 2, 'Information Sheet 2.1-4', '', 0);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_module`
--

CREATE TABLE `tbl_module` (
  `module_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `competency_type` enum('core','basic','common') NOT NULL DEFAULT 'core',
  `module_title` varchar(150) DEFAULT NULL,
  `module_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_module`
--

INSERT INTO `tbl_module` (`module_id`, `course_id`, `competency_type`, `module_title`, `module_description`) VALUES
(3, 1, 'core', 'Installing Electrical Protective Devices for Distribution, Power, Lighting, Auxiliary, Lightning Protection and Grounding Systems', ' Perform roughing-in activities, wiring and cabling works for\nsingle-phase distribution, power, lighting and auxiliary systems');

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
(1, 1, 1, NULL, NULL, 'Day Shift (8:00 AM - 5:00 PM)', 'Main Room'),
(2, 3, 2, NULL, NULL, 'Night Shift (6:00 PM - 10:00 PM)', 'Main Room');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_progress_charts`
--

CREATE TABLE `tbl_progress_charts` (
  `chart_id` int(11) NOT NULL,
  `trainer_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `chart_content` longtext DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_progress_charts`
--

INSERT INTO `tbl_progress_charts` (`chart_id`, `trainer_id`, `title`, `chart_content`, `created_at`, `updated_at`) VALUES
(1, 1, 'Progress Chart 2026', '<meta charset=\"utf-8\"><title>SheetJS Table Export</title><table id=\"progressTable\" class=\"tesda-table\"><tbody><tr style=\"font-weight: bold; background-color: rgb(248, 249, 250); text-align: center;\"><td colspan=\"60\" data-t=\"s\" data-v=\"Hohoo Ville Technical School Inc.\" id=\"progressTable-A1\" contenteditable=\"true\">Hohoo Ville Technical School Inc.</td></tr><tr style=\"font-weight: bold; background-color: rgb(248, 249, 250); text-align: center;\"><td colspan=\"60\" data-t=\"s\" data-v=\"Purok 6A, Poblacion, Lagonglong, Misamis Oriental\" id=\"progressTable-A2\" contenteditable=\"true\">Purok 6A, Poblacion, Lagonglong, Misamis Oriental</td></tr><tr style=\"font-weight: bold; background-color: rgb(248, 249, 250); text-align: center;\"><td colspan=\"60\" data-t=\"s\" data-v=\"PROGRESS CHART\" id=\"progressTable-A3\" contenteditable=\"true\">PROGRESS CHART</td></tr><tr style=\"font-weight: bold; background-color: rgb(248, 249, 250); text-align: center;\"><td colspan=\"60\" data-t=\"s\" data-v=\"ELECTRICAL INSTALLATION AND MAINTENANCE NC II (196 HOURS)\" id=\"progressTable-A4\" contenteditable=\"true\">ELECTRICAL INSTALLATION AND MAINTENANCE NC II (196 HOURS)</td></tr><tr><td id=\"progressTable-A5\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-B5\" contenteditable=\"true\" class=\"progress-mark\"></td><td colspan=\"27\" data-t=\"s\" data-v=\"BASIC COMPETENCIES\" id=\"progressTable-C5\" contenteditable=\"true\">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; BASIC COMPETENCIES</td><td colspan=\"17\" data-t=\"s\" data-v=\"COMMON COMPETENCIES\" id=\"progressTable-AD5\" contenteditable=\"true\">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; COMMON COMPETENCIES</td><td colspan=\"14\" data-t=\"s\" data-v=\"CORE COMPETENCY\" id=\"progressTable-AU5\" contenteditable=\"true\">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;CORE COMPETENCY</td></tr><tr><td id=\"progressTable-A6\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-B6\" contenteditable=\"true\" class=\"progress-mark\"></td><td colspan=\"3\" data-t=\"s\" data-v=\"UC #1 PARTICIPATE IN WORKPLACE COMMUNICATION\" id=\"progressTable-C6\" contenteditable=\"true\">UC #1 PARTICIPATE IN WORKPLACE COMMUNICATION</td><td colspan=\"3\" data-t=\"s\" data-v=\"UC #2 WORK IN TEAM ENVIRONMENT\" id=\"progressTable-F6\" contenteditable=\"true\">UC #2 WORK IN TEAM ENVIRONMENT</td><td colspan=\"3\" data-t=\"s\" data-v=\"UC #3 SOLVE/ADDRESS ROUTINE PROBLEMS\" id=\"progressTable-I6\" contenteditable=\"true\">UC #3 SOLVE/ADDRESS ROUTINE PROBLEMS</td><td colspan=\"3\" data-t=\"s\" data-v=\"UC # 4 DEVELOP CAREER AND LIFE DECISION\" id=\"progressTable-L6\" contenteditable=\"true\">UC # 4 DEVELOP CAREER AND LIFE DECISION</td><td colspan=\"3\" data-t=\"s\" data-v=\"UC # 5 CONTRIBUTE TO WORKPLACE INNOVATION\" id=\"progressTable-O6\" contenteditable=\"true\">UC # 5 CONTRIBUTE TO WORKPLACE INNOVATION</td><td colspan=\"3\" data-t=\"s\" data-v=\"UC #6 PRESENT RELEVANT INFORMATION\" id=\"progressTable-R6\" contenteditable=\"true\">UC #6 PRESENT RELEVANT INFORMATION</td><td colspan=\"3\" data-t=\"s\" data-v=\"UC # 7 PRACTICE OCCUPATIONAL SAFETY AND HEALTH POLICIES AND PROCEDURES\" id=\"progressTable-U6\" contenteditable=\"true\">UC # 7 PRACTICE OCCUPATIONAL SAFETY AND HEALTH POLICIES AND PROCEDURES</td><td colspan=\"3\" data-t=\"s\" data-v=\"UC #8 EXERCISE EFFICIENT AND EFFECTIVE SUSTAINABLE PRACTICES IN THE WORKPLACE\" id=\"progressTable-X6\" contenteditable=\"true\">UC #8 EXERCISE EFFICIENT AND EFFECTIVE SUSTAINABLE PRACTICES IN THE WORKPLACE</td><td colspan=\"3\" data-t=\"s\" data-v=\"UC #9 PRACTICE ENTREPRENEURIAL SKILLS IN THE WORKPLACE\" id=\"progressTable-AA6\" contenteditable=\"true\">UC #9 PRACTICE ENTREPRENEURIAL SKILLS IN THE WORKPLACE</td><td colspan=\"4\" data-t=\"s\" data-v=\"UC #1 USE HAND TOOLS\" id=\"progressTable-AD6\" contenteditable=\"true\">UC #1 USE HAND TOOLS</td><td colspan=\"3\" data-t=\"s\" data-v=\"UC #2 PERFORM MENSURATION AND CALCULATION\" id=\"progressTable-AH6\" contenteditable=\"true\">UC #2 PERFORM MENSURATION AND CALCULATION</td><td colspan=\"4\" data-t=\"s\" data-v=\"UC #3 PREPARE AND INTERPRET TECHNICAL DRAWING\" id=\"progressTable-AK6\" contenteditable=\"true\">UC #3 PREPARE AND INTERPRET TECHNICAL DRAWING</td><td colspan=\"3\" data-t=\"s\" data-v=\"UC #4 APPLY QUALITY STANDARDS\" id=\"progressTable-AO6\" contenteditable=\"true\">UC #4 APPLY QUALITY STANDARDS</td><td colspan=\"3\" data-t=\"s\" data-v=\"UC #5 TERMINATE AND CONNECT ELETRCIAL WIRING AND ELECTRONIC CIRCUITS\" id=\"progressTable-AR6\" contenteditable=\"true\">UC #5 TERMINATE AND CONNECT ELETRCIAL WIRING AND ELECTRONIC CIRCUITS</td><td colspan=\"6\" data-t=\"s\" data-v=\"UC #1 PERFORM ROUGHING IN, WIRING AND CABLING FOR SINGLE PHASE DISTRIBUTION, POWER, LIGHTING AND AUXILIARY SYSTEMS\" id=\"progressTable-AU6\" contenteditable=\"true\">UC #1 PERFORM ROUGHING IN, WIRING AND CABLING FOR SINGLE PHASE DISTRIBUTION, POWER, LIGHTING AND AUXILIARY SYSTEMS</td><td colspan=\"4\" data-t=\"s\" data-v=\"UC # 2 INSTALL ELECTRICAL PROTECTIVE DEVICES FOR DISTRIBUTION, POWER, LIGHTING, AUXILIARY, LIGHTING PROTECTION AND GROUNDING SYSTEMS\" id=\"progressTable-BA6\" contenteditable=\"true\">UC # 2 INSTALL ELECTRICAL PROTECTIVE DEVICES FOR DISTRIBUTION, POWER, LIGHTING, AUXILIARY, LIGHTING PROTECTION AND GROUNDING SYSTEMS</td><td colspan=\"4\" data-t=\"s\" data-v=\"UC #3 INSTALL WIRING DEVICES OF FLOOR AND WALL MOUNTED OUTLETS, LIGHTING FIXTURE/SWITCHES AND AUXILIARY OUTLETS\" id=\"progressTable-BE6\" contenteditable=\"true\">UC #3 INSTALL WIRING DEVICES OF FLOOR AND WALL MOUNTED OUTLETS, LIGHTING FIXTURE/SWITCHES AND AUXILIARY OUTLETS</td></tr><tr><td data-t=\"s\" data-v=\"NO.\" id=\"progressTable-A7\" contenteditable=\"true\" class=\"progress-mark\">NO.</td><td data-t=\"s\" data-v=\"NAME OF THE TRAINEE\" id=\"progressTable-B7\" contenteditable=\"true\">NAME OF THE TRAINEE</td><td data-t=\"s\" data-v=\"LO1 Obtain and convey workplace information\" id=\"progressTable-C7\" contenteditable=\"true\">LO1 Obtain and convey workplace information</td><td data-t=\"s\" data-v=\"LO2 Complete relevant work-related documents\" id=\"progressTable-D7\" contenteditable=\"true\">LO2 Complete relevant work-related documents</td><td data-t=\"s\" data-v=\"LO3 Participate in workplace meeting and discussion\" id=\"progressTable-E7\" contenteditable=\"true\">LO3 Participate in workplace meeting and discussion</td><td data-t=\"s\" data-v=\"LO1 Describe and identify team role and responsibil-ity in a team\" id=\"progressTable-F7\" contenteditable=\"true\">LO1 Describe and identify team role and responsibil-ity in a team</td><td data-t=\"s\" data-v=\"LO2 Describe work as a team member\" id=\"progressTable-G7\" contenteditable=\"true\">LO2 Describe work as a team member</td><td data-t=\"s\" data-v=\"LO3 Work as a team member\" id=\"progressTable-H7\" contenteditable=\"true\">LO3 Work as a team member</td><td data-t=\"s\" data-v=\"LO1 Identify routine problems\" id=\"progressTable-I7\" contenteditable=\"true\">LO1 Identify routine problems</td><td data-t=\"s\" data-v=\"LO2 Look for solutions to routine problems\" id=\"progressTable-J7\" contenteditable=\"true\">LO2 Look for solutions to routine problems</td><td data-t=\"s\" data-v=\"LO3 Recommend solutions to problems\" id=\"progressTable-K7\" contenteditable=\"true\">LO3 Recommend solutions to problems</td><td data-t=\"s\" data-v=\"LO1 Manage one’s emotion\" id=\"progressTable-L7\" contenteditable=\"true\">LO1 Manage one’s emotion</td><td data-t=\"s\" data-v=\"LO2 Look for solutions \nto routine problems\" id=\"progressTable-M7\" contenteditable=\"true\">LO2 Look for solutions <br>to routine problems</td><td data-t=\"s\" data-v=\"LO3 Recommend \nsolutions to problems\" id=\"progressTable-N7\" contenteditable=\"true\">LO3 Recommend <br>solutions to problems</td><td data-t=\"s\" data-v=\"LO1 Identify opportunities to do things better\" id=\"progressTable-O7\" contenteditable=\"true\">LO1 Identify opportunities to do things better</td><td data-t=\"s\" data-v=\"LO2 Discuss and develop ideas with others\" id=\"progressTable-P7\" contenteditable=\"true\">LO2 Discuss and develop ideas with others</td><td data-t=\"s\" data-v=\"LO3 Integrate ideas for change in the workplace\" id=\"progressTable-Q7\" contenteditable=\"true\">LO3 Integrate ideas for change in the workplace</td><td data-t=\"s\" data-v=\"LO1 Gather data/information\" id=\"progressTable-R7\" contenteditable=\"true\">LO1 Gather data/information</td><td data-t=\"s\" data-v=\"LO2 Assess Gathered data/information\" id=\"progressTable-S7\" contenteditable=\"true\">LO2 Assess Gathered data/information</td><td data-t=\"s\" data-v=\"LO3 Record and present information\" id=\"progressTable-T7\" contenteditable=\"true\">LO3 Record and present information</td><td data-t=\"s\" data-v=\"LO1 Identify OSH compliance requirements\" id=\"progressTable-U7\" contenteditable=\"true\">LO1 Identify OSH compliance requirements</td><td data-t=\"s\" data-v=\"LO2 Prepare OSH requirements for compliance\" id=\"progressTable-V7\" contenteditable=\"true\">LO2 Prepare OSH requirements for compliance</td><td data-t=\"s\" data-v=\"LO3 Perform tasks in accordance with relevant OSH policies and procedures\" id=\"progressTable-W7\" contenteditable=\"true\">LO3 Perform tasks in accordance with relevant OSH policies and procedures</td><td data-t=\"s\" data-v=\"LO1 Identify the efficiency and effectiveness of resource utilization\" id=\"progressTable-X7\" contenteditable=\"true\">LO1 Identify the efficiency and effectiveness of resource utilization</td><td data-t=\"s\" data-v=\"LO2 Determine causes of inefficiency and/or ineffectiveness of resource utilization\" id=\"progressTable-Y7\" contenteditable=\"true\">LO2 Determine causes of inefficiency and/or ineffectiveness of resource utilization</td><td data-t=\"s\" data-v=\"LO3 Convey inefficient and ineffective environmental practices\" id=\"progressTable-Z7\" contenteditable=\"true\">LO3 Convey inefficient and ineffective environmental practices</td><td data-t=\"s\" data-v=\"LO1 Apply entrepreneurial workplace best practices\" id=\"progressTable-AA7\" contenteditable=\"true\">LO1 Apply entrepreneurial workplace best practices</td><td data-t=\"s\" data-v=\"LO 2 Communicate entrepre-neurial workplace best practices\" id=\"progressTable-AB7\" contenteditable=\"true\">LO 2 Communicate entrepre-neurial workplace best practices</td><td data-t=\"s\" data-v=\"LO3 Implement cost effective operation\" id=\"progressTable-AC7\" contenteditable=\"true\">LO3 Implement cost effective operation</td><td data-t=\"s\" data-v=\"LO 1 Plan and prepare for \ntasks to be undertak-en\" id=\"progressTable-AD7\" contenteditable=\"true\">LO 1 Plan and prepare for <br>tasks to be undertak-en</td><td data-t=\"s\" data-v=\"LO 2 Prepare hand Tools\" id=\"progressTable-AE7\" contenteditable=\"true\">LO 2 Prepare hand Tools</td><td data-t=\"s\" data-v=\"LO 3 Use appropriate hand tools and test equip-ment\" id=\"progressTable-AF7\" contenteditable=\"true\">LO 3 Use appropriate hand tools and test equip-ment</td><td data-t=\"s\" data-v=\"LO 4 Maintain hand tools\" id=\"progressTable-AG7\" contenteditable=\"true\">LO 4 Maintain hand tools</td><td data-t=\"s\" data-v=\"LO 1 Select measuring in-struments\" id=\"progressTable-AH7\" contenteditable=\"true\">LO 1 Select measuring in-struments</td><td data-t=\"s\" data-v=\"LO 2 Carry-out measure-ments and calcula-tions\" id=\"progressTable-AI7\" contenteditable=\"true\">LO 2 Carry-out measure-ments and calcula-tions</td><td data-t=\"s\" data-v=\"LO 3 Maintain measuring instruments\" id=\"progressTable-AJ7\" contenteditable=\"true\">LO 3 Maintain measuring instruments</td><td data-t=\"s\" data-v=\"LO 1 Identify different kinds of technical drawings\" id=\"progressTable-AK7\" contenteditable=\"true\">LO 1 Identify different kinds of technical drawings</td><td data-t=\"s\" data-v=\"LO 2  Interpret technical drawing\" id=\"progressTable-AL7\" contenteditable=\"true\">LO 2  Interpret technical drawing</td><td data-t=\"s\" data-v=\"LO 3 Prepare/ make changes to electrical/ electronic schematics and draw-ings\" id=\"progressTable-AM7\" contenteditable=\"true\">LO 3 Prepare/ make changes to electrical/ electronic schematics and draw-ings</td><td data-t=\"s\" data-v=\"LO 4 Store technical drawings and equipment/ in-struments\" id=\"progressTable-AN7\" contenteditable=\"true\">LO 4 Store technical drawings and equipment/ in-struments</td><td data-t=\"s\" data-v=\"LO 1 Assess quality of re-ceived materials\" id=\"progressTable-AO7\" contenteditable=\"true\">LO 1 Assess quality of re-ceived materials</td><td data-t=\"s\" data-v=\"LO 2 Assess own work\" id=\"progressTable-AP7\" contenteditable=\"true\">LO 2 Assess own work</td><td data-t=\"s\" data-v=\"LO 3 Engage in quality im-provement\" id=\"progressTable-AQ7\" contenteditable=\"true\">LO 3 Engage in quality im-provement</td><td data-t=\"s\" data-v=\"LO 1  Plan and prepare for termination/ connec-tion of electrical wir-ing/ electronics cir-cuits\" id=\"progressTable-AR7\" contenteditable=\"true\">LO 1  Plan and prepare for termination/ connec-tion of electrical wir-ing/ electronics cir-cuits</td><td data-t=\"s\" data-v=\"LO 2 Terminate/ connect electrical wirings/ electronic circuits\" id=\"progressTable-AS7\" contenteditable=\"true\">LO 2 Terminate/ connect electrical wirings/ electronic circuits</td><td data-t=\"s\" data-v=\"LO 3 Test termination/ connections of elec-trical wiring/ elec-tronics circuits\" id=\"progressTable-AT7\" contenteditable=\"true\">LO 3 Test termination/ connections of elec-trical wiring/ elec-tronics circuits</td><td data-t=\"s\" data-v=\"LO 1 Install electrical metal-lic /non- metallic (PVC conduit)\" id=\"progressTable-AU7\" contenteditable=\"true\">LO 1 Install electrical metal-lic /non- metallic (PVC conduit)</td><td data-t=\"s\" data-v=\"LO 2 Install wire ways and cable tray\" id=\"progressTable-AV7\" contenteditable=\"true\">LO 2 Install wire ways and cable tray</td><td data-t=\"s\" data-v=\"LO 3 Install auxiliary termi-nal cabinet and distri-bution panel\" id=\"progressTable-AW7\" contenteditable=\"true\">LO 3 Install auxiliary termi-nal cabinet and distri-bution panel</td><td data-t=\"s\" data-v=\"LO 4 Prepare for cable pull-ing and installation\" id=\"progressTable-AX7\" contenteditable=\"true\">LO 4 Prepare for cable pull-ing and installation</td><td data-t=\"s\" data-v=\"LO 5 Perform wiring and ca-bling lay out\" id=\"progressTable-AY7\" contenteditable=\"true\">LO 5 Perform wiring and ca-bling lay out</td><td data-t=\"s\" data-v=\"LO 6 Notify completion of work\" id=\"progressTable-AZ7\" contenteditable=\"true\">LO 6 Notify completion of work</td><td data-t=\"s\" data-v=\"LO 1 Plan and prepare work\" id=\"progressTable-BA7\" contenteditable=\"true\">LO 1 Plan and prepare work</td><td data-t=\"s\" data-v=\"LO 2 Install electrical protec-tive devices\" id=\"progressTable-BB7\" contenteditable=\"true\">LO 2 Install electrical protec-tive devices</td><td data-t=\"s\" data-v=\"LO 3 Install lighting fixture and auxiliary outlet\" id=\"progressTable-BC7\" contenteditable=\"true\">LO 3 Install lighting fixture and auxiliary outlet</td><td data-t=\"s\" data-v=\"LO 4 Notify completion of work\" id=\"progressTable-BD7\" contenteditable=\"true\">LO 4 Notify completion of work</td><td data-t=\"s\" data-v=\"LO 1 Select wiring devices\" id=\"progressTable-BE7\" contenteditable=\"true\">LO 1 Select wiring devices</td><td data-t=\"s\" data-v=\"LO 2 Install wiring devices\" id=\"progressTable-BF7\" contenteditable=\"true\">LO 2 Install wiring devices</td><td data-t=\"s\" data-v=\"LO 3 Install lighting fix-tures/switches\" id=\"progressTable-BG7\" contenteditable=\"true\">LO 3 Install lighting fix-tures/switches</td><td data-t=\"s\" data-v=\"LO 4 Notify completion of work\" id=\"progressTable-BH7\" contenteditable=\"true\">LO 4 Notify completion of work</td></tr><tr><td data-t=\"n\" data-v=\"1\" id=\"progressTable-A8\" contenteditable=\"true\" class=\"progress-mark\">1</td><td id=\"progressTable-B8\" contenteditable=\"true\" class=\"progress-mark\">Christian Dave Boncales</td><td id=\"progressTable-C8\" contenteditable=\"true\" class=\"progress-mark\" style=\"color: green;\">✓</td><td id=\"progressTable-D8\" contenteditable=\"true\" class=\"progress-mark\" style=\"color: green;\">✓</td><td id=\"progressTable-E8\" contenteditable=\"true\" class=\"progress-mark\" style=\"color: green;\">✓</td><td id=\"progressTable-F8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH8\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"2\" id=\"progressTable-A9\" contenteditable=\"true\" class=\"progress-mark\">2</td><td id=\"progressTable-B9\" contenteditable=\"true\" class=\"progress-mark\">James Gabriel Go</td><td id=\"progressTable-C9\" contenteditable=\"true\" class=\"progress-mark\" style=\"color: green;\">✓</td><td id=\"progressTable-D9\" contenteditable=\"true\" class=\"progress-mark\" style=\"color: green;\">✓</td><td id=\"progressTable-E9\" contenteditable=\"true\" class=\"progress-mark\" style=\"color: orange;\">IP</td><td id=\"progressTable-F9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH9\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"3\" id=\"progressTable-A10\" contenteditable=\"true\" class=\"progress-mark\">3</td><td id=\"progressTable-B10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH10\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"4\" id=\"progressTable-A11\" contenteditable=\"true\" class=\"progress-mark\">4</td><td id=\"progressTable-B11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH11\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"5\" id=\"progressTable-A12\" contenteditable=\"true\" class=\"progress-mark\">5</td><td id=\"progressTable-B12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH12\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"6\" id=\"progressTable-A13\" contenteditable=\"true\" class=\"progress-mark\">6</td><td id=\"progressTable-B13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH13\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"7\" id=\"progressTable-A14\" contenteditable=\"true\" class=\"progress-mark\">7</td><td id=\"progressTable-B14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH14\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"8\" id=\"progressTable-A15\" contenteditable=\"true\" class=\"progress-mark\">8</td><td id=\"progressTable-B15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH15\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"9\" id=\"progressTable-A16\" contenteditable=\"true\" class=\"progress-mark\">9</td><td id=\"progressTable-B16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH16\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"10\" id=\"progressTable-A17\" contenteditable=\"true\" class=\"progress-mark\">10</td><td id=\"progressTable-B17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH17\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"11\" id=\"progressTable-A18\" contenteditable=\"true\" class=\"progress-mark\">11</td><td id=\"progressTable-B18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH18\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"12\" id=\"progressTable-A19\" contenteditable=\"true\" class=\"progress-mark\">12</td><td id=\"progressTable-B19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH19\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"13\" id=\"progressTable-A20\" contenteditable=\"true\" class=\"progress-mark\">13</td><td id=\"progressTable-B20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH20\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"14\" id=\"progressTable-A21\" contenteditable=\"true\" class=\"progress-mark\">14</td><td id=\"progressTable-B21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH21\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"15\" id=\"progressTable-A22\" contenteditable=\"true\" class=\"progress-mark\">15</td><td id=\"progressTable-B22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH22\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"16\" id=\"progressTable-A23\" contenteditable=\"true\" class=\"progress-mark\">16</td><td id=\"progressTable-B23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH23\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"17\" id=\"progressTable-A24\" contenteditable=\"true\" class=\"progress-mark\">17</td><td id=\"progressTable-B24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH24\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"18\" id=\"progressTable-A25\" contenteditable=\"true\" class=\"progress-mark\">18</td><td id=\"progressTable-B25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH25\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"19\" id=\"progressTable-A26\" contenteditable=\"true\" class=\"progress-mark\">19</td><td id=\"progressTable-B26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH26\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"20\" id=\"progressTable-A27\" contenteditable=\"true\" class=\"progress-mark\">20</td><td id=\"progressTable-B27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH27\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"21\" id=\"progressTable-A28\" contenteditable=\"true\" class=\"progress-mark\">21</td><td id=\"progressTable-B28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH28\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"22\" id=\"progressTable-A29\" contenteditable=\"true\" class=\"progress-mark\">22</td><td id=\"progressTable-B29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH29\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"23\" id=\"progressTable-A30\" contenteditable=\"true\" class=\"progress-mark\">23</td><td id=\"progressTable-B30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH30\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"24\" id=\"progressTable-A31\" contenteditable=\"true\" class=\"progress-mark\">24</td><td id=\"progressTable-B31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH31\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"25\" id=\"progressTable-A32\" contenteditable=\"true\" class=\"progress-mark\">25</td><td id=\"progressTable-B32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Q32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-R32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-S32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-T32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-U32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-V32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-W32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-X32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Y32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-Z32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AA32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AB32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AC32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AD32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AE32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AF32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AG32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AH32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AI32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AJ32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AK32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AL32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AM32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AN32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AO32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AP32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AQ32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AR32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AS32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AT32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AU32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AV32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AW32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AX32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AY32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-AZ32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BA32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BB32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BC32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BD32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BE32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BF32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BG32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-BH32\" contenteditable=\"true\" class=\"progress-mark\"></td></tr></tbody></table>', '2026-01-29 20:19:45', '2026-02-02 08:09:25');
INSERT INTO `tbl_progress_charts` (`chart_id`, `trainer_id`, `title`, `chart_content`, `created_at`, `updated_at`) VALUES
(2, 1, 'ACHIEVEMENT CHART', '<meta charset=\"utf-8\"><title>SheetJS Table Export</title><table id=\"progressTable\" class=\"tesda-table\"><tbody><tr style=\"font-weight: bold; background-color: rgb(248, 249, 250); text-align: center;\"><td colspan=\"16\" data-t=\"s\" data-v=\"Hohoo Ville Technical School Inc.\" id=\"progressTable-A1\" contenteditable=\"true\">Hohoo Ville Technical School Inc.</td></tr><tr style=\"font-weight: bold; background-color: rgb(248, 249, 250); text-align: center;\"><td colspan=\"16\" data-t=\"s\" data-v=\"Purok 6A, Poblacion, Lagonglong, Misamis Oriental\" id=\"progressTable-A2\" contenteditable=\"true\">Purok 6A, Poblacion, Lagonglong, Misamis Oriental</td></tr><tr style=\"font-weight: bold; background-color: rgb(248, 249, 250); text-align: center;\"><td colspan=\"16\" data-t=\"s\" data-v=\"ACHIEVEMENT CHART\" id=\"progressTable-A3\" contenteditable=\"true\">ACHIEVEMENT CHART</td></tr><tr style=\"font-weight: bold; background-color: rgb(248, 249, 250); text-align: center;\"><td colspan=\"16\" data-t=\"s\" data-v=\"ELECTRICAL INSTALLATION AND MAINTENANCE NC II (196 HOURS)\" id=\"progressTable-A4\" contenteditable=\"true\">ELECTRICAL INSTALLATION AND MAINTENANCE NC II (196 HOURS)</td></tr><tr><td id=\"progressTable-A5\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-B5\" contenteditable=\"true\" class=\"progress-mark\"></td><td colspan=\"6\" data-t=\"s\" data-v=\"Perform roughing-in activities,wiring and cabling for single phase distribution,power,lighting and auxiliary system\" id=\"progressTable-C5\" contenteditable=\"true\">Perform roughing-in activities,wiring and cabling for single phase distribution,power,lighting and auxiliary system</td><td colspan=\"4\" data-t=\"s\" data-v=\"Install electrical protective devices for distribution,power,lighting,auxiliary protection and grounding system\" id=\"progressTable-I5\" contenteditable=\"true\">Install electrical protective devices for distribution,power,lighting,auxiliary protection and grounding system</td><td colspan=\"4\" data-t=\"s\" data-v=\"Install wiring devices of floor and wall mounted outlets,lighting fixture/switches,and auxiliary outlet\" id=\"progressTable-M5\" contenteditable=\"true\">Install wiring devices of floor and wall mounted outlets,lighting fixture/switches,and auxiliary outlet</td></tr><tr><td data-t=\"s\" data-v=\"NO\" id=\"progressTable-A6\" contenteditable=\"true\" class=\"progress-mark\">NO</td><td data-t=\"s\" data-v=\"NAME OF TRAINEE\" id=\"progressTable-B6\" contenteditable=\"true\">NAME OF TRAINEE</td><td data-t=\"s\" data-v=\"1. Install electrical metallic /nonmetallic (PVC conduit)\" id=\"progressTable-C6\" contenteditable=\"true\">1. Install electrical metallic /nonmetallic (PVC conduit)</td><td data-t=\"s\" data-v=\"2. Install wire ways and cable tray\" id=\"progressTable-D6\" contenteditable=\"true\">2. Install wire ways and cable tray</td><td data-t=\"s\" data-v=\"3. Install auxiliary terminal cabinet and distribution panel\" id=\"progressTable-E6\" contenteditable=\"true\">3. Install auxiliary terminal cabinet and distribution panel</td><td data-t=\"s\" data-v=\"4. Prepare for cable pulling and installation\" id=\"progressTable-F6\" contenteditable=\"true\">4. Prepare for cable pulling and installation</td><td data-t=\"s\" data-v=\"5. Perform wiring and cabling lay out\" id=\"progressTable-G6\" contenteditable=\"true\">5. Perform wiring and cabling lay out</td><td data-t=\"s\" data-v=\"6. Notify completion of work\" id=\"progressTable-H6\" contenteditable=\"true\">6. Notify completion of work</td><td data-t=\"s\" data-v=\"1. Plan and prepare work\" id=\"progressTable-I6\" contenteditable=\"true\">1. Plan and prepare work</td><td data-t=\"s\" data-v=\"2. Install electrical protective devices\" id=\"progressTable-J6\" contenteditable=\"true\">2. Install electrical protective devices</td><td data-t=\"s\" data-v=\"3. Install lighting fixture and auxiliary outlet.\" id=\"progressTable-K6\" contenteditable=\"true\">3. Install lighting fixture and auxiliary outlet.</td><td data-t=\"s\" data-v=\"4. Notify completion of work.\" id=\"progressTable-L6\" contenteditable=\"true\">4. Notify completion of work.</td><td data-t=\"s\" data-v=\"1. Select wiring devices\" id=\"progressTable-M6\" contenteditable=\"true\">1. Select wiring devices</td><td data-t=\"s\" data-v=\"2. Install wiring devices\" id=\"progressTable-N6\" contenteditable=\"true\">2. Install wiring devices</td><td data-t=\"s\" data-v=\"3. Install lighting fixture/ switches\" id=\"progressTable-O6\" contenteditable=\"true\">3. Install lighting fixture/ switches</td><td data-t=\"s\" data-v=\"4. Notify completion of work\" id=\"progressTable-P6\" contenteditable=\"true\">4. Notify completion of work</td></tr><tr><td data-t=\"n\" data-v=\"1\" id=\"progressTable-A7\" contenteditable=\"true\" class=\"progress-mark\">1</td><td id=\"progressTable-B7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O7\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P7\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"2\" id=\"progressTable-A8\" contenteditable=\"true\" class=\"progress-mark\">2</td><td id=\"progressTable-B8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O8\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P8\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"3\" id=\"progressTable-A9\" contenteditable=\"true\" class=\"progress-mark\">3</td><td id=\"progressTable-B9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O9\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P9\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"4\" id=\"progressTable-A10\" contenteditable=\"true\" class=\"progress-mark\">4</td><td id=\"progressTable-B10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O10\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P10\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"5\" id=\"progressTable-A11\" contenteditable=\"true\" class=\"progress-mark\">5</td><td id=\"progressTable-B11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O11\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P11\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"6\" id=\"progressTable-A12\" contenteditable=\"true\" class=\"progress-mark\">6</td><td id=\"progressTable-B12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O12\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P12\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"7\" id=\"progressTable-A13\" contenteditable=\"true\" class=\"progress-mark\">7</td><td id=\"progressTable-B13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O13\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P13\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"8\" id=\"progressTable-A14\" contenteditable=\"true\" class=\"progress-mark\">8</td><td id=\"progressTable-B14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O14\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P14\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"9\" id=\"progressTable-A15\" contenteditable=\"true\" class=\"progress-mark\">9</td><td id=\"progressTable-B15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O15\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P15\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"10\" id=\"progressTable-A16\" contenteditable=\"true\" class=\"progress-mark\">10</td><td id=\"progressTable-B16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O16\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P16\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"11\" id=\"progressTable-A17\" contenteditable=\"true\" class=\"progress-mark\">11</td><td id=\"progressTable-B17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O17\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P17\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"12\" id=\"progressTable-A18\" contenteditable=\"true\" class=\"progress-mark\">12</td><td id=\"progressTable-B18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O18\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P18\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"13\" id=\"progressTable-A19\" contenteditable=\"true\" class=\"progress-mark\">13</td><td id=\"progressTable-B19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O19\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P19\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"14\" id=\"progressTable-A20\" contenteditable=\"true\" class=\"progress-mark\">14</td><td id=\"progressTable-B20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O20\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P20\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"15\" id=\"progressTable-A21\" contenteditable=\"true\" class=\"progress-mark\">15</td><td id=\"progressTable-B21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O21\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P21\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"16\" id=\"progressTable-A22\" contenteditable=\"true\" class=\"progress-mark\">16</td><td id=\"progressTable-B22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O22\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P22\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"17\" id=\"progressTable-A23\" contenteditable=\"true\" class=\"progress-mark\">17</td><td id=\"progressTable-B23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O23\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P23\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"18\" id=\"progressTable-A24\" contenteditable=\"true\" class=\"progress-mark\">18</td><td id=\"progressTable-B24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O24\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P24\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"19\" id=\"progressTable-A25\" contenteditable=\"true\" class=\"progress-mark\">19</td><td id=\"progressTable-B25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O25\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P25\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"20\" id=\"progressTable-A26\" contenteditable=\"true\" class=\"progress-mark\">20</td><td id=\"progressTable-B26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O26\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P26\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"21\" id=\"progressTable-A27\" contenteditable=\"true\" class=\"progress-mark\">21</td><td id=\"progressTable-B27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O27\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P27\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"22\" id=\"progressTable-A28\" contenteditable=\"true\" class=\"progress-mark\">22</td><td id=\"progressTable-B28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O28\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P28\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"23\" id=\"progressTable-A29\" contenteditable=\"true\" class=\"progress-mark\">23</td><td id=\"progressTable-B29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O29\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P29\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"24\" id=\"progressTable-A30\" contenteditable=\"true\" class=\"progress-mark\">24</td><td id=\"progressTable-B30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O30\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P30\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td data-t=\"n\" data-v=\"25\" id=\"progressTable-A31\" contenteditable=\"true\" class=\"progress-mark\">25</td><td id=\"progressTable-B31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O31\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P31\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td id=\"progressTable-A32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-B32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O32\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P32\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td id=\"progressTable-A33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-B33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L33\" contenteditable=\"true\" class=\"progress-mark\"></td><td data-t=\"s\" data-v=\"LEGENDS:\" id=\"progressTable-M33\" contenteditable=\"true\">LEGENDS:</td><td id=\"progressTable-N33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O33\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P33\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td id=\"progressTable-A34\" contenteditable=\"true\" class=\"progress-mark\"></td><td data-t=\"s\" data-v=\"Training Duration: 196 hours\" id=\"progressTable-B34\" contenteditable=\"true\">Training Duration: 196 hours</td><td id=\"progressTable-C34\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D34\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E34\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F34\" contenteditable=\"true\" class=\"progress-mark\"></td><td data-t=\"s\" data-v=\"Date Started: September 23, 2024\" id=\"progressTable-G34\" contenteditable=\"true\">Date Started: September 23, 2024</td><td id=\"progressTable-H34\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I34\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J34\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K34\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L34\" contenteditable=\"true\" class=\"progress-mark\"></td><td data-t=\"s\" data-v=\"C - COMPETENT\" id=\"progressTable-M34\" contenteditable=\"true\">C - COMPETENT</td><td id=\"progressTable-N34\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O34\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P34\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td id=\"progressTable-A35\" contenteditable=\"true\" class=\"progress-mark\"></td><td data-t=\"s\" data-v=\"Trainer: IVY MAE O. BAGONGON\" id=\"progressTable-B35\" contenteditable=\"true\">Trainer: IVY MAE O. BAGONGON</td><td id=\"progressTable-C35\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D35\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E35\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F35\" contenteditable=\"true\" class=\"progress-mark\"></td><td data-t=\"s\" data-v=\"Date Finished: October 25, 2024\" id=\"progressTable-G35\" contenteditable=\"true\">Date Finished: October 25, 2024</td><td id=\"progressTable-H35\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I35\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J35\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K35\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L35\" contenteditable=\"true\" class=\"progress-mark\"></td><td data-t=\"s\" data-v=\"NYC - NOT YET COMPETENT\" id=\"progressTable-M35\" contenteditable=\"true\">NYC - NOT YET COMPETENT</td><td id=\"progressTable-N35\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O35\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P35\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td id=\"progressTable-A36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-B36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O36\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P36\" contenteditable=\"true\" class=\"progress-mark\"></td></tr><tr><td id=\"progressTable-A37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-B37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-C37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-D37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-E37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-F37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-G37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-H37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-I37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-J37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-K37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-L37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-M37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-N37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-O37\" contenteditable=\"true\" class=\"progress-mark\"></td><td id=\"progressTable-P37\" contenteditable=\"true\" class=\"progress-mark\"></td></tr></tbody></table>', '2026-01-29 20:37:55', '2026-01-29 20:37:55');

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
(1, 'admin'),
(2, 'trainer'),
(3, 'trainee'),
(4, 'registrar');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_schedule`
--

CREATE TABLE `tbl_schedule` (
  `schedule_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `schedule` varchar(255) DEFAULT NULL,
  `room` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_schedule`
--

INSERT INTO `tbl_schedule` (`schedule_id`, `batch_id`, `schedule`, `room`, `created_at`, `updated_at`) VALUES
(1, 3, 'Night Shift (6:00 PM - 10:00 PM)', 'Main Room', '2026-01-29 07:01:23', '2026-01-29 07:01:49'),
(2, 2, 'Day Shift (8:00 AM - 5:00 PM)', 'Main Room', '2026-01-29 07:01:40', '2026-01-29 07:01:40');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_scholarship`
--

CREATE TABLE `tbl_scholarship` (
  `scholarship_id` int(11) NOT NULL,
  `trainee_id` int(11) DEFAULT NULL,
  `scholarship_name` varchar(150) DEFAULT NULL,
  `scholarship_type_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `sponsor` varchar(150) DEFAULT NULL,
  `date_granted` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_scholarship`
--

INSERT INTO `tbl_scholarship` (`scholarship_id`, `trainee_id`, `scholarship_name`, `scholarship_type_id`, `amount`, `sponsor`, `date_granted`) VALUES
(6, 5, 'STEP', 3, NULL, NULL, '2026-01-27'),
(8, 7, 'TWSP', 1, NULL, NULL, '2026-01-29');

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
-- Table structure for table `tbl_system_settings`
--

CREATE TABLE `tbl_system_settings` (
  `setting_id` int(11) NOT NULL,
  `setting_key` varchar(50) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_system_settings`
--

INSERT INTO `tbl_system_settings` (`setting_id`, `setting_key`, `setting_value`, `updated_at`) VALUES
(1, 'default_batch_size', '20', '2026-02-04 22:11:46'),
(2, 'session_timeout', '60', '2026-02-04 22:11:46'),
(3, 'email_notifications', '1', '2026-02-04 22:11:46');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_task_sheets`
--

CREATE TABLE `tbl_task_sheets` (
  `task_sheet_id` int(11) NOT NULL,
  `lesson_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` longtext DEFAULT NULL,
  `display_order` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_task_sheets`
--

INSERT INTO `tbl_task_sheets` (`task_sheet_id`, `lesson_id`, `title`, `content`, `display_order`) VALUES
(3, 2, 'Task Sheet 2.1-2', '', 0),
(4, 2, 'Task Sheet 2.1-3', '', 0);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_task_sheet_submissions`
--

CREATE TABLE `tbl_task_sheet_submissions` (
  `submission_id` int(11) NOT NULL,
  `lesson_id` int(11) NOT NULL,
  `trainee_id` int(11) NOT NULL,
  `submitted_content` longtext DEFAULT NULL,
  `submission_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `grade` decimal(5,2) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `graded_by` int(11) DEFAULT NULL,
  `grade_date` timestamp NULL DEFAULT NULL,
  `status` enum('submitted','recorded') NOT NULL DEFAULT 'submitted'
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
  `max_score` decimal(10,2) DEFAULT NULL,
  `deadline` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_test`
--

INSERT INTO `tbl_test` (`test_id`, `lesson_id`, `activity_type_id`, `score_type_id`, `max_score`, `deadline`) VALUES
(4, 2, 1, NULL, 100.00, '2026-01-30 00:18:00');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_trainee_dtl`
--

CREATE TABLE `tbl_trainee_dtl` (
  `trainee_dtl_id` int(11) NOT NULL,
  `trainee_id` int(11) NOT NULL,
  `civil_status` varchar(50) DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `age` int(3) DEFAULT NULL,
  `birthplace_city` varchar(100) DEFAULT NULL,
  `birthplace_province` varchar(100) DEFAULT NULL,
  `birthplace_region` varchar(100) DEFAULT NULL,
  `nationality` varchar(50) DEFAULT 'Filipino',
  `house_no_street` varchar(255) DEFAULT NULL,
  `barangay` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `city_municipality` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `region` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_trainee_dtl`
--

INSERT INTO `tbl_trainee_dtl` (`trainee_dtl_id`, `trainee_id`, `civil_status`, `birthdate`, `age`, `birthplace_city`, `birthplace_province`, `birthplace_region`, `nationality`, `house_no_street`, `barangay`, `district`, `city_municipality`, `province`, `region`) VALUES
(1, 5, 'Single', '2004-12-20', 21, 'Cagayan De Oro City', 'Missamis Oriental', NULL, 'Filipino', 'Zone 6', 'Baikingon', NULL, 'Cagayan De Oro City', 'Misamis Oriental', '10'),
(3, 7, 'Single', '2005-01-10', 21, 'Cagayan De Oro City', 'Missamis Oriental', '10', 'Filipino', 'Biasong-Tinib', 'Macasandig', '2nd District', 'Cagayan De Oro City', 'Misamis Oriental', '10');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_trainee_ftr`
--

CREATE TABLE `tbl_trainee_ftr` (
  `trainee_ftr_id` int(11) NOT NULL,
  `trainee_id` int(11) NOT NULL,
  `educational_attainment` varchar(100) DEFAULT NULL,
  `employment_status` varchar(50) DEFAULT NULL,
  `employment_type` varchar(50) DEFAULT NULL,
  `learner_classification` text DEFAULT NULL,
  `is_pwd` tinyint(1) DEFAULT 0,
  `disability_type` varchar(100) DEFAULT NULL,
  `disability_cause` varchar(100) DEFAULT NULL,
  `privacy_consent` tinyint(1) DEFAULT 0,
  `digital_signature` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_trainee_ftr`
--

INSERT INTO `tbl_trainee_ftr` (`trainee_ftr_id`, `trainee_id`, `educational_attainment`, `employment_status`, `employment_type`, `learner_classification`, `is_pwd`, `disability_type`, `disability_cause`, `privacy_consent`, `digital_signature`) VALUES
(1, 5, 'Senior High (K-12)', 'Unemployed', NULL, 'Student', 0, '', '', 1, 'Christian Dave Boncales'),
(3, 7, 'Senior High (K-12)', 'Unemployed', NULL, 'Student', 0, '', '', 1, 'Lore Lindell Tamayo');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_trainee_hdr`
--

CREATE TABLE `tbl_trainee_hdr` (
  `trainee_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `extension_name` varchar(10) DEFAULT NULL,
  `sex` enum('Male','Female') DEFAULT NULL,
  `birth_certificate_no` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `facebook_account` varchar(150) DEFAULT NULL,
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
-- Dumping data for table `tbl_trainee_hdr`
--

INSERT INTO `tbl_trainee_hdr` (`trainee_id`, `user_id`, `first_name`, `middle_name`, `last_name`, `extension_name`, `sex`, `birth_certificate_no`, `email`, `facebook_account`, `phone_number`, `address`, `ctpr_no`, `nominal_duration`, `status`, `valid_id_file`, `birth_cert_file`, `photo_file`) VALUES
(5, 12, 'Christian Dave', 'Balamad', 'Boncales', 'N/A', 'Male', NULL, 'christiandaveboncales@gmail.com', 'Christian Dave Boncales', '09678715483', 'Zone 6, Baikingon, Cagayan De Oro City, Misamis Oriental', NULL, NULL, 'active', 'valid_id_1769496636_Untitled design (1).png', 'birth_1769496636_228a2415-a38e-4f27-b762-37d2ae1aec3a.png', 'photo_1769496636_64563a22-b1b4-487a-b7a0-9627907c3c5e.png'),
(7, 15, 'Lore Lindell', 'Becoy', 'Tamayo ', '', 'Male', NULL, 'vincelerky45@gmail.com', 'Lore Tamayo', '09627641720', 'Biasong-Tinib, Macasandig, Cagayan De Oro City, Misamis Oriental', NULL, NULL, 'active', 'valid_id_1769670785_dawdaw-attack.png', 'birth_1769670785_dead0c4a-6e19-4006-96fd-0ff604520395.jfif', 'photo_1769670785_download.jfif');

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
(1, 10, 'Juan', 'Dela cruz', 'juan@gmail.com', '09123456789', 'Electrical Installation and Maintenance NC II', 'Zone 3 balani', 'NTTC-2023-045678', 'nttc_1768116930_Screenshot (2).png', 'tm_1768116930_Screenshot (5).png', 'NC II', 'nc_1768116930_Screenshot (6).png', 'exp_1768116930_Screenshot (5).png', 'active'),
(2, 14, 'Vincent', 'Micabalo', 'vins@gmail.com', '09424819849', 'Electronic Products Assembly and Servicing (EPAS) NC II', 'Zone 5 calaanan Cebu', '81289', '1769666441_dawdaw-attack.png', NULL, NULL, NULL, NULL, 'active');

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
(1, 1, 'admin', '$2y$10$Vsq9xQNQ.nmTxYIPKE3jauARXhMCyaPUMBBEdU6dXDHhJv4.iUxIG', 'christiandaveboncales@gmail.com', 'active', '2025-12-22 11:20:13'),
(10, 2, 'Juan', '$2y$10$pVNvO.T.Ealmtuc6buthQO8/Vy1IRUKqKcpNXwWkgTYus4EM3Obuu', 'juan@gmail.com', 'active', '2026-01-11 19:21:40'),
(12, 3, 'christian', '$2y$10$wOZkw1UgPw7CU01o3bhXveyEEsKOTQCk0goZ1264X.jXb2FXLV6Ue', 'christianboncales09@gmail.com', 'active', '2026-01-27 23:41:57'),
(13, 4, 'John', '$2y$10$tPBRgYwLmD7yw5NPGEkHx.cCGF0kAGui0oO9gSaWQqnDTzf1a9TEy', 'gargamishss@gmail.com', 'active', '2026-01-27 23:50:16'),
(14, 2, 'vince', '$2y$10$TBxHNXPJ2a1o4CMCmSgW9eROBNX5CD6unMX3gYZuiG5DIiSZDi5em', 'vins@gmail.com', 'active', '2026-01-29 15:04:42'),
(15, 3, 'lore', '$2y$10$u24K498elTzakgLBb9ofJumOM29BmyTSknBxH7KZLZekcihdZGyuW', 'vincelerky45@gmail.com', 'active', '2026-01-29 15:15:10');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_activities_type`
--
ALTER TABLE `tbl_activities_type`
  ADD PRIMARY KEY (`activity_type_id`);

--
-- Indexes for table `tbl_activity_logs`
--
ALTER TABLE `tbl_activity_logs`
  ADD PRIMARY KEY (`activity_log_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_action` (`action`);

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
  ADD PRIMARY KEY (`batch_id`),
  ADD KEY `fk_batch_trainer` (`trainer_id`),
  ADD KEY `fk_batch_scholarship` (`scholarship_type_id`);

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
  ADD KEY `batch_id` (`batch_id`),
  ADD KEY `fk_enrollment_scholarship` (`scholarship_type_id`);

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
-- Indexes for table `tbl_lesson_contents`
--
ALTER TABLE `tbl_lesson_contents`
  ADD PRIMARY KEY (`content_id`),
  ADD KEY `lesson_id` (`lesson_id`);

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
-- Indexes for table `tbl_progress_charts`
--
ALTER TABLE `tbl_progress_charts`
  ADD PRIMARY KEY (`chart_id`),
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
-- Indexes for table `tbl_schedule`
--
ALTER TABLE `tbl_schedule`
  ADD PRIMARY KEY (`schedule_id`),
  ADD UNIQUE KEY `unique_batch_schedule` (`batch_id`);

--
-- Indexes for table `tbl_scholarship`
--
ALTER TABLE `tbl_scholarship`
  ADD PRIMARY KEY (`scholarship_id`),
  ADD KEY `trainee_id` (`trainee_id`),
  ADD KEY `fk_scholarship_type` (`scholarship_type_id`);

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
-- Indexes for table `tbl_system_settings`
--
ALTER TABLE `tbl_system_settings`
  ADD PRIMARY KEY (`setting_id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `tbl_task_sheets`
--
ALTER TABLE `tbl_task_sheets`
  ADD PRIMARY KEY (`task_sheet_id`),
  ADD KEY `lesson_id` (`lesson_id`);

--
-- Indexes for table `tbl_task_sheet_submissions`
--
ALTER TABLE `tbl_task_sheet_submissions`
  ADD PRIMARY KEY (`submission_id`),
  ADD UNIQUE KEY `unique_submission` (`lesson_id`,`trainee_id`),
  ADD KEY `fk_submission_lesson` (`lesson_id`),
  ADD KEY `fk_submission_trainee` (`trainee_id`),
  ADD KEY `fk_submission_grader` (`graded_by`);

--
-- Indexes for table `tbl_test`
--
ALTER TABLE `tbl_test`
  ADD PRIMARY KEY (`test_id`),
  ADD KEY `lesson_id` (`lesson_id`),
  ADD KEY `activity_type_id` (`activity_type_id`),
  ADD KEY `score_type_id` (`score_type_id`);

--
-- Indexes for table `tbl_trainee_dtl`
--
ALTER TABLE `tbl_trainee_dtl`
  ADD PRIMARY KEY (`trainee_dtl_id`),
  ADD KEY `trainee_id` (`trainee_id`);

--
-- Indexes for table `tbl_trainee_ftr`
--
ALTER TABLE `tbl_trainee_ftr`
  ADD PRIMARY KEY (`trainee_ftr_id`),
  ADD KEY `trainee_id` (`trainee_id`);

--
-- Indexes for table `tbl_trainee_hdr`
--
ALTER TABLE `tbl_trainee_hdr`
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
  MODIFY `activity_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_activity_logs`
--
ALTER TABLE `tbl_activity_logs`
  MODIFY `activity_log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

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
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_certificate`
--
ALTER TABLE `tbl_certificate`
  MODIFY `certificate_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_course`
--
ALTER TABLE `tbl_course`
  MODIFY `course_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_enrolled_trainee`
--
ALTER TABLE `tbl_enrolled_trainee`
  MODIFY `enrolled_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tbl_enrollment`
--
ALTER TABLE `tbl_enrollment`
  MODIFY `enrollment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

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
  MODIFY `grades_dtl_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_grades_hdr`
--
ALTER TABLE `tbl_grades_hdr`
  MODIFY `grades_hdr_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `tbl_lessons`
--
ALTER TABLE `tbl_lessons`
  MODIFY `lesson_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_lesson_contents`
--
ALTER TABLE `tbl_lesson_contents`
  MODIFY `content_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_module`
--
ALTER TABLE `tbl_module`
  MODIFY `module_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_offered_courses`
--
ALTER TABLE `tbl_offered_courses`
  MODIFY `offered_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_progress_charts`
--
ALTER TABLE `tbl_progress_charts`
  MODIFY `chart_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_quiz_options`
--
ALTER TABLE `tbl_quiz_options`
  MODIFY `option_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=696;

--
-- AUTO_INCREMENT for table `tbl_quiz_questions`
--
ALTER TABLE `tbl_quiz_questions`
  MODIFY `question_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=233;

--
-- AUTO_INCREMENT for table `tbl_role`
--
ALTER TABLE `tbl_role`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_schedule`
--
ALTER TABLE `tbl_schedule`
  MODIFY `schedule_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_scholarship`
--
ALTER TABLE `tbl_scholarship`
  MODIFY `scholarship_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

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
-- AUTO_INCREMENT for table `tbl_system_settings`
--
ALTER TABLE `tbl_system_settings`
  MODIFY `setting_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_task_sheets`
--
ALTER TABLE `tbl_task_sheets`
  MODIFY `task_sheet_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_task_sheet_submissions`
--
ALTER TABLE `tbl_task_sheet_submissions`
  MODIFY `submission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_test`
--
ALTER TABLE `tbl_test`
  MODIFY `test_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_trainee_dtl`
--
ALTER TABLE `tbl_trainee_dtl`
  MODIFY `trainee_dtl_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_trainee_ftr`
--
ALTER TABLE `tbl_trainee_ftr`
  MODIFY `trainee_ftr_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_trainee_hdr`
--
ALTER TABLE `tbl_trainee_hdr`
  MODIFY `trainee_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_trainer`
--
ALTER TABLE `tbl_trainer`
  MODIFY `trainer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_training`
--
ALTER TABLE `tbl_training`
  MODIFY `training_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tbl_activity_logs`
--
ALTER TABLE `tbl_activity_logs`
  ADD CONSTRAINT `fk_activity_logs_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `tbl_attendance_dtl`
--
ALTER TABLE `tbl_attendance_dtl`
  ADD CONSTRAINT `tbl_attendance_dtl_ibfk_1` FOREIGN KEY (`attendance_hdr_id`) REFERENCES `tbl_attendance_hdr` (`attendance_hdr_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_attendance_dtl_ibfk_2` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_attendance_hdr`
--
ALTER TABLE `tbl_attendance_hdr`
  ADD CONSTRAINT `tbl_attendance_hdr_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_batch`
--
ALTER TABLE `tbl_batch`
  ADD CONSTRAINT `fk_batch_scholarship` FOREIGN KEY (`scholarship_type_id`) REFERENCES `tbl_scholarship_type` (`scholarship_type_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_batch_trainer` FOREIGN KEY (`trainer_id`) REFERENCES `tbl_trainer` (`trainer_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `tbl_certificate`
--
ALTER TABLE `tbl_certificate`
  ADD CONSTRAINT `tbl_certificate_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_certificate_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `tbl_course` (`course_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_enrolled_trainee`
--
ALTER TABLE `tbl_enrolled_trainee`
  ADD CONSTRAINT `tbl_enrolled_trainee_ibfk_1` FOREIGN KEY (`enrollment_id`) REFERENCES `tbl_enrollment` (`enrollment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_enrolled_trainee_ibfk_2` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_enrollment`
--
ALTER TABLE `tbl_enrollment`
  ADD CONSTRAINT `fk_enrollment_scholarship` FOREIGN KEY (`scholarship_type_id`) REFERENCES `tbl_scholarship_type` (`scholarship_type_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_enrollment_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_enrollment_ibfk_2` FOREIGN KEY (`offered_id`) REFERENCES `tbl_offered_courses` (`offered_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_enrollment_ibfk_3` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `tbl_feedback`
--
ALTER TABLE `tbl_feedback`
  ADD CONSTRAINT `tbl_feedback_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_feedback_ibfk_2` FOREIGN KEY (`trainer_id`) REFERENCES `tbl_trainer` (`trainer_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_finance_record`
--
ALTER TABLE `tbl_finance_record`
  ADD CONSTRAINT `tbl_finance_record_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  ADD CONSTRAINT `tbl_grades_hdr_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_grades_hdr_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `tbl_course` (`course_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_lessons`
--
ALTER TABLE `tbl_lessons`
  ADD CONSTRAINT `tbl_lessons_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `tbl_module` (`module_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_lesson_contents`
--
ALTER TABLE `tbl_lesson_contents`
  ADD CONSTRAINT `fk_content_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `tbl_lessons` (`lesson_id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
-- Constraints for table `tbl_progress_charts`
--
ALTER TABLE `tbl_progress_charts`
  ADD CONSTRAINT `fk_progress_charts_trainer` FOREIGN KEY (`trainer_id`) REFERENCES `tbl_trainer` (`trainer_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_quiz_options`
--
ALTER TABLE `tbl_quiz_options`
  ADD CONSTRAINT `tbl_quiz_options_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `tbl_quiz_questions` (`question_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_quiz_questions`
--
ALTER TABLE `tbl_quiz_questions`
  ADD CONSTRAINT `tbl_quiz_questions_ibfk_1` FOREIGN KEY (`test_id`) REFERENCES `tbl_test` (`test_id`) ON DELETE CASCADE;

--
-- Constraints for table `tbl_schedule`
--
ALTER TABLE `tbl_schedule`
  ADD CONSTRAINT `fk_schedule_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_scholarship`
--
ALTER TABLE `tbl_scholarship`
  ADD CONSTRAINT `fk_scholarship_type` FOREIGN KEY (`scholarship_type_id`) REFERENCES `tbl_scholarship_type` (`scholarship_type_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_scholarship_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_task_sheets`
--
ALTER TABLE `tbl_task_sheets`
  ADD CONSTRAINT `fk_task_sheet_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `tbl_lessons` (`lesson_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_task_sheet_submissions`
--
ALTER TABLE `tbl_task_sheet_submissions`
  ADD CONSTRAINT `fk_submission_grader` FOREIGN KEY (`graded_by`) REFERENCES `tbl_users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_submission_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `tbl_lessons` (`lesson_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_submission_trainee` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_test`
--
ALTER TABLE `tbl_test`
  ADD CONSTRAINT `tbl_test_ibfk_1` FOREIGN KEY (`lesson_id`) REFERENCES `tbl_lessons` (`lesson_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_test_ibfk_2` FOREIGN KEY (`activity_type_id`) REFERENCES `tbl_activities_type` (`activity_type_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tbl_test_ibfk_3` FOREIGN KEY (`score_type_id`) REFERENCES `tbl_score_type` (`score_type_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_trainee_dtl`
--
ALTER TABLE `tbl_trainee_dtl`
  ADD CONSTRAINT `fk_trainee_dtl` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_trainee_ftr`
--
ALTER TABLE `tbl_trainee_ftr`
  ADD CONSTRAINT `fk_trainee_ftr` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_trainee_hdr`
--
ALTER TABLE `tbl_trainee_hdr`
  ADD CONSTRAINT `tbl_trainee_hdr_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_trainer`
--
ALTER TABLE `tbl_trainer`
  ADD CONSTRAINT `tbl_trainer_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tbl_training`
--
ALTER TABLE `tbl_training`
  ADD CONSTRAINT `tbl_training_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
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
