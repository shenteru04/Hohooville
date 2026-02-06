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
        $qualificationId = $_GET['qualification_id'] ?? null;
        if (!$qualificationId) {
            echo json_encode(['success' => false, 'message' => 'Qualification ID required']);
            return;
        }

        // Fetch existing lessons
        $stmt = $this->conn->prepare("SELECT lesson_id, day_number, lesson_title FROM tbl_lessons WHERE module_id IN (SELECT module_id FROM tbl_module WHERE qualification_id = ?) ORDER BY day_number ASC");
        $stmt->execute([$qualificationId]);
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
        $qualificationId = $_GET['qualification_id'] ?? null;
        $day = $_GET['day'] ?? null;

        if (!$batchId) {
            echo json_encode(['success' => false, 'message' => 'Batch ID required']);
            return;
        }

        try {
            if (!$qualificationId || $qualificationId === 'null' || $qualificationId === 'undefined') {
                // Get Course ID for the batch if not provided or invalid
                $stmtC = $this->conn->prepare("SELECT oc.qualification_id FROM tbl_batch b JOIN tbl_enrollment e ON b.batch_id = e.batch_id JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id WHERE b.batch_id = ? LIMIT 1");
                $stmtC->execute([$batchId]);
                $course = $stmtC->fetch(PDO::FETCH_ASSOC);
                $qualificationId = $course['qualification_id'] ?? 0;
            }

            if ($day) {
                // Daily View: Fetch Quiz and Practical scores for the specific day
                // We assume activity_type_id 1 = Quiz, 2 = Practical/Task Sheet from tbl_test
                $query = "SELECT t.trainee_id, t.first_name, t.last_name,
                                 q.score as quiz_score,
                                 p.score as practical_score
                          FROM tbl_enrollment e
                          JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
                          LEFT JOIN (
                              SELECT g.trainee_id, g.score FROM tbl_grades g
                              JOIN tbl_test tt ON g.test_id = tt.test_id
                              JOIN tbl_lessons l ON tt.lesson_id = l.lesson_id
                              WHERE l.day_number = ? AND tt.activity_type_id = 1 AND g.qualification_id = ?
                          ) q ON t.trainee_id = q.trainee_id
                          LEFT JOIN (
                              SELECT g.trainee_id, g.score FROM tbl_grades g
                              JOIN tbl_test tt ON g.test_id = tt.test_id
                              JOIN tbl_lessons l ON tt.lesson_id = l.lesson_id
                              WHERE l.day_number = ? AND tt.activity_type_id = 2 AND g.qualification_id = ?
                          ) p ON t.trainee_id = p.trainee_id
                          WHERE e.batch_id = ? AND e.status = 'approved'
                          ORDER BY t.last_name ASC";
                $stmt = $this->conn->prepare($query);
                $stmt->execute([$day, $qualificationId, $day, $qualificationId, $batchId]);
            } else {
                // Summary View - This now calculates totals from the new tbl_grades
                $query = "SELECT t.trainee_id, t.first_name, t.last_name, 
                                 (SELECT AVG(g.score) FROM tbl_grades g JOIN tbl_test tt ON g.test_id = tt.test_id WHERE g.trainee_id = t.trainee_id AND g.qualification_id = ? AND tt.activity_type_id = 3) as pre_test,
                                 (SELECT AVG(g.score) FROM tbl_grades g JOIN tbl_test tt ON g.test_id = tt.test_id WHERE g.trainee_id = t.trainee_id AND g.qualification_id = ? AND tt.activity_type_id = 4) as post_test,
                                 (SELECT AVG(g.score) FROM tbl_grades g JOIN tbl_test tt ON g.test_id = tt.test_id WHERE g.trainee_id = t.trainee_id AND g.qualification_id = ? AND tt.activity_type_id = 5) as activities,
                                 (SELECT AVG(g.score) FROM tbl_grades g JOIN tbl_test tt ON g.test_id = tt.test_id WHERE g.trainee_id = t.trainee_id AND g.qualification_id = ? AND tt.activity_type_id = 1) as quizzes,
                                 (SELECT AVG(g.score) FROM tbl_grades g JOIN tbl_test tt ON g.test_id = tt.test_id WHERE g.trainee_id = t.trainee_id AND g.qualification_id = ? AND tt.activity_type_id = 2) as task_sheets,
                                 (SELECT AVG(g.score) FROM tbl_grades g WHERE g.trainee_id = t.trainee_id AND g.qualification_id = ?) as total_grade,
                                 (CASE WHEN (SELECT AVG(g.score) FROM tbl_grades g WHERE g.trainee_id = t.trainee_id AND g.qualification_id = ?) >= 80 THEN 'Competent' ELSE 'Not Yet Competent' END) as remarks
                          FROM tbl_enrollment e
                          JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
                          WHERE e.batch_id = ? AND e.status = 'approved'
                          ORDER BY t.last_name ASC";
                $stmt = $this->conn->prepare($query);
                $stmt->execute([$qualificationId, $qualificationId, $qualificationId, $qualificationId, $qualificationId, $qualificationId, $qualificationId, $batchId]);
            }
            
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data, 'qualification_id' => $qualificationId]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function saveGrades() {
        $data = json_decode(file_get_contents('php://input'), true);
        $qualificationId = $data['qualification_id'] ?? null;
        $day = $data['day'] ?? null;
        $grades = $data['grades'] ?? [];

        if (!$qualificationId || empty($grades)) {
            echo json_encode(['success' => false, 'message' => 'Missing data']);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Prepare statements for Daily Update
            // We need to find/create lesson and test records first if they don't exist
            if ($day) {
                // 1. Ensure Lesson Exists
                // Find module for course (take first one or create default)
                $modStmt = $this->conn->prepare("SELECT module_id FROM tbl_module WHERE qualification_id = ? LIMIT 1");
                $modStmt->execute([$qualificationId]);
                $moduleId = $modStmt->fetchColumn();
                if (!$moduleId) {
                    $this->conn->prepare("INSERT INTO tbl_module (qualification_id, module_title) VALUES (?, 'Default Module')")->execute([$qualificationId]);
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
                $upsertStmt = $this->conn->prepare("
                    INSERT INTO tbl_grades (trainee_id, qualification_id, test_id, score, date_recorded) 
                    VALUES (?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE score = VALUES(score), date_recorded = NOW()
                ");
            } else {
                 // Prepare statements for Summary Update
                 // This part needs to be re-evaluated. Saving summary grades directly is not ideal with the new structure.
                 // For now, we will focus on saving daily grades which is the primary input.
                 // The summary view is now read-only and calculated.
            }

            if ($day) {
                foreach ($grades as $g) {
                    $traineeId = $g['trainee_id'];

                    // Save Daily Grades (Quiz)
                    if (isset($g['quiz_score']) && $g['quiz_score'] !== '') {
                        $upsertStmt->execute([$traineeId, $qualificationId, $quizTestId, $g['quiz_score']]);
                    }

                    // Save Daily Grades (Practical)
                    if (isset($g['practical_score']) && $g['practical_score'] !== '') {
                        $upsertStmt->execute([$traineeId, $qualificationId, $practicalTestId, $g['practical_score']]);
                    }
                }
            } else {
                // Logic for saving summary grades is removed as it's now a calculated view.
                // If you need to save pre-test/post-test, they should be treated like daily entries
                // with a specific test_id.
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