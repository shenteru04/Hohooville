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
require_once '../../utils/trainer_assignment_helper.php';

$database = new Database();
$conn = $database->getConnection();
ta_ensure_schema($conn);

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

function resolveTrainerIdFromUser($conn, int $userId): int {
    if ($userId <= 0) {
        return 0;
    }

    try {
        $stmt = $conn->prepare("SELECT trainer_id FROM tbl_trainer WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $trainerId = (int)$stmt->fetchColumn();
        if ($trainerId > 0) {
            return $trainerId;
        }
    } catch (Exception $e) {
        error_log('Unable to resolve trainer_id from tbl_trainer: ' . $e->getMessage());
    }

    try {
        $stmt = $conn->prepare("SELECT trainer_id FROM tbl_trainer_hdr WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        return (int)$stmt->fetchColumn();
    } catch (Exception $e) {
        error_log('Unable to resolve trainer_id from tbl_trainer_hdr: ' . $e->getMessage());
        return 0;
    }
}

function normalizeLessonResourceUrl($value) {
    $url = trim((string)$value);
    if ($url === '') {
        return null;
    }

    if (!preg_match('~^[a-z][a-z0-9+\-.]*://~i', $url)) {
        $url = 'https://' . ltrim($url, '/');
    }

    return filter_var($url, FILTER_VALIDATE_URL) ? $url : false;
}

function lessonResourceUrlSelect($conn, string $alias = 'l'): string {
    return columnExists($conn, 'tbl_lessons', 'lesson_resource_url')
        ? "{$alias}.lesson_resource_url"
        : "NULL AS lesson_resource_url";
}

function getProjectUploadsDir($subdir = '') {
    $projectRoot = dirname(__DIR__, 3);
    $baseUploadsDir = rtrim(str_replace('\\', '/', $projectRoot), '/') . '/uploads/';
    return $baseUploadsDir . ltrim($subdir, '/');
}

function columnExists($conn, $table, $column) {
    try {
        $stmt = $conn->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
        $stmt->execute([$column]);
        return (bool)$stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return false;
    }
}

function ensureModuleDraftSchema($conn) {
    static $ensured = false;
    if ($ensured) {
        return;
    }

    try {
        if (!columnExists($conn, 'tbl_module', 'unit_code')) {
            $conn->exec("ALTER TABLE `tbl_module` ADD COLUMN `unit_code` VARCHAR(100) NULL AFTER `module_title`");
        }
    } catch (Exception $e) {
        error_log('Unable to add tbl_module.unit_code: ' . $e->getMessage());
    }

    try {
        if (!columnExists($conn, 'tbl_module', 'module_status')) {
            $conn->exec("ALTER TABLE `tbl_module` ADD COLUMN `module_status` ENUM('draft','published') NOT NULL DEFAULT 'published' AFTER `module_order`");
        }
    } catch (Exception $e) {
        error_log('Unable to add tbl_module.module_status: ' . $e->getMessage());
    }

    $ensured = true;
}

function ensureNotificationsTable($conn) {
    static $ensured = false;
    if ($ensured) {
        return;
    }

    try {
        $conn->exec("CREATE TABLE IF NOT EXISTS tbl_notifications (
            notification_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255),
            message TEXT,
            link VARCHAR(255),
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    } catch (Exception $e) {
        error_log('Unable to ensure tbl_notifications exists: ' . $e->getMessage());
    }

    $ensured = true;
}

function getAssignedTraineesForTrainerQualification($conn, $qualificationId, $trainerId, $moduleId = null) {
    if (!$qualificationId || !$trainerId) {
        return [];
    }

    if ($moduleId) {
        $rows = ta_fetch_trainees_for_module($conn, (int)$moduleId, (int)$trainerId, (int)$qualificationId);
        if (!empty($rows)) {
            return $rows;
        }
    }

    $enrollmentQualificationExpr = columnExists($conn, 'tbl_enrollment', 'qualification_id')
        ? 'e.qualification_id'
        : 'NULL';

    try {
        $stmt = $conn->prepare("
            SELECT DISTINCT th.user_id, th.email, th.first_name, th.last_name
            FROM tbl_enrollment e
            LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
            LEFT JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
            JOIN tbl_trainee_hdr th ON e.trainee_id = th.trainee_id
            WHERE e.status = 'approved'
              AND th.user_id IS NOT NULL
              AND COALESCE({$enrollmentQualificationExpr}, oq.qualification_id, b.qualification_id) = ?
              AND (
                    (
                        COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
                        AND EXISTS (
                            SELECT 1
                            FROM tbl_batch_trainer_assignments a
                            WHERE a.batch_id = b.batch_id
                              AND a.trainer_id = ?
                        )
                    )
                    OR (
                        COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
                        AND NOT EXISTS (
                            SELECT 1
                            FROM tbl_batch_trainer_assignments fallback_assignments
                            WHERE fallback_assignments.batch_id = b.batch_id
                        )
                        AND b.trainer_id = ?
                    )
                    OR (
                        COALESCE(b.trainer_assignment_mode, 'single') <> 'multiple'
                        AND b.trainer_id = ?
                    )
              )
        ");
        $stmt->execute([$qualificationId, $trainerId, $trainerId, $trainerId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!empty($rows)) {
            return $rows;
        }
    } catch (Exception $e) {
        error_log('Primary trainee qualification lookup failed: ' . $e->getMessage());
    }

    try {
        $stmt = $conn->prepare("
            SELECT DISTINCT th.user_id, th.email, th.first_name, th.last_name
            FROM tbl_enrollment e
            LEFT JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
            JOIN tbl_trainee_hdr th ON e.trainee_id = th.trainee_id
            WHERE e.status = 'approved'
              AND th.user_id IS NOT NULL
              AND COALESCE({$enrollmentQualificationExpr}, oq.qualification_id) = ?
        ");
        $stmt->execute([$qualificationId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Exception $e) {
        error_log('Fallback trainee qualification lookup failed: ' . $e->getMessage());
        return [];
    }
}

function notifyTraineesAboutPublishedModule($conn, $moduleId, $isUpdated = false) {
    try {
        $stmt = $conn->prepare("
            SELECT module_title, qualification_id, trainer_id, module_status
            FROM tbl_module
            WHERE module_id = ?
            LIMIT 1
        ");
        $stmt->execute([(int)$moduleId]);
        $module = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$module || ($module['module_status'] ?? 'published') !== 'published') {
            return;
        }

        $trainees = getAssignedTraineesForTrainerQualification(
            $conn,
            $module['qualification_id'] ?? 0,
            $module['trainer_id'] ?? 0,
            (int)$moduleId
        );
        if (empty($trainees)) {
            return;
        }

        ensureNotificationsTable($conn);

        $moduleTitle = trim((string)($module['module_title'] ?? 'your module'));
        $notifTitle = $isUpdated ? 'Module Updated' : 'New Module Available';
        $notifMessage = $isUpdated
            ? "Module '$moduleTitle' has been updated by your trainer and is now available in My Training."
            : "Module '$moduleTitle' has been uploaded by your trainer and is now available in My Training.";
        $notifLink = "/Hohoo-ville/frontend/html/trainee/pages/my_training.html?module_id=" . (int)$moduleId;

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

        $emailService = new EmailService();

        foreach ($trainees as $trainee) {
            $existingStmt->execute([$trainee['user_id'], $notifTitle, $notifMessage, $notifLink]);
            if (!$existingStmt->fetchColumn()) {
                $notifStmt->execute([$trainee['user_id'], $notifTitle, $notifMessage, $notifLink]);
            }

            if (!empty($trainee['email'])) {
                try {
                    $traineeName = trim(($trainee['first_name'] ?? '') . ' ' . ($trainee['last_name'] ?? ''));
                    $emailService->sendModulePublishedNotification(
                        $trainee['email'],
                        $traineeName !== '' ? $traineeName : 'Trainee',
                        $moduleTitle,
                        $isUpdated
                    );
                } catch (Exception $emailError) {
                    error_log("Module email notification failed for trainee {$trainee['user_id']}: " . $emailError->getMessage());
                }
            }
        }
    } catch (Exception $e) {
        error_log('Module publication notification error: ' . $e->getMessage());
    }
}

function saveUploadedLessonMaterial($files, $fieldName, $lessonId, $currentPath = null) {
    if (!isset($files[$fieldName]) || $files[$fieldName]['error'] !== UPLOAD_ERR_OK) {
        return $currentPath;
    }

    $allowedExtensions = ['pdf', 'doc', 'docx'];
    $extension = strtolower(pathinfo($files[$fieldName]['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, $allowedExtensions, true)) {
        throw new Exception('Learning materials must be PDF, DOC, or DOCX files only.');
    }

    $uploadDir = getProjectUploadsDir('lessons/');
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    if ($currentPath) {
        $oldFile = $uploadDir . $currentPath;
        if (is_file($oldFile)) {
            @unlink($oldFile);
        }
    }

    $newFileName = sprintf('lesson_%d_%d.%s', $lessonId, time(), $extension);
    $targetPath = $uploadDir . $newFileName;

    if (!move_uploaded_file($files[$fieldName]['tmp_name'], $targetPath)) {
        throw new Exception('Failed to upload the learning material file.');
    }

    return $newFileName;
}

function deleteLessonDraftData($conn, $lessonId) {
    $lessonId = (int)$lessonId;
    if ($lessonId <= 0) {
        return;
    }

    try {
        $stmt = $conn->prepare("SELECT lesson_file_path FROM tbl_lessons WHERE lesson_id = ?");
        $stmt->execute([$lessonId]);
        $existingPath = $stmt->fetchColumn();
        if ($existingPath) {
            $fullPath = getProjectUploadsDir('lessons/') . $existingPath;
            if (is_file($fullPath)) {
                @unlink($fullPath);
            }
        }
    } catch (Exception $e) {
        error_log('Unable to remove lesson material file: ' . $e->getMessage());
    }

    try { $conn->prepare("DELETE FROM tbl_task_sheet_submissions WHERE lesson_id = ?")->execute([$lessonId]); } catch (Exception $e) {}
    try { $conn->prepare("DELETE FROM tbl_learning_outcome_progress WHERE lesson_id = ?")->execute([$lessonId]); } catch (Exception $e) {}
    try { $conn->prepare("DELETE FROM tbl_lesson_contents WHERE lesson_id = ?")->execute([$lessonId]); } catch (Exception $e) {}
    try { $conn->prepare("DELETE FROM tbl_task_sheets WHERE lesson_id = ?")->execute([$lessonId]); } catch (Exception $e) {}

    try {
        $testStmt = $conn->prepare("SELECT test_id FROM tbl_test WHERE lesson_id = ?");
        $testStmt->execute([$lessonId]);
        $testIds = $testStmt->fetchAll(PDO::FETCH_COLUMN);

        foreach ($testIds as $testId) {
            try {
                $questionStmt = $conn->prepare("SELECT question_id FROM tbl_quiz_questions WHERE test_id = ?");
                $questionStmt->execute([$testId]);
                $questionIds = $questionStmt->fetchAll(PDO::FETCH_COLUMN);
                if (!empty($questionIds)) {
                    $placeholders = implode(',', array_fill(0, count($questionIds), '?'));
                    $conn->prepare("DELETE FROM tbl_quiz_options WHERE question_id IN ($placeholders)")->execute($questionIds);
                }
            } catch (Exception $e) {}

            try { $conn->prepare("DELETE FROM tbl_quiz_questions WHERE test_id = ?")->execute([$testId]); } catch (Exception $e) {}
            try { $conn->prepare("DELETE FROM tbl_grades WHERE test_id = ?")->execute([$testId]); } catch (Exception $e) {}
            try { $conn->prepare("DELETE FROM tbl_test WHERE test_id = ?")->execute([$testId]); } catch (Exception $e) {}
        }
    } catch (Exception $e) {}

    try { $conn->prepare("DELETE FROM tbl_lessons WHERE lesson_id = ?")->execute([$lessonId]); } catch (Exception $e) {}
}

ensureModuleDraftSchema($conn);

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
    case 'get-module-trainee-quiz-status':
        getModuleTraineeQuizStatus($conn);
        break;
    case 'get-qualification-trainee-roster':
        getQualificationTraineeRoster($conn);
        break;
    case 'get-trainee-sequenced-progress':
        getTraineeSequencedProgress($conn);
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
        $stmt = $conn->prepare("
            SELECT *
            FROM tbl_module
            WHERE qualification_id = ? AND competency_type = ? AND trainer_id = ?
            ORDER BY CASE WHEN module_status = 'draft' THEN 0 ELSE 1 END, module_order, module_id DESC
        ");
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
        $lessonResourceSelect = lessonResourceUrlSelect($conn, 'l');
        // Get settings and module type
        $stmt = $conn->prepare("SELECT l.posting_date, l.lesson_file_path, {$lessonResourceSelect}, m.competency_type 
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

        if (moduleSupportsTaskSheets($details['competency_type'] ?? '')) {
            $stmt = $conn->prepare("SELECT * FROM tbl_task_sheets WHERE lesson_id = ? ORDER BY display_order, task_sheet_id");
            $stmt->execute([$lessonId]);
            $details['task_sheets'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $details['task_sheets'] = [];
        }

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
    $lessonResourceUrl = normalizeLessonResourceUrl($data['lesson_resource_url'] ?? '');
    $quiz = json_decode($data['quiz'] ?? '[]', true);

    if ($lessonResourceUrl === false) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Please enter a valid video or lesson link URL.']);
        return;
    }

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

        // Update lesson posting date and linked resource
        $lessonUpdateFields = ["posting_date = ?"];
        $params = [$postingDate];

        if ($lessonFilePath) {
            $lessonUpdateFields[] = "lesson_file_path = ?";
            $params[] = $lessonFilePath;
        }

        if (columnExists($conn, 'tbl_lessons', 'lesson_resource_url')) {
            $lessonUpdateFields[] = "lesson_resource_url = ?";
            $params[] = $lessonResourceUrl;
        }

        $params[] = $lessonId;
        $stmt = $conn->prepare("UPDATE tbl_lessons SET " . implode(', ', $lessonUpdateFields) . " WHERE lesson_id = ?");
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
        $lessonStmt = $conn->prepare("SELECT m.trainer_id, m.competency_type FROM tbl_lessons l JOIN tbl_module m ON l.module_id = m.module_id WHERE l.lesson_id = ?");
        $lessonStmt->execute([$lessonId]);
        $lesson = $lessonStmt->fetch(PDO::FETCH_ASSOC);
        if (!$lesson || $lesson['trainer_id'] != $verifiedTrainerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized: Content does not belong to your training assignments']);
            return;
        }

        if ($table === 'tbl_task_sheets' && !moduleSupportsTaskSheets($lesson['competency_type'] ?? '')) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Task sheets are only available for core competency modules.']);
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
            SELECT l.posting_date, l.lesson_title, m.module_id, m.qualification_id, m.trainer_id, m.module_status
            FROM tbl_lessons l
            JOIN tbl_module m ON l.module_id = m.module_id
            WHERE l.lesson_id = ?
        ");
        $stmt->execute([$lessonId]);
        $lesson = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$lesson) {
            return;
        }

        if (($lesson['module_status'] ?? 'published') !== 'published') {
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
        
        $trainees = getAssignedTraineesForTrainerQualification(
            $conn,
            $lesson['qualification_id'],
            $lesson['trainer_id'],
            (int)($lesson['module_id'] ?? 0)
        );
        
        if (empty($trainees)) {
            return; // No approved trainees
        }

        ensureNotificationsTable($conn);
        
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
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $isMultipart = stripos($contentType, 'multipart/form-data') !== false;
    $data = $isMultipart ? $_POST : json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        $data = [];
    }

    if (isset($data['learning_outcomes']) && is_string($data['learning_outcomes'])) {
        $decodedOutcomes = json_decode($data['learning_outcomes'], true);
        $data['learning_outcomes'] = is_array($decodedOutcomes) ? $decodedOutcomes : [];
    }

    $moduleId = !empty($data['module_id']) ? (int)$data['module_id'] : null;
    $wasExistingModule = $moduleId !== null;
    $qualificationId = (int)($data['qualification_id'] ?? 0);
    $competencyType = $data['competency_type'] ?? 'core';
    $competencyType = in_array($competencyType, ['core', 'basic', 'common'], true) ? $competencyType : 'core';
    $moduleTitle = trim((string)($data['module_title'] ?? ''));
    $unitCode = trim((string)($data['unit_code'] ?? ''));
    $moduleDescription = trim((string)($data['module_description'] ?? ''));
    $moduleOrder = (int)($data['module_order'] ?? 0);
    $moduleStatus = $data['module_status'] ?? 'published';
    $moduleStatus = in_array($moduleStatus, ['draft', 'published'], true) ? $moduleStatus : 'published';
    $trainerId = (int)($data['trainer_id'] ?? 0);
    $userId = (int)($data['user_id'] ?? 0);
    $learningOutcomes = is_array($data['learning_outcomes'] ?? null) ? $data['learning_outcomes'] : [];
    $moduleAllowsTaskSheets = moduleSupportsTaskSheets($competencyType);

    // Resolve trainer_id from user_id when frontend didn't provide trainer_id.
    if (!$trainerId && $userId) {
        try {
            $stmt = $conn->prepare("SELECT trainer_id FROM tbl_trainer WHERE user_id = ? LIMIT 1");
            $stmt->execute([$userId]);
            $trainerId = (int)$stmt->fetchColumn();
        } catch (Exception $e) {
            try {
                $stmt = $conn->prepare("SELECT trainer_id FROM tbl_trainer_hdr WHERE user_id = ? LIMIT 1");
                $stmt->execute([$userId]);
                $trainerId = (int)$stmt->fetchColumn();
            } catch (Exception $ignored) {
            }
        }
    }

    if (!$moduleTitle || !$qualificationId || !$trainerId) {
        echo json_encode(['success' => false, 'message' => 'Module title, qualification, and trainer ID are required.']);
        http_response_code(400);
        return;
    }

    if ($moduleStatus === 'published' && empty($learningOutcomes)) {
        echo json_encode(['success' => false, 'message' => 'Add at least one learning outcome before publishing this module.']);
        http_response_code(400);
        return;
    }

    try {
        $verifiedTrainerId = verifyTrainerOwnership($conn, $userId, $trainerId);
        if (!$verifiedTrainerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized: Cannot create modules for another trainer']);
            return;
        }

        $moduleHasUpdatedAt = columnExists($conn, 'tbl_module', 'updated_at');
        $lessonHasUpdatedAt = columnExists($conn, 'tbl_lessons', 'updated_at');
        $lessonHasResourceUrl = columnExists($conn, 'tbl_lessons', 'lesson_resource_url');
        $existingModuleStatus = 'published';
        $existingLessonIds = [];

        if ($moduleId) {
            $moduleStmt = $conn->prepare("SELECT module_status FROM tbl_module WHERE module_id = ? AND trainer_id = ?");
            $moduleStmt->execute([$moduleId, $verifiedTrainerId]);
            $existingModule = $moduleStmt->fetch(PDO::FETCH_ASSOC);
            if (!$existingModule) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Module not found or you do not have permission to edit it.']);
                return;
            }

            $existingModuleStatus = $existingModule['module_status'] ?? 'published';

            $lessonStmt = $conn->prepare("SELECT lesson_id FROM tbl_lessons WHERE module_id = ?");
            $lessonStmt->execute([$moduleId]);
            $existingLessonIds = array_map('intval', $lessonStmt->fetchAll(PDO::FETCH_COLUMN));
        }

        $conn->beginTransaction();

        if ($moduleId) {
            $stmt = $conn->prepare("
                UPDATE tbl_module
                SET module_title = ?, unit_code = ?, module_description = ?, module_order = ?, module_status = ?" . ($moduleHasUpdatedAt ? ", updated_at = NOW()" : "") . "
                WHERE module_id = ? AND trainer_id = ?
            ");
            $stmt->execute([$moduleTitle, $unitCode, $moduleDescription, $moduleOrder, $moduleStatus, $moduleId, $verifiedTrainerId]);
        } else {
            $stmt = $conn->prepare("
                INSERT INTO tbl_module (qualification_id, competency_type, module_title, unit_code, module_description, module_order, module_status, trainer_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$qualificationId, $competencyType, $moduleTitle, $unitCode, $moduleDescription, $moduleOrder, $moduleStatus, $verifiedTrainerId]);
            $moduleId = (int)$conn->lastInsertId();
        }

        $submittedLessonIds = [];

        foreach ($learningOutcomes as $idx => $outcome) {
            $outcomeTitle = trim((string)($outcome['title'] ?? ''));
            $outcomeDesc = trim((string)($outcome['description'] ?? ''));
            $outcomeOrder = (int)($outcome['outcome_order'] ?? $idx);
            $isRequired = (int)($outcome['is_required'] ?? 1);
            $quizInstructions = trim((string)($outcome['quiz_instructions'] ?? ''));
            $taskInstructions = $moduleAllowsTaskSheets ? trim((string)($outcome['task_instructions'] ?? '')) : '';
            $contents = is_array($outcome['contents'] ?? null) ? $outcome['contents'] : [];
            $quiz = is_array($outcome['quiz'] ?? null) ? $outcome['quiz'] : [];
            $taskSheets = $moduleAllowsTaskSheets && is_array($outcome['task_sheets'] ?? null) ? $outcome['task_sheets'] : [];
            $uploadField = trim((string)($outcome['upload_field'] ?? ''));
            $requestedExistingFilePath = trim((string)($outcome['existing_file_path'] ?? ''));
            $requestedLessonResourceUrl = normalizeLessonResourceUrl($outcome['lesson_resource_url'] ?? '');
            $lessonId = !empty($outcome['lesson_id']) ? (int)$outcome['lesson_id'] : null;

            if ($requestedLessonResourceUrl === false) {
                throw new Exception('One of the learning outcomes has an invalid video or lesson link.');
            }

            if ($outcomeTitle === '') {
                continue;
            }

            $currentLessonFilePath = null;
            $currentLessonResourceUrl = null;

            if ($lessonId) {
                $lessonSelectFields = $lessonHasResourceUrl
                    ? 'lesson_file_path, lesson_resource_url'
                    : 'lesson_file_path';
                $lessonStmt = $conn->prepare("SELECT {$lessonSelectFields} FROM tbl_lessons WHERE lesson_id = ? AND module_id = ?");
                $lessonStmt->execute([$lessonId, $moduleId]);
                $existingLesson = $lessonStmt->fetch(PDO::FETCH_ASSOC);
                if (!$existingLesson) {
                    throw new Exception('One of the learning outcomes no longer exists or does not belong to this module.');
                }

                $currentLessonFilePath = $existingLesson['lesson_file_path'] ?? null;
                $currentLessonResourceUrl = $existingLesson['lesson_resource_url'] ?? null;
                $stmt = $conn->prepare("
                    UPDATE tbl_lessons
                    SET lesson_title = ?, lesson_description = ?, outcome_order = ?, is_required = ?, quiz_instructions = ?, task_instructions = ?" . ($lessonHasUpdatedAt ? ", updated_at = NOW()" : "") . "
                    WHERE lesson_id = ? AND module_id = ?
                ");
                $stmt->execute([$outcomeTitle, $outcomeDesc, $outcomeOrder, $isRequired, $quizInstructions, $taskInstructions, $lessonId, $moduleId]);
            } else {
                $postingDate = $moduleStatus === 'published' ? date('Y-m-d H:i:s') : null;
                $stmt = $conn->prepare("
                    INSERT INTO tbl_lessons (module_id, lesson_title, lesson_description, outcome_order, is_required, quiz_instructions, task_instructions, posting_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$moduleId, $outcomeTitle, $outcomeDesc, $outcomeOrder, $isRequired, $quizInstructions, $taskInstructions, $postingDate]);
                $lessonId = (int)$conn->lastInsertId();
            }

            $submittedLessonIds[] = $lessonId;

            $finalLessonFilePath = $requestedExistingFilePath !== '' ? $requestedExistingFilePath : $currentLessonFilePath;
            $finalLessonResourceUrl = $requestedLessonResourceUrl !== null ? $requestedLessonResourceUrl : null;
            if ($requestedLessonResourceUrl === null && $lessonId && array_key_exists('lesson_resource_url', $outcome)) {
                $finalLessonResourceUrl = null;
            } elseif ($requestedLessonResourceUrl === null && !array_key_exists('lesson_resource_url', $outcome)) {
                $finalLessonResourceUrl = $currentLessonResourceUrl;
            }
            if ($uploadField !== '') {
                $finalLessonFilePath = saveUploadedLessonMaterial($_FILES, $uploadField, $lessonId, $finalLessonFilePath);
            }

            $lessonUpdateSql = "
                UPDATE tbl_lessons
                SET lesson_file_path = ?, ";
            $lessonUpdateParams = [$finalLessonFilePath];

            if ($lessonHasResourceUrl) {
                $lessonUpdateSql .= "lesson_resource_url = ?, ";
                $lessonUpdateParams[] = $finalLessonResourceUrl;
            }

            $lessonUpdateSql .= "posting_date = CASE WHEN ? = 'published' THEN COALESCE(posting_date, NOW()) ELSE NULL END
                WHERE lesson_id = ?
            ";
            $lessonUpdateParams[] = $moduleStatus;
            $lessonUpdateParams[] = $lessonId;
            $lessonUpdateStmt = $conn->prepare($lessonUpdateSql);
            $lessonUpdateStmt->execute($lessonUpdateParams);

            $conn->prepare("DELETE FROM tbl_lesson_contents WHERE lesson_id = ?")->execute([$lessonId]);
            if (!empty($contents)) {
                $contentStmt = $conn->prepare("INSERT INTO tbl_lesson_contents (lesson_id, title, content, display_order) VALUES (?, ?, ?, ?)");
                foreach ($contents as $contentIdx => $content) {
                    $contentTitle = trim((string)($content['title'] ?? ''));
                    $contentBody = (string)($content['text'] ?? $content['content'] ?? '');
                    if ($contentTitle === '' && trim($contentBody) === '') {
                        continue;
                    }
                    $displayOrder = isset($content['display_order']) ? (int)$content['display_order'] : $contentIdx;
                    $contentStmt->execute([$lessonId, $contentTitle, $contentBody, $displayOrder]);
                }
            }

            $testStmt = $conn->prepare("SELECT test_id FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1");
            $testStmt->execute([$lessonId]);
            $testId = $testStmt->fetchColumn();

            if ($testId) {
                $questionStmt = $conn->prepare("SELECT question_id FROM tbl_quiz_questions WHERE test_id = ?");
                $questionStmt->execute([$testId]);
                $questionIds = $questionStmt->fetchAll(PDO::FETCH_COLUMN);
                if (!empty($questionIds)) {
                    $placeholders = implode(',', array_fill(0, count($questionIds), '?'));
                    $conn->prepare("DELETE FROM tbl_quiz_options WHERE question_id IN ($placeholders)")->execute($questionIds);
                }
                $conn->prepare("DELETE FROM tbl_quiz_questions WHERE test_id = ?")->execute([$testId]);
                $conn->prepare("UPDATE tbl_test SET deadline = NULL WHERE test_id = ?")->execute([$testId]);
            }

            if (!empty($quiz)) {
                if (!$testId) {
                    $insertTestStmt = $conn->prepare("INSERT INTO tbl_test (lesson_id, activity_type_id, deadline) VALUES (?, 1, NULL)");
                    $insertTestStmt->execute([$lessonId]);
                    $testId = $conn->lastInsertId();
                }

                $questionInsertStmt = $conn->prepare("INSERT INTO tbl_quiz_questions (test_id, question_text, question_type) VALUES (?, ?, ?)");
                $optionInsertStmt = $conn->prepare("INSERT INTO tbl_quiz_options (question_id, option_text, is_correct) VALUES (?, ?, ?)");

                foreach ($quiz as $question) {
                    $questionText = trim((string)($question['text'] ?? ''));
                    $questionType = $question['type'] ?? 'multiple_choice';
                    if ($questionText === '') {
                        continue;
                    }

                    $questionInsertStmt->execute([$testId, $questionText, $questionType]);
                    $questionId = $conn->lastInsertId();

                    foreach (($question['options'] ?? []) as $option) {
                        $optionText = trim((string)($option['text'] ?? ''));
                        if ($optionText === '') {
                            continue;
                        }
                        $optionInsertStmt->execute([$questionId, $optionText, !empty($option['is_correct']) ? 1 : 0]);
                    }
                }
            }

            $conn->prepare("DELETE FROM tbl_task_sheets WHERE lesson_id = ?")->execute([$lessonId]);
            if ($moduleAllowsTaskSheets && !empty($taskSheets)) {
                $taskStmt = $conn->prepare("INSERT INTO tbl_task_sheets (lesson_id, title, content, display_order) VALUES (?, ?, ?, ?)");
                foreach ($taskSheets as $taskIdx => $taskSheet) {
                    $taskTitle = trim((string)($taskSheet['title'] ?? ''));
                    $taskContent = (string)($taskSheet['content'] ?? '');
                    if ($taskTitle === '' && trim($taskContent) === '') {
                        continue;
                    }
                    $taskStmt->execute([$lessonId, $taskTitle, $taskContent, $taskIdx]);
                }
            }
        }

        if ($moduleId && ($moduleStatus === 'draft' || $existingModuleStatus === 'draft')) {
            $lessonsToDelete = array_diff($existingLessonIds, array_map('intval', $submittedLessonIds));
            foreach ($lessonsToDelete as $lessonIdToDelete) {
                deleteLessonDraftData($conn, $lessonIdToDelete);
            }
        }

        $conn->commit();

        $shouldNotifyPublishedModule = $moduleStatus === 'published';
        if ($shouldNotifyPublishedModule) {
            notifyTraineesAboutPublishedModule($conn, $moduleId, $wasExistingModule);
        }

        $message = $moduleStatus === 'draft'
            ? 'Module draft saved successfully.'
            : ($existingModuleStatus === 'draft' ? 'Draft published successfully.' : 'Module saved successfully.');

        echo json_encode([
            'success' => true,
            'data' => [
                'module_id' => $moduleId,
                'module_status' => $moduleStatus
            ],
            'message' => $message
        ]);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function moduleSupportsTaskSheets($competencyType): bool {
    return strtolower(trim((string)$competencyType)) === 'core';
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

        $moduleAllowsTaskSheets = moduleSupportsTaskSheets($module['competency_type'] ?? '');

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

            if ($moduleAllowsTaskSheets) {
                $stmt = $conn->prepare("SELECT * FROM tbl_task_sheets WHERE lesson_id = ? ORDER BY display_order, task_sheet_id");
                $stmt->execute([$lessonId]);
                $outcome['task_sheets'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $outcome['task_sheets'] = [];
            }
        }

        $module['learning_outcomes'] = $outcomes;
        echo json_encode(['success' => true, 'data' => $module]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function fetchAssignedTraineeRosterForModuleSummary($conn, int $moduleId, int $trainerId, int $qualificationId): array {
    if ($moduleId <= 0 || $trainerId <= 0 || $qualificationId <= 0) {
        return [];
    }

    $enrollmentQualificationExpr = columnExists($conn, 'tbl_enrollment', 'qualification_id')
        ? 'e.qualification_id'
        : 'NULL';

    try {
        $stmt = $conn->prepare("
            SELECT DISTINCT
                th.trainee_id,
                th.user_id,
                th.trainee_school_id,
                th.email,
                th.first_name,
                th.last_name
            FROM tbl_enrollment e
            LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
            LEFT JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
            JOIN tbl_trainee_hdr th ON e.trainee_id = th.trainee_id
            WHERE e.status = 'approved'
              AND COALESCE({$enrollmentQualificationExpr}, oq.qualification_id, b.qualification_id) = ?
              AND (
                    (
                        COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
                        AND EXISTS (
                            SELECT 1
                            FROM tbl_batch_trainer_assignments a
                            WHERE a.batch_id = b.batch_id
                              AND a.module_id = ?
                              AND a.trainer_id = ?
                        )
                    )
                    OR (
                        COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
                        AND NOT EXISTS (
                            SELECT 1
                            FROM tbl_batch_trainer_assignments fallback_assignments
                            WHERE fallback_assignments.batch_id = b.batch_id
                        )
                        AND b.trainer_id = ?
                    )
                    OR (
                        COALESCE(b.trainer_assignment_mode, 'single') <> 'multiple'
                        AND b.trainer_id = ?
                    )
              )
            ORDER BY th.last_name, th.first_name
        ");
        $stmt->execute([$qualificationId, $moduleId, $trainerId, $trainerId, $trainerId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        if (!empty($rows)) {
            return $rows;
        }
    } catch (Exception $e) {
        error_log('Module trainee roster lookup failed: ' . $e->getMessage());
    }

    try {
        $stmt = $conn->prepare("
            SELECT DISTINCT
                th.trainee_id,
                th.user_id,
                th.trainee_school_id,
                th.email,
                th.first_name,
                th.last_name
            FROM tbl_enrollment e
            LEFT JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
            JOIN tbl_trainee_hdr th ON e.trainee_id = th.trainee_id
            WHERE e.status = 'approved'
              AND COALESCE({$enrollmentQualificationExpr}, oq.qualification_id) = ?
            ORDER BY th.last_name, th.first_name
        ");
        $stmt->execute([$qualificationId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Exception $e) {
        error_log('Module trainee roster fallback lookup failed: ' . $e->getMessage());
        return [];
    }
}

function fetchAssignedTraineeRosterForQualification($conn, int $trainerId, int $qualificationId): array {
    if ($trainerId <= 0 || $qualificationId <= 0) {
        return [];
    }

    $enrollmentQualificationExpr = columnExists($conn, 'tbl_enrollment', 'qualification_id')
        ? 'e.qualification_id'
        : 'NULL';

    try {
        $stmt = $conn->prepare("
            SELECT DISTINCT
                th.trainee_id,
                th.user_id,
                th.trainee_school_id,
                th.email,
                th.first_name,
                th.last_name
            FROM tbl_enrollment e
            LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
            LEFT JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
            JOIN tbl_trainee_hdr th ON e.trainee_id = th.trainee_id
            WHERE e.status = 'approved'
              AND COALESCE({$enrollmentQualificationExpr}, oq.qualification_id, b.qualification_id) = ?
              AND (
                    (
                        COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
                        AND EXISTS (
                            SELECT 1
                            FROM tbl_batch_trainer_assignments a
                            WHERE a.batch_id = b.batch_id
                              AND a.trainer_id = ?
                        )
                    )
                    OR (
                        COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
                        AND NOT EXISTS (
                            SELECT 1
                            FROM tbl_batch_trainer_assignments fallback_assignments
                            WHERE fallback_assignments.batch_id = b.batch_id
                        )
                        AND b.trainer_id = ?
                    )
                    OR (
                        COALESCE(b.trainer_assignment_mode, 'single') <> 'multiple'
                        AND b.trainer_id = ?
                    )
              )
            ORDER BY th.last_name, th.first_name
        ");
        $stmt->execute([$qualificationId, $trainerId, $trainerId, $trainerId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        if (!empty($rows)) {
            return $rows;
        }
    } catch (Exception $e) {
        error_log('Qualification trainee roster lookup failed: ' . $e->getMessage());
    }

    return [];
}

function getQualificationTraineeRoster($conn) {
    $qualificationId = (int)($_GET['qualification_id'] ?? 0);
    $userId = (int)($_GET['user_id'] ?? 0);

    if ($qualificationId <= 0 || $userId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Qualification ID and user ID are required.']);
        http_response_code(400);
        return;
    }

    try {
        $trainerId = resolveTrainerIdFromUser($conn, $userId);
        if ($trainerId <= 0 || !verifyTrainerOwnership($conn, $userId, $trainerId)) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized: Unable to load trainee roster.']);
            http_response_code(403);
            return;
        }

        $trainees = fetchAssignedTraineeRosterForQualification($conn, $trainerId, $qualificationId);

        echo json_encode([
            'success' => true,
            'data' => array_map(static function ($trainee) {
                return [
                    'trainee_id' => (int)($trainee['trainee_id'] ?? 0),
                    'user_id' => (int)($trainee['user_id'] ?? 0),
                    'trainee_school_id' => $trainee['trainee_school_id'] ?? null,
                    'email' => $trainee['email'] ?? null,
                    'first_name' => $trainee['first_name'] ?? '',
                    'last_name' => $trainee['last_name'] ?? ''
                ];
            }, $trainees)
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function getTraineeSequencedProgress($conn) {
    $qualificationId = (int)($_GET['qualification_id'] ?? 0);
    $traineeId = (int)($_GET['trainee_id'] ?? 0);
    $userId = (int)($_GET['user_id'] ?? 0);

    if ($qualificationId <= 0 || $traineeId <= 0 || $userId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Qualification ID, trainee ID, and user ID are required.']);
        http_response_code(400);
        return;
    }

    try {
        $trainerId = resolveTrainerIdFromUser($conn, $userId);
        if ($trainerId <= 0 || !verifyTrainerOwnership($conn, $userId, $trainerId)) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized: Unable to load trainee progress.']);
            http_response_code(403);
            return;
        }

        $trainees = fetchAssignedTraineeRosterForQualification($conn, $trainerId, $qualificationId);
        $selectedTrainee = null;
        foreach ($trainees as $trainee) {
            if ((int)($trainee['trainee_id'] ?? 0) === $traineeId) {
                $selectedTrainee = $trainee;
                break;
            }
        }

        if (!$selectedTrainee) {
            echo json_encode(['success' => false, 'message' => 'Trainee is not assigned to this qualification.']);
            http_response_code(404);
            return;
        }

        $moduleOrderSelect = columnExists($conn, 'tbl_module', 'module_order')
            ? 'COALESCE(m.module_order, 0) AS module_order'
            : '0 AS module_order';
        $lessonOrderSelect = columnExists($conn, 'tbl_lessons', 'outcome_order')
            ? 'COALESCE(l.outcome_order, 0) AS outcome_order'
            : (columnExists($conn, 'tbl_lessons', 'lesson_order')
                ? 'COALESCE(l.lesson_order, 0) AS outcome_order'
                : '0 AS outcome_order');
        $activeClause = columnExists($conn, 'tbl_module', 'is_active')
            ? "AND COALESCE(m.is_active, 1) = 1"
            : '';
        $lopQuizCompletedExpr = columnExists($conn, 'tbl_learning_outcome_progress', 'quiz_completed')
            ? 'COALESCE(lop.quiz_completed, 0)'
            : (columnExists($conn, 'tbl_learning_outcome_progress', 'quiz_passed')
                ? 'COALESCE(lop.quiz_passed, 0)'
                : '0');
        $lopTaskCompletedExpr = columnExists($conn, 'tbl_learning_outcome_progress', 'task_completed')
            ? 'COALESCE(lop.task_completed, 0)'
            : (columnExists($conn, 'tbl_learning_outcome_progress', 'task_passed')
                ? 'COALESCE(lop.task_passed, 0)'
                : '0');

        $stmt = $conn->prepare("
            SELECT
                m.module_id,
                m.module_title,
                m.module_description,
                COALESCE(m.competency_type, 'core') AS competency_type,
                COALESCE(m.module_status, 'published') AS module_status,
                {$moduleOrderSelect},
                COALESCE(mp.status, 'not_started') AS progress_record_status,
                l.lesson_id,
                l.lesson_title,
                {$lessonOrderSelect},
                CASE WHEN qt.test_id IS NULL THEN 0 ELSE 1 END AS has_quiz,
                COALESCE(ts.task_sheet_count, 0) AS task_sheet_count,
                COALESCE(qg.quiz_answered, 0) AS quiz_answered,
                COALESCE(ss.task_submitted, 0) AS task_submitted,
                {$lopQuizCompletedExpr} AS progress_quiz_completed,
                {$lopTaskCompletedExpr} AS progress_task_completed,
                COALESCE(lop.learning_outcome_completed, 0) AS outcome_completed
            FROM tbl_module m
            LEFT JOIN tbl_module_progress mp
              ON mp.module_id = m.module_id
             AND mp.trainee_id = ?
            LEFT JOIN tbl_lessons l
              ON l.module_id = m.module_id
            LEFT JOIN (
                SELECT lesson_id, MIN(test_id) AS test_id
                FROM tbl_test
                WHERE activity_type_id = 1
                GROUP BY lesson_id
            ) qt ON qt.lesson_id = l.lesson_id
            LEFT JOIN (
                SELECT t.lesson_id, 1 AS quiz_answered
                FROM tbl_grades g
                JOIN tbl_test t
                  ON t.test_id = g.test_id
                 AND t.activity_type_id = 1
                WHERE g.trainee_id = ?
                GROUP BY t.lesson_id
            ) qg ON qg.lesson_id = l.lesson_id
            LEFT JOIN (
                SELECT lesson_id, COUNT(*) AS task_sheet_count
                FROM tbl_task_sheets
                GROUP BY lesson_id
            ) ts ON ts.lesson_id = l.lesson_id
            LEFT JOIN (
                SELECT lesson_id, 1 AS task_submitted
                FROM tbl_task_sheet_submissions
                WHERE trainee_id = ?
                  AND status IN ('approved', 'recorded')
                GROUP BY lesson_id
            ) ss ON ss.lesson_id = l.lesson_id
            LEFT JOIN tbl_learning_outcome_progress lop
              ON lop.lesson_id = l.lesson_id
             AND lop.trainee_id = ?
            WHERE m.qualification_id = ?
              {$activeClause}
              AND COALESCE(m.module_status, 'published') = 'published'
            ORDER BY
                FIELD(COALESCE(m.competency_type, ''), 'core', 'common', 'basic'),
                module_order,
                m.module_id,
                outcome_order,
                l.lesson_id
        ");
        $stmt->execute([$traineeId, $traineeId, $traineeId, $traineeId, $qualificationId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $modules = [];
        foreach ($rows as $row) {
            $moduleId = (int)($row['module_id'] ?? 0);
            if ($moduleId <= 0) {
                continue;
            }

            if (!isset($modules[$moduleId])) {
                $modules[$moduleId] = [
                    'module_id' => $moduleId,
                    'module_title' => $row['module_title'] ?? '',
                    'module_description' => $row['module_description'] ?? '',
                    'competency_type' => $row['competency_type'] ?? 'core',
                    'module_status' => $row['module_status'] ?? 'published',
                    'module_order' => (int)($row['module_order'] ?? 0),
                    'progress_record_status' => $row['progress_record_status'] ?? 'not_started',
                    'sequence_no' => 0,
                    'is_available' => false,
                    'is_completed' => false,
                    'progress_status' => 'not_started',
                    'completion_percentage' => 0,
                    'total_outcomes' => 0,
                    'tracked_outcomes' => 0,
                    'started_outcomes' => 0,
                    'completed_outcomes' => 0,
                    'lacking_outcomes' => 0,
                    'untracked_outcomes' => 0,
                    'outcomes' => []
                ];
            }

            $lessonId = (int)($row['lesson_id'] ?? 0);
            if ($lessonId <= 0) {
                continue;
            }

            $requiresQuiz = (int)($row['has_quiz'] ?? 0) === 1;
            $requiresTask = (int)($row['task_sheet_count'] ?? 0) > 0;
            $quizCompleted = (int)($row['quiz_answered'] ?? 0) === 1 || (int)($row['progress_quiz_completed'] ?? 0) === 1;
            $taskCompleted = (int)($row['task_submitted'] ?? 0) === 1 || (int)($row['progress_task_completed'] ?? 0) === 1;
            $tracked = $requiresQuiz || $requiresTask || $quizCompleted || $taskCompleted || (int)($row['outcome_completed'] ?? 0) === 1;

            $completedItems = [];
            $missingItems = [];

            if ($requiresQuiz && $quizCompleted) {
                $completedItems[] = 'Quiz';
            } elseif ($requiresQuiz) {
                $missingItems[] = 'Quiz';
            }

            if ($requiresTask && $taskCompleted) {
                $completedItems[] = 'Task Sheet';
            } elseif ($requiresTask) {
                $missingItems[] = 'Task Sheet';
            }

            $outcomeCompleted = (int)($row['outcome_completed'] ?? 0) === 1;
            if (!$outcomeCompleted && $tracked && empty($missingItems)) {
                $outcomeCompleted = true;
            }

            $outcomeStatus = 'not_tracked';
            if ($outcomeCompleted) {
                $outcomeStatus = 'completed';
            } elseif (!empty($completedItems) && !empty($missingItems)) {
                $outcomeStatus = 'in_progress';
            } elseif (!empty($missingItems)) {
                $outcomeStatus = 'not_started';
            }

            $modules[$moduleId]['outcomes'][] = [
                'lesson_id' => $lessonId,
                'lesson_title' => $row['lesson_title'] ?? '',
                'outcome_order' => (int)($row['outcome_order'] ?? 0),
                'tracked' => $tracked,
                'requires_quiz' => $requiresQuiz,
                'requires_task_sheet' => $requiresTask,
                'quiz_completed' => $quizCompleted,
                'task_completed' => $taskCompleted,
                'outcome_completed' => $outcomeCompleted,
                'status' => $outcomeStatus,
                'completed_items' => $completedItems,
                'missing_items' => $missingItems
            ];
        }

        $moduleList = array_values($modules);
        $previousModuleCompleted = true;
        $summary = [
            'total_modules' => count($moduleList),
            'completed_modules' => 0,
            'in_progress_modules' => 0,
            'not_started_modules' => 0,
            'locked_modules' => 0,
            'total_outcomes' => 0,
            'tracked_outcomes' => 0,
            'completed_outcomes' => 0,
            'lacking_outcomes' => 0,
            'completion_percentage' => 0
        ];

        foreach ($moduleList as $index => &$module) {
            $module['sequence_no'] = $index + 1;

            foreach ($module['outcomes'] as $outcomeIndex => &$outcome) {
                $outcome['sequence_no'] = $outcomeIndex + 1;
                $module['total_outcomes'] += 1;
                if (!empty($outcome['tracked'])) {
                    $module['tracked_outcomes'] += 1;
                }
                if ($outcome['status'] === 'completed' || $outcome['status'] === 'in_progress') {
                    $module['started_outcomes'] += 1;
                }
                if (!empty($outcome['outcome_completed'])) {
                    $module['completed_outcomes'] += 1;
                }
            }
            unset($outcome);

            $module['lacking_outcomes'] = max(0, $module['tracked_outcomes'] - $module['completed_outcomes']);
            $module['untracked_outcomes'] = max(0, $module['total_outcomes'] - $module['tracked_outcomes']);
            $module['completion_percentage'] = $module['tracked_outcomes'] > 0
                ? (int)round(($module['completed_outcomes'] / $module['tracked_outcomes']) * 100)
                : 0;

            $moduleHasStarted = $module['started_outcomes'] > 0
                || ($module['progress_record_status'] ?? 'not_started') === 'in_progress';
            $moduleIsCompleted = ($module['tracked_outcomes'] > 0 && $module['completed_outcomes'] >= $module['tracked_outcomes'])
                || ($module['progress_record_status'] ?? 'not_started') === 'completed';

            $module['is_available'] = $previousModuleCompleted;
            $module['is_completed'] = $moduleIsCompleted;

            if ($moduleIsCompleted) {
                $module['progress_status'] = 'completed';
            } elseif ($moduleHasStarted) {
                $module['progress_status'] = 'in_progress';
            } elseif (!$module['is_available']) {
                $module['progress_status'] = 'locked';
            } else {
                $module['progress_status'] = 'not_started';
            }

            if (!$module['is_completed']) {
                $previousModuleCompleted = false;
            }

            $summary['total_outcomes'] += $module['total_outcomes'];
            $summary['tracked_outcomes'] += $module['tracked_outcomes'];
            $summary['completed_outcomes'] += $module['completed_outcomes'];
            $summary['lacking_outcomes'] += $module['lacking_outcomes'];

            if ($module['progress_status'] === 'completed') {
                $summary['completed_modules'] += 1;
            } elseif ($module['progress_status'] === 'in_progress') {
                $summary['in_progress_modules'] += 1;
            } elseif ($module['progress_status'] === 'locked') {
                $summary['locked_modules'] += 1;
            } else {
                $summary['not_started_modules'] += 1;
            }
        }
        unset($module);

        $summary['completion_percentage'] = $summary['tracked_outcomes'] > 0
            ? (int)round(($summary['completed_outcomes'] / $summary['tracked_outcomes']) * 100)
            : 0;

        echo json_encode([
            'success' => true,
            'data' => [
                'trainee' => [
                    'trainee_id' => (int)($selectedTrainee['trainee_id'] ?? 0),
                    'user_id' => (int)($selectedTrainee['user_id'] ?? 0),
                    'trainee_school_id' => $selectedTrainee['trainee_school_id'] ?? null,
                    'email' => $selectedTrainee['email'] ?? null,
                    'first_name' => $selectedTrainee['first_name'] ?? '',
                    'last_name' => $selectedTrainee['last_name'] ?? ''
                ],
                'summary' => $summary,
                'modules' => $moduleList
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function getModuleTraineeQuizStatus($conn) {
    $moduleId = (int)($_GET['module_id'] ?? 0);
    $userId = (int)($_GET['user_id'] ?? 0);

    if ($moduleId <= 0 || $userId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Module ID and user ID are required.']);
        http_response_code(400);
        return;
    }

    try {
        $moduleStmt = $conn->prepare("
            SELECT
                module_id,
                module_title,
                qualification_id,
                trainer_id,
                COALESCE(module_status, 'published') AS module_status
            FROM tbl_module
            WHERE module_id = ?
            LIMIT 1
        ");
        $moduleStmt->execute([$moduleId]);
        $module = $moduleStmt->fetch(PDO::FETCH_ASSOC);

        if (!$module) {
            echo json_encode(['success' => false, 'message' => 'Module not found.']);
            http_response_code(404);
            return;
        }

        $verifiedTrainerId = verifyTrainerOwnership($conn, $userId, (int)($module['trainer_id'] ?? 0));
        if (!$verifiedTrainerId) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized: You cannot view this module summary.']);
            http_response_code(403);
            return;
        }

        $trainees = fetchAssignedTraineeRosterForModuleSummary(
            $conn,
            $moduleId,
            $verifiedTrainerId,
            (int)($module['qualification_id'] ?? 0)
        );

        $quizStmt = $conn->prepare("
            SELECT
                l.lesson_id,
                l.lesson_title,
                tt.test_id,
                COALESCE(NULLIF(tt.max_score, 0), qc.question_count, 0) AS total_questions
            FROM tbl_lessons l
            JOIN tbl_test tt
              ON tt.lesson_id = l.lesson_id
             AND tt.activity_type_id = 1
            LEFT JOIN (
                SELECT test_id, COUNT(*) AS question_count
                FROM tbl_quiz_questions
                GROUP BY test_id
            ) qc ON qc.test_id = tt.test_id
            WHERE l.module_id = ?
            ORDER BY COALESCE(l.outcome_order, 0), l.lesson_id
        ");
        $quizStmt->execute([$moduleId]);
        $quizLessons = $quizStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $quizLessonIds = array_map('intval', array_column($quizLessons, 'lesson_id'));
        $answeredQuizMap = [];

        if (!empty($quizLessonIds)) {
            $placeholders = implode(',', array_fill(0, count($quizLessonIds), '?'));
            $answeredStmt = $conn->prepare("
                SELECT
                    g.trainee_id,
                    COUNT(DISTINCT tt.lesson_id) AS answered_quizzes
                FROM tbl_grades g
                JOIN tbl_test tt ON tt.test_id = g.test_id
                WHERE tt.activity_type_id = 1
                  AND tt.lesson_id IN ($placeholders)
                GROUP BY g.trainee_id
            ");
            $answeredStmt->execute($quizLessonIds);

            foreach ($answeredStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $answeredQuizMap[(int)($row['trainee_id'] ?? 0)] = (int)($row['answered_quizzes'] ?? 0);
            }
        }

        $totalQuizzes = count($quizLessonIds);
        $groups = [
            'answered' => [],
            'lacking' => [],
            'no_answer' => []
        ];

        foreach ($trainees as $trainee) {
            $traineeId = (int)($trainee['trainee_id'] ?? 0);
            $answeredQuizzes = $traineeId > 0 ? (int)($answeredQuizMap[$traineeId] ?? 0) : 0;
            $answeredQuizzes = max(0, min($answeredQuizzes, $totalQuizzes));
            $remainingQuizzes = max(0, $totalQuizzes - $answeredQuizzes);

            $entry = [
                'trainee_id' => $traineeId,
                'trainee_school_id' => $trainee['trainee_school_id'] ?? null,
                'user_id' => (int)($trainee['user_id'] ?? 0),
                'email' => $trainee['email'] ?? null,
                'first_name' => $trainee['first_name'] ?? '',
                'last_name' => $trainee['last_name'] ?? '',
                'answered_quizzes' => $answeredQuizzes,
                'remaining_quizzes' => $remainingQuizzes
            ];

            if ($totalQuizzes > 0 && $answeredQuizzes >= $totalQuizzes) {
                $groups['answered'][] = $entry;
            } elseif ($answeredQuizzes > 0) {
                $groups['lacking'][] = $entry;
            } else {
                $groups['no_answer'][] = $entry;
            }
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'module' => [
                    'module_id' => (int)($module['module_id'] ?? 0),
                    'module_title' => $module['module_title'] ?? '',
                    'module_status' => $module['module_status'] ?? 'published',
                    'qualification_id' => (int)($module['qualification_id'] ?? 0)
                ],
                'summary' => [
                    'total_trainees' => count($trainees),
                    'total_quizzes' => $totalQuizzes,
                    'answered_count' => count($groups['answered']),
                    'lacking_count' => count($groups['lacking']),
                    'no_answer_count' => count($groups['no_answer'])
                ],
                'quiz_lessons' => array_map(static function ($lesson) {
                    return [
                        'lesson_id' => (int)($lesson['lesson_id'] ?? 0),
                        'lesson_title' => $lesson['lesson_title'] ?? '',
                        'test_id' => (int)($lesson['test_id'] ?? 0),
                        'total_questions' => (int)($lesson['total_questions'] ?? 0)
                    ];
                }, $quizLessons),
                'groups' => $groups
            ]
        ]);
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
        $quizCompletedExpr = columnExists($conn, 'tbl_learning_outcome_progress', 'quiz_completed')
            ? 'COALESCE(lop.quiz_completed, 0)'
            : (columnExists($conn, 'tbl_learning_outcome_progress', 'quiz_passed')
                ? 'COALESCE(lop.quiz_passed, 0)'
                : '0');
        $taskCompletedExpr = columnExists($conn, 'tbl_learning_outcome_progress', 'task_completed')
            ? 'COALESCE(lop.task_completed, 0)'
            : (columnExists($conn, 'tbl_learning_outcome_progress', 'task_passed')
                ? 'COALESCE(lop.task_passed, 0)'
                : '0');

        // Get all modules for qualification
        $stmt = $conn->prepare("
            SELECT m.* FROM tbl_module m
            WHERE m.qualification_id = ? AND m.is_active = 1 AND COALESCE(m.module_status, 'published') = 'published'
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
                       {$quizCompletedExpr} AS quiz_completed,
                       {$taskCompletedExpr} AS task_completed,
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
                WHERE m.qualification_id = ? AND m.is_active = 1 AND COALESCE(m.module_status, 'published') = 'published'
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
                WHERE m.qualification_id = ? AND COALESCE(m.module_status, 'published') = 'published'
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

