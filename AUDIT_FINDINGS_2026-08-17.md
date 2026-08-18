# System Audit Report - 2026-08-17
## Comprehensive Error & Mismatch Detection

---

## 🔴 CRITICAL ISSUES

### Issue #1: Unfinished schedule_requests Removal
**Severity**: CRITICAL - Code references deleted database table
**Status**: ⚠️ INCOMPLETE - Frontend files still have HTML/JS code

**Files with Leftover Code:**

#### 1. **frontend/html/admin/pages/create_schedule.html**
   - Line 278: `<table id="scheduleRequestsTable">`
   - Line 520: `<div id="scheduleRequestModal">`
   - **Impact**: HTML elements exist but JS won't populate them (table dead code)
   - **Action**: Remove HTML modal and table sections

#### 2. **frontend/html/trainer/trainer_dashboard.html**
   - Line 171: `<table id="trainerScheduleRequestsTable">`
   - Line 253: `<div id="trainerScheduleRequestModal">`
   - **Impact**: Same as above - orphaned HTML
   - **Action**: Remove HTML modal and table sections

#### 3. **frontend/js/trainer/pages/trainer_dashboard.js**
   - Line 481: `function initScheduleRequestModal()`
   - Line 499: `function populateTrainerScheduleRequestModal(request)`
   - Line 533: `resetTrainerScheduleRequestInputs()`
   - Line 546-689: Multiple functions using `currentScheduleRequest`
   - Line 691: `trainerScheduleRequestModal?.hide()`
   - Line 692: `clearScheduleRequestIntent()`
   - **Impact**: Dead code, but doesn't break anything (unreachable)
   - **Action**: Remove all schedule request functions

#### 4. **api/database/migration_add_schedule_presets_table.sql**
   - Line 12: References `tbl_schedule_requests`
   - **Impact**: Migration file trying to alter dropped table
   - **Action**: Fix the migration or mark as deprecated

---

### Issue #2: trainer_type Default Values Mismatch
**Severity**: CRITICAL - Default values use wrong format (hyphens vs spaces)
**Status**: ⚠️ INCONSISTENT - Code defaults still use hyphens

**Files with Wrong Defaults:**

#### 1. **api/role/admin/trainers.php** (Line 137)
```php
$trainerType = trim(strtolower($data['trainer_type'] ?? 'full-time'));
```
**Problem**: Default is `'full-time'` (with hyphen)
**Should be**: `'full timer'` (with space)
**Impact**: If trainer_type not provided, inserts wrong value

#### 2. **api/role/registrar/trainers.php** (Line 245)
```php
$trainerType = trim(strtolower($data['trainer_type'] ?? 'full-time'));
```
**Problem**: Same issue - default uses hyphen
**Should be**: `'full timer'`
**Impact**: Creates ENUM constraint violation

---

## 🟠 HIGH PRIORITY ISSUES

### Issue #3: Database Field Naming Inconsistency
**Severity**: HIGH - API responses return different field names
**Status**: ⚠️ INCONSISTENT - Multiple endpoints use both `course_name` and `qualification_name`

**Affected Endpoints:**

1. **api/public/application_data.php** (Line 21)
   - Returns: `qualification_name AS course_name`

2. **api/role/registrar/qualifications.php** (Line 27)
   - Returns: BOTH `qualification_name` AND `qualification_name as course_name`
   - ⚠️ Duplicate field!

3. **api/role/registrar/batches.php** (Line 74)
   - Returns: `qualification_name as course_name`

4. **api/role/registrar/schedule.php** (Line 78)
   - Returns: `qualification_name AS course_name`

5. **api/role/trainer/my_batches.php** (Line 46)
   - Returns: `qualification_name AS course_name`

6. **api/role/trainer/reports.php** (Line 41)
   - Returns: `qualification_name as course_name`

**Recommendation**: Standardize on `qualification_name` everywhere (more semantic and correct)

---

## 🟡 MEDIUM PRIORITY ISSUES

### Issue #4: Dead Code References
**Severity**: MEDIUM - Unused variables/functions that don't break anything
**Status**: ⚠️ CODE QUALITY

**Files:**
- `frontend/js/trainer/pages/trainer_dashboard.js`: Multiple orphaned functions
- `frontend/html/admin/pages/create_schedule.html`: Unused HTML elements
- `frontend/html/trainer/trainer_dashboard.html`: Unused HTML elements

**Impact**: Increases bundle size, confuses developers, maintenance burden

---

## Summary Table

| # | Issue | File | Severity | Status | Action |
|---|-------|------|----------|--------|--------|
| 1 | schedule_requests HTML | create_schedule.html | 🔴 CRITICAL | ⚠️ Incomplete | Remove HTML |
| 2 | schedule_requests HTML | trainer_dashboard.html | 🔴 CRITICAL | ⚠️ Incomplete | Remove HTML |
| 3 | schedule_requests JS | trainer_dashboard.js | 🔴 CRITICAL | ⚠️ Incomplete | Remove functions |
| 4 | trainer_type default | admin/trainers.php | 🔴 CRITICAL | ⚠️ Wrong value | Change to 'full timer' |
| 5 | trainer_type default | registrar/trainers.php | 🔴 CRITICAL | ⚠️ Wrong value | Change to 'full timer' |
| 6 | Field naming | Multiple PHP files | 🟠 HIGH | ⚠️ Inconsistent | Standardize to qualification_name |
| 7 | Dead code | Multiple JS/HTML files | 🟡 MEDIUM | ⚠️ Code quality | Cleanup |

---

## Recommended Fixes (Priority Order)

### Phase 1: CRITICAL (Do Immediately)
1. Fix trainer_type defaults in PHP files
2. Remove schedule_requests HTML elements
3. Remove schedule_requests JS functions

### Phase 2: HIGH (Do Next)
4. Standardize field naming across API endpoints

### Phase 3: MEDIUM (Code Cleanup)
5. Remove dead code comments/functions
6. Update migration files

---

## Files Needing Changes

```
api/role/admin/trainers.php          - Fix default trainer_type
api/role/registrar/trainers.php      - Fix default trainer_type
frontend/html/admin/pages/create_schedule.html     - Remove schedule_requests HTML
frontend/html/trainer/trainer_dashboard.html       - Remove schedule_requests HTML
frontend/js/trainer/pages/trainer_dashboard.js     - Remove schedule_requests functions
api/database/migration_add_schedule_presets_table.sql  - Fix migration
```

---

Generated: 2026-08-17
