<?php
/**
 * Debug script to test registrar email update
 * Access at: http://localhost/Hohoo-ville/api/role/registrar/profile_update_debug.php
 */

header('Content-Type: application/json');
require_once '../../database/db.php';

$debug_results = [];

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    $debug_results['connection'] = 'success';
    
    // Test user ID (Carl - registrar)
    $test_user_id = 43;
    $test_email = 'carl_' . time() . '@test.com';
    
    $debug_results['test_user_id'] = $test_user_id;
    $debug_results['test_email'] = $test_email;
    
    // Check if user exists
    $stmtCheck = $conn->prepare("SELECT user_id, email FROM tbl_users WHERE user_id = ?");
    $stmtCheck->execute([$test_user_id]);
    $user = $stmtCheck->fetch(PDO::FETCH_ASSOC);
    $debug_results['user_before_update'] = $user;
    
    // Check employee record
    $stmtEmpCheck = $conn->prepare("SELECT employee_id, email FROM tbl_employee WHERE user_id = ?");
    $stmtEmpCheck->execute([$test_user_id]);
    $employee = $stmtEmpCheck->fetch(PDO::FETCH_ASSOC);
    $debug_results['employee_before_update'] = $employee;
    
    // Start transaction
    $conn->beginTransaction();
    
    try {
        // Update tbl_users
        $stmtUpdate = $conn->prepare("UPDATE tbl_users SET email = ? WHERE user_id = ?");
        $result = $stmtUpdate->execute([$test_email, $test_user_id]);
        $debug_results['users_update_result'] = $result;
        $debug_results['users_update_errors'] = $stmtUpdate->errorInfo();
        
        // Update tbl_employee if exists
        if ($employee) {
            $stmtEmpUpdate = $conn->prepare("UPDATE tbl_employee SET email = ? WHERE user_id = ?");
            $result = $stmtEmpUpdate->execute([$test_email, $test_user_id]);
            $debug_results['employee_update_result'] = $result;
            $debug_results['employee_update_errors'] = $stmtEmpUpdate->errorInfo();
        }
        
        $conn->commit();
        $debug_results['transaction'] = 'committed';
        
        // Verify updates
        $stmtVerify = $conn->prepare("SELECT user_id, email FROM tbl_users WHERE user_id = ?");
        $stmtVerify->execute([$test_user_id]);
        $userAfter = $stmtVerify->fetch(PDO::FETCH_ASSOC);
        $debug_results['user_after_update'] = $userAfter;
        
        $stmtEmpVerify = $conn->prepare("SELECT employee_id, email FROM tbl_employee WHERE user_id = ?");
        $stmtEmpVerify->execute([$test_user_id]);
        $employeeAfter = $stmtEmpVerify->fetch(PDO::FETCH_ASSOC);
        $debug_results['employee_after_update'] = $employeeAfter;
        
        $debug_results['success'] = true;
        $debug_results['message'] = 'Email update test completed successfully';
        
    } catch (Exception $e) {
        $conn->rollBack();
        $debug_results['transaction'] = 'rolled_back';
        $debug_results['error'] = $e->getMessage();
        $debug_results['success'] = false;
    }
    
} catch (Exception $e) {
    $debug_results['error'] = $e->getMessage();
    $debug_results['success'] = false;
}

echo json_encode($debug_results, JSON_PRETTY_PRINT);
?>
