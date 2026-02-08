<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';

class TraineeDetails {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $traineeId = $_GET['trainee_id'] ?? null;

        if (!$traineeId) {
            echo json_encode(['success' => false, 'message' => 'Trainee ID required']);
            return;
        }

        try {
            // 1. Personal Info & Enrollment
            $queryInfo = "SELECT t.*, c.qualification_name as course_name, b.batch_name, e.status as enrollment_status, s.scholarship_name
                         FROM tbl_trainee_hdr t
                         LEFT JOIN tbl_enrollment e ON t.trainee_id = e.trainee_id
                         LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                         LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                         LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                         LEFT JOIN tbl_scholarship s ON t.trainee_id = s.trainee_id
                         WHERE t.trainee_id = ?";
            $stmtInfo = $this->conn->prepare($queryInfo);
            $stmtInfo->execute([$traineeId]);
            $profile = $stmtInfo->fetch(PDO::FETCH_ASSOC);

            // 2. Competency History (Grades)
            $queryGrades = "SELECT m.module_title, l.lesson_title, t.max_score, gd.score, gd.remarks
                           FROM tbl_grades_dtl gd
                           JOIN tbl_test t ON gd.test_id = t.test_id
                           JOIN tbl_lessons l ON t.lesson_id = l.lesson_id
                           JOIN tbl_module m ON l.module_id = m.module_id
                           JOIN tbl_grades_hdr gh ON gd.grades_hdr_id = gh.grades_hdr_id
                           WHERE gh.trainee_id = ?";
            $stmtGrades = $this->conn->prepare($queryGrades);
            $stmtGrades->execute([$traineeId]);
            $competency = $stmtGrades->fetchAll(PDO::FETCH_ASSOC);

            // 3. Attendance Summary
            $queryAtt = "SELECT status, COUNT(*) as count FROM tbl_attendance_dtl WHERE trainee_id = ? GROUP BY status";
            $stmtAtt = $this->conn->prepare($queryAtt);
            $stmtAtt->execute([$traineeId]);
            $attendance = $stmtAtt->fetchAll(PDO::FETCH_KEY_PAIR);

            echo json_encode([
                'success' => true,
                'data' => [
                    'profile' => $profile,
                    'competency_history' => $competency,
                    'attendance_summary' => $attendance
                ]
            ]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TraineeDetails($db);
$api->handleRequest();
?>