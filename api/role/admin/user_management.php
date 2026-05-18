<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';
require_once '../../utils/PermissionChecker.php';

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

try {
    // Get JWT token from headers
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    // If no auth header, allow access for now (graceful degradation)
    if (!$authHeader) {
        $permissionChecker = null;
    } else {
        // Extract token
        $token = str_replace('Bearer ', '', $authHeader);
        
        // Decode JWT to get user_id and role_id
        $tokenParts = explode('.', $token);
        if (count($tokenParts) !== 3) {
            $permissionChecker = null;
        } else {
            $payload = json_decode(base64url_decode($tokenParts[1]), true);
            $userId = $payload['user_id'] ?? null;
            $roleId = $payload['role_id'] ?? null;

            if (!$userId || !$roleId) {
                $permissionChecker = null;
            } else {
                // Initialize permission checker
                $permissionChecker = new PermissionChecker($conn, $userId, $roleId);
            }
        }
    }

    // Check permissions based on action (only if permission checker is available)
    switch ($action) {
        case 'list':
            if ($permissionChecker) $permissionChecker->requirePermission('users.view');
            getUsers($conn);
            break;
        case 'get':
            if ($permissionChecker) $permissionChecker->requirePermission('users.view');
            getUser($conn);
            break;
        case 'add':
            if ($permissionChecker) $permissionChecker->requirePermission('users.create');
            addUser($conn);
            break;
        case 'update':
            if ($permissionChecker) $permissionChecker->requirePermission('users.update');
            updateUser($conn);
            break;
        case 'archive':
            if ($permissionChecker) $permissionChecker->requirePermission('users.delete');
            archiveUser($conn);
            break;
        case 'reactivate':
            if ($permissionChecker) $permissionChecker->requirePermission('users.delete');
            reactivateUser($conn);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

// Helper function for base64url decode
function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

function getUsers($conn) {
    try {
        $stmt = $conn->query("
            SELECT u.user_id, u.role_id, u.username, u.email, u.status, u.is_archived, u.archived_at, u.date_created, r.role_name, t.trainee_school_id,
                   COALESCE(e.profile_image, tr.profile_image, th.profile_image, th.photo_file) as profile_image
            FROM tbl_users u 
            LEFT JOIN tbl_role r ON u.role_id = r.role_id 
            LEFT JOIN tbl_trainee_hdr t ON u.user_id = t.user_id
            LEFT JOIN tbl_employee e ON u.user_id = e.user_id AND u.role_id IN (1, 4)
            LEFT JOIN tbl_trainer tr ON u.user_id = tr.user_id AND u.role_id = 2
            LEFT JOIN tbl_trainee_hdr th ON u.user_id = th.user_id AND u.role_id = 3
            WHERE u.is_archived = 0
            ORDER BY u.user_id DESC
        ");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getUser($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            throw new Exception('User ID is required');
        }
        
        $stmt = $conn->prepare("
            SELECT u.user_id, u.role_id, u.username, u.email, u.status, u.is_archived, u.date_created, r.role_name, t.trainee_school_id,
                   COALESCE(e.profile_image, tr.profile_image, th.profile_image) as profile_image
            FROM tbl_users u
            LEFT JOIN tbl_role r ON u.role_id = r.role_id
            LEFT JOIN tbl_trainee_hdr t ON u.user_id = t.user_id
            LEFT JOIN tbl_employee e ON u.user_id = e.user_id AND u.role_id IN (1, 4)
            LEFT JOIN tbl_trainer tr ON u.user_id = tr.user_id AND u.role_id = 2
            LEFT JOIN tbl_trainee_hdr th ON u.user_id = th.user_id AND u.role_id = 3
            WHERE u.user_id = ?
        ");
        $stmt->execute([$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            throw new Exception('User not found');
        }
        
        echo json_encode(['success' => true, 'data' => $user]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function addUser($conn) {
    try {
        $rawData = file_get_contents('php://input');
        error_log("Raw input: " . $rawData); // Debug log
        
        $data = json_decode($rawData, true);
        error_log("Decoded data: " . print_r($data, true)); // Debug log
        
        // Validate required fields
        if (empty($data['username'])) {
            throw new Exception('Username is required');
        }
        if (empty($data['password'])) {
            throw new Exception('Password is required');
        }
        if (empty($data['role_id'])) {
            throw new Exception('Role is required');
        }
        

        // Check if username already exists
        $stmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE username = ?");
        $stmt->execute([$data['username']]);
        if ($stmt->fetch()) {
            throw new Exception('Username already exists');
        }

        // Check if email already exists (if provided)
        if (!empty($data['email'])) {
            $stmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE email = ?");
            $stmt->execute([$data['email']]);
            if ($stmt->fetch()) {
                throw new Exception('Email already exists');
            }
        }

        // Validation: Only 1 admin and 1 registrar allowed
        // Get role name for the given role_id
        $roleStmt = $conn->prepare("SELECT role_name FROM tbl_role WHERE role_id = ?");
        $roleStmt->execute([$data['role_id']]);
        $role = $roleStmt->fetchColumn();
        if ($role === 'admin' || $role === 'registrar') {
            $countStmt = $conn->prepare("SELECT COUNT(*) FROM tbl_users WHERE role_id = ? AND is_archived = 0");
            $countStmt->execute([$data['role_id']]);
            $count = $countStmt->fetchColumn();
            if ($count > 0) {
                throw new Exception('Only one ' . $role . ' is allowed in the system.');
            }
        }

        // Hash password
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        $email = !empty($data['email']) ? $data['email'] : null;
        $status = !empty($data['status']) ? $data['status'] : 'active';
        
        // Insert user
        $stmt = $conn->prepare("
            INSERT INTO tbl_users (role_id, username, password, email, status, date_created) 
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        
        if ($stmt->execute([$data['role_id'], $data['username'], $hashedPassword, $email, $status])) {
            echo json_encode([
                'success' => true, 
                'message' => 'User added successfully',
                'user_id' => $conn->lastInsertId()
            ]);
        } else {
            throw new Exception('Failed to add user');
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateUser($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        if (empty($data['user_id'])) {
            throw new Exception('User ID is required');
        }
        if (empty($data['username'])) {
            throw new Exception('Username is required');
        }
        if (empty($data['role_id'])) {
            throw new Exception('Role is required');
        }
        
        // Check if user exists
        $stmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE user_id = ?");
        $stmt->execute([$data['user_id']]);
        if (!$stmt->fetch()) {
            throw new Exception('User not found');
        }
        
        // Check if username is taken by another user
        $stmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE username = ? AND user_id != ?");
        $stmt->execute([$data['username'], $data['user_id']]);
        if ($stmt->fetch()) {
            throw new Exception('Username already exists');
        }

        // Check if email is taken by another user (if provided)
        if (!empty($data['email'])) {
            $stmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE email = ? AND user_id != ?");
            $stmt->execute([$data['email'], $data['user_id']]);
            if ($stmt->fetch()) {
                throw new Exception('Email already exists');
            }
        }

        $email = !empty($data['email']) ? $data['email'] : null;
        $status = !empty($data['status']) ? $data['status'] : 'active';
        
        // Update user without password
        if (empty($data['password'])) {
            $stmt = $conn->prepare("
                UPDATE tbl_users 
                SET role_id = ?, username = ?, email = ?, status = ?
                WHERE user_id = ?
            ");
            $result = $stmt->execute([$data['role_id'], $data['username'], $email, $status, $data['user_id']]);
        } else {
            // Update user with password
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt = $conn->prepare("
                UPDATE tbl_users 
                SET role_id = ?, username = ?, password = ?, email = ?, status = ?
                WHERE user_id = ?
            ");
            $result = $stmt->execute([$data['role_id'], $data['username'], $hashedPassword, $email, $status, $data['user_id']]);
        }
        
        if ($result) {
            echo json_encode(['success' => true, 'message' => 'User updated successfully']);
        } else {
            throw new Exception('Failed to update user');
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function archiveUser($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            throw new Exception('User ID is required');
        }
        
        // Check if user exists
        $stmt = $conn->prepare("SELECT user_id, is_archived FROM tbl_users WHERE user_id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            throw new Exception('User not found');
        }
        
        // Check if already archived
        if ($user['is_archived'] == 1) {
            throw new Exception('User is already archived');
        }
        
        // Archive user by setting is_archived flag
        $stmt = $conn->prepare("
            UPDATE tbl_users 
            SET is_archived = 1,
                archived_at = NOW(),
                archived_by = ?
            WHERE user_id = ?
        ");
        
        // Get current user ID from session if available (defaults to NULL)
        $current_user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : NULL;
        
        if ($stmt->execute([$current_user_id, $id])) {
            echo json_encode([
                'success' => true, 
                'message' => 'User archived successfully. Move to Archived section in System Settings. Data retained for recovery.'
            ]);
        } else {
            throw new Exception('Failed to archive user');
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function reactivateUser($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            throw new Exception('User ID is required');
        }
        
        // Check if user exists and is archived
        $stmt = $conn->prepare("SELECT user_id, is_archived FROM tbl_users WHERE user_id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            throw new Exception('User not found');
        }
        
        // Check if already active (not archived)
        if ($user['is_archived'] == 0) {
            throw new Exception('User is not archived');
        }
        
        // Unarchive user by setting is_archived back to 0
        $stmt = $conn->prepare("UPDATE tbl_users SET is_archived = 0, archived_at = NULL, archived_by = NULL WHERE user_id = ?");
        if ($stmt->execute([$id])) {
            echo json_encode([
                'success' => true, 
                'message' => 'User unarchived successfully. Can now manage in User Management.'
            ]);
        } else {
            throw new Exception('Failed to unarchive user');
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
