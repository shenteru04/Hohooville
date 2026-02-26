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

class RegistrarDashboard {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';

        if ($action === 'dashboard-data') {
            $this->getDashboardData();
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
    }

    private function getDashboardData() {
        try {
            $data = [
                'stats' => $this->getStats(),
                'charts' => $this->getCharts(),
                'recent_enrollments' => $this->getRecentEnrollments()
            ];
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function getStats() {
        $stats = [];
        
        // Total Trainees
        $stmt = $this->conn->query("SELECT COUNT(*) FROM tbl_trainee_hdr WHERE status = 'active'");
        $stats['total_trainees'] = $stmt->fetchColumn();

        // Pending Enrollments
        $stmt = $this->conn->query("SELECT COUNT(*) FROM tbl_enrollment WHERE status = 'pending'");
        $stats['pending_enrollments'] = $stmt->fetchColumn();

        // Active Batches
        $stmt = $this->conn->query("SELECT COUNT(*) FROM tbl_batch WHERE status = 'open'");
        $stats['active_batches'] = $stmt->fetchColumn();

        // Total Courses (Qualifications)
        $stmt = $this->conn->query("SELECT COUNT(*) FROM tbl_qualifications WHERE status = 'active'");
        $stats['total_courses'] = $stmt->fetchColumn();

        return $stats;
    }

    private function getCharts() {
        $charts = [];

        // Enrollment by Course (Qualification)
        // Fix: Use qualification_name instead of course_name
        $query = "SELECT c.qualification_name as label, COUNT(e.enrollment_id) as count 
                  FROM tbl_enrollment e 
                  JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                  JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id 
                  WHERE e.status = 'approved' 
                  GROUP BY c.qualification_id";
        $stmt = $this->conn->query($query);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $charts['by_course'] = [
            'labels' => array_column($results, 'label'),
            'data' => array_column($results, 'count')
        ];

        // Enrollment Trend
        $query = "SELECT DATE_FORMAT(enrollment_date, '%b %Y') as month, COUNT(*) as count 
                  FROM tbl_enrollment 
                  WHERE enrollment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) 
                  GROUP BY DATE_FORMAT(enrollment_date, '%Y-%m') 
                  ORDER BY enrollment_date ASC";
        $stmt = $this->conn->query($query);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $charts['trend'] = [
            'labels' => array_column($results, 'month'),
            'data' => array_column($results, 'count')
        ];

        return $charts;
    }

    private function getRecentEnrollments() {
        // Fix: Use qualification_name instead of course_name
        $query = "SELECT 
                    t.first_name, t.last_name, 
                    c.qualification_name as course_name, 
                    b.batch_name, 
                    e.enrollment_date, 
                    e.status 
                  FROM tbl_enrollment e 
                  JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id 
                  LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                  LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id 
                  LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id 
                  ORDER BY e.enrollment_date DESC 
                  LIMIT 10";
        $stmt = $this->conn->query($query);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new RegistrarDashboard($db);
$api->handleRequest();
?>
