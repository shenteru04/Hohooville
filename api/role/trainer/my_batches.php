<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';

class TrainerBatches {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $trainerId = $_GET['trainer_id'] ?? null;

        if (!$trainerId) {
            echo json_encode(['success' => false, 'message' => 'Trainer ID required']);
            return;
        }

        $this->getBatches($trainerId);
    }

    private function getBatches($trainerId) {
        try {
            $query = "SELECT b.batch_id, b.batch_name, c.course_id, c.course_name, oc.schedule, oc.room, b.status
                      FROM tbl_offered_courses oc
                      JOIN tbl_course c ON oc.course_id = c.course_id
                      JOIN tbl_enrollment e ON oc.offered_id = e.offered_id
                      JOIN tbl_batch b ON e.batch_id = b.batch_id
                      WHERE oc.trainer_id = ?
                      GROUP BY b.batch_id
                      ORDER BY b.status DESC, b.batch_id DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$trainerId]);
            $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $batches]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TrainerBatches($db);
$api->handleRequest();
?>