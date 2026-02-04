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
    case 'get-types':
        getScholarshipOptions($conn);
        break;
    case 'update':
        updateScholarship($conn);
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
        $stmt = $conn->query("
            SELECT s.*, t.first_name, t.last_name 
            FROM tbl_scholarship s 
            LEFT JOIN tbl_trainee_hdr t ON s.trainee_id = t.trainee_id 
            ORDER BY s.scholarship_id DESC
        ");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getScholarshipOptions($conn) {
    try {
        $stmt = $conn->query("SELECT scholarship_id, scholarship_name, scholarship_provider FROM tbl_scholarship_type WHERE status = 'active' ORDER BY scholarship_name ASC");
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
        
        $stmt = $conn->prepare("INSERT INTO tbl_scholarship (trainee_id, scholarship_name, amount, sponsor, date_granted) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['trainee_id'], $data['scholarship_name'], $data['amount'], 
            $data['sponsor'], $data['date_granted']
        ]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateScholarship($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['scholarship_id'];
        
        $stmt = $conn->prepare("UPDATE tbl_scholarship SET trainee_id = ?, scholarship_name = ?, amount = ?, sponsor = ?, date_granted = ? WHERE scholarship_id = ?");
        $stmt->execute([
            $data['trainee_id'], $data['scholarship_name'], $data['amount'], 
            $data['sponsor'], $data['date_granted'], $id
        ]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deleteScholarship($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('ID required');
        
        $stmt = $conn->prepare("DELETE FROM tbl_scholarship WHERE scholarship_id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>