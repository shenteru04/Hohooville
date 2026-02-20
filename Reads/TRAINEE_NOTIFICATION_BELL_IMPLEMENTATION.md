# Trainee Notification Bell Implementation

## Summary
The notification bell has been successfully added to all trainee pages. Trainees will now see a bell icon in the top navbar of each page that displays notifications when trainers post learning materials.

## Files Created/Modified

### 1. **New Component File**
- **Location**: [frontend/html/trainee/components/notification.html](frontend/html/trainee/components/notification.html)
- **Purpose**: Reusable notification bell component
- **Features**:
  - Bell icon with badge counter
  - Dropdown menu showing notifications
  - Mark all as read button
  - View all notifications link

### 2. **Updated JavaScript File**
- **Location**: [frontend/js/notifications.js](frontend/js/notifications.js)
- **Changes**:
  - Changed API endpoint to use central `/Hohoo-ville/api/notifications.php`
  - Updated to work for all user roles (trainer, registrar, admin, trainee)
  - Fixed unread count calculation
  - Improved date/time formatting
  - Better notification UI rendering

### 3. **Updated Trainee Pages**
All four trainee pages now include the notification bell:

1. **[frontend/html/trainee/trainee_dashboard.html](frontend/html/trainee/trainee_dashboard.html)**
   - Added notification container div
   - Added notification component loader script
   - Added notifications.js script

2. **[frontend/html/trainee/pages/my_training.html](frontend/html/trainee/pages/my_training.html)**
   - Added notification container div
   - Added notification component loader script
   - Added notifications.js script

3. **[frontend/html/trainee/pages/my_grades.html](frontend/html/trainee/pages/my_grades.html)**
   - Added notification container div
   - Added notification component loader script
   - Added notifications.js script

4. **[frontend/html/trainee/pages/profile.html](frontend/html/trainee/pages/profile.html)**
   - Added notification container div
   - Added notification component loader script
   - Added notifications.js script

## How It Works

### Notification Display Flow
```
1. Page loads → Fetch notification.html component
2. Component loaded → Load notifications.js script
3. DOMContentLoaded event fires
4. Script gets user from localStorage
5. API call to /Hohoo-ville/api/notifications.php?action=get&user_id={userId}
6. Notifications rendered in dropdown
7. Poll every 30 seconds for new notifications
```

### Notification Features
- **Real-time updates**: Polls every 30 seconds
- **Badge counter**: Shows number of unread notifications
- **Dropdown list**: Shows notification details (title, message, timestamp)
- **Mark as read**: Clicking a notification marks it as read
- **Links**: Notifications can link to relevant pages
- **Unread indicator**: Unread notifications are bolded

### Notification Types (from previous implementation)
- **Information Sheet Posted**: Sent when trainer posts lesson content
- **Task Sheet Posted**: Sent when trainer adds task sheets
- **Quiz Posted**: Sent when trainer creates/posts quizzes
- **Only when posting date/time has passed**: No future notifications

## API Integration

### Endpoint
All pages use the central notification API:
- **URL**: `/Hohoo-ville/api/notifications.php`
- **Supported actions**:
  - `action=get&user_id={userId}` - Get notifications for user
  - `action=markRead&id={notificationId}` - Mark notification as read
  - `action=markAll&user_id={userId}` - Mark all as read

### Response Format
```json
[
  {
    "id": 1,
    "user_id": 5,
    "title": "Information Sheet Posted",
    "message": "Information Sheet 'Learning basics' has been posted for your lesson.",
    "link": "/Hohoo-ville/frontend/html/trainee/pages/my_training.html",
    "is_read": 0,
    "time": "2026-02-17 14:30:00"
  }
]
```

## Browser Console
No errors should appear in the browser console. If you see errors:
- Verify axios is loaded
- Check that localStorage has user data
- Verify API endpoint is accessible

## Testing Checklist

✅ Notification bell appears on all trainee pages
✅ Bell shows in top navbar next to user dropdown
✅ Badge counter shows when unread notifications exist
✅ Clicking notification marks it as read
✅ Notifications update every 30 seconds
✅ Unread notifications are bolded
✅ Old notifications appear below new ones
✅ "No notifications" message appears when list is empty

## Future Enhancements
- Add notification preferences
- Sound/browser notifications
- Email digest option
- Per-page notification filtering
