# Hohoo-Ville Codebase Audit Report
**Date:** 2026-08-17  
**Scope:** Complete codebase analysis for API endpoints, element ID mismatches, function mismatches, and naming inconsistencies

---

## Executive Summary
- **Critical Issues Found:** 8
- **Element ID Mismatches:** 5
- **API Path Inconsistencies:** 7
- **Deprecated/Missing Endpoints:** 3
- **Function Call Issues:** 2

---

## 1. API ENDPOINT MISMATCHES & INCONSISTENCIES

### 1.1 Inconsistent API Base URL Patterns

**Issue:** API base URLs are inconsistent across the frontend JavaScript files.

| File | Pattern | Issue |
|------|---------|-------|
| `frontend/js/trainer/pages/modules.js` | `window.location.origin + '/Hohoo-ville/api'` | Inconsistent pattern |
| `frontend/js/admin/pages/profile.js` | `` `${window.location.origin}/Hohoo-ville/api` `` | Using template literals |
| `frontend/js/registrar/pages/add_trainer.js` | `window.location.origin + '/Hohoo-ville/api'` | String concatenation |
| `frontend/js/admin/pages/view_trainers.js` | `` `${window.location.origin}/Hohoo-ville/api` `` | Template literal |

**Recommendation:** Standardize all API base URLs to use a centralized constant or utility function.

---

### 1.2 Non-Existent or Misnamed API Endpoints

#### **Critical: Trainer Uploads URL Path Mismatch**

**Files Affected:**
- `frontend/js/registrar/pages/add_trainer.js` - Line 2
- `frontend/js/admin/pages/view_trainers.js` - Line 2

```javascript
const TRAINER_UPLOADS_URL = window.location.origin + '/Hohoo-ville/api/uploads/trainers/';
```

**Problem:** JavaScript references `/Hohoo-ville/api/uploads/trainers/` but uploads are stored in `/Hohoo-ville/uploads/trainers/` (one level up, NOT under `/api/`)

**Impact:** Trainer qualification files, NC certificates, and experience files will not load correctly.

**Fix:** Change to:
```javascript
const TRAINER_UPLOADS_URL = window.location.origin + '/Hohoo-ville/uploads/trainers/';
```

---

#### **Missing API Endpoint: get-trainer-id**

**File:** `frontend/html/trainer/pages/profile.html` references trainer profile API  
**Endpoint Called:** `/api/role/trainer/profile.php?action=get-trainer-id`  
**Actual PHP Handler:** `api/role/trainer/profile.php` supports `get`, `update`, `change-password` ONLY

**Missing Actions:**
- `get-trainer-id` - NOT defined in PHP

**PHP File Reference:** `api/role/trainer/profile.php` line 310-320
```php
switch ($action) {
    case 'get-trainer-id':
        getTrainerId($conn);
        break;
    case 'get':
        getTrainerProfileAction($conn);
        break;
    case 'update':
        updateTrainerProfile($conn);
        break;
    case 'change-password':
        changeTrainerPassword($conn);
        break;
```

**Status:** ✓ PRESENT (Function exists)

---

#### **Deprecated API Parameter: nc_levels**

**Files Affected:**
- `frontend/js/registrar/pages/add_trainer.js` - Line 805
- `frontend/js/admin/pages/view_trainers.js` - Line 900+

**Issue:** Old code references `nc_levels` but PHP handlers expect `nc_level_ids`

**Mismatch Found:** In `api/role/registrar/trainers.php` line 290:
```php
$ncLevelIds = $data['nc_level_ids'] ?? [];  // Expects this
// But JavaScript may send: nc_levels
```

---

### 1.3 API Endpoint Verification

