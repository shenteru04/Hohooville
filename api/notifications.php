<?php
// Set error handling to prevent HTML error output
ini_set('display_errors', 0);
error_reporting(E_ALL);
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("[$errno] $errstr in $errfile:$errline");
    return true;
});

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

require_once 'database/db.php';

try {
    $database = new Database();
    $conn = $database->getConnection();

    $action = isset($_GET['action']) ? $_GET['action'] : '';

    if ($action === 'get') {
        $role = isset($_GET['role']) ? $_GET['role'] : null;
        $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    try {
        if ($userId) {
            try {
                // Helper is declared later in this file; guard call to avoid runtime fatal.
                if (function_exists('ensureDueTraineeModuleNotifications')) {
                    ensureDueTraineeModuleNotifications($conn, $userId);
                }
            } catch (Exception $e) {
                // Tolerate errors in module notification creation
                error_log('Module notification error: ' . $e->getMessage());
            }
            
            try {
                $stmt = $conn->prepare("SELECT notification_id AS id, user_id, title, message, link, is_read, created_at FROM tbl_notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50");
                $stmt->execute([$userId]);
            } catch (Exception $e) {
                $stmt = null;
            }
        } elseif ($role) {
            // Try to return notifications targeted to users in the given role, plus broadcasts (user_id IS NULL)
            try {
                $stmt = $conn->prepare(
                    "SELECT n.notification_id AS id, n.user_id, n.title, n.message, n.link, n.is_read, n.created_at
                     FROM tbl_notifications n
                     WHERE n.user_id IS NULL
                        OR n.user_id IN (
                            SELECT u.user_id FROM tbl_users u JOIN tbl_role r ON u.role_id = r.role_id WHERE r.role_name = ?
                        )
                     ORDER BY n.created_at DESC LIMIT 50"
                );
                $stmt->execute([$role]);
            } catch (Exception $er) {
                // If role mapping fails, fall back to broadcast-only notifications
                try {
                    $stmt = $conn->prepare("SELECT notification_id AS id, user_id, title, message, link, is_read, created_at FROM tbl_notifications WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50");
                    $stmt->execute();
                } catch (Exception $e) {
                    $stmt = null;
                }
            }
        } else {
            try {
                $stmt = $conn->prepare("SELECT notification_id AS id, user_id, title, message, link, is_read, created_at FROM tbl_notifications ORDER BY created_at DESC LIMIT 50");
                $stmt->execute();
            } catch (Exception $e) {
                $stmt = null;
            }
        }
        
        if ($stmt) {
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // Map to simple shape expected by frontend
            $out = array_map(function($r) {
                return [
                    'id' => $r['id'],
                    'message' => $r['message'],
                    'title' => $r['title'] ?? null,
                    'link' => $r['link'],
                    'is_read' => (int)$r['is_read'],
                    'time' => $r['created_at']
                ];
            }, $rows);
            echo json_encode($out);
        } else {
            echo json_encode([]);
        }
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([]);
        exit;
    }
} elseif ($action === 'markRead') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if ($id <= 0) {
        echo json_encode(['success' => false]);
        exit;
    }
    try {
        $stmt = $conn->prepare("UPDATE tbl_notifications SET is_read = 1 WHERE notification_id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false]);
        exit;
    }
}

elseif ($action === 'markAll') {
    // Mark all notifications as read for a role or user
    $role = isset($_GET['role']) ? $_GET['role'] : null;
    $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    try {
            if ($userId) {
                $stmt = $conn->prepare("UPDATE tbl_notifications SET is_read = 1 WHERE user_id = ?");
                $stmt->execute([$userId]);
            } elseif ($role) {
                try {
                    $stmt = $conn->prepare(
                        "UPDATE tbl_notifications SET is_read = 1 WHERE user_id IS NULL OR user_id IN (SELECT u.user_id FROM tbl_users u JOIN tbl_role r ON u.role_id = r.role_id WHERE r.role_name = ?)"
                    );
                    $stmt->execute([$role]);
                } catch (Exception $er) {
                    // fallback: mark broadcasts as read
                    $stmt = $conn->prepare("UPDATE tbl_notifications SET is_read = 1 WHERE user_id IS NULL");
                    $stmt->execute();
                }
            } else {
                $stmt = $conn->prepare("UPDATE tbl_notifications SET is_read = 1");
                $stmt->execute();
            }
        echo json_encode(['success' => true]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false]);
        exit;
    }
}

elseif ($action === 'create' && ($_SERVER['REQUEST_METHOD'] === 'POST')) {
    // Create notification via POST { user_id, title, message, link }
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['message'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Message required']);
        exit;
    }
    $userId = isset($data['user_id']) ? intval($data['user_id']) : null;
    $title = $data['title'] ?? null;
    $link = $data['link'] ?? null;
    try {
        $stmt = $conn->prepare("INSERT INTO tbl_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)");
        $stmt->execute([$userId, $title, $data['message'], $link]);
        echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false]);
        exit;
    }
}

echo json_encode([]);

