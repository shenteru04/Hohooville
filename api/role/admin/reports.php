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

$database = new Database();
$conn = $database->getConnection();

$type = $_GET['type'] ?? 'enrollment';
$startDate = $_GET['start_date'] ?? date('Y-01-01');
$endDate = $_GET['end_date'] ?? date('Y-12-31');

switch ($type) {
    case 'enrollment':
        getEnrollmentReport($conn, $startDate, $endDate);
        break;
    case 'attendance':
        getAttendanceReport($conn, $startDate, $endDate);
        break;
    case 'financial':
        getFinancialReport($conn, $startDate, $endDate);
        break;
    case 'performance':
        getPerformanceReport($conn, $startDate, $endDate);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid report type']);
        break;
}

function getEnrollmentReport($conn, $start, $end) {
    try {
        // Chart Data: Enrollments by Course
        $stmtChart = $conn->prepare("
            SELECT c.course_name as label, COUNT(e.enrollment_id) as value 
            FROM tbl_enrollment e
            JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
            JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
            WHERE e.enrollment_date BETWEEN ? AND ? AND e.status = 'approved'
            GROUP BY c.qualification_id
        ");
        $stmtChart->execute([$start, $end]);
        $chartData = $stmtChart->fetchAll(PDO::FETCH_ASSOC);

        // Table Data: Detailed List
        $stmtTable = $conn->prepare("
            SELECT e.enrollment_date, CONCAT(t.first_name, ' ', t.last_name) as trainee, c.course_name, b.batch_name, e.status
            FROM tbl_enrollment e
            JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
            JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
            JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
            LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
            WHERE e.enrollment_date BETWEEN ? AND ?
            ORDER BY e.enrollment_date DESC
        ");
        $stmtTable->execute([$start, $end]);
        $tableData = $stmtTable->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'chart' => $chartData, 'table' => $tableData]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getAttendanceReport($conn, $start, $end) {
    try {
        // Chart Data: Attendance Rate by Batch
        $stmtChart = $conn->prepare("
            SELECT b.batch_name as label, 
                   AVG(CASE WHEN d.status = 'present' THEN 100 ELSE 0 END) as value
            FROM tbl_attendance_dtl d
            JOIN tbl_attendance_hdr h ON d.attendance_hdr_id = h.attendance_hdr_id
            JOIN tbl_batch b ON h.batch_id = b.batch_id
            WHERE h.date_recorded BETWEEN ? AND ?
            GROUP BY b.batch_id
        ");
        $stmtChart->execute([$start, $end]);
        $chartData = $stmtChart->fetchAll(PDO::FETCH_ASSOC);

        // Table Data: Daily Attendance Logs
        $stmtTable = $conn->prepare("
            SELECT h.date_recorded, b.batch_name, 
                   COUNT(d.attendance_dtl_id) as total_students,
                   SUM(CASE WHEN d.status = 'present' THEN 1 ELSE 0 END) as present_count,
                   SUM(CASE WHEN d.status = 'absent' THEN 1 ELSE 0 END) as absent_count
            FROM tbl_attendance_hdr h
            JOIN tbl_batch b ON h.batch_id = b.batch_id
            JOIN tbl_attendance_dtl d ON h.attendance_hdr_id = d.attendance_hdr_id
            WHERE h.date_recorded BETWEEN ? AND ?
            GROUP BY h.attendance_hdr_id
            ORDER BY h.date_recorded DESC
        ");
        $stmtTable->execute([$start, $end]);
        $tableData = $stmtTable->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'chart' => $chartData, 'table' => $tableData]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getFinancialReport($conn, $start, $end) {
    try {
        // Chart Data: Revenue by Month
        $stmtChart = $conn->prepare("
            SELECT DATE_FORMAT(payment_date, '%Y-%m') as label, SUM(amount) as value
            FROM tbl_finance_record
            WHERE payment_date BETWEEN ? AND ?
            GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
            ORDER BY payment_date
        ");
        $stmtChart->execute([$start, $end]);
        $chartData = $stmtChart->fetchAll(PDO::FETCH_ASSOC);

        // Chart Data: Payment Method Distribution
        $stmtMethod = $conn->prepare("
            SELECT payment_method as label, COUNT(*) as value
            FROM tbl_finance_record
            WHERE payment_date BETWEEN ? AND ?
            GROUP BY payment_method
        ");
        $stmtMethod->execute([$start, $end]);
        $methodData = $stmtMethod->fetchAll(PDO::FETCH_ASSOC);

        // Table Data: Transaction History
        $stmtTable = $conn->prepare("
            SELECT f.payment_date, CONCAT(t.first_name, ' ', t.last_name) as trainee, 
                   f.amount, f.payment_method, f.reference_no
            FROM tbl_finance_record f
            JOIN tbl_trainee_hdr t ON f.trainee_id = t.trainee_id
            WHERE f.payment_date BETWEEN ? AND ?
            ORDER BY f.payment_date DESC
        ");
        $stmtTable->execute([$start, $end]);
        $tableData = $stmtTable->fetchAll(PDO::FETCH_ASSOC);

        // Summary Totals
        $stmtSummary = $conn->prepare("SELECT SUM(amount) as total_revenue FROM tbl_finance_record WHERE payment_date BETWEEN ? AND ?");
        $stmtSummary->execute([$start, $end]);
        $summary = $stmtSummary->fetch(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'chart' => $chartData, 'method_distribution' => $methodData, 'table' => $tableData, 'summary' => $summary]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getPerformanceReport($conn, $start, $end) {
    try {
        // Chart Data: Average Grade by Course
        $stmtChart = $conn->prepare("
            SELECT c.course_name as label, AVG(g.score) as value
            FROM tbl_grades g
            JOIN tbl_qualifications c ON g.qualification_id = c.qualification_id
            WHERE g.date_recorded BETWEEN ? AND ?
            GROUP BY c.qualification_id
        ");
        $stmtChart->execute([$start, $end]);
        $chartData = $stmtChart->fetchAll(PDO::FETCH_ASSOC);

        // Table Data: Trainee Performance
        $stmtTable = $conn->prepare("
            SELECT 
                CONCAT(t.first_name, ' ', t.last_name) as trainee, 
                c.course_name, 
                AVG(g.score) as total_grade, 
                (CASE WHEN AVG(g.score) >= 80 THEN 'Competent' ELSE 'Not Yet Competent' END) as remarks,
                MAX(g.date_recorded) as date_recorded
            FROM tbl_grades g
            JOIN tbl_trainee_hdr t ON g.trainee_id = t.trainee_id
            JOIN tbl_qualifications c ON g.qualification_id = c.qualification_id
            WHERE g.date_recorded BETWEEN ? AND ?
            GROUP BY g.trainee_id, g.qualification_id
            ORDER BY total_grade DESC
        ");
        $stmtTable->execute([$start, $end]);
        $tableData = $stmtTable->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'chart' => $chartData, 'table' => $tableData]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>