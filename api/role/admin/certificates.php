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
        getCertificates($conn);
        break;
    case 'get':
        getCertificate($conn);
        break;
    case 'get-form-data':
        getFormData($conn);
        break;
    case 'add':
        addCertificate($conn);
        break;
    case 'update':
        updateCertificate($conn);
        break;
    case 'delete':
        deleteCertificate($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getCertificates($conn) {
    try {
        $stmt = $conn->query("
            SELECT c.*, t.first_name, t.last_name, co.course_name 
            FROM tbl_certificate c 
            LEFT JOIN tbl_trainee_hdr t ON c.trainee_id = t.trainee_id 
            LEFT JOIN tbl_course co ON c.course_id = co.course_id 
            ORDER BY c.certificate_id DESC
        ");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getCertificate($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('ID required');

        $stmt = $conn->prepare("
            SELECT c.*, t.first_name, t.last_name, co.course_name, co.duration
            FROM tbl_certificate c 
            LEFT JOIN tbl_trainee_hdr t ON c.trainee_id = t.trainee_id 
            LEFT JOIN tbl_course co ON c.course_id = co.course_id 
            WHERE c.certificate_id = ?
        ");
        $stmt->execute([$id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$data) throw new Exception('Certificate not found');

        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getFormData($conn) {
    try {
        $stmtTrainees = $conn->query("SELECT trainee_id, first_name, last_name FROM tbl_trainee_hdr WHERE status = 'active' ORDER BY last_name ASC");
        $trainees = $stmtTrainees->fetchAll(PDO::FETCH_ASSOC);

        $stmtCourses = $conn->query("SELECT course_id, course_name FROM tbl_course WHERE status = 'active' ORDER BY course_name ASC");
        $courses = $stmtCourses->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => ['trainees' => $trainees, 'courses' => $courses]]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function addCertificate($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $conn->prepare("INSERT INTO tbl_certificate (trainee_id, course_id, issue_date, validity_date, certificate_status) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['trainee_id'], $data['course_id'], $data['issue_date'], 
            $data['validity_date'], $data['certificate_status'] ?? 'valid'
        ]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateCertificate($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['certificate_id'];
        
        $stmt = $conn->prepare("UPDATE tbl_certificate SET trainee_id = ?, course_id = ?, issue_date = ?, validity_date = ?, certificate_status = ? WHERE certificate_id = ?");
        $stmt->execute([
            $data['trainee_id'], $data['course_id'], $data['issue_date'], 
            $data['validity_date'], $data['certificate_status'], $id
        ]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deleteCertificate($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('ID required');
        
        $stmt = $conn->prepare("DELETE FROM tbl_certificate WHERE certificate_id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>