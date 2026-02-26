<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../database/db.php';

class AdminDashboard {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        switch($action) {
            case 'statistics':
                $this->getStatistics();
                break;
            case 'enrollment-stats':
                $this->getEnrollmentStats();
                break;
            case 'financial-summary':
                $this->getFinancialSummary();
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
            case 'analytics-data':
                $this->getAnalyticsData();
                break;
            default:
                $this->sendResponse(400, false, 'Invalid action');
        }
    }

    private function getStatistics() {
        try {
            // Total enrolled trainees
            $query1 = "SELECT COUNT(*) as total FROM tbl_trainee_hdr WHERE status = 'active'";
            $stmt1 = $this->conn->prepare($query1);
            $stmt1->execute();
            $totalEnrolled = $stmt1->fetch(PDO::FETCH_ASSOC)['total'];

            // Active qualifications
            $query2 = "SELECT COUNT(*) as total FROM tbl_course WHERE status = 'active'";
            $stmt2 = $this->conn->prepare($query2);
            $stmt2->execute();
            $activeQualifications = $stmt2->fetch(PDO::FETCH_ASSOC)['total'];

            // Active trainers
            $query3 = "SELECT COUNT(*) as total FROM tbl_trainer WHERE status = 'active'";
            $stmt3 = $this->conn->prepare($query3);
            $stmt3->execute();
            $trainerCount = $stmt3->fetch(PDO::FETCH_ASSOC)['total'];

            // Scheduled trainings (active batches)
            $query4 = "SELECT COUNT(*) as total FROM tbl_batch WHERE status = 'open'";
            $stmt4 = $this->conn->prepare($query4);
            $stmt4->execute();
            $scheduledTrainings = $stmt4->fetch(PDO::FETCH_ASSOC)['total'];

            // Pending enrollments
            $query5 = "SELECT COUNT(*) as total FROM tbl_enrollment WHERE status = 'pending'";
            $stmt5 = $this->conn->prepare($query5);
            $stmt5->execute();
            $pendingEnrollments = $stmt5->fetch(PDO::FETCH_ASSOC)['total'];

            // Completed this year
            $query6 = "SELECT COUNT(*) as total FROM tbl_training WHERE status = 'completed' AND YEAR(end_date) = YEAR(CURDATE())";
            $stmt6 = $this->conn->prepare($query6);
            $stmt6->execute();
            $completedThisYear = $stmt6->fetch(PDO::FETCH_ASSOC)['total'];

            $data = [
                'total_enrolled' => $totalEnrolled,
                'active_qualifications' => $activeQualifications,
                'trainer_count' => $trainerCount,
                'scheduled_trainings' => $scheduledTrainings,
                'pending_enrollments' => $pendingEnrollments,
                'completed_this_year' => $completedThisYear
            ];

            $this->sendResponse(200, true, 'Statistics retrieved successfully', $data);
        } catch (Exception $e) {
            $this->sendResponse(500, false, 'Error retrieving statistics: ' . $e->getMessage());
        }
    }

    private function getEnrollmentStats() {
        try {
            // Enrollment by qualification
            $query1 = "SELECT c.course_name as title, COUNT(e.enrollment_id) as count 
                      FROM tbl_course c 
                      LEFT JOIN tbl_offered_courses oc ON c.course_id = oc.course_id 
                      LEFT JOIN tbl_enrollment e ON oc.offered_id = e.offered_id 
                      GROUP BY c.course_id, c.course_name";
            $stmt1 = $this->conn->prepare($query1);
            $stmt1->execute();
            $byQualification = $stmt1->fetchAll(PDO::FETCH_ASSOC);

            // Monthly trend (last 12 months)
            $query2 = "SELECT DATE_FORMAT(enrollment_date, '%M %Y') as month, COUNT(*) as count 
                      FROM tbl_enrollment 
                      WHERE enrollment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) 
                      GROUP BY YEAR(enrollment_date), MONTH(enrollment_date) 
                      ORDER BY enrollment_date";
            $stmt2 = $this->conn->prepare($query2);
            $stmt2->execute();
            $monthlyTrend = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            // By batch
            $query3 = "SELECT b.batch_name, b.batch_code, COUNT(et.trainee_id) as trainee_count, b.status, b.start_date, b.end_date 
                      FROM tbl_batch b 
                      LEFT JOIN tbl_enrollment e ON b.batch_id = e.batch_id 
                      LEFT JOIN tbl_enrolled_trainee et ON e.enrollment_id = et.enrollment_id 
                      GROUP BY b.batch_id";
            $stmt3 = $this->conn->prepare($query3);
            $stmt3->execute();
            $byBatch = $stmt3->fetchAll(PDO::FETCH_ASSOC);

            $data = [
                'by_qualification' => $byQualification,
                'monthly_trend' => $monthlyTrend,
                'by_batch' => $byBatch
            ];

            $this->sendResponse(200, true, 'Enrollment stats retrieved successfully', $data);
        } catch (Exception $e) {
            $this->sendResponse(500, false, 'Error retrieving enrollment stats: ' . $e->getMessage());
        }
    }

    private function getFinancialSummary() {
        try {
            // Total collected (assuming finance records are payments)
            $query1 = "SELECT SUM(amount) as total FROM tbl_finance_record WHERE payment_date IS NOT NULL";
            $stmt1 = $this->conn->prepare($query1);
            $stmt1->execute();
            $totalCollected = $stmt1->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

            // Total pending (enrollments without payment)
            $query2 = "SELECT COUNT(*) * 1000 as total FROM tbl_enrollment e 
                      LEFT JOIN tbl_finance_record f ON e.trainee_id = f.trainee_id 
                      WHERE f.finance_id IS NULL"; // Assuming 1000 per enrollment
            $stmt2 = $this->conn->prepare($query2);
            $stmt2->execute();
            $totalPending = $stmt2->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

            // Scholarship distribution
            $query3 = "SELECT st.scholarship_name as scholarship_type, COUNT(*) as count 
                      FROM tbl_scholarship s
                      LEFT JOIN tbl_scholarship_type st ON s.scholarship_type_id = st.scholarship_type_id
                      GROUP BY st.scholarship_name";
            $stmt3 = $this->conn->prepare($query3);
            $stmt3->execute();
            $scholarshipDistribution = $stmt3->fetchAll(PDO::FETCH_ASSOC);

            // Monthly revenue (last 6 months)
            $query4 = "SELECT DATE_FORMAT(payment_date, '%M %Y') as month, SUM(amount) as revenue 
                      FROM tbl_finance_record 
                      WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) 
                      GROUP BY YEAR(payment_date), MONTH(payment_date) 
                      ORDER BY payment_date";
            $stmt4 = $this->conn->prepare($query4);
            $stmt4->execute();
            $monthlyRevenue = $stmt4->fetchAll(PDO::FETCH_ASSOC);

            $data = [
                'total_collected' => $totalCollected,
                'total_pending' => $totalPending,
                'scholarship_distribution' => $scholarshipDistribution,
                'monthly_revenue' => $monthlyRevenue
            ];

            $this->sendResponse(200, true, 'Financial summary retrieved successfully', $data);
        } catch (Exception $e) {
            $this->sendResponse(500, false, 'Error retrieving financial summary: ' . $e->getMessage());
        }
    }

    private function getAttendanceOverview() {
        try {
            // Overall attendance rate
            $query1 = "SELECT AVG(CASE WHEN status = 'present' THEN 100 ELSE 0 END) as attendance_rate 
                      FROM tbl_attendance_dtl";
            $stmt1 = $this->conn->prepare($query1);
            $stmt1->execute();
            $overall = $stmt1->fetch(PDO::FETCH_ASSOC);

            // Daily trend (last 7 days)
            $query2 = "SELECT DATE_FORMAT(hdr.date_recorded, '%Y-%m-%d') as date, 
                      AVG(CASE WHEN dtl.status = 'present' THEN 100 ELSE 0 END) as rate 
                      FROM tbl_attendance_hdr hdr 
                      LEFT JOIN tbl_attendance_dtl dtl ON hdr.attendance_hdr_id = dtl.attendance_hdr_id 
                      WHERE hdr.date_recorded >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
                      GROUP BY hdr.date_recorded 
                      ORDER BY hdr.date_recorded";
            $stmt2 = $this->conn->prepare($query2);
            $stmt2->execute();
            $dailyTrend = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            // By batch
            $query3 = "SELECT b.batch_code, COUNT(dtl.attendance_dtl_id) as total_records, 
                      SUM(CASE WHEN dtl.status = 'present' THEN 1 ELSE 0 END) as present, 
                      AVG(CASE WHEN dtl.status = 'present' THEN 100 ELSE 0 END) as rate 
                      FROM tbl_batch b 
                      LEFT JOIN tbl_attendance_hdr hdr ON b.batch_id = hdr.batch_id 
                      LEFT JOIN tbl_attendance_dtl dtl ON hdr.attendance_hdr_id = dtl.attendance_hdr_id 
                      GROUP BY b.batch_id, b.batch_code";
            $stmt3 = $this->conn->prepare($query3);
            $stmt3->execute();
            $byBatch = $stmt3->fetchAll(PDO::FETCH_ASSOC);

            $data = [
                'overall' => $overall,
                'daily_trend' => $dailyTrend,
                'by_batch' => $byBatch
            ];

            $this->sendResponse(200, true, 'Attendance overview retrieved successfully', $data);
        } catch (Exception $e) {
            $this->sendResponse(500, false, 'Error retrieving attendance overview: ' . $e->getMessage());
        }
    }

    private function getCompetencyResults() {
        try {
            // Overall competency
            $query1 = "SELECT AVG(total_grade) as competency_rate, COUNT(*) as competent, 
                      (SELECT COUNT(*) FROM tbl_grades_hdr WHERE total_grade < 75) as nyc 
                      FROM tbl_grades_hdr WHERE total_grade >= 75";
            $stmt1 = $this->conn->prepare($query1);
            $stmt1->execute();
            $overall = $stmt1->fetch(PDO::FETCH_ASSOC);

            // By qualification
            $query2 = "SELECT c.course_name as title, AVG(gh.total_grade) as rate 
                      FROM tbl_course c 
                      LEFT JOIN tbl_grades_hdr gh ON c.course_id = gh.course_id 
                      GROUP BY c.course_id, c.course_name";
            $stmt2 = $this->conn->prepare($query2);
            $stmt2->execute();
            $byQualification = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            // Average scores
            /*$query3 = "SELECT AVG(basic_score) as avg_basic, AVG(common_score) as avg_common, 
                      AVG(core_score) as avg_core, AVG(pre_test) as avg_pre_test, 
                      AVG(post_test) as avg_post_test 
                      FROM tbl_grades_dtl";
            $stmt3 = $this->conn->prepare($query3);
            $stmt3->execute();
            $averageScores = $stmt3->fetch(PDO::FETCH_ASSOC);*/

            // Detailed results for the table
            $query3 = "SELECT 
                        t.trainee_school_id,
                        CONCAT(t.first_name, ' ', t.last_name) as trainee_name,
                        c.course_name as qualification_title,
                        b.batch_name as batch_code,
                        gh.date_recorded as assessment_date,
                        gh.total_grade as score
                      FROM tbl_grades_hdr gh
                      JOIN tbl_trainee_hdr t ON gh.trainee_id = t.trainee_id
                      JOIN tbl_course c ON gh.course_id = c.course_id
                      LEFT JOIN tbl_enrollment e ON t.trainee_id = e.trainee_id
                      LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                      ORDER BY gh.date_recorded DESC LIMIT 50";
            $stmt3 = $this->conn->prepare($query3);
            $stmt3->execute();
            $results = $stmt3->fetchAll(PDO::FETCH_ASSOC);

            // Prepare chart data
            $labels = array_column($byQualification, 'title');
            $scores = array_column($byQualification, 'rate');

            $data = [
                'overall' => $overall,
                'by_qualification' => $byQualification,
                'results' => $results,
                'overview' => ['labels' => $labels, 'scores' => $scores]
            ];

            $this->sendResponse(200, true, 'Competency results retrieved successfully', $data);
        } catch (Exception $e) {
            $this->sendResponse(500, false, 'Error retrieving competency results: ' . $e->getMessage());
        }
    }

    private function getRecentActivities() {
        try {
            // Since activity_logs table doesn't exist, return mock data or empty
            // In a real implementation, you'd query activity_logs
            $data = [
                // Mock data
                ['first_name' => 'John', 'last_name' => 'Doe', 'action' => 'login_success', 'created_at' => date('Y-m-d H:i:s')],
                ['first_name' => 'Jane', 'last_name' => 'Smith', 'action' => 'enrollment_approved', 'created_at' => date('Y-m-d H:i:s')]
            ];

            $this->sendResponse(200, true, 'Recent activities retrieved successfully', $data);
        } catch (Exception $e) {
            $this->sendResponse(500, false, 'Error retrieving recent activities: ' . $e->getMessage());
        }
    }

    private function getAnalyticsData() {
        // Placeholder for analytics data
        $period = isset($_GET['period']) ? $_GET['period'] : 'monthly';
        $data = ['period' => $period, 'analytics' => []];
        $this->sendResponse(200, true, 'Analytics data retrieved successfully', $data);
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

// Initialize and handle request
$database = new Database();
$db = $database->getConnection();

$dashboard = new AdminDashboard($db);
$dashboard->handleRequest();
?>
