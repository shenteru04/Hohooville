<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';

class MyTraining {
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
            // Get Active Course ID
            $stmt = $this->conn->prepare("SELECT oc.qualification_id, c.qualification_name AS course_name
                                          FROM tbl_enrollment e 
                                          JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id 
                                          JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                                          WHERE e.trainee_id = ? AND e.status = 'approved' LIMIT 1");
            $stmt->execute([$traineeId]);
            $course = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($course) {
                // Get Modules and Lessons
                $modStmt = $this->conn->prepare("SELECT m.module_id, m.module_title, l.lesson_id, l.lesson_title, l.file_path 
                                                 FROM tbl_module m 
                                                 LEFT JOIN tbl_lessons l ON m.module_id = l.module_id 
                                                 WHERE m.qualification_id = ? ORDER BY m.module_id, l.lesson_id");
                $modStmt->execute([$course['qualification_id']]);
                $data = $modStmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'course' => $course, 'modules' => $data]);
            } else {
                echo json_encode(['success' => false, 'message' => 'No active course found']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new MyTraining($db);
$api->handleRequest();
?>