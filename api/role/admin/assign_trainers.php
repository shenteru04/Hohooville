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
        getAssignments($conn);
        break;
    case 'trainers-list':
        getTrainers($conn);
        break;
    case 'assign-trainer':
        assignTrainer($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getAssignments($conn) {
    try {
        // Fetch offered courses and link to trainers and courses
        // We try to fetch a related batch name via enrollment if possible, otherwise 'N/A'
        $query = "
            SELECT 
                oc.offered_id, 
                c.course_name as qualification_title, 
                t.trainer_id,
                t.first_name, 
                t.last_name,
                (SELECT b.batch_name 
                 FROM tbl_enrollment e 
                 JOIN tbl_batch b ON e.batch_id = b.batch_id 
                 WHERE e.offered_id = oc.offered_id 
                 LIMIT 1) as batch_name
            FROM tbl_offered_courses oc
            JOIN tbl_course c ON oc.course_id = c.course_id
            LEFT JOIN tbl_trainer t ON oc.trainer_id = t.trainer_id
            ORDER BY oc.offered_id DESC
        ";
        $stmt = $conn->query($query);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getTrainers($conn) {
    try {
        $stmt = $conn->query("SELECT trainer_id, first_name, last_name FROM tbl_trainer WHERE status = 'active'");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function assignTrainer($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['offered_id']) || empty($data['trainer_id'])) {
            throw new Exception('Offered Course ID and Trainer ID are required');
        }
        
        $stmt = $conn->prepare("UPDATE tbl_offered_courses SET trainer_id = ? WHERE offered_id = ?");
        $stmt->execute([$data['trainer_id'], $data['offered_id']]);
        
        echo json_encode(['success' => true, 'message' => 'Trainer assigned successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>