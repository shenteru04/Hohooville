# Archive System - QA Testing Specifications

## Test Environment Setup

### Prerequisites
- Backup of production database (or test database)
- Test user accounts in each role:
  - Admin: test_admin
  - Trainer: test_trainer
  - Trainee: test_trainee
  - Registrar: test_registrar
- All files deployed
- Migration script executed successfully
- Indexes verified: `idx_is_archived`, `idx_status_archived`

---

## Test Cases

### FEATURE 1: Archive User From User Management

#### TC-001: Archive Active Admin
**Preconditions**: Admin user with status='active', is_archived=0
**Steps**:
1. Navigate to User Management > Admin tab
2. Find admin user
3. Click "Archive" button
4. Confirm action

**Expected Results**:
- ✅ Archive button triggers
- ✅ Confirmation dialog appears
- ✅ User removed from Admin tab
- ✅ No user appears in any User Management tab
- ✅ Database: `is_archived=1`, `archived_by=current_admin_id`, `archived_at=NOW()`

**Test Data**:
```sql
-- Check before archive
SELECT user_id, username, status, is_archived FROM tbl_users WHERE username='test_admin';

-- After archive, should show is_archived=1
SELECT user_id, username, status, is_archived FROM tbl_users WHERE username='test_admin';
```

#### TC-002: Archive Active Trainer
**Preconditions**: Trainer user with status='active'
**Steps**: Same as TC-001 but in Trainer tab
**Expected Results**: Same, user disappears from Trainer tab

#### TC-003: Archive Active Trainee
**Preconditions**: Trainee user with status='active'
**Steps**: Same as TC-001 but in Trainee tab
**Expected Results**: Same, user disappears from Trainee tab

#### TC-004: Try to Archive Inactive User
**Preconditions**: User with status='inactive'
**Steps**:
1. Navigate to User Management > Inactive Users tab
2. Verify Archive button visibility

**Expected Results**:
- ✅ Archive button NOT visible (disabled or hidden)
- ✅ Only "Edit" button shown
- ⚠️ **Alternative**: Archive button visible but greyed out

**Reason**: Inactive users should change status to active first, then archive

#### TC-005: Try to Archive Already Archived User
**Preconditions**: User with is_archived=1
**Steps**:
1. Manually construct URL attempting to archive
2. Call `/api/role/admin/user_management.php?action=archive&id=X` where user already archived

**Expected Results**:
- ✅ Returns error or no-op
- ✅ User not modified
- ✅ No duplicate archive record

---

### FEATURE 2: View Archived Users in System Settings

#### TC-006: View Archived Trainers
**Preconditions**: At least 1 trainer archived (is_archived=1, role=trainer)
**Steps**:
1. Navigate to System Settings
2. Go to User Archival section
3. Click "Archived Trainers" tab

**Expected Results**:
- ✅ Tab loads
- ✅ Archived trainer appears in table
- ✅ Shows: Username, Email, Role, Archived Date, Unarchive button
- ✅ Unarchive button visible and clickable

**Table Verification**:
```sql
SELECT COUNT(*) as archived_trainers 
FROM tbl_users u 
JOIN tbl_role r ON u.role_id = r.role_id 
WHERE u.is_archived=1 AND r.role_name='Trainer';
```

#### TC-007: View Archived Trainees
**Preconditions**: At least 1 trainee archived
**Steps**: Same as TC-006 but "Archived Trainees" tab
**Expected Results**: Same, trainees display

#### TC-008: Verify No Active Users in Archived
**Preconditions**: User Management has active users
**Steps**:
1. Navigate to System Settings > Archived sections
2. Search for active user name

**Expected Results**:
- ✅ Active users NOT in archived sections
- ✅ Sections only show is_archived=1 users

---

### FEATURE 3: Unarchive Users

#### TC-009: Unarchive Trainer
**Preconditions**: Trainer with is_archived=1
**Steps**:
1. Go to System Settings > Archived Trainers
2. Click "Unarchive" button for trainer
3. Confirm action

**Expected Results**:
- ✅ Trainer removed from archived section
- ✅ Database: `is_archived=0`, `archived_by=NULL`, `archived_at=NULL`
- ✅ User reappears in User Management > Trainer tab
- ✅ Status preserved (if was 'inactive', remains 'inactive')

**Verification**:
```sql
SELECT user_id, username, status, is_archived FROM tbl_users WHERE user_id=X;
-- Should show: is_archived=0
```

