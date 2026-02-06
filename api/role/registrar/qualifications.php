<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'create':
        createQualification($conn);
        break;
    case 'list':
        getApprovedQualifications($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getApprovedQualifications($conn) {
    try {
        $stmt = $conn->query("SELECT qualification_id, course_name, ctpr_number, duration, training_cost, status FROM tbl_qualifications WHERE status = 'active' ORDER BY course_name ASC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function createQualification($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['qualification_name'])) {
            throw new Exception('Qualification name is required');
        }

        $stmt = $conn->prepare("INSERT INTO tbl_qualifications (course_name, ctpr_number, duration, training_cost, description, status) VALUES (?, ?, ?, ?, ?, 'pending')");
        $stmt->execute([
            $data['qualification_name'],
            $data['ctpr_number'] ?? null,
            $data['duration'] ?? null,
            $data['training_cost'] ?? 0,
            $data['description'] ?? null
        ]);

        echo json_encode(['success' => true, 'message' => 'Qualification submitted for approval']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
