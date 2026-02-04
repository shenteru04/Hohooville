<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../database/db.php';

class Authentication {
    private $conn;
    private $table = 'tbl_users';

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        switch($action) {
            case 'login':
                if ($method === 'POST') {
                    $this->login();
                }
                break;
            
            case 'logout':
                if ($method === 'POST') {
                    $this->logout();
                }
                break;
            
            case 'verify':
                if ($method === 'GET') {
                    $this->verifyToken();
                }
                break;
            
            case 'change-password':
                if ($method === 'POST') {
                    $this->changePassword();
                }
                break;
            
            case 'reset-password':
                if ($method === 'POST') {
                    $this->resetPassword();
                }
                break;
            
            default:
                $this->sendResponse(400, false, 'Invalid action');
        }
    }

    private function login() {
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->username) || empty($data->password)) {
            $this->sendResponse(400, false, 'Username and password are required');
            return;
        }

        try {
            $query = "SELECT u.*, r.role_name as role,
                      CASE 
                        WHEN r.role_name = 'trainee' THEN t.trainee_id
                        ELSE NULL
                      END as trainee_id,
                      CASE 
                        WHEN r.role_name = 'trainer' THEN tr.trainer_id
                        ELSE NULL
                      END as trainer_id
                      FROM " . $this->table . " u
                      LEFT JOIN tbl_role r ON u.role_id = r.role_id
                      LEFT JOIN tbl_trainee_hdr t ON u.user_id = t.user_id
                      LEFT JOIN tbl_trainer tr ON u.user_id = tr.user_id
                      WHERE (u.username = :username OR u.email = :username) 
                      AND u.status = 'active'";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':username', $data->username);
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                $this->logActivity(null, 'login_failed', 'tbl_users', null, 'Invalid username: ' . $data->username);
                $this->sendResponse(401, false, 'Invalid credentials');
                return;
            }

            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $this->sendResponse(500, false, 'Database error: ' . $e->getMessage());
            return;
        }

        if (!password_verify($data->password, $user['password'])) {
            $this->logActivity($user['user_id'], 'login_failed', 'tbl_users', $user['user_id'], 'Invalid password');
            $this->sendResponse(401, false, 'Invalid credentials');
            return;
        }

        // Generate token
        $token = $this->generateToken($user['user_id']);

        $this->logActivity($user['user_id'], 'login_success', 'tbl_users', $user['user_id'], 'User logged in successfully');

        unset($user['password']);

        $response = [
            'user' => $user,
            'token' => $token
        ];

        $this->sendResponse(200, true, 'Login successful', $response);
    }

    private function logout() {
        $headers = getallheaders();
        $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

        if (!$token) {
            $this->sendResponse(400, false, 'Token is required');
            return;
        }

        $userId = $this->validateToken($token);

        if ($userId) {
            $this->logActivity($userId, 'logout', 'tbl_users', $userId, 'User logged out');
            $this->sendResponse(200, true, 'Logout successful');
        } else {
            $this->sendResponse(401, false, 'Invalid token');
        }
    }

    private function verifyToken() {
        $headers = getallheaders();
        $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

        if (!$token) {
            $this->sendResponse(401, false, 'Token is required');
            return;
        }

        $userId = $this->validateToken($token);

        if (!$userId) {
            $this->sendResponse(401, false, 'Invalid or expired token');
            return;
        }

        try {
            $query = "SELECT u.*, r.role_name as role,
                      CASE 
                        WHEN r.role_name = 'trainee' THEN t.trainee_id
                        ELSE NULL
                      END as trainee_id,
                      CASE 
                        WHEN r.role_name = 'trainer' THEN tr.trainer_id
                        ELSE NULL
                      END as trainer_id
                      FROM " . $this->table . " u
                      LEFT JOIN tbl_role r ON u.role_id = r.role_id
                      LEFT JOIN tbl_trainee_hdr t ON u.user_id = t.user_id
                      LEFT JOIN tbl_trainer tr ON u.user_id = tr.user_id
                      WHERE u.user_id = :user_id AND u.status = 'active'";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                $this->sendResponse(401, false, 'User not found or inactive');
                return;
            }

            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $this->sendResponse(500, false, 'Database error: ' . $e->getMessage());
            return;
        }
        unset($user['password']);

        $this->sendResponse(200, true, 'Token is valid', ['user' => $user]);
    }

    private function changePassword() {
        $data = json_decode(file_get_contents("php://input"));
        $headers = getallheaders();
        $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

        if (!$token) {
            $this->sendResponse(401, false, 'Unauthorized');
            return;
        }

        $userId = $this->validateToken($token);

        if (!$userId) {
            $this->sendResponse(401, false, 'Invalid token');
            return;
        }

        if (empty($data->old_password) || empty($data->new_password)) {
            $this->sendResponse(400, false, 'Old and new passwords are required');
            return;
        }

        // Verify old password
        $query = "SELECT password FROM " . $this->table . " WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!password_verify($data->old_password, $user['password'])) {
            $this->sendResponse(400, false, 'Old password is incorrect');
            return;
        }

        // Update password
        $hashedPassword = password_hash($data->new_password, PASSWORD_BCRYPT);
        $updateQuery = "UPDATE " . $this->table . " SET password = :password WHERE user_id = :user_id";
        $updateStmt = $this->conn->prepare($updateQuery);
        $updateStmt->bindParam(':password', $hashedPassword);
        $updateStmt->bindParam(':user_id', $userId);

        if ($updateStmt->execute()) {
            $this->logActivity($userId, 'password_changed', 'tbl_users', $userId, 'Password changed successfully');
            $this->sendResponse(200, true, 'Password changed successfully');
        } else {
            $this->sendResponse(500, false, 'Failed to change password');
        }
    }

    private function resetPassword() {
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->user_id) || empty($data->new_password)) {
            $this->sendResponse(400, false, 'User ID and new password are required');
            return;
        }

        $headers = getallheaders();
        $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

        if (!$token) {
            $this->sendResponse(401, false, 'Unauthorized');
            return;
        }

        $adminId = $this->validateToken($token);

        if (!$adminId) {
            $this->sendResponse(401, false, 'Invalid token');
            return;
        }

        // Verify admin role
        $roleQuery = "SELECT r.role_name as role FROM " . $this->table . " u LEFT JOIN tbl_role r ON u.role_id = r.role_id WHERE u.user_id = :user_id";
        $roleStmt = $this->conn->prepare($roleQuery);
        $roleStmt->bindParam(':user_id', $adminId);
        $roleStmt->execute();
        $admin = $roleStmt->fetch(PDO::FETCH_ASSOC);

        if ($admin['role'] !== 'admin') {
            $this->sendResponse(403, false, 'Only admins can reset passwords');
            return;
        }

        // Reset password
        $hashedPassword = password_hash($data->new_password, PASSWORD_BCRYPT);
        $updateQuery = "UPDATE " . $this->table . " SET password = :password WHERE user_id = :user_id";
        $updateStmt = $this->conn->prepare($updateQuery);
        $updateStmt->bindParam(':password', $hashedPassword);
        $updateStmt->bindParam(':user_id', $data->user_id);

        if ($updateStmt->execute()) {
            $this->logActivity($adminId, 'password_reset', 'tbl_users', $data->user_id, 'Password reset by admin');
            $this->sendResponse(200, true, 'Password reset successfully');
        } else {
            $this->sendResponse(500, false, 'Failed to reset password');
        }
    }

    public function generateToken($userId) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'user_id' => $userId,
            'exp' => time() + (86400 * 7) // 7 days
        ]);

        $base64UrlHeader = $this->base64UrlEncode($header);
        $base64UrlPayload = $this->base64UrlEncode($payload);
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, 'hohoo_ville_secret_key_2024', true);
        $base64UrlSignature = $this->base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public function validateToken($token) {
        $tokenParts = explode('.', $token);
        
        if (count($tokenParts) !== 3) {
            return false;
        }

        $header = base64_decode($tokenParts[0]);
        $payload = base64_decode($tokenParts[1]);
        $signatureProvided = $tokenParts[2];

        $base64UrlHeader = $this->base64UrlEncode($header);
        $base64UrlPayload = $this->base64UrlEncode($payload);
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, 'hohoo_ville_secret_key_2024', true);
        $base64UrlSignature = $this->base64UrlEncode($signature);

        if ($base64UrlSignature !== $signatureProvided) {
            return false;
        }

        $payloadData = json_decode($payload);

        if ($payloadData->exp < time()) {
            return false;
        }

        return $payloadData->user_id;
    }

    private function base64UrlEncode($text) {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($text));
    }

    private function logActivity($userId, $action, $tableName, $recordId, $details) {
        try {
            $query = "INSERT INTO tbl_activity_logs (user_id, action, table_name, record_id, details, ip_address) 
                      VALUES (:user_id, :action, :table_name, :record_id, :details, :ip_address)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':action', $action);
            $stmt->bindParam(':table_name', $tableName);
            $stmt->bindParam(':record_id', $recordId);
            $stmt->bindParam(':details', $details);
            $stmt->bindValue(':ip_address', $_SERVER['REMOTE_ADDR']);
            $stmt->execute();
        } catch (Exception $e) {
            // Silently fail if logging fails (e.g. table missing) to not disrupt main flow
        }
    }

    private function sendResponse($statusCode, $success, $message, $data = null) {
        http_response_code($statusCode);
        $response = [
            'success' => $success,
            'message' => $message
        ];
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        echo json_encode($response);
        exit();
    }
}

// Initialize and handle request
$database = new Database();
$db = $database->getConnection();

$auth = new Authentication($db);
$auth->handleRequest();
?>