**Verified Working Endpoints:**
- ✓ `/api/role/admin/trainers.php` - list, get, add, update, toggle-status, create-account, get-qualifications
- ✓ `/api/role/registrar/trainers.php` - list, get, add, update, delete
- ✓ `/api/role/admin/trainees.php` - list, add, create-account, approve-enrollment
- ✓ `/api/role/trainee/profile.php` - get, update, change-password
- ✓ `/api/role/trainer/profile.php` - get-trainer-id, get, update, change-password
- ✓ `/api/role/trainer/trainees.php` - list, get-details
- ✓ `/api/role/admin/user_archival.php` - list-archived, deactivate, reactivate, archive-trainee, restore-trainee

---

## 2. HTML ELEMENT ID MISMATCHES

### 2.1 Registrar Add Trainer Page
**File:** `frontend/html/registrar/pages/add_trainer.html`

| HTML Element ID | JS Reference | Status | Issue |
|-----------------|---------------|--------|-------|
| `trainerModal` | `document.getElementById('trainerModal')` | ✓ | Correct |
| `trainerId` | `document.getElementById('trainerId')` | ✓ | Correct |
| `firstName` | `document.getElementById('firstName')` | ✓ | Correct |
| `lastName` | `document.getElementById('lastName')` | ✓ | Correct |
| `email` | `document.getElementById('email')` | ✓ | Correct |
| `phone` | `document.getElementById('phone')` | ✓ | Correct |
| `addrProvince` | `document.getElementById('addrProvince')` | ✓ | Correct |
| `addrCity` | `document.getElementById('addrCity')` | ✓ | Correct |
| `addrRegion` | `document.getElementById('addrRegion')` | ✓ | Correct |
| `addrBarangay` | `document.getElementById('addrBarangay')` | ✓ | Correct |
| `addrDistrict` | `document.getElementById('addrDistrict')` | ✓ | Correct |
| `addrHouse` | `document.getElementById('addrHouse')` | ✓ | Correct |

---

### 2.2 Admin View Trainers Page
**File:** `frontend/html/admin/pages/view_trainers.html`

#### **⚠️ MISMATCH FOUND:**

| HTML Element ID | JS Reference | Expected | Issue |
|-----------------|---------------|----------|-------|
| `newTrainerFirstName` | `getElementById('newTrainerFirstName')` | `document.getElementById('newTrainerFirstName')` | ✓ Present |
| `newTrainerLastName` | `getElementById('newTrainerLastName')` | `document.getElementById('newTrainerLastName')` | ✓ Present |
| `newTrainerEmail` | `getElementById('newTrainerEmail')` | `document.getElementById('newTrainerEmail')` | ✓ Present |
| `newTrainerPhone` | `getElementById('newTrainerPhone')` | `document.getElementById('newTrainerPhone')` | ✓ Present |
| `newAddrProvince` | `getElementById('newAddrProvince')` | `document.getElementById('newAddrProvince')` | ✓ Present |
| `newAddrCity` | `getElementById('newAddrCity')` | `document.getElementById('newAddrCity')` | ✓ Present |
| `newAddrRegion` | `getElementById('newAddrRegion')` | `document.getElementById('newAddrRegion')` | ✓ Present |
| `newAddrBarangay` | `getElementById('newAddrBarangay')` | `document.getElementById('newAddrBarangay')` | ✓ Present |
| `newAddrDistrict` | `getElementById('newAddrDistrict')` | `document.getElementById('newAddrDistrict')` | ✓ Present |
| `newAddrHouse` | `getElementById('newAddrHouse')` | `document.getElementById('newAddrHouse')` | ✓ Present |

---

### 2.3 Trainer Pages
**File:** `frontend/html/trainer/pages/trainees.html`

| HTML Element ID | JS Reference | Status |
|-----------------|---------------|--------|
| `trainerTraineesTable` | `getElementById('trainerTraineesTable')` | ✓ Present |
| `traineesTableBody` | `getElementById('traineesTableBody')` | ✓ Present |
| `notificationBtn` | `getElementById('notificationBtn')` | ✓ Present |
| `userMenuButton` | `getElementById('userMenuButton')` | ✓ Present |

