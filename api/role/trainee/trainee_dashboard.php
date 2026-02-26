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
                                s.room_id as room_id, 
                                COALESCE(r.room_name, oc.room) as room_name, 
                                e.enrollment_id, e.status as enrollment_status
                            FROM tbl_enrollment e
                            JOIN tbl_batch b ON e.batch_id = b.batch_id
                            LEFT JOIN tbl_schedule s ON b.batch_id = s.batch_id
                            LEFT JOIN tbl_rooms r ON s.room_id = r.room_id
                            JOIN tbl_trainee_hdr th ON e.trainee_id = th.trainee_id
                            JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                            JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                            WHERE e.trainee_id = ? AND e.status IN ('approved', 'completed') AND b.status = 'open' AND (e.is_archived = 0 OR e.is_archived IS NULL)
                            LIMIT 1";
            $stmt = $this->conn->prepare($courseQuery);
            $stmt->execute([$traineeId]);
            $activeCourse = $stmt->fetch(PDO::FETCH_ASSOC);
            // DEBUG OUTPUT
            file_put_contents(__DIR__ . '/debug_active_course.log', print_r($activeCourse, true));

            $qualificationId = $activeCourse ? $activeCourse['course_id'] : null;

            // 2. Get Progress Rate (quiz + task sheet completion)
            $progressRate = $this->calculateProgressRate($traineeId, $qualificationId);

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
                'room' => $activeCourse ? ($activeCourse['room_name'] ?? 'N/A') : 'N/A'
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
                'progress_rate' => $progressRate,
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

    private function calculateProgressRate($traineeId, $qualificationId) {
        if (!$qualificationId) return 0;

        try {
            $lessonQuery = "SELECT 
                                l.lesson_id,
                                IF(t.test_id IS NULL, 0, 1) as has_quiz,
                                (SELECT COUNT(*) FROM tbl_task_sheets ts WHERE ts.lesson_id = l.lesson_id) as task_sheet_count
                            FROM tbl_module m
                            JOIN tbl_lessons l ON m.module_id = l.module_id
                            LEFT JOIN tbl_test t ON l.lesson_id = t.lesson_id AND t.activity_type_id = 1
                            WHERE m.qualification_id = ? AND (l.posting_date IS NULL OR l.posting_date <= NOW())
                            ORDER BY m.module_id, l.lesson_id";
            $stmt = $this->conn->prepare($lessonQuery);
            $stmt->execute([$qualificationId]);
            $lessons = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($lessons)) return 0;

            $lessonIds = array_column($lessons, 'lesson_id');
            $in = implode(',', array_fill(0, count($lessonIds), '?'));

            // Quiz completions (per lesson)
            $quizStmt = $this->conn->prepare(
                "SELECT DISTINCT tt.lesson_id
                 FROM tbl_grades g
                 JOIN tbl_test tt ON g.test_id = tt.test_id
                 WHERE g.trainee_id = ? AND tt.activity_type_id = 1 AND tt.lesson_id IN ($in)"
            );
            $quizStmt->execute(array_merge([$traineeId], $lessonIds));
            $quizDone = $quizStmt->fetchAll(PDO::FETCH_COLUMN);
            $quizDoneSet = array_flip($quizDone);

            // Task sheet submissions (per lesson)
            $taskStmt = $this->conn->prepare(
                "SELECT lesson_id, COUNT(DISTINCT task_sheet_id) as submitted_count
                 FROM tbl_task_sheet_submissions
                 WHERE trainee_id = ? AND status IN ('submitted', 'approved') AND lesson_id IN ($in)
                 GROUP BY lesson_id"
            );
            $taskStmt->execute(array_merge([$traineeId], $lessonIds));
            $submittedCounts = $taskStmt->fetchAll(PDO::FETCH_KEY_PAIR);

            $totalUnits = 0;
            $completedUnits = 0;

            foreach ($lessons as $lesson) {
                $hasQuiz = (int)$lesson['has_quiz'] === 1;
                $taskCount = (int)$lesson['task_sheet_count'];

                if ($hasQuiz) {
                    $totalUnits++;
                    if (isset($quizDoneSet[$lesson['lesson_id']])) $completedUnits++;
                }

                if ($taskCount > 0) {
                    $totalUnits++;
                    $submitted = (int)($submittedCounts[$lesson['lesson_id']] ?? 0);
                    if ($submitted >= $taskCount) $completedUnits++;
                }
            }

            if ($totalUnits === 0) return 0;
            return round(($completedUnits / $totalUnits) * 100, 1);
        } catch (Exception $e) {
            return 0;
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TraineeDashboard($db);
$api->handleRequest();
?>
