<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
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
        listTrainers($conn);
        break;
    case 'get':
        getTrainer($conn);
        break;
    case 'add':
        addTrainer($conn);
        break;
    case 'update':
        updateTrainer($conn);
        break;
    case 'delete':
        deleteTrainer($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action specified.']);
        http_response_code(400);
        break;
}

function listTrainers($conn) {
    try {
        $stmt = $conn->prepare("SELECT t.trainer_id, t.first_name, t.last_name, t.email, t.qualification_id, q.qualification_name, t.status 
                                FROM tbl_trainer t 
                                LEFT JOIN tbl_qualifications q ON t.qualification_id = q.qualification_id 
                                ORDER BY t.trainer_id DESC");
        $stmt->execute();
        $trainers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $trainers]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error fetching trainers: ' . $e->getMessage()]);
    }
}

function getTrainer($conn) {
    $id = $_GET['id'] ?? 0;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Trainer ID is required.']);
        return;
    }
    try {
        $stmt = $conn->prepare("SELECT t.*, q.qualification_name 
                                FROM tbl_trainer t 
                                LEFT JOIN tbl_qualifications q ON t.qualification_id = q.qualification_id 
                                WHERE t.trainer_id = ?");
        $stmt->execute([$id]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($trainer) {
            echo json_encode(['success' => true, 'data' => $trainer]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Trainer not found.']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function addTrainer($conn) {
    $data = $_POST;
    $files = $_FILES;

    if (empty($data['first_name']) || empty($data['last_name']) || empty($data['email'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'First name, last name, and email are required.']);
        return;
    }

    try {
        $conn->beginTransaction();

        $user_password = password_hash($data['last_name'], PASSWORD_BCRYPT);
        $user_stmt = $conn->prepare("INSERT INTO tbl_users (role_id, username, password, email, status) VALUES (2, ?, ?, ?, 'active')");
        $user_stmt->execute([$data['first_name'], $user_password, $data['email']]);
        $userId = $conn->lastInsertId();

        $file_paths = handleFileUploads($files, $userId);

        $query = "INSERT INTO tbl_trainer (user_id, first_name, last_name, email, phone_number, qualification_id, address, nttc_no, nc_level, nttc_file, tm_file, nc_file, experience_file, status) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')";
        $stmt = $conn->prepare($query);
        $stmt->execute([
            $userId, $data['first_name'], $data['last_name'], $data['email'],
            $data['phone'] ?? null, $data['qualification_id'] ?? null, $data['address'] ?? null,
            $data['nttc_no'] ?? null, $data['nc_level'] ?? null,
            $file_paths['nttc_file'] ?? null, $file_paths['tm_file'] ?? null,
            $file_paths['nc_file'] ?? null, $file_paths['experience_file'] ?? null
        ]);
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Trainer added successfully.']);

    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function updateTrainer($conn) {
    $data = $_POST;
    $files = $_FILES;
    $trainerId = $data['trainer_id'] ?? 0;

    if (!$trainerId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Trainer ID is required.']);
        return;
    }

    try {
        $stmt = $conn->prepare("SELECT user_id, nttc_file, tm_file, nc_file, experience_file FROM tbl_trainer WHERE trainer_id = ?");
        $stmt->execute([$trainerId]);
        $existing_files = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing_files) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Trainer not found.']);
            return;
        }

        $file_paths = handleFileUploads($files, $existing_files['user_id'], $existing_files);

        $query = "UPDATE tbl_trainer SET 
                    first_name = ?, last_name = ?, email = ?, phone_number = ?, qualification_id = ?, address = ?, nttc_no = ?, nc_level = ?, 
                    nttc_file = ?, tm_file = ?, nc_file = ?, experience_file = ?
                  WHERE trainer_id = ?";
        $stmt = $conn->prepare($query);
        $stmt->execute([
            $data['first_name'], $data['last_name'], $data['email'], $data['phone'] ?? null,
            $data['qualification_id'] ?? null, $data['address'] ?? null, $data['nttc_no'] ?? null, $data['nc_level'] ?? null,
            $file_paths['nttc_file'] ?? $existing_files['nttc_file'],
            $file_paths['tm_file'] ?? $existing_files['tm_file'],
            $file_paths['nc_file'] ?? $existing_files['nc_file'],
            $file_paths['experience_file'] ?? $existing_files['experience_file'],
            $trainerId
        ]);

        echo json_encode(['success' => true, 'message' => 'Trainer updated successfully.']);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function deleteTrainer($conn) {
    $id = $_GET['id'] ?? 0;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Trainer ID is required.']);
        return;
    }
    try {
        $conn->beginTransaction();
        $stmt = $conn->prepare("SELECT user_id, nttc_file, tm_file, nc_file, experience_file FROM tbl_trainer WHERE trainer_id = ?");
        $stmt->execute([$id]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($trainer) {
            $delStmt = $conn->prepare("DELETE FROM tbl_trainer WHERE trainer_id = ?");
            $delStmt->execute([$id]);

            $delUserStmt = $conn->prepare("DELETE FROM tbl_users WHERE user_id = ?");
            $delUserStmt->execute([$trainer['user_id']]);

            $upload_dir = '../../../../uploads/trainers/';
            foreach (['nttc_file', 'tm_file', 'nc_file', 'experience_file'] as $file_key) {
                if (!empty($trainer[$file_key]) && file_exists($upload_dir . $trainer[$file_key])) {
                    unlink($upload_dir . $trainer[$file_key]);
                }
            }
        }
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Trainer deleted successfully.']);
    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function handleFileUploads($files, $userId, $existing_files = []) {
    $upload_dir = '../../../../uploads/trainers/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }
    $uploaded_files = [];

    $file_keys = ['nttc_file', 'tm_file', 'nc_file', 'experience_file'];
    foreach ($file_keys as $key) {
        if (isset($files[$key]) && $files[$key]['error'] === UPLOAD_ERR_OK) {
            if (!empty($existing_files[$key]) && file_exists($upload_dir . $existing_files[$key])) {
                unlink($upload_dir . $existing_files[$key]);
            }

            $file_ext = pathinfo($files[$key]['name'], PATHINFO_EXTENSION);
            $new_filename = "{$key}_{$userId}_" . time() . '.' . $file_ext;
            if (move_uploaded_file($files[$key]['tmp_name'], $upload_dir . $new_filename)) {
                $uploaded_files[$key] = $new_filename;
            }
        }
    }
    return $uploaded_files;
}
?>