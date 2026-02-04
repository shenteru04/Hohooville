<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS');
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
    case 'list':
        getScholarships($conn);
        break;
    case 'add':
        addScholarship($conn);
        break;
    case 'delete':
        deleteScholarship($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getScholarships($conn) {
    try {
        $query = "SELECT s.*, t.first_name, t.last_name 
                  FROM tbl_scholarship s
                  LEFT JOIN tbl_trainee t ON s.trainee_id = t.trainee_id
                  ORDER BY s.date_granted DESC";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function addScholarship($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['trainee_id']) || empty($data['scholarship_name'])) {
            throw new Exception('Required fields missing');
        }

        $query = "INSERT INTO tbl_scholarship (trainee_id, scholarship_name, amount, sponsor, date_granted) 
                  VALUES (?, ?, ?, ?, CURDATE())";
        $stmt = $conn->prepare($query);
        $stmt->execute([
            $data['trainee_id'],
            $data['scholarship_name'],
            $data['amount'] ?? 0,
            $data['sponsor'] ?? null
        ]);

        echo json_encode(['success' => true, 'message' => 'Scholarship added successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deleteScholarship($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('ID required');

        $query = "DELETE FROM tbl_scholarship WHERE scholarship_id = ?";
        $stmt = $conn->prepare($query);
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Scholarship deleted']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>