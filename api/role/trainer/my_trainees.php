<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';

class MyTrainees {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';
        $trainerId = $_GET['trainer_id'] ?? null;
        $batchId = $_GET['batch_id'] ?? null;

        if ($action === 'list' && $trainerId && $batchId) {
            $this->getTrainees($trainerId, $batchId);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid request']);
        }
    }

    private function getTrainees($trainerId, $batchId) {
        try {
            // JOIN tbl_trainees (Enrollment) with tbl_trainee_hdr (Profile) to get phone_number
            $query = "SELECT 
                        t.trainee_id, 
                        t.status as enrollment_status,
                        h.first_name, 
                        h.last_name, 
                        h.email, 
                        h.phone_number,
                        CONCAT(h.first_name, ' ', h.last_name) as full_name,
                        b.batch_name,
                        q.qualification_name as course_name
                      FROM tbl_enrollment t
                      JOIN tbl_trainee_hdr h ON t.trainee_id = h.trainee_id
                      JOIN tbl_batch b ON t.batch_id = b.batch_id
                      LEFT JOIN tbl_qualifications q ON b.qualification_id = q.qualification_id
                      WHERE t.batch_id = ? AND b.trainer_id = ?";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$batchId, $trainerId]);
            $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $trainees]);
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
