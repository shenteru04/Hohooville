-- Migration: Add profile_image field to user profile tables
-- Date: 2026-04-18
-- Purpose: Enable profile image uploads for admin, registrar, trainer, and trainee roles

-- Add profile_image to tbl_employee (Admin & Registrar)
ALTER TABLE tbl_employee 
ADD COLUMN profile_image VARCHAR(255) NULL 
AFTER phone_number;

-- Add profile_image to tbl_trainer 
ALTER TABLE tbl_trainer 
ADD COLUMN profile_image VARCHAR(255) NULL 
AFTER tm_file;

-- Add profile_image to tbl_trainee_hdr (Note: trainee already has photo_file, but adding profile_image for consistency)
ALTER TABLE tbl_trainee_hdr 
ADD COLUMN profile_image VARCHAR(255) NULL 
AFTER photo_file;

-- Create a profiles index for faster queries
CREATE INDEX idx_profile_image ON tbl_employee(user_id);
CREATE INDEX idx_trainer_profile_image ON tbl_trainer(user_id);
CREATE INDEX idx_trainee_profile_image ON tbl_trainee_hdr(user_id);
