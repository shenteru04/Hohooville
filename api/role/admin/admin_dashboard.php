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

class AdminDashboard {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';
        try {
            switch($action) {
                case 'statistics':
                    $this->getStatistics();
                    break;
                case 'financial-summary':
                    $this->getFinancialSummary();
                    break;
                case 'enrollment-stats':
                    $this->getEnrollmentStats();
                    break;
                case 'attendance-overview':
                    $this->getAttendanceOverview();
                    break;
                case 'competency-results':
                    $this->getCompetencyResults();
                    break;
                case 'recent-activities':
                    $this->getRecentActivities();
                    break;
                default:
                    $this->sendResponse(400, false, 'Invalid action');
            }
        } catch (Exception $e) {
            $this->sendResponse(500, false, 'An error occurred: ' . $e->getMessage());
        }
    }

    private function getStatistics() {
        $stats = [];
        $stats['total_enrolled'] = $this->conn->query("SELECT COUNT(*) FROM tbl_enrollment WHERE status = 'approved'")->fetchColumn();
        $stats['active_qualifications'] = $this->conn->query("SELECT COUNT(*) FROM tbl_course WHERE status = 'active'")->fetchColumn();
        $stats['trainer_count'] = $this->conn->query("SELECT COUNT(*) FROM tbl_trainer")->fetchColumn();
        $stats['scheduled_trainings'] = $this->conn->query("SELECT COUNT(*) FROM tbl_batch WHERE status = 'open'")->fetchColumn();
        $stats['pending_enrollments'] = $this->conn->query("SELECT COUNT(*) FROM tbl_enrollment WHERE status = 'pending'")->fetchColumn();
        $stats['completed_this_year'] = $this->conn->query("SELECT COUNT(DISTINCT gh.trainee_id) FROM tbl_grades_hdr gh JOIN tbl_enrollment e ON gh.trainee_id = e.trainee_id JOIN tbl_batch b ON e.batch_id = b.batch_id WHERE gh.remarks = 'Competent' AND YEAR(b.end_date) = YEAR(CURDATE())")->fetchColumn() ?: 0;
        
        $this->sendResponse(200, true, 'Statistics loaded', $stats);
    }

    private function getFinancialSummary() {
        $summary = [];
        $summary['total_collected'] = $this->conn->query("SELECT SUM(amount) FROM tbl_payments")->fetchColumn() ?: 0;
        
        $totalCost = $this->conn->query("SELECT SUM(c.training_cost) FROM tbl_enrollment e JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id JOIN tbl_course c ON oc.course_id = c.course_id WHERE e.scholarship_type IS NULL OR e.scholarship_type = ''")->fetchColumn() ?: 0;
        $summary['total_pending'] = max(0, $totalCost - $summary['total_collected']);

        $summary['scholarship_distribution'] = $this->conn->query("SELECT scholarship_type, COUNT(*) as count FROM tbl_enrollment WHERE scholarship_type IS NOT NULL AND scholarship_type != '' GROUP BY scholarship_type")->fetchAll(PDO::FETCH_ASSOC);
        
        $summary['monthly_revenue'] = $this->conn->query("SELECT DATE_FORMAT(payment_date, '%b %Y') as month, SUM(amount) as revenue FROM tbl_payments WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(payment_date, '%Y-%m') ORDER BY DATE_FORMAT(payment_date, '%Y-%m') ASC")->fetchAll(PDO::FETCH_ASSOC);

        $this->sendResponse(200, true, 'Financial summary loaded', $summary);
    }

    private function getEnrollmentStats() {
        $stats = [];
        $stats['by_qualification'] = $this->conn->query("SELECT c.course_name as title, COUNT(e.enrollment_id) as count FROM tbl_enrollment e JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id JOIN tbl_course c ON oc.course_id = c.course_id WHERE e.status = 'approved' GROUP BY c.course_id")->fetchAll(PDO::FETCH_ASSOC);
        
        $stats['monthly_trend'] = $this->conn->query("SELECT DATE_FORMAT(enrollment_date, '%b %Y') as month, COUNT(*) as count FROM tbl_enrollment WHERE enrollment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) GROUP BY DATE_FORMAT(enrollment_date, '%Y-%m') ORDER BY DATE_FORMAT(enrollment_date, '%Y-%m') ASC")->fetchAll(PDO::FETCH_ASSOC);
        
        $stats['by_batch'] = $this->conn->query("SELECT b.batch_name, b.status, COUNT(e.trainee_id) as trainee_count FROM tbl_batch b LEFT JOIN tbl_enrollment e ON b.batch_id = e.batch_id AND e.status = 'approved' GROUP BY b.batch_id ORDER BY b.batch_id DESC")->fetchAll(PDO::FETCH_ASSOC);

        $this->sendResponse(200, true, 'Enrollment stats loaded', $stats);
    }

    private function getAttendanceOverview() {
        $overview = [];
        
        $totalRecords = $this->conn->query("SELECT COUNT(*) FROM tbl_attendance_dtl")->fetchColumn();
        if ($totalRecords > 0) {
            $presentRecords = $this->conn->query("SELECT COUNT(*) FROM tbl_attendance_dtl WHERE status IN ('present', 'late')")->fetchColumn();
            $overview['overall']['attendance_rate'] = ($presentRecords / $totalRecords) * 100;
        } else {
            $overview['overall']['attendance_rate'] = 0;
        }

        $overview['daily_trend'] = $this->conn->query("SELECT DATE_FORMAT(date, '%Y-%m-%d') as date, (SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) / COUNT(*)) * 100 as rate FROM tbl_attendance_dtl WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY date ORDER BY date ASC")->fetchAll(PDO::FETCH_ASSOC);
        
        $overview['by_batch'] = $this->conn->query("SELECT b.batch_name as batch_code, COUNT(ad.attendance_dtl_id) as total_records, SUM(CASE WHEN ad.status IN ('present', 'late') THEN 1 ELSE 0 END) as present, (SUM(CASE WHEN ad.status IN ('present', 'late') THEN 1 ELSE 0 END) / COUNT(ad.attendance_dtl_id)) * 100 as rate FROM tbl_attendance_dtl ad JOIN tbl_enrollment e ON ad.trainee_id = e.trainee_id JOIN tbl_batch b ON e.batch_id = b.batch_id GROUP BY b.batch_id")->fetchAll(PDO::FETCH_ASSOC);

        $this->sendResponse(200, true, 'Attendance overview loaded', $overview);
    }

    private function getCompetencyResults() {
        $results = [];
        $results['overview']['labels'] = $this->conn->query("SELECT c.course_name FROM tbl_grades_hdr gh JOIN tbl_course c ON gh.course_id = c.course_id GROUP BY gh.course_id")->fetchAll(PDO::FETCH_COLUMN);
        $results['overview']['scores'] = $this->conn->query("SELECT AVG(gh.total_grade) FROM tbl_grades_hdr gh JOIN tbl_course c ON gh.course_id = c.course_id GROUP BY gh.course_id")->fetchAll(PDO::FETCH_COLUMN);

        $this->sendResponse(200, true, 'Competency results loaded', $results);
    }

    private function getRecentActivities() {
        try {
            $query = "SELECT 
                        al.action, 
                        al.created_at,
                        COALESCE(t.first_name, tr.first_name, 'Admin') as first_name,
                        COALESCE(t.last_name, tr.last_name, 'User') as last_name
                      FROM tbl_activity_logs al
                      LEFT JOIN tbl_users u ON al.user_id = u.user_id
                      LEFT JOIN tbl_trainee_hdr t ON u.user_id = t.user_id
                      LEFT JOIN tbl_trainer tr ON u.user_id = tr.user_id
                      ORDER BY al.created_at DESC LIMIT 10";
            
            $stmt = $this->conn->query($query);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->sendResponse(200, true, 'Recent activities loaded', $data);
        } catch (Exception $e) {
            // Return empty array if table doesn't exist yet
            $this->sendResponse(200, true, 'No activities found', []);
        }
    }

    private function sendResponse($statusCode, $success, $message, $data = null) {
        http_response_code($statusCode);
        $response = ['success' => $success, 'message' => $message];
        if ($data !== null) {
            $response['data'] = $data;
        }
        echo json_encode($response);
    }
}

$database = new Database();
$db = $database->getConnection();
$dashboard = new AdminDashboard($db);
$dashboard->handleRequest();
?>