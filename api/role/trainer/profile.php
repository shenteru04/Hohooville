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

        $query = "UPDATE tbl_trainer SET first_name = ?, last_name = ?, specialization = ? WHERE user_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            $data['first_name'],
            $data['last_name'],
            $data['specialization'],
            $userId
        ]);

        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TrainerProfile($db);
$api->handleRequest();
?>