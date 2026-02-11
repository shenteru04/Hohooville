<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
require_once 'database/db.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action == 'getActive') {
    try {
        $database = new Database();
        $conn = $database->getConnection();

        if (!$conn) {
            exit; // Connection failed, error already echoed by Database class
        }
        
        // Fetch active qualifications from the database.
        // The 'status' column in tbl_qualifications determines if it's offered.
        $stmt = $conn->prepare("
            SELECT qualification_id, qualification_name, duration 
            FROM tbl_qualifications 
            WHERE status = 'active' 
            ORDER BY qualification_name ASC
        ");
        $stmt->execute();
        $qualifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($qualifications);

    } catch (Exception $e) {
        http_response_code(500);
        error_log("API Error in qualifications.php: " . $e->getMessage());
        echo json_encode([]); // Return empty array on error
    }
} else {
    echo json_encode([]);
}
?>