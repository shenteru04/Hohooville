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
        $action = $_GET['action'] ?? '';
        $trainerId = $_GET['trainer_id'] ?? null;

        if (!$trainerId) {
            echo json_encode(['success' => false, 'message' => 'Trainer ID required']);
            return;
        }

        try {
            switch ($action) {
                case 'dashboard':
                    $this->getDashboardData($trainerId);
                    break;
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
                    echo json_encode(['success' => false, 'message' => 'Invalid action']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function getDashboardData($trainerId) {
        $stats = $this->getStatisticsData($trainerId);
        $schedule = $this->getScheduleData($trainerId);
        
        echo json_encode(['success' => true, 'data' => array_merge($stats, ['schedule' => $schedule])]);
    }

    private function getStatistics($trainerId) {
        // Active Batches
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM tbl_batch WHERE trainer_id = ? AND status = 'open'");
        $stmt->execute([$trainerId]);
        $activeBatches = $stmt->fetchColumn();

        // Total Trainees (in active/completed batches assigned to trainer)
        $stmt = $this->conn->prepare("SELECT COUNT(DISTINCT e.trainee_id) FROM tbl_enrollment e JOIN tbl_batch b ON e.batch_id = b.batch_id WHERE b.trainer_id = ? AND e.status = 'approved'");
        $stmt->execute([$trainerId]);
        $totalTrainees = $stmt->fetchColumn();

        // Competency (Mock logic or based on grades)
        // Assuming 80% average is competent
        $stmt = $this->conn->prepare("
            SELECT 
                SUM(CASE WHEN avg_score >= 80 THEN 1 ELSE 0 END) as competent,
                SUM(CASE WHEN avg_score < 80 THEN 1 ELSE 0 END) as nyc
            FROM (
                SELECT AVG(g.score) as avg_score
                FROM tbl_grades g
                JOIN tbl_enrollment e ON g.trainee_id = e.trainee_id
                JOIN tbl_batch b ON e.batch_id = b.batch_id
                WHERE b.trainer_id = ?
                GROUP BY g.trainee_id
            ) as scores
        ");
        $stmt->execute([$trainerId]);
        $competency = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $this->getStatisticsData($trainerId)]);
    }

    private function getStatisticsData($trainerId) {
        // Helper to get raw data for dashboard aggregation
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM tbl_batch WHERE trainer_id = ? AND status = 'open'");
        $stmt->execute([$trainerId]);
        $activeBatches = $stmt->fetchColumn();

        $stmt = $this->conn->prepare("SELECT COUNT(DISTINCT e.trainee_id) FROM tbl_enrollment e JOIN tbl_batch b ON e.batch_id = b.batch_id WHERE b.trainer_id = ? AND e.status = 'approved'");
        $stmt->execute([$trainerId]);
        $totalTrainees = $stmt->fetchColumn();

        $stmt = $this->conn->prepare("
            SELECT 
                SUM(CASE WHEN avg_score >= 80 THEN 1 ELSE 0 END) as competent,
                SUM(CASE WHEN avg_score < 80 THEN 1 ELSE 0 END) as nyc
            FROM (
                SELECT AVG(g.score) as avg_score
                FROM tbl_grades g
                JOIN tbl_enrollment e ON g.trainee_id = e.trainee_id
                JOIN tbl_batch b ON e.batch_id = b.batch_id
                WHERE b.trainer_id = ?
                GROUP BY g.trainee_id
            ) as scores
        ");
        $stmt->execute([$trainerId]);
        $competency = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'active_batches' => $activeBatches,
            'total_trainees' => $totalTrainees,
            'competent' => $competency['competent'] ?? 0,
            'nyc' => $competency['nyc'] ?? 0
        ];
    }

    private function getModulePerformance($trainerId) {
        // Average score per module for this trainer's trainees
        $query = "
            SELECT m.module_title, AVG(g.score) as avg_score
            FROM tbl_grades g
            JOIN tbl_test t ON g.test_id = t.test_id
            JOIN tbl_lessons l ON t.lesson_id = l.lesson_id
            JOIN tbl_module m ON l.module_id = m.module_id
            JOIN tbl_enrollment e ON g.trainee_id = e.trainee_id
            JOIN tbl_batch b ON e.batch_id = b.batch_id
            WHERE b.trainer_id = ?
            GROUP BY m.module_id
        ";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$trainerId]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data]);
    }

    private function getSchedule($trainerId) {
        echo json_encode(['success' => true, 'data' => $this->getScheduleData($trainerId)]);
    }

    private function getScheduleData($trainerId) {
        $query = "
            SELECT 
                b.batch_id,
                b.batch_name, 
                q.qualification_name as course_name, 
                s.schedule, 
                s.room
            FROM tbl_batch b
            LEFT JOIN tbl_qualifications q ON b.qualification_id = q.qualification_id
            LEFT JOIN tbl_schedule s ON b.batch_id = s.batch_id
            WHERE b.trainer_id = ? AND b.status = 'open'
            GROUP BY b.batch_id
        ";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$trainerId]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $data;
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TrainerDashboard($db);
$api->handleRequest();
?>