# Quick Start: Profile Image Upload

## 1. Apply Database Migration

Run this SQL migration to add the `profile_image` column to the database:

```bash
# Option 1: Using MySQL command line
mysql -u root technical_db < api/database/migration_add_profile_image.sql

# Option 2: Using phpMyAdmin
# - Open phpMyAdmin
# - Select 'technical_db' database  
# - Go to Import tab
# - Choose file: api/database/migration_add_profile_image.sql
# - Click Import
```

## 2. Create Upload Directory (if needed)

```bash
mkdir -p uploads/profile_images
chmod 755 uploads/profile_images
```

## 3. Test the Feature

1. **For Admin/Registrar**:
   - Navigate to `/Hohoo-ville/frontend/html/admin/pages/profile.html` (or registrar equivalent)
   - Look for "Profile Photo" section
   - Click the image to select a photo
   - Click "Upload Photo"

2. **For Trainer**:
   - Navigate to `/Hohoo-ville/frontend/html/trainer/pages/profile.html`
   - Click profile photo section
   - Upload image

3. **For Trainee**:
   - Navigate to `/Hohoo-ville/frontend/html/trainee/pages/profile.html`
   - Click profile photo section
   - Upload image

## 4. Verify It Works

After uploading:
- Image should display immediately in the profile photo section
- Refresh the page - image should persist
- Image file should exist in `/uploads/profile_images/`

## Key Files to Know

- **Database**: `api/database/migration_add_profile_image.sql`
- **Upload API**: `api/utils/upload_profile_image.php`
- **Shared JS**: `frontend/js/profile-image-upload.js`
- **Profile Pages**: `frontend/html/{role}/pages/profile.html`

## What Users Can Do

✅ Upload profile photo (JPEG, PNG, GIF, WebP)  
✅ Max 5MB file size  
✅ See live preview before uploading  
✅ Click image to change photo  
✅ Old photos automatically deleted when new one uploaded  

## Support

For detailed technical information, see: `PROFILE_IMAGE_IMPLEMENTATION.md`
