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
            $query = "SELECT c.qualification_name as course_name, g.score, g.date_recorded
                      FROM tbl_grades g
                      JOIN tbl_qualifications c ON g.qualification_id = c.qualification_id
                      WHERE g.trainee_id = ?
                      ORDER BY g.date_recorded DESC";
            
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
