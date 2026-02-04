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

$database = new Database();
$conn = $database->getConnection();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get-trainer-id':
        getTrainerId($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action specified.']);
        http_response_code(400);
        break;
}

function getTrainerId($conn) {
    $userId = $_GET['user_id'] ?? 0;

    if (!$userId) {
        echo json_encode(['success' => false, 'message' => 'User ID is required.']);
        http_response_code(400);
        return;
    }

    try {
        $query = "SELECT trainer_id FROM tbl_trainer WHERE user_id = ? LIMIT 1";
        $stmt = $conn->prepare($query);
        $stmt->execute([$userId]);
        $trainerId = $stmt->fetchColumn();

        if ($trainerId) {
            echo json_encode(['success' => true, 'data' => ['trainer_id' => $trainerId]]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Trainer profile not found for this user.']);
            http_response_code(404);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error fetching trainer ID: ' . $e->getMessage()]);
        http_response_code(500);
    }
}
?>