-- Migration: Create tbl_employee table for admin and registrar profile data
-- Date: 2026-04-17
-- Purpose: Standardize employee (admin/registrar) data storage similar to tbl_trainer and tbl_trainee_hdr

CREATE TABLE IF NOT EXISTS tbl_employee (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(150),
    phone_number VARCHAR(20),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);

-- Optional: Migrate existing admin/registrar data from tbl_users to tbl_employee
-- This assumes you want to preserve existing data
INSERT IGNORE INTO tbl_employee (user_id, first_name, last_name, email, phone_number, status)
SELECT 
    u.user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    CASE WHEN u.status = 'active' THEN 'active' ELSE 'inactive' END
FROM tbl_users u
LEFT JOIN tbl_role r ON u.role_id = r.role_id
WHERE r.role_name IN ('admin', 'registrar')
AND NOT EXISTS (
    SELECT 1 FROM tbl_employee e WHERE e.user_id = u.user_id
);
