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
                    CONCAT(t.first_name, ' ', t.last_name) as trainee_name,
                    c.course_name,
                    gh.total_grade,
                    gh.remarks
                  FROM tbl_enrollment e
                  JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
                  JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id
                  JOIN tbl_course c ON oc.course_id = c.course_id
                  LEFT JOIN tbl_grades_hdr gh ON t.trainee_id = gh.trainee_id AND c.course_id = gh.course_id
                  WHERE e.batch_id = ? AND e.status = 'approved'";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$batchId]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data]);
    }

    private function getAttendanceReport($batchId) {
        // Get trainees and aggregate their attendance details
        $query = "SELECT 
                    CONCAT(t.first_name, ' ', t.last_name) as trainee_name,
                    SUM(CASE WHEN ad.status = 'present' THEN 1 ELSE 0 END) as present,
                    SUM(CASE WHEN ad.status = 'absent' THEN 1 ELSE 0 END) as absent,
                    SUM(CASE WHEN ad.status = 'late' THEN 1 ELSE 0 END) as late
                  FROM tbl_enrollment e
                  JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
                  LEFT JOIN tbl_attendance_dtl ad ON t.trainee_id = ad.trainee_id
                  LEFT JOIN tbl_attendance_hdr ah ON ad.attendance_hdr_id = ah.attendance_hdr_id
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