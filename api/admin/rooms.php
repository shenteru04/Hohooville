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
            
            // Check if room name already exists (case-insensitive)
            $checkStmt = $conn->prepare('SELECT COUNT(*) FROM tbl_rooms WHERE LOWER(TRIM(room_name)) = LOWER(TRIM(?)) AND is_archived = 0');
            $checkStmt->execute([$data['room_name']]);
            if ($checkStmt->fetchColumn() > 0) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'A room with this name already exists. Please use a different name.']);
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
            
            // Check if new room name already exists (case-insensitive, excluding current room)
            $checkStmt = $conn->prepare('SELECT COUNT(*) FROM tbl_rooms WHERE LOWER(TRIM(room_name)) = LOWER(TRIM(?)) AND room_id != ? AND is_archived = 0');
            $checkStmt->execute([$data['room_name'], $data['room_id']]);
            if ($checkStmt->fetchColumn() > 0) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'A room with this name already exists. Please use a different name.']);
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
        case 'schedules':
            // Get all rooms with their scheduled classes
            $searchQuery = $_GET['search'] ?? '';
            $query = 'SELECT 
                        r.room_id, 
                        r.room_name, 
                        r.room_description,
                        COUNT(CASE WHEN b.status = "open" THEN 1 END) as active_classes,
                        GROUP_CONCAT(CONCAT(
                            "Class: ", COALESCE(b.batch_name, ""), 
                            " | Qualification: ", COALESCE(q.qualification_name, ""),
                            " | Schedule: ", COALESCE(s.schedule, "Not scheduled"),
                            " | Status: ", COALESCE(b.status, "")
                        ) SEPARATOR " || ") as scheduled_classes,
                        MIN(CASE WHEN b.status = "open" THEN s.schedule END) as next_schedule
                    FROM tbl_rooms r
                    LEFT JOIN tbl_schedule s ON r.room_id = s.room_id
                    LEFT JOIN tbl_batch b ON s.batch_id = b.batch_id
                    LEFT JOIN tbl_qualifications q ON b.qualification_id = q.qualification_id
                    WHERE r.is_archived = 0';
            
            if (!empty($searchQuery)) {
                $query .= ' AND (r.room_name LIKE ? OR r.room_description LIKE ? OR q.qualification_name LIKE ? OR b.batch_name LIKE ?)';
            }
            
            $query .= ' GROUP BY r.room_id, r.room_name, r.room_description ORDER BY r.room_name';
            
            $stmt = $conn->prepare($query);
            if (!empty($searchQuery)) {
                $searchTerm = '%' . $searchQuery . '%';
                $stmt->execute([$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
            } else {
                $stmt->execute();
            }
            
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $rooms]);
            break;
        case 'room-detail':
            // Get detailed schedule information for a specific room
            $roomId = $_GET['room_id'] ?? null;
            if (empty($roomId)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Room ID is required.']);
                break;
            }
            
            $query = 'SELECT 
                        r.room_id,
                        r.room_name,
                        r.room_description,
                        b.batch_id,
                        b.batch_name,
                        q.qualification_name,
                        q.nc_level_id,
                        CONCAT(t.first_name, " ", t.last_name) as trainer_name,
                        s.schedule,
                        b.status,
                        s.created_at,
                        s.updated_at
                    FROM tbl_rooms r
                    LEFT JOIN tbl_schedule s ON r.room_id = s.room_id
                    LEFT JOIN tbl_batch b ON s.batch_id = b.batch_id
                    LEFT JOIN tbl_qualifications q ON b.qualification_id = q.qualification_id
                    LEFT JOIN tbl_trainer t ON b.trainer_id = t.trainer_id
                    WHERE r.room_id = ? AND r.is_archived = 0
                    ORDER BY b.status DESC, s.schedule ASC';
            
            $stmt = $conn->prepare($query);
            $stmt->execute([$roomId]);
            $details = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($details)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Room not found.']);
                break;
            }
            
            $roomInfo = [
                'room_id' => $details[0]['room_id'],
                'room_name' => $details[0]['room_name'],
                'room_description' => $details[0]['room_description'],
                'scheduled_classes' => []
            ];
            
            foreach ($details as $detail) {
                if (!empty($detail['batch_id'])) {
                    $roomInfo['scheduled_classes'][] = [
                        'batch_id' => $detail['batch_id'],
                        'batch_name' => $detail['batch_name'],
                        'qualification_name' => $detail['qualification_name'],
                        'trainer_name' => $detail['trainer_name'],
                        'schedule' => $detail['schedule'],
                        'status' => $detail['status'],
                        'created_at' => $detail['created_at'],
                        'updated_at' => $detail['updated_at']
                    ];
                }
            }
            
            echo json_encode(['success' => true, 'data' => $roomInfo]);
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
