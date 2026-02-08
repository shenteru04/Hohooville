<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Adjust the path to your database configuration file as needed
require_once '../../../config/database.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get') {
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

    if ($user_id > 0) {
        // Fetch user details from tbl_users
        // Ensure your table columns match these names (first_name, last_name, etc.)
        $query = "SELECT user_id, first_name, last_name, email, phone_number, username FROM tbl_users WHERE user_id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("i", $user_id);
        
        if ($stmt->execute()) {
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                echo json_encode(['success' => true, 'data' => $row]);
            } else {
                echo json_encode(['success' => false, 'message' => 'User not found']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Database error']);
        }
        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid User ID']);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : 0;
    $first_name = $data['first_name'] ?? '';
    $last_name = $data['last_name'] ?? '';
    $email = $data['email'] ?? '';
    $phone = $data['phone_number'] ?? '';

    if ($user_id > 0) {
        $query = "UPDATE tbl_users SET first_name = ?, last_name = ?, email = ?, phone_number = ? WHERE user_id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ssssi", $first_name, $last_name, $email, $phone, $user_id);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update profile']);
        }
        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid data']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
}
$conn->close();
?>