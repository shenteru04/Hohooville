<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

require_once '../../database/db.php';

class AssignSchedule {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';

        switch($action) {
            case 'get-data':
                $this->getData();
                break;
            case 'assign':
                $this->assignSchedule();
                break;
            default:
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
    }

    private function getData() {
        try {
            // Get Trainers
            $trainersQuery = "SELECT u.user_id, t.trainer_id, t.first_name, t.last_name 
                              FROM tbl_users u 
                              JOIN tbl_trainer t ON u.user_id = t.user_id 
                              WHERE u.status = 'active'";
            $stmtT = $this->conn->prepare($trainersQuery);
            $stmtT->execute();
            $trainers = $stmtT->fetchAll(PDO::FETCH_ASSOC);

            // Get Batches with current assignments
            $batchesQuery = "SELECT b.batch_id, b.batch_name, 
zz                                    (SELECT c.course_name FROM tbl_enrollment e 
                                     JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id 
                                     JOIN tbl_course c ON oc.course_id = c.course_id 
                                     WHERE e.batch_id = b.batch_id LIMIT 1) as course_name,
                                    (SELECT oc.schedule FROM tbl_enrollment e JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id WHERE e.batch_id = b.batch_id LIMIT 1) as schedule,
                                    (SELECT oc.room FROM tbl_enrollment e JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id WHERE e.batch_id = b.batch_id LIMIT 1) as room,
                                    (SELECT t.user_id FROM tbl_enrollment e JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id JOIN tbl_trainer t ON oc.trainer_id = t.trainer_id WHERE e.batch_id = b.batch_id LIMIT 1) as trainer_id,
                                    (SELECT CONCAT(t.first_name, ' ', t.last_name) FROM tbl_enrollment e JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id JOIN tbl_trainer t ON oc.trainer_id = t.trainer_id WHERE e.batch_id = b.batch_id LIMIT 1) as trainer_name
                             FROM tbl_batch b
                             WHERE b.status != 'cancelled'
                             ORDER BY b.batch_id DESC";
            $stmtB = $this->conn->prepare($batchesQuery);
            $stmtB->execute();
            $batches = $stmtB->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true, 
                'data' => [
                    'trainers' => $trainers, 
                    'batches' => $batches
                ]
            ]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function assignSchedule() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $batchId = $data['batch_id'] ?? null;
        $trainerId = $data['trainer_id'] ?? null; // This is the user_id of the trainer
        $schedule = $data['schedule'] ?? null;
        $room = $data['room'] ?? null;

        if (!$batchId || !$trainerId || !$schedule || !$room) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // 2. Update Offered Courses linked to this batch
            // First, find the offered_ids associated with this batch via enrollment
            $findOffered = $this->conn->prepare("SELECT DISTINCT offered_id FROM tbl_enrollment WHERE batch_id = ?");
            $findOffered->execute([$batchId]);
            $offeredIds = $findOffered->fetchAll(PDO::FETCH_COLUMN);

            if (!empty($offeredIds)) {
                // Get actual trainer_id from tbl_trainer using user_id
                $getTrId = $this->conn->prepare("SELECT trainer_id FROM tbl_trainer WHERE user_id = ?");
                $getTrId->execute([$trainerId]);
                $realTrainerId = $getTrId->fetchColumn();

                if ($realTrainerId) {
                    $placeholders = implode(',', array_fill(0, count($offeredIds), '?'));
                    $updateOffered = $this->conn->prepare("UPDATE tbl_offered_courses SET trainer_id = ?, schedule = ?, room = ? WHERE offered_id IN ($placeholders)");
                    
                    $params = array_merge([$realTrainerId, $schedule, $room], $offeredIds);
                    $updateOffered->execute($params);
                }
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Schedule assigned successfully']);
        } catch (Exception $e) {
            $this->conn->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new AssignSchedule($db);
$api->handleRequest();
?>