<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';
require_once '../../utils/EmailService.php';

$database = new Database();
$conn = $database->getConnection();

$action = $_GET['action'] ?? '';

/**
 * Verify that a trainer_id belongs to the authenticated user
 * Prevents unauthorized trainers from modifying other trainers' content
 * 
 * @param PDO $conn Database connection
 * @param int $userId The authenticated user ID
 * @param int $trainerId The trainer ID to verify
 * @return int|false The trainer_id if valid, false otherwise
 */
function verifyTrainerOwnership($conn, $userId, $trainerId) {
    if (!$userId || !$trainerId) {
        return false;
    }
    
    try {
        // Primary schema uses tbl_trainer.
        try {
            $stmt = $conn->prepare("SELECT trainer_id FROM tbl_trainer WHERE user_id = ? AND trainer_id = ?");
            $stmt->execute([$userId, $trainerId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($result) {
                return (int)$result['trainer_id'];
            }
        } catch (Exception $e) {
            // Ignore and attempt legacy fallback table below.
        }

        // Legacy fallback for environments that still use tbl_trainer_hdr.
        $stmt = $conn->prepare("SELECT trainer_id FROM tbl_trainer_hdr WHERE user_id = ? AND trainer_id = ?");
        $stmt->execute([$userId, $trainerId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? (int)$result['trainer_id'] : false;
    } catch (Exception $e) {
        error_log("Trainer verification error: " . $e->getMessage());
        return false;
    }
}

function getProjectUploadsDir($subdir = '') {
    $projectRoot = dirname(__DIR__, 3);
    $baseUploadsDir = rtrim(str_replace('\\', '/', $projectRoot), '/') . '/uploads/';
    return $baseUploadsDir . ltrim($subdir, '/');
}

switch ($action) {
    case 'list':
        listModules($conn);
        break;
    case 'add-module':
    case 'update-module':
        saveModule($conn, $action);
        break;
    case 'delete-module':
        deleteModule($conn);
        break;
    case 'add-competency':
    case 'update-competency':
        saveCompetency($conn, $action);
        break;
    case 'delete-competency':
        deleteCompetency($conn);
        break;
    case 'get-lesson-details':
        getLessonDetails($conn);
        break;
    case 'save-lesson-settings':
        saveLessonSettingsAndQuiz($conn);
        break;
    case 'get-content':
        getContentItem($conn, 'tbl_lesson_contents', 'content_id');
        break;
    case 'save-content':
        saveContentItem($conn, 'tbl_lesson_contents', 'content_id');
        break;
    case 'delete-content':
        deleteContentItem($conn, 'tbl_lesson_contents', 'content_id');
        break;
    case 'get-task':
        getContentItem($conn, 'tbl_task_sheets', 'task_sheet_id');
        break;
    case 'save-task':
        saveContentItem($conn, 'tbl_task_sheets', 'task_sheet_id');
        break;
    case 'delete-task':
        deleteContentItem($conn, 'tbl_task_sheets', 'task_sheet_id');
        break;
    // NEW: Unified module upload with learning outcomes, quizzes, and task sheets
    case 'upload-complete-module':
        uploadCompleteModule($conn);
        break;
    case 'get-module-structure':
        getModuleStructure($conn);
        break;
    // NEW: Trainee progress tracking
    case 'get-trainee-module-progress':
        getTraineeModuleProgress($conn);
        break;
    case 'get-available-modules':
        getAvailableModules($conn);
        break;
    case 'update-learning-outcome-progress':
        updateLearningOutcomeProgress($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action specified.']);
        http_response_code(400);
        break;
}

function listModules($conn) {
    $qualificationId = $_GET['qualification_id'] ?? 0;
    $type = $_GET['type'] ?? 'core';
    $trainerId = $_GET['trainer_id'] ?? 0;

    if (!$qualificationId || !$trainerId) {
        echo json_encode(['success' => false, 'message' => 'Qualification ID and Trainer ID are required.']);
        return;
    }

    try {
        $stmt = $conn->prepare("SELECT * FROM tbl_module WHERE qualification_id = ? AND competency_type = ? AND trainer_id = ? ORDER BY module_id");
        $stmt->execute([$qualificationId, $type, $trainerId]);
        $modules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $lessonStmt = $conn->prepare("SELECT * FROM tbl_lessons WHERE module_id = ? ORDER BY lesson_id");
        foreach ($modules as &$module) {
            $lessonStmt->execute([$module['module_id']]);
            $module['lessons'] = $lessonStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode(['success' => true, 'data' => $modules]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function saveModule($conn, $action) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['module_id'] ?? null;
    $title = $data['module_title'];
    $desc = $data['module_description'];
    $type = $data['competency_type'];
    $qualificationId = $data['qualification_id'];
    $trainerId = $data['trainer_id'] ?? 0;
    $userId = $data['user_id'] ?? 0;  // Added authentication verification

    try {
        // Verify trainer ownership to prevent unauthorized modifications
        $verifiedTrainerId = verifyTrainerOwnership($conn, $userId, $trainerId);
        if (!$verifiedTrainerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized: Cannot modify modules for another trainer']);
            return;
        }

        if ($action === 'update-module' && $id) {
            $stmt = $conn->prepare("UPDATE tbl_module SET module_title = ?, module_description = ? WHERE module_id = ? AND trainer_id = ?");
            $stmt->execute([$title, $desc, $id, $verifiedTrainerId]);
        } else {
            $stmt = $conn->prepare("INSERT INTO tbl_module (qualification_id, competency_type, module_title, module_description, trainer_id) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$qualificationId, $type, $title, $desc, $verifiedTrainerId]);
        }
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function deleteModule($conn) {
    $id = $_GET['id'] ?? 0;
    try {
        $stmt = $conn->prepare("DELETE FROM tbl_module WHERE module_id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function saveCompetency($conn, $action) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['lesson_id'] ?? null;
    $moduleId = $data['module_id'];
    $title = $data['lesson_title'];
    $desc = $data['lesson_description'];
    $trainerId = $data['trainer_id'] ?? 0;  // Added authentication verification
    $userId = $data['user_id'] ?? 0;        // Added authentication verification

    try {
        // Verify trainer ownership - check that module belongs to this trainer
        $verifiedTrainerId = verifyTrainerOwnership($conn, $userId, $trainerId);
        if (!$verifiedTrainerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized: Cannot modify lessons for another trainer']);
            return;
        }

        // Additional check: verify module belongs to the verified trainer
        $moduleStmt = $conn->prepare("SELECT trainer_id FROM tbl_module WHERE module_id = ?");
        $moduleStmt->execute([$moduleId]);
        $module = $moduleStmt->fetch(PDO::FETCH_ASSOC);
        if (!$module || $module['trainer_id'] != $verifiedTrainerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized: Module does not belong to your training assignments']);
            return;
        }

        if ($action === 'update-competency' && $id) {
            $stmt = $conn->prepare("UPDATE tbl_lessons SET lesson_title = ?, lesson_description = ? WHERE lesson_id = ?");
            $stmt->execute([$title, $desc, $id]);
        } else {
            $stmt = $conn->prepare("INSERT INTO tbl_lessons (module_id, lesson_title, lesson_description) VALUES (?, ?, ?)");
            $stmt->execute([$moduleId, $title, $desc]);
        }
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function deleteCompetency($conn) {
    $id = $_GET['id'] ?? 0;
    try {
        $stmt = $conn->prepare("DELETE FROM tbl_lessons WHERE lesson_id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function getLessonDetails($conn) {
    $lessonId = $_GET['lesson_id'] ?? 0;
    try {
        $details = [];
        // Get settings and module type
        $stmt = $conn->prepare("SELECT l.posting_date, l.lesson_file_path, m.competency_type 
                                FROM tbl_lessons l
                                JOIN tbl_module m ON l.module_id = m.module_id
                                WHERE l.lesson_id = ?");
        $stmt->execute([$lessonId]);
        $details = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $conn->prepare("SELECT deadline FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1");
        $stmt->execute([$lessonId]);
        $details['deadline'] = $stmt->fetchColumn();

        // Get lesson contents
        $stmt = $conn->prepare("SELECT * FROM tbl_lesson_contents WHERE lesson_id = ? ORDER BY display_order, content_id");
        $stmt->execute([$lessonId]);
        $details['contents'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get task sheets
        $stmt = $conn->prepare("SELECT * FROM tbl_task_sheets WHERE lesson_id = ? ORDER BY display_order, task_sheet_id");
        $stmt->execute([$lessonId]);
        $details['task_sheets'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get quiz (simplified)
        $stmt = $conn->prepare("SELECT q.question_id, q.question_text, o.option_id, o.option_text, o.is_correct FROM tbl_quiz_questions q JOIN tbl_quiz_options o ON q.question_id = o.question_id WHERE q.test_id = (SELECT test_id FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1)");
        $stmt->execute([$lessonId]);
        $quiz_raw = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $quiz = [];
        foreach ($quiz_raw as $row) {
            if (!isset($quiz[$row['question_id']])) {
                $quiz[$row['question_id']] = ['question_id' => $row['question_id'], 'question_text' => $row['question_text'], 'options' => []];
            }
            $quiz[$row['question_id']]['options'][] = ['option_id' => $row['option_id'], 'option_text' => $row['option_text'], 'is_correct' => $row['is_correct']];
        }
        $details['quiz'] = array_values($quiz);

        echo json_encode(['success' => true, 'data' => $details]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function saveLessonSettingsAndQuiz($conn) {
    $data = $_POST;
    $lessonId = $data['lesson_id'] ?? 0;
    $trainerId = $data['trainer_id'] ?? 0;  // Added authentication verification
    $userId = $data['user_id'] ?? 0;        // Added authentication verification
    $files = $_FILES;
    $postingDate = $data['posting_date'] ?: null;
    $deadline = $data['deadline'] ?: null;
    $quiz = json_decode($data['quiz'] ?? '[]', true);

    try {
        // Verify trainer ownership - check that lesson's module belongs to this trainer
        $verifiedTrainerId = verifyTrainerOwnership($conn, $userId, $trainerId);
        if (!$verifiedTrainerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized: Cannot modify lessons for another trainer']);
            return;
        }

        // Additional check: verify lesson's module belongs to the verified trainer
        $lessonStmt = $conn->prepare("SELECT m.trainer_id FROM tbl_lessons l JOIN tbl_module m ON l.module_id = m.module_id WHERE l.lesson_id = ?");
        $lessonStmt->execute([$lessonId]);
        $lesson = $lessonStmt->fetch(PDO::FETCH_ASSOC);
        if (!$lesson || $lesson['trainer_id'] != $verifiedTrainerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized: Lesson does not belong to your training assignments']);
            return;
        }

        $conn->beginTransaction();
        
        // Handle file upload for basic/common competencies
        $lessonFilePath = null;
        if (isset($files['lesson_file']) && $files['lesson_file']['error'] === UPLOAD_ERR_OK) {
            $upload_dir = getProjectUploadsDir('lessons/');
            if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);

            // Delete old file if it exists
            $oldFileStmt = $conn->prepare("SELECT lesson_file_path FROM tbl_lessons WHERE lesson_id = ?");
            $oldFileStmt->execute([$lessonId]);
            $oldFile = $oldFileStmt->fetchColumn();
            if ($oldFile && file_exists($upload_dir . $oldFile)) {
                unlink($upload_dir . $oldFile);
            }

            $file_ext = pathinfo($files['lesson_file']['name'], PATHINFO_EXTENSION);
            $lessonFilePath = "lesson_{$lessonId}_" . time() . '.' . $file_ext;
            move_uploaded_file($files['lesson_file']['tmp_name'], $upload_dir . $lessonFilePath);
        }

        // Update lesson posting date
        $updateQuery = "UPDATE tbl_lessons SET posting_date = ?" . ($lessonFilePath ? ", lesson_file_path = ?" : "") . " WHERE lesson_id = ?";
        $stmt = $conn->prepare($updateQuery);
        $params = $lessonFilePath ? [$postingDate, $lessonFilePath, $lessonId] : [$postingDate, $lessonId];
        $stmt->execute($params);

        // Find or create test
        $stmt = $conn->prepare("SELECT test_id FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1");
        $stmt->execute([$lessonId]);
        $testId = $stmt->fetchColumn();
        if (!$testId && !empty($quiz)) {
            $stmt = $conn->prepare("INSERT INTO tbl_test (lesson_id, activity_type_id, deadline) VALUES (?, 1, ?)");
            $stmt->execute([$lessonId, $deadline]);
            $testId = $conn->lastInsertId();
        } elseif ($testId) {
            $stmt = $conn->prepare("UPDATE tbl_test SET deadline = ? WHERE test_id = ?");
            $stmt->execute([$deadline, $testId]);
        }

        // Update quiz questions and options
        if ($testId) {
            // Simple approach: delete old and insert new
            $stmt = $conn->prepare("DELETE FROM tbl_quiz_questions WHERE test_id = ?");
            $stmt->execute([$testId]);

            $q_stmt = $conn->prepare("INSERT INTO tbl_quiz_questions (test_id, question_text, question_type) VALUES (?, ?, ?)");
            $o_stmt = $conn->prepare("INSERT INTO tbl_quiz_options (question_id, option_text, is_correct) VALUES (?, ?, ?)");

            foreach ($quiz as $q) {
                $q_stmt->execute([$testId, $q['text'], $q['type']]);
                $questionId = $conn->lastInsertId();
                foreach ($q['options'] as $opt) {
                    $o_stmt->execute([$questionId, $opt['text'], $opt['is_correct'] ? 1 : 0]);
                }
            }
            
            // Notify trainees if posting date has passed
            // Uses lesson's trainer_id from module to ensure only that trainer's trainees are notified
            notifyTraineesAboutLesson($conn, $lessonId, 'Quiz', '');
        }

        $conn->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function getContentItem($conn, $table, $id_column) {
    $id = $_GET['id'] ?? 0;
    try {
        $stmt = $conn->prepare("SELECT * FROM $table WHERE $id_column = ?");
        $stmt->execute([$id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $item]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function saveContentItem($conn, $table, $id_column) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;
    $lessonId = $data['lesson_id'];
    $title = $data['title'];
    $content = $data['content'];
    $trainerId = $data['trainer_id'] ?? 0;  // Added authentication verification
    $userId = $data['user_id'] ?? 0;        // Added authentication verification

    try {
        // Verify trainer ownership - check that lesson's module belongs to this trainer
        $verifiedTrainerId = verifyTrainerOwnership($conn, $userId, $trainerId);
        if (!$verifiedTrainerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized: Cannot modify content for another trainer']);
            return;
        }

        // Additional check: verify lesson's module belongs to the verified trainer
        $lessonStmt = $conn->prepare("SELECT m.trainer_id FROM tbl_lessons l JOIN tbl_module m ON l.module_id = m.module_id WHERE l.lesson_id = ?");
        $lessonStmt->execute([$lessonId]);
        $lesson = $lessonStmt->fetch(PDO::FETCH_ASSOC);
        if (!$lesson || $lesson['trainer_id'] != $verifiedTrainerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized: Content does not belong to your training assignments']);
            return;
        }

        $conn->beginTransaction();
        
        if ($id) {
            $stmt = $conn->prepare("UPDATE $table SET title = ?, content = ? WHERE $id_column = ?");
            $stmt->execute([$title, $content, $id]);
        } else {
            $stmt = $conn->prepare("INSERT INTO $table (lesson_id, title, content) VALUES (?, ?, ?)");
            $stmt->execute([$lessonId, $title, $content]);
        }
        
        // Determine content type for notification
        $contentType = ($table === 'tbl_lesson_contents') ? 'Information Sheet' : 'Task Sheet';
        
        // Notify trainees if posting date has passed
        // Uses lesson's trainer_id from module to ensure only that trainer's trainees are notified
        notifyTraineesAboutLesson($conn, $lessonId, $contentType, $title);
        
        $conn->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function deleteContentItem($conn, $table, $id_column) {
    $id = $_GET['id'] ?? 0;
    try {
        $stmt = $conn->prepare("DELETE FROM $table WHERE $id_column = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

/**
 * Send notifications to trainees assigned to the specific trainer in that qualification.
 * SECURITY: Only trainees in batches belonging to the lesson's trainer receive notifications.
 * This prevents conflicts where trainees would receive notifications from trainers they're not assigned to.
 * 
 * Notifications are sent only when the lesson posting_date is set and already due.
 * Also sends both system and email notifications to trainees.
 * 
 * Query filters: 
 *   - e.status = 'approved' (only approved trainees)
 *   - b.qualification_id = lesson.qualification_id (same qualification)
 *   - b.trainer_id = lesson.trainer_id (CRITICAL: same trainer only)
 * 
 * @param PDO $conn Database connection
 * @param int $lessonId The lesson being posted
 * @param string $contentType Type of content (Information Sheet, Task Sheet, Quiz)
 * @param string $contentTitle Title of the content being posted
 */
function notifyTraineesAboutLesson($conn, $lessonId, $contentType, $contentTitle) {
    try {
        // Get lesson, qualification and module owner trainer
        $stmt = $conn->prepare("
            SELECT l.posting_date, l.lesson_title, m.qualification_id, m.trainer_id
            FROM tbl_lessons l
            JOIN tbl_module m ON l.module_id = m.module_id
            WHERE l.lesson_id = ?
        ");
        $stmt->execute([$lessonId]);
        $lesson = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$lesson) {
            return;
        }
        
        // Notify only when posting period is explicitly set and already reached.
        if (empty($lesson['posting_date'])) {
            return;
        }

        $postingDateTime = new DateTime($lesson['posting_date']);
        $currentDateTime = new DateTime();
        if ($currentDateTime < $postingDateTime) {
            return;
        }

        if (empty($lesson['qualification_id']) || empty($lesson['trainer_id'])) {
            return;
        }
        
        // Get trainees assigned to this trainer in this qualification via batch assignment
        $stmt = $conn->prepare("
            SELECT DISTINCT th.user_id, th.email, th.first_name, th.last_name
            FROM tbl_enrollment e
            JOIN tbl_batch b ON e.batch_id = b.batch_id
            JOIN tbl_trainee_hdr th ON e.trainee_id = th.trainee_id
            WHERE e.status = 'approved'
              AND th.user_id IS NOT NULL
              AND b.qualification_id = ?
              AND b.trainer_id = ?
        ");
        $stmt->execute([$lesson['qualification_id'], $lesson['trainer_id']]);
        $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($trainees)) {
            return; // No approved trainees
        }
        
        // Initialize email service
        $emailService = new EmailService();
        
        // Send notification to each trainee
        $notifStmt = $conn->prepare("INSERT INTO tbl_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)");
        $existingStmt = $conn->prepare("
            SELECT notification_id
            FROM tbl_notifications
            WHERE user_id = ?
              AND title = ?
              AND message = ?
              AND link = ?
            LIMIT 1
        ");
        $notifLink = "/Hohoo-ville/frontend/html/trainee/pages/my_training.html";
        $lessonTitle = trim((string)($lesson['lesson_title'] ?? ''));
        $contentTitle = trim((string)$contentTitle);

        foreach ($trainees as $trainee) {
            $notifTitle = "$contentType Posted";
            if ($contentTitle !== '') {
                $subject = "'$contentTitle'";
            } elseif ($lessonTitle !== '') {
                $subject = "for lesson '$lessonTitle'";
            } else {
                $subject = 'for your lesson';
            }
            $notifMessage = "$contentType $subject has been uploaded by your trainer.";

            $existingStmt->execute([$trainee['user_id'], $notifTitle, $notifMessage, $notifLink]);
            if ($existingStmt->fetchColumn()) {
                continue;
            }

            // Send system notification
            $notifStmt->execute([$trainee['user_id'], $notifTitle, $notifMessage, $notifLink]);
            
            // Send email notification
            if (!empty($trainee['email'])) {
                try {
                    $traineeName = trim($trainee['first_name'] . ' ' . $trainee['last_name']);
                    $emailService->sendLearningMaterialNotification(
                        $trainee['email'],
                        $traineeName,
                        $contentType,
                        $contentTitle,
                        $lessonTitle
                    );
                } catch (Exception $emailError) {
                    error_log("Email notification failed for trainee {$trainee['user_id']}: " . $emailError->getMessage());
                }
            }
        }
        
    } catch (Exception $e) {
        // Log error but don't disrupt the main operation
        error_log("Trainee Notification Error: " . $e->getMessage());
    }
}

/**
 * NEW: Upload a complete module with learning outcomes, quizzes, and task sheets in one go
 * Expects JSON payload with:
 * - module_id (optional, for updates)
 * - qualification_id
 * - competency_type
 * - module_title
 * - module_description
 * - module_order
 * - trainer_id
 * - user_id
 * - learning_outcomes: array of outcomes, each containing:
 *   - lesson_id (optional, for updates)
 *   - title
 *   - description
 *   - outcome_order
 *   - is_required
 *   - quiz_instructions
 *   - task_instructions
 *   - contents: array of learning materials
 *   - quiz: array of quiz questions
 *   - task_sheets: array of task sheets
 */
function uploadCompleteModule($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $moduleId = $data['module_id'] ?? null;
    $qualificationId = $data['qualification_id'] ?? null;
    $competencyType = $data['competency_type'] ?? 'core';
    $moduleTitle = $data['module_title'] ?? '';
    $moduleDescription = $data['module_description'] ?? '';
    $moduleOrder = $data['module_order'] ?? 0;
    $trainerId = (int)($data['trainer_id'] ?? 0);
    $userId = (int)($data['user_id'] ?? 0);
    $learningOutcomes = $data['learning_outcomes'] ?? [];

    // Resolve trainer_id from user_id when frontend didn't provide trainer_id.
    if (!$trainerId && $userId) {
        try {
            $stmt = $conn->prepare("SELECT trainer_id FROM tbl_trainer WHERE user_id = ? LIMIT 1");
            $stmt->execute([$userId]);
            $trainerId = (int)$stmt->fetchColumn();
        } catch (Exception $e) {
            // Fallback for legacy schema.
            try {
                $stmt = $conn->prepare("SELECT trainer_id FROM tbl_trainer_hdr WHERE user_id = ? LIMIT 1");
                $stmt->execute([$userId]);
                $trainerId = (int)$stmt->fetchColumn();
            } catch (Exception $ignored) {
                // Keep trainerId as 0; validation below will handle it.
            }
        }
    }

    if (!$moduleTitle || !$qualificationId || !$trainerId || empty($learningOutcomes)) {
        echo json_encode(['success' => false, 'message' => 'Module title, qualification, trainer ID, and learning outcomes are required']);
        http_response_code(400);
        return;
    }

    try {
        // Verify trainer ownership
        $verifiedTrainerId = verifyTrainerOwnership($conn, $userId, $trainerId);
        if (!$verifiedTrainerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized: Cannot create modules for another trainer']);
            return;
        }

        $conn->beginTransaction();

        // Save or update module
        if ($moduleId) {
            $stmt = $conn->prepare("UPDATE tbl_module SET module_title = ?, module_description = ?, module_order = ?, updated_at = NOW() WHERE module_id = ? AND trainer_id = ?");
            $stmt->execute([$moduleTitle, $moduleDescription, $moduleOrder, $moduleId, $verifiedTrainerId]);
        } else {
            $stmt = $conn->prepare("INSERT INTO tbl_module (qualification_id, competency_type, module_title, module_description, module_order, trainer_id) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$qualificationId, $competencyType, $moduleTitle, $moduleDescription, $moduleOrder, $verifiedTrainerId]);
            $moduleId = $conn->lastInsertId();
        }

        // Process each learning outcome
        foreach ($learningOutcomes as $idx => $outcome) {
            $lessonId = $outcome['lesson_id'] ?? null;
            $outcomeTitle = $outcome['title'] ?? '';
            $outcomeDesc = $outcome['description'] ?? '';
            $outcomeOrder = $outcome['outcome_order'] ?? $idx;
            $isRequired = $outcome['is_required'] ?? 1;
            $quizInstructions = $outcome['quiz_instructions'] ?? '';
            $taskInstructions = $outcome['task_instructions'] ?? '';
            $contents = $outcome['contents'] ?? [];
            $quiz = $outcome['quiz'] ?? [];
            $taskSheets = $outcome['task_sheets'] ?? [];

            // Save lesson (learning outcome)
            if ($lessonId) {
                $stmt = $conn->prepare("UPDATE tbl_lessons SET lesson_title = ?, lesson_description = ?, outcome_order = ?, is_required = ?, quiz_instructions = ?, task_instructions = ?, updated_at = NOW() WHERE lesson_id = ?");
                $stmt->execute([$outcomeTitle, $outcomeDesc, $outcomeOrder, $isRequired, $quizInstructions, $taskInstructions, $lessonId]);
            } else {
                $stmt = $conn->prepare("INSERT INTO tbl_lessons (module_id, lesson_title, lesson_description, outcome_order, is_required, quiz_instructions, task_instructions, posting_date) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
                $stmt->execute([$moduleId, $outcomeTitle, $outcomeDesc, $outcomeOrder, $isRequired, $quizInstructions, $taskInstructions]);
                $lessonId = $conn->lastInsertId();
            }

            // Save learning content with image support
            if (!empty($contents)) {
                // Clear existing contents
                $conn->prepare("DELETE FROM tbl_lesson_contents WHERE lesson_id = ?")->execute([$lessonId]);
                
                $contentStmt = $conn->prepare("INSERT INTO tbl_lesson_contents (lesson_id, title, content, display_order) VALUES (?, ?, ?, ?)");
                
                // Create uploads directory if it doesn't exist
                $uploads_dir = getProjectUploadsDir('learning_content/');
                if (!is_dir($uploads_dir)) {
                    mkdir($uploads_dir, 0777, true);
                }
                
                foreach ($contents as $contentIdx => $content) {
                    $title = $content['title'] ?? '';
                    $contentData = '';
                    
                    // Handle text content
                    if (isset($content['text'])) {
                        $contentData = $content['text'];
                    }
                    
                    // Handle image content
                    if (isset($content['image'])) {
                        // Decode base64 image
                        if (preg_match('/^data:image\/(\w+);base64,/', $content['image'], $matches)) {
                            $ext = $matches[1];
                            $imageData = base64_decode(str_replace('data:image/' . $ext . ';base64,', '', $content['image']));
                            
                            // Generate unique filename
                            $filename = 'lesson_' . $lessonId . '_' . time() . '_' . rand(1000, 9999) . '.' . strtolower($ext);
                            $filepath = $uploads_dir . $filename;
                            
                            // Save image file
                            if (file_put_contents($filepath, $imageData)) {
                                $imageUrl = '/Hohoo-ville/uploads/learning_content/' . $filename;
                                $caption = $content['image_caption'] ?? '';
                                
                                // Build image HTML
                                $imageHtml = '<img src="' . $imageUrl . '" alt="' . htmlspecialchars($caption) . '" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;">';
                                if ($caption) {
                                    $imageHtml .= '<p style="font-size: 12px; color: #666; margin-top: 5px; text-align: center;">' . htmlspecialchars($caption) . '</p>';
                                }
                                
                                // Append image to content
                                if ($contentData) {
                                    $contentData .= '<br><br>' . $imageHtml;
                                } else {
                                    $contentData = $imageHtml;
                                }
                            }
                        }
                    }
                    
                    // Save to database
                    if ($title || $contentData) {
                        $contentStmt->execute([$lessonId, $title, $contentData, isset($content['display_order']) ? $content['display_order'] : $contentIdx]);
                    }
                }
            }

            // Save quiz
            if (!empty($quiz)) {
                // Find or create test
                $testStmt = $conn->prepare("SELECT test_id FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1");
                $testStmt->execute([$lessonId]);
                $testId = $testStmt->fetchColumn();
                
                if (!$testId) {
                    $insertTestStmt = $conn->prepare("INSERT INTO tbl_test (lesson_id, activity_type_id, deadline) VALUES (?, 1, NULL)");
                    $insertTestStmt->execute([$lessonId]);
                    $testId = $conn->lastInsertId();
                } else {
                    // Clear existing quiz
                    $conn->prepare("DELETE FROM tbl_quiz_questions WHERE test_id = ?")->execute([$testId]);
                }

                // Insert quiz questions and options
                $qStmt = $conn->prepare("INSERT INTO tbl_quiz_questions (test_id, question_text, question_type) VALUES (?, ?, ?)");
                foreach ($quiz as $question) {
                    $qStmt->execute([$testId, $question['text'] ?? '', $question['type'] ?? 'multiple_choice']);
                    $questionId = $conn->lastInsertId();

                    if (isset($question['options']) && is_array($question['options'])) {
                        $optStmt = $conn->prepare("INSERT INTO tbl_quiz_options (question_id, option_text, is_correct) VALUES (?, ?, ?)");
                        foreach ($question['options'] as $option) {
                            $optStmt->execute([$questionId, $option['text'] ?? '', $option['is_correct'] ? 1 : 0]);
                        }
                    }
                }
            }

            // Save task sheets
            if (!empty($taskSheets)) {
                // Clear existing task sheets
                $conn->prepare("DELETE FROM tbl_task_sheets WHERE lesson_id = ?")->execute([$lessonId]);
                
                $taskStmt = $conn->prepare("INSERT INTO tbl_task_sheets (lesson_id, title, content, display_order) VALUES (?, ?, ?, ?)");
                foreach ($taskSheets as $taskIdx => $taskSheet) {
                    $taskStmt->execute([$lessonId, $taskSheet['title'] ?? '', $taskSheet['content'] ?? '', $taskIdx]);
                }
            }
        }

        $conn->commit();
        echo json_encode(['success' => true, 'data' => ['module_id' => $moduleId], 'message' => 'Module uploaded successfully with all learning outcomes, quizzes, and task sheets']);
    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

/**
 * NEW: Get complete module structure with all learning outcomes, contents, quizzes, and task sheets
 */
function getModuleStructure($conn) {
    $moduleId = $_GET['module_id'] ?? 0;
    
    try {
        // Get module
        $stmt = $conn->prepare("SELECT * FROM tbl_module WHERE module_id = ?");
        $stmt->execute([$moduleId]);
        $module = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$module) {
            echo json_encode(['success' => false, 'message' => 'Module not found']);
            http_response_code(404);
            return;
        }

        // Get learning outcomes with their contents, quizzes, and task sheets
        $stmt = $conn->prepare("SELECT * FROM tbl_lessons WHERE module_id = ? ORDER BY outcome_order, lesson_id");
        $stmt->execute([$moduleId]);
        $outcomes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($outcomes as &$outcome) {
            $lessonId = $outcome['lesson_id'];

            // Get lesson contents
            $stmt = $conn->prepare("SELECT * FROM tbl_lesson_contents WHERE lesson_id = ? ORDER BY display_order, content_id");
            $stmt->execute([$lessonId]);
            $outcome['contents'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get quiz
            $stmt = $conn->prepare("SELECT q.question_id, q.question_text, q.question_type, o.option_id, o.option_text, o.is_correct FROM tbl_quiz_questions q LEFT JOIN tbl_quiz_options o ON q.question_id = o.question_id WHERE q.test_id = (SELECT test_id FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1) ORDER BY q.question_id, o.option_id");
            $stmt->execute([$lessonId]);
            $quizRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $quiz = [];
            foreach ($quizRaw as $row) {
                if (!isset($quiz[$row['question_id']])) {
                    $quiz[$row['question_id']] = [
                        'question_id' => $row['question_id'],
                        'text' => $row['question_text'],
                        'type' => $row['question_type'],
                        'options' => []
                    ];
                }
                if ($row['option_id']) {
                    $quiz[$row['question_id']]['options'][] = [
                        'option_id' => $row['option_id'],
                        'text' => $row['option_text'],
                        'is_correct' => (bool)$row['is_correct']
                    ];
                }
            }
            $outcome['quiz'] = array_values($quiz);

            // Get task sheets
            $stmt = $conn->prepare("SELECT * FROM tbl_task_sheets WHERE lesson_id = ? ORDER BY display_order, task_sheet_id");
            $stmt->execute([$lessonId]);
            $outcome['task_sheets'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $module['learning_outcomes'] = $outcomes;
        echo json_encode(['success' => true, 'data' => $module]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

/**
 * NEW: Get trainee's progress through all modules
 */
function getTraineeModuleProgress($conn) {
    $traineeId = $_GET['trainee_id'] ?? 0;
    $qualificationId = $_GET['qualification_id'] ?? 0;

    if (!$traineeId || !$qualificationId) {
        echo json_encode(['success' => false, 'message' => 'Trainee ID and Qualification ID are required']);
        http_response_code(400);
        return;
    }

    try {
        // Get all modules for qualification
        $stmt = $conn->prepare("
            SELECT m.* FROM tbl_module m
            WHERE m.qualification_id = ? AND m.is_active = 1
            ORDER BY m.module_order, m.module_id
        ");
        $stmt->execute([$qualificationId]);
        $modules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($modules as &$module) {
            $moduleId = $module['module_id'];

            // Get module progress
            $stmt = $conn->prepare("
                SELECT * FROM tbl_module_progress
                WHERE trainee_id = ? AND module_id = ?
            ");
            $stmt->execute([$traineeId, $moduleId]);
            $moduleProgress = $stmt->fetch(PDO::FETCH_ASSOC);
            $module['progress'] = $moduleProgress ?: ['status' => 'not_started'];

            // Get learning outcomes with their progress
            $stmt = $conn->prepare("
                SELECT l.*, 
                       COALESCE(lop.quiz_completed, 0) AS quiz_completed,
                       COALESCE(lop.task_completed, 0) AS task_completed,
                       COALESCE(lop.learning_outcome_completed, 0) AS outcome_completed
                FROM tbl_lessons l
                LEFT JOIN tbl_learning_outcome_progress lop ON l.lesson_id = lop.lesson_id AND lop.trainee_id = ?
                WHERE l.module_id = ?
                ORDER BY l.outcome_order, l.lesson_id
            ");
            $stmt->execute([$traineeId, $moduleId]);
            $module['learning_outcomes'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode(['success' => true, 'data' => $modules]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

/**
 * NEW: Get available modules for a trainee (respecting progression)
 */
function getAvailableModules($conn) {
    $traineeId = $_GET['trainee_id'] ?? 0;
    $qualificationId = $_GET['qualification_id'] ?? 0;

    if (!$traineeId || !$qualificationId) {
        echo json_encode(['success' => false, 'message' => 'Trainee ID and Qualification ID are required']);
        http_response_code(400);
        return;
    }

    try {
        $legacyMode = false;

        try {
            // Preferred query for module progression schema (migration_module_progression.sql).
            $stmt = $conn->prepare("
                SELECT m.*, 
                       mp.status AS module_status,
                       (SELECT COUNT(*) FROM tbl_lessons WHERE module_id = m.module_id AND is_required = 1) as total_required_outcomes,
                       (SELECT COUNT(DISTINCT lop.lesson_id) FROM tbl_learning_outcome_progress lop
                        JOIN tbl_lessons l ON lop.lesson_id = l.lesson_id
                        WHERE l.module_id = m.module_id AND lop.trainee_id = ? AND lop.learning_outcome_completed = 1) as completed_outcomes
                FROM tbl_module m
                LEFT JOIN tbl_module_progress mp ON m.module_id = mp.module_id AND mp.trainee_id = ?
                WHERE m.qualification_id = ? AND m.is_active = 1
                ORDER BY m.module_order, m.module_id
            ");
            $stmt->execute([$traineeId, $traineeId, $qualificationId]);
            $modules = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $schemaError) {
            $message = $schemaError->getMessage();
            $isSchemaMismatch = strpos($message, '42S22') !== false
                || strpos($message, '42S02') !== false
                || stripos($message, 'Unknown column') !== false
                || stripos($message, 'doesn\'t exist') !== false;

            if (!$isSchemaMismatch) {
                throw $schemaError;
            }

            // Backward-compatible fallback for legacy schemas without progression tables/columns.
            $legacyMode = true;
            $stmt = $conn->prepare("
                SELECT m.*,
                       'not_started' AS module_status,
                       (SELECT COUNT(*) FROM tbl_lessons WHERE module_id = m.module_id) as total_required_outcomes,
                       0 AS completed_outcomes
                FROM tbl_module m
                WHERE m.qualification_id = ?
                ORDER BY m.module_id
            ");
            $stmt->execute([$qualificationId]);
            $modules = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // Determine availability based on progression
        $previousModuleCompleted = true;
        foreach ($modules as &$module) {
            if ($legacyMode) {
                // No progression tables/flags available: keep all modules open.
                $module['is_available'] = true;
                $module['is_completed'] = false;
                $module['completion_percentage'] = 0;
                continue;
            }

            $module['is_available'] = $previousModuleCompleted;
            $module['is_completed'] = $module['module_status'] === 'completed';
            $module['completion_percentage'] = $module['total_required_outcomes'] > 0
                ? round(($module['completed_outcomes'] / $module['total_required_outcomes']) * 100)
                : 0;
            
            // Update availability for next module based on this module's completion
            if (!$module['is_completed']) {
                $previousModuleCompleted = false;
            }
        }

        echo json_encode(['success' => true, 'data' => $modules]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

/**
 * NEW: Update trainee progress on learning outcome (quiz and/or task sheet completion)
 */
function updateLearningOutcomeProgress($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    $traineeId = $data['trainee_id'] ?? 0;
    $lessonId = $data['lesson_id'] ?? 0;
    $quizCompleted = $data['quiz_completed'] ?? 0;
    $quizScore = $data['quiz_score'] ?? null;
    $quizPassed = $data['quiz_passed'] ?? 0;
    $taskCompleted = $data['task_completed'] ?? 0;
    $taskScore = $data['task_score'] ?? null;
    $taskPassed = $data['task_passed'] ?? 0;

    if (!$traineeId || !$lessonId) {
        echo json_encode(['success' => false, 'message' => 'Trainee ID and Lesson ID are required']);
        http_response_code(400);
        return;
    }

    try {
        // Get lesson to check if quiz and task are required
        $stmt = $conn->prepare("
            SELECT l.*, m.module_id
            FROM tbl_lessons l
            JOIN tbl_module m ON l.module_id = m.module_id
            WHERE l.lesson_id = ?
        ");
        $stmt->execute([$lessonId]);
        $lesson = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lesson) {
            echo json_encode(['success' => false, 'message' => 'Lesson not found']);
            http_response_code(404);
            return;
        }

        $moduleId = $lesson['module_id'];

        // Insert or update learning outcome progress
        $stmt = $conn->prepare("
            INSERT INTO tbl_learning_outcome_progress 
            (trainee_id, lesson_id, quiz_completed, quiz_score, quiz_passed, task_completed, task_score, task_passed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            quiz_completed = VALUES(quiz_completed),
            quiz_score = VALUES(quiz_score),
            quiz_passed = VALUES(quiz_passed),
            task_completed = VALUES(task_completed),
            task_score = VALUES(task_score),
            task_passed = VALUES(task_passed),
            updated_at = NOW()
        ");
        $stmt->execute([$traineeId, $lessonId, $quizCompleted, $quizScore, $quizPassed, $taskCompleted, $taskScore, $taskPassed]);

        // Check if all required outcomes are completed for this lesson
        $outcomeCompleted = ($quizCompleted || !$lesson['is_required']) && ($taskCompleted || !$lesson['is_required']);
        if ($outcomeCompleted) {
            $updateStmt = $conn->prepare("
                UPDATE tbl_learning_outcome_progress
                SET learning_outcome_completed = 1, completed_date = NOW()
                WHERE trainee_id = ? AND lesson_id = ?
            ");
            $updateStmt->execute([$traineeId, $lessonId]);
        }

        // Check if all required outcomes in module are completed
        $stmt = $conn->prepare("
            SELECT COUNT(*) as total_required,
                   SUM(CASE WHEN learning_outcome_completed = 1 THEN 1 ELSE 0 END) as completed
            FROM tbl_learning_outcome_progress lop
            JOIN tbl_lessons l ON lop.lesson_id = l.lesson_id
            WHERE lop.trainee_id = ? AND l.module_id = ? AND l.is_required = 1
        ");
        $stmt->execute([$traineeId, $moduleId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        $moduleCompleted = false;
        if ($result['total_required'] > 0 && $result['completed'] === $result['total_required']) {
            $moduleCompleted = true;
            // Update module progress
            $updateModuleStmt = $conn->prepare("
                INSERT INTO tbl_module_progress (trainee_id, module_id, all_outcomes_completed, completed_date, status)
                VALUES (?, ?, 1, NOW(), 'completed')
                ON DUPLICATE KEY UPDATE
                all_outcomes_completed = 1,
                completed_date = NOW(),
                status = 'completed',
                updated_at = NOW()
            ");
            $updateModuleStmt->execute([$traineeId, $moduleId]);
        } else {
            // Mark module as in progress if not already
            $updateModuleStmt = $conn->prepare("
                INSERT INTO tbl_module_progress (trainee_id, module_id, started_date, status)
                VALUES (?, ?, NOW(), 'in_progress')
                ON DUPLICATE KEY UPDATE
                status = IF(status = 'not_started', 'in_progress', status),
                updated_at = NOW()
            ");
            $updateModuleStmt->execute([$traineeId, $moduleId]);
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'outcome_completed' => $outcomeCompleted,
                'module_completed' => $moduleCompleted
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}
?>

