<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';

class MyGrades {
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
            // Fetch Grades Header and Details
            $query = "SELECT c.course_name, gh.pre_test, gh.post_test, gh.activities, gh.quizzes, gh.task_sheets, gh.total_grade, gh.remarks, gh.date_recorded
                      FROM tbl_grades_hdr gh
                      JOIN tbl_course c ON gh.course_id = c.course_id
                      WHERE gh.trainee_id = ?
                      ORDER BY gh.date_recorded DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$traineeId]);
            $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $grades]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new MyGrades($db);
$api->handleRequest();
?>