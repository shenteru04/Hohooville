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

class TrainerProfile {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';
        
        try {
            switch($action) {
                case 'get-trainer-id':
                    $this->getTrainerId();
                    break;
                case 'get':
                    $this->getProfile();
                    break;
                case 'update':
                    $this->updateProfile();
                    break;
                case 'change-password':
                    $this->changePassword();
                    break;
                default:
                    throw new Exception('Invalid action');
            }
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function getTrainerId() {
        $userId = $_GET['user_id'] ?? null;
        if (!$userId) throw new Exception('User ID required');

        $stmt = $this->conn->prepare("SELECT trainer_id, first_name, last_name FROM tbl_trainer WHERE user_id = ?");
        $stmt->execute([$userId]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($data) {
            echo json_encode(['success' => true, 'data' => $data]);
        } else {
            throw new Exception('Trainer profile not found');
        }
    }

    private function getProfile() {
        $userId = $_GET['user_id'] ?? null;
        
        if (!$userId) throw new Exception('User ID required');

        $query = "SELECT t.*, u.username, u.email as user_email 
                  FROM tbl_trainer t 
                  JOIN tbl_users u ON t.user_id = u.user_id 
                  WHERE t.user_id = ?";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$userId]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($data) {
            echo json_encode(['success' => true, 'data' => $data]);
        } else {
            throw new Exception('Profile not found');
        }
    }

    private function updateProfile() {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? null;

        if (!$userId) throw new Exception('User ID required');

        $updateFields = [];
        $params = [];

        // Add fields if provided
        if (isset($data['first_name'])) {
            $updateFields[] = "first_name = ?";
            $params[] = $data['first_name'];
        }
        if (isset($data['last_name'])) {
            $updateFields[] = "last_name = ?";
            $params[] = $data['last_name'];
        }
        if (isset($data['specialization'])) {
            $updateFields[] = "specialization = ?";
            $params[] = $data['specialization'];
        }
        if (isset($data['profile_image'])) {
            $updateFields[] = "profile_image = ?";
            $params[] = $data['profile_image'];
        }

        if (empty($updateFields)) {
            throw new Exception('No fields to update');
        }

        $params[] = $userId;
        $query = "UPDATE tbl_trainer SET " . implode(", ", $updateFields) . " WHERE user_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
    }

    private function changePassword() {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? null;

        if (empty($userId)) throw new Exception('User ID required');
        if (empty($data['current_password'])) throw new Exception('Current password required');
        if (empty($data['new_password'])) throw new Exception('New password required');
        if (empty($data['confirm_password'])) throw new Exception('Confirm password required');

        if ($data['new_password'] !== $data['confirm_password']) {
            throw new Exception('New passwords do not match');
        }

        if (strlen($data['new_password']) < 8) {
            throw new Exception('New password must be at least 8 characters');
        }

        $stmtUser = $this->conn->prepare("SELECT password FROM tbl_users WHERE user_id = ?");
        $stmtUser->execute([$userId]);
        $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            throw new Exception('User not found');
        }

        if (!password_verify($data['current_password'], $user['password'])) {
            throw new Exception('Current password is incorrect');
        }

        $hashedPassword = password_hash($data['new_password'], PASSWORD_DEFAULT);
        $stmtUpdate = $this->conn->prepare("UPDATE tbl_users SET password = ? WHERE user_id = ?");
        $stmtUpdate->execute([$hashedPassword, $userId]);

        echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TrainerProfile($db);
$api->handleRequest();
?>
