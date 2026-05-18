-- Rollback script for add_permissions.sql
-- This removes all permissions and role assignments added by add_permissions.sql

-- Remove role_permission assignments
DELETE FROM tbl_role_permissions 
WHERE permission_id IN (
    SELECT permission_id FROM tbl_permissions 
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
);

-- Remove permissions
DELETE FROM tbl_permissions 
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
);
