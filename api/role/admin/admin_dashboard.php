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

/**
 * Extract abbreviation from qualification name
 * Examples:
 * "Electrical Installation and Maintenance NC II" -> "EIM NC II"
 * "Electronic Products Assembly and Servicing (EPAS) NC II" -> "EPAS NC II"
 * "Cookery NC II" -> "Cook NC II"
 * "Sheet Metal Arc Welding (SMAW) NC II" -> "SMAW NC II"
 */
function getAbbreviatedQualificationName($fullName) {
    // Extract NC level (NC I, NC II, NC III, etc.)
    $ncPattern = '/\b(NC\s+[IVX]+)\b/i';
    $ncLevel = '';
    if (preg_match($ncPattern, $fullName, $matches)) {
        $ncLevel = $matches[1];
        $qualName = preg_replace($ncPattern, '', $fullName);
    } else {
        $qualName = $fullName;
    }
    
    $qualName = trim($qualName);
    
    // Check if there's already an abbreviation in parentheses like (EPAS)
    if (preg_match('/\(([A-Z]+)\)/', $qualName, $matches)) {
        $abbr = $matches[1];
    } else {
        // Generate abbreviation from qualification name
        $words = preg_split('/\s+/', $qualName);
        
        // For single word names, use first 4 letters
        if (count($words) === 1) {
            $abbr = strtoupper(substr($words[0], 0, 4));
        } else {
            // For multi-word names, take first letter of major words
            $abbr = '';
            foreach ($words as $word) {
                // Skip small words and special characters
                if (strlen($word) > 2 && !in_array(strtolower($word), ['and', 'the', 'for', 'with', 'in', 'at', 'to', 'of'])) {
                    $abbr .= strtoupper($word[0]);
                }
            }
            
            // If we couldn't generate proper abbreviation, use first 4 letters
            if (empty($abbr)) {
                $abbr = strtoupper(substr(str_replace(' ', '', $qualName), 0, 4));
            }
        }
    }
    
    // Return abbreviation with NC level (only add space if NC level exists)
    return !empty($ncLevel) ? $abbr . ' ' . $ncLevel : $abbr;
}

