<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../database/db.php';
$database = new Database();
$conn = $database->getConnection();
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'create':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['room_name'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Room name is required.']);
                break;
            }
            $stmt = $conn->prepare('INSERT INTO tbl_rooms (room_name, room_description) VALUES (?, ?)');
            $stmt->execute([$data['room_name'], $data['room_description'] ?? null]);
            echo json_encode(['success' => true, 'message' => 'Room created successfully.']);
            break;
        case 'list':
            $stmt = $conn->query('SELECT * FROM tbl_rooms WHERE is_archived = 0 ORDER BY room_name');
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $rooms]);
            break;
        case 'archived':
            $stmt = $conn->query('SELECT * FROM tbl_rooms WHERE is_archived = 1 ORDER BY room_name');
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $rooms]);
            break;
        case 'update':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['room_id']) || empty($data['room_name'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Room ID and Room Name are required.']);
                break;
            }
            $stmt = $conn->prepare('UPDATE tbl_rooms SET room_name = ?, room_description = ? WHERE room_id = ?');
            $stmt->execute([$data['room_name'], $data['room_description'] ?? null, $data['room_id']]);
            echo json_encode(['success' => true, 'message' => 'Room updated successfully.']);
            break;
        case 'archive':
            $data = json_decode(file_get_contents('php://input'), true);
            $roomId = $data['room_id'] ?? null;
            if (empty($roomId)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Missing room_id']);
                break;
            }

            // Check if the room is used by any non-closed batches in tbl_schedule
            $checkStmt = $conn->prepare('SELECT COUNT(*) FROM tbl_schedule s JOIN tbl_batch b ON s.batch_id = b.batch_id WHERE s.room_id = ? AND b.status != "closed"');
            $checkStmt->execute([$roomId]);
            if ($checkStmt->fetchColumn() > 0) {
                http_response_code(409); // 409 Conflict
                echo json_encode(['success' => false, 'message' => 'Cannot archive room. It is assigned to one or more active batch schedules.']);
                break;
            }

            $stmt = $conn->prepare('UPDATE tbl_rooms SET is_archived = 1 WHERE room_id = ?');
            $stmt->execute([$roomId]);
            echo json_encode(['success' => true, 'message' => 'Room archived successfully.']);
            break;
        case 'unarchive':
            $data = json_decode(file_get_contents('php://input'), true);
            $roomId = $data['room_id'] ?? null;
            if (empty($roomId)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Missing room_id']);
                break;
            }
            $stmt = $conn->prepare('UPDATE tbl_rooms SET is_archived = 0 WHERE room_id = ?');
            $stmt->execute([$roomId]);
            echo json_encode(['success' => true, 'message' => 'Room restored successfully.']);
            break;
        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An unexpected error occurred: ' . $e->getMessage()]);
}
