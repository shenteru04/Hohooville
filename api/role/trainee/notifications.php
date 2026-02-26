<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get-unread':
            getUnreadNotifications($conn);
            break;
        case 'mark-read':
            markAsRead($conn);
            break;
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function getUnreadNotifications($conn) {
    $userId = $_GET['user_id'] ?? null;
    if (!$userId) throw new Exception('User ID required');

    // Check if table exists first to avoid errors on fresh install
    $stmt = $conn->prepare("SELECT * FROM tbl_notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $notifications]);
}

function markAsRead($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $notificationId = $data['notification_id'] ?? null;

    if (!$notificationId) throw new Exception('Notification ID required');

    $stmt = $conn->prepare("UPDATE tbl_notifications SET is_read = 1 WHERE notification_id = ?");
    $stmt->execute([$notificationId]);

    echo json_encode(['success' => true, 'message' => 'Marked as read']);
}
?>
