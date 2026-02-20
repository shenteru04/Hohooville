# User Archive vs Inactive - Workflow Guide

## Overview
The system now distinguishes between two states: **ARCHIVE** and **INACTIVE**

### State Definitions

#### 1. **ARCHIVED** Users
- **Location**: Visible ONLY in **System Settings > User Archival > Archived Trainers/Trainees**
- **Trigger**: Clicking "Archive" button in User Management
- **Database**: `is_archived = 1`
- **Recovery**: ONLY via System Settings "Unarchive" button
- **Cannot Edit**: Archived users cannot be edited in User Management
- **Audit Trail**: Tracks `archived_at` timestamp and `archived_by` admin ID
- **Purpose**: Permanently remove from active management

#### 2. **INACTIVE** Users
- **Location**: Visible in **User Management** page under "Inactive Users" tab
- **Trigger**: Changing Status dropdown to "Inactive" during edit
- **Database**: `status = 'inactive'`, `is_archived = 0`
- **Recovery**: Change status back to "Active" in User Management
- **Can Edit**: Yes, inactive users can still be edited in User Management
- **Audit Trail**: None (just status change)
- **Purpose**: Temporarily disable user without removing from management

---

## Workflow Comparison

### Flow 1: Archive a User (Hard Remove from Management)
```
1. Go to User Management
2. Find user and click "Archive" button
3. Confirm action
4. User moved to is_archived = 1
5. User disappears from User Management
6. User appears in System Settings > Archived Trainers/Trainees
7. To recover: Go to System Settings and click "Unarchive"
```

### Flow 2: Deactivate a User (Soft Disable)
```
1. Go to User Management
2. Find active user and click "Edit"
3. Change Status dropdown to "Inactive"
4. Click "Save User"
5. User remains in User Management under Inactive Users tab
6. status = 'inactive', is_archived = 0
7. Can still edit and reactivate from User Management
8. Also visible in System Settings > Inactive Users (read-only)
```

---

## Database Schema

```sql
-- Archive tracking columns in tbl_users
is_archived TINYINT(1) DEFAULT 0     -- 0: Not archived, 1: Archived
archived_at DATETIME DEFAULT NULL     -- When archive occurred
archived_by INT(11) DEFAULT NULL      -- Admin who archived (FK to tbl_users)

-- Existing status column
status ENUM('active', 'inactive') 
```

### Query Examples

**Find Active Users (Normal Management)**
```sql
SELECT * FROM tbl_users 
WHERE is_archived = 0 AND status = 'active';
```

**Find Inactive Users (Can Edit)**
```sql
SELECT * FROM tbl_users 
WHERE is_archived = 0 AND status = 'inactive';
```

**Find Archived Users (Recovery Only)**
```sql
SELECT * FROM tbl_users 
WHERE is_archived = 1;
```

---

## API Endpoints

### Archive User
**URL**: `/api/role/admin/user_management.php?action=archive&id={id}`
**Method**: GET
**Effect**: Sets `is_archived = 1`, removes from User Management
**Recovery**: Via `?action=reactivate` (opposite of this)

### Set Inactive (from User Management Edit)
**URL**: `/api/role/admin/user_management.php?action=update`
**Method**: POST
**Effect**: Sets `status = 'inactive'`, keeps `is_archived = 0`
**Recovery**: Edit again and set `status = 'active'`

### Reactivate Archived User
**URL**: `/api/role/admin/user_management.php?action=reactivate&id={id}`
**Method**: GET
**Effect**: Sets `is_archived = 0`, adds back to User Management
**Note**: User's status remains as it was

---

## UI Locations

| Action | Location | Button | Visibility |
|--------|----------|--------|------------|
| **Archive** | User Management | Red "Archive" button | Active users only |
| **Inactive** | User Management Edit | Status dropdown | When editing |
| **Unarchive** | System Settings > Archived section | Green "Unarchive" button | Archived users only |
| **Edit Inactive** | User Management > Inactive tab | Blue "Edit" button | Inactive users only |

---

## Migration Steps

If upgrading existing system:

```sql
-- Apply migration
source api/database/archive_feature_migration.sql;

-- Verify new columns
SHOW COLUMNS FROM tbl_users LIKE 'is_archived';
SHOW COLUMNS FROM tbl_users LIKE 'archived%';

-- Set all existing users as not archived
UPDATE tbl_users SET is_archived = 0 WHERE is_archived IS NULL;
```

---

## Key Features

✅ **Two-Level User Management**
- Inactive: Temporary disable, still editable
- Archived: Permanent removal, only recoverable from System Settings

✅ **Audit Trail**
- Track who archived and when
- Complete history for compliance

✅ **Data Retention**
- No data deleted, only flagged
- Can restore archived users anytime
- Related records (grades, enrollments) remain intact

✅ **Clear Separation**
- User Management: Active + Inactive users
- System Settings: Archived users (recovery)

---

## Best Practices

1. **Archive**: Use when removing trainer/trainee after course completion
2. **Inactive**: Use when temporarily disabling user access
3. **Regular Review**: Check System Settings > Archived section periodically
4. **Documentation**: Note reason in any audit logs when archiving
5. **Recovery Planning**: Have a process for unarchiving users if needed

---

## Troubleshooting

**Q: User is archived but I need to edit it**
A: Unarchive from System Settings first, then edit in User Management

**Q: Can I search archived users in User Management?**
A: No, archived users only appear in System Settings > Archived section

**Q: What's the difference between Archive and setting to Inactive?**
A: Archive removes from User Management entirely. Inactive keeps them there for editing.

**Q: Can I bulk archive users?**
A: Not yet, archive one user at a time via the Archive button

**Q: Are archived users included in reports?**
A: Depends on the report. Most reports exclude archived users by filtering on is_archived = 0
