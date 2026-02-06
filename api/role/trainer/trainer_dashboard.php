<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

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
            echo json_encode(['success' => false, 'message' => 'Trainer ID is required']);
            return;
        }

        try {
            switch ($action) {
                case 'statistics':
                    $this->getStatistics($trainerId);
                    break;
                case 'module_performance':
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
            echo json_encode(['success' => false, 'message' => 'Server Error: ' . $e->getMessage()]);
        }
    }

    private function getStatistics($trainerId) {
        // 1. Total Trainees (Active/Enrolled in trainer's batches)
        $stmt = $this->conn->prepare("
            SELECT COUNT(DISTINCT e.trainee_id) 
            FROM tbl_enrollment e
            JOIN tbl_batch b ON e.batch_id = b.batch_id
            WHERE b.trainer_id = ? AND e.status = 'approved'
        ");
        $stmt->execute([$trainerId]);
        $totalTrainees = $stmt->fetchColumn();

        // 2. Active Batches
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM tbl_batch WHERE trainer_id = ? AND status = 'open'");
        $stmt->execute([$trainerId]);
        $activeBatches = $stmt->fetchColumn();

        // 3. Average Attendance Rate
        // Using the new tbl_attendance table
        $stmt = $this->conn->prepare("
            SELECT 
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                COUNT(*) as total_count
            FROM tbl_attendance a
            JOIN tbl_batch b ON a.batch_id = b.batch_id
            WHERE b.trainer_id = ?
        ");
        $stmt->execute([$trainerId]);
        $attData = $stmt->fetch(PDO::FETCH_ASSOC);
        $avgAttendance = ($attData['total_count'] > 0) ? round(($attData['present_count'] / $attData['total_count']) * 100, 1) : 0;

        // 4. Pass Rate (Competent vs Total Graded Items)
        // Using tbl_grades. Score >= 80 is competent.
        $stmt = $this->conn->prepare("
            SELECT 
                SUM(CASE WHEN g.score >= 80 THEN 1 ELSE 0 END) as passed_count,
                COUNT(*) as total_count
            FROM tbl_grades g
            JOIN tbl_enrollment e ON g.trainee_id = e.trainee_id
            JOIN tbl_batch b ON e.batch_id = b.batch_id
            WHERE b.trainer_id = ? AND g.qualification_id = b.qualification_id AND e.status = 'approved'
        ");
        $stmt->execute([$trainerId]);
        $gradeData = $stmt->fetch(PDO::FETCH_ASSOC);
        $passRate = ($gradeData['total_count'] > 0) ? round(($gradeData['passed_count'] / $gradeData['total_count']) * 100, 1) : 0;

        echo json_encode(['success' => true, 'data' => [
            'total_trainees' => $totalTrainees,
            'active_batches' => $activeBatches,
            'avg_attendance' => $avgAttendance,
            'pass_rate' => $passRate
        ]]);
    }

    private function getModulePerformance($trainerId) {
        // Average score per module for this trainer's batches
        // tbl_grades -> tbl_test -> tbl_lessons -> tbl_module
        $stmt = $this->conn->prepare("
            SELECT m.module_title, AVG(g.score) as avg_score
            FROM tbl_grades g
            JOIN tbl_test t ON g.test_id = t.test_id
            JOIN tbl_lessons l ON t.lesson_id = l.lesson_id
            JOIN tbl_module m ON l.module_id = m.module_id
            JOIN tbl_enrollment e ON g.trainee_id = e.trainee_id
            JOIN tbl_batch b ON e.batch_id = b.batch_id
            WHERE b.trainer_id = ? AND g.qualification_id = b.qualification_id AND e.status = 'approved'
            GROUP BY m.module_id, m.module_title
            LIMIT 5
        ");
        $stmt->execute([$trainerId]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format for Chart.js
        $labels = [];
        $scores = [];
        foreach ($data as $row) {
            $labels[] = $row['module_title'];
            $scores[] = round($row['avg_score'], 1);
        }

        echo json_encode(['success' => true, 'data' => [
            'labels' => $labels,
            'scores' => $scores
        ]]);
    }

    private function getSchedule($trainerId) {
        // Get active batches and their schedules
        $stmt = $this->conn->prepare("
            SELECT b.batch_id, b.batch_name, c.course_name, b.start_date, b.end_date,
                   MAX(oc.schedule) as schedule, MAX(oc.room) as room
            FROM tbl_batch b
            JOIN tbl_qualifications c ON b.qualification_id = c.qualification_id
            LEFT JOIN tbl_enrollment e ON b.batch_id = e.batch_id
            LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
            WHERE b.trainer_id = ? AND b.status = 'open'
            GROUP BY b.batch_id
            ORDER BY b.start_date ASC
        ");
        $stmt->execute([$trainerId]);
        $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $batches]);
    }
}

$database = new Database();
$db = $database->getConnection();
$dashboard = new TrainerDashboard($db);
$dashboard->handleRequest();
?>