<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
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
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        $method = $_SERVER['REQUEST_METHOD'];

        switch($action) {
            case 'get-trainer-id':
                if ($method === 'GET') {
                    $this->getTrainerId();
                }
                break;
            case 'get':
                if ($method === 'GET') {
                    $this->getProfile();
                }
                break;
            case 'update':
                if ($method === 'POST') {
                    $this->updateProfile();
                }
                break;
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
                break;
        }
    }

    private function getTrainerId() {
        if (!isset($_GET['user_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'User ID is required']);
            return;
        }

        $userId = $_GET['user_id'];
        
        try {
            $query = "SELECT trainer_id FROM tbl_trainer WHERE user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'data' => $row]);
            } else {
                // Auto-create trainer profile if it doesn't exist
                $userQuery = "SELECT username, email FROM tbl_users WHERE user_id = :user_id";
                $userStmt = $this->conn->prepare($userQuery);
                $userStmt->bindParam(':user_id', $userId);
                $userStmt->execute();
                
                if ($userStmt->rowCount() > 0) {
                    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
                    $insertQuery = "INSERT INTO tbl_trainer (user_id, first_name, last_name, email, specialization, phone_number, address) VALUES (:user_id, :first_name, :last_name, :email, '', '', '')";
                    $insertStmt = $this->conn->prepare($insertQuery);
                    
                    $firstName = $user['username'];
                    $lastName = 'Trainer';
                    $email = $user['email'];
                    
                    $insertStmt->bindParam(':user_id', $userId);
                    $insertStmt->bindParam(':first_name', $firstName);
                    $insertStmt->bindParam(':last_name', $lastName);
                    $insertStmt->bindParam(':email', $email);
                    
                    if ($insertStmt->execute()) {
                        echo json_encode(['success' => true, 'data' => ['trainer_id' => $this->conn->lastInsertId()]]);
                    } else {
                        // Return 200 so frontend can read the error message
                        echo json_encode(['success' => false, 'message' => 'Failed to create trainer profile']);
                    }
                } else {
                    // Return 200 so frontend can read the error message
                    echo json_encode(['success' => false, 'message' => 'User not found']);
                }
            }
        } catch (PDOException $e) {
            // Return 200 so frontend can read the error message
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        }
    }

    private function getProfile() {
        // Frontend sends 'id' for trainer_id
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Trainer ID is required']);
            return;
        }

        $trainerId = $_GET['id'];

        try {
            $query = "SELECT * FROM tbl_trainer WHERE trainer_id = :trainer_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':trainer_id', $trainerId);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'data' => $row]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Profile not found']);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        }
    }

    private function updateProfile() {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->trainer_id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Trainer ID is required']);
            return;
        }

        try {
            $query = "UPDATE tbl_trainer SET 
                        first_name = :first_name, 
                        last_name = :last_name, 
                        email = :email, 
                        specialization = :specialization,
                        phone_number = :phone_number
                      WHERE trainer_id = :trainer_id";

            $stmt = $this->conn->prepare($query);
            
            $stmt->bindParam(':first_name', $data->first_name);
            $stmt->bindParam(':last_name', $data->last_name);
            $stmt->bindParam(':email', $data->email);
            $stmt->bindParam(':specialization', $data->specialization);
            $stmt->bindParam(':phone_number', $data->phone_number);
            $stmt->bindParam(':trainer_id', $data->trainer_id);

            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to update profile']);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();

$profile = new TrainerProfile($db);
$profile->handleRequest();
?>