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

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

try {
    switch ($action) {
        case 'change-password':
            changePassword($conn);
            break;
        case 'get-system-settings':
            getSystemSettings($conn);
            break;
        case 'update-system':
            updateSystemSettings($conn);
            break;
        case 'backup-database':
            backupDatabase($conn);
            break;
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function changePassword($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['user_id']) || empty($data['current_password']) || empty($data['new_password'])) {
        throw new Exception('All fields are required');
    }

    $stmt = $conn->prepare("SELECT password FROM tbl_users WHERE user_id = ?");
    $stmt->execute([$data['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($data['current_password'], $user['password'])) {
        throw new Exception('Incorrect current password');
    }

    $newHash = password_hash($data['new_password'], PASSWORD_DEFAULT);
    $updateStmt = $conn->prepare("UPDATE tbl_users SET password = ? WHERE user_id = ?");
    
    if ($updateStmt->execute([$newHash, $data['user_id']])) {
        echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
    } else {
        throw new Exception('Failed to update password');
    }
}

function getSystemSettings($conn) {
    $stmt = $conn->query("SELECT setting_key, setting_value FROM tbl_system_settings");
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // Provide defaults if empty
    $defaults = [
        'default_batch_size' => '20',
        'session_timeout' => '60',
        'email_notifications' => '1'
    ];
    
    $result = array_merge($defaults, $settings);
    echo json_encode(['success' => true, 'data' => $result]);
}

function updateSystemSettings($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $conn->beginTransaction();
    try {
        $stmt = $conn->prepare("INSERT INTO tbl_system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        
        foreach ($data as $key => $value) {
            $stmt->execute([$key, $value]);
        }
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Settings saved successfully']);
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
}

function backupDatabase($conn) {
    // Simple SQL Dump generation
    $tables = [];
    $stmt = $conn->query("SHOW TABLES");
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        $tables[] = $row[0];
    }

    $sqlScript = "-- Database Backup\n-- Generated: " . date('Y-m-d H:i:s') . "\n\n";
    $sqlScript .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

    foreach ($tables as $table) {
        // Structure
        $row = $conn->query("SHOW CREATE TABLE $table")->fetch(PDO::FETCH_NUM);
        $sqlScript .= "\n\n" . $row[1] . ";\n\n";

        // Data
        $rows = $conn->query("SELECT * FROM $table");
        $columnCount = $rows->columnCount();

        while ($row = $rows->fetch(PDO::FETCH_NUM)) {
            $sqlScript .= "INSERT INTO $table VALUES(";
            for ($j = 0; $j < $columnCount; $j++) {
                $row[$j] = addslashes($row[$j]);
                $row[$j] = str_replace("\n", "\\n", $row[$j]);
                if (isset($row[$j])) {
                    $sqlScript .= '"' . $row[$j] . '"';
                } else {
                    $sqlScript .= '""';
                }
                if ($j < ($columnCount - 1)) {
                    $sqlScript .= ',';
                }
            }
            $sqlScript .= ");\n";
        }
    }
    
    $sqlScript .= "\nSET FOREIGN_KEY_CHECKS=1;";

    echo json_encode(['success' => true, 'data' => $sqlScript]);
}
?>