#### TC-010: Unarchive Trainee
**Preconditions**: Trainee with is_archived=1
**Steps**: Same as TC-009 but trainee
**Expected Results**: Same

#### TC-011: Unarchive Preserves Original Status
**Preconditions**: 
- User archived with status='inactive'
- is_archived changed to 1
**Steps**:
1. Archive a previously inactive user
2. Unarchive the user
3. Check status in User Management

**Expected Results**:
- ✅ User shows status='inactive' (not reset to 'active')
- ✅ User appears in "Inactive Users" tab

---

### FEATURE 4: Inactive Status Management

#### TC-012: Set User to Inactive
**Preconditions**: User with status='active', is_archived=0
**Steps**:
1. Go to User Management
2. Click "Edit" on active user
3. Change Status dropdown to "Inactive"
4. Click "Save User"

**Expected Results**:
- ✅ Edit modal closes
- ✅ User removed from Active view
- ✅ User appears in "Inactive Users" tab
- ✅ Status badge shows "Inactive"
- ✅ Database: status='inactive', is_archived=0

**Data Check**:
```sql
SELECT status, is_archived FROM tbl_users WHERE username='test_user';
-- Should show: status='inactive', is_archived=0
```

#### TC-013: Inactive User Not in Archived
**Preconditions**: User with status='inactive', is_archived=0
**Steps**:
1. Go to System Settings > Archived sections
2. Search for inactive user

**Expected Results**:
- ✅ Inactive user NOT in archived sections
- ✅ Inactive users only in "Inactive Users" tab

#### TC-014: Inactive Users Visible in System Settings
**Preconditions**: At least 1 user with status='inactive'
**Steps**:
1. Go to System Settings > User Archival
2. Navigate to "Inactive Users" tab

**Expected Results**:
- ✅ Tab loads
- ✅ Inactive user appears
- ✅ Shows: Username, Email, Role, Status, Edit button
- ⚠️ Cannot modify from here (info only or redirects to User Management)

#### TC-015: Reactivate from Inactive Tab
**Preconditions**: User with status='inactive'
**Steps**:
1. Go to User Management > Inactive Users tab
2. Click "Edit"
3. Change Status back to "Active"
4. Save

**Expected Results**:
- ✅ User moves to Active view
- ✅ Inactive badge removed
- ✅ Database: status='active', is_archived=0

---

### FEATURE 5: Tab Navigation & Filtering

#### TC-016: Tab Switching (User Management)
**Steps**:
1. Go to User Management
2. Click Admin tab → verify admins shown
3. Click Trainer tab → verify trainers shown
4. Click Trainee tab → verify trainees shown
5. Click Registrar tab → verify registrars shown
6. Click back to Admin tab → verify previous selection maintained

**Expected Results**:
- ✅ Tab content switches correctly
- ✅ No data mixing between tabs
- ✅ Search/filter state preserved per tab
- ✅ Pagination resets to page 1 on tab switch

#### TC-017: Search Filter Per Tab
**Steps**:
1. Go to Admin tab
2. Type admin name in Search
3. Switch to Trainer tab
4. Verify search box is empty
5. Type trainer name in search
6. Switch back to Admin tab
7. Verify admin search still there

**Expected Results**:
- ✅ Each tab maintains independent search state
- ✅ Filters don't carry between tabs

#### TC-018: Status Filter Per Tab
**Steps**:
1. Go to Admin tab
2. Set Status filter to "Active"
3. Switch to Trainer tab
4. Verify Status filter is "All"
5. Set to "Inactive"
6. Switch back to Admin
7. Verify shows "Active" filter

**Expected Results**:
- ✅ Each tab maintains independent status filter
- ✅ Filter persists when switching away and back

#### TC-019: Pagination Per Tab
**Steps**:
1. Go to Admin tab
2. Go to page 2
3. Switch to Trainer tab (should be page 1)
4. Go to page 2
5. Switch back to Admin tab

**Expected Results**:
- ✅ Admin tab stays on page 2
- ✅ Trainer tab independently tracks its page
- ✅ No pagination cross-contamination

---

### FEATURE 6: Edit Functionality

#### TC-020: Edit Active User
**Preconditions**: Active user in User Management
**Steps**:
1. Click "Edit" on active user
2. Modal opens
3. Change a field (e.g., email)
4. Click "Save User"

**Expected Results**:
- ✅ Modal opens without error
- ✅ All fields populated
- ✅ Save succeeds
- ✅ Changes reflected in table
- ✅ Database updated

