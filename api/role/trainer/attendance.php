<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

require_once '../../database/db.php';

class TrainerAttendance {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';

        switch($action) {
            case 'get-trainees':
                $this->getTrainees();
                break;
            case 'save':
                $this->saveAttendance();
                break;
            default:
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
    }

    private function getTrainees() {
        $batchId = $_GET['batch_id'] ?? null;
        $date = $_GET['date'] ?? date('Y-m-d');

        if (!$batchId) {
            echo json_encode(['success' => false, 'message' => 'Batch ID required']);
            return;
        }

        // Check if attendance already exists for this date/batch
        $hdrQuery = "SELECT attendance_hdr_id FROM tbl_attendance_hdr WHERE batch_id = ? AND date_recorded = ?";
        $hdrStmt = $this->conn->prepare($hdrQuery);
        $hdrStmt->execute([$batchId, $date]);
        $hdr = $hdrStmt->fetch(PDO::FETCH_ASSOC);
        $hdrId = $hdr ? $hdr['attendance_hdr_id'] : null;

        // Fetch trainees and their status if exists
        $query = "SELECT t.trainee_id, t.trainee_school_id, t.first_name, t.last_name, 
                         COALESCE(ad.status, 'present') as status
                  FROM tbl_enrollment e
                  JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
                  LEFT JOIN tbl_attendance_dtl ad ON t.trainee_id = ad.trainee_id AND ad.attendance_hdr_id = ?
                  WHERE e.batch_id = ? AND e.status = 'approved'
                  ORDER BY t.last_name ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$hdrId, $batchId]);
        $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $trainees]);
    }

    private function saveAttendance() {
        $data = json_decode(file_get_contents('php://input'), true);
        $batchId = $data['batch_id'] ?? null;
        $date = $data['date'] ?? null;
        $trainees = $data['trainees'] ?? [];

        if (!$batchId || !$date || empty($trainees)) {
            echo json_encode(['success' => false, 'message' => 'Missing data']);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // 1. Check or Create Header
            $hdrQuery = "SELECT attendance_hdr_id FROM tbl_attendance_hdr WHERE batch_id = ? AND date_recorded = ?";
            $hdrStmt = $this->conn->prepare($hdrQuery);
            $hdrStmt->execute([$batchId, $date]);
            $hdr = $hdrStmt->fetch(PDO::FETCH_ASSOC);

            if ($hdr) {
                $hdrId = $hdr['attendance_hdr_id'];
                // Clear existing details to overwrite
                $delStmt = $this->conn->prepare("DELETE FROM tbl_attendance_dtl WHERE attendance_hdr_id = ?");
                $delStmt->execute([$hdrId]);
            } else {
                $insHdr = $this->conn->prepare("INSERT INTO tbl_attendance_hdr (batch_id, date_recorded) VALUES (?, ?)");
                $insHdr->execute([$batchId, $date]);
                $hdrId = $this->conn->lastInsertId();
            }

            // 2. Insert Details
            $insDtl = $this->conn->prepare("INSERT INTO tbl_attendance_dtl (attendance_hdr_id, trainee_id, status, remarks) VALUES (?, ?, ?, '')");
            foreach ($trainees as $t) {
                $insDtl->execute([$hdrId, $t['trainee_id'], $t['status']]);
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Attendance saved successfully']);
        } catch (Exception $e) {
            $this->conn->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TrainerAttendance($db);
$api->handleRequest();
?>
