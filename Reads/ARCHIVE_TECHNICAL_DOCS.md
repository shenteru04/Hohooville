# Technical Architecture - Archive System

## Implementation Overview

The archive system is implemented across three tiers:

### 1. Database Layer
**File**: `api/database/archive_feature_migration.sql`

**Schema Changes**:
```sql
ALTER TABLE tbl_users ADD COLUMN is_archived TINYINT(1) DEFAULT 0 NOT NULL;
ALTER TABLE tbl_users ADD COLUMN archived_at DATETIME DEFAULT NULL;
ALTER TABLE tbl_users ADD COLUMN archived_by INT(11) DEFAULT NULL;

CREATE INDEX idx_is_archived ON tbl_users(is_archived);
CREATE INDEX idx_status_archived ON tbl_users(status, is_archived);

ALTER TABLE tbl_users ADD CONSTRAINT fk_archived_by 
  FOREIGN KEY (archived_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL;
```

**Query Performance**:
- `idx_is_archived` enables fast filtering of non-archived users
- `idx_status_archived` optimizes combined status + archive queries
- Most common query patterns filter `WHERE is_archived = 0` first

---

### 2. API Layer
**File**: `api/role/admin/user_management.php`

#### Core Functions

**`getUsers($conn, $role_id = null)`**
```php
// Only returns non-archived users
SELECT u.user_id, u.username, u.email, u.status, u.is_archived, u.archived_at
FROM tbl_users u
WHERE u.is_archived = 0  // CRITICAL: Filters out archived users
  AND (role_id = ? OR ? IS NULL)
```

**Why this matters**: User Management page never shows archived users

**`archiveUser($conn)`**
```php
// Called when Archive button clicked
UPDATE tbl_users 
SET is_archived = 1, 
    archived_at = NOW(), 
    archived_by = ?
WHERE user_id = ?
```

**Effect**: 
- User disappears from User Management (because getUsers filters)
- User appears in archived section
- Original status field preserved
- Timestamp and admin ID recorded

**`reactivateUser($conn)`**
```php
// Called from System Settings "Unarchive"
UPDATE tbl_users 
SET is_archived = 0, 
    archived_at = NULL, 
    archived_by = NULL
WHERE user_id = ? AND is_archived = 1
```

**Effect**:
- Clears archive status
- User reappears in User Management
- Original status (active/inactive) maintained

**`updateUser($conn)`**
```php
// Allows status changes: active <-> inactive
UPDATE tbl_users 
SET status = ?
WHERE user_id = ? AND is_archived = 0
```

**Important**: Only allows status changes if NOT archived

#### API Endpoints

| Endpoint | Action | Effect | Returns |
|----------|--------|--------|---------|
| `?action=list` | GET | Returns all non-archived users | Array of users |
| `?action=get&id={id}` | GET | Returns single user with archive flags | User object |
| `?action=archive&id={id}` | GET | Archives user | Success/error |
| `?action=reactivate&id={id}` | GET | Unarchives user | Success/error |
| `?action=update` | POST | Updates user (status changes) | Updated user |

---

### 3. Frontend Layer

#### User Management Page
**Files**: 
- `frontend/html/admin/pages/user_management.html`
- `frontend/js/admin/pages/user_management.js`

**State Structure**:
```javascript
// Separate tracking per role
usersByRole = {
  admin: { 
    all: [],           // All non-archived admins
    filtered: [],      // After search/filter
    currentPage: 1,
    totalPages: 1
  },
  trainer: { /* ... */ },
  trainee: { /* ... */ },
  registrar: { /* ... */ }
}
```

**Key Functions**:

**`loadUsers()`**
- Calls `/api/role/admin/user_management.php?action=list`
- Receives only `is_archived = 0` users
- Segregates by role
- Stores in `usersByRole` object

**`archiveUser(id)`**
```javascript
// Archive button click handler
axios.get(`/api/role/admin/user_management.php?action=archive&id=${id}`)
  .then(response => {
    // Remove from current view
    removeUserFromDisplay(id);
    refreshUserTable();
  })
```

**Effect**: User removed from tab immediately

**`renderRoleUsersTable(role)`**
- For each user in `usersByRole[role].filtered`:
  - If `status === 'inactive'`: Show "Edit" button, display "Inactive" badge
  - If `status === 'active'`: Show "Archive" button
