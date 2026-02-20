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
            case 'enrollment-trends': $this->getEnrollmentTrends(); break;
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

        // Average Pass Rate (from tbl_grades)
        $stmt = $this->conn->query("SELECT AVG(score) as avg_score FROM tbl_grades");
        $avgScore = round($stmt->fetch(PDO::FETCH_ASSOC)['avg_score'] ?? 0, 2);

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
        // Last 6 months enrollment
        $query = "SELECT DATE_FORMAT(enrollment_date, '%Y-%m') as month, COUNT(*) as count 
                  FROM tbl_enrollment 
                  WHERE enrollment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                  GROUP BY month ORDER BY month ASC";
        $stmt = $this->conn->query($query);
        $raw = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $labels = [];
        $approved = [];
        $pending = [];
        $completed = []; // Placeholder as enrollment table doesn't track completion date directly in schema

        foreach($raw as $r) {
            $labels[] = $r['month'];
            $approved[] = $r['count']; // Simplified for demo
            $pending[] = 0;
            $completed[] = 0;
        }

        echo json_encode(['success' => true, 'data' => [
            'month' => $labels,
            'approved' => $approved,
            'pending' => $pending,
            'completed' => $completed
        ]]);
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
}

$database = new Database();
$db = $database->getConnection();
$analytics = new Analytics($db);
$analytics->handleRequest();
?>