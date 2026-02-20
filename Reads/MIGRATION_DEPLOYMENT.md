# Archive System - Migration & Deployment Guide

## Pre-Deployment Checklist

- [ ] Backed up database
- [ ] Tested archive functionality in development environment
- [ ] Verified all files are deployed correctly
- [ ] Ran migration script successfully
- [ ] Tested archive/unarchive workflows
- [ ] Verified performance with production-like data
- [ ] Documented any custom modifications

---

## Files to Deploy

### Backend Files
```
api/role/admin/user_management.php          [MODIFIED] - Archive logic
api/role/admin/user_archival.php            [MODIFIED] - Archived user retrieval
```

### Frontend Files
```
frontend/html/admin/pages/user_management.html         [MODIFIED] - Tab structure
frontend/html/admin/pages/system_settings.html         [MODIFIED] - Archived sections
frontend/js/admin/pages/user_management.js             [MODIFIED] - Archive handlers
frontend/js/admin/pages/system_settings.js             [MODIFIED] - Archival display
frontend/css/admin/sidebar.css                         [MODIFIED] - Tab styling
```

### Database Files
```
api/database/archive_feature_migration.sql  [NEW] - Schema changes
```

### Documentation
```
USER_ARCHIVE_WORKFLOW.md                    [NEW] - User guide
ARCHIVE_TECHNICAL_DOCS.md                   [NEW] - Technical reference
MIGRATION_DEPLOYMENT.md                     [NEW] - This file
```

---

## Database Migration

### Step 1: Backup Database
```bash
# Via command line
mysqldump -u root -p technical_db > technical_db_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Review Migration Script
**File**: `api/database/archive_feature_migration.sql`

**What it does**:
1. Adds 3 new columns to `tbl_users`
2. Creates 2 new indexes for performance
3. Adds foreign key constraint for audit trail
4. Sets defaults: `is_archived = 0` (all existing users not archived)

### Step 3: Execute Migration

**Option A: Command Line (Recommended)**
```bash
# Navigate to project root
cd /path/to/Hohoo-ville

# Connect and run
mysql -u root -p technical_db < api/database/archive_feature_migration.sql
```

**Option B: PHPMyAdmin**
1. Open PHPMyAdmin
2. Select database: `technical_db`
3. Go to "SQL" tab
4. Copy contents of `api/database/archive_feature_migration.sql`
5. Paste and click "Go"

**Option C: PHP CLI**
```php
<?php
$conn = new PDO('mysql:host=localhost;dbname=technical_db', 'root', 'password');
$sql = file_get_contents('api/database/archive_feature_migration.sql');
// Split by semicolons and execute each statement
$statements = explode(';', $sql);
foreach($statements as $statement) {
    if(trim($statement)) {
        $conn->exec($statement);
    }
}
?>
```

### Step 4: Verify Migration
```sql
-- Check columns exist
DESCRIBE tbl_users;

-- Should show:
-- id | Field | Type | Null | Key | Default | Extra
-- ... | is_archived | tinyint(1) | NO | MUL | 0 | 
-- ... | archived_at | datetime | YES | | NULL | 
-- ... | archived_by | int(11) | YES | MUL | NULL |

-- Check indexes exist
SHOW INDEX FROM tbl_users;

-- Should show:
-- idx_is_archived
-- idx_status_archived

