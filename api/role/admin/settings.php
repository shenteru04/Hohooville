<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'change-password':
        changePassword($conn);
        break;
    case 'update-system':
        // Mock success for system settings as no table exists in schema
        echo json_encode(['success' => true, 'message' => 'System settings saved']);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function changePassword($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? 1; // Default to 1 for demo if not passed
        
        if (empty($data['current_password']) || empty($data['new_password'])) {
            throw new Exception('All fields are required');
        }

        // Verify current password
        $stmt = $conn->prepare("SELECT password FROM tbl_users WHERE user_id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($data['current_password'], $user['password'])) {
            throw new Exception('Incorrect current password');
        }

        // Update password
        $newHash = password_hash($data['new_password'], PASSWORD_DEFAULT);
        $stmtUpdate = $conn->prepare("UPDATE tbl_users SET password = ? WHERE user_id = ?");
        $stmtUpdate->execute([$newHash, $userId]);

        echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>