# Quick Start Checklist - Admin Dashboard Fix

Copy and follow these steps in order:

## ✅ Step 1: Initialize Database (MUST DO FIRST)
- [ ] Open browser and go to: `http://localhost/Hohoo-ville/api/setup/`
- [ ] Click the blue "Initialize Database" button
- [ ] Wait for the success message
- [ ] You should see: "Database successfully migrated to use tbl_ prefixed tables!"

## ✅ Step 2: Verify Database Setup
- [ ] Open: `http://localhost/Hohoo-ville/api/role/admin/test_api.php`
- [ ] Check that you see "READY ✓" at the bottom
- [ ] All tables should show "EXISTS ✓"
- [ ] If you see errors, run Step 1 again

## ✅ Step 3: Login to Admin
- [ ] Go to: `http://localhost/Hohoo-ville/frontend/login.html`
- [ ] Username: `admin`
- [ ] Password: `Admin@123`
- [ ] Click Login

## ✅ Step 4: Verify Admin Pages Display
- [ ] You should see the Admin Dashboard
- [ ] Check these pages load (they'll show empty data, which is normal):
  - [ ] Admin Dashboard
  - [ ] View Trainers
  - [ ] View Trainees  
  - [ ] View Batches
  - [ ] Approval Queue
  - [ ] Manage Qualifications

## ✅ Step 5: Add Test Data (Optional)
To see the dashboard with actual data:
- [ ] Go to "Manage Qualifications" → Add a course
- [ ] Go to "View Trainers" → Add a trainer
- [ ] Go to "View Batches" → Create a batch
- [ ] Go to Start Form → Add a trainee → Enroll in batch
- [ ] Return to Dashboard → See statistics update

## ⚠️ Step 6: Change Admin Password (IMPORTANT!)
In production, ALWAYS change the default password:
- [ ] Login as admin (if not already logged in)
- [ ] Go to Profile → Settings
- [ ] Change password from `Admin@123` to something secure

---

## If Something Goes Wrong

### Problem: "Table doesn't exist" error
1. Go to: `http://localhost/Hohoo-ville/api/setup/`
2. Click "Initialize Database" again
3. Refresh the page that showed the error

### Problem: Empty data in tables
- This is NORMAL! Database is empty initially
- Add sample data through the forms
- Data will appear once you add it

### Problem: 404 errors when loading pages
- Check spelling of folder: Should be `/Hohoo-ville/` (capital H)
- Check file path in Apache/XAMPP configuration

### Problem: "Database connection failed"
- Ensure MySQL/MariaDB is running
- Check database credentials in `/api/database/db.php`
- Verify database `technical_db` exists

---

## What Was Fixed

✅ Database tables now use correct naming (`tbl_` prefix)
✅ Admin API endpoints now work correctly
✅ Admin JavaScript now points to correct API URLs
✅ Database initialization is now automated

---

## Key Files You Can Reference

- **Setup Guide**: `ADMIN_SETUP_GUIDE.md`
- **Detailed Summary**: `ADMIN_FIXES_SUMMARY.md`  
- **Test API**: `http://localhost/Hohoo-ville/api/role/admin/test_api.php`
- **Database Init**: `http://localhost/Hohoo-ville/api/setup/`

---

## Done? 

When all checkmarks are complete, your admin dashboard should be fully functional!

For detailed troubleshooting, see `ADMIN_SETUP_GUIDE.md`

Good luck! 🚀
