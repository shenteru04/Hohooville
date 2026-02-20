<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
    case 'list':
        listHolidays($conn);
        break;
    case 'add':
        addHoliday($conn);
        break;
    case 'update':
        updateHoliday($conn);
        break;
    case 'delete':
        deleteHoliday($conn);
        break;
    case 'get-calendar':
        getAcademicCalendar($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function listHolidays($conn) {
    try {
        // Ensure table exists
        $conn->exec("CREATE TABLE IF NOT EXISTS tbl_holidays (
            holiday_id INT AUTO_INCREMENT PRIMARY KEY,
            holiday_name VARCHAR(255) NOT NULL,
            holiday_date DATE NOT NULL,
            description TEXT,
            holiday_type ENUM('national', 'local', 'special', 'maintenance') DEFAULT 'national',
            affected_batches TEXT COMMENT 'Comma-separated batch IDs or null for all',
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        
        $year = $_GET['year'] ?? date('Y');
        $stmt = $conn->prepare("SELECT * FROM tbl_holidays WHERE YEAR(holiday_date) = ? ORDER BY holiday_date");
        $stmt->execute([$year]);
        $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $holidays]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function addHoliday($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $name = $data['holiday_name'] ?? null;
        $date = $data['holiday_date'] ?? null;
        $type = $data['holiday_type'] ?? 'national';
        $desc = $data['description'] ?? null;
        $batches = $data['affected_batches'] ?? null;
        
        if (!$name || !$date) {
            throw new Exception('Holiday name and date required');
        }
        
        if (!strtotime($date)) {
            throw new Exception('Invalid date format');
        }
        
        $stmt = $conn->prepare("INSERT INTO tbl_holidays (holiday_name, holiday_date, holiday_type, description, affected_batches) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$name, $date, $type, $desc, $batches]);
        
        echo json_encode(['success' => true, 'message' => 'Holiday added successfully', 'id' => $conn->lastInsertId()]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateHoliday($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $id = $data['holiday_id'] ?? null;
        $name = $data['holiday_name'] ?? null;
        $date = $data['holiday_date'] ?? null;
        $type = $data['holiday_type'] ?? 'national';
        $desc = $data['description'] ?? null;
        $isActive = $data['is_active'] ?? 1;
        
        if (!$id || !$name || !$date) {
            throw new Exception('Required fields missing');
        }
        
        $stmt = $conn->prepare("UPDATE tbl_holidays SET holiday_name = ?, holiday_date = ?, holiday_type = ?, description = ?, is_active = ? WHERE holiday_id = ?");
        $stmt->execute([$name, $date, $type, $desc, $isActive, $id]);
        
        echo json_encode(['success' => true, 'message' => 'Holiday updated successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deleteHoliday($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('Holiday ID required');
        
        $stmt = $conn->prepare("DELETE FROM tbl_holidays WHERE holiday_id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true, 'message' => 'Holiday deleted successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getAcademicCalendar($conn) {
    try {
        $year = $_GET['year'] ?? date('Y');
        
        $result = [
            'holidays' => [],
            'batches' => [],
            'important_dates' => []
        ];
        
        // Get holidays
        $stmt = $conn->prepare("SELECT * FROM tbl_holidays WHERE YEAR(holiday_date) = ? AND is_active = 1 ORDER BY holiday_date");
        $stmt->execute([$year]);
        $result['holidays'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get batch start/end dates
        $stmt = $conn->query("SELECT batch_id, batch_name, start_date, end_date FROM tbl_batch WHERE YEAR(start_date) = {$year} ORDER BY start_date");
        $result['batches'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $result]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
