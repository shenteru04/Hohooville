<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

require_once '../../database/db.php';

class TrainerGrading {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';

        switch($action) {
            case 'get-lessons':
                $this->getLessons();
                break;
            case 'get-grades':
                $this->getGrades();
                break;
            case 'save':
                $this->saveGrades();
                break;
            default:
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
    }

    private function getLessons() {
        $courseId = $_GET['course_id'] ?? null;
        if (!$courseId) {
            echo json_encode(['success' => false, 'message' => 'Course ID required']);
            return;
        }

        // Fetch existing lessons
        $stmt = $this->conn->prepare("SELECT lesson_id, day_number, lesson_title FROM tbl_lessons WHERE module_id IN (SELECT module_id FROM tbl_module WHERE course_id = ?) ORDER BY day_number ASC");
        $stmt->execute([$courseId]);
        $lessons = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // If no lessons exist, generate 25 days structure for the UI (as requested)
        if (empty($lessons)) {
            $lessons = [];
            for ($i = 1; $i <= 25; $i++) {
                $lessons[] = ['day_number' => $i, 'lesson_title' => 'Day ' . $i . ' Training'];
            }
        }

        echo json_encode(['success' => true, 'data' => $lessons]);
    }

    private function getGrades() {
        $batchId = $_GET['batch_id'] ?? null;
        $courseId = $_GET['course_id'] ?? null;
        $day = $_GET['day'] ?? null;

        if (!$batchId) {
            echo json_encode(['success' => false, 'message' => 'Batch ID required']);
            return;
        }

        try {
            if (!$courseId || $courseId === 'null' || $courseId === 'undefined') {
                // Get Course ID for the batch if not provided or invalid
                $stmtC = $this->conn->prepare("SELECT oc.course_id FROM tbl_batch b JOIN tbl_enrollment e ON b.batch_id = e.batch_id JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id WHERE b.batch_id = ? LIMIT 1");
                $stmtC->execute([$batchId]);
                $course = $stmtC->fetch(PDO::FETCH_ASSOC);
                $courseId = $course['course_id'] ?? 0;
            }

            if ($day) {
                // Daily View: Fetch Quiz and Practical scores for the specific day
                // We assume activity_type_id 1 = Quiz, 2 = Practical/Task Sheet
                $query = "SELECT t.trainee_id, t.first_name, t.last_name,
                                 (SELECT score FROM tbl_grades_dtl gd 
                                  JOIN tbl_test tt ON gd.test_id = tt.test_id 
                                  JOIN tbl_lessons tl ON tt.lesson_id = tl.lesson_id
                                  WHERE gd.grades_hdr_id = gh.grades_hdr_id AND tl.day_number = ? AND tt.activity_type_id = 1 LIMIT 1) as quiz_score,
                                 (SELECT score FROM tbl_grades_dtl gd 
                                  JOIN tbl_test tt ON gd.test_id = tt.test_id 
                                  JOIN tbl_lessons tl ON tt.lesson_id = tl.lesson_id
                                  WHERE gd.grades_hdr_id = gh.grades_hdr_id AND tl.day_number = ? AND tt.activity_type_id = 2 LIMIT 1) as practical_score,
                                 gh.remarks
                          FROM tbl_enrollment e
                          JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
                          LEFT JOIN tbl_grades_hdr gh ON t.trainee_id = gh.trainee_id AND gh.course_id = ?
                          WHERE e.batch_id = ? AND e.status = 'approved'
                          ORDER BY t.last_name ASC";
                $stmt = $this->conn->prepare($query);
                $stmt->execute([$day, $day, $courseId, $batchId]);
            } else {
                // Summary View
                $query = "SELECT t.trainee_id, t.first_name, t.last_name, 
                                 gh.pre_test, gh.post_test, gh.activities, gh.quizzes, gh.task_sheets,
                                 gh.total_grade, gh.remarks
                          FROM tbl_enrollment e
                          JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
                          LEFT JOIN tbl_grades_hdr gh ON t.trainee_id = gh.trainee_id AND gh.course_id = ?
                          WHERE e.batch_id = ? AND e.status = 'approved'
                          ORDER BY t.last_name ASC";
                $stmt = $this->conn->prepare($query);
                $stmt->execute([$courseId, $batchId]);
            }
            
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data, 'course_id' => $courseId]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function saveGrades() {
        $data = json_decode(file_get_contents('php://input'), true);
        $courseId = $data['course_id'] ?? null;
        $day = $data['day'] ?? null;
        $grades = $data['grades'] ?? [];

        if (!$courseId || empty($grades)) {
            echo json_encode(['success' => false, 'message' => 'Missing data']);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Ensure Header Exists
            $checkStmt = $this->conn->prepare("SELECT grades_hdr_id FROM tbl_grades_hdr WHERE trainee_id = ? AND course_id = ?");
            $insertHdrStmt = $this->conn->prepare("INSERT INTO tbl_grades_hdr (trainee_id, course_id, date_recorded) VALUES (?, ?, NOW())");

            // Prepare statements for Summary Update
            $updateSummaryStmt = $this->conn->prepare("UPDATE tbl_grades_hdr SET pre_test=?, post_test=?, activities=?, quizzes=?, task_sheets=?, total_grade=?, remarks=?, date_recorded=NOW() WHERE grades_hdr_id=?");
            
            // Prepare statements for Daily Update
            // We need to find/create lesson and test records first if they don't exist
            if ($day) {
                // 1. Ensure Lesson Exists
                // Find module for course (take first one or create default)
                $modStmt = $this->conn->prepare("SELECT module_id FROM tbl_module WHERE course_id = ? LIMIT 1");
                $modStmt->execute([$courseId]);
                $moduleId = $modStmt->fetchColumn();
                if (!$moduleId) {
                    $this->conn->prepare("INSERT INTO tbl_module (course_id, module_title) VALUES (?, 'Default Module')")->execute([$courseId]);
                    $moduleId = $this->conn->lastInsertId();
                }

                // Find/Create Lesson
                $lessStmt = $this->conn->prepare("SELECT lesson_id FROM tbl_lessons WHERE module_id = ? AND day_number = ?");
                $lessStmt->execute([$moduleId, $day]);
                $lessonId = $lessStmt->fetchColumn();
                if (!$lessonId) {
                    $this->conn->prepare("INSERT INTO tbl_lessons (module_id, day_number, lesson_title) VALUES (?, ?, ?)")->execute([$moduleId, $day, "Day $day"]);
                    $lessonId = $this->conn->lastInsertId();
                }

                // 2. Ensure Tests Exist (Type 1=Quiz, 2=Practical)
                $getTestId = function($lId, $type) {
                    $stmt = $this->conn->prepare("SELECT test_id FROM tbl_test WHERE lesson_id = ? AND activity_type_id = ?");
                    $stmt->execute([$lId, $type]);
                    $tid = $stmt->fetchColumn();
                    if (!$tid) {
                        $this->conn->prepare("INSERT INTO tbl_test (lesson_id, activity_type_id, max_score) VALUES (?, ?, 100)")->execute([$lId, $type]);
                        $tid = $this->conn->lastInsertId();
                    }
                    return $tid;
                };

                $quizTestId = $getTestId($lessonId, 1);
                $practicalTestId = $getTestId($lessonId, 2);

                // Statement for saving details
                $delDtlStmt = $this->conn->prepare("DELETE FROM tbl_grades_dtl WHERE grades_hdr_id = ? AND test_id = ?");
                $insDtlStmt = $this->conn->prepare("INSERT INTO tbl_grades_dtl (grades_hdr_id, test_id, score) VALUES (?, ?, ?)");
            }

            foreach ($grades as $g) {
                $checkStmt->execute([$g['trainee_id'], $courseId]);
                $hdrId = $checkStmt->fetchColumn();

                if (!$hdrId) {
                    $insertHdrStmt->execute([$g['trainee_id'], $courseId]);
                    $hdrId = $this->conn->lastInsertId();
                }

                if ($day) {
                    // Save Daily Grades
                    $delDtlStmt->execute([$hdrId, $quizTestId]);
                    if (isset($g['quiz_score']) && $g['quiz_score'] !== '') $insDtlStmt->execute([$hdrId, $quizTestId, $g['quiz_score']]);

                    $delDtlStmt->execute([$hdrId, $practicalTestId]);
                    if (isset($g['practical_score']) && $g['practical_score'] !== '') $insDtlStmt->execute([$hdrId, $practicalTestId, $g['practical_score']]);
                } else {
                    // Save Summary Grades
                    $remarks = $g['remarks'] ?? null;
                    $updateSummaryStmt->execute([$g['pre_test']??0, $g['post_test']??0, $g['activities']??0, $g['quizzes']??0, $g['task_sheets']??0, $g['total_grade']??0, $remarks, $hdrId]);
                }
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Grades saved successfully']);
        } catch (Exception $e) {
            $this->conn->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TrainerGrading($db);
$api->handleRequest();
?>