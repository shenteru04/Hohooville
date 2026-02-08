<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-control-allow-headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get-lessons':
        getLessonsForTrainee($conn);
        break;
    case 'get-quiz':
        getQuizForLesson($conn);
        break;
    case 'get-lesson-content':
        getLessonItem($conn, 'tbl_lesson_contents', 'content_id');
        break;
    case 'get-task-sheet':
        getLessonItem($conn, 'tbl_task_sheets', 'task_sheet_id');
        break;
    case 'get-profile':
        getProfile($conn);
        break;
    case 'submit-quiz':
        submitQuiz($conn);
        break;
    case 'submit-task-sheet':
        submitTaskSheet($conn);
        break;
    case 'unsubmit-task-sheet':
        unsubmitTaskSheet($conn);
        break;
    case 'update-profile':
        updateProfile($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
        break;
}

function getLessonsForTrainee($conn) {
    $traineeId = $_GET['trainee_id'] ?? 0;

    // Find the trainee's course
    $stmt = $conn->prepare("SELECT oc.qualification_id FROM tbl_enrollment e JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id WHERE e.trainee_id = ? AND e.status = 'approved' LIMIT 1");
    $stmt->execute([$traineeId]);
    $qualificationId = $stmt->fetchColumn();

    if (!$qualificationId) {
        echo json_encode(['success' => true, 'data' => []]);
        return;
    }

    // Get modules and lessons for that course that are posted.
    // Also fetch the score if the quiz has been taken by this trainee.
    // Assumes tbl_grades_dtl has `score` and `total_items` columns.
    $query = "SELECT
                m.module_id, m.module_title, m.competency_type,
                l.lesson_id, l.lesson_title, l.posting_date, l.lesson_file_path,
                t.test_id,
                t.deadline as quiz_deadline,
                (SELECT g.score 
                 FROM tbl_grades g 
                 JOIN tbl_test tt ON g.test_id = tt.test_id 
                 WHERE tt.lesson_id = l.lesson_id AND tt.activity_type_id = 1 AND g.trainee_id = ? LIMIT 1) as score,
                (SELECT COUNT(qq.question_id) 
                 FROM tbl_quiz_questions qq 
                 WHERE qq.test_id = t.test_id) as total_questions
              FROM tbl_module m
              JOIN tbl_lessons l ON m.module_id = l.module_id
              LEFT JOIN tbl_test t ON l.lesson_id = t.lesson_id AND t.activity_type_id = 1
              WHERE m.qualification_id = ? AND (l.posting_date IS NULL OR l.posting_date <= NOW())
              ORDER BY m.module_id, l.lesson_id";
    
    try {
        $stmt = $conn->prepare($query);
        $stmt->execute([$traineeId, $qualificationId]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        return;
    }

    // Group lessons by module
    $modules = [];
    $lesson_ids = array_column($results, 'lesson_id');

    $contents = [];
    if (!empty($lesson_ids)) {
        $in = str_repeat('?,', count($lesson_ids) - 1) . '?';
        $content_stmt = $conn->prepare("SELECT lesson_id, content_id, title FROM tbl_lesson_contents WHERE lesson_id IN ($in) ORDER BY display_order, content_id");
        $content_stmt->execute($lesson_ids);
        $all_contents = $content_stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach($all_contents as $c) {
            $contents[$c['lesson_id']][] = $c;
        }
    }

    $task_sheets = [];
    if (!empty($lesson_ids)) {
        $task_sheet_stmt = $conn->prepare("SELECT lesson_id, task_sheet_id, title FROM tbl_task_sheets WHERE lesson_id IN ($in) ORDER BY display_order, task_sheet_id");
        $task_sheet_stmt->execute($lesson_ids);
        $all_task_sheets = $task_sheet_stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach($all_task_sheets as $ts) {
            $task_sheets[$ts['lesson_id']][] = $ts;
        }
    }

    $submission_counts = [];
    $submitted_task_sheet_ids = [];
    if (!empty($lesson_ids)) {
        $status_stmt = $conn->prepare("SELECT lesson_id, COUNT(*) FROM tbl_task_sheet_submissions WHERE trainee_id = ? AND lesson_id IN ($in) AND status IN ('submitted', 'approved') GROUP BY lesson_id");
        $status_stmt->execute(array_merge([$traineeId], $lesson_ids));
        $submission_counts = $status_stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $submitted_stmt = $conn->prepare("SELECT task_sheet_id FROM tbl_task_sheet_submissions WHERE trainee_id = ? AND lesson_id IN ($in) AND status IN ('submitted', 'approved')");
        $submitted_stmt->execute(array_merge([$traineeId], $lesson_ids));
        $submitted_task_sheet_ids = $submitted_stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    foreach ($results as $row) {
        if (!isset($modules[$row['module_id']])) {
            $modules[$row['module_id']] = [
                'module_id' => $row['module_id'],
                'module_title' => $row['module_title'],
                'competency_type' => $row['competency_type'],
                'lessons' => []
            ];
        }

        // Check for deadline expiry
        $score = $row['score'];
        $totalQuestions = $row['total_questions'];
        if ($row['quiz_deadline'] && strtotime($row['quiz_deadline']) < time() && $score === null) {
            $score = 0;
        }

        $totalTaskSheets = isset($task_sheets[$row['lesson_id']]) ? count($task_sheets[$row['lesson_id']]) : 0;
        $submittedCount = $submission_counts[$row['lesson_id']] ?? 0;

        $lesson_task_sheets = $task_sheets[$row['lesson_id']] ?? [];
        foreach ($lesson_task_sheets as &$ts) {
            $ts['is_submitted'] = in_array($ts['task_sheet_id'], $submitted_task_sheet_ids);
        }

        $modules[$row['module_id']]['lessons'][] = [
            'lesson_id' => $row['lesson_id'],
            'lesson_title' => $row['lesson_title'],
            'lesson_contents' => $contents[$row['lesson_id']] ?? [],
            'lesson_file_path' => $row['lesson_file_path'],
            'task_sheets' => $lesson_task_sheets,
            'has_quiz' => !is_null($row['test_id']),
            'score' => $score, // Will be NULL if not taken, or 0 if deadline passed
            'total_questions' => $totalQuestions, // Will be NULL if not taken, or actual count if deadline passed
            'deadline' => $row['quiz_deadline'],
            'task_sheet_status' => ($totalTaskSheets > 0 && $submittedCount >= $totalTaskSheets) ? 'submitted' : null
        ];
    }

    echo json_encode(['success' => true, 'data' => array_values($modules)]);
}

function getLessonItem($conn, $table, $id_column) {
    $id = $_GET['id'] ?? 0;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID is required.']);
        return;
    }
    try {
        $stmt = $conn->prepare("SELECT title, content FROM $table WHERE $id_column = ?");
        $stmt->execute([$id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($item) {
            echo json_encode(['success' => true, 'data' => $item]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Content not found.']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function getProfile($conn) {
    $traineeId = $_GET['trainee_id'] ?? 0;
    if (!$traineeId) {
        echo json_encode(['success' => false, 'message' => 'Trainee ID is required.']);
        return;
    }


    try {
        $query = "SELECT 
                    th.first_name, th.last_name, th.middle_name, th.extension_name,
                    th.sex, 
                    th.email, th.phone_number, th.facebook_account, th.photo_file,
                    td.civil_status, td.birthdate, td.age, 
                    td.birthplace_city, td.birthplace_province, td.nationality,
                    td.house_no_street, td.barangay, td.city_municipality, td.province,
                    tf.educational_attainment, tf.employment_status,
                    u.username,
                    b.batch_name,
                    c.qualification_name as course_name,
                    st.scholarship_name as scholarship_type
                  FROM tbl_trainee_hdr AS th
                  JOIN tbl_trainee_dtl td ON th.trainee_id = td.trainee_id
                  LEFT JOIN tbl_trainee_ftr tf ON th.trainee_id = tf.trainee_id
                  LEFT JOIN tbl_users u ON th.user_id = u.user_id
                  LEFT JOIN tbl_enrollment e ON th.trainee_id = e.trainee_id
                  LEFT JOIN tbl_scholarship_type st ON e.scholarship_type_id = st.scholarship_type_id
                  LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                  LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                  LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                  WHERE th.trainee_id = ?";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([ $traineeId]);
        $trainee = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($trainee) {
            // Construct full address
            $trainee['address'] = implode(', ', array_filter([$trainee['house_no_street'], $trainee['barangay'], $trainee['city_municipality'], $trainee['province']]));
            echo json_encode(['success' => true, 'data' => $trainee]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Trainee not found.']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'API Error: ' . $e->getMessage()]);
    }
}

function updateProfile($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $traineeId = $data['trainee_id'] ?? 0;

    if (!$traineeId) {
        echo json_encode(['success' => false, 'message' => 'Trainee ID is required.']);
        return;
    }

    try {
        // All editable fields (first_name, last_name, email, phone, facebook) are in tbl_trainee_hdr
        $query = "UPDATE tbl_trainee_hdr 
                  SET first_name = ?, last_name = ?, email = ?, phone_number = ?, facebook_account = ?
                  WHERE trainee_id = ?";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([
            $data['first_name'] ?? null, 
            $data['last_name'] ?? null, 
            $data['email'] ?? null, 
            $data['phone'] ?? null, 
            $data['facebook'] ?? null, 
            $traineeId
        ]);

        echo json_encode(['success' => true, 'message' => 'Profile updated successfully.']);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to update profile: ' . $e->getMessage()]);
    }
}

function getQuizForLesson($conn) {
    $lessonId = $_GET['lesson_id'] ?? 0;

    $testStmt = $conn->prepare("SELECT test_id FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1 LIMIT 1");
    $testStmt->execute([$lessonId]);
    $testId = $testStmt->fetchColumn();

    if (!$testId) {
        echo json_encode(['success' => false, 'message' => 'No quiz found for this lesson.']);
        return;
    }

    $qStmt = $conn->prepare("SELECT question_id, question_text FROM tbl_quiz_questions WHERE test_id = ?");
    $qStmt->execute([$testId]);
    $questions = $qStmt->fetchAll(PDO::FETCH_ASSOC);

    $oStmt = $conn->prepare("SELECT option_id, option_text FROM tbl_quiz_options WHERE question_id = ?");

    foreach ($questions as &$q) {
        $oStmt->execute([$q['question_id']]);
        $q['options'] = $oStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode(['success' => true, 'data' => $questions]);
}

function submitQuiz($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $traineeId = $data['trainee_id'] ?? 0;
    $lessonId = $data['lesson_id'] ?? 0;
    $answers = $data['answers'] ?? []; // Expected format: ['question_id' => 'option_id', ...]

    // Server-side guard against deadline
    $stmtDeadline = $conn->prepare("SELECT deadline FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1");
    $stmtDeadline->execute([$lessonId]);
    $deadline = $stmtDeadline->fetchColumn();

    if ($deadline && strtotime($deadline) < time()) {
        echo json_encode(['success' => false, 'message' => 'The deadline for this quiz has passed.']);
        return;
    }

    // Server-side guard against re-submission
    $checkStmt = $conn->prepare("
        SELECT g.score FROM tbl_grades g
        JOIN tbl_test tt ON g.test_id = tt.test_id
        WHERE g.trainee_id = ? AND tt.lesson_id = ? AND tt.activity_type_id = 1
    ");
    $checkStmt->execute([$traineeId, $lessonId]);
    if ($checkStmt->fetchColumn() !== false) {
        echo json_encode(['success' => false, 'message' => 'You have already submitted this quiz.']);
        return;
    }

    $score = 0;
    $totalQuestions = count($answers);

    $stmt = $conn->prepare("SELECT is_correct FROM tbl_quiz_options WHERE option_id = ? AND question_id = ?");

    foreach ($answers as $questionId => $optionId) {
        $stmt->execute([$optionId, $questionId]);
        $isCorrect = $stmt->fetchColumn();
        if ($isCorrect) {
            $score++;
        }
    }

    $finalScore = ($totalQuestions > 0) ? ($score / $totalQuestions) * 100 : 0;

    // --- Save the grade ---
    try {
        $conn->beginTransaction();

        // 1. Find course_id for trainee.
        $stmtCourse = $conn->prepare("SELECT oc.qualification_id FROM tbl_enrollment e JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id WHERE e.trainee_id = ? LIMIT 1");
        $stmtCourse->execute([$traineeId]);
        $qualificationId = $stmtCourse->fetchColumn();
        if (!$qualificationId) throw new Exception('Could not find course for trainee.');

        // 2. Find test_id for lesson.
        $stmtTest = $conn->prepare("SELECT test_id FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1 LIMIT 1");
        $stmtTest->execute([$lessonId]);
        $testId = $stmtTest->fetchColumn();
        if (!$testId) throw new Exception('Could not find test for this lesson.');

        // 3. Insert into tbl_grades.
        $stmtGrade = $conn->prepare("INSERT INTO tbl_grades (trainee_id, qualification_id, test_id, score, date_recorded) VALUES (?, ?, ?, ?, NOW())");
        $stmtGrade->execute([$traineeId, $qualificationId, $testId, $score]);

        $conn->commit();

        echo json_encode(['success' => true, 'message' => 'Quiz submitted!', 'data' => ['score' => $score, 'total_questions' => $totalQuestions, 'percentage' => round($finalScore)]]);

    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'message' => 'Failed to save quiz results: ' . $e->getMessage()]);
    }
}

function submitTaskSheet($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $traineeId = $data['trainee_id'] ?? null;
        $lessonId = $data['lesson_id'] ?? null;
        $taskSheetId = $data['task_sheet_id'] ?? null;
        $content = $data['submitted_content'] ?? '';

        if (!$traineeId || !$lessonId || !$taskSheetId) {
            throw new Exception('Missing required fields');
        }

        // Insert into tbl_task_sheet_submissions
        // Using ON DUPLICATE KEY UPDATE to handle re-submissions
        $stmt = $conn->prepare("
            INSERT INTO tbl_task_sheet_submissions (lesson_id, task_sheet_id, trainee_id, submitted_content, submission_date, status) 
            VALUES (?, ?, ?, ?, NOW(), 'submitted')
            ON DUPLICATE KEY UPDATE 
                submitted_content = VALUES(submitted_content),
                submission_date = NOW(),
                status = 'submitted'
        ");
        $stmt->execute([$lessonId, $taskSheetId, $traineeId, $content]);

        // --- Notification Logic ---
        try {
            // 1. Get Trainee Name
            $stmtTrainee = $conn->prepare("SELECT CONCAT(first_name, ' ', last_name) as full_name FROM tbl_trainee_hdr WHERE trainee_id = ?");
            $stmtTrainee->execute([$traineeId]);
            $traineeName = $stmtTrainee->fetchColumn();

            // 2. Get Task Sheet Title
            $stmtTask = $conn->prepare("SELECT title FROM tbl_task_sheets WHERE task_sheet_id = ?");
            $stmtTask->execute([$taskSheetId]);
            $taskTitle = $stmtTask->fetchColumn();

            // 3. Get Trainer User ID linked to the batch
            // Assuming tbl_batch has trainer_id and tbl_trainer_hdr has user_id
            $stmtTrainer = $conn->prepare("
                SELECT th.user_id 
                FROM tbl_enrollment e
                JOIN tbl_batch b ON e.batch_id = b.batch_id
                JOIN tbl_trainer th ON b.trainer_id = th.trainer_id
                WHERE e.trainee_id = ? AND e.status = 'approved'
                LIMIT 1
            ");
            $stmtTrainer->execute([$traineeId]);
            $trainerUserId = $stmtTrainer->fetchColumn();

            if ($trainerUserId) {
                // Ensure notifications table exists
                $conn->exec("CREATE TABLE IF NOT EXISTS tbl_notifications (
                    notification_id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    title VARCHAR(255),
                    message TEXT,
                    link VARCHAR(255),
                    is_read TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )");

                $notifTitle = "Task Sheet Submitted";
                $notifMessage = "$traineeName submitted task sheet: $taskTitle";
                $notifLink = "/Hohoo-ville/frontend/html/trainer/pages/grading.html"; 

                $stmtNotif = $conn->prepare("INSERT INTO tbl_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)");
                $stmtNotif->execute([$trainerUserId, $notifTitle, $notifMessage, $notifLink]);
            }
        } catch (Exception $e) {
            // Log error but do not disrupt submission
            error_log("Notification Error: " . $e->getMessage());
        }

        echo json_encode(['success' => true, 'message' => 'Task sheet submitted successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}


function unsubmitTaskSheet($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $traineeId = $data['trainee_id'] ?? 0;
    $lessonId = $data['lesson_id'] ?? 0;
    $taskSheetId = $data['task_sheet_id'] ?? 0;

    if (!$traineeId || !$lessonId) {
        echo json_encode(['success' => false, 'message' => 'Missing required information.']);
        http_response_code(400);
        return;
    }

    try {
        if ($taskSheetId) {
            $sql = "DELETE FROM tbl_task_sheet_submissions WHERE lesson_id = ? AND trainee_id = ? AND task_sheet_id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$lessonId, $traineeId, $taskSheetId]);
        } else {
            $sql = "DELETE FROM tbl_task_sheet_submissions WHERE lesson_id = ? AND trainee_id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$lessonId, $traineeId]);
        }

        echo json_encode(['success' => true, 'message' => 'Submission removed successfully.']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        http_response_code(500);
    }
}
?>