#### TC-021: Edit Inactive User
**Preconditions**: Inactive user in User Management
**Steps**:
1. Go to Inactive Users tab
2. Click "Edit"
3. Change status to "Active" or edit other field
4. Save

**Expected Results**:
- ✅ Inactive user IS editable (unlike archived)
- ✅ Changes saved
- ✅ If changed to Active, moves to Active view

#### TC-022: Cannot Edit Archived User from User Management
**Preconditions**: Archived user
**Steps**:
1. Try to access archived user in User Management
2. Verify not present

**Expected Results**:
- ✅ Archived user not in User Management
- ✅ Cannot click Edit on archived user
- ✅ No way to edit from User Management page

---

### FEATURE 7: API Endpoints

#### TC-023: GET /api/admin/user_management.php?action=list
**Steps**:
```bash
curl -s "http://localhost/api/role/admin/user_management.php?action=list" | jq '.data[] | {username, status, is_archived}'
```

**Expected Results**:
- ✅ Returns JSON array
- ✅ All users have is_archived=0
- ✅ No archived users in response
- ✅ Response time <1 second

**Data Validation**:
```javascript
// No archived users
response.data.every(u => u.is_archived === 0 || u.is_archived === null)
```

#### TC-024: GET /api/admin/user_management.php?action=get&id=X
**Steps**:
```bash
curl -s "http://localhost/api/role/admin/user_management.php?action=get&id=5"
```

**Expected Results**:
- ✅ Returns single user object
- ✅ Includes: user_id, username, email, status, is_archived, archived_at, archived_by
- ✅ Works for both archived and non-archived

#### TC-025: GET /api/admin/user_management.php?action=archive&id=X
**Steps**:
```bash
# Before: Check is_archived=0
SELECT is_archived FROM tbl_users WHERE user_id=5;

# Execute archive
curl "http://localhost/api/role/admin/user_management.php?action=archive&id=5"

# After: Check is_archived=1
SELECT is_archived, archived_by, archived_at FROM tbl_users WHERE user_id=5;
```

**Expected Results**:
- ✅ API returns success
- ✅ Database: is_archived=1
- ✅ Database: archived_at=NOW()
- ✅ Database: archived_by=current_user
- ✅ Response time <1 second

#### TC-026: GET /api/admin/user_management.php?action=reactivate&id=X
**Steps**:
```bash
# Before: Check is_archived=1
SELECT is_archived FROM tbl_users WHERE user_id=5;

# Execute reactivate
curl "http://localhost/api/role/admin/user_management.php?action=reactivate&id=5"

# After: Check is_archived=0
SELECT is_archived, archived_by, archived_at FROM tbl_users WHERE user_id=5;
```

**Expected Results**:
- ✅ API returns success
- ✅ Database: is_archived=0
- ✅ Database: archived_at=NULL
- ✅ Database: archived_by=NULL

---

### FEATURE 8: Database Integrity

#### TC-027: Verify Indexes Exist
**Steps**:
```sql
SHOW INDEX FROM tbl_users WHERE Key_name IN ('idx_is_archived', 'idx_status_archived');
```

**Expected Results**:
- ✅ Both indexes present
- ✅ Column names correct
- ✅ Type: BTREE

#### TC-028: Verify Foreign Key
**Steps**:
```sql
SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_NAME='tbl_users' AND COLUMN_NAME='archived_by';
```

**Expected Results**:
- ✅ Foreign key constraint exists: fk_archived_by
- ✅ References tbl_users(user_id)

#### TC-029: Verify Defaults
**Steps**:
```sql
DESCRIBE tbl_users;
```

**Expected Results**:
- ✅ is_archived: Default=0
- ✅ archived_at: Default=NULL
- ✅ archived_by: Default=NULL

#### TC-030: Data Integrity After Operations
**Preconditions**: Multiple archives and unarchives completed
**Steps**:
```sql
-- Check no orphaned archived_by references
SELECT COUNT(*) as orphaned 
FROM tbl_users u1 
WHERE u1.archived_by IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM tbl_users u2 WHERE u2.user_id = u1.archived_by);

-- Check consistency
SELECT COUNT(*) as issue_count
FROM tbl_users
WHERE (is_archived=0 AND (archived_at IS NOT NULL OR archived_by IS NOT NULL))
   OR (is_archived=1 AND archived_at IS NULL);
```

