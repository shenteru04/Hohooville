<?php
session_start();
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-control-allow-headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';
require_once '../../utils/EmailService.php';
require_once '../../utils/trainer_assignment_helper.php';

const QUIZ_MAX_RETRIES = 3;
const QUIZ_MAX_ATTEMPTS = QUIZ_MAX_RETRIES + 1;

$database = new Database();
$conn = $database->getConnection();
ta_ensure_schema($conn);
authenticateTrainee($conn);

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

function traineeModuleStatusColumnExists($conn) {
    static $exists = null;
    if ($exists !== null) {
        return $exists;
    }

    try {
        $stmt = $conn->prepare("SHOW COLUMNS FROM `tbl_module` LIKE 'module_status'");
        $stmt->execute();
        $exists = (bool)$stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $exists = false;
    }

    return $exists;
}

function traineePublishedModuleFilter($conn, $alias = 'm') {
    return traineeModuleStatusColumnExists($conn)
        ? " AND COALESCE($alias.module_status, 'published') = 'published'"
        : '';
}

function ensureNotificationsTable($conn) {
    static $ensured = false;
    if ($ensured) {
        return;
    }

    $conn->exec("CREATE TABLE IF NOT EXISTS tbl_notifications (
        notification_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255),
        message TEXT,
        link VARCHAR(255),
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $ensured = true;
}

function ensureQuizAttemptsTable($conn) {
    static $ensured = false;
    if ($ensured) {
        return;
    }

    $conn->exec("CREATE TABLE IF NOT EXISTS tbl_quiz_attempts (
        attempt_id INT AUTO_INCREMENT PRIMARY KEY,
        trainee_id INT NOT NULL,
        qualification_id INT DEFAULT NULL,
        lesson_id INT NOT NULL,
        test_id INT NOT NULL,
        score DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_questions INT NOT NULL DEFAULT 0,
        percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
        attempt_number INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_quiz_attempt_trainee_lesson (trainee_id, lesson_id),
        INDEX idx_quiz_attempt_test (test_id),
        INDEX idx_quiz_attempt_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");

    $ensured = true;
}

function fetchBestQuizGradesForLessons($conn, $traineeId, array $lessonIds) {
    if (empty($lessonIds)) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($lessonIds), '?'));
    $stmt = $conn->prepare("
        SELECT tt.lesson_id, MAX(g.score) AS best_score
        FROM tbl_grades g
        JOIN tbl_test tt ON g.test_id = tt.test_id
        WHERE g.trainee_id = ?
          AND tt.activity_type_id = 1
          AND tt.lesson_id IN ($placeholders)
        GROUP BY tt.lesson_id
    ");
    $stmt->execute(array_merge([$traineeId], $lessonIds));

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $scores = [];
    foreach ($rows as $row) {
        $scores[(int)$row['lesson_id']] = isset($row['best_score']) ? (float)$row['best_score'] : null;
    }

    return $scores;
}

function fetchQuizAttemptStatsForLessons($conn, $traineeId, array $lessonIds) {
    ensureQuizAttemptsTable($conn);

    if (empty($lessonIds)) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($lessonIds), '?'));
    $stmt = $conn->prepare("
        SELECT
            lesson_id,
            MAX(score) AS best_score,
            GREATEST(COUNT(*), COALESCE(MAX(attempt_number), 0)) AS attempts_used,
            MAX(total_questions) AS total_questions
        FROM tbl_quiz_attempts
        WHERE trainee_id = ?
          AND lesson_id IN ($placeholders)
        GROUP BY lesson_id
    ");
    $stmt->execute(array_merge([$traineeId], $lessonIds));

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $stats = [];
    foreach ($rows as $row) {
        $stats[(int)$row['lesson_id']] = [
            'best_score' => isset($row['best_score']) ? (float)$row['best_score'] : null,
            'attempts_used' => (int)($row['attempts_used'] ?? 0),
            'total_questions' => (int)($row['total_questions'] ?? 0)
        ];
    }

    return $stats;
}