function ensureDueTraineeModuleNotifications(PDO $conn, int $userId): void {
    try {
        $userStmt = $conn->prepare("
            SELECT LOWER(r.role_name) AS role_name, th.trainee_id
            FROM tbl_users u
            JOIN tbl_role r ON r.role_id = u.role_id
            LEFT JOIN tbl_trainee_hdr th ON th.user_id = u.user_id
            WHERE u.user_id = ?
            LIMIT 1
        ");
        $userStmt->execute([$userId]);
        $userRow = $userStmt->fetch(PDO::FETCH_ASSOC);
        if (!$userRow || $userRow['role_name'] !== 'trainee' || empty($userRow['trainee_id'])) {
            return;
        }

        $traineeId = (int)$userRow['trainee_id'];
        $notifLink = "/Hohoo-ville/frontend/html/trainee/pages/my_training.html";

        $infoStmt = $conn->prepare("
            SELECT DISTINCT c.title AS item_title, l.lesson_title
            FROM tbl_enrollment e
            JOIN tbl_batch b ON b.batch_id = e.batch_id
            JOIN tbl_module m ON m.qualification_id = b.qualification_id AND m.trainer_id = b.trainer_id
            JOIN tbl_lessons l ON l.module_id = m.module_id
            JOIN tbl_lesson_contents c ON c.lesson_id = l.lesson_id
            WHERE e.trainee_id = ?
              AND e.status = 'approved'
              AND l.posting_date IS NOT NULL
              AND l.posting_date <= NOW()
        ");
        $infoStmt->execute([$traineeId]);
        foreach ($infoStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $message = buildTraineeLessonNotifMessage('Information Sheet', $row['item_title'] ?? '', $row['lesson_title'] ?? '');
            insertNotificationIfMissing($conn, $userId, 'Information Sheet Posted', $message, $notifLink);
        }

        $taskStmt = $conn->prepare("
            SELECT DISTINCT ts.title AS item_title, l.lesson_title
            FROM tbl_enrollment e
            JOIN tbl_batch b ON b.batch_id = e.batch_id
            JOIN tbl_module m ON m.qualification_id = b.qualification_id AND m.trainer_id = b.trainer_id
            JOIN tbl_lessons l ON l.module_id = m.module_id
            JOIN tbl_task_sheets ts ON ts.lesson_id = l.lesson_id
            WHERE e.trainee_id = ?
              AND e.status = 'approved'
              AND l.posting_date IS NOT NULL
              AND l.posting_date <= NOW()
        ");
        $taskStmt->execute([$traineeId]);
        foreach ($taskStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $message = buildTraineeLessonNotifMessage('Task Sheet', $row['item_title'] ?? '', $row['lesson_title'] ?? '');
            insertNotificationIfMissing($conn, $userId, 'Task Sheet Posted', $message, $notifLink);
        }

        $quizStmt = $conn->prepare("
            SELECT DISTINCT l.lesson_title
            FROM tbl_enrollment e
            JOIN tbl_batch b ON b.batch_id = e.batch_id
            JOIN tbl_module m ON m.qualification_id = b.qualification_id AND m.trainer_id = b.trainer_id
            JOIN tbl_lessons l ON l.module_id = m.module_id
            JOIN tbl_test t ON t.lesson_id = l.lesson_id AND t.activity_type_id = 1
            WHERE e.trainee_id = ?
              AND e.status = 'approved'
              AND l.posting_date IS NOT NULL
              AND l.posting_date <= NOW()
        ");
        $quizStmt->execute([$traineeId]);
        foreach ($quizStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $message = buildTraineeLessonNotifMessage('Quiz', '', $row['lesson_title'] ?? '');
            insertNotificationIfMissing($conn, $userId, 'Quiz Posted', $message, $notifLink);
        }
    } catch (Exception $e) {
        error_log('ensureDueTraineeModuleNotifications error: ' . $e->getMessage());
    }
}

function buildTraineeLessonNotifMessage(string $contentType, string $contentTitle, string $lessonTitle): string {
    $contentTitle = trim($contentTitle);
    $lessonTitle = trim($lessonTitle);

    if ($contentTitle !== '') {
        $subject = "'$contentTitle'";
    } elseif ($lessonTitle !== '') {
        $subject = "for lesson '$lessonTitle'";
    } else {
        $subject = 'for your lesson';
    }

    return "$contentType $subject has been uploaded by your trainer.";
}

function insertNotificationIfMissing(PDO $conn, int $userId, string $title, string $message, string $link): void {
    $existsStmt = $conn->prepare("
        SELECT notification_id
        FROM tbl_notifications
        WHERE user_id = ?
          AND title = ?
          AND message = ?
          AND link = ?
        LIMIT 1
    ");
    $existsStmt->execute([$userId, $title, $message, $link]);
    if ($existsStmt->fetchColumn()) {
        return;
    }

    $insertStmt = $conn->prepare("INSERT INTO tbl_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)");
    $insertStmt->execute([$userId, $title, $message, $link]);
}

} catch (Exception $e) {
    error_log("Notification API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Internal server error']);
}
?>
