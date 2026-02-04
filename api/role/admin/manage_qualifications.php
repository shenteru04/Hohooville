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
        getQualifications($conn);
        break;
    case 'add':
        addQualification($conn);
        break;
    case 'update':
        updateQualification($conn);
        break;
    case 'update-status':
        updateQualificationStatus($conn);
        break;
    case 'delete':
        deleteQualification($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getQualifications($conn) {
    try {
        $stmt = $conn->query("SELECT * FROM tbl_course ORDER BY FIELD(status, 'pending', 'active', 'inactive', 'rejected'), course_id DESC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function addQualification($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['course_name'])) {
            throw new Exception('Course name is required');
        }
        
        $conn->beginTransaction();

        $stmt = $conn->prepare("INSERT INTO tbl_course (course_name, ctpr_number, training_cost, description, duration, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['course_name'], 
            $data['ctpr_number'] ?? null,
            $data['training_cost'] ?? 0,
            $data['description'] ?? null, 
            $data['duration'] ?? null, 
            $data['status'] ?? 'active'
        ]);
        $courseId = $conn->lastInsertId();

        // Automatically add to offered courses so it can be enrolled in
        $stmtOffered = $conn->prepare("INSERT INTO tbl_offered_courses (course_id) VALUES (?)");
        $stmtOffered->execute([$courseId]);
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Qualification added successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateQualification($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['course_id'] ?? null;
        
        if (!$id) throw new Exception('ID required');
        
        $stmt = $conn->prepare("UPDATE tbl_course SET course_name = ?, ctpr_number = ?, training_cost = ?, description = ?, duration = ?, status = ? WHERE course_id = ?");
        $stmt->execute([
            $data['course_name'], 
            $data['ctpr_number'] ?? null,
            $data['training_cost'] ?? 0,
            $data['description'] ?? null, 
            $data['duration'] ?? null, 
            $data['status'], 
            $id
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Qualification updated successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateQualificationStatus($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['course_id'] ?? null;
        $status = $data['status'] ?? null;
        
        if (!$id || !$status) throw new Exception('ID and Status required');
        
        $stmt = $conn->prepare("UPDATE tbl_course SET status = ? WHERE course_id = ?");
        $stmt->execute([$status, $id]);
        
        echo json_encode(['success' => true, 'message' => 'Status updated']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deleteQualification($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('ID required');
        
        $stmt = $conn->prepare("DELETE FROM tbl_course WHERE course_id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true, 'message' => 'Qualification deleted successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>