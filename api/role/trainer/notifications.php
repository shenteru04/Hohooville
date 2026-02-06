<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

$database = new Database();
$db = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'get-unread') {
    $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : die();

    // Ensure table exists (defensive programming)
    $db->exec("CREATE TABLE IF NOT EXISTS tbl_notifications (
        notification_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255),
        message TEXT,
        link VARCHAR(255),
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $query = "SELECT notification_id, title, message, link, created_at 
              FROM tbl_notifications 
              WHERE user_id = :user_id AND is_read = 0 
              ORDER BY created_at DESC";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();

    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "data" => $notifications
    ]);
} elseif ($action === 'mark-read') {
    $data = json_decode(file_get_contents("php://input"));
    
    if(!empty($data->notification_id)) {
        $query = "UPDATE tbl_notifications SET is_read = 1 WHERE notification_id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $data->notification_id);
        
        if($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Notification marked as read."]);
        } else {
            echo json_encode(["success" => false, "message" => "Unable to update notification."]);
        }
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid action."]);
}
?>