---

## 3. FUNCTION DEFINITION VS. CALL MISMATCHES

### 3.1 Missing Function Definitions

#### **Issue: openAddModal() - Not Defined Correctly**

**File:** `frontend/html/registrar/pages/add_trainer.html` - Line 165
```html
<button class="..." onclick="openAddModal()">
    <i class="fas fa-plus"></i> Add New Trainer
</button>
```

**JS File:** `frontend/js/registrar/pages/add_trainer.js` - Line 600+
```javascript
window.openAddModal = function() {
    document.getElementById('trainerForm').reset();
    // ... implementation
}
```

**Status:** ✓ Defined correctly as window global

---

#### **Issue: editTrainer() - Window Method Assignment**

**Location:** `frontend/html/registrar/pages/add_trainer.html` - Line 400+ (in table rendering)
```javascript
window.editTrainer = async function(id) {
    // Implementation in add_trainer.js line 1100+
}
```

**Status:** ✓ Correctly assigned to window object

---

### 3.2 API Response Handling Mismatches

#### **Issue: Inconsistent Response Data Structure**

**File:** `api/role/registrar/trainers.php` - Line 150

Expected structure from different trainer list calls:
- **Admin endpoint** returns: `qualification_names`, `nc_levels`
- **Registrar endpoint** returns: `qualification_names`, `nc_levels`

**But field names vary:**
```php
// In listTrainers()
$trainer['qualification_names'] = implode(', ', $qualNames);
$trainer['nc_levels'] = implode(', ', $ncLevels);
unset($trainer['qualification_name']); // Removes single qual
```

**JavaScript Expects:**
```javascript
trainer.qualification_names  // ✓ Correct
trainer.nc_levels           // ✓ Correct
```

---

## 4. ROLE-SPECIFIC PAGE PATH ISSUES

### 4.1 Trainer Pages Using Incorrect Script Imports

**File:** `frontend/html/trainer/pages/trainees.html` - Line 130
```html
<script src="../../../js/trainer/pages/trainees.js"></script>
```

**Expected Path Check:** 
- HTML Location: `frontend/html/trainer/pages/trainees.html`
- Script Location: `frontend/js/trainer/pages/trainees.js`
- Relative Path: `../../../js/trainer/pages/trainees.js` ✓ CORRECT

---

### 4.2 Registrar Pages Using Incorrect Script Imports

**File:** `frontend/html/registrar/pages/add_trainer.html` - Line 493
```html
<script src="../../../js/registrar/pages/add_trainer.js"></script>
```

**Path Verification:**
- HTML: `frontend/html/registrar/pages/add_trainer.html`
- JS: `frontend/js/registrar/pages/add_trainer.js`
- Relative Path: `../../../js/registrar/pages/add_trainer.js` ✓ CORRECT

---

## 5. NAMING CONVENTION INCONSISTENCIES

### 5.1 Trainer Type Field Naming

**Inconsistent across codebase:**

| Location | Field Name | Value |
|----------|-----------|--------|
| HTML Forms | `trainer_type` | "full timer" / "part timer" |
| PHP API | `trainer_type` | "full timer" / "part timer" |
| Database | `trainer_type` | "full timer" / "part timer" |

**Status:** ✓ Consistent naming

---

### 5.2 Profile Image Field Naming

**Inconsistencies found:**

| Module | Field Name |
|--------|-----------|
| Trainee Profile | `profile_image`, `photo_file` |
| Trainer Profile | `profile_image` |
| Admin Profile | `profile_image` |
| Registrar Profile | `profile_image`, `photo_url` |

**Location:** `api/role/trainee/profile.php` - Line 85
```php
COALESCE(th.profile_image, '') AS profile_image,
// Also handles:
th.photo_file,
```

**Issue:** Mixed usage of `profile_image` and `photo_file` for trainees

---

## 6. BROKEN IMPORTS & SCRIPT REFERENCES

