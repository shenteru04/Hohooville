<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';
require_once '../../utils/trainer_assignment_helper.php';

class MyTrainees {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
        ta_ensure_schema($this->conn);
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';
        $trainerId = (int)($_GET['trainer_id'] ?? 0);
        $batchId = (int)($_GET['batch_id'] ?? 0);

        if ($action !== 'list' || $trainerId <= 0 || $batchId <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid request']);
            return;
        }

        $this->getTrainees($trainerId, $batchId);
    }

    private function getTrainees(int $trainerId, int $batchId) {
        try {
            if (!ta_trainer_has_batch_access($this->conn, $trainerId, $batchId)) {
                echo json_encode(['success' => false, 'message' => 'You are not assigned to this batch.']);
                return;
            }

            $stmt = $this->conn->prepare("
                SELECT
                    e.trainee_id,
                    e.status AS enrollment_status,
                    e.enrollment_date,
                    DATE_FORMAT(e.enrollment_date, '%Y-%m-%d %H:%i:%s') AS formatted_enrollment_date,
                    h.first_name,
                    h.last_name,
                    h.email,
                    h.phone_number,
                    CONCAT(h.first_name, ' ', h.last_name) AS full_name,
                    b.batch_name,
                    q.qualification_name AS course_name
                FROM tbl_enrollment e
                JOIN tbl_trainee_hdr h ON e.trainee_id = h.trainee_id
                JOIN tbl_batch b ON e.batch_id = b.batch_id
                LEFT JOIN tbl_qualifications q ON b.qualification_id = q.qualification_id
                WHERE e.batch_id = ?
                  AND e.status = 'approved'
                ORDER BY h.last_name, h.first_name
            ");
            $stmt->execute([$batchId]);

            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC) ?: []]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new MyTrainees($db);
$api->handleRequest();
?>
