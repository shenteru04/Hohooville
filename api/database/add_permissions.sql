-- Add standard granular permissions for the system
-- These permissions will be used by the PermissionChecker class

-- User Management Permissions
INSERT INTO tbl_permissions (permission_name, resource, action, description, created_at) VALUES
('users.view', 'users', 'view', 'View user list and details', NOW()),
('users.create', 'users', 'create', 'Create new users', NOW()),
('users.edit', 'users', 'edit', 'Edit user information', NOW()),
('users.delete', 'users', 'delete', 'Delete or deactivate users', NOW()),
('users.permissions', 'users', 'permissions', 'Manage user permissions', NOW());

-- Trainee Management Permissions
INSERT INTO tbl_permissions (permission_name, resource, action, description, created_at) VALUES
('trainees.view', 'trainees', 'view', 'View trainee list and details', NOW()),
('trainees.create', 'trainees', 'create', 'Create new trainees', NOW()),
('trainees.edit', 'trainees', 'edit', 'Edit trainee information', NOW()),
('trainees.delete', 'trainees', 'delete', 'Delete or deactivate trainees', NOW()),
('trainees.approve', 'trainees', 'approve', 'Approve trainee applications', NOW());

-- Trainer Management Permissions
INSERT INTO tbl_permissions (permission_name, resource, action, description, created_at) VALUES
('trainers.view', 'trainers', 'view', 'View trainer list and details', NOW()),
('trainers.create', 'trainers', 'create', 'Create new trainers', NOW()),
('trainers.edit', 'trainers', 'edit', 'Edit trainer information', NOW()),
('trainers.delete', 'trainers', 'delete', 'Delete or deactivate trainers', NOW());

-- Batch Management Permissions
INSERT INTO tbl_permissions (permission_name, resource, action, description, created_at) VALUES
('batches.view', 'batches', 'view', 'View batch list and details', NOW()),
('batches.create', 'batches', 'create', 'Create new batches', NOW()),
('batches.edit', 'batches', 'edit', 'Edit batch information', NOW()),
('batches.delete', 'batches', 'delete', 'Delete or close batches', NOW()),
('batches.manage', 'batches', 'manage', 'Manage batch enrollments', NOW());

-- Qualification/Course Management Permissions
INSERT INTO tbl_permissions (permission_name, resource, action, description, created_at) VALUES
('qualifications.view', 'qualifications', 'view', 'View qualifications and courses', NOW()),
('qualifications.create', 'qualifications', 'create', 'Create new qualifications', NOW()),
('qualifications.edit', 'qualifications', 'edit', 'Edit qualification information', NOW()),
('qualifications.delete', 'qualifications', 'delete', 'Delete qualifications', NOW());

-- Grading Permissions
INSERT INTO tbl_permissions (permission_name, resource, action, description, created_at) VALUES
('grades.view', 'grades', 'view', 'View grades', NOW()),
('grades.create', 'grades', 'create', 'Create and submit grades', NOW()),
('grades.edit', 'grades', 'edit', 'Edit grades', NOW()),
('grades.approve', 'grades', 'approve', 'Approve grades', NOW());

-- Module/Lesson Management Permissions
INSERT INTO tbl_permissions (permission_name, resource, action, description, created_at) VALUES
('modules.view', 'modules', 'view', 'View modules and lessons', NOW()),
('modules.create', 'modules', 'create', 'Create new modules and lessons', NOW()),
('modules.edit', 'modules', 'edit', 'Edit module and lesson content', NOW()),
('modules.delete', 'modules', 'delete', 'Delete modules and lessons', NOW()),
('modules.publish', 'modules', 'publish', 'Publish modules to trainees', NOW());

-- Attendance Permissions
INSERT INTO tbl_permissions (permission_name, resource, action, description, created_at) VALUES
('attendance.view', 'attendance', 'view', 'View attendance records', NOW()),
('attendance.create', 'attendance', 'create', 'Create attendance records', NOW()),
('attendance.edit', 'attendance', 'edit', 'Edit attendance records', NOW());

-- Reports & Analytics Permissions
INSERT INTO tbl_permissions (permission_name, resource, action, description, created_at) VALUES
('reports.view', 'reports', 'view', 'View system reports', NOW()),
('reports.export', 'reports', 'export', 'Export reports', NOW()),
('analytics.view', 'analytics', 'view', 'View analytics and charts', NOW());

-- System Settings Permissions
INSERT INTO tbl_permissions (permission_name, resource, action, description, created_at) VALUES
('settings.view', 'settings', 'view', 'View system settings', NOW()),
('settings.edit', 'settings', 'edit', 'Edit system settings', NOW()),
('settings.system', 'settings', 'system', 'System-level configuration', NOW());

-- Assign permissions to Admin role (role_id = 1) - Full access
INSERT INTO tbl_role_permissions (role_id, permission_id)
SELECT 1, permission_id FROM tbl_permissions 
WHERE permission_name IN (
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.permissions',
    'trainees.view', 'trainees.create', 'trainees.edit', 'trainees.delete', 'trainees.approve',
    'trainers.view', 'trainers.create', 'trainers.edit', 'trainers.delete',
    'batches.view', 'batches.create', 'batches.edit', 'batches.delete', 'batches.manage',
    'qualifications.view', 'qualifications.create', 'qualifications.edit', 'qualifications.delete',
    'grades.view', 'grades.create', 'grades.edit', 'grades.approve',
    'modules.view', 'modules.create', 'modules.edit', 'modules.delete', 'modules.publish',
    'attendance.view', 'attendance.create', 'attendance.edit',
    'reports.view', 'reports.export', 'analytics.view',
    'settings.view', 'settings.edit', 'settings.system'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Assign permissions to Registrar role (role_id = 4)
INSERT INTO tbl_role_permissions (role_id, permission_id)
SELECT 4, permission_id FROM tbl_permissions 
WHERE permission_name IN (
    'trainees.view', 'trainees.create', 'trainees.edit', 'trainees.approve',
    'trainers.view',
    'batches.view', 'batches.manage',
    'qualifications.view',
    'reports.view', 'reports.export'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Assign permissions to Trainer role (role_id = 2)
INSERT INTO tbl_role_permissions (role_id, permission_id)
SELECT 2, permission_id FROM tbl_permissions 
WHERE permission_name IN (
    'trainees.view',
    'grades.view', 'grades.create', 'grades.edit',
    'modules.view',
    'attendance.view', 'attendance.create', 'attendance.edit',
    'reports.view'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Assign permissions to Trainee role (role_id = 3)
INSERT INTO tbl_role_permissions (role_id, permission_id)
SELECT 3, permission_id FROM tbl_permissions 
WHERE permission_name IN (
    'modules.view',
    'grades.view',
    'attendance.view'
)
ON DUPLICATE KEY UPDATE role_id = role_id;