-- Verify all users marked as not archived
SELECT COUNT(*) as total_users FROM tbl_users;
SELECT COUNT(*) as not_archived FROM tbl_users WHERE is_archived = 0;
-- Should be equal
```

### Step 5: Rollback Plan (If Needed)
```sql
-- If migration needs to be rolled back:
ALTER TABLE tbl_users DROP COLUMN is_archived;
ALTER TABLE tbl_users DROP COLUMN archived_at;
ALTER TABLE tbl_users DROP COLUMN archived_by;
DROP INDEX idx_is_archived ON tbl_users;
DROP INDEX idx_status_archived ON tbl_users;
```

---

## Post-Migration Testing

### Test 1: Archive User
1. Go to User Management
2. Find an admin user (safe test subject)
3. Click "Archive" button
4. Verify:
   - User disappears from User Management
   - User appears in System Settings > Archived section
   - `is_archived` = 1 in database

```sql
SELECT user_id, username, is_archived, archived_at, archived_by 
FROM tbl_users WHERE username = 'test_admin';
```

### Test 2: Unarchive User
1. Go to System Settings > Archived section
2. Click "Unarchive" button
3. Verify:
   - User disappears from archived section
   - User reappears in User Management
   - `is_archived` = 0 in database

### Test 3: Set User to Inactive
1. Go to User Management
2. Click "Edit" on active user
3. Change Status to "Inactive"
4. Click "Save User"
5. Verify:
   - User stays in User Management
   - User appears in "Inactive Users" tab
   - Status badge shows "Inactive"
   - User still editable

### Test 4: Reactivate Inactive User
1. In User Management, click Edit on inactive user
2. Change Status to "Active"
3. Click "Save User"
4. Verify:
   - User status changes to active
   - User remains editable

### Test 5: System Settings Display
1. Go to System Settings
2. User Archival section should show 3 tabs:
   - Inactive Users (from user_management which are status='inactive' and is_archived=0)
   - Archived Trainers (is_archived=1 and trainer role)
   - Archived Trainees (is_archived=1 and trainee role)
3. Verify counts match archives

---

## Performance Validation

### Query Performance Check
Execute these queries and note execution time:

```sql
-- Should be fast (uses idx_is_archived)
SELECT COUNT(*) FROM tbl_users WHERE is_archived = 0;

-- Verify index usage
EXPLAIN SELECT * FROM tbl_users WHERE is_archived = 0;
-- Should show: rows examined ≈ number of active users (not all users)

-- Check combined filter
EXPLAIN SELECT * FROM tbl_users WHERE status='inactive' AND is_archived=0;
-- Should use idx_status_archived
```

### Data Volume Test
If you have >10,000 users:
1. Archive 1,000 users
2. Check query response times in User Management
3. Should still be <1 second even with 9,000 active users

---

## Post-Deployment Verification

### Code Verification
- [ ] Archive button appears only for active users
- [ ] Archive button triggers API call correctly
- [ ] User disappears from tabs after archiving
- [ ] Unarchive button appears in System Settings
- [ ] Unarchive restores user to proper location
- [ ] Inactive tab shows only inactive non-archived users
- [ ] Edit button works for inactive users
- [ ] Tab switching doesn't show archived users

### Data Verification
- [ ] No users showing as archived if not explicitly archived
- [ ] All archived users have `is_archived = 1`
- [ ] All active/inactive users have `is_archived = 0`
- [ ] `archived_by` contains valid user IDs
- [ ] `archived_at` timestamps are reasonable

### API Verification
```bash
# Test archive endpoint
curl "http://localhost/api/role/admin/user_management.php?action=archive&id=5"

# Test reactivate endpoint
curl "http://localhost/api/role/admin/user_management.php?action=reactivate&id=5"

