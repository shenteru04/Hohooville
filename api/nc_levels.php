<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'database/db.php';
require_once 'database/qualifications_helper.php';

$database = new Database();
$conn = $database->getConnection();

if (!$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$action = $_GET['action'] ?? 'list';

try {
    switch ($action) {
        case 'list':
        case 'all':
            $ncLevels = QualificationsHelper::getAllNCLevels($conn);
            echo json_encode(['success' => true, 'data' => $ncLevels]);
            break;
        
        case 'get':
            $id = $_GET['id'] ?? 0;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'NC Level ID is required']);
                exit;
            }
            $ncLevel = QualificationsHelper::getNCLevelById($conn, $id);
            if ($ncLevel) {
                echo json_encode(['success' => true, 'data' => $ncLevel]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'NC Level not found']);
            }
            break;
        
        case 'by-code':
            $code = $_GET['code'] ?? '';
            if (!$code) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'NC Level code is required']);
                exit;
            }
            $ncLevel = QualificationsHelper::getNCLevelByCode($conn, $code);
            if ($ncLevel) {
                echo json_encode(['success' => true, 'data' => $ncLevel]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'NC Level not found']);
            }
            break;
        
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action specified']);
    }
} catch (Exception $e) {
    http_response_code(500);
    error_log("API Error in nc_levels.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>
