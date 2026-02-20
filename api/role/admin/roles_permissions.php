<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
require_once '../../database/db.php';

class RolesPermissions {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        if ($action === 'list-roles') {
            $this->listRoles();
        } elseif ($action === 'list-permissions') {
            // Schema missing permissions table, return empty
            echo json_encode(['success' => true, 'data' => []]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Action not supported']);
        }
    }

    private function listRoles() {
        $stmt = $this->conn->query("SELECT * FROM tbl_role");
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add metadata expected by frontend
        foreach($roles as &$role) {
            $role['is_custom'] = false; // Default to system roles
            $role['permission_count'] = 0;
            $role['description'] = 'System Role';
        }

        echo json_encode(['success' => true, 'data' => $roles]);
    }
}

$database = new Database();
$db = $database->getConnection();
$rp = new RolesPermissions($db);
$rp->handleRequest();
?>