# Test list endpoint (should not include archived)
curl "http://localhost/api/role/admin/user_management.php?action=list" | grep is_archived
```

---

## Deployment Troubleshooting

### Issue: "Unknown column 'is_archived'" Error

**Cause**: Migration script not executed
**Solution**: 
1. Run migration script manually
2. Verify columns exist with `DESCRIBE tbl_users`

### Issue: Archived Users Still Visible in User Management

**Cause**: getUsers() filter not applied
**Solution**:
1. Check user_management.php updated correctly
2. Verify WHERE clause includes `is_archived = 0`
3. Clear browser cache
4. Restart PHP/Apache if needed

### Issue: Unarchive Button Not Working

**Cause**: API endpoint not responding
**Solution**:
1. Check API error logs
2. Verify `archived_by` has valid user_id
3. Ensure current admin is logged in
4. Check `reactivateUser()` function in PHP

### Issue: Performance Degradation

**Cause**: Indexes not created properly
**Solution**:
1. Verify indexes with `SHOW INDEX FROM tbl_users`
2. Recreate if missing: 
   ```sql
   CREATE INDEX idx_is_archived ON tbl_users(is_archived);
   CREATE INDEX idx_status_archived ON tbl_users(status, is_archived);
   ```

### Issue: Archived Users Not Showing in System Settings

**Cause**: API not returning archived users
**Solution**:
1. Check user_archival.php exists
2. Verify query filters `WHERE is_archived = 1`
3. Check test data: archive at least one user first

---

## Rollback Procedures

### If Major Issue Discovered

**Step 1: Stop** using the archive feature
**Step 2: Restore** database from backup
```bash
mysql -u root -p technical_db < technical_db_backup_YYYYMMDD_HHMMSS.sql
```

**Step 3: Revert** code changes (keep previous version deployed)

**Step 4: Investigate** issue before re-attempting

---

## Monitoring Post-Deployment

### Daily Checks (First Week)
- [ ] Archive functionality working
- [ ] No errors in browser console
- [ ] No errors in server logs (/var/log/apache2/error.log)
- [ ] Archive counts are reasonable

### Weekly Checks
- [ ] Page load times haven't increased
- [ ] Database size is as expected
- [ ] No duplicate archives
- [ ] Users satisfied with workflow

### SQL Monitoring Query
```sql
-- Total users breakdown
SELECT 
  (SELECT COUNT(*) FROM tbl_users) as total_users,
  (SELECT COUNT(*) FROM tbl_users WHERE is_archived=0) as active_users,
  (SELECT COUNT(*) FROM tbl_users WHERE is_archived=1) as archived_users,
  (SELECT COUNT(*) FROM tbl_users WHERE status='inactive' AND is_archived=0) as inactive_users;

-- Archives by admin
SELECT archived_by, COUNT(*) as archives_count
FROM tbl_users 
WHERE is_archived = 1 
GROUP BY archived_by;
```

---

## Version Control

### Marking Deployment Version
```bash
# Tag the deployment
git tag -a v2.3.0 -m "Deploy: Archive system implementation"
git push origin v2.3.0

# Note: Adjust version based on your versioning scheme
```

---

## User Communication

### Notification to Admins
Send email/message to all admins:

---

**Subject**: New Archive & Inactive User Feature Deployed

Dear Admins,

The user management system has been updated with new archive capabilities:

**Two Ways to Remove Users:**
1. **Archive** (permanent removal from User Management)
   - Use when trainer/trainee completes course or leaves permanently
   - Recoverable only from System Settings > User Archival
   - Cannot edit archived users in User Management

2. **Inactive** (temporary disable while keeping editable)
   - Use for temporary leave or access suspension
   - Users remain in User Management under "Inactive Users" tab
   - Users can be reactivated by changing status back to "Active"

**Key Locations:**
- Archive users: User Management > Click "Archive" button
- View archived: System Settings > User Archival > Archived sections
- Manage inactive: User Management > Inactive Users tab

**Questions?** Contact IT Support

---

## Post-Deployment Documentation

Create a record of:
- [ ] Migration date/time
- [ ] Who executed migration
- [ ] Number of users at time of migration
- [ ] Any issues encountered
- [ ] Performance baseline (query times, page loads)
- [ ] Backup location

---

## Success Criteria

Archive system is successfully deployed when:

✅ Archives button appears and works in User Management
✅ Archived users disappear from User Management tabs
✅ Archived users appear in System Settings archived sections
✅ Unarchive button restores users to User Management
✅ Inactive users remain visible and editable
✅ No performance degradation
✅ All API endpoints responding correctly
✅ Database has proper indexes
✅ No errors in browser console or server logs
✅ Admins can complete archive/unarchive workflows
