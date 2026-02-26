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
        $stmt = $conn->prepare("SELECT 
                                    t.trainer_id,
                                    t.first_name,
                                    t.last_name,
                                    t.email,
                                    t.status,
                                    COALESCE(
                                        GROUP_CONCAT(DISTINCT q.qualification_name ORDER BY q.qualification_name SEPARATOR ', '),
                                        q_primary.qualification_name
                                    ) AS qualification_names,
                                    COALESCE(
                                        GROUP_CONCAT(DISTINCT tq.qualification_id ORDER BY tq.qualification_id SEPARATOR ','),
                                        IFNULL(t.qualification_id, '')
                                    ) AS qualification_ids
                                FROM tbl_trainer t
                                LEFT JOIN tbl_trainer_qualifications tq ON t.trainer_id = tq.trainer_id
                                LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                                LEFT JOIN tbl_qualifications q_primary ON t.qualification_id = q_primary.qualification_id
                                GROUP BY t.trainer_id
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
        $stmt = $conn->prepare("SELECT 
                                    t.*,
                                    COALESCE(
                                        GROUP_CONCAT(DISTINCT q.qualification_name ORDER BY q.qualification_name SEPARATOR ', '),
                                        q_primary.qualification_name
                                    ) AS qualification_names,
                                    COALESCE(
                                        GROUP_CONCAT(DISTINCT tq.qualification_id ORDER BY tq.qualification_id SEPARATOR ','),
                                        IFNULL(t.qualification_id, '')
                                    ) AS qualification_ids
                                FROM tbl_trainer t
                                LEFT JOIN tbl_trainer_qualifications tq ON t.trainer_id = tq.trainer_id
                                LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                                LEFT JOIN tbl_qualifications q_primary ON t.qualification_id = q_primary.qualification_id
                                WHERE t.trainer_id = ?
                                GROUP BY t.trainer_id");
        $stmt->execute([$id]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($trainer) {
            if (!empty($trainer['qualification_ids'])) {
                $trainer['qualification_ids'] = array_values(array_filter(array_map('intval', explode(',', $trainer['qualification_ids']))));
            } else {
                $trainer['qualification_ids'] = [];
            }
            $qualStmt = $conn->prepare("SELECT tq.qualification_id, q.qualification_name, tq.nc_level, tq.nc_file, tq.experience_file
                                        FROM tbl_trainer_qualifications tq
                                        LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                                        WHERE tq.trainer_id = ?
                                        ORDER BY q.qualification_name");
            $qualStmt->execute([$id]);
            $trainer['qualifications'] = $qualStmt->fetchAll(PDO::FETCH_ASSOC);
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

    $qualificationIds = $data['qualification_ids'] ?? [];
    $ncLevels = $data['nc_levels'] ?? [];
    if (!is_array($qualificationIds)) {
        $qualificationIds = [$qualificationIds];
    }
    if (!is_array($ncLevels)) {
        $ncLevels = [$ncLevels];
    }

    $requiredFields = ['first_name', 'last_name', 'email', 'phone', 'address', 'nttc_no'];
    foreach ($requiredFields as $field) {
        if (empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'All fields are required.']);
            return;
        }
    }

    $requiredFiles = ['nttc_file', 'tm_file'];
    foreach ($requiredFiles as $fileKey) {
        if (!isset($files[$fileKey]) || $files[$fileKey]['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'All documents are required.']);
            return;
        }
    }

    if (empty($qualificationIds)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'At least one qualification is required.']);
        return;
    }

    $seenQualifications = [];
    foreach ($qualificationIds as $idx => $qid) {
        if (empty($qid)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Qualification is required.']);
            return;
        }
        if (isset($seenQualifications[$qid])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Duplicate qualifications are not allowed.']);
            return;
        }
        $seenQualifications[$qid] = true;

        if (empty($ncLevels[$idx])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'NC Level is required for each qualification.']);
            return;
        }

        $ncFile = getIndexedFile($files, 'nc_files', $idx);
        if (!$ncFile || $ncFile['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'NC Certificate is required for each qualification.']);
            return;
        }
    }

    try {
        $conn->beginTransaction();

        $user_password = password_hash($data['last_name'], PASSWORD_BCRYPT);
        $user_stmt = $conn->prepare("INSERT INTO tbl_users (role_id, username, password, email, status) VALUES (2, ?, ?, ?, 'active')");
        $user_stmt->execute([$data['first_name'], $user_password, $data['email']]);
        $userId = $conn->lastInsertId();

        $file_paths = handleTrainerFileUploads($files, $userId);

        $qualificationRows = [];
        foreach ($qualificationIds as $idx => $qid) {
            $ncFile = uploadIndexedFile($files, 'nc_files', $idx, $userId, 'nc');
            $expFile = uploadIndexedFile($files, 'experience_files', $idx, $userId, 'exp');
            $qualificationRows[] = [
                'qualification_id' => (int)$qid,
                'nc_level' => $ncLevels[$idx],
                'nc_file' => $ncFile,
                'experience_file' => $expFile
            ];
        }

        $primaryQualificationId = $qualificationRows[0]['qualification_id'] ?? null;
        $primaryNcLevel = $qualificationRows[0]['nc_level'] ?? null;
        $primaryNcFile = $qualificationRows[0]['nc_file'] ?? null;
        $primaryExpFile = $qualificationRows[0]['experience_file'] ?? null;

        $query = "INSERT INTO tbl_trainer (user_id, first_name, last_name, email, phone_number, qualification_id, address, nttc_no, nc_level, nttc_file, tm_file, nc_file, experience_file, status) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')";
        $stmt = $conn->prepare($query);
        $stmt->execute([
            $userId, $data['first_name'], $data['last_name'], $data['email'],
            $data['phone'], $primaryQualificationId, $data['address'],
            $data['nttc_no'], $primaryNcLevel,
            $file_paths['nttc_file'] ?? null, $file_paths['tm_file'] ?? null,
            $primaryNcFile, $primaryExpFile
        ]);

        $trainerId = $conn->lastInsertId();
        $qualStmt = $conn->prepare("INSERT INTO tbl_trainer_qualifications (trainer_id, qualification_id, nc_level, nc_file, experience_file) VALUES (?, ?, ?, ?, ?)");
        foreach ($qualificationRows as $row) {
            $qualStmt->execute([
                $trainerId,
                $row['qualification_id'],
                $row['nc_level'],
                $row['nc_file'],
                $row['experience_file']
            ]);
        }
        
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
    $qualificationIds = $data['qualification_ids'] ?? [];
    $ncLevels = $data['nc_levels'] ?? [];
    if (!is_array($qualificationIds)) {
        $qualificationIds = [$qualificationIds];
    }
    if (!is_array($ncLevels)) {
        $ncLevels = [$ncLevels];
    }

    if (!$trainerId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Trainer ID is required.']);
        return;
    }
    if (empty($qualificationIds)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'At least one qualification is required.']);
        return;
    }

    $seenQualifications = [];
    foreach ($qualificationIds as $idx => $qid) {
        if (empty($qid)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Qualification is required.']);
            return;
        }
        if (isset($seenQualifications[$qid])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Duplicate qualifications are not allowed.']);
            return;
        }
        $seenQualifications[$qid] = true;

        if (empty($ncLevels[$idx])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'NC Level is required for each qualification.']);
            return;
        }
    }

    try {
        $stmt = $conn->prepare("SELECT user_id, nttc_file, tm_file FROM tbl_trainer WHERE trainer_id = ?");
        $stmt->execute([$trainerId]);
        $existing_files = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing_files) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Trainer not found.']);
            return;
        }

        $existingQualStmt = $conn->prepare("SELECT qualification_id, nc_level, nc_file, experience_file FROM tbl_trainer_qualifications WHERE trainer_id = ?");
        $existingQualStmt->execute([$trainerId]);
        $existingQuals = $existingQualStmt->fetchAll(PDO::FETCH_ASSOC);
        $existingQualMap = [];
        foreach ($existingQuals as $row) {
            $existingQualMap[$row['qualification_id']] = $row;
        }

        $file_paths = handleTrainerFileUploads($files, $existing_files['user_id'], $existing_files);

        $qualificationRows = [];
        foreach ($qualificationIds as $idx => $qid) {
            $qid = (int)$qid;
            $existing = $existingQualMap[$qid] ?? null;
            $ncFile = uploadIndexedFile($files, 'nc_files', $idx, $existing_files['user_id'], 'nc', $existing['nc_file'] ?? null);
            $expFile = uploadIndexedFile($files, 'experience_files', $idx, $existing_files['user_id'], 'exp', $existing['experience_file'] ?? null);
            $qualificationRows[] = [
                'qualification_id' => $qid,
                'nc_level' => $ncLevels[$idx] ?? null,
                'nc_file' => $ncFile,
                'experience_file' => $expFile
            ];
        }

        $submittedIds = array_map('intval', $qualificationIds);
        foreach ($existingQualMap as $qid => $row) {
            if (!in_array((int)$qid, $submittedIds, true)) {
                deleteFileIfExists($row['nc_file']);
                deleteFileIfExists($row['experience_file']);
            }
        }

        $query = "UPDATE tbl_trainer SET 
                    first_name = ?, last_name = ?, email = ?, phone_number = ?, qualification_id = ?, address = ?, nttc_no = ?, nc_level = ?, 
                    nttc_file = ?, tm_file = ?, nc_file = ?, experience_file = ?
                  WHERE trainer_id = ?";
        $primaryQualificationId = $qualificationRows[0]['qualification_id'] ?? null;
        $primaryNcLevel = $qualificationRows[0]['nc_level'] ?? null;
        $primaryNcFile = $qualificationRows[0]['nc_file'] ?? null;
        $primaryExpFile = $qualificationRows[0]['experience_file'] ?? null;
        $stmt = $conn->prepare($query);
        $stmt->execute([
            $data['first_name'], $data['last_name'], $data['email'], $data['phone'] ?? null,
            $primaryQualificationId, $data['address'] ?? null, $data['nttc_no'] ?? null, $primaryNcLevel,
            $file_paths['nttc_file'] ?? $existing_files['nttc_file'],
            $file_paths['tm_file'] ?? $existing_files['tm_file'],
            $primaryNcFile,
            $primaryExpFile,
            $trainerId
        ]);

        $delQualStmt = $conn->prepare("DELETE FROM tbl_trainer_qualifications WHERE trainer_id = ?");
        $delQualStmt->execute([$trainerId]);
        $qualStmt = $conn->prepare("INSERT INTO tbl_trainer_qualifications (trainer_id, qualification_id, nc_level, nc_file, experience_file) VALUES (?, ?, ?, ?, ?)");
        foreach ($qualificationRows as $row) {
            $qualStmt->execute([
                $trainerId,
                $row['qualification_id'],
                $row['nc_level'],
                $row['nc_file'],
                $row['experience_file']
            ]);
        }

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
        $stmt = $conn->prepare("SELECT user_id, nttc_file, tm_file FROM tbl_trainer WHERE trainer_id = ?");
        $stmt->execute([$id]);
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($trainer) {
            $qualStmt = $conn->prepare("SELECT nc_file, experience_file FROM tbl_trainer_qualifications WHERE trainer_id = ?");
            $qualStmt->execute([$id]);
            $qualFiles = $qualStmt->fetchAll(PDO::FETCH_ASSOC);

            $delStmt = $conn->prepare("DELETE FROM tbl_trainer WHERE trainer_id = ?");
            $delStmt->execute([$id]);

            $delUserStmt = $conn->prepare("DELETE FROM tbl_users WHERE user_id = ?");
            $delUserStmt->execute([$trainer['user_id']]);

            $upload_dir = '../../../../uploads/trainers/';
            foreach (['nttc_file', 'tm_file'] as $file_key) {
                if (!empty($trainer[$file_key]) && file_exists($upload_dir . $trainer[$file_key])) {
                    unlink($upload_dir . $trainer[$file_key]);
                }
            }
            foreach ($qualFiles as $row) {
                if (!empty($row['nc_file']) && file_exists($upload_dir . $row['nc_file'])) {
                    unlink($upload_dir . $row['nc_file']);
                }
                if (!empty($row['experience_file']) && file_exists($upload_dir . $row['experience_file'])) {
                    unlink($upload_dir . $row['experience_file']);
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

function handleTrainerFileUploads($files, $userId, $existing_files = []) {
    $upload_dir = '../../../../uploads/trainers/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }
    $uploaded_files = [];

    $file_keys = ['nttc_file', 'tm_file'];
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

function getIndexedFile($files, $key, $index) {
    if (!isset($files[$key]['error'][$index])) {
        return null;
    }
    return [
        'name' => $files[$key]['name'][$index] ?? null,
        'type' => $files[$key]['type'][$index] ?? null,
        'tmp_name' => $files[$key]['tmp_name'][$index] ?? null,
        'error' => $files[$key]['error'][$index] ?? UPLOAD_ERR_NO_FILE,
        'size' => $files[$key]['size'][$index] ?? 0
    ];
}

function uploadIndexedFile($files, $key, $index, $userId, $prefix, $existingFile = null) {
    $upload_dir = '../../../../uploads/trainers/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }

    $file = getIndexedFile($files, $key, $index);
    if (!$file || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return $existingFile;
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return $existingFile;
    }

    if (!empty($existingFile) && file_exists($upload_dir . $existingFile)) {
        unlink($upload_dir . $existingFile);
    }

    $file_ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $new_filename = "{$prefix}_{$userId}_" . time() . '_' . $index . '.' . $file_ext;
    if (move_uploaded_file($file['tmp_name'], $upload_dir . $new_filename)) {
        return $new_filename;
    }

    return $existingFile;
}

function deleteFileIfExists($filename) {
    if (!$filename) return;
    $upload_dir = '../../../../uploads/trainers/';
    $path = $upload_dir . $filename;
    if (file_exists($path)) {
        unlink($path);
    }
}
?>
