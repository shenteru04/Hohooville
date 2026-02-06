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

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';
switch ($action) {
    case 'get-data':
        getData($conn);
        break;
        
    case 'assign':
        assignSchedule($conn);
        break;
        
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        http_response_code(400);
}

function getData($conn) {
    try {
        // Get Active Trainers
        $trainers_query = "SELECT trainer_id, first_name, last_name FROM tbl_trainer WHERE status = 'active'";
        $trainers_stmt = $conn->prepare($trainers_query);
        $trainers_stmt->execute();
        $trainers = $trainers_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get open batches with their course, trainer, and schedule info
        $batches_query = "SELECT 
                            b.batch_id, 
                            b.batch_name, 
                            c.course_name, 
                            b.trainer_id, 
                            CONCAT_WS(' ', t.first_name, t.last_name) as trainer_name,
                            (SELECT oc.schedule FROM tbl_offered_qualifications oc JOIN tbl_enrollment e ON oc.offered_qualification_id = e.offered_qualification_id WHERE e.batch_id = b.batch_id LIMIT 1) as schedule,
                            (SELECT oc.room FROM tbl_offered_qualifications oc JOIN tbl_enrollment e ON oc.offered_qualification_id = e.offered_qualification_id WHERE e.batch_id = b.batch_id LIMIT 1) as room
                          FROM tbl_batch b
                          LEFT JOIN tbl_qualifications c ON b.qualification_id = c.qualification_id
                          LEFT JOIN tbl_trainer t ON b.trainer_id = t.trainer_id
                          WHERE b.status = 'open'
                          ORDER BY b.batch_id DESC";
        
        $batches_stmt = $conn->prepare($batches_query);
        $batches_stmt->execute();
        $batches = $batches_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => ['trainers' => $trainers, 'batches' => $batches]]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error fetching data: ' . $e->getMessage()]);
        http_response_code(500);
    }
}
        
function assignSchedule($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['batch_id'])) {
        echo json_encode(['success' => false, 'message' => 'Batch ID is required.']);
        http_response_code(400);
        return;
    }

    try {
        $conn->beginTransaction();

        $trainerId = $data['trainer_id'] ?: null;
        $batchId = $data['batch_id'];

        // Update trainer in tbl_batch
        $stmtBatch = $conn->prepare("UPDATE tbl_batch SET trainer_id = :trainer_id WHERE batch_id = :batch_id");
        $stmtBatch->execute([
            ':trainer_id' => $trainerId,
            ':batch_id' => $batchId
        ]);

        // Find all offered_id's associated with this batch through enrollments
        $stmtFind = $conn->prepare("SELECT DISTINCT offered_qualification_id FROM tbl_enrollment WHERE batch_id = ?");
        $stmtFind->execute([$batchId]);
        $offeredIds = $stmtFind->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($offeredIds)) {
            // Also update the trainer_id, schedule, and room in all associated offered_courses to maintain consistency
            $placeholders = implode(',', array_fill(0, count($offeredIds), '?'));
            $stmtOC = $conn->prepare("UPDATE tbl_offered_qualifications SET trainer_id = ?, schedule = ?, room = ? WHERE offered_qualification_id IN ($placeholders)");
            
            $params = array_merge([$trainerId, $data['schedule'] ?: null, $data['room'] ?: null], $offeredIds);
            $stmtOC->execute($params);
        }
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Schedule assigned successfully.']);
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'message' => 'Error assigning schedule: ' . $e->getMessage()]);
        http_response_code(500);
    }
}
?>