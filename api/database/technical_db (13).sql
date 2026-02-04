-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 29, 2026 at 08:36 AM
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
(5, 14, 'login_success', 'tbl_users', 14, 'User logged in successfully', '::1', '2026-01-29 15:31:20');

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
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('open','closed') DEFAULT 'open'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_batch`
--

INSERT INTO `tbl_batch` (`batch_id`, `batch_name`, `course_id`, `trainer_id`, `scholarship_type`, `start_date`, `end_date`, `status`) VALUES
(2, 'Batch 2026', 1, 1, 'STEP', '2026-01-27', '2026-01-28', 'open'),
(3, 'Batch 2026.1', 3, 2, 'STEP', '2026-01-29', '2026-02-01', 'open');

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
  `scholarship_type` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_enrollment`
--

INSERT INTO `tbl_enrollment` (`enrollment_id`, `trainee_id`, `offered_id`, `batch_id`, `enrollment_date`, `status`, `scholarship_type`) VALUES
(4, 5, 1, 2, '2026-01-27', 'approved', 'STEP'),
(6, 7, 2, 3, '2026-01-29', 'approved', 'TWSP');

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
  `content` longtext DEFAULT NULL,
  `posting_date` datetime DEFAULT NULL,
  `task_sheet_file` varchar(255) DEFAULT NULL,
  `task_sheet_content` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_lessons`
--

INSERT INTO `tbl_lessons` (`lesson_id`, `module_id`, `day_number`, `lesson_title`, `lesson_description`, `content`, `posting_date`, `task_sheet_file`, `task_sheet_content`) VALUES
(2, 3, NULL, '1.1 Install electrical metallic /nonmetallic (PVC conduit)', '', '<div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_0\" style=\"background-color: rgb(248, 249, 250);\">\r\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\r\n        <strong class=\"field-label\" contenteditable=\"true\" style=\"cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;\">Lesson Code</strong>\r\n        <div>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-success me-1\" onclick=\"addInputFieldInside(\'field_0\')\" title=\"Add Input Field\">\r\n                <i class=\"fas fa-plus-circle\"></i>\r\n            </button>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"editFieldContent(\'field_0\')\" title=\"Edit Content\">\r\n                <i class=\"fas fa-edit\"></i>\r\n            </button>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteField(\'field_0\')\" title=\"Delete Field\">\r\n                <i class=\"fas fa-trash\"></i>\r\n            </button>\r\n        </div>\r\n    </div>\r\n    <div class=\"field-content\" contenteditable=\"true\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;\" onclick=\"editFieldContent(\'field_0\')\">EIM-CC1-L1\r\n<div class=\"input-group mb-2\" id=\"input_1769658200264\" style=\"position: relative;\" contenteditable=\"false\">\r\n    <span class=\"input-group-text\" style=\"cursor: pointer;\" title=\"Click to remove bullet\" onclick=\"this.remove()\">•</span>\r\n    <input type=\"text\" class=\"form-control\" placeholder=\"Enter value here...\" value=\"\">\r\n    <button class=\"btn btn-outline-danger btn-sm\" type=\"button\" onclick=\"document.getElementById(\'input_1769658200264\').remove()\" title=\"Remove Input\">\r\n        <i class=\"fas fa-times\"></i>\r\n    </button>\r\n</div>\r\n    </div>\r\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_1\" style=\"background-color: rgb(248, 249, 250);\">\r\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\r\n        <strong class=\"field-label\" contenteditable=\"true\" style=\"cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;\">Unit Of Competency</strong>\r\n        <div>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-success me-1\" onclick=\"addInputFieldInside(\'field_1\')\" title=\"Add Input Field\">\r\n                <i class=\"fas fa-plus-circle\"></i>\r\n            </button>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"editFieldContent(\'field_1\')\" title=\"Edit Content\">\r\n                <i class=\"fas fa-edit\"></i>\r\n            </button>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteField(\'field_1\')\" title=\"Delete Field\">\r\n                <i class=\"fas fa-trash\"></i>\r\n            </button>\r\n        </div>\r\n    </div>\r\n    <div class=\"field-content\" contenteditable=\"true\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;\" onclick=\"editFieldContent(\'field_1\')\">Perform Roughing-In, Wiring and Cabling Works</div>\r\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_2\" style=\"background-color: rgb(248, 249, 250);\">\r\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\r\n        <strong class=\"field-label\" contenteditable=\"true\" style=\"cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;\">Module Title:</strong>\r\n        <div>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-success me-1\" onclick=\"addInputFieldInside(\'field_2\')\" title=\"Add Input Field\">\r\n                <i class=\"fas fa-plus-circle\"></i>\r\n            </button>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"editFieldContent(\'field_2\')\" title=\"Edit Content\">\r\n                <i class=\"fas fa-edit\"></i>\r\n            </button>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteField(\'field_2\')\" title=\"Delete Field\">\r\n                <i class=\"fas fa-trash\"></i>\r\n            </button>\r\n        </div>\r\n    </div>\r\n    <div class=\"field-content\" contenteditable=\"true\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;\" onclick=\"editFieldContent(\'field_2\')\">Install Electrical Metallic / Non-Metallic (PVC) Conduits</div>\r\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_3\" style=\"background-color: rgb(248, 249, 250);\">\r\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\r\n        <strong class=\"field-label\" contenteditable=\"true\" style=\"cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;\">Nominal Duration:</strong>\r\n        <div>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-success me-1\" onclick=\"addInputFieldInside(\'field_3\')\" title=\"Add Input Field\">\r\n                <i class=\"fas fa-plus-circle\"></i>\r\n            </button>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"editFieldContent(\'field_3\')\" title=\"Edit Content\">\r\n                <i class=\"fas fa-edit\"></i>\r\n            </button>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteField(\'field_3\')\" title=\"Delete Field\">\r\n                <i class=\"fas fa-trash\"></i>\r\n            </button>\r\n        </div>\r\n    </div>\r\n    <div class=\"field-content\" contenteditable=\"true\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;\" onclick=\"editFieldContent(\'field_3\')\">16 Hours</div>\r\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_4\" style=\"background-color: rgb(248, 249, 250);\">\r\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\r\n        <strong class=\"field-label\" contenteditable=\"true\" style=\"cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;\">Learning Outcomes</strong>\r\n        <div>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-success me-1\" onclick=\"addInputFieldInside(\'field_4\')\" title=\"Add Input Field\">\r\n                <i class=\"fas fa-plus-circle\"></i>\r\n            </button>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"editFieldContent(\'field_4\')\" title=\"Edit Content\">\r\n                <i class=\"fas fa-edit\"></i>\r\n            </button>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteField(\'field_4\')\" title=\"Delete Field\">\r\n                <i class=\"fas fa-trash\"></i>\r\n            </button>\r\n        </div>\r\n    </div>\r\n    <div class=\"field-content\" contenteditable=\"true\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;\" onclick=\"editFieldContent(\'field_4\')\">After completing this lesson, the trainee shall be able to:\r\n<div class=\"input-group mb-2\" id=\"input_1769596280744\" style=\"position: relative;\">\r\n    <input type=\"text\" class=\"form-control\" placeholder=\"Enter value here...\" value=\"Interpret electrical wiring diagrams and mechanical drawings\">\r\n    <button class=\"btn btn-outline-danger btn-sm\" type=\"button\" onclick=\"document.getElementById(\'input_1769596280744\').remove()\" title=\"Remove Input\">\r\n        <i class=\"fas fa-times\"></i>\r\n    </button>\r\n</div>\r\n    \r\n\r\n    \r\n<div class=\"input-group mb-2\" id=\"input_1769596299070\" style=\"position: relative;\">\r\n    <input type=\"text\" class=\"form-control\" placeholder=\"Enter value here...\" value=\"Identify the proper usage and types of electrical conduits and fittings\">\r\n    <button class=\"btn btn-outline-danger btn-sm\" type=\"button\" onclick=\"document.getElementById(\'input_1769596299070\').remove()\" title=\"Remove Input\">\r\n        <i class=\"fas fa-times\"></i>\r\n    </button>\r\n</div>\r\n    \r\n<div class=\"input-group mb-2\" id=\"input_1769596303542\" style=\"position: relative;\">\r\n    <input type=\"text\" class=\"form-control\" placeholder=\"Enter value here...\" value=\"Apply correct techniques in conduit bending and installation\">\r\n    <button class=\"btn btn-outline-danger btn-sm\" type=\"button\" onclick=\"document.getElementById(\'input_1769596303542\').remove()\" title=\"Remove Input\">\r\n        <i class=\"fas fa-times\"></i>\r\n    </button>\r\n</div>\r\n    \r\n<div class=\"input-group mb-2\" id=\"input_1769596312152\" style=\"position: relative;\">\r\n    <input type=\"text\" class=\"form-control\" placeholder=\"Enter value here...\" value=\"Observe occupational safety and health procedures using PPE\">\r\n    <button class=\"btn btn-outline-danger btn-sm\" type=\"button\" onclick=\"document.getElementById(\'input_1769596312152\').remove()\" title=\"Remove Input\">\r\n        <i class=\"fas fa-times\"></i>\r\n    </button>\r\n</div>\r\n    </div>\r\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_5\" style=\"background-color: rgb(248, 249, 250);\">\r\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\r\n        <strong class=\"field-label\" contenteditable=\"true\" style=\"cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;\">Lecture:</strong>\r\n        <div>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-success me-1\" onclick=\"addInputFieldInside(\'field_5\')\" title=\"Add Input Field\">\r\n                <i class=\"fas fa-plus-circle\"></i>\r\n            </button>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"editFieldContent(\'field_5\')\" title=\"Edit Content\">\r\n                <i class=\"fas fa-edit\"></i>\r\n            </button>\r\n            <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteField(\'field_5\')\" title=\"Delete Field\">\r\n                <i class=\"fas fa-trash\"></i>\r\n            </button>\r\n        </div>\r\n    </div>\r\n    <div class=\"field-content\" contenteditable=\"true\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;\" onclick=\"editFieldContent(\'field_5\')\"><h3 data-start=\"165\" data-end=\"215\">Introduction to Electrical Roughing-In Works</h3>\r\n<p data-start=\"216\" data-end=\"566\">Electrical roughing-in refers to the initial stage of electrical installation where wiring systems, conduits, boxes, and fittings are installed before walls, ceilings, and finishes are completed. This phase ensures that electrical layouts follow approved plans, comply with safety standards, and are prepared for final wiring and device installation.</p>\r\n<hr data-start=\"568\" data-end=\"571\">\r\n<h3 data-start=\"573\" data-end=\"596\">Types of Conduits</h3>\r\n<p data-start=\"598\" data-end=\"639\"><strong data-start=\"598\" data-end=\"637\">1. Electrical Metallic Tubing (EMT)</strong></p>\r\n<ul data-start=\"640\" data-end=\"787\">\r\n<li data-start=\"640\" data-end=\"667\">\r\n<p data-start=\"642\" data-end=\"667\">Thin-wall steel conduit</p>\r\n</li>\r\n<li data-start=\"668\" data-end=\"700\">\r\n<p data-start=\"670\" data-end=\"700\">Lightweight and easy to bend</p>\r\n</li>\r\n<li data-start=\"701\" data-end=\"743\">\r\n<p data-start=\"703\" data-end=\"743\">Commonly used for indoor installations</p>\r\n</li>\r\n<li data-start=\"744\" data-end=\"787\">\r\n<p data-start=\"746\" data-end=\"787\">Provides moderate mechanical protection</p>\r\n</li>\r\n</ul>\r\n<p data-start=\"789\" data-end=\"830\"><strong data-start=\"789\" data-end=\"828\">2. Intermediate Metal Conduit (IMC)</strong></p>\r\n<ul data-start=\"831\" data-end=\"957\">\r\n<li data-start=\"831\" data-end=\"872\">\r\n<p data-start=\"833\" data-end=\"872\">Thicker than EMT but lighter than RSC</p>\r\n</li>\r\n<li data-start=\"873\" data-end=\"917\">\r\n<p data-start=\"875\" data-end=\"917\">Offers increased strength and durability</p>\r\n</li>\r\n<li data-start=\"918\" data-end=\"957\">\r\n<p data-start=\"920\" data-end=\"957\">Suitable for indoor and outdoor use</p>\r\n</li>\r\n</ul>\r\n<p data-start=\"959\" data-end=\"993\"><strong data-start=\"959\" data-end=\"991\">3. Rigid Steel Conduit (RSC)</strong></p>\r\n<ul data-start=\"994\" data-end=\"1164\">\r\n<li data-start=\"994\" data-end=\"1022\">\r\n<p data-start=\"996\" data-end=\"1022\">Thick-wall steel conduit</p>\r\n</li>\r\n<li data-start=\"1023\" data-end=\"1065\">\r\n<p data-start=\"1025\" data-end=\"1065\">Provides maximum mechanical protection</p>\r\n</li>\r\n<li data-start=\"1066\" data-end=\"1127\">\r\n<p data-start=\"1068\" data-end=\"1127\">Used in industrial, commercial, and exposed installations</p>\r\n</li>\r\n<li data-start=\"1128\" data-end=\"1164\">\r\n<p data-start=\"1130\" data-end=\"1164\">Suitable for hazardous locations</p>\r\n</li>\r\n</ul>\r\n<p data-start=\"1166\" data-end=\"1207\"><strong data-start=\"1166\" data-end=\"1205\">4. Polyvinyl Chloride (PVC) Conduit</strong></p>\r\n<ul data-start=\"1208\" data-end=\"1408\">\r\n<li data-start=\"1208\" data-end=\"1248\">\r\n<p data-start=\"1210\" data-end=\"1248\">Non-metallic and corrosion-resistant</p>\r\n</li>\r\n<li data-start=\"1249\" data-end=\"1284\">\r\n<p data-start=\"1251\" data-end=\"1284\">Lightweight and easy to install</p>\r\n</li>\r\n<li data-start=\"1285\" data-end=\"1344\">\r\n<p data-start=\"1287\" data-end=\"1344\">Commonly used for underground and outdoor installations</p>\r\n</li>\r\n<li data-start=\"1345\" data-end=\"1408\">\r\n<p data-start=\"1347\" data-end=\"1408\">Not suitable for areas requiring high mechanical protection</p>\r\n</li>\r\n</ul>\r\n<hr data-start=\"1410\" data-end=\"1413\">\r\n<h3 data-start=\"1415\" data-end=\"1463\">Uses and Applications of Each Conduit Type</h3>\r\n<ul data-start=\"1464\" data-end=\"1702\">\r\n<li data-start=\"1464\" data-end=\"1515\">\r\n<p data-start=\"1466\" data-end=\"1515\">EMT: Residential and light commercial buildings</p>\r\n</li>\r\n<li data-start=\"1516\" data-end=\"1569\">\r\n<p data-start=\"1518\" data-end=\"1569\">IMC: Commercial and semi-industrial installations</p>\r\n</li>\r\n<li data-start=\"1570\" data-end=\"1631\">\r\n<p data-start=\"1572\" data-end=\"1631\">RSC: Heavy-duty industrial environments and exposed areas</p>\r\n</li>\r\n<li data-start=\"1632\" data-end=\"1702\">\r\n<p data-start=\"1634\" data-end=\"1702\">PVC: Underground wiring, wet locations, and corrosive environments</p>\r\n</li>\r\n</ul>\r\n<hr data-start=\"1704\" data-end=\"1707\">\r\n<h3 data-start=\"1709\" data-end=\"1804\">Basic Electrical Code of the Philippines (PEC) Provisions Related to Conduit Installation</h3>\r\n<ul data-start=\"1805\" data-end=\"2046\">\r\n<li data-start=\"1805\" data-end=\"1854\">\r\n<p data-start=\"1807\" data-end=\"1854\">Proper conduit sizing based on conductor fill</p>\r\n</li>\r\n<li data-start=\"1855\" data-end=\"1899\">\r\n<p data-start=\"1857\" data-end=\"1899\">Secure fastening and support of conduits</p>\r\n</li>\r\n<li data-start=\"1900\" data-end=\"1940\">\r\n<p data-start=\"1902\" data-end=\"1940\">Correct bending radius and alignment</p>\r\n</li>\r\n<li data-start=\"1941\" data-end=\"1985\">\r\n<p data-start=\"1943\" data-end=\"1985\">Use of approved fittings and accessories</p>\r\n</li>\r\n<li data-start=\"1986\" data-end=\"2046\">\r\n<p data-start=\"1988\" data-end=\"2046\">Grounding and bonding requirements for metallic conduits</p>\r\n</li>\r\n</ul>\r\n<hr data-start=\"2048\" data-end=\"2051\">\r\n<h3 data-start=\"2053\" data-end=\"2117\"><p data-pm-slice=\"0 0 []\">Safety Practices and Required PPE During Roughing-In Works</p></h3>\r\n<ul data-start=\"2118\" data-end=\"2443\">\r\n<li data-start=\"2118\" data-end=\"2206\">\r\n<p data-start=\"2120\" data-end=\"2206\">Wear appropriate PPE such as safety helmet, gloves, safety shoes, and eye protection</p>\r\n</li>\r\n<li data-start=\"2207\" data-end=\"2268\">\r\n<p data-start=\"2209\" data-end=\"2268\">Ensure power sources are disconnected before installation</p>\r\n</li>\r\n<li data-start=\"2269\" data-end=\"2321\">\r\n<p data-start=\"2271\" data-end=\"2321\">Use proper tools and equipment in good condition</p>\r\n</li>\r\n<li data-start=\"2322\" data-end=\"2366\">\r\n<p data-start=\"2324\" data-end=\"2366\">Maintain a clean and organized work area</p>\r\n</li>\r\n<li data-start=\"2367\" data-end=\"2443\">\r\n<p data-start=\"2369\" data-end=\"2443\">Follow PEC safety standards and workplace safety procedures at all times</p></li></ul></div>\r\n</div>', '2026-01-29 23:31:00', 'task_1769617613_598706627_3335430083274662_7994946475721277614_n (1).png', '<div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_0\" style=\"background-color: rgb(248, 249, 250);\">\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\n        <strong class=\"field-label\" contenteditable=\"true\" style=\"cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;\">Task Sheet 1.1</strong>\n        <div>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-success me-1\" onclick=\"addInputFieldInside(\'field_0\')\" title=\"Add Input Field\">\n                <i class=\"fas fa-plus-circle\"></i>\n            </button>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"editFieldContent(\'field_0\', true)\" title=\"Edit Content\">\n                <i class=\"fas fa-edit\"></i>\n            </button>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteField(\'field_0\')\" title=\"Delete Field\">\n                <i class=\"fas fa-trash\"></i>\n            </button>\n        </div>\n    </div>\n    <div class=\"field-content\" contenteditable=\"true\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;\" onclick=\"editFieldContent(\'field_0\')\"><p data-start=\"168\" data-end=\"199\"><strong data-start=\"168\" data-end=\"178\">Title:</strong> Set Up CCTV cables</p></div>\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_1\" style=\"background-color: rgb(248, 249, 250);\">\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\n        <strong class=\"field-label\" contenteditable=\"true\" style=\"cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;\"><span style=\"background-color: rgb(255, 255, 255);\">Performance Objective:</span></strong>\n        <div>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-success me-1\" onclick=\"addInputFieldInside(\'field_1\')\" title=\"Add Input Field\">\n                <i class=\"fas fa-plus-circle\"></i>\n            </button>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"editFieldContent(\'field_1\', true)\" title=\"Edit Content\">\n                <i class=\"fas fa-edit\"></i>\n            </button>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteField(\'field_1\')\" title=\"Delete Field\">\n                <i class=\"fas fa-trash\"></i>\n            </button>\n        </div>\n    </div>\n    <div class=\"field-content\" contenteditable=\"true\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;\" onclick=\"editFieldContent(\'field_1\')\"><p data-start=\"201\" data-end=\"423\">Upon completion of this task, given the necessary tools, materials and equipment, the trainee will be able to correctly set up the closed-circuit television (CCTV) within 1 hour and 30 minutes.</p></div>\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_2\" style=\"background-color: rgb(248, 249, 250);\">\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\n        <strong class=\"field-label\" contenteditable=\"true\" style=\"cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;\">Supplies/Materials:</strong>\n        <div>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-success me-1\" onclick=\"addInputFieldInside(\'field_2\')\" title=\"Add Input Field\">\n                <i class=\"fas fa-plus-circle\"></i>\n            </button>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"editFieldContent(\'field_2\', true)\" title=\"Edit Content\">\n                <i class=\"fas fa-edit\"></i>\n            </button>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteField(\'field_2\')\" title=\"Delete Field\">\n                <i class=\"fas fa-trash\"></i>\n            </button>\n        </div>\n    </div>\n    <div class=\"field-content\" contenteditable=\"true\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;\" onclick=\"editFieldContent(\'field_2\')\"><ul data-start=\"451\" data-end=\"532\"><li data-start=\"451\" data-end=\"493\"><p data-start=\"453\" data-end=\"493\">CCTV components (Monitor, Camera, DVR)</p></li><li data-start=\"494\" data-end=\"532\"><p data-start=\"496\" data-end=\"532\">Mounting hardware (screws, brackets)</p></li></ul></div>\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_3\" style=\"background-color: rgb(248, 249, 250);\">\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\n        <strong class=\"field-label\" contenteditable=\"true\" style=\"cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;\">Equipment:</strong>\n        <div>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-success me-1\" onclick=\"addInputFieldInside(\'field_3\')\" title=\"Add Input Field\">\n                <i class=\"fas fa-plus-circle\"></i>\n            </button>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"editFieldContent(\'field_3\', true)\" title=\"Edit Content\">\n                <i class=\"fas fa-edit\"></i>\n            </button>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteField(\'field_3\')\" title=\"Delete Field\">\n                <i class=\"fas fa-trash\"></i>\n            </button>\n        </div>\n    </div>\n    <div class=\"field-content\" contenteditable=\"true\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;\" onclick=\"editFieldContent(\'field_3\')\"><ul data-start=\"551\" data-end=\"623\"><li data-start=\"551\" data-end=\"590\"><p data-start=\"553\" data-end=\"590\">Screwdrivers (flathead and Philips)</p></li><li data-start=\"591\" data-end=\"623\"><p data-start=\"593\" data-end=\"623\">Pliers (optional for mounting)</p></li></ul></div>\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_4\" style=\"background-color: rgb(248, 249, 250);\">\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\n        <strong class=\"field-label\" contenteditable=\"true\" style=\"cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;\">Steps/Procedures:</strong>\n        <div>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-success me-1\" onclick=\"addInputFieldInside(\'field_4\')\" title=\"Add Input Field\">\n                <i class=\"fas fa-plus-circle\"></i>\n            </button>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"editFieldContent(\'field_4\', true)\" title=\"Edit Content\">\n                <i class=\"fas fa-edit\"></i>\n            </button>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteField(\'field_4\')\" title=\"Delete Field\">\n                <i class=\"fas fa-trash\"></i>\n            </button>\n        </div>\n    </div>\n    <div class=\"field-content\" contenteditable=\"true\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;\" onclick=\"editFieldContent(\'field_4\')\"><ol data-start=\"649\" data-end=\"1068\"><li data-start=\"649\" data-end=\"680\"><p data-start=\"652\" data-end=\"680\">Gather required materials.</p></li><li data-start=\"681\" data-end=\"700\"><p data-start=\"684\" data-end=\"700\">Mount cameras.</p></li><li data-start=\"701\" data-end=\"746\"><p data-start=\"704\" data-end=\"746\">Connect the power supply to each camera.</p></li><li data-start=\"747\" data-end=\"794\"><p data-start=\"750\" data-end=\"794\">Connect the video cables from the cameras.</p></li><li data-start=\"795\" data-end=\"840\"><p data-start=\"798\" data-end=\"840\">Connect the video cables to the DVR/NVR.</p></li><li data-start=\"841\" data-end=\"900\"><p data-start=\"844\" data-end=\"900\">Connect the VGA cable from the DVR/NVR to the monitor.</p></li><li data-start=\"901\" data-end=\"941\"><p data-start=\"904\" data-end=\"941\">Connect the power cable to the DVR.</p></li><li data-start=\"942\" data-end=\"986\"><p data-start=\"945\" data-end=\"986\">Connect the power cable to the monitor.</p></li><li data-start=\"987\" data-end=\"1041\"><p data-start=\"990\" data-end=\"1041\">Test the camera feed and adjust angles as needed.</p></li><li data-start=\"1042\" data-end=\"1068\"><p data-start=\"1046\" data-end=\"1068\">Finalize installation.</p></li></ol></div>\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_5\" style=\"background-color: rgb(248, 249, 250);\">\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\n        <strong class=\"field-label\" contenteditable=\"true\" style=\"cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;\"><span style=\"background-color: rgb(255, 255, 255);\">Assessment Method:</span></strong>\n        <div>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-success me-1\" onclick=\"addInputFieldInside(\'field_5\')\" title=\"Add Input Field\">\n                <i class=\"fas fa-plus-circle\"></i>\n            </button>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-primary\" onclick=\"editFieldContent(\'field_5\', true)\" title=\"Edit Content\">\n                <i class=\"fas fa-edit\"></i>\n            </button>\n            <button type=\"button\" class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteField(\'field_5\')\" title=\"Delete Field\">\n                <i class=\"fas fa-trash\"></i>\n            </button>\n        </div>\n    </div>\n    <div class=\"field-content\" contenteditable=\"true\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;\" onclick=\"editFieldContent(\'field_5\')\">DEMONSTRATION</div>\n</div><div class=\"custom-field-block mb-3 p-3 border rounded bg-white\">\n        <div class=\"d-flex justify-content-between align-items-center mb-2\">\n            <strong contenteditable=\"true\" class=\"field-label\" style=\"cursor: text; border: 1px dashed #dee2e6; padding: 0 5px;\">Performance Criteria Checklist 1.1</strong>\n            <div>\n                <button class=\"btn btn-sm btn-outline-primary\" onclick=\"addTableRow(\'table_1769658321809\')\" title=\"Add Row\"><i class=\"fas fa-plus\"></i> Row</button>\n                <button class=\"btn btn-sm btn-outline-primary\" onclick=\"addTableCol(\'table_1769658321809\')\" title=\"Add Column\"><i class=\"fas fa-plus\"></i> Col</button>\n                <button class=\"btn btn-sm btn-outline-info\" onclick=\"addTableCheckboxCol(\'table_1769658321809\')\" title=\"Add Checkbox Column\"><i class=\"fas fa-check-square\"></i> Checkbox</button>\n                <button class=\"btn btn-sm btn-outline-danger\" onclick=\"this.closest(\'.custom-field-block\').remove()\" title=\"Delete Table\"><i class=\"fas fa-trash\"></i></button>\n            </div>\n        </div>\n        <div class=\"table-responsive\">\n            <table class=\"table table-bordered mb-0\" id=\"table_1769658321809\" style=\"background-color: white;\">\n                <thead>\n                    <tr>\n                        <th><span contenteditable=\"true\">Criteria</span> <button contenteditable=\"false\" class=\"btn btn-xs btn-outline-danger p-0 px-1 ms-2\" onclick=\"deleteTableCol(this)\" title=\"Delete Column\">×</button></th>\n                        \n                        <th style=\"text-align: center; width: 50px;\"><span contenteditable=\"true\">Yes</span> <button contenteditable=\"false\" class=\"btn btn-xs btn-outline-danger p-0 px-1 ms-2\" onclick=\"deleteTableCol(this)\" title=\"Delete Column\">×</button></th><th style=\"text-align: center; width: 50px;\"><span contenteditable=\"true\">No</span> <button contenteditable=\"false\" class=\"btn btn-xs btn-outline-danger p-0 px-1 ms-2\" onclick=\"deleteTableCol(this)\" title=\"Delete Column\">×</button></th><th class=\"table-actions-header\" style=\"width: 1%;\" contenteditable=\"false\">Actions</th>\n                    </tr>\n                </thead>\n                <tbody>\n                    <tr>\n                        <td contenteditable=\"true\"><div>1. Gather required materials.</div></td>\n                        \n                        <td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td class=\"text-center\" contenteditable=\"false\"><button class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteTableRow(this)\" title=\"Delete Row\"><i class=\"fas fa-trash-alt\"></i></button></td>\n                    </tr>\n                <tr><td contenteditable=\"true\">2. Mount cameras.</td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td class=\"text-center\" contenteditable=\"false\"><button class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteTableRow(this)\" title=\"Delete Row\"><i class=\"fas fa-trash-alt\"></i></button></td></tr><tr><td contenteditable=\"true\">3. Connect the power supply to each camera.</td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td class=\"text-center\" contenteditable=\"false\"><button class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteTableRow(this)\" title=\"Delete Row\"><i class=\"fas fa-trash-alt\"></i></button></td></tr><tr><td contenteditable=\"true\">4. Connect the video cables from the cameras.</td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td class=\"text-center\" contenteditable=\"false\"><button class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteTableRow(this)\" title=\"Delete Row\"><i class=\"fas fa-trash-alt\"></i></button></td></tr><tr><td contenteditable=\"true\">5. Connect the video cables to the DVR/NVR.</td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td class=\"text-center\" contenteditable=\"false\"><button class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteTableRow(this)\" title=\"Delete Row\"><i class=\"fas fa-trash-alt\"></i></button></td></tr><tr><td contenteditable=\"true\">6. Connect the VGA cable from the DVR/NVR to the monitor.</td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td class=\"text-center\" contenteditable=\"false\"><button class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteTableRow(this)\" title=\"Delete Row\"><i class=\"fas fa-trash-alt\"></i></button></td></tr><tr><td contenteditable=\"true\">7. Connect the power cable to the DVR.</td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td class=\"text-center\" contenteditable=\"false\"><button class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteTableRow(this)\" title=\"Delete Row\"><i class=\"fas fa-trash-alt\"></i></button></td></tr><tr><td contenteditable=\"true\">8. Connect the power cable to the monitor.</td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td class=\"text-center\" contenteditable=\"false\"><button class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteTableRow(this)\" title=\"Delete Row\"><i class=\"fas fa-trash-alt\"></i></button></td></tr><tr><td contenteditable=\"true\">9. Test the camera feed and adjust angles as needed.</td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td class=\"text-center\" contenteditable=\"false\"><button class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteTableRow(this)\" title=\"Delete Row\"><i class=\"fas fa-trash-alt\"></i></button></td></tr><tr><td contenteditable=\"true\">10. Finalize installation.</td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td contenteditable=\"false\" style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: pointer;\"></td><td class=\"text-center\" contenteditable=\"false\"><button class=\"btn btn-sm btn-outline-danger\" onclick=\"deleteTableRow(this)\" title=\"Delete Row\"><i class=\"fas fa-trash-alt\"></i></button></td></tr></tbody>\n            </table>\n        </div>\n    </div>');

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
(3, 1, 'UC1', ' Perform roughing-in activities, wiring and cabling works for\nsingle-phase distribution, power, lighting and auxiliary systems');

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
-- Table structure for table `tbl_quiz_options`
--

CREATE TABLE `tbl_quiz_options` (
  `option_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `option_text` text NOT NULL,
  `is_correct` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_quiz_options`
--

INSERT INTO `tbl_quiz_options` (`option_id`, `question_id`, `option_text`, `is_correct`) VALUES
(636, 213, 'A. Installation of light fixtures and switches', 0),
(637, 213, 'B. Final testing of electrical systems', 0),
(638, 213, 'C. Installation of conduits, boxes, and wiring before wall finishing', 1),
(639, 213, 'D. Repair of damaged electrical components', 0),
(640, 214, 'A. RSC', 0),
(641, 214, 'B. IMC', 0),
(642, 214, 'C. EMT', 1),
(643, 214, 'D. PVC', 0),
(644, 215, 'A. EMT', 0),
(645, 215, 'B. IMC', 0),
(646, 215, 'C. PVC', 0),
(647, 215, 'D. RSC', 1),
(648, 216, 'A. EMT', 0),
(649, 216, 'B. IMC', 0),
(650, 216, 'C. RSC', 0),
(651, 216, 'D. PVC', 1),
(652, 217, 'A. EMT', 0),
(653, 217, 'B. IMC', 0),
(654, 217, 'C. RSC', 0),
(655, 217, 'D. PVC', 1),
(656, 218, 'True', 1),
(657, 218, 'False', 0),
(658, 219, 'True', 0),
(659, 219, 'False', 1),
(660, 220, 'True', 0),
(661, 220, 'False', 1),
(662, 221, 'True', 1),
(663, 221, 'False', 0),
(664, 222, 'True', 1),
(665, 222, 'False', 0);

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

--
-- Dumping data for table `tbl_quiz_questions`
--

INSERT INTO `tbl_quiz_questions` (`question_id`, `test_id`, `question_text`, `question_type`) VALUES
(213, 4, 'What is meant by electrical roughing-in works?', 'multiple_choice'),
(214, 4, 'Which conduit type is known as a thin-wall steel conduit and is commonly used for indoor installations?', 'multiple_choice'),
(215, 4, 'Which conduit provides maximum mechanical protection and is commonly used in industrial areas?', 'multiple_choice'),
(216, 4, 'What type of conduit is non-metallic and resistant to corrosion?', 'multiple_choice'),
(217, 4, 'Which conduit is most suitable for underground and wet locations?', 'multiple_choice'),
(218, 4, 'EMT is commonly used for indoor residential and commercial installations.', 'true_false'),
(219, 4, 'PVC conduit provides the highest mechanical protection among all conduit types.', 'true_false'),
(220, 4, 'Roughing-in works are done after wall and ceiling finishes are completed.', 'true_false'),
(221, 4, 'Metallic conduits must be properly grounded according to PEC.', 'true_false'),
(222, 4, 'Maintaining a clean work area is part of electrical safety practices.', 'true_false');

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
  `amount` decimal(10,2) DEFAULT NULL,
  `sponsor` varchar(150) DEFAULT NULL,
  `date_granted` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_scholarship`
