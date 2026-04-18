# Profile Image Upload Implementation Guide

## Overview
This document outlines the complete implementation of profile image upload functionality for all user roles (Admin, Registrar, Trainer, and Trainee) in the Hohoo-Ville system.

## What Was Implemented

### 1. Database Changes
**File**: `api/database/migration_add_profile_image.sql`

Added a new `profile_image` column to three tables:
- `tbl_employee` - stores profile images for Admin and Registrar users
- `tbl_trainer` - stores profile images for Trainers
- `tbl_trainee_hdr` - stores profile images for Trainees

**To Apply the Migration**:
```sql
-- Run this file in your MySQL client (phpMyAdmin or command line):
mysql -u root technical_db < api/database/migration_add_profile_image.sql

-- Or execute the SQL directly in phpMyAdmin by importing the file
```

### 2. API Implementation

#### Upload Handler
**File**: `api/utils/upload_profile_image.php`

This endpoint handles profile image uploads for all user roles:

**Endpoint**: `POST /api/utils/upload_profile_image.php`

**Parameters**:
- `profile_image` (file): The image file to upload
- `role` (string): User role - `admin`, `registrar`, `trainer`, or `trainee`
- `user_id` (int): The user ID
- `identifier` (optional): Trainer ID or Trainee ID

**Supported Image Types**: JPEG, PNG, GIF, WebP
**Maximum File Size**: 5MB

**Response**:
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "filename": "admin_1_1234567890.jpg",
  "url": "/Hohoo-ville/uploads/profile_images/admin_1_1234567890.jpg"
}
```

#### Profile API Updates
Updated the following files to support profile_image:

- **Admin**: `api/role/admin/profile.php` - Get and Update actions
- **Registrar**: `api/role/registrar/profile.php` - Get and Update actions  
- **Trainer**: `api/role/trainer/profile.php` - Get and Update actions
- **Trainee**: `api/role/trainee/profile.php` - Get and Update actions

All profile endpoints now return the `profile_image` field when retrieving user profiles.

### 3. Frontend Implementation

#### JavaScript Utility
**File**: `frontend/js/profile-image-upload.js`

Shared utility functions for handling profile image uploads:
- `uploadProfileImage()` - Upload image to server
- `getProfileImageUrl()` - Get full URL to uploaded image
- `createProfileImagePreview()` - Generate image preview HTML

#### Updated Profile Pages

1. **Admin Profile**: `frontend/html/admin/pages/profile.html`
   - Added profile image upload section
   - Upload button enabled after file selection
   - Live preview of selected image

2. **Registrar Profile**: `frontend/html/registrar/pages/profile.html`
   - Added profile image upload section
   - Same functionality as admin profile

3. **Trainer Profile**: `frontend/html/trainer/pages/profile.html`
   - Added profile image upload section
   - Click image to upload, same as other roles

4. **Trainee Profile**: `frontend/html/trainee/pages/profile.html`
   - Added profile image upload section
   - Same user experience as other roles

#### Updated JavaScript Files

- `frontend/js/admin/pages/profile.js` - Added `setupProfileImageUpload()`
- `frontend/js/registrar/pages/profile.js` - Added `setupProfileImageUpload()`
- `frontend/js/trainer/pages/profile.js` - Added `setupProfileImageUpload()`
- `frontend/js/trainee/pages/profile.js` - Added `setupProfileImageUpload()`

## Usage Instructions

### For Users

1. **Navigate to Profile Page**
   - Admin: Access admin profile page
   - Registrar: Access registrar profile page
   - Trainer: Access trainer profile page
   - Trainee: Access trainee profile page

2. **Upload Profile Photo**
   - Locate the "Profile Photo" section
   - Click on the profile image placeholder
   - Select a photo from your computer (JPEG, PNG, GIF, or WebP)
   - The image preview will appear immediately
   - Click "Upload Photo" button to save

3. **View Profile Photo**
   - Profile photos appear in:
     - Profile header section
     - User profile information display
     - Wherever profile images are referenced in the system

### For Developers

#### API Call Example (JavaScript)
```javascript
// Using the utility function
const file = document.getElementById('profileImageInput').files[0];
const user = JSON.parse(localStorage.getItem('user'));

