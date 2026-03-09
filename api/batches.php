<?php
// Prevent HTML error output
ini_set('display_errors', 0);
error_reporting(E_ALL);
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("[$errno] $errstr in $errfile:$errline");
    return true;
});

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
require_once 'database/db.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

try {
    if ($action == 'getOpen') {
        $database = new Database();
        $conn = $database->getConnection();

        if (!$conn) {
            http_response_code(500);
            echo json_encode([]);
            exit;
        }
        
        // Close batches that have passed their enrollment deadline (start_date)
        closeExpiredBatches($conn);
        
        // Fetch batches that are currently open for enrollment or upcoming.
        // This query joins tbl_batch with tbl_qualifications to get the course name.
        // It joins tbl_schedule to get the schedule information.
        $stmt = $conn->prepare("
            SELECT 
                b.batch_id,
                b.batch_name,
                q.qualification_name,
                s.schedule,
                b.status
            FROM 
                tbl_batch AS b
            JOIN 
                tbl_qualifications AS q ON b.qualification_id = q.qualification_id
            LEFT JOIN
                tbl_schedule AS s ON b.batch_id = s.batch_id
            WHERE 
                b.status = 'open'
            ORDER BY 
                b.batch_name ASC
        ");
        $stmt->execute();
        $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($batches);

    } else {
        echo json_encode([]);
    }
} catch (Exception $e) {
    http_response_code(500);
    error_log("API Error in batches.php: " . $e->getMessage());
    echo json_encode([]); // Return empty array on error
}

/**
 * Closes batches that have passed their enrollment deadline (start_date)
 */
function closeExpiredBatches($conn) {
    try {
        $query = "UPDATE tbl_batch 
                  SET status = 'closed' 
                  WHERE status = 'open' 
                  AND start_date <= CURDATE()";
        $stmt = $conn->prepare($query);
        $stmt->execute();
    } catch (Exception $e) {
        error_log("Error closing expired batches: " . $e->getMessage());
    }
}
?>