--

INSERT INTO `tbl_scholarship` (`scholarship_id`, `trainee_id`, `scholarship_name`, `amount`, `sponsor`, `date_granted`) VALUES
(6, 5, 'STEP', NULL, NULL, '2026-01-27'),
(8, 7, 'TWSP', NULL, NULL, '2026-01-29');

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

--
-- Dumping data for table `tbl_task_sheet_submissions`
--

INSERT INTO `tbl_task_sheet_submissions` (`submission_id`, `lesson_id`, `trainee_id`, `submitted_content`, `submission_date`, `grade`, `remarks`, `graded_by`, `grade_date`, `status`) VALUES
(1, 2, 5, '<div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_0\" style=\"background-color: rgb(248, 249, 250);\">\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\n        <strong class=\"field-label\" style=\"cursor: default; padding: 2px 5px; border: 1px dashed rgb(222, 226, 230); border-radius: 3px;\">Task Sheet 1.1</strong>\n        <div>\n            \n            \n            \n        </div>\n    </div>\n    <div class=\"field-content\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: default;\"><p data-start=\"168\" data-end=\"199\"><strong data-start=\"168\" data-end=\"178\">Title:</strong> Set Up CCTV cables</p></div>\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_1\" style=\"background-color: rgb(248, 249, 250);\">\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\n        <strong class=\"field-label\" style=\"cursor: default; padding: 2px 5px; border: 1px dashed rgb(222, 226, 230); border-radius: 3px;\"><span style=\"background-color: rgb(255, 255, 255);\">Performance Objective:</span></strong>\n        <div>\n            \n            \n            \n        </div>\n    </div>\n    <div class=\"field-content\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: default;\"><p data-start=\"201\" data-end=\"423\">Upon completion of this task, given the necessary tools, materials and equipment, the trainee will be able to correctly set up the closed-circuit television (CCTV) within 1 hour and 30 minutes.</p></div>\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_2\" style=\"background-color: rgb(248, 249, 250);\">\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\n        <strong class=\"field-label\" style=\"cursor: default; padding: 2px 5px; border: 1px dashed rgb(222, 226, 230); border-radius: 3px;\">Supplies/Materials:</strong>\n        <div>\n            \n            \n            \n        </div>\n    </div>\n    <div class=\"field-content\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: default;\"><ul data-start=\"451\" data-end=\"532\"><li data-start=\"451\" data-end=\"493\"><p data-start=\"453\" data-end=\"493\">CCTV components (Monitor, Camera, DVR)</p></li><li data-start=\"494\" data-end=\"532\"><p data-start=\"496\" data-end=\"532\">Mounting hardware (screws, brackets)</p></li></ul></div>\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_3\" style=\"background-color: rgb(248, 249, 250);\">\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\n        <strong class=\"field-label\" style=\"cursor: default; padding: 2px 5px; border: 1px dashed rgb(222, 226, 230); border-radius: 3px;\">Equipment:</strong>\n        <div>\n            \n            \n            \n        </div>\n    </div>\n    <div class=\"field-content\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: default;\"><ul data-start=\"551\" data-end=\"623\"><li data-start=\"551\" data-end=\"590\"><p data-start=\"553\" data-end=\"590\">Screwdrivers (flathead and Philips)</p></li><li data-start=\"591\" data-end=\"623\"><p data-start=\"593\" data-end=\"623\">Pliers (optional for mounting)</p></li></ul></div>\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_4\" style=\"background-color: rgb(248, 249, 250);\">\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\n        <strong class=\"field-label\" style=\"cursor: default; padding: 2px 5px; border: 1px dashed rgb(222, 226, 230); border-radius: 3px;\">Steps/Procedures:</strong>\n        <div>\n            \n            \n            \n        </div>\n    </div>\n    <div class=\"field-content\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: default;\"><ol data-start=\"649\" data-end=\"1068\"><li data-start=\"649\" data-end=\"680\"><p data-start=\"652\" data-end=\"680\">Gather required materials.</p></li><li data-start=\"681\" data-end=\"700\"><p data-start=\"684\" data-end=\"700\">Mount cameras.</p></li><li data-start=\"701\" data-end=\"746\"><p data-start=\"704\" data-end=\"746\">Connect the power supply to each camera.</p></li><li data-start=\"747\" data-end=\"794\"><p data-start=\"750\" data-end=\"794\">Connect the video cables from the cameras.</p></li><li data-start=\"795\" data-end=\"840\"><p data-start=\"798\" data-end=\"840\">Connect the video cables to the DVR/NVR.</p></li><li data-start=\"841\" data-end=\"900\"><p data-start=\"844\" data-end=\"900\">Connect the VGA cable from the DVR/NVR to the monitor.</p></li><li data-start=\"901\" data-end=\"941\"><p data-start=\"904\" data-end=\"941\">Connect the power cable to the DVR.</p></li><li data-start=\"942\" data-end=\"986\"><p data-start=\"945\" data-end=\"986\">Connect the power cable to the monitor.</p></li><li data-start=\"987\" data-end=\"1041\"><p data-start=\"990\" data-end=\"1041\">Test the camera feed and adjust angles as needed.</p></li><li data-start=\"1042\" data-end=\"1068\"><p data-start=\"1046\" data-end=\"1068\">Finalize installation.</p></li></ol></div>\n</div><div class=\"custom-field-block mb-3 p-3 border rounded\" id=\"field_5\" style=\"background-color: rgb(248, 249, 250);\">\n    <div class=\"d-flex justify-content-between align-items-center mb-2\">\n        <strong class=\"field-label\" style=\"cursor: default; padding: 2px 5px; border: 1px dashed rgb(222, 226, 230); border-radius: 3px;\"><span style=\"background-color: rgb(255, 255, 255);\">Assessment Method:</span></strong>\n        <div>\n            \n            \n            \n        </div>\n    </div>\n    <div class=\"field-content\" style=\"min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: default;\">DEMONSTRATION</div>\n</div><div class=\"custom-field-block mb-3 p-3 border rounded bg-white\">\n        <div class=\"d-flex justify-content-between align-items-center mb-2\">\n            <strong class=\"field-label\" style=\"cursor: default; border: 1px dashed rgb(222, 226, 230); padding: 0px 5px;\">Performance Criteria Checklist 1.1</strong>\n            <div>\n                \n                \n                \n                \n            </div>\n        </div>\n        <div class=\"table-responsive\">\n            <table class=\"table table-bordered mb-0\" id=\"table_1769658321809\" style=\"background-color: white;\">\n                <thead>\n                    <tr>\n                        <th><span>Criteria</span> </th>\n                        \n                        <th style=\"text-align: center; width: 50px;\"><span>Yes</span> </th><th style=\"text-align: center; width: 50px;\"><span>No</span> </th><th class=\"table-actions-header\" style=\"width: 1%;\">Actions</th>\n                    </tr>\n                </thead>\n                <tbody>\n                    <tr>\n                        <td><div>1. Gather required materials.</div></td>\n                        \n                        <td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\" checked=\"checked\"></td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\"></td><td class=\"text-center\"></td>\n                    </tr>\n                <tr><td>2. Mount cameras.</td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\" checked=\"checked\"></td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\"></td><td class=\"text-center\"></td></tr><tr><td>3. Connect the power supply to each camera.</td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\" checked=\"checked\"></td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\"></td><td class=\"text-center\"></td></tr><tr><td>4. Connect the video cables from the cameras.</td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\" checked=\"checked\"></td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\"></td><td class=\"text-center\"></td></tr><tr><td>5. Connect the video cables to the DVR/NVR.</td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\" checked=\"checked\"></td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\"></td><td class=\"text-center\"></td></tr><tr><td>6. Connect the VGA cable from the DVR/NVR to the monitor.</td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\" checked=\"checked\"></td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\"></td><td class=\"text-center\"></td></tr><tr><td>7. Connect the power cable to the DVR.</td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\" checked=\"checked\"></td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\"></td><td class=\"text-center\"></td></tr><tr><td>8. Connect the power cable to the monitor.</td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\" checked=\"checked\"></td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\"></td><td class=\"text-center\"></td></tr><tr><td>9. Test the camera feed and adjust angles as needed.</td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\" checked=\"checked\"></td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\"></td><td class=\"text-center\"></td></tr><tr><td>10. Finalize installation.</td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\" checked=\"checked\"></td><td style=\"text-align: center;\"><input type=\"checkbox\" class=\"form-check-input\" style=\"cursor: default;\"></td><td class=\"text-center\"></td></tr></tbody>\n            </table>\n        </div>\n    </div>', '2026-01-29 03:59:12', NULL, NULL, NULL, NULL, 'submitted');

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
(1, 1, 'admin', '$2y$10$Vsq9xQNQ.nmTxYIPKE3jauARXhMCyaPUMBBEdU6dXDHhJv4.iUxIG', 'admin@technical.com', 'active', '2025-12-22 11:20:13'),
(10, 2, 'Juan', '$2y$10$pVNvO.T.Ealmtuc6buthQO8/Vy1IRUKqKcpNXwWkgTYus4EM3Obuu', 'juan@gmail.com', 'active', '2026-01-11 19:21:40'),
(12, 3, 'christian', '$2y$10$wOZkw1UgPw7CU01o3bhXveyEEsKOTQCk0goZ1264X.jXb2FXLV6Ue', 'christiandaveboncales@gmail.com', 'active', '2026-01-27 23:41:57'),
(13, 4, 'John', '$2y$10$tPBRgYwLmD7yw5NPGEkHx.cCGF0kAGui0oO9gSaWQqnDTzf1a9TEy', 'john@gmail.com', 'active', '2026-01-27 23:50:16'),
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
  ADD KEY `fk_batch_trainer` (`trainer_id`);

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
  MODIFY `activity_log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

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
  MODIFY `lesson_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
-- AUTO_INCREMENT for table `tbl_quiz_options`
--
ALTER TABLE `tbl_quiz_options`
  MODIFY `option_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=666;

--
-- AUTO_INCREMENT for table `tbl_quiz_questions`
--
ALTER TABLE `tbl_quiz_questions`
  MODIFY `question_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=223;

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
-- AUTO_INCREMENT for table `tbl_task_sheet_submissions`
--
ALTER TABLE `tbl_task_sheet_submissions`
  MODIFY `submission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
  ADD CONSTRAINT `tbl_scholarship_ibfk_1` FOREIGN KEY (`trainee_id`) REFERENCES `tbl_trainee_hdr` (`trainee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
