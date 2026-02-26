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
        getTrainers($conn);
        break;
    case 'add':
        addTrainer($conn);
        break;
    case 'update':
        updateTrainer($conn);
        break;
    case 'toggle-status':
        toggleStatus($conn);
        break;
    case 'create-account':
        createTrainerAccount($conn);
        break;
    case 'get-qualifications':
        getQualifications($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getTrainers($conn) {
    try {
        $stmt = $conn->query("SELECT 
                                    t.trainer_id,
                                    t.user_id,
                                    t.first_name,
                                    t.last_name,
                                    t.email,
                                    t.phone_number,
                                    t.qualification_id,
                                    t.status,
                                    q_primary.qualification_name AS qualification_name,
                                    COALESCE(
                                        GROUP_CONCAT(DISTINCT q.qualification_name ORDER BY q.qualification_name SEPARATOR ', '),
                                        q_primary.qualification_name
                                    ) AS qualification_names,
                                    CASE 
                                        WHEN COUNT(DISTINCT tq.qualification_id) = 0 AND t.qualification_id IS NOT NULL THEN 1
                                        ELSE COUNT(DISTINCT tq.qualification_id)
                                    END AS qualification_count
                                FROM tbl_trainer t
                                LEFT JOIN tbl_trainer_qualifications tq ON t.trainer_id = tq.trainer_id
                                LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                                LEFT JOIN tbl_qualifications q_primary ON t.qualification_id = q_primary.qualification_id
                                GROUP BY t.trainer_id
                                ORDER BY t.trainer_id DESC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function addTrainer($conn) {
    try {
        $data = $_POST;
        
        if (empty($data['first_name']) || empty($data['last_name'])) {
            throw new Exception('First Name and Last Name are required');
        }

        // Handle File Uploads
        $uploadDir = '../../uploads/trainers/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

        $nttcPath = null;
        $tmPath = null;
        $ncPath = null;
        $expPath = null;

        if (isset($_FILES['nttc_file']) && $_FILES['nttc_file']['error'] === UPLOAD_ERR_OK) {
            $nttcPath = 'nttc_' . time() . '_' . $_FILES['nttc_file']['name'];
            move_uploaded_file($_FILES['nttc_file']['tmp_name'], $uploadDir . $nttcPath);
        }
        if (isset($_FILES['tm_file']) && $_FILES['tm_file']['error'] === UPLOAD_ERR_OK) {
            $tmPath = 'tm_' . time() . '_' . $_FILES['tm_file']['name'];
            move_uploaded_file($_FILES['tm_file']['tmp_name'], $uploadDir . $tmPath);
        }
        if (isset($_FILES['nc_file']) && $_FILES['nc_file']['error'] === UPLOAD_ERR_OK) {
            $ncPath = 'nc_' . time() . '_' . $_FILES['nc_file']['name'];
            move_uploaded_file($_FILES['nc_file']['tmp_name'], $uploadDir . $ncPath);
        }
        if (isset($_FILES['experience_file']) && $_FILES['experience_file']['error'] === UPLOAD_ERR_OK) {
            $expPath = 'exp_' . time() . '_' . $_FILES['experience_file']['name'];
            move_uploaded_file($_FILES['experience_file']['tmp_name'], $uploadDir . $expPath);
        }
        
        $stmt = $conn->prepare("INSERT INTO tbl_trainer (first_name, last_name, email, phone_number, qualification_id, address, nttc_no, nttc_file, tm_file, nc_level, nc_file, experience_file, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')");
        $stmt->execute([
            $data['first_name'],
            $data['last_name'],
            $data['email'] ?? null,
            $data['phone'] ?? null,
            $data['qualification_id'] ?? null,
            $data['address'] ?? null,
            $data['nttc_no'] ?? null,
            $nttcPath,
            $tmPath,
            $data['nc_level'] ?? null,
            $ncPath,
            $expPath
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Trainer added successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateTrainer($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['trainer_id'])) {
            throw new Exception('Trainer ID is required');
        }
        
        $conn->beginTransaction();

        $stmt = $conn->prepare("UPDATE tbl_trainer SET first_name = ?, last_name = ?, email = ?, phone_number = ?, qualification_id = ? WHERE trainer_id = ?");
        $stmt->execute([
            $data['first_name'],
            $data['last_name'],
            $data['email'],
            $data['phone'],
            $data['qualification_id'],
            $data['trainer_id']
        ]);

        // Update Email in Users table if linked
        $stmt = $conn->prepare("SELECT user_id FROM tbl_trainer WHERE trainer_id = ?");
        $stmt->execute([$data['trainer_id']]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($trainer && $trainer['user_id'] && !empty($data['email'])) {
            $stmt = $conn->prepare("UPDATE tbl_users SET email = ? WHERE user_id = ?");
            $stmt->execute([$data['email'], $trainer['user_id']]);
        }
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Trainer updated successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function toggleStatus($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['trainer_id'] ?? null;
        $status = $data['status'] ?? 'active';
        
        if (!$id) throw new Exception('ID required');
        
        $stmt = $conn->prepare("UPDATE tbl_trainer SET status = ? WHERE trainer_id = ?");
        $stmt->execute([$status, $id]);
        
        // Optionally deactivate user account if trainer is archived
        $userStatus = ($status === 'active') ? 'active' : 'inactive';
        $stmtUser = $conn->prepare("UPDATE tbl_users SET status = ? WHERE user_id = (SELECT user_id FROM tbl_trainer WHERE trainer_id = ?)");
        $stmtUser->execute([$userStatus, $id]);
        
        echo json_encode(['success' => true, 'message' => 'Trainer status updated']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function createTrainerAccount($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['trainer_id']) || empty($data['username']) || empty($data['password'])) {
            throw new Exception('Username and Password are required');
        }

        $conn->beginTransaction();

        // 1. Get Trainer Email and check if account exists
        $stmt = $conn->prepare("SELECT email, user_id FROM tbl_trainer WHERE trainer_id = ?");
        $stmt->execute([$data['trainer_id']]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$trainer) throw new Exception('Trainer not found');
        if (!empty($trainer['user_id'])) throw new Exception('Trainer already has an account');

        // Check if username exists
        $stmtCheck = $conn->prepare("SELECT user_id FROM tbl_users WHERE username = ?");
        $stmtCheck->execute([$data['username']]);
        if ($stmtCheck->fetch()) throw new Exception('Username already exists');

        // 2. Get/Create Role ID for 'trainer'
        $stmtRole = $conn->query("SELECT role_id FROM tbl_role WHERE role_name = 'trainer' LIMIT 1");
        $role = $stmtRole->fetch(PDO::FETCH_ASSOC);
        
        if ($role) {
            $roleId = $role['role_id'];
        } else {
            $stmtInsRole = $conn->prepare("INSERT INTO tbl_role (role_name) VALUES ('trainer')");
            $stmtInsRole->execute();
            $roleId = $conn->lastInsertId();
        }

        // 3. Create User
        $hashed = password_hash($data['password'], PASSWORD_DEFAULT);
        $stmtUser = $conn->prepare("INSERT INTO tbl_users (role_id, username, password, email, status, date_created) VALUES (?, ?, ?, ?, 'active', NOW())");
        $stmtUser->execute([$roleId, $data['username'], $hashed, $trainer['email']]);
        $userId = $conn->lastInsertId();

        // 4. Link User to Trainer
        $stmtUpdate = $conn->prepare("UPDATE tbl_trainer SET user_id = ? WHERE trainer_id = ?");
        $stmtUpdate->execute([$userId, $data['trainer_id']]);

        // 5. Send credentials email (best-effort)
        try {
            require_once __DIR__ . '/../../utils/EmailService.php';
            $emailSvc = new EmailService();
            $trainerName = ($trainer['first_name'] ?? '') . ' ' . ($trainer['last_name'] ?? '');
            $sendResult = $emailSvc->sendTrainerAccountCredentials($trainer['email'], trim($trainerName), $data['username'], $data['password']);
            if (!$sendResult['success']) {
                error_log('Trainer account email failed: ' . $sendResult['message']);
            }
        } catch (Exception $e) {
            error_log('Email service error: ' . $e->getMessage());
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Account created successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getQualifications($conn) {
    try {
        $stmt = $conn->query("SELECT qualification_id, qualification_name FROM tbl_qualifications WHERE status = 'active' ORDER BY qualification_name ASC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
