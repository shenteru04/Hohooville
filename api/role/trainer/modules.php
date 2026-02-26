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

$database = new Database();
$conn = $database->getConnection();

$action = $_GET['action'] ?? '';

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

    try {
        if ($action === 'update-module' && $id) {
            $stmt = $conn->prepare("UPDATE tbl_module SET module_title = ?, module_description = ? WHERE module_id = ? AND trainer_id = ?");
            $stmt->execute([$title, $desc, $id, $trainerId]);
        } else {
            $stmt = $conn->prepare("INSERT INTO tbl_module (qualification_id, competency_type, module_title, module_description, trainer_id) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$qualificationId, $type, $title, $desc, $trainerId]);
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

    try {
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
    $files = $_FILES;
    $postingDate = $data['posting_date'] ?: null;
    $deadline = $data['deadline'] ?: null;
    $quiz = json_decode($data['quiz'] ?? '[]', true);

    try {
        $conn->beginTransaction();
        
        // Handle file upload for basic/common competencies
        $lessonFilePath = null;
        if (isset($files['lesson_file']) && $files['lesson_file']['error'] === UPLOAD_ERR_OK) {
            $upload_dir = '../../../../uploads/lessons/';
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
            notifyTraineesAboutLesson($conn, $lessonId, 'Quiz', 'Quiz Posted');
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

    try {
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
 * Send notifications to all trainees enrolled in the batch for a lesson
 * Only notifies if the posting date/time has already passed
 * 
 * @param PDO $conn Database connection
 * @param int $lessonId The lesson being posted
 * @param string $contentType Type of content (Information Sheet, Task Sheet, Quiz)
 * @param string $contentTitle Title of the content being posted
 */
function notifyTraineesAboutLesson($conn, $lessonId, $contentType, $contentTitle) {
    try {
        // Get lesson posting date and batch info
        $stmt = $conn->prepare("
            SELECT l.posting_date, m.module_id, m.qualification_id
            FROM tbl_lessons l
            JOIN tbl_module m ON l.module_id = m.module_id
            WHERE l.lesson_id = ?
        ");
        $stmt->execute([$lessonId]);
        $lesson = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$lesson || !$lesson['posting_date']) {
            return; // No posting date set, don't notify yet
        }
        
        // Check if posting date has passed (current time >= posting date)
        $postingDateTime = new DateTime($lesson['posting_date']);
        $currentDateTime = new DateTime();
        
        if ($currentDateTime < $postingDateTime) {
            return; // Posting date hasn't arrived yet, don't notify
        }
        
        // Get all trainees enrolled in batches with this qualification
        $stmt = $conn->prepare("
            SELECT DISTINCT u.user_id, t.trainee_id, CONCAT(t.first_name, ' ', t.last_name) as trainee_name
            FROM tbl_enrollment e
            JOIN tbl_trainee t ON e.trainee_id = t.trainee_id
            JOIN tbl_users u ON t.trainee_id = u.trainee_id
            JOIN tbl_batch b ON e.batch_id = b.batch_id
            WHERE b.qualification_id = ? AND e.status = 'approved'
        ");
        $stmt->execute([$lesson['qualification_id']]);
        $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($trainees)) {
            return; // No approved trainees
        }
        
        // Create notification table if it doesn't exist
        $conn->exec("CREATE TABLE IF NOT EXISTS tbl_notifications (
            notification_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            title VARCHAR(255),
            message TEXT,
            link VARCHAR(255),
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        
        // Send notification to each trainee
        $notifStmt = $conn->prepare("INSERT INTO tbl_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)");
        $notifLink = "/Hohoo-ville/frontend/html/trainee/pages/my_training.html";
        
        foreach ($trainees as $trainee) {
            $notifTitle = "$contentType Posted";
            $notifMessage = "$contentType '$contentTitle' has been posted for your lesson.";
            $notifStmt->execute([$trainee['user_id'], $notifTitle, $notifMessage, $notifLink]);
        }
        
    } catch (Exception $e) {
        // Log error but don't disrupt the main operation
        error_log("Trainee Notification Error: " . $e->getMessage());
    }
}
?>

