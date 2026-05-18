-- Rollback script for add_validation_constraints.sql
-- This removes all constraints, indexes, and triggers added by add_validation_constraints.sql

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- Drop Triggers
-- ============================================

DROP TRIGGER IF EXISTS trg_batch_before_close;
DROP TRIGGER IF EXISTS trg_trainee_school_id_format;
DROP TRIGGER IF EXISTS trg_trainer_before_delete;

-- ============================================
-- Drop Indexes
-- ============================================

DROP INDEX idx_user_email ON tbl_users;
DROP INDEX idx_trainee_status ON tbl_trainee_hdr;
DROP INDEX idx_batch_status ON tbl_batch;
DROP INDEX idx_enrollment_status ON tbl_enrollment;
DROP INDEX idx_grade_trainee ON tbl_grades;
DROP INDEX idx_test_lesson ON tbl_test;

-- ============================================
-- Drop UNIQUE Constraints
-- ============================================

ALTER TABLE tbl_trainee_hdr DROP INDEX uk_trainee_school_id;
ALTER TABLE tbl_batch DROP INDEX uk_batch_name;
ALTER TABLE tbl_qualifications DROP INDEX uk_ctpr_number;

-- ============================================
-- Drop CHECK Constraints
-- ============================================

-- tbl_users
ALTER TABLE tbl_users DROP CONSTRAINT chk_username_format;
ALTER TABLE tbl_users DROP CONSTRAINT chk_email_format;
ALTER TABLE tbl_users DROP CONSTRAINT chk_user_status;

-- tbl_trainee_hdr
ALTER TABLE tbl_trainee_hdr DROP CONSTRAINT chk_phone_format;
ALTER TABLE tbl_trainee_hdr DROP CONSTRAINT chk_trainee_status;

-- tbl_trainer
ALTER TABLE tbl_trainer DROP CONSTRAINT chk_trainer_phone_format;

-- tbl_batch
ALTER TABLE tbl_batch DROP CONSTRAINT chk_batch_max_trainees;
ALTER TABLE tbl_batch DROP CONSTRAINT chk_batch_status;
ALTER TABLE tbl_batch DROP CONSTRAINT chk_batch_dates;

-- tbl_enrollment
ALTER TABLE tbl_enrollment DROP CONSTRAINT chk_enrollment_status;

-- tbl_grades
ALTER TABLE tbl_grades DROP CONSTRAINT chk_grade_score;

-- tbl_test
ALTER TABLE tbl_test DROP CONSTRAINT chk_test_max_score;
ALTER TABLE tbl_test DROP CONSTRAINT chk_test_deadline;

-- tbl_qualifications
ALTER TABLE tbl_qualifications DROP CONSTRAINT chk_qualification_duration;
ALTER TABLE tbl_qualifications DROP CONSTRAINT chk_qualification_cost;
ALTER TABLE tbl_qualifications DROP CONSTRAINT chk_qualification_allowance;

SET FOREIGN_KEY_CHECKS = 1;
