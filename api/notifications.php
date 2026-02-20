<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

require_once 'database/db.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

$database = new Database();
$conn = $database->getConnection();

if ($action === 'get') {
    $role = isset($_GET['role']) ? $_GET['role'] : null;
    $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    try {
        if ($userId) {
            $stmt = $conn->prepare("SELECT notification_id AS id, user_id, title, message, link, is_read, created_at FROM tbl_notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50");
            $stmt->execute([$userId]);
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
                $stmt = $conn->prepare("SELECT notification_id AS id, user_id, title, message, link, is_read, created_at FROM tbl_notifications WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50");
                $stmt->execute();
            }
        } else {
            $stmt = $conn->prepare("SELECT notification_id AS id, user_id, title, message, link, is_read, created_at FROM tbl_notifications ORDER BY created_at DESC LIMIT 50");
            $stmt->execute();
        }
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