function getQuizAttemptStatus($conn, $traineeId, $lessonId, $testId, $totalQuestions = 0) {
    ensureQuizAttemptsTable($conn);

    $attemptStmt = $conn->prepare("
        SELECT
            MAX(score) AS best_score,
            GREATEST(COUNT(*), COALESCE(MAX(attempt_number), 0)) AS attempts_used,
            MAX(total_questions) AS stored_total_questions
        FROM tbl_quiz_attempts
        WHERE trainee_id = ?
          AND lesson_id = ?
          AND test_id = ?
    ");
    $attemptStmt->execute([$traineeId, $lessonId, $testId]);
    $attemptStats = $attemptStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $gradeStmt = $conn->prepare("
        SELECT MAX(score) AS best_score
        FROM tbl_grades
        WHERE trainee_id = ?
          AND test_id = ?
    ");
    $gradeStmt->execute([$traineeId, $testId]);
    $gradeBestScore = $gradeStmt->fetchColumn();
    $gradeBestScore = $gradeBestScore !== false && $gradeBestScore !== null ? (float)$gradeBestScore : null;

    $attemptBestScore = isset($attemptStats['best_score']) && $attemptStats['best_score'] !== null
        ? (float)$attemptStats['best_score']
        : null;

    $bestScore = $attemptBestScore;
    if ($gradeBestScore !== null && ($bestScore === null || $gradeBestScore > $bestScore)) {
        $bestScore = $gradeBestScore;
    }

    $attemptsUsed = (int)($attemptStats['attempts_used'] ?? 0);
    if ($attemptsUsed === 0 && $gradeBestScore !== null) {
        $attemptsUsed = 1;
    }

    $effectiveTotalQuestions = (int)$totalQuestions;
    if ($effectiveTotalQuestions <= 0) {
        $effectiveTotalQuestions = (int)($attemptStats['stored_total_questions'] ?? 0);
    }

    $isPerfect = $effectiveTotalQuestions > 0 && $bestScore !== null && $bestScore >= $effectiveTotalQuestions;
    $attemptsLeft = max(0, QUIZ_MAX_ATTEMPTS - $attemptsUsed);

    return [
        'best_score' => $bestScore,
        'attempts_used' => $attemptsUsed,
        'attempts_left' => $attemptsLeft,
        'max_attempts' => QUIZ_MAX_ATTEMPTS,
        'total_questions' => $effectiveTotalQuestions,
        'is_perfect' => $isPerfect,
        'can_retry' => !$isPerfect && $attemptsUsed < QUIZ_MAX_ATTEMPTS
    ];
}

function recordQuizAttempt($conn, $traineeId, $qualificationId, $lessonId, $testId, $score, $totalQuestions, $percentage, $attemptNumber) {
    ensureQuizAttemptsTable($conn);

    $stmt = $conn->prepare("
        INSERT INTO tbl_quiz_attempts (
            trainee_id,
            qualification_id,
            lesson_id,
            test_id,
            score,
            total_questions,
            percentage,
            attempt_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $traineeId,
        $qualificationId,
        $lessonId,
        $testId,
        $score,
        $totalQuestions,
        $percentage,
        $attemptNumber
    ]);
}

function upsertBestQuizGrade($conn, $traineeId, $qualificationId, $testId, $score) {
    $existingStmt = $conn->prepare("
        SELECT grade_id, score
        FROM tbl_grades
        WHERE trainee_id = ?
          AND qualification_id = ?
          AND test_id = ?
        ORDER BY score DESC, date_recorded DESC, grade_id DESC
        LIMIT 1
    ");
    $existingStmt->execute([$traineeId, $qualificationId, $testId]);
    $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $bestScore = max((float)$existing['score'], (float)$score);
        $updateStmt = $conn->prepare("UPDATE tbl_grades SET score = ?, date_recorded = CURDATE() WHERE grade_id = ?");
        $updateStmt->execute([$bestScore, $existing['grade_id']]);
        return $bestScore;
    }

    $insertStmt = $conn->prepare("
        INSERT INTO tbl_grades (trainee_id, qualification_id, test_id, score, date_recorded)
        VALUES (?, ?, ?, ?, CURDATE())
    ");
    $insertStmt->execute([$traineeId, $qualificationId, $testId, $score]);

    return (float)$score;
}

function getAssignedTrainerForLesson($conn, $lessonId) {
    try {
        $stmt = $conn->prepare("
            SELECT t.user_id, t.email, t.first_name, t.last_name
            FROM tbl_lessons l
            JOIN tbl_module m ON l.module_id = m.module_id
            JOIN tbl_trainer t ON m.trainer_id = t.trainer_id
            WHERE l.lesson_id = ?
            LIMIT 1
        ");
        $stmt->execute([$lessonId]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($trainer) {
            return $trainer;
        }
    } catch (Exception $e) {
    }

    try {
        $stmt = $conn->prepare("
            SELECT t.user_id, t.email, t.first_name, t.last_name
            FROM tbl_lessons l
            JOIN tbl_module m ON l.module_id = m.module_id
            JOIN tbl_trainer_hdr t ON m.trainer_id = t.trainer_id
            WHERE l.lesson_id = ?
            LIMIT 1
        ");
        $stmt->execute([$lessonId]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);
        return $trainer ?: null;
    } catch (Exception $e) {
        return null;
    }
}

function getAssignedTrainerForTrainee($conn, $traineeId) {
    $activeEnrollment = getActiveTraineeEnrollmentRow($conn, (int)$traineeId);
    $activeBatchId = (int)($activeEnrollment['batch_id'] ?? 0);
    if ($activeBatchId <= 0) {
        return null;
    }

    try {
        $stmt = $conn->prepare("
            SELECT t.user_id, t.email, t.first_name, t.last_name
            FROM tbl_batch b
            JOIN tbl_trainer t ON b.trainer_id = t.trainer_id
            WHERE b.batch_id = ?
            LIMIT 1
        ");
        $stmt->execute([$activeBatchId]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($trainer) {
            return $trainer;
        }
    } catch (Exception $e) {
    }

    try {
        $stmt = $conn->prepare("
            SELECT t.user_id, t.email, t.first_name, t.last_name
            FROM tbl_batch b
            JOIN tbl_trainer_hdr t ON b.trainer_id = t.trainer_id
            WHERE b.batch_id = ?
            LIMIT 1
        ");
        $stmt->execute([$activeBatchId]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);
        return $trainer ?: null;
    } catch (Exception $e) {
        return null;
    }
}

function getTraineeDisplayName($conn, $traineeId) {
    $stmt = $conn->prepare("SELECT CONCAT(first_name, ' ', last_name) as full_name FROM tbl_trainee_hdr WHERE trainee_id = ?");
    $stmt->execute([$traineeId]);
    return trim((string)$stmt->fetchColumn());
}

function getLessonTitle($conn, $lessonId) {
    $stmt = $conn->prepare("SELECT lesson_title FROM tbl_lessons WHERE lesson_id = ?");
    $stmt->execute([$lessonId]);
    return trim((string)$stmt->fetchColumn());
}

function notifyAssignedTrainerAboutSubmission($conn, $traineeId, $lessonId, $submissionType, $itemTitle = '') {
    try {
        $trainer = getAssignedTrainerForLesson($conn, $lessonId);
        if (!$trainer) {
            $trainer = getAssignedTrainerForTrainee($conn, $traineeId);
        }
        if (!$trainer || empty($trainer['user_id'])) {
            return;
        }

        ensureNotificationsTable($conn);

        $traineeName = getTraineeDisplayName($conn, $traineeId);
        $lessonTitle = getLessonTitle($conn, $lessonId);
        $submissionTypeLabel = trim((string)$submissionType);
        $itemTitle = trim((string)$itemTitle);

        $notifTitle = "{$submissionTypeLabel} Submitted";
        if ($itemTitle !== '' && $lessonTitle !== '') {
            $notifMessage = "{$traineeName} submitted {$submissionTypeLabel} '{$itemTitle}' for lesson: {$lessonTitle}";
        } elseif ($lessonTitle !== '') {
            $notifMessage = "{$traineeName} submitted {$submissionTypeLabel} for lesson: {$lessonTitle}";
        } else {
            $notifMessage = "{$traineeName} submitted {$submissionTypeLabel}.";
        }

        $notifLink = "/Hohoo-ville/frontend/html/trainer/pages/trainee_details.html?trainee_id={$traineeId}&tab=progress";
        $stmtNotif = $conn->prepare("INSERT INTO tbl_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)");
        $stmtNotif->execute([$trainer['user_id'], $notifTitle, $notifMessage, $notifLink]);

        if (!empty($trainer['email'])) {
            $trainerName = trim(($trainer['first_name'] ?? '') . ' ' . ($trainer['last_name'] ?? ''));
            $emailService = new EmailService();
            $emailService->sendTrainerSubmissionNotification(
                $trainer['email'],
                $trainerName !== '' ? $trainerName : 'Trainer',
                $traineeName !== '' ? $traineeName : 'A trainee',
                $submissionTypeLabel,
                $itemTitle,
                $lessonTitle,
                $traineeId
            );
        }
    } catch (Exception $e) {
        error_log("Trainer submission notification error: " . $e->getMessage());
    }
}

function formatRetryCountLabel($count) {
    $retryCount = max(0, (int)$count);
    return $retryCount . ' ' . ($retryCount === 1 ? 'retry' : 'retries');
}

function notifyAssignedTrainerAboutQuizRetry($conn, $traineeId, $lessonId, $attemptNumber, $score, $totalQuestions, $attemptsLeft) {
    try {
        $trainer = getAssignedTrainerForLesson($conn, $lessonId);
        if (!$trainer) {
            $trainer = getAssignedTrainerForTrainee($conn, $traineeId);
        }
        if (!$trainer || empty($trainer['user_id'])) {
            return;
        }

        ensureNotificationsTable($conn);

        $traineeName = getTraineeDisplayName($conn, $traineeId);
        $lessonTitle = getLessonTitle($conn, $lessonId);
        $scoreLabel = ((int)$score) . '/' . max(0, (int)$totalQuestions);
        $attemptLabel = 'Attempt ' . max(1, (int)$attemptNumber) . ' of ' . QUIZ_MAX_ATTEMPTS;
        $retrySummary = $attemptsLeft > 0
            ? formatRetryCountLabel($attemptsLeft) . ' remaining.'
            : 'No retries remaining.';

        $notifTitle = 'Quiz Retried';
        if ($lessonTitle !== '') {
            $notifMessage = "{$traineeName} retried the quiz for lesson: {$lessonTitle}. {$attemptLabel}. Score: {$scoreLabel}. {$retrySummary}";
        } else {
            $notifMessage = "{$traineeName} retried a quiz. {$attemptLabel}. Score: {$scoreLabel}. {$retrySummary}";
        }

        $notifLink = "/Hohoo-ville/frontend/html/trainer/pages/trainee_details.html?trainee_id={$traineeId}&tab=progress";
        $stmtNotif = $conn->prepare("INSERT INTO tbl_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)");
        $stmtNotif->execute([$trainer['user_id'], $notifTitle, $notifMessage, $notifLink]);
    } catch (Exception $e) {
        error_log("Trainer quiz retry notification error: " . $e->getMessage());
    }
}

function authenticateTrainee($conn) {
    $token = getBearerToken();
    if ($token !== '') {
        $userId = validateToken($token);

        if ($userId <= 0) {
            sendUnauthorized('Unauthorized: Trainee access required.');
        }

        $stmt = $conn->prepare("
            SELECT u.user_id, u.role_id, t.trainee_id
            FROM tbl_users u
            LEFT JOIN tbl_trainee_hdr t ON t.user_id = u.user_id
            WHERE u.user_id = ? AND u.status = 'active'
            LIMIT 1
        ");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || intval($user['role_id']) !== 3 || empty($user['trainee_id'])) {
            sendUnauthorized('Unauthorized: Trainee access required.');
        }

        $_SESSION['user_id'] = intval($user['user_id']);
        $_SESSION['role_id'] = intval($user['role_id']);
        $_SESSION['trainee_id'] = intval($user['trainee_id']);

        return intval($user['trainee_id']);
    }

    if (isset($_SESSION['user_id'], $_SESSION['role_id']) && intval($_SESSION['role_id']) === 3) {
        if (!empty($_SESSION['trainee_id'])) {
            return intval($_SESSION['trainee_id']);
        }

        $stmt = $conn->prepare("SELECT trainee_id FROM tbl_trainee_hdr WHERE user_id = ? LIMIT 1");
        $stmt->execute([intval($_SESSION['user_id'])]);
        $traineeId = intval($stmt->fetchColumn());

        if ($traineeId > 0) {
            $_SESSION['trainee_id'] = $traineeId;
            return $traineeId;
        }
    }

    sendUnauthorized('Unauthorized: Trainee access required.');
}

function sendUnauthorized($message) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

function getBearerToken() {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = '';

    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
    } elseif (isset($headers['authorization'])) {
        $authHeader = $headers['authorization'];
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    if (!$authHeader || stripos($authHeader, 'Bearer ') !== 0) {
        return '';
    }

    return trim(substr($authHeader, 7));
}

function base64UrlEncode($text) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($text));
}

function validateToken($token) {
    $parts = explode('.', (string)$token);
    if (count($parts) !== 3) {
        return 0;
    }

    $header = base64_decode($parts[0]);
    $payload = base64_decode($parts[1]);
    $providedSignature = $parts[2];

    if ($header === false || $payload === false) {
        return 0;
    }

    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode($payload);
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, 'hohoo_ville_secret_key_2024', true);
    $expectedSignature = base64UrlEncode($signature);

    if (!hash_equals($expectedSignature, $providedSignature)) {
        return 0;
    }

    $payloadData = json_decode($payload);
    if (!$payloadData || !isset($payloadData->user_id) || !isset($payloadData->exp)) {
        return 0;
    }

    if (intval($payloadData->exp) < time()) {
        return 0;
    }

    return intval($payloadData->user_id);
}

function getActiveTraineeEnrollmentRow($conn, $traineeId) {
    $stmt = $conn->prepare("
        SELECT
            e.enrollment_id,
            e.batch_id,
            e.offered_qualification_id,
            COALESCE(oc.qualification_id, b.qualification_id) AS qualification_id
        FROM tbl_enrollment e
        LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
        LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
        WHERE e.trainee_id = ?
          AND e.status = 'approved'
          AND COALESCE(e.is_archived, 0) = 0
        ORDER BY
            COALESCE(b.end_date, '9999-12-31') DESC,
            COALESCE(e.enrollment_date, '1970-01-01 00:00:00') DESC,
            e.enrollment_id DESC
        LIMIT 1
    ");
    $stmt->execute([$traineeId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function getActiveTraineeQualificationId($conn, $traineeId) {
    $enrollment = getActiveTraineeEnrollmentRow($conn, $traineeId);
    return (int)($enrollment['qualification_id'] ?? 0);
}

function getQualificationIdForLesson($conn, $lessonId) {
    $stmt = $conn->prepare("
        SELECT m.qualification_id
        FROM tbl_lessons l
        JOIN tbl_module m ON m.module_id = l.module_id
        WHERE l.lesson_id = ?
        LIMIT 1
    ");
    $stmt->execute([$lessonId]);
    return (int)$stmt->fetchColumn();
}

function getLessonsForTrainee($conn) {
    // Integration: Use session ID instead of GET parameter to prevent data leaking
    $traineeId = $_SESSION['trainee_id'] ?? 0;

    // Find the trainee's course
    $qualificationId = getActiveTraineeQualificationId($conn, $traineeId);

    if (!$qualificationId) {
        echo json_encode(['success' => true, 'data' => []]);
        return;
    }

    $accessibleModuleIds = ta_fetch_trainee_accessible_module_ids($conn, (int)$traineeId, (int)$qualificationId);
    if (empty($accessibleModuleIds)) {
        echo json_encode(['success' => true, 'data' => []]);
        return;
    }

    $modulePlaceholders = implode(',', array_fill(0, count($accessibleModuleIds), '?'));
    $lessonResourceSelect = ta_column_exists($conn, 'tbl_lessons', 'lesson_resource_url')
        ? 'l.lesson_resource_url'
        : 'NULL AS lesson_resource_url';

    // Get modules and lessons for that course that are posted.
    $query = "SELECT
                m.module_id, m.module_title, m.competency_type,
                l.lesson_id, l.lesson_title, l.posting_date, l.lesson_file_path, {$lessonResourceSelect},
                t.test_id,
                t.deadline as quiz_deadline,
                (SELECT MAX(g.score)
                 FROM tbl_grades g 
                 JOIN tbl_test tt ON g.test_id = tt.test_id 
                 WHERE tt.lesson_id = l.lesson_id AND tt.activity_type_id = 1 AND g.trainee_id = ?) as score,
                (SELECT COUNT(qq.question_id) 
                 FROM tbl_quiz_questions qq 
                 WHERE qq.test_id = t.test_id) as total_questions
              FROM tbl_module m
              JOIN tbl_lessons l ON m.module_id = l.module_id
              LEFT JOIN tbl_test t ON l.lesson_id = t.lesson_id AND t.activity_type_id = 1
              WHERE m.qualification_id = ?
                AND m.module_id IN ($modulePlaceholders)
                AND (l.posting_date IS NULL OR l.posting_date <= NOW())" . traineePublishedModuleFilter($conn, 'm') . "
              ORDER BY m.module_id, l.lesson_id";
    
    try {
        $stmt = $conn->prepare($query);
        $stmt->execute(array_merge([$traineeId, $qualificationId], $accessibleModuleIds));
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
        $task_sheet_stmt = $conn->prepare("
            SELECT ts.lesson_id, ts.task_sheet_id, ts.title
            FROM tbl_task_sheets ts
            JOIN tbl_lessons l ON l.lesson_id = ts.lesson_id
            JOIN tbl_module m ON m.module_id = l.module_id
            WHERE m.competency_type = 'core'
              AND ts.lesson_id IN ($in)
            ORDER BY ts.display_order, ts.task_sheet_id
        ");
        $task_sheet_stmt->execute($lesson_ids);
        $all_task_sheets = $task_sheet_stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach($all_task_sheets as $ts) {
            $task_sheets[$ts['lesson_id']][] = $ts;
        }
    }

    $submission_counts = [];
    $approved_submission_counts = [];
    $submitted_task_sheet_ids = [];
    if (!empty($lesson_ids)) {
        $status_stmt = $conn->prepare("SELECT lesson_id, COUNT(*) FROM tbl_task_sheet_submissions WHERE trainee_id = ? AND lesson_id IN ($in) AND status IN ('submitted', 'approved', 'recorded') GROUP BY lesson_id");
        $status_stmt->execute(array_merge([$traineeId], $lesson_ids));
        $submission_counts = $status_stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $approved_status_stmt = $conn->prepare("SELECT lesson_id, COUNT(*) FROM tbl_task_sheet_submissions WHERE trainee_id = ? AND lesson_id IN ($in) AND status IN ('approved', 'recorded') GROUP BY lesson_id");
        $approved_status_stmt->execute(array_merge([$traineeId], $lesson_ids));
        $approved_submission_counts = $approved_status_stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $submitted_stmt = $conn->prepare("SELECT task_sheet_id FROM tbl_task_sheet_submissions WHERE trainee_id = ? AND lesson_id IN ($in) AND status IN ('submitted', 'approved', 'recorded')");
        $submitted_stmt->execute(array_merge([$traineeId], $lesson_ids));
        $submitted_task_sheet_ids = $submitted_stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    $quizGradeScores = fetchBestQuizGradesForLessons($conn, $traineeId, $lesson_ids);
    $quizAttemptStats = fetchQuizAttemptStatsForLessons($conn, $traineeId, $lesson_ids);

    foreach ($results as $row) {
        if (!isset($modules[$row['module_id']])) {
            $modules[$row['module_id']] = [
                'module_id' => $row['module_id'],
                'module_title' => $row['module_title'],
                'competency_type' => $row['competency_type'],
                'lessons' => []
            ];
        }

        $lessonId = (int)$row['lesson_id'];
        $gradeScore = array_key_exists($lessonId, $quizGradeScores)
            ? $quizGradeScores[$lessonId]
            : (isset($row['score']) && $row['score'] !== null ? (float)$row['score'] : null);
        $attemptStats = $quizAttemptStats[$lessonId] ?? null;
        $score = $attemptStats['best_score'] ?? $gradeScore;
        if ($gradeScore !== null && ($score === null || $gradeScore > $score)) {
            $score = $gradeScore;
        }

        $totalQuestions = (int)($row['total_questions'] ?? 0);
        if ($totalQuestions <= 0 && !empty($attemptStats['total_questions'])) {
            $totalQuestions = (int)$attemptStats['total_questions'];
        }

        $attemptsUsed = (int)($attemptStats['attempts_used'] ?? 0);
        if ($attemptsUsed === 0 && $score !== null) {
            $attemptsUsed = 1;
        }

        $isDeadlinePassed = $row['quiz_deadline'] && strtotime($row['quiz_deadline']) < time();
        $isPerfectScore = $totalQuestions > 0 && $score !== null && $score >= $totalQuestions;
        $attemptsLeft = max(0, QUIZ_MAX_ATTEMPTS - $attemptsUsed);
        $canRetryQuiz = !is_null($row['test_id']) && !$isDeadlinePassed && !$isPerfectScore && $attemptsUsed < QUIZ_MAX_ATTEMPTS;

        $totalTaskSheets = isset($task_sheets[$row['lesson_id']]) ? count($task_sheets[$row['lesson_id']]) : 0;
        $submittedCount = $submission_counts[$row['lesson_id']] ?? 0;
        $approvedCount = $approved_submission_counts[$row['lesson_id']] ?? 0;

        $lesson_task_sheets = $task_sheets[$row['lesson_id']] ?? [];
        foreach ($lesson_task_sheets as &$ts) {
            $ts['is_submitted'] = in_array($ts['task_sheet_id'], $submitted_task_sheet_ids);
        }

        $modules[$row['module_id']]['lessons'][] = [
            'lesson_id' => $row['lesson_id'],
            'lesson_title' => $row['lesson_title'],
            'lesson_contents' => $contents[$row['lesson_id']] ?? [],
            'lesson_file_path' => $row['lesson_file_path'],
            'lesson_resource_url' => $row['lesson_resource_url'] ?? null,
            'task_sheets' => $lesson_task_sheets,
            'has_quiz' => !is_null($row['test_id']),
            'score' => $score,
            'total_questions' => $totalQuestions,
            'deadline' => $row['quiz_deadline'],
            'is_deadline_passed' => $isDeadlinePassed,
            'quiz_attempts_used' => $attemptsUsed,
            'quiz_attempts_left' => $attemptsLeft,
            'quiz_max_attempts' => QUIZ_MAX_ATTEMPTS,
            'quiz_is_perfect' => $isPerfectScore,
            'can_retry_quiz' => $canRetryQuiz,
            'task_sheet_status' => $totalTaskSheets > 0
                ? (($approvedCount >= $totalTaskSheets) ? 'approved' : (($submittedCount >= $totalTaskSheets) ? 'submitted' : null))
                : null
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
        if ($table === 'tbl_task_sheets') {
            $stmt = $conn->prepare("
                SELECT ts.title, ts.content
                FROM tbl_task_sheets ts
                JOIN tbl_lessons l ON l.lesson_id = ts.lesson_id
                JOIN tbl_module m ON m.module_id = l.module_id
                WHERE ts.$id_column = ?
                  AND m.competency_type = 'core'
            ");
        } else {
            $stmt = $conn->prepare("SELECT title, content FROM $table WHERE $id_column = ?");
        }
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
    // Integration: Ensure trainee can only view their own profile
    $traineeId = $_SESSION['trainee_id'] ?? 0;
    if (!$traineeId) {
        echo json_encode(['success' => false, 'message' => 'Trainee ID is required.']);
        return;
    }


    try {
        $query = "SELECT 
                    th.trainee_school_id, th.first_name, th.last_name, th.middle_name, th.extension_name,
                    th.sex, 
                    th.email, th.phone_number, th.facebook_account, th.photo_file, 
                    COALESCE(th.profile_image, '') as profile_image,
                    td.civil_status, td.birthdate, td.age, 
                    td.birthplace_city, td.birthplace_province, td.nationality,
                    td.house_no_street, td.barangay, td.city_municipality, td.province,
                    tf.educational_attainment, tf.employment_status,
                    u.username,
                    b.batch_name,
                    c.qualification_name as course_name,
                    st.scholarship_name as scholarship_type,
                    e.enrollment_date, DATE_FORMAT(e.enrollment_date, '%Y-%m-%d %H:%i:%s') as formatted_enrollment_date
                  FROM tbl_trainee_hdr AS th
                  JOIN tbl_trainee_dtl td ON th.trainee_id = td.trainee_id
                  LEFT JOIN tbl_trainee_ftr tf ON th.trainee_id = tf.trainee_id
                  JOIN tbl_users u ON th.user_id = u.user_id
                  LEFT JOIN tbl_enrollment e ON e.enrollment_id = (
                      SELECT e2.enrollment_id
                      FROM tbl_enrollment e2
                      WHERE e2.trainee_id = th.trainee_id
                      ORDER BY
                          CASE
                              WHEN e2.status = 'approved' AND COALESCE(e2.is_archived, 0) = 0 THEN 0
                              WHEN e2.status IN ('qualified', 'reserved', 'pending') AND COALESCE(e2.is_archived, 0) = 0 THEN 1
                              WHEN e2.status = 'completed' AND COALESCE(e2.is_archived, 0) = 0 THEN 2
                              ELSE 3
                          END,
                          COALESCE(e2.enrollment_date, '1970-01-01 00:00:00') DESC,
                          e2.enrollment_id DESC
                      LIMIT 1
                  )
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
            
            // Ensure photo URL is absolute or correctly pathed for the frontend
            if (!empty($trainee['profile_image'])) {
                $trainee['photo_url'] = '/Hohoo-ville/uploads/profile_images/' . $trainee['profile_image'];
            }
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
    // Integration: Use session ID to prevent updating other users
    $traineeId = $_SESSION['trainee_id'] ?? 0;

    if (!$traineeId) {
        echo json_encode(['success' => false, 'message' => 'Trainee ID is required.']);
        return;
    }

    try {
        $updateFields = [];
        $params = [];

        if (isset($data['first_name'])) { $updateFields[] = "first_name = ?"; $params[] = $data['first_name']; }
        if (isset($data['last_name'])) { $updateFields[] = "last_name = ?"; $params[] = $data['last_name']; }
        if (isset($data['email'])) { $updateFields[] = "email = ?"; $params[] = $data['email']; }
        if (isset($data['phone'])) { $updateFields[] = "phone_number = ?"; $params[] = $data['phone']; }
        if (isset($data['facebook'])) { $updateFields[] = "facebook_account = ?"; $params[] = $data['facebook']; }
        if (isset($data['profile_image'])) { $updateFields[] = "profile_image = ?"; $params[] = $data['profile_image']; }

        if (empty($updateFields)) {
            throw new Exception('No fields to update');
        }

        $params[] = $traineeId;
        $query = "UPDATE tbl_trainee_hdr SET " . implode(", ", $updateFields) . " WHERE trainee_id = ?";
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Profile updated successfully.']);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to update profile: ' . $e->getMessage()]);
    }
}

function getQuizForLesson($conn) {
    $traineeId = $_SESSION['trainee_id'] ?? 0;
    $lessonId = $_GET['lesson_id'] ?? 0;

    $testStmt = $conn->prepare("SELECT test_id, deadline FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1 LIMIT 1");
    $testStmt->execute([$lessonId]);
    $test = $testStmt->fetch(PDO::FETCH_ASSOC);
    $testId = $test['test_id'] ?? null;

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

    $attemptStatus = getQuizAttemptStatus($conn, $traineeId, $lessonId, $testId, count($questions));

    if (!empty($test['deadline']) && strtotime($test['deadline']) < time()) {
        echo json_encode(['success' => false, 'message' => 'The deadline for this quiz has passed.']);
        return;
    }

    if ($attemptStatus['is_perfect']) {
        echo json_encode(['success' => false, 'message' => 'You already reached a perfect score for this quiz.']);
        return;
    }

    if (!$attemptStatus['can_retry'] && $attemptStatus['best_score'] !== null) {
        echo json_encode(['success' => false, 'message' => 'You have already used all available quiz attempts.']);
        return;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'questions' => $questions,
            'quiz_status' => $attemptStatus
        ]
    ]);
}

function submitQuiz($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    // Integration: Enforce session-based identity
    $traineeId = $_SESSION['trainee_id'] ?? 0;
    $lessonId = $data['lesson_id'] ?? 0;
    $answers = $data['answers'] ?? []; // Expected format: ['question_id' => 'option_id', ...]

    $stmtQuiz = $conn->prepare("SELECT test_id, deadline FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1 LIMIT 1");
    $stmtQuiz->execute([$lessonId]);
    $quiz = $stmtQuiz->fetch(PDO::FETCH_ASSOC);

    if (!$quiz || empty($quiz['test_id'])) {
        echo json_encode(['success' => false, 'message' => 'No quiz found for this lesson.']);
        return;
    }

    $testId = (int)$quiz['test_id'];
    $deadline = $quiz['deadline'] ?? null;

    if ($deadline && strtotime($deadline) < time()) {
        echo json_encode(['success' => false, 'message' => 'The deadline for this quiz has passed.']);
        return;
    }

    $questionStmt = $conn->prepare("SELECT question_id FROM tbl_quiz_questions WHERE test_id = ?");
    $questionStmt->execute([$testId]);
    $questionIds = $questionStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    $questionIds = array_map('intval', $questionIds);
    $validQuestionIds = array_fill_keys($questionIds, true);
    $totalQuestions = count($questionIds);

    if ($totalQuestions === 0) {
        echo json_encode(['success' => false, 'message' => 'This quiz has no questions yet.']);
        return;
    }

    $attemptStatus = getQuizAttemptStatus($conn, $traineeId, $lessonId, $testId, $totalQuestions);

    if ($attemptStatus['is_perfect']) {
        echo json_encode(['success' => false, 'message' => 'You already reached a perfect score for this quiz.']);
        return;
    }

    if (!$attemptStatus['can_retry']) {
        echo json_encode(['success' => false, 'message' => 'You have already used all available quiz attempts.']);
        return;
    }

    $score = 0;
    $stmt = $conn->prepare("SELECT is_correct FROM tbl_quiz_options WHERE option_id = ? AND question_id = ?");

    foreach ($answers as $questionId => $optionId) {
        $questionId = (int)$questionId;
        if (!isset($validQuestionIds[$questionId])) {
            continue;
        }

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
        $qualificationId = getQualificationIdForLesson($conn, $lessonId);
        if (!$qualificationId) throw new Exception('Could not find course for trainee.');

        $attemptNumber = $attemptStatus['attempts_used'] + 1;
        recordQuizAttempt($conn, $traineeId, $qualificationId, $lessonId, $testId, $score, $totalQuestions, $finalScore, $attemptNumber);
        $bestScore = upsertBestQuizGrade($conn, $traineeId, $qualificationId, $testId, $score);

        $conn->commit();

        $attemptsLeft = max(0, QUIZ_MAX_ATTEMPTS - $attemptNumber);

        if ($attemptNumber === 1) {
            notifyAssignedTrainerAboutSubmission($conn, $traineeId, $lessonId, 'Quiz', '');
        } else {
            notifyAssignedTrainerAboutQuizRetry($conn, $traineeId, $lessonId, $attemptNumber, $score, $totalQuestions, $attemptsLeft);
        }

        $bestScore = $bestScore !== null ? (float)$bestScore : (float)$score;
        $isPerfectScore = $totalQuestions > 0 && $bestScore >= $totalQuestions;

        echo json_encode([
            'success' => true,
            'message' => 'Quiz submitted!',
            'data' => [
                'score' => $score,
                'best_score' => $bestScore,
                'total_questions' => $totalQuestions,
                'percentage' => round($finalScore),
                'attempts_used' => $attemptNumber,
                'attempts_left' => $attemptsLeft,
                'max_attempts' => QUIZ_MAX_ATTEMPTS,
                'is_perfect' => $isPerfectScore,
                'can_retry' => !$isPerfectScore && $attemptsLeft > 0
            ]
        ]);

    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'message' => 'Failed to save quiz results: ' . $e->getMessage()]);
    }
}

function submitTaskSheet($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        // Integration: Enforce session-based identity
        $traineeId = $_SESSION['trainee_id'] ?? null;
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

        $stmtTask = $conn->prepare("SELECT title FROM tbl_task_sheets WHERE task_sheet_id = ?");
        $stmtTask->execute([$taskSheetId]);
        $taskTitle = $stmtTask->fetchColumn();
        notifyAssignedTrainerAboutSubmission($conn, $traineeId, $lessonId, 'Task Sheet', (string)$taskTitle);

        echo json_encode(['success' => true, 'message' => 'Task sheet submitted successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}


function unsubmitTaskSheet($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    // Integration: Enforce session-based identity
    $traineeId = $_SESSION['trainee_id'] ?? 0;
    $lessonId = $data['lesson_id'] ?? 0;
    $taskSheetId = $data['task_sheet_id'] ?? 0;

    error_log("Unsubmit request - Trainee: $traineeId, Lesson: $lessonId, Task: $taskSheetId");

    if (!$traineeId || !$lessonId || !$taskSheetId) {
        echo json_encode(['success' => false, 'message' => 'Missing required information. Trainee: ' . $traineeId . ', Lesson: ' . $lessonId . ', Task: ' . $taskSheetId]);
        http_response_code(400);
        return;
    }

    try {
        // Check if submission exists first
        $checkSql = "SELECT submission_id FROM tbl_task_sheet_submissions WHERE lesson_id = ? AND trainee_id = ? AND task_sheet_id = ?";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->execute([$lessonId, $traineeId, $taskSheetId]);
        $submission = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$submission) {
            echo json_encode(['success' => false, 'message' => 'No submission found to delete.']);
            http_response_code(404);
            return;
        }

        // Proceed with deletion
        $sql = "DELETE FROM tbl_task_sheet_submissions WHERE lesson_id = ? AND trainee_id = ? AND task_sheet_id = ?";
        $stmt = $conn->prepare($sql);
        $deleted = $stmt->execute([$lessonId, $traineeId, $taskSheetId]);

        if ($deleted && $stmt->rowCount() > 0) {
            error_log("Successfully deleted submission for Trainee: $traineeId, Task: $taskSheetId");
            echo json_encode(['success' => true, 'message' => 'Submission removed successfully.']);
        } else {
            error_log("Failed to delete - rowCount: " . $stmt->rowCount());
            echo json_encode(['success' => false, 'message' => 'Failed to delete submission.']);
        }
    } catch (Exception $e) {
        error_log("Delete exception: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        http_response_code(500);
    }
}
?>
