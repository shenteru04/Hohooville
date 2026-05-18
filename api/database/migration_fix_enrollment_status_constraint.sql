-- Migration: Fix enrollment status constraint to match the current application status flow
-- Date: 2026-04-20
-- Purpose: Align chk_enrollment_status with tbl_enrollment.status enum and app logic

ALTER TABLE `tbl_enrollment`
DROP CONSTRAINT `chk_enrollment_status`;

ALTER TABLE `tbl_enrollment`
ADD CONSTRAINT `chk_enrollment_status`
CHECK (`status` IN ('pending', 'approved', 'rejected', 'completed', 'qualified', 'unqualified', 'reserved'));
