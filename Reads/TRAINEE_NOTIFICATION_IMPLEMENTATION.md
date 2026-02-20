# Trainee Notification System Implementation

## Overview
Trainees now receive automatic notifications when trainers post learning materials (information sheets, quizzes, and task sheets). Notifications are only sent if the posting date/time has already passed.

## Implementation Details

### Location
**File**: `api/role/trainer/modules.php`

### How It Works

#### 1. **New Helper Function: `notifyTraineesAboutLesson()`**
This function handles all notification logic:

```php
function notifyTraineesAboutLesson($conn, $lessonId, $contentType, $contentTitle)
```

**Parameters:**
- `$conn` - Database connection
- `$lessonId` - The lesson ID that content is being posted to
- `$contentType` - Type of content: "Information Sheet", "Task Sheet", or "Quiz"
- `$contentTitle` - Title of the posted content

**Process:**
1. Fetches the lesson's posting date and qualification ID
2. **Validates posting date**: Only sends notifications if current time >= posting date/time
3. Queries approved trainees enrolled in batches with the same qualification
4. Creates `tbl_notifications` table if it doesn't exist
5. Inserts notification records for each trainee linking to their training page

**Notification Details:**
- **Title**: `"{ContentType} Posted"` (e.g., "Information Sheet Posted")
- **Message**: `"{ContentType} '{Title}' has been posted for your lesson."`
- **Link**: `/Hohoo-ville/frontend/html/trainee/pages/my_training.html`

#### 2. **Integration Points**

##### In `saveContentItem()` function (Lines 300-333):
When trainers save information sheets or task sheets:
```php
// Determine content type for notification
$contentType = ($table === 'tbl_lesson_contents') ? 'Information Sheet' : 'Task Sheet';

// Notify trainees if posting date has passed
notifyTraineesAboutLesson($conn, $lessonId, $contentType, $title);
```

##### In `saveLessonSettingsAndQuiz()` function (Lines 278-281):
When trainers post quizzes:
```php
// Notify trainees if posting date has passed
notifyTraineesAboutLesson($conn, $lessonId, 'Quiz', 'Quiz Posted');
```

### Key Features

✅ **Time-Based Notifications**: Only notifies when posting date/time has arrived
✅ **Batch-Based Targeting**: Notifies all approved trainees in batches with matching qualification
✅ **Content Type Support**: Handles Information Sheets, Task Sheets, and Quizzes
✅ **Error Handling**: Errors don't disrupt main operations (logged to error_log)
✅ **Automatic Table Creation**: Creates `tbl_notifications` if it doesn't exist
✅ **Transaction Safety**: Uses database transactions to ensure data consistency

### Database Schema

The implementation uses the existing `tbl_notifications` table with these fields:
- `notification_id` - Auto-incrementing primary key
- `user_id` - Trainee's user ID
- `title` - Notification title
- `message` - Notification message
- `link` - Link to training page
- `is_read` - Read status (0 = unread, 1 = read)
- `created_at` - Timestamp of creation

### Data Flow

```
Trainer Posts Content → saveContentItem()/saveLessonSettingsAndQuiz() 
    ↓
notifyTraineesAboutLesson() called
    ↓
Check if posting_date <= current_time
    ↓ (if yes)
Get all approved trainees in matching batches
    ↓
Insert notification records in tbl_notifications
    ↓
Trainees see notifications in their notification panel
```

### Frontend Integration

Trainees will see notifications in their training dashboard through the existing notification system:
- Notification appears in the bell icon with badge counter
- Clicking notification link redirects to training page
- Trainees can mark notifications as read

### Testing Checklist

- [ ] Post information sheet with posting date = current time → Trainees notified
- [ ] Post information sheet with posting date = future → Trainees NOT notified
- [ ] Post quiz with posting date = past → Trainees notified
- [ ] Post task sheet with posting date = future → Trainees NOT notified
- [ ] Verify notification message is accurate
- [ ] Verify link directs to correct page
- [ ] Check database has notification records in `tbl_notifications`
- [ ] Verify only approved trainees receive notifications

### Future Enhancements

- Add email notifications alongside in-app notifications
- Allow trainers to send custom notifications to specific trainees
- Add notification preferences/settings for trainees
- Implement push notifications
