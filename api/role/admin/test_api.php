<?php
/**
 * Admin API Testing Script
 * Tests all critical admin endpoints
 */

header('Content-Type: application/json');
require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$results = [];

// Test 1: Check if tables exist
$tables_to_check = [
    'tbl_users', 'tbl_qualifications', 'tbl_batch', 'tbl_trainee_hdr', 
    'tbl_enrollment', 'tbl_trainer', 'tbl_attendance', 'tbl_grades',
    'tbl_activity_logs', 'tbl_payments'
];

$results['tables'] = [];
foreach ($tables_to_check as $table) {
    try {
        $stmt = $conn->query("SELECT 1 FROM $table LIMIT 1");
        $results['tables'][$table] = 'EXISTS ✓';
    } catch (Exception $e) {
        $results['tables'][$table] = 'MISSING ✗';
    }
}

// Test 2: Get admin statistics
try {
    $stats = [];
    $stats['total_enrolled'] = $conn->query("SELECT COUNT(*) FROM tbl_enrollment WHERE status = 'approved'")->fetchColumn();
    $stats['active_qualifications'] = $conn->query("SELECT COUNT(*) FROM tbl_qualifications WHERE status = 'active'")->fetchColumn();
    $stats['trainer_count'] = $conn->query("SELECT COUNT(*) FROM tbl_trainer")->fetchColumn();
    $stats['pending_enrollments'] = $conn->query("SELECT COUNT(*) FROM tbl_enrollment WHERE status = 'pending'")->fetchColumn();
    
    $results['statistics'] = array_merge(['status' => 'SUCCESS ✓'], $stats);
} catch (Exception $e) {
    $results['statistics'] = ['status' => 'FAILED ✗', 'error' => $e->getMessage()];
}

// Test 3: Get sample trainees
try {
    $stmt = $conn->query("
        SELECT 
            t.trainee_id, t.trainee_school_id, t.first_name, t.last_name, t.email, t.status
        FROM tbl_trainee_hdr t 
        LIMIT 5
    ");
    $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $results['trainees_sample'] = array_merge(
        ['status' => 'SUCCESS ✓', 'count' => count($trainees)],
        ['data' => $trainees]
    );
} catch (Exception $e) {
    $results['trainees_sample'] = ['status' => 'FAILED ✗', 'error' => $e->getMessage()];
}

// Test 4: Get sample trainers
try {
    $stmt = $conn->query("
        SELECT 
            t.trainer_id, t.first_name, t.last_name, t.email, t.status,
            COUNT(DISTINCT tq.qualification_id) as qual_count
        FROM tbl_trainer t
        LEFT JOIN tbl_trainer_qualifications tq ON t.trainer_id = tq.trainer_id
        GROUP BY t.trainer_id
        LIMIT 5
    ");
    $trainers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $results['trainers_sample'] = array_merge(
        ['status' => 'SUCCESS ✓', 'count' => count($trainers)],
        ['data' => $trainers]
    );
} catch (Exception $e) {
    $results['trainers_sample'] = ['status' => 'FAILED ✗', 'error' => $e->getMessage()];
}

// Test 5: Get batches
try {
    $stmt = $conn->query("
        SELECT 
            b.batch_id, b.batch_name, b.status,
            COUNT(e.enrollment_id) as enrolled_count
        FROM tbl_batch b
        LEFT JOIN tbl_enrollment e ON b.batch_id = e.batch_id AND e.status = 'approved'
        GROUP BY b.batch_id
        LIMIT 5
    ");
    $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $results['batches_sample'] = array_merge(
        ['status' => 'SUCCESS ✓', 'count' => count($batches)],
        ['data' => $batches]
    );
} catch (Exception $e) {
    $results['batches_sample'] = ['status' => 'FAILED ✗', 'error' => $e->getMessage()];
}

// Test 6: Check default admin user exists
try {
    $stmt = $conn->query("SELECT user_id, username, role FROM tbl_users WHERE username = 'admin'");
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($admin) {
        $results['admin_user'] = array_merge(['status' => 'EXISTS ✓'], $admin);
    } else {
        $results['admin_user'] = ['status' => 'MISSING ✗', 'warning' => 'Default admin user not found!'];
    }
} catch (Exception $e) {
    $results['admin_user'] = ['status' => 'FAILED ✗', 'error' => $e->getMessage()];
}

// Overall status
$all_ok = true;
foreach ($results as $key => $result) {
    if (is_array($result) && isset($result['status']) && strpos($result['status'], '✗') !== false) {
        $all_ok = false;
        break;
    }
}

$results['overall_status'] = $all_ok ? 'READY ✓' : 'NEEDS ATTENTION ✗';
$results['next_steps'] = $all_ok ? 
    ['message' => 'Database is properly configured! Admin pages should now display data.'] :
    ['message' => 'Run database initialization: http://localhost/Hohoo-ville/api/setup/'];

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
