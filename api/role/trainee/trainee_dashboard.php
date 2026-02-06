<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';

class TraineeDashboard {
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
            // 1. Get Active Course/Batch
            $courseQuery = "SELECT c.qualification_id AS course_id, c.course_name, b.batch_name, b.start_date, b.end_date, oc.schedule, oc.room
                            FROM tbl_enrollment e
                            JOIN tbl_batch b ON e.batch_id = b.batch_id
                            JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                            JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                            WHERE e.trainee_id = ? AND e.status = 'approved' AND b.status = 'open'
                            LIMIT 1";
            $stmt = $this->conn->prepare($courseQuery);
            $stmt->execute([$traineeId]);
            $activeCourse = $stmt->fetch(PDO::FETCH_ASSOC);

            $qualificationId = $activeCourse ? $activeCourse['course_id'] : null;

            // 2. Get Attendance Rate
            // Assuming 'present' is the target status. Adjust if 'late' counts as present.
            $attQuery = "SELECT 
                            COUNT(*) as total_days,
                            SUM(CASE WHEN status = 'present' THEN 1 WHEN status = 'late' THEN 1 ELSE 0 END) as present_days
                         FROM tbl_attendance 
                         WHERE trainee_id = ?";
            $stmt = $this->conn->prepare($attQuery);
            $stmt->execute([$traineeId]);
            $attendance = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $attendanceRate = 0;
            if ($attendance && $attendance['total_days'] > 0) {
                $attendanceRate = round(($attendance['present_days'] / $attendance['total_days']) * 100, 1);
            }

            // 3. Get Average Grade (Current Course)
            $gradeQuery = "SELECT AVG(score) as total_grade,
                                  (CASE WHEN AVG(score) >= 80 THEN 'Competent' ELSE 'Not Yet Competent' END) as remarks 
                           FROM tbl_grades 
                           WHERE trainee_id = ? AND qualification_id = ?";
            $stmt = $this->conn->prepare($gradeQuery);
            $stmt->execute([$traineeId, $qualificationId]);
            $grade = $stmt->fetch(PDO::FETCH_ASSOC);

            // 4. Get Upcoming Schedule (Mock logic based on batch schedule string)
            // In a real app, this would query a calendar table.
            $schedule = [
                'course' => $activeCourse ? ($activeCourse['course_name'] ?? 'No Active Course') : 'No Active Course',
                'time' => $activeCourse ? ($activeCourse['schedule'] ?? 'N/A') : 'N/A',
                'room' => $activeCourse ? ($activeCourse['room'] ?? 'N/A') : 'N/A'
            ];

            echo json_encode(['success' => true, 'data' => [
                'active_course' => $activeCourse,
                'attendance_rate' => $attendanceRate,
                'current_grade' => $grade['total_grade'] ?? 'N/A',
                'competency_status' => $grade['remarks'] ?? 'Pending',
                'schedule' => $schedule
            ]]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TraineeDashboard($db);
$api->handleRequest();
?>