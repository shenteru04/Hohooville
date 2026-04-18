<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

require_once '../../database/db.php';

class TraineeProfile {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';

        switch($action) {
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
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
    }

    private function getProfile() {
        $traineeId = $_GET['trainee_id'] ?? null;
        if (!$traineeId) {
            echo json_encode(['success' => false, 'message' => 'Trainee ID required']);
            return;
        }

        try {
            $query = "SELECT 
                        t.trainee_id, t.user_id, t.trainee_school_id, t.first_name, t.middle_name, t.last_name, t.email, t.phone_number, t.address, t.status, t.photo_file, COALESCE(t.profile_image, '') as profile_image,
                        u.username 
                      FROM tbl_trainee_hdr t 
                      JOIN tbl_users u ON t.user_id = u.user_id 
                      WHERE t.trainee_id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$traineeId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($data) {
                echo json_encode(['success' => true, 'data' => $data]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Trainee not found']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function updateProfile() {
        $data = json_decode(file_get_contents('php://input'), true);
        $traineeId = $data['trainee_id'] ?? null;

        if (!$traineeId) {
            echo json_encode(['success' => false, 'message' => 'Trainee ID required']);
            return;
        }

        try {
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
            if (isset($data['email'])) {
                $updateFields[] = "email = ?";
                $params[] = $data['email'];
            }
            if (isset($data['phone_number'])) {
                $updateFields[] = "phone_number = ?";
                $params[] = $data['phone_number'];
            }
            if (isset($data['address'])) {
                $updateFields[] = "address = ?";
                $params[] = $data['address'];
            }
            if (isset($data['profile_image'])) {
                $updateFields[] = "profile_image = ?";
                $params[] = $data['profile_image'];
            }

            if (empty($updateFields)) {
                throw new Exception('No fields to update');
            }

            $params[] = $traineeId;
            $query = "UPDATE tbl_trainee_hdr SET " . implode(", ", $updateFields) . " WHERE trainee_id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);

            echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function changePassword() {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? null;

        if (empty($userId)) {
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            return;
        }

        try {
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
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TraineeProfile($db);
$api->handleRequest();
?>
