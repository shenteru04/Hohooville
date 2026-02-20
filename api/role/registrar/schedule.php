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
                            c.qualification_name as course_name, 
                            b.trainer_id, 
                            CONCAT_WS(' ', t.first_name, t.last_name) as trainer_name,
                            s.schedule,
                            s.room
                          FROM tbl_batch b
                          LEFT JOIN tbl_qualifications c ON b.qualification_id = c.qualification_id
                          LEFT JOIN tbl_trainer t ON b.trainer_id = t.trainer_id
                          LEFT JOIN tbl_schedule s ON b.batch_id = s.batch_id
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

        // Update or Insert into tbl_schedule
        $stmtCheck = $conn->prepare("SELECT schedule_id FROM tbl_schedule WHERE batch_id = ?");
        $stmtCheck->execute([$batchId]);
        $exists = $stmtCheck->fetchColumn();

        if ($exists) {
            $stmtSchedule = $conn->prepare("UPDATE tbl_schedule SET schedule = ?, room = ?, updated_at = NOW() WHERE batch_id = ?");
            $stmtSchedule->execute([$data['schedule'] ?: null, $data['room'] ?: null, $batchId]);
        } else {
            $stmtSchedule = $conn->prepare("INSERT INTO tbl_schedule (batch_id, schedule, room, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())");
            $stmtSchedule->execute([$batchId, $data['schedule'] ?: null, $data['room'] ?: null]);
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