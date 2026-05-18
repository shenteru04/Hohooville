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
    case 'change-password':
        changePassword($conn);
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
        $query = "
            SELECT u.user_id, u.username, u.email, u.role_id, r.role_name,
                   COALESCE(e.first_name, '') as first_name,
                   COALESCE(e.last_name, '') as last_name,
                   COALESCE(e.phone_number, '') as phone_number,
                   COALESCE(e.profile_image, '') as profile_image
            FROM tbl_users u
            LEFT JOIN tbl_role r ON u.role_id = r.role_id
            LEFT JOIN tbl_employee e ON u.user_id = e.user_id
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

        // Check if employee record exists
        $stmtCheck = $conn->prepare("SELECT employee_id FROM tbl_employee WHERE user_id = ?");
        $stmtCheck->execute([$userId]);
        $employeeExists = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($employeeExists) {
            // Update existing employee record
            $updateFields = "first_name = ?, last_name = ?, email = ?, phone_number = ?";
            $params = [$data['first_name'], $data['last_name'], $data['email'], $data['phone'], $userId];
            
            // Add profile_image if provided
            if (!empty($data['profile_image'])) {
                $updateFields .= ", profile_image = ?";
                array_splice($params, -1, 0, [$data['profile_image']]);
            }
            
            $stmtEmployee = $conn->prepare("UPDATE tbl_employee SET $updateFields WHERE user_id = ?");
            $stmtEmployee->execute($params);
        } else {
            // Create new employee record
            $stmtInsert = $conn->prepare("INSERT INTO tbl_employee (user_id, first_name, last_name, email, phone_number, profile_image) VALUES (?, ?, ?, ?, ?, ?)");
            $stmtInsert->execute([$userId, $data['first_name'] ?? '', $data['last_name'] ?? '', $data['email'] ?? '', $data['phone'] ?? '', $data['profile_image'] ?? null]);
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

function changePassword($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? null;

        if (empty($userId)) throw new Exception('User ID required');
        if (empty($data['current_password'])) throw new Exception('Current password required');
        if (empty($data['new_password'])) throw new Exception('New password required');
        if (empty($data['confirm_password'])) throw new Exception('Confirm password required');

        // Verify new password matches confirm password
        if ($data['new_password'] !== $data['confirm_password']) {
            throw new Exception('New passwords do not match');
        }

        // Verify new password is at least 8 characters
        if (strlen($data['new_password']) < 8) {
            throw new Exception('New password must be at least 8 characters');
        }

        // Get current password hash
        $stmtUser = $conn->prepare("SELECT password FROM tbl_users WHERE user_id = ?");
        $stmtUser->execute([$userId]);
        $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            throw new Exception('User not found');
        }

        // Verify current password
        if (!password_verify($data['current_password'], $user['password'])) {
            throw new Exception('Current password is incorrect');
        }

        // Hash new password
        $hashedPassword = password_hash($data['new_password'], PASSWORD_DEFAULT);

        // Update password
        $stmtUpdate = $conn->prepare("UPDATE tbl_users SET password = ? WHERE user_id = ?");
        $stmtUpdate->execute([$hashedPassword, $userId]);

        echo json_encode(['success' => true, 'message' => 'Password changed successfully']);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