try {
  const response = await uploadProfileImage(
    file,
    user.role,  // 'admin', 'registrar', 'trainer', or 'trainee'
    user.user_id,
    user.trainee_id  // Only needed for trainees
  );
  console.log('Upload successful:', response.url);
} catch (error) {
  console.error('Upload failed:', error.message);
}
```

#### Direct API Call
```bash
curl -X POST /Hohoo-ville/api/utils/upload_profile_image.php \
  -F "profile_image=@/path/to/image.jpg" \
  -F "role=admin" \
  -F "user_id=1"
```

## File Locations

### New Files Created
- `api/database/migration_add_profile_image.sql` - Database migration
- `api/utils/upload_profile_image.php` - Upload API endpoint
- `frontend/js/profile-image-upload.js` - Shared JavaScript utility

### Modified Files
- `api/role/admin/profile.php`
- `api/role/registrar/profile.php`
- `api/role/trainer/profile.php`
- `api/role/trainee/profile.php`
- `frontend/html/admin/pages/profile.html`
- `frontend/html/registrar/pages/profile.html`
- `frontend/html/trainer/pages/profile.html`
- `frontend/html/trainee/pages/profile.html`
- `frontend/js/admin/pages/profile.js`
- `frontend/js/registrar/pages/profile.js`
- `frontend/js/trainer/pages/profile.js`
- `frontend/js/trainee/pages/profile.js`

## Storage

Profile images are stored in: `/uploads/profile_images/`

**Filename Format**: `{role}_{user_id}_{timestamp}.{extension}`

Examples:
- `admin_1_1234567890.jpg`
- `registrar_2_1234567891.png`
- `trainer_3_1234567892.gif`
- `trainee_4_1234567893.webp`

## Security Features

1. **File Type Validation**
   - Checked on both client and server side
   - Only JPEG, PNG, GIF, WebP allowed

2. **File Size Limit**
   - Maximum 5MB per image

3. **File Content Validation**
   - MIME type verified using `finfo` to prevent disguised files

4. **Old Image Cleanup**
   - Automatically deletes previous profile image when a new one is uploaded

5. **Database Isolation**
   - Profile images stored separately per role

## Testing Checklist

- [ ] Run database migration to add `profile_image` column
- [ ] Test admin profile image upload
- [ ] Test registrar profile image upload
- [ ] Test trainer profile image upload
- [ ] Test trainee profile image upload
- [ ] Verify file size validation (test with file > 5MB)
- [ ] Verify file type validation (try uploading non-image)
- [ ] Verify old image is deleted when new one uploaded
- [ ] Verify images persist after page reload
- [ ] Test with different image formats (JPEG, PNG, GIF, WebP)

## Troubleshooting

### Upload Directory Issues
If you see permission denied errors:
```bash
# Create the directory if it doesn't exist
mkdir -p /path/to/xampp/htdocs/Hohoo-ville/uploads/profile_images
chmod 755 /path/to/xampp/htdocs/Hohoo-ville/uploads/profile_images
```

### Database Column Missing
If you get SQL errors about missing column:
```sql
-- Run the migration file:
mysql -u root technical_db < api/database/migration_add_profile_image.sql
```

### Images Not Displaying
1. Check that the `profile_image` value is returned from the API
2. Verify file exists in `/uploads/profile_images/` directory
3. Check browser console for image loading errors
4. Ensure file permissions allow reading

### Upload Fails
1. Check file size is under 5MB
2. Verify file type is JPEG, PNG, GIF, or WebP
3. Ensure upload directory has write permissions
4. Check server error logs for details

## API Response Examples

### Successful Upload
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "filename": "admin_1_1682345678.jpg",
  "url": "/Hohoo-ville/uploads/profile_images/admin_1_1682345678.jpg"
}
```

### Error Response
```json
{
  "success": false,
  "message": "File size exceeds maximum limit (5MB)"
}
```

## Future Enhancements

Consider implementing:
1. Image cropping/resizing tool
2. Bulk profile image uploads
3. Image compression for optimization
4. Advanced image filters
5. Gravatar integration as fallback
6. Multiple profile image history/versions

## Support

For issues or questions about the profile image upload functionality, please refer to the API documentation or contact the development team.
