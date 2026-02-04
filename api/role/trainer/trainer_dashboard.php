<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

class TrainerDashboard {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        $trainerId = isset($_GET['trainer_id']) ? $_GET['trainer_id'] : null;

        if (!$trainerId) {
            // In a real app, extract from token. For now, require it.
            // Fallback for demo if not provided:
            // $this->sendResponse(400, false, 'Trainer ID is required');
        }

        switch($action) {
            case 'statistics':
                $this->getStatistics($trainerId);
                break;
            case 'module-performance':
                $this->getModulePerformance($trainerId);
                break;
            case 'schedule':
                $this->getSchedule($trainerId);
                break;
            default:
                $this->sendResponse(400, false, 'Invalid action');
        }
    }

    private function getStatistics($trainerId) {
        try {
            // Active Batches (assigned to trainer)
            $query1 = "SELECT COUNT(DISTINCT e.batch_id) as total 
                      FROM tbl_offered_courses oc 
                      JOIN tbl_enrollment e ON oc.offered_id = e.offered_id 
                      WHERE oc.trainer_id = ? AND e.status = 'approved'";
            $stmt1 = $this->conn->prepare($query1);
            $stmt1->execute([$trainerId]);
            $activeBatches = $stmt1->fetch(PDO::FETCH_ASSOC)['total'];

            // Total Trainees
            $query2 = "SELECT COUNT(DISTINCT e.trainee_id) as total 
                      FROM tbl_offered_courses oc 
                      JOIN tbl_enrollment e ON oc.offered_id = e.offered_id 
                      WHERE oc.trainer_id = ? AND e.status = 'approved'";
            $stmt2 = $this->conn->prepare($query2);
            $stmt2->execute([$trainerId]);
            $totalTrainees = $stmt2->fetch(PDO::FETCH_ASSOC)['total'];

            // Competency Status (Based on Grades Header)
            // Assuming >= 80 is Competent, < 80 is Needs Improvement
            $query3 = "SELECT 
                        SUM(CASE WHEN gh.total_grade >= 80 THEN 1 ELSE 0 END) as competent,
                        SUM(CASE WHEN gh.total_grade < 80 THEN 1 ELSE 0 END) as nyc
                      FROM tbl_grades_hdr gh
                      JOIN tbl_offered_courses oc ON gh.course_id = oc.course_id
                      WHERE oc.trainer_id = ?";
            $stmt3 = $this->conn->prepare($query3);
            $stmt3->execute([$trainerId]);
            $competency = $stmt3->fetch(PDO::FETCH_ASSOC);

            $data = [
                'active_batches' => $activeBatches,
                'total_trainees' => $totalTrainees,
                'competent' => $competency['competent'] ?? 0,
                'nyc' => $competency['nyc'] ?? 0
            ];

            $this->sendResponse(200, true, 'Statistics retrieved', $data);
        } catch (Exception $e) {
            $this->sendResponse(500, false, 'Error: ' . $e->getMessage());
        }
    }

    private function getModulePerformance($trainerId) {
        try {
            // Average score per module for courses taught by this trainer
            $query = "SELECT m.module_title, AVG(gd.score) as avg_score
                     FROM tbl_grades_dtl gd
                     JOIN tbl_test t ON gd.test_id = t.test_id
                     JOIN tbl_lessons l ON t.lesson_id = l.lesson_id
                     JOIN tbl_module m ON l.module_id = m.module_id
                     JOIN tbl_offered_courses oc ON m.course_id = oc.course_id
                     WHERE oc.trainer_id = ?
                     GROUP BY m.module_id
                     LIMIT 10"; // Limit for chart readability
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$trainerId]);
            $modules = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse(200, true, 'Module performance retrieved', $modules);
        } catch (Exception $e) {
            $this->sendResponse(500, false, 'Error: ' . $e->getMessage());
        }
    }

    private function getSchedule($trainerId) {
        try {
            $query = "SELECT c.course_name, oc.schedule, oc.room, b.batch_name
                     FROM tbl_offered_courses oc
                     JOIN tbl_course c ON oc.course_id = c.course_id
                     LEFT JOIN tbl_enrollment e ON oc.offered_id = e.offered_id
                     LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                     WHERE oc.trainer_id = ?
                     GROUP BY oc.offered_id
                     ORDER BY b.batch_id DESC LIMIT 5";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$trainerId]);
            $schedule = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->sendResponse(200, true, 'Schedule retrieved', $schedule);
        } catch (Exception $e) {
            $this->sendResponse(500, false, 'Error: ' . $e->getMessage());
        }
    }

    private function sendResponse($statusCode, $success, $message, $data = null) {
        http_response_code($statusCode);
        $response = [
            'success' => $success,
            'message' => $message
        ];
        if ($data !== null) {
            $response['data'] = $data;
        }
        echo json_encode($response);
        exit();
    }
}

$database = new Database();
$db = $database->getConnection();

$dashboard = new TrainerDashboard($db);
$dashboard->handleRequest();
?>