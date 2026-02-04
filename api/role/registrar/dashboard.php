<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

        switch($action) {
            case 'dashboard-data':
                $this->getDashboardData();
                break;
            default:
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
    }

    private function getDashboardData() {
        try {
            $stats = [];
            
            // 1. Statistics Cards
            $stats['total_trainees'] = $this->conn->query("SELECT COUNT(*) FROM tbl_trainee WHERE status = 'active'")->fetchColumn();
            $stats['pending_enrollments'] = $this->conn->query("SELECT COUNT(*) FROM tbl_enrollment WHERE status = 'pending'")->fetchColumn();
            $stats['active_batches'] = $this->conn->query("SELECT COUNT(*) FROM tbl_batch WHERE status = 'open'")->fetchColumn();
            $stats['total_courses'] = $this->conn->query("SELECT COUNT(*) FROM tbl_course WHERE status = 'active'")->fetchColumn();

            // 2. Charts Data
            $charts = [];
            
            // Enrollment by Course
            $stmtCourse = $this->conn->query("
                SELECT c.course_name, COUNT(e.enrollment_id) as count 
                FROM tbl_enrollment e
                JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id
                JOIN tbl_course c ON oc.course_id = c.course_id
                WHERE e.status = 'approved'
                GROUP BY c.course_id
                LIMIT 10
            ");
            $courseData = $stmtCourse->fetchAll(PDO::FETCH_ASSOC);
            $charts['by_course'] = [
                'labels' => array_column($courseData, 'course_name'),
                'data' => array_column($courseData, 'count')
            ];

            // Monthly Trend (Last 6 Months)
            $stmtTrend = $this->conn->query("
                SELECT DATE_FORMAT(enrollment_date, '%b %Y') as month, COUNT(*) as count 
                FROM tbl_enrollment 
                WHERE enrollment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(enrollment_date, '%Y-%m')
                ORDER BY enrollment_date ASC
            ");
            $trendData = $stmtTrend->fetchAll(PDO::FETCH_ASSOC);
            $charts['trend'] = [
                'labels' => array_column($trendData, 'month'),
                'data' => array_column($trendData, 'count')
            ];

            // 3. Recent Enrollments
            $stmtRecent = $this->conn->query("
                SELECT t.first_name, t.last_name, c.course_name, b.batch_name, e.enrollment_date, e.status
                FROM tbl_enrollment e
                JOIN tbl_trainee t ON e.trainee_id = t.trainee_id
                JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id
                JOIN tbl_course c ON oc.course_id = c.course_id
                LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                ORDER BY e.enrollment_date DESC
                LIMIT 5
            ");
            $recentEnrollments = $stmtRecent->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true, 
                'data' => [
                    'stats' => $stats,
                    'charts' => $charts,
                    'recent_enrollments' => $recentEnrollments
                ]
            ]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new RegistrarDashboard($db);
$api->handleRequest();
?>