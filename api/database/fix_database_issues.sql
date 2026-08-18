-- ============================================================
-- Database Cleanup & Fixes Based on Audit Report
-- Date: 2026-08-17
-- Purpose: Fix CRITICAL, HIGH, and MEDIUM priority issues
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- ============================================================
-- ISSUE #1 (CRITICAL): Fix trainer_type ENUM Mismatch
-- Problem: ENUM values mismatch between db definition and code
-- Current (wrong): ENUM('part-time', 'full-time') with hyphens
-- Should be: ENUM('part timer', 'full timer') with spaces (matching code)
-- ============================================================

-- Check current trainers table structure
SHOW CREATE TABLE `tbl_trainers`;

-- If trainer_type exists, update it to match code expectations:
-- ALTER TABLE `tbl_trainers` MODIFY `trainer_type` ENUM('part timer', 'full timer') DEFAULT 'full timer';


-- ============================================================
-- ISSUE #2 (HIGH): Clean up schedule_requests references
-- Problem: Frontend expects schedule_requests in API responses but table was deleted
-- Solution: Frontend has been updated to remove all schedule_requests tabs/modals
-- This is cleanup to ensure no leftover data conflicts
-- ============================================================

-- If tbl_schedule_requests still exists, ensure it's fully removed:
-- DROP TABLE IF EXISTS `tbl_schedule_requests`;

-- Verify that registrar/schedule.php backend no longer returns schedule_requests in API response
-- (Already cleaned up in backend - no changes needed here)


-- ============================================================
-- ISSUE #3 (MEDIUM): Standardize Field Naming Convention
-- Problem: Some endpoints return 'course_name', others return 'qualification_name'
-- Solution: Use consistent 'qualification_name' across all endpoints
-- Files affected: registrar/qualifications.php, registrar/batches.php, registrar/reports.php
-- ============================================================

-- No database changes needed - this is an API-level fix
-- Backend has been updated to return consistent field names


-- ============================================================
-- ISSUE #4 (MEDIUM): Ensure tbl_nc_levels table exists
-- Problem: Multiple endpoints have exception handlers for missing tbl_nc_levels
-- Solution: Verify table exists and make it required (remove fallback queries)
-- ============================================================

-- Verify tbl_nc_levels exists
SHOW CREATE TABLE `tbl_nc_levels`;

-- If it doesn't exist, create it:
-- CREATE TABLE `tbl_nc_levels` (
--   `nc_level_id` int(11) NOT NULL,
--   `level_name` varchar(100) NOT NULL,
--   `description` text,
--   PRIMARY KEY (`nc_level_id`)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- ISSUE #5 (MEDIUM): Remove duplicate/conflicting fields
-- Problem: Some tables have redundant field definitions
-- Solution: Identify and remove obsolete columns
-- ============================================================

-- Check for duplicates in tbl_batch:
-- The 'training_cost' field should be the single source of truth
-- Verify no other cost-related fields exist

SHOW COLUMNS FROM `tbl_batch` LIKE '%cost%';
SHOW COLUMNS FROM `tbl_batch` LIKE '%price%';


-- ============================================================
-- VERIFICATION QUERIES (Run these to verify fixes)
-- ============================================================

-- Verify trainer_type ENUM values:
-- SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME='tbl_trainers' AND COLUMN_NAME='trainer_type';

-- Verify no schedule_requests table exists:
-- SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
-- WHERE TABLE_SCHEMA='technical_db' AND TABLE_NAME='tbl_schedule_requests';

-- Verify tbl_nc_levels exists:
-- SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
-- WHERE TABLE_SCHEMA='technical_db' AND TABLE_NAME='tbl_nc_levels';

-- ============================================================
-- COMMIT TRANSACTION
-- ============================================================
COMMIT;

-- ============================================================
-- NOTES:
-- 1. This file is a diagnostic/verification script
-- 2. Uncomment the ALTER/DROP/CREATE statements as needed based on your current schema
-- 3. The backend code has already been updated to match these expectations
-- 4. No data cleanup is needed - only schema alignment
-- ============================================================
