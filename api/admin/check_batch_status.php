<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

try {
    // Get all open batches with their enrollment counts
    $query = "
        SELECT 
            b.batch_id,
            b.batch_name,
            b.qualification_id,
            b.max_trainees,
            b.status,
            COUNT(e.enrollment_id) as total_enrollments,
            SUM(CASE WHEN e.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN e.status = 'pending' THEN 1 ELSE 0 END) as pending_count
        FROM tbl_batch b
        LEFT JOIN tbl_enrollment e ON b.batch_id = e.batch_id
        WHERE b.status = 'open'
        GROUP BY b.batch_id, b.batch_name, b.qualification_id, b.max_trainees, b.status
        HAVING approved_count >= max_trainees
        ORDER BY b.batch_id DESC
    ";
    
    $stmt = $conn->query($query);
    $batchesNeedingClosure = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Also get general batch info
    $allBatchesQuery = "
        SELECT 
            b.batch_id,
            b.batch_name,
            b.max_trainees,
            b.status,
            COUNT(e.enrollment_id) as total_enrollments,
            SUM(CASE WHEN e.status = 'approved' THEN 1 ELSE 0 END) as approved_count
        FROM tbl_batch b
        LEFT JOIN tbl_enrollment e ON b.batch_id = e.batch_id
        GROUP BY b.batch_id
        ORDER BY b.batch_id DESC
    ";
    
    $stmtAll = $conn->query($allBatchesQuery);
    $allBatches = $stmtAll->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'batches_needing_closure' => $batchesNeedingClosure,
        'all_batches' => $allBatches,
        'closure_count' => count($batchesNeedingClosure)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