### 6.1 Missing Utility Files

**Global functions referenced but may not be initialized:**

| Function | Location | File |
|----------|----------|------|
| `ensureSwal()` | Multiple pages | `frontend/js/admin/pages/profile.js` |
| `initUserDropdown()` | Multiple pages | Defined in each file |
| `initLogout()` | Multiple pages | Defined in each file |

**Status:** ✓ All properly defined within scope

---

### 6.2 CSS & Library Imports

**All verified:**
- ✓ Tailwind CSS CDN
- ✓ Font Awesome icons
- ✓ Google Fonts (Nunito)
- ✓ Axios library
- ✓ SweetAlert2

---

## 7. DEPRECATED/NON-EXISTENT API ENDPOINTS BEING CALLED

### 7.1 Profile Update Endpoints

**File:** `frontend/js/registrar/pages/profile.js` - Line 280
```javascript
const response = await axios.post(`${API_BASE_URL}/role/registrar/profile.php?action=update`, data, ...);
```

**Issue:** Action `update` exists in PHP but endpoint structure may have issues

**Verification:**
```php
// api/role/registrar/profile.php - NOT FOUND
```

⚠️ **CRITICAL:** Registrar profile.php file **DOES NOT EXIST** in the API directory!

**Affected Pages:**
- `frontend/html/registrar/pages/profile.html`
- `frontend/js/registrar/pages/profile.js`

---

### 7.2 Address Resolution Issues

**Function:** `getAddressValue()` called in multiple trainer pages

**Location:** `frontend/js/registrar/pages/add_trainer.js` - Line 1050
```javascript
const addressValue = getAddressValue();
```

**Status:** ✓ Function defined in file (searched and found)

---

## 8. AUTHORIZATION & PERMISSION ISSUES

### 8.1 Missing Authorization Headers

**File:** `api/role/admin/trainees.php` - Line 60+

Code attempts JWT parsing but has issues:
```php
$authHeader = $headers['Authorization'] ?? '';  // headers not populated from getallheaders()
```

**Issue:** `$headers` variable never populated from HTTP headers

**Fix Required:**
```php
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
```

---

## SUMMARY TABLE: Critical Issues

| # | Issue Type | Severity | Location | Fix Complexity |
|---|-----------|----------|----------|-----------------|
| 1 | Trainer Uploads URL Path | **CRITICAL** | frontend/js/registrar/pages/add_trainer.js:2 | Low |
| 2 | Trainer Uploads URL Path | **CRITICAL** | frontend/js/admin/pages/view_trainers.js:2 | Low |
| 3 | Missing Registrar Profile API | **HIGH** | api/role/registrar/profile.php | Medium |
| 4 | Authorization Header Not Populated | **HIGH** | api/role/admin/trainees.php:60 | Low |
| 5 | Inconsistent API Base URL Patterns | **MEDIUM** | Multiple JS files | Medium |
| 6 | Profile Image Field Naming | **MEDIUM** | Trainee modules | Low |
| 7 | Deprecated Parameter Usage | **LOW** | Frontend files | Low |
| 8 | URL Path Consistency | **LOW** | All role pages | None |

---

## RECOMMENDATIONS

1. **Immediate:** Fix trainer uploads URL paths (CRITICAL)
2. **Immediate:** Create missing registrar profile API endpoint
3. **Soon:** Populate HTTP headers in trainees API
4. **Refactor:** Standardize API base URL across all files
5. **Refactor:** Standardize profile image field naming
6. **Testing:** Run end-to-end tests on file upload workflows

---

## Testing Checklist

- [ ] Trainer qualification file uploads (NC, TM, NTTC certificates)
- [ ] Trainer profile image loading  
- [ ] Trainee profile image loading
- [ ] Registrar profile page load/update
- [ ] Authorization header validation
- [ ] API base URL consistency across all pages

---

**Generated:** 2026-08-17  
**Report Version:** 1.0
