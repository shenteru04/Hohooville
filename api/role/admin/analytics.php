<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
require_once '../../database/db.php';

class Analytics {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        switch ($action) {
            case 'overview': $this->getOverview(); break;
            case 'completion-rates': $this->getCompletionRates(); break;
            case 'module-performance': $this->getModulePerformance(); break;
            case 'enrollment-trends': $this->getEnrollmentTrends(); break;
            case 'dropout-analysis': $this->getDropoutAnalysis(); break;
            case 'trainer-performance': $this->getTrainerPerformance(); break;
            case 'demographic-analysis': $this->getDemographics(); break;
            default: echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
    }

    private function getOverview() {
        // Total Trainees
        $stmt = $this->conn->query("SELECT COUNT(*) as count FROM tbl_trainee_hdr WHERE status = 'active'");
        $totalTrainees = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

        // Completed Trainees (from tbl_training)
        $stmt = $this->conn->query("SELECT COUNT(*) as count FROM tbl_training WHERE status = 'completed'");
        $completed = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

        // Pass Rate (from tbl_grades)
        $stmt = $this->conn->query("SELECT
                ROUND(100 * SUM(CASE WHEN score >= 80 THEN 1 ELSE 0 END) / NULLIF(COUNT(score), 0), 2) as pass_rate
            FROM tbl_grades");
        $avgScore = round($stmt->fetch(PDO::FETCH_ASSOC)['pass_rate'] ?? 0, 2);

        // Active Batches
        $stmt = $this->conn->query("SELECT COUNT(*) as count FROM tbl_batch WHERE status = 'open'");
        $activeBatches = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

        echo json_encode(['success' => true, 'data' => [
            'total_trainees' => $totalTrainees,
            'completed_trainees' => $completed,
            'average_pass_rate' => $avgScore,
            'active_batches' => $activeBatches
        ]]);
    }

    private function getCompletionRates() {
        // Completion by Qualification
        $query = "SELECT q.qualification_name, 
                  (SELECT COUNT(*) FROM tbl_training t WHERE t.qualification_id = q.qualification_id AND t.status = 'completed') as completed_count,
                  (SELECT COUNT(*) FROM tbl_training t WHERE t.qualification_id = q.qualification_id) as total_count
                  FROM tbl_qualifications q";
        $stmt = $this->conn->query($query);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $result = [];
        foreach($data as $row) {
            $rate = $row['total_count'] > 0 ? round(($row['completed_count'] / $row['total_count']) * 100, 2) : 0;
            $result[] = [
                'qualification_name' => $row['qualification_name'],
                'completion_rate' => $rate
            ];
        }
        echo json_encode(['success' => true, 'data' => $result]);
    }

    private function getEnrollmentTrends() {
        // Last 12 months enrollment by status
        $query = "SELECT DATE_FORMAT(enrollment_date, '%Y-%m') as month,
                         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                  FROM tbl_enrollment 
                  WHERE enrollment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                  GROUP BY month ORDER BY month ASC";
        $stmt = $this->conn->query($query);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data]);
    }

    private function getDemographics() {
        // Gender
        $stmt = $this->conn->query("SELECT sex, COUNT(*) as count FROM tbl_trainee_hdr GROUP BY sex");
        $gender = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Batches
        $stmt = $this->conn->query("SELECT b.batch_name, COUNT(e.enrollment_id) as trainee_count 
                                    FROM tbl_batch b 
                                    LEFT JOIN tbl_enrollment e ON b.batch_id = e.batch_id 
                                    GROUP BY b.batch_id");
        $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => ['gender' => $gender, 'batches' => $batches]]);
    }

    private function getModulePerformance() {
        $query = "SELECT m.module_id,
                         m.module_title,
                         ROUND(AVG(g.score), 2) as avg_score,
                         ROUND(100 * SUM(CASE WHEN g.score >= 80 THEN 1 ELSE 0 END) / NULLIF(COUNT(g.score), 0), 2) as competency_rate
                  FROM tbl_module m
                  LEFT JOIN tbl_lessons l ON l.module_id = m.module_id
                  LEFT JOIN tbl_test t ON t.lesson_id = l.lesson_id
                  LEFT JOIN tbl_grades g ON g.test_id = t.test_id
                  GROUP BY m.module_id
                  ORDER BY competency_rate DESC, m.module_title ASC";
        $stmt = $this->conn->query($query);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    }

    private function getDropoutAnalysis() {
        $query = "SELECT DATE_FORMAT(COALESCE(t.end_date, t.start_date), '%Y-%m') as month,
                         COUNT(*) as enrolled,
                         SUM(CASE WHEN t.status = 'dropped' THEN 1 ELSE 0 END) as dropped,
                         SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed
                  FROM tbl_training t
                  WHERE COALESCE(t.start_date, t.end_date) >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                  GROUP BY month
                  ORDER BY month ASC";
        $stmt = $this->conn->query($query);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $data = array_map(function($row) {
            $enrolled = (int)($row['enrolled'] ?? 0);
            $dropped = (int)($row['dropped'] ?? 0);
            $completed = (int)($row['completed'] ?? 0);
            $rate = $enrolled > 0 ? round(($dropped / $enrolled) * 100, 2) : 0;
            return [
                'month' => $row['month'],
                'enrolled' => $enrolled,
                'dropout_rate' => $rate,
                'completed' => $completed
            ];
        }, $rows);

        echo json_encode(['success' => true, 'data' => $data]);
    }

    private function getTrainerPerformance() {
        $query = "SELECT tr.trainer_id,
                         CONCAT(tr.first_name, ' ', tr.last_name) as trainer_name,
                         COUNT(DISTINCT t.trainee_id) as total_trainees,
                         ROUND(AVG(g.score), 2) as avg_trainee_score,
                         ROUND(100 * SUM(CASE WHEN g.score >= 80 THEN 1 ELSE 0 END) / NULLIF(COUNT(g.score), 0), 2) as competency_rate
                  FROM tbl_trainer tr
                  LEFT JOIN tbl_training t ON t.trainer_id = tr.trainer_id
                  LEFT JOIN tbl_grades g ON g.trainee_id = t.trainee_id
                  GROUP BY tr.trainer_id
                  ORDER BY total_trainees DESC, avg_trainee_score DESC";
        $stmt = $this->conn->query($query);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    }
}

$database = new Database();
$db = $database->getConnection();
$analytics = new Analytics($db);
$analytics->handleRequest();
?>
