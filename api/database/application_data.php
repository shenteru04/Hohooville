<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = $_GET['action'] ?? '';

if ($action === 'get-form-data') {
    getFormData($conn);
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getFormData($conn) {
    try {
        // Get active courses that are offered
        $courseStmt = $conn->query("SELECT course_id, course_name FROM tbl_course WHERE status = 'active' ORDER BY course_name");
        $courses = $courseStmt->fetchAll(PDO::FETCH_ASSOC);

        // Get active scholarships
        $scholarshipStmt = $conn->query("SELECT scholarship_type_id, scholarship_name FROM tbl_scholarship_type WHERE status = 'active' ORDER BY scholarship_name");
        $scholarships = $scholarshipStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get active batches and their associated course
        $batchStmt = $conn->query("
            SELECT b.batch_id, b.batch_name, b.course_id 
            FROM tbl_batch b 
            WHERE b.status = 'open'
        ");
        $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true, 
            'data' => [
                'courses' => $courses,
                'scholarships' => $scholarships,
                'batches' => $batches
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()]);
    }
}
?>