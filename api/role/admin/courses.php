<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'list':
        getCourses($conn);
        break;
    case 'add':
        addCourse($conn);
        break;
    case 'update':
        updateCourse($conn);
        break;
    case 'delete':
        deleteCourse($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getCourses($conn) {
    try {
        $stmt = $conn->query("SELECT * FROM tbl_course ORDER BY course_id DESC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function addCourse($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $conn->prepare("INSERT INTO tbl_course (course_name, description, duration, status) VALUES (?, ?, ?, ?)");
        $stmt->execute([$data['course_name'], $data['description'], $data['duration'], $data['status'] ?? 'active']);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateCourse($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['course_id'];
        
        $stmt = $conn->prepare("UPDATE tbl_course SET course_name = ?, description = ?, duration = ?, status = ? WHERE course_id = ?");
        $stmt->execute([$data['course_name'], $data['description'], $data['duration'], $data['status'], $id]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deleteCourse($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('ID required');
        
        $stmt = $conn->prepare("DELETE FROM tbl_course WHERE course_id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>