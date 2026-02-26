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
            $query = "SELECT b.batch_id, b.batch_name, b.qualification_id, c.qualification_name as course_name, c.duration, s.schedule, s.room, b.status, b.start_date, b.end_date
                      FROM tbl_batch b
                      LEFT JOIN tbl_qualifications c ON b.qualification_id = c.qualification_id
                      LEFT JOIN tbl_schedule s ON b.batch_id = s.batch_id
                      WHERE b.trainer_id = ?
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
