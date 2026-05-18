# Admin Dashboard & Admin Pages - Setup & Troubleshooting Guide

## Issues Fixed

### 1. **Database Table Naming Mismatch**
   - **Problem**: Admin PHP files were querying tables with `tbl_` prefix (e.g., `tbl_enrollment`, `tbl_qualifications`), but the database schema used names without the prefix (e.g., `enrollments`, `qualifications`).
   - **Solution**: Updated the database schema in `/api/database/db.php` to create all tables with the `tbl_` prefix to match what the code expects.

### 2. **Incorrect API Base URL**
   - **Problem**: The admin dashboard JavaScript was using lowercase path `/hohoo-ville/api` instead of the correct case-sensitive path `/Hohoo-ville/api`.
   - **Solution**: Updated `admindashboard.js` to use the correct path with proper casing.

### 3. **Database Table Structure**
   - **Updated**: All tables now use the following naming convention:
     - `tbl_users` - User accounts (admin, trainer, trainee)
     - `tbl_trainer` - Trainer records
     - `tbl_trainee_hdr` - Trainee header records
     - `tbl_qualifications` - Qualifications/Courses
     - `tbl_batch` - Training batches
     - `tbl_enrollment` - Student enrollments
     - `tbl_attendance` - Attendance records
     - `tbl_grades` - Grade records
     - `tbl_payments` - Payment records
     - `tbl_activity_logs` - Activity logs
     - And many more supporting tables...

## How to Initialize/Fix Your Database

### Option 1: Using the Web Setup Page (Recommended)
1. Open your browser and navigate to: `http://localhost/Hohoo-ville/api/setup/`
2. Click the **"Initialize Database"** button
3. This will:
   - Drop all old tables (without tbl_ prefix)
   - Create new tables (with tbl_ prefix)
   - Set up the default admin user

### Option 2: Manual Database Reset
```sql
-- Connect to your MySQL database and run:
-- Note: This is destructive! Back up your data first if needed.

DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS daily_lesson_scores;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS trainees;
DROP TABLE IF EXISTS batches;
DROP TABLE IF EXISTS qualifications;
DROP TABLE IF EXISTS users;

-- Then visit http://localhost/Hohoo-ville/api/setup/ and click Initialize
```

## Files Updated

### PHP API Files
- `/api/role/admin/admin_dashboard.php` - Dashboard statistics API (FIXED)
- `/api/database/db.php` - Database schema with tbl_ prefix (UPDATED)
- `/api/setup/index.php` - Database initialization page (NEW)

### JavaScript Files
- `/frontend/js/admin/admindashboard.js` - API URL path fixed

### Database
- Tables now created with `tbl_` prefix to match code expectations

## Testing the Admin Dashboard

### After Running Database Initialization:

1. **Login as Admin**
   - Username: `admin`
   - Password: `Admin@123`
   - URL: `http://localhost/Hohoo-ville/frontend/login.html`

2. **Verify Admin Pages Display Data**
   - Click "Admin Dashboard" - should see statistics cards and charts
   - Click "View Trainers" - should list trainers (empty initially)
   - Click "View Trainees" - should list trainees (empty initially)
   - Click "Approval Queue" - should show pending enrollments

3. **If Data Still Doesn't Show**
   - Check browser console (F12) for JavaScript errors
   - Check browser Network tab to see if API calls are returning data
   - Verify the database tables were created: `http://localhost/PHPMyAdmin` or similar

## Common Issues & Solutions

### Issue: "Data not loading" or blank tables
**Solution**: Ensure database initialization was completed successfully:
- Visit `http://localhost/Hohoo-ville/api/setup/`
- Check the success message
- Refresh your admin pages

### Issue: API returns "Table 'technical_db.tbl_users' doesn't exist"
**Solution**: This means the migration script ran but tables weren't created. Run the setup again:
1. Visit `http://localhost/Hohoo-ville/api/setup/`
2. Click Initialize Database
3. Wait for the success message

### Issue: Charts on dashboard don't show
**Solution**: This is normal if there's no data yet. Charts will display once you add:
- Trainers
- Qualifications
- Batches
- Trainees with enrollments

### Issue: Still getting 404 or 403 errors
**Solution**: Check that:
1. Path casing is correct: `/Hohoo-ville/` (capital H)
2. API files have proper headers for CORS
3. Your Apache/XAMPP configuration handles the paths correctly

## Default System Credentials

After initialization, use these to log in:
- **Username**: `admin`
- **Password**: `Admin@123`
- **Role**: Administrator

⚠️ **IMPORTANT**: Change these credentials immediately in production!

## Next Steps

1. Run the database initialization script
2. Log in with admin credentials
3. Test the admin pages to verify data displays correctly
4. Add test data (qualifications, trainers, batches, trainees)
5. Verify all admin functions work properly

## For More Help

Check the following for detailed system documentation:
- `/Reads/SYSTEM_FLOW.md` - System architecture and flow
- `/Reads/ADMIN_QUICK_REFERENCE.md` - Admin features reference
- `/Reads/PROJECT_SUMMARY.md` - Project overview