class AdminDashboard {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';
        try {
            // Verify database tables exist
            if (!$this->verifyTables()) {
                $this->sendResponse(503, false, 'Database not initialized. Please run setup at /Hohoo-ville/api/setup/');
                return;
            }
            
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
            error_log('Admin Dashboard Error: ' . $e->getMessage());
            $this->sendResponse(500, false, 'An error occurred: ' . $e->getMessage());
        }
    }

    private function verifyTables() {
        try {
            $stmt = $this->conn->query("SELECT 1 FROM tbl_enrollment LIMIT 1");
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    private function getStatistics() {
        $stats = [];
        try {
            $stats['total_enrolled'] = (int)($this->conn->query("SELECT COUNT(*) FROM tbl_enrollment WHERE status = 'approved'")->fetchColumn() ?? 0);
        } catch (Exception $e) {
            $stats['total_enrolled'] = 0;
        }
        
        try {
            $stats['active_qualifications'] = (int)($this->conn->query("SELECT COUNT(*) FROM tbl_qualifications WHERE status = 'active'")->fetchColumn() ?? 0);
        } catch (Exception $e) {
            $stats['active_qualifications'] = 0;
        }
        
        try {
            $stats['trainer_count'] = (int)($this->conn->query("SELECT COUNT(*) FROM tbl_trainer")->fetchColumn() ?? 0);
        } catch (Exception $e) {
            $stats['trainer_count'] = 0;
        }
        
        try {
            $stats['scheduled_trainings'] = (int)($this->conn->query("SELECT COUNT(*) FROM tbl_batch WHERE status = 'open'")->fetchColumn() ?? 0);
        } catch (Exception $e) {
            $stats['scheduled_trainings'] = 0;
        }
        
        try {
            $stats['pending_enrollments'] = (int)($this->conn->query("SELECT COUNT(*) FROM tbl_enrollment WHERE status = 'pending'")->fetchColumn() ?? 0);
        } catch (Exception $e) {
            $stats['pending_enrollments'] = 0;
        }
        
        try {
            $stats['completed_this_year'] = (int)($this->conn->query("SELECT COUNT(DISTINCT e.trainee_id) FROM tbl_enrollment e JOIN tbl_batch b ON e.batch_id = b.batch_id WHERE e.status = 'approved' AND b.end_date < CURDATE() AND YEAR(b.end_date) = YEAR(CURDATE())")->fetchColumn() ?? 0);
        } catch (Exception $e) {
            $stats['completed_this_year'] = 0;
        }
        
        $this->sendResponse(200, true, 'Statistics loaded', $stats);
    }

    private function getFinancialSummary() {
        $summary = [];
        try {
            $summary['total_collected'] = (int)($this->conn->query("SELECT SUM(amount) FROM tbl_payments")->fetchColumn() ?? 0);
        } catch (Exception $e) {
            $summary['total_collected'] = 0;
        }
        
        try {
            $totalCost = (int)($this->conn->query("SELECT SUM(q.training_cost) FROM tbl_enrollment e JOIN tbl_qualifications q ON e.qualification_id = q.qualification_id WHERE e.scholarship_type IS NULL OR e.scholarship_type = ''")->fetchColumn() ?? 0);
        } catch (Exception $e) {
            $totalCost = 0;
        }
        
        $summary['total_pending'] = max(0, $totalCost - $summary['total_collected']);

        try {
            $summary['scholarship_distribution'] = $this->conn->query("SELECT scholarship_type, COUNT(*) as count FROM tbl_enrollment WHERE scholarship_type IS NOT NULL AND scholarship_type != '' GROUP BY scholarship_type")->fetchAll(PDO::FETCH_ASSOC) ?? [];
        } catch (Exception $e) {
            $summary['scholarship_distribution'] = [];
        }
        
        try {
            $summary['monthly_revenue'] = $this->conn->query("SELECT DATE_FORMAT(payment_date, '%b %Y') as month, SUM(amount) as revenue FROM tbl_payments WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(payment_date, '%Y-%m') ORDER BY DATE_FORMAT(payment_date, '%Y-%m') ASC")->fetchAll(PDO::FETCH_ASSOC) ?? [];
        } catch (Exception $e) {
            $summary['monthly_revenue'] = [];
        }

        $this->sendResponse(200, true, 'Financial summary loaded', $summary);
    }

    private function getEnrollmentStats() {
        $stats = [];
        
        try {
            $stats['by_qualification'] = $this->conn->query("SELECT q.qualification_name as title, COUNT(e.enrollment_id) as count FROM tbl_enrollment e JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id JOIN tbl_qualifications q ON oc.qualification_id = q.qualification_id WHERE e.status = 'approved' GROUP BY q.qualification_id")->fetchAll(PDO::FETCH_ASSOC) ?? [];
        } catch (Exception $e) {
            $stats['by_qualification'] = [];
        }
        
        try {
            $stats['monthly_trend'] = $this->conn->query("SELECT DATE_FORMAT(enrollment_date, '%b %Y') as month, COUNT(*) as count FROM tbl_enrollment WHERE enrollment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) GROUP BY DATE_FORMAT(enrollment_date, '%Y-%m') ORDER BY DATE_FORMAT(enrollment_date, '%Y-%m') ASC")->fetchAll(PDO::FETCH_ASSOC) ?? [];
        } catch (Exception $e) {
            $stats['monthly_trend'] = [];
        }
        
        try {
            $stats['by_batch'] = $this->conn->query("SELECT b.batch_name, b.status, COUNT(e.trainee_id) as trainee_count FROM tbl_batch b LEFT JOIN tbl_enrollment e ON b.batch_id = e.batch_id AND e.status = 'approved' GROUP BY b.batch_id ORDER BY b.batch_id DESC")->fetchAll(PDO::FETCH_ASSOC) ?? [];
        } catch (Exception $e) {
            $stats['by_batch'] = [];
        }

        // Add abbreviated names to by_qualification
        if (!empty($stats['by_qualification'])) {
            foreach ($stats['by_qualification'] as &$qualification) {
                $qualification['abbreviated'] = getAbbreviatedQualificationName($qualification['title']);
            }
            unset($qualification);
        }

        $this->sendResponse(200, true, 'Enrollment stats loaded', $stats);
    }

    private function getAttendanceOverview() {
        $overview = [];
        
        try {
            $totalRecords = $this->conn->query("SELECT COUNT(*) FROM tbl_attendance")->fetchColumn();
            if ($totalRecords > 0) {
                $presentRecords = $this->conn->query("SELECT COUNT(*) FROM tbl_attendance WHERE status IN ('present', 'late')")->fetchColumn();
                $overview['overall']['attendance_rate'] = ($presentRecords / $totalRecords) * 100;
            } else {
                $overview['overall']['attendance_rate'] = 0;
            }

            $overview['daily_trend'] = $this->conn->query("SELECT DATE_FORMAT(date_recorded, '%Y-%m-%d') as date, (SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) / COUNT(*)) * 100 as rate FROM tbl_attendance WHERE date_recorded >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY date_recorded ORDER BY date_recorded ASC")->fetchAll(PDO::FETCH_ASSOC);
            
            $overview['by_batch'] = $this->conn->query("SELECT b.batch_name as batch_code, COUNT(a.attendance_id) as total_records, SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) as present, (SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) / COUNT(a.attendance_id)) * 100 as rate FROM tbl_attendance a JOIN tbl_enrollment e ON a.trainee_id = e.trainee_id JOIN tbl_batch b ON e.batch_id = b.batch_id GROUP BY b.batch_id")->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $overview['overall']['attendance_rate'] = 0;
            $overview['daily_trend'] = [];
            $overview['by_batch'] = [];
        }

        $this->sendResponse(200, true, 'Attendance overview loaded', $overview);
    }

    private function getCompetencyResults() {
        $results = [];
        $results['overview'] = ['labels' => [], 'abbreviations' => [], 'scores' => []];
        
        try {
            $qualifications = $this->conn->query("SELECT q.qualification_name FROM tbl_grades g JOIN tbl_qualifications q ON g.qualification_id = q.qualification_id GROUP BY g.qualification_id")->fetchAll(PDO::FETCH_COLUMN) ?? [];
            foreach ($qualifications as $qName) {
                $results['overview']['labels'][] = $qName;
                $results['overview']['abbreviations'][] = getAbbreviatedQualificationName($qName);
            }
        } catch (Exception $e) {
            $results['overview']['labels'] = [];
            $results['overview']['abbreviations'] = [];
        }
        
        try {
            $results['overview']['scores'] = $this->conn->query("SELECT AVG(g.score) FROM tbl_grades g JOIN tbl_qualifications q ON g.qualification_id = q.qualification_id GROUP BY g.qualification_id")->fetchAll(PDO::FETCH_COLUMN) ?? [];
        } catch (Exception $e) {
            $results['overview']['scores'] = [];
        }

        $this->sendResponse(200, true, 'Competency results loaded', $results);
    }

    private function getRecentActivities() {
        try {
            $query = "SELECT 
                        al.action, 
                        t.trainee_school_id,
                        al.timestamp as created_at,
                        COALESCE(t.first_name, tr.first_name, u.username) as first_name,
                        COALESCE(t.last_name, tr.last_name, '') as last_name
                      FROM tbl_activity_logs al
                      LEFT JOIN tbl_users u ON al.user_id = u.user_id
                      LEFT JOIN tbl_trainee_hdr t ON u.user_id = t.user_id
                      LEFT JOIN tbl_trainer tr ON u.user_id = tr.user_id
                      ORDER BY al.timestamp DESC 
                      LIMIT 10";
            
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
