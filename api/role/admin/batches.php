<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'list':
        getBatches($conn);
        break;
    case 'add':
        addBatch($conn);
        break;
    case 'update':
        updateBatch($conn);
        break;
    case 'delete':
        deleteBatch($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getBatches($conn) {
    try {
        $stmt = $conn->query("
            SELECT b.*
            FROM tbl_batch b
            ORDER BY b.batch_id DESC
        ");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function addBatch($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $conn->prepare("INSERT INTO tbl_batch (batch_name, start_date, end_date, status) VALUES (?, ?, ?, ?)");
        $stmt->execute([$data['batch_name'], $data['start_date'], $data['end_date'], $data['status'] ?? 'open']);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateBatch($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['batch_id'];
        
        $stmt = $conn->prepare("UPDATE tbl_batch SET batch_name = ?, start_date = ?, end_date = ?, status = ? WHERE batch_id = ?");
        $stmt->execute([$data['batch_name'], $data['start_date'], $data['end_date'], $data['status'], $id]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deleteBatch($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('ID required');
        
        $stmt = $conn->prepare("DELETE FROM tbl_batch WHERE batch_id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>