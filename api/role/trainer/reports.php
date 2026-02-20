<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';

class TrainerReports {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';
        $batchId = $_GET['batch_id'] ?? null;

        if (!$batchId) {
            echo json_encode(['success' => false, 'message' => 'Batch ID required']);
            return;
        }

        switch($action) {
            case 'grading_summary':
            case 'competency_status':
                $this->getGradingReport($batchId);
                break;
            case 'attendance_summary':
                $this->getAttendanceReport($batchId);
                break;
            default:
                echo json_encode(['success' => false, 'message' => 'Invalid report type']);
        }
    }

    private function getGradingReport($batchId) {
        // Join Enrollment to get trainees in batch, then Grades
        $query = "SELECT 
                    t.trainee_school_id,
                    CONCAT(t.first_name, ' ', t.last_name) as trainee_name,
                    c.qualification_name as course_name,
                    (SELECT AVG(score) FROM tbl_grades WHERE trainee_id = t.trainee_id AND qualification_id = c.qualification_id) as total_grade,
                    (CASE WHEN (SELECT AVG(score) FROM tbl_grades WHERE trainee_id = t.trainee_id AND qualification_id = c.qualification_id) >= 80 THEN 'Competent' ELSE 'Not Yet Competent' END) as remarks
                  FROM tbl_enrollment e
                  JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
                  JOIN tbl_batch b ON e.batch_id = b.batch_id
                  JOIN tbl_qualifications c ON b.qualification_id = c.qualification_id
                  WHERE e.batch_id = ? AND e.status = 'approved'";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$batchId]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data]);
    }

    private function getAttendanceReport($batchId) {
        // Get trainees and aggregate their attendance details
        $query = "SELECT 
                    t.trainee_school_id,
                    CONCAT(t.first_name, ' ', t.last_name) as trainee_name,
                    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
                    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
                    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late
                  FROM tbl_enrollment e
                  JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
                  LEFT JOIN tbl_attendance a ON t.trainee_id = a.trainee_id AND a.batch_id = e.batch_id
                  WHERE e.batch_id = ? AND e.status = 'approved'
                  GROUP BY t.trainee_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$batchId]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data]);
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TrainerReports($db);
$api->handleRequest();
?>