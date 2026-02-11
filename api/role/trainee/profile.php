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
                        t.trainee_id, t.user_id, t.trainee_school_id, t.first_name, t.middle_name, t.last_name, t.email, t.phone_number, t.address, t.status, t.photo_file,
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
            $query = "UPDATE tbl_trainee_hdr SET first_name = ?, last_name = ?, email = ?, phone_number = ?, address = ? WHERE trainee_id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                $data['first_name'],
                $data['last_name'],
                $data['email'],
                $data['phone_number'],
                $data['address'],
                $traineeId
            ]);

            echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
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