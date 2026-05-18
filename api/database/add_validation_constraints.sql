-- Add Database-Level Validation Constraints
-- This script adds CHECK constraints, UNIQUE constraints, and other validation at the database level

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- tbl_users validation constraints
-- ============================================

-- Ensure username only contains alphanumeric characters and underscores
ALTER TABLE tbl_users 
ADD CONSTRAINT chk_username_format 
CHECK (username REGEXP '^[a-zA-Z0-9_]+$');

-- Ensure email is valid format
ALTER TABLE tbl_users 
ADD CONSTRAINT chk_email_format 
CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure status is valid
ALTER TABLE tbl_users 
ADD CONSTRAINT chk_user_status 
CHECK (status IN ('active', 'inactive', 'suspended'));

-- ============================================
-- tbl_trainee_hdr validation constraints
-- ============================================

-- Ensure phone number is numeric and valid length (11 digits for PH)
ALTER TABLE tbl_trainee_hdr 
ADD CONSTRAINT chk_phone_format 
CHECK (phone_number REGEXP '^[0-9]{11}$' OR phone_number IS NULL);

-- Ensure trainee status is valid
ALTER TABLE tbl_trainee_hdr 
ADD CONSTRAINT chk_trainee_status 
CHECK (status IN ('active', 'inactive', 'pending', 'graduated', 'dropped'));

-- ============================================
-- tbl_trainer validation constraints
-- ============================================

-- Ensure trainer phone is valid
ALTER TABLE tbl_trainer 
ADD CONSTRAINT chk_trainer_phone_format 
CHECK (phone_number REGEXP '^[0-9]{11}$' OR phone_number IS NULL);

-- ============================================
-- tbl_batch validation constraints
-- ============================================

-- Ensure max_trainees is positive
ALTER TABLE tbl_batch 
ADD CONSTRAINT chk_batch_max_trainees 
CHECK (max_trainees > 0);

-- Ensure batch status is valid
ALTER TABLE tbl_batch 
ADD CONSTRAINT chk_batch_status 
CHECK (status IN ('open', 'closed', 'ongoing', 'completed'));

-- Ensure start_date is before end_date
ALTER TABLE tbl_batch 
ADD CONSTRAINT chk_batch_dates 
CHECK (start_date < end_date);

-- ============================================
-- tbl_enrollment validation constraints
-- ============================================

-- Ensure enrollment status is valid
ALTER TABLE tbl_enrollment 
ADD CONSTRAINT chk_enrollment_status 
CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'qualified', 'unqualified', 'reserved'));

-- ============================================
-- tbl_grades validation constraints
-- ============================================

-- Ensure score is between 0 and 100
ALTER TABLE tbl_grades 
ADD CONSTRAINT chk_grade_score 
CHECK (score >= 0 AND score <= 100);

-- ============================================
-- tbl_test validation constraints
-- ============================================

-- Ensure max_score is positive
ALTER TABLE tbl_test 
ADD CONSTRAINT chk_test_max_score 
CHECK (max_score > 0);

-- Ensure deadline is in the future when set
ALTER TABLE tbl_test 
ADD CONSTRAINT chk_test_deadline 
CHECK (deadline IS NULL OR deadline > NOW());

-- ============================================
-- tbl_qualifications validation constraints
-- ============================================

-- Ensure duration is positive
ALTER TABLE tbl_qualifications 
ADD CONSTRAINT chk_qualification_duration 
CHECK (duration > 0 OR duration IS NULL);

-- Ensure training_cost is non-negative
ALTER TABLE tbl_qualifications 
ADD CONSTRAINT chk_qualification_cost 
CHECK (training_cost >= 0 OR training_cost IS NULL);

-- Ensure allowance is non-negative
ALTER TABLE tbl_qualifications 
ADD CONSTRAINT chk_qualification_allowance 
CHECK (allowance >= 0 OR allowance IS NULL);

-- ============================================
-- UNIQUE constraints to prevent duplicates
-- ============================================

-- Ensure trainee school_id is unique per trainee
ALTER TABLE tbl_trainee_hdr 
ADD UNIQUE INDEX uk_trainee_school_id (trainee_school_id);

-- Ensure batch name is unique
ALTER TABLE tbl_batch 
ADD UNIQUE INDEX uk_batch_name (batch_name);

-- Ensure qualification CTPR number is unique
ALTER TABLE tbl_qualifications 
ADD UNIQUE INDEX uk_ctpr_number (ctpr_number);

-- ============================================
-- Add indexes for performance
-- ============================================

-- Index on user email for faster lookups
CREATE INDEX idx_user_email ON tbl_users(email);

-- Index on trainee status
CREATE INDEX idx_trainee_status ON tbl_trainee_hdr(status);

-- Index on batch status for filtering
CREATE INDEX idx_batch_status ON tbl_batch(status);

-- Index on enrollment status
CREATE INDEX idx_enrollment_status ON tbl_enrollment(status);

-- Index on grades for trainee
CREATE INDEX idx_grade_trainee ON tbl_grades(trainee_id);

-- Index on test lesson for faster lookup
CREATE INDEX idx_test_lesson ON tbl_test(lesson_id);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- Triggers for additional validation
-- ============================================

DELIMITER $$

-- Trigger to prevent batch from being closed if it has active enrollments
CREATE TRIGGER trg_batch_before_close
BEFORE UPDATE ON tbl_batch
FOR EACH ROW
BEGIN
    IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
        SELECT COUNT(*) INTO @active_count 
        FROM tbl_enrollment 
        WHERE batch_id = NEW.batch_id 
        AND status IN ('enrolled', 'approved');
        
        IF @active_count > 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Cannot close batch with active enrollments';
        END IF;
    END IF;
END$$

-- Trigger to ensure trainee school ID follows format
CREATE TRIGGER trg_trainee_school_id_format
BEFORE INSERT ON tbl_trainee_hdr
FOR EACH ROW
BEGIN
    IF NEW.trainee_school_id IS NOT NULL AND NEW.trainee_school_id NOT REGEXP '^[A-Z]{2}-[0-9]{4}-[0-9]{4}$' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Trainee school ID must follow format: XX-YYYY-YYYY';
    END IF;
END$$

-- Trigger to prevent deleting a trainer with active batches
CREATE TRIGGER trg_trainer_before_delete
BEFORE DELETE ON tbl_trainer
FOR EACH ROW
BEGIN
    DECLARE batch_count INT;
    SELECT COUNT(*) INTO batch_count 
    FROM tbl_batch 
    WHERE trainer_id = OLD.trainer_id 
    AND status IN ('open', 'ongoing');
    
    IF batch_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot delete trainer with active batches';
    END IF;
END$$

DELIMITER ;
    WHERE trainer_id = OLD.trainer_id 
    AND status IN ('open', 'ongoing');
    
    IF batch_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot delete trainer with active batches';
    END IF;
END$$

DELIMITER ;
