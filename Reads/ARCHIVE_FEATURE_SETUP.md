# Archive Feature Implementation Guide

## Overview
This feature adds Google Classroom-style archiving functionality to the trainee portal. Trainees can now:
1. Automatically archive qualifications when they achieve competency (score >= 80)
2. Manually archive completed qualifications
3. Unarchive qualifications to make them active again
4. View all archived qualifications in a separate section on the dashboard

## Database Changes

### Migration File: `api/database/migration_archive_feature.sql`

Run this migration to add the necessary columns to the enrollment table:

```sql
ALTER TABLE `tbl_enrollment` 
ADD COLUMN `completion_date` DATE NULL DEFAULT NULL COMMENT 'Date when trainee achieves competency (score >= 80)',
ADD COLUMN `is_archived` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Flag to indicate if qualification is archived by trainee',
ADD COLUMN `archive_date` DATE NULL DEFAULT NULL COMMENT 'Date when trainee manually archived the qualification';

ALTER TABLE `tbl_enrollment` 
MODIFY `status` enum('pending','qualified','unqualified','approved','rejected','completed') DEFAULT 'pending';

ALTER TABLE `tbl_enrollment` 
ADD INDEX `idx_trainee_archive` (`trainee_id`, `is_archived`),
ADD INDEX `idx_trainee_status` (`trainee_id`, `status`);
```

## Implementation Steps

### 1. Database Migration
Execute the migration file in your MySQL database to add the new columns and update the enum status.

### 2. Backend API Changes

#### File: `api/role/trainee/trainee_dashboard.php`
- Modified to fetch both active and archived courses
- Added auto-archive logic that triggers when trainee achieves score >= 80
- Returns archived_courses in the response JSON

#### File: `api/role/trainee/archive.php` (NEW)
- Handles archive/unarchive operations
- Endpoints:
  - `action=archive-course` - Archives a specific course
  - `action=unarchive-course` - Unarchives a specific course
  - `action=get-archived` - Fetches all archived courses

### 3. Frontend Changes

#### File: `frontend/html/trainee/trainee_dashboard.html`
- Added `#archiveButtonContainer` - Displays archive button when course is completed
- Added `#archivedCoursesContainer` - Displays table of archived qualifications
- Added CSS styling for table hover effects and archive section

#### File: `frontend/js/trainee/trainee_dashboard.js`
- Enhanced `loadDashboardData()` to handle archived courses
- Added `displayArchivedCourses()` - Renders archived qualifications table
- Added `archiveCourse()` - Archives a course with user confirmation
- Added `unarchiveCourse()` - Unarchives a course with user confirmation
- Added `createArchiveContainer()` - Helper to create archive button container

## How It Works

### Auto-Archive on Competency
1. When trainee loads dashboard, the system calculates their average grade
2. If grade >= 80 (Competent), the system automatically:
   - Updates enrollment status to 'completed'
   - Sets completion_date to today
   - Sets is_archived to 1
   - Sets archive_date to today
3. The course disappears from active courses and appears in archived section

### Manual Archive
1. Trainees can click "Archive This Course" button on a completed course
2. System sets is_archived to 1 and archive_date to today
3. Course moves to archived section immediately

### Unarchive
1. Trainees can click "Unarchive" button next to any archived course
2. System sets is_archived to 0 and archive_date to NULL
3. Course can be active again if batch is still open

## Data Flow

```
Dashboard Load
    ↓
Get Active Course (is_archived = 0 OR NULL, status = 'approved' OR 'completed', batch open)
    ↓
Get Grade Average
    ↓
Is Score >= 80?
    ├─ YES: Auto-Archive (set status='completed', is_archived=1)
    └─ NO: Show as active
    ↓
Get Archived Courses (is_archived = 1)
    ↓
Display Active Course + Archive Button + Archived List
```

## API Endpoints

### GET /api/role/trainee/trainee_dashboard.php
**Parameters:**
- `trainee_id` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "active_course": {...},
    "attendance_rate": 85.5,
    "current_grade": 82.5,
    "competency_status": "Competent",
    "schedule": {...},
    "archived_courses": [
      {
        "enrollment_id": 4,
        "course_id": 1,
        "course_name": "Basic Welding",
        "batch_name": "Batch A",
        "final_score": 82.5,
        "completion_date": "2026-02-12",
        "archive_date": "2026-02-12"
      }
    ]
  }
}
```

### POST /api/role/trainee/archive.php
**Actions:**
- `archive-course`: Archives a qualification
- `unarchive-course`: Unarchives a qualification
- `get-archived`: Fetches all archived courses

**Parameters:**
- `trainee_id` (required)
- `enrollment_id` (required for archive/unarchive)
- `action` (required)

## Testing Checklist

- [ ] Database migration runs without errors
- [ ] New columns exist in tbl_enrollment table
- [ ] Dashboard API returns archived_courses array
- [ ] Archive button appears when trainee is competent
- [ ] Auto-archive works when score >= 80
- [ ] Manual archive button works
- [ ] Unarchive button works
- [ ] Archived courses display in table
- [ ] Archive/unarchive updates UI in real-time

## Notes

- Auto-archiving happens EVERY TIME the dashboard is loaded for a competent trainee
- The system uses safe query parameters and prepared statements to prevent SQL injection
- Archive operations include user confirmation dialogs
- Failed auto-archive operations are logged but don't interrupt the dashboard load
- Archived courses are ordered by completion_date DESC, then archive_date DESC