**Expected Results**:
- ✅ No orphaned references
- ✅ Consistency check returns 0
- ✅ Data integrity maintained

---

### FEATURE 9: Performance

#### TC-031: Query Performance - List Active Users
**Steps**:
```sql
SET PROFILING=1;
SELECT * FROM tbl_users WHERE is_archived=0;
SHOW PROFILE;
SHOW INDEX FROM tbl_users WHERE Key_name='idx_is_archived';
```

**Expected Results**:
- ✅ Query time <100ms for <10k users
- ✅ Index is being used (EXPLAIN shows "Using index")
- ✅ Rows examined ≈ active user count (not total)

#### TC-032: Query Performance - Combined Filter
**Steps**:
```sql
EXPLAIN SELECT * FROM tbl_users 
WHERE status='inactive' AND is_archived=0;

-- Execute and time
SELECT * FROM tbl_users 
WHERE status='inactive' AND is_archived=0;
```

**Expected Results**:
- ✅ Uses idx_status_archived (EXPLAIN shows this)
- ✅ Query time <100ms
- ✅ Rows examined ≈ matching records

#### TC-033: Page Load Time - User Management
**Steps**:
1. Open User Management
2. Open Browser DevTools > Timing
3. Note page load time
4. Archive a user
5. Reload page
6. Check load time again

**Expected Results**:
- ✅ Initial load <3 seconds
- ✅ Load time after archive <3 seconds
- ✅ No significant degradation

#### TC-034: Bulk Archive Performance (Future)
**Steps**:
1. Create test scenario
2. Archive 100 users in succession
3. Measure total time
4. Check User Management still responsive

**Expected Results**:
- ✅ <5 seconds for 100 archives
- ✅ UI remains responsive
- ✅ No timeout errors

---

### FEATURE 10: Error Handling

#### TC-035: Archive Non-Existent User
**Steps**:
```bash
curl "http://localhost/api/role/admin/user_management.php?action=archive&id=99999"
```

**Expected Results**:
- ✅ Returns error (not 500)
- ✅ Error message clear
- ✅ No database changes

#### TC-036: Archive Without Authorization
**Steps**:
1. Log in as regular user (not admin)
2. Try to access archive endpoint

**Expected Results**:
- ✅ Returns 403 Forbidden or error
- ✅ Archive not executed
- ✅ Access logged for security

#### TC-037: Database Connection Error During Archive
**Preconditions**: Simulate database disconnect
**Steps**:
1. Archive user
2. (If possible) Simulate DB connection loss mid-operation
3. Observe error handling

**Expected Results**:
- ✅ Graceful error message
- ✅ Transaction rolled back if applicable
- ✅ No partial/corrupted data
- ✅ User sees helpful error

---

## Regression Tests

### RT-001: Existing User Management Features Still Work
- [ ] Add new user
- [ ] Edit user fields
- [ ] Search users
- [ ] Filter by status
- [ ] View user details
- [ ] Pagination works

### RT-002: Other Admin Pages Not Affected
- [ ] System Settings (non-archival sections)
- [ ] Activity Logs
- [ ] Admin Dashboard
- [ ] Reports
- [ ] Other role management

### RT-003: Trainer/Trainee Role Pages
- [ ] Trainer dashboard
- [ ] Trainee dashboard
- [ ] Grade submission
- [ ] Schedule viewing
- [ ] Course access

---

## Performance Benchmarks

### Baseline Metrics (Before Archive System)
```
Metric                           Target      Current
User Management Load Time        <2s         
List 1000 Users Query Time       <500ms      
Page Load (with Table)           <3s         
Search Performance               <1s         
```

### Post-Archive Metrics (After Deployment)
```
Metric                           Target      Actual
User Management Load Time        <2s         
List 1000 Users Query Time       <500ms      
List 100 Archived Users          <500ms      
Archive Operation Time           <1s         
Unarchive Operation Time         <1s         
Tab Switch Time                  <200ms      
```

---

## Test Results Template

```
Test Case: [TC-XXX]
Status: [ ] PASS [ ] FAIL [ ] BLOCKED
Date: ____
Tester: ____
Notes: 

---
```

---

## Sign-Off

QA Lead: ________________  Date: ________
Dev Lead: ________________  Date: ________
Project Manager: ________________  Date: ________

All test cases executed and passed: [ ] YES [ ] NO

Issues Found: ____
- Issue 1: ____
- Issue 2: ____

Ready for Production: [ ] YES [ ] NO