- Never shows archived users (they're filtered out by API)

**`applyRoleFilters(role)`**
```javascript
// Search + status filter
filtered = all.filter(u => {
  matchesSearch = u.username.includes(searchTerm) || u.email.includes(searchTerm);
  matchesStatus = statusFilter === 'all' || u.status === statusFilter;
  return matchesSearch && matchesStatus;
})
```

#### System Settings Page
**Files**:
- `frontend/html/admin/pages/system_settings.html`
- `frontend/js/admin/pages/system_settings.js`

**Tab Structure**:
1. **Inactive Users Tab** (NEW)
   - Shows: `status = 'inactive'` AND `is_archived = 0`
   - From: `/api/role/admin/user_management.php?action=list`
   - Filter: `u.status === 'inactive' && (!u.is_archived || u.is_archived == 0)`
   - Actions: Edit button → redirects to User Management

2. **Archived Trainers Tab**
   - Shows: `role = 'trainer'` AND `is_archived = 1`
   - From: `/api/role/admin/user_archival.php?action=get_archived`
   - Actions: Unarchive button

3. **Archived Trainees Tab**
   - Shows: `role = 'trainee'` AND `is_archived = 1`
   - From: `/api/role/admin/user_archival.php?action=get_archived`
   - Actions: Unarchive button

**`loadInactiveUsers()`**
```javascript
// Get all users, filter for inactive non-archived
axios.get('/api/role/admin/user_management.php?action=list')
  .then(res => {
    inactive = res.data.data.filter(u => 
      u.status === 'inactive' && (!u.is_archived || u.is_archived == 0)
    );
    renderInactiveUsersTable(inactive);
  })
```

**Important Filter Logic**: 
- `!u.is_archived` handles NULL case (from older users)
- `u.is_archived == 0` explicitly checks for 0 value
- Combined with OR: catches both cases

**`reactivateUser(userId)`**
```javascript
// Called from archived section Unarchive button
axios.get(`/api/role/admin/user_management.php?action=reactivate&id=${userId}`)
  .then(response => {
    // Move from archived section
    removeFromArchivedView(userId);
    loadInactiveUsers(); // Refresh inactive list
  })
```

---

## Data Flow Diagrams

### Archive Flow
```
User Management (Active User)
    ↓
  Click "Archive" Button
    ↓
archiveUser() JavaScript
    ↓
GET /api/.../user_management.php?action=archive&id=X
    ↓
UPDATE tbl_users SET is_archived=1, archived_at=NOW(), archived_by=? WHERE user_id=X
    ↓
getUsers() on next page load queries WHERE is_archived=0
    ↓
User disappears from User Management
    ↓
System Settings > Archived Section
    ↓
  Shows user with Unarchive button
```

### Reactivate Flow
```
System Settings > Archived Section
    ↓
  Click "Unarchive" Button
    ↓
reactivateUser() JavaScript
    ↓
GET /api/.../user_management.php?action=reactivate&id=X
    ↓
UPDATE tbl_users SET is_archived=0, archived_at=NULL, archived_by=NULL WHERE user_id=X
    ↓
loadUsers() in User Management
    ↓
getUsers() returns user with original status
    ↓
User reappears in User Management tab
    ↓
Ready to edit again
```

### Inactive Flow
```
User Management (Any User)
    ↓
  Click "Edit"
    ↓
Edit Modal opens
    ↓
Change Status: "active" → "inactive"
    ↓
  Click "Save User"
    ↓
updateUser() with POST data {status: 'inactive'}
    ↓
UPDATE tbl_users SET status='inactive' WHERE user_id=X AND is_archived=0
    ↓
User remains: is_archived=0, status changes to 'inactive'
    ↓
Page refreshes
    ↓
User now in "Inactive Users" tab with badge
    ↓
Still editable (Edit button available)
```

---

## Critical Filter Differences

### Query: Who's in User Management?
```sql
SELECT * FROM tbl_users 
WHERE is_archived = 0
  AND (status='active' OR status='inactive')
ORDER BY date_created DESC
```
**Shows**: Active users AND Inactive users (both tabs)
**Hides**: All archived users

### Query: Who's Archived?
```sql
SELECT * FROM tbl_users 
WHERE is_archived = 1
```
**Shows**: All archived users regardless of status
**Hides**: Non-archived users

### Query: Who's in "Inactive Users" tab in System Settings?
```sql
SELECT * FROM tbl_users
WHERE is_archived = 0
  AND status = 'inactive'
```
**Shows**: Only inactive non-archived (users from User Management)
**Hides**: Archived users, active users

---

## Edge Cases Handled

### 1. User with NULL is_archived (Migration)
```javascript
// JavaScript filter
(!u.is_archived || u.is_archived == 0)
// Catches: undefined, null, 0
// Rejects: 1
```

### 2. Archived User with status='inactive'
- Stays archived even if status='inactive'
- Only appears if `is_archived=1`
- Cannot edit status while archived

### 3. User Archived Multiple Times
- Each archive overwrites `archived_by` and `archived_at`
- Only latest archive info retained
- No audit trail of multiple archives (by design)

### 4. Archiving Self
- Admin can archive own account
- Will not be able to unarchive (won't see own archived account)
- Should be prevented with UI/API validation

---

## Performance Considerations

### Indexes
```sql
idx_is_archived(is_archived)          -- Fast filtering 
idx_status_archived(status, is_archived) -- Combined queries
```

**Query Cost**:
- `SELECT * FROM tbl_users WHERE is_archived = 0` → Uses `idx_is_archived`
- `SELECT * FROM tbl_users WHERE status='inactive' AND is_archived=0` → Uses `idx_status_archived`

### Pagination
- User Management: Per-role pagination (25 users/page)
- Each role filters independently
- Reduces data transmission for large datasets

### Lazy Loading
- System Settings: Loads inactive users on tab switch
- Loads archived users only when needed
- Single API call per section

---

## Security Considerations

1. **Authorization**: Only admins can archive/unarchive
2. **Audit Trail**: `archived_by` tracks who archived
3. **Soft Delete**: No data loss, can always recover
4. **Status Immutability**: Cannot change status while archived
5. **Role Separation**: Can only archive/unarchive within role

---

## Testing Checklist

- [ ] Archive active user → disappears from User Management
- [ ] Archived user not found in getUsers() query
- [ ] Unarchive → user reappears with original status
- [ ] Set user to inactive → still visible in User Management
- [ ] Inactive user in System Settings "Inactive Users" tab
- [ ] Edit inactive user → works normally
- [ ] Reactivate inactive → changes to active
- [ ] Cannot edit archived user directly
- [ ] Bulk archive performance (if implemented)
- [ ] Archived data exports contain is_archived flag

---

## Future Enhancements

1. **Soft Delete Expiration**: Auto-delete archived users after X days
2. **Bulk Archive**: Archive multiple users at once
3. **Archive Automation**: Archive inactive users after X days of inactivity
4. **Archive Reason**: Required comment when archiving
5. **Scheduled Unarchive**: Auto-unarchive after X days
6. **Archive History**: Keep audit log of all archive/unarchive events
7. **Archive Search**: Search within archived users
8. **Archive Export**: Export archived users to CSV
