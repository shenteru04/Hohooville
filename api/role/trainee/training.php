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
    $stmt = $conn->prepare("SELECT oc.course_id FROM tbl_enrollment e JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id WHERE e.trainee_id = ? AND e.status = 'approved' LIMIT 1");
    $stmt->execute([$traineeId]);
    $courseId = $stmt->fetchColumn();

    if (!$courseId) {
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
                (SELECT gd.score 
                 FROM tbl_grades_dtl gd 
                 JOIN tbl_test tt ON gd.test_id = tt.test_id 
                 JOIN tbl_grades_hdr gh ON gd.grades_hdr_id = gh.grades_hdr_id 
                 WHERE tt.lesson_id = l.lesson_id AND tt.activity_type_id = 1 AND gh.trainee_id = ? LIMIT 1) as score,
                (SELECT COUNT(qq.question_id) 
                 FROM tbl_quiz_questions qq 
                 WHERE qq.test_id = t.test_id) as total_questions
              FROM tbl_module m
              JOIN tbl_lessons l ON m.module_id = l.module_id
              LEFT JOIN tbl_test t ON l.lesson_id = t.lesson_id AND t.activity_type_id = 1
              WHERE m.course_id = ? AND (l.posting_date IS NULL OR l.posting_date <= NOW())
              ORDER BY m.module_id, l.lesson_id";
    
    $stmt = $conn->prepare($query);
    $stmt->execute([$traineeId, $courseId]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

    $submission_statuses = [];
    if (!empty($lesson_ids)) {
        $status_stmt = $conn->prepare("SELECT lesson_id, status FROM tbl_task_sheet_submissions WHERE trainee_id = ? AND lesson_id IN ($in)");
        $status_stmt->execute(array_merge([$traineeId], $lesson_ids));
        $submission_statuses = $status_stmt->fetchAll(PDO::FETCH_KEY_PAIR);
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

        $modules[$row['module_id']]['lessons'][] = [
            'lesson_id' => $row['lesson_id'],
            'lesson_title' => $row['lesson_title'],
            'lesson_contents' => $contents[$row['lesson_id']] ?? [],
            'lesson_file_path' => $row['lesson_file_path'],
            'task_sheets' => $task_sheets[$row['lesson_id']] ?? [],
            'has_quiz' => !is_null($row['test_id']),
            'score' => $score, // Will be NULL if not taken, or 0 if deadline passed
            'total_questions' => $totalQuestions, // Will be NULL if not taken, or actual count if deadline passed
            'deadline' => $row['quiz_deadline'],
            'task_sheet_status' => $submission_statuses[$row['lesson_id']] ?? null
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
                    c.course_name,
                    st.scholarship_name as scholarship_type
                  FROM tbl_trainee_hdr AS th
                  JOIN tbl_trainee_dtl td ON th.trainee_id = td.trainee_id
                  LEFT JOIN tbl_trainee_ftr tf ON th.trainee_id = tf.trainee_id
                  LEFT JOIN tbl_users u ON th.user_id = u.user_id
                  LEFT JOIN tbl_enrollment e ON th.trainee_id = e.trainee_id
                  LEFT JOIN tbl_scholarship_type st ON e.scholarship_type_id = st.scholarship_type_id
                  LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                  LEFT JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id
                  LEFT JOIN tbl_course c ON oc.course_id = c.course_id
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
        SELECT gd.score FROM tbl_grades_dtl gd
        JOIN tbl_test tt ON gd.test_id = tt.test_id
        JOIN tbl_grades_hdr gh ON gd.grades_hdr_id = gh.grades_hdr_id
        WHERE gh.trainee_id = ? AND tt.lesson_id = ? AND tt.activity_type_id = 1
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
        $stmtCourse = $conn->prepare("SELECT oc.course_id FROM tbl_enrollment e JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id WHERE e.trainee_id = ? LIMIT 1");
        $stmtCourse->execute([$traineeId]);
        $courseId = $stmtCourse->fetchColumn();
        if (!$courseId) throw new Exception('Could not find course for trainee.');

        // 2. Find/Create grades_hdr_id for trainee and course.
        $stmtHdr = $conn->prepare("SELECT grades_hdr_id FROM tbl_grades_hdr WHERE trainee_id = ? AND course_id = ?");
        $stmtHdr->execute([$traineeId, $courseId]);
        $gradesHdrId = $stmtHdr->fetchColumn();
        if (!$gradesHdrId) {
            $stmtInsertHdr = $conn->prepare("INSERT INTO tbl_grades_hdr (trainee_id, course_id, date_recorded) VALUES (?, ?, NOW())");
            $stmtInsertHdr->execute([$traineeId, $courseId]);
            $gradesHdrId = $conn->lastInsertId();
        }

        // 3. Find test_id for lesson.
        $stmtTest = $conn->prepare("SELECT test_id FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1 LIMIT 1");
        $stmtTest->execute([$lessonId]);
        $testId = $stmtTest->fetchColumn();
        if (!$testId) throw new Exception('Could not find test for this lesson.');

        // 4. Insert into tbl_grades_dtl. Assumes table has `total_items` and `date_taken` columns.
        $stmtGrade = $conn->prepare("INSERT INTO tbl_grades_dtl (grades_hdr_id, test_id, score) VALUES (?, ?, ?)");
        $stmtGrade->execute([$gradesHdrId, $testId, $score]);

        $conn->commit();

        echo json_encode(['success' => true, 'message' => 'Quiz submitted!', 'data' => ['score' => $score, 'total_questions' => $totalQuestions, 'percentage' => round($finalScore)]]);

    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'message' => 'Failed to save quiz results: ' . $e->getMessage()]);
    }
}

function submitTaskSheet($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $traineeId = $data['trainee_id'] ?? 0;
    $lessonId = $data['lesson_id'] ?? 0;
    $submittedContent = $data['submitted_content'] ?? '';

    if (!$traineeId || !$lessonId) {
        echo json_encode(['success' => false, 'message' => 'Missing required information.']);
        return;
    }

    try {
        // Use INSERT ... ON DUPLICATE KEY UPDATE to handle both new submissions and resubmissions.
        // This resets the grade if a trainee resubmits.
        $sql = "INSERT INTO tbl_task_sheet_submissions (lesson_id, trainee_id, submitted_content, status)
                VALUES (?, ?, ?, 'submitted')
                ON DUPLICATE KEY UPDATE submitted_content = VALUES(submitted_content), submission_date = NOW(), status = 'submitted', grade = NULL, remarks = NULL, graded_by = NULL, grade_date = NULL";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([$lessonId, $traineeId, $submittedContent]);

        echo json_encode(['success' => true, 'message' => 'Task sheet submitted successfully.']);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function unsubmitTaskSheet($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $traineeId = $data['trainee_id'] ?? 0;
    $lessonId = $data['lesson_id'] ?? 0;

    if (!$traineeId || !$lessonId) {
        echo json_encode(['success' => false, 'message' => 'Missing required information.']);
        http_response_code(400);
        return;
    }

    try {
        $sql = "DELETE FROM tbl_task_sheet_submissions WHERE lesson_id = ? AND trainee_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$lessonId, $traineeId]);

        echo json_encode(['success' => true, 'message' => 'Submission removed successfully.']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        http_response_code(500);
    }
}
?>