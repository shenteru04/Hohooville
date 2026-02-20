# User Archive Feature Implementation

## Overview
Replaced hard delete functionality with soft delete (archive) to retain user data while marking them as inactive.

## Changes Made

### 1. **Database Schema (Optional but Recommended)**
- **File**: `api/database/archive_feature_migration.sql`
- **Changes**:
  - Added `archived_at` (DATETIME) - timestamp of when user was archived
  - Added `archived_by` (INT) - reference to admin user who archived
  - Added index `idx_status_archived` for faster queries
  
**To apply the migration:**
```sql
use technical_db;
source api/database/archive_feature_migration.sql;
```

**Note**: The existing `status` field (active/inactive) is used for the primary archive functionality. The additional columns are for audit trails.

### 2. **Backend API Changes**
- **File**: `api/role/admin/user_management.php`
- **What changed**:
  - Renamed `deleteUser()` to `archiveUser()`
  - Changed from `DELETE` query to `UPDATE` query
  - Sets user status to `'inactive'` instead of removing the record
  - Added check to prevent archiving already-archived users
  - Provides success message: "User archived successfully. Data retained."
  - Changed action route from `?action=delete` to `?action=archive`

### 3. **Frontend UI Changes**
- **File**: `frontend/html/admin/pages/user_management.html`
- **File**: `frontend/js/admin/pages/user_management.js`
- **What changed**:
  - Changed button icon from trash `fa-trash` to archive `fa-archive`
  - Changed button color from red danger to red danger (same for visibility)
  - Changed button text from "Delete" to "Archive"
  - Updated button title to "Archive this user"
  - Added conditional rendering:
    - Active users: Show "Archive" button
    - Inactive (archived) users: Show "Archived" badge instead of button
  - Disabled Edit button for archived users
  - Updated confirmation dialog message to clarify data retention

### 4. **Functional Behavior**
- **Archive Process**:
  1. User clicks "Archive" button
  2. Confirmation dialog appears with message about data retention
  3. User status changes to `'inactive'` in database
  4. User data remains intact for future reference or restoration
  5. Success alert displays: "User archived successfully! Data has been retained."
  6. Table refreshes showing updated user status

## Data Retention Benefits

✅ **Compliance**: Meet data retention regulations  
✅ **Recovery**: Can restore archived users if needed  
✅ **Audit Trail**: Track who was archived and when (if using migration)  
✅ **Historical Data**: Activity logs remain linked to user  
✅ **Reversible**: Easy to reactivate users later  

## Database Query Reference

### Find Archived Users
```sql
SELECT * FROM tbl_users WHERE status = 'inactive';
```

### Reactivate an Archived User
```sql
UPDATE tbl_users SET status = 'active' WHERE user_id = [user_id];
```

### Find Who Archived a User
```sql
SELECT u.user_id, u.username, u.status, u.archived_at, 
       a.username AS archived_by_user
FROM tbl_users u
LEFT JOIN tbl_users a ON u.archived_by = a.user_id
WHERE u.status = 'inactive'
ORDER BY u.archived_at DESC;
```

## User Management Tab Features

Each role tab (Admin, Trainer, Trainee, Registrar) now displays:
- **Active Users**: Full editing and archiving capabilities
- **Archived Users**: Display-only with "Archived" badge
- **Independent Pagination**: Per-role user management

## Technical Notes

- Archive is immediate and applied to current session
- Archived users remain visible in the system for reference
- Edit functionality is disabled for archived users
- Role-based filtering continues to work on both active and inactive users
- All related records (enrollments, grades, activity logs) remain linked

## Rollback Instructions

If you need to restore hard delete functionality:
1. Revert the API `archiveUser()` function to `deleteUser()` with DELETE query
2. Update HTML/JS button back to "Delete"
3. Update confirmation message

**Alternatively**, run the rollback script from the migration file:
```sql
ALTER TABLE `tbl_users` 
DROP FOREIGN KEY `fk_archived_by`,
DROP COLUMN `archived_at`,
DROP COLUMN `archived_by`,
DROP INDEX `idx_status_archived`;
```
