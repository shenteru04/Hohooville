<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

class ActivityLogs {
    private $conn;
    private $table = 'tbl_activity_logs';

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        switch ($action) {
            case 'list':
                $this->getLogs();
                break;
            case 'clear':
                $this->clearLogs();
                break;
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
                break;
        }
    }

    private function getLogs() {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = ($page - 1) * $limit;

        $actionType = isset($_GET['action_type']) ? $_GET['action_type'] : '';
        $date = isset($_GET['date']) ? $_GET['date'] : '';
        $userId = isset($_GET['user_id']) ? $_GET['user_id'] : '';

        $query = "SELECT l.activity_log_id, l.user_id, l.action as action_type, l.table_name as entity_type, l.record_id as entity_id, l.details, l.ip_address, l.timestamp as created_at, u.username 
                  FROM " . $this->table . " l 
                  LEFT JOIN tbl_users u ON l.user_id = u.user_id 
                  WHERE 1=1";
        
        $params = [];

        if (!empty($actionType)) {
            $query .= " AND l.action = :action";
            $params[':action'] = $actionType;
        }
        if (!empty($date)) {
            $query .= " AND DATE(l.timestamp) = :date";
            $params[':date'] = $date;
        }
        if (!empty($userId)) {
            $query .= " AND l.user_id = :user_id";
            $params[':user_id'] = $userId;
        }

        // Count total for pagination
        $countQuery = "SELECT COUNT(*) as total FROM " . $this->table . " l WHERE 1=1";
        // Re-apply filters for count
        if (!empty($actionType)) $countQuery .= " AND l.action = :action";
        if (!empty($date)) $countQuery .= " AND DATE(l.timestamp) = :date";
        if (!empty($userId)) $countQuery .= " AND l.user_id = :user_id";

        $stmt = $this->conn->prepare($countQuery);
        $stmt->execute($params);
        $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        $pages = ceil($total / $limit);

        // Fetch data
        $query .= " ORDER BY l.timestamp DESC LIMIT :limit OFFSET :offset";
        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $data,
            'pagination' => ['page' => $page, 'pages' => $pages, 'total' => $total]
        ]);
    }

    private function clearLogs() {
        // Implementation for clearing logs if needed
        echo json_encode(['success' => false, 'message' => 'Feature not implemented yet']);
    }
}

$database = new Database();
$db = $database->getConnection();
$logs = new ActivityLogs($db);
$logs->handleRequest();
?>