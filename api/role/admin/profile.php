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

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'get':
        getUserProfile($conn);
        break;
    case 'update':
        updateUserProfile($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getUserProfile($conn) {
    // In a real app, extract User ID from JWT Token. 
    // For this fix, we assume ID 1 (Admin) if not passed, or passed via GET.
    $userId = $_GET['id'] ?? 1; 

    try {
        // Try to find in Trainer or Trainee first to get names
        $query = "
            SELECT u.user_id, u.username, u.email, u.role_id, r.role_name,
                   COALESCE(t.first_name, tr.first_name, 'Admin') as first_name,
                   COALESCE(t.last_name, tr.last_name, 'User') as last_name,
                   COALESCE(t.phone_number, tr.phone_number, '') as phone_number,
                   t.trainee_school_id
            FROM tbl_users u
            LEFT JOIN tbl_role r ON u.role_id = r.role_id
            LEFT JOIN tbl_trainee_hdr t ON u.user_id = t.user_id
            LEFT JOIN tbl_trainer tr ON u.user_id = tr.user_id
            WHERE u.user_id = ?
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            echo json_encode(['success' => true, 'data' => $user]);
        } else {
            throw new Exception('User not found');
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateUserProfile($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? 1;

        if (empty($userId)) throw new Exception('User ID required');

        $conn->beginTransaction();

        // Update Users Table (Email)
        $stmtUser = $conn->prepare("UPDATE tbl_users SET email = ? WHERE user_id = ?");
        $stmtUser->execute([$data['email'], $userId]);

        // Check role to update details in correct table
        $stmtRole = $conn->prepare("SELECT role_id FROM tbl_users WHERE user_id = ?");
        $stmtRole->execute([$userId]);
        $role = $stmtRole->fetch(PDO::FETCH_ASSOC);

        if ($role) {
            if ($role['role_id'] == 2) { // Trainer
                $stmtDetails = $conn->prepare("UPDATE tbl_trainer SET first_name = ?, last_name = ?, phone_number = ? WHERE user_id = ?");
                $stmtDetails->execute([$data['first_name'], $data['last_name'], $data['phone'], $userId]);
            } elseif ($role['role_id'] == 3) { // Trainee
                $stmtDetails = $conn->prepare("UPDATE tbl_trainee_hdr SET first_name = ?, last_name = ?, phone_number = ? WHERE user_id = ?");
                $stmtDetails->execute([$data['first_name'], $data['last_name'], $data['phone'], $userId]);
            }
            // Admin (role 1) usually doesn't have a profile table in this schema, so we just updated email.
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);

    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>