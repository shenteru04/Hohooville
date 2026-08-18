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
            case 'action-types':
                $this->getActionTypes();
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

    private function getActionTypes() {
        try {
            $stmt = $this->conn->query("SELECT DISTINCT action FROM " . $this->table . " WHERE action IS NOT NULL AND action <> '' ORDER BY action");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_COLUMN)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Unable to load activity types.']);
        }
    }

    private function clearLogs() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Clear logs requires a POST request.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $days = isset($input['days']) ? filter_var($input['days'], FILTER_VALIDATE_INT) : false;

        if ($days === false || $days < 1) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Days to keep must be a whole number of at least 1.']);
            return;
        }

        try {
            $cutoff = (new DateTimeImmutable())->modify("-{$days} days")->format('Y-m-d H:i:s');
            $stmt = $this->conn->prepare("DELETE FROM " . $this->table . " WHERE timestamp < :cutoff");
            $stmt->execute([':cutoff' => $cutoff]);
            $deleted = $stmt->rowCount();

            $auditStmt = $this->conn->prepare(
                "INSERT INTO " . $this->table . " (user_id, action, table_name, details, ip_address) VALUES (NULL, :action, :table_name, :details, :ip_address)"
            );
            $auditStmt->execute([
                ':action' => 'delete',
                ':table_name' => $this->table,
                ':details' => "Cleared {$deleted} activity log(s) older than {$days} day(s).",
                ':ip_address' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);

            echo json_encode([
                'success' => true,
                'message' => $deleted . ' log' . ($deleted === 1 ? '' : 's') . ' older than ' . $days . ' day' . ($days === 1 ? '' : 's') . ' cleared.',
                'deleted_count' => $deleted
            ]);
        } catch (Exception $e) {
            error_log('Unable to clear activity logs: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Unable to clear activity logs.']);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$logs = new ActivityLogs($db);
$logs->handleRequest();
?>
