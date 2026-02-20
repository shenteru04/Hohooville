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
            // 1. Get Active Course/Batch (not archived and batch is open)
            $courseQuery = "SELECT th.trainee_school_id, c.qualification_id AS course_id, c.qualification_name AS course_name, 
                                   b.batch_name, b.start_date, b.end_date, 
                                   COALESCE(s.schedule, oc.schedule) as schedule, 
                                   COALESCE(s.room, oc.room) as room, 
                                   e.enrollment_id, e.status as enrollment_status
                            FROM tbl_enrollment e
                            JOIN tbl_batch b ON e.batch_id = b.batch_id
                            LEFT JOIN tbl_schedule s ON b.batch_id = s.batch_id
                            JOIN tbl_trainee_hdr th ON e.trainee_id = th.trainee_id
                            JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                            JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                            WHERE e.trainee_id = ? AND e.status IN ('approved', 'completed') AND b.status = 'open' AND (e.is_archived = 0 OR e.is_archived IS NULL)
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

            // Check if trainee is competent and auto-archive if needed
            if ($activeCourse && $grade && $grade['total_grade'] >= 80 && $grade['remarks'] === 'Competent') {
                $this->autoArchiveCompletedCourse($activeCourse['enrollment_id'], $traineeId, $qualificationId);
                // After auto-archiving, clear active course since it's now archived
                $activeCourse = null;
                $qualificationId = null;
                $grade = null;
            }

            // 4. Get Upcoming Schedule (Mock logic based on batch schedule string)
            // In a real app, this would query a calendar table.
            $schedule = [
                'course' => $activeCourse ? ($activeCourse['course_name'] ?? 'No Active Course') : 'No Active Course',
                'time' => $activeCourse ? ($activeCourse['schedule'] ?? 'N/A') : 'N/A',
                'room' => $activeCourse ? ($activeCourse['room'] ?? 'N/A') : 'N/A'
            ];

            // 5. Get Archived Courses
            $archivedQuery = "SELECT c.qualification_id AS course_id, c.qualification_name AS course_name, b.batch_name, 
                                     b.start_date, b.end_date, e.completion_date, e.archive_date, e.enrollment_id,
                                     (SELECT AVG(score) FROM tbl_grades WHERE trainee_id = ? AND qualification_id = c.qualification_id) as final_score
                              FROM tbl_enrollment e
                              JOIN tbl_batch b ON e.batch_id = b.batch_id
                              JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                              JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                              WHERE e.trainee_id = ? AND e.is_archived = 1
                              ORDER BY e.completion_date DESC, e.archive_date DESC";
            $archivedStmt = $this->conn->prepare($archivedQuery);
            $archivedStmt->execute([$traineeId, $traineeId]);
            $archivedCourses = $archivedStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => [
                'active_course' => $activeCourse,
                'attendance_rate' => $attendanceRate,
                'current_grade' => $grade['total_grade'] ?? 'N/A',
                'competency_status' => $grade['remarks'] ?? 'Pending',
                'schedule' => $schedule,
                'archived_courses' => $archivedCourses
            ]]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function autoArchiveCompletedCourse($enrollmentId, $traineeId, $qualificationId) {
        try {
            $updateQuery = "UPDATE tbl_enrollment 
                           SET status = 'completed', 
                               completion_date = CURDATE(),
                               is_archived = 1,
                               archive_date = CURDATE()
                           WHERE enrollment_id = ? AND trainee_id = ? AND is_archived = 0";
            $stmt = $this->conn->prepare($updateQuery);
            $stmt->execute([$enrollmentId, $traineeId]);
        } catch (Exception $e) {
            // Log error but don't throw - auto-archive is non-critical
            error_log("Auto-archive failed for enrollment $enrollmentId: " . $e->getMessage());
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TraineeDashboard($db);
$api->handleRequest();
?>