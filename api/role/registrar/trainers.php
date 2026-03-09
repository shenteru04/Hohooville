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
        try {
            $stmt = $conn->prepare("SELECT 
                                        t.trainer_id,
                                        t.first_name,
                                        t.last_name,
                                        t.email,
                                        t.address,
                                        t.address_id,
                                        t.trainer_nc_level_id,
                                        t.status,
                                        t.qualification_id,
                                        q_primary.qualification_name,
                                        COALESCE(nc_trainer.nc_level_code, nc_q.nc_level_code, t.nc_level) AS nc_level_code,
                                        COALESCE(nc_trainer.nc_level_name, nc_q.nc_level_name, t.nc_level) AS nc_level_name
                                    FROM tbl_trainer t
                                    LEFT JOIN tbl_qualifications q_primary ON t.qualification_id = q_primary.qualification_id
                                    LEFT JOIN tbl_nc_levels nc_trainer ON t.trainer_nc_level_id = nc_trainer.nc_level_id
                                    LEFT JOIN tbl_nc_levels nc_q ON q_primary.nc_level_id = nc_q.nc_level_id
                                    ORDER BY t.trainer_id DESC");
            $stmt->execute();
        } catch (Exception $schemaErr) {
            // Legacy schema fallback (uses string nc_level columns without tbl_nc_levels table).
            $stmt = $conn->prepare("SELECT 
                                        t.trainer_id,
                                        t.first_name,
                                        t.last_name,
                                        t.email,
                                        t.address,
                                        NULL AS address_id,
                                        NULL AS trainer_nc_level_id,
                                        t.status,
                                        t.qualification_id,
                                        q_primary.qualification_name,
                                        t.nc_level AS nc_level_code,
                                        t.nc_level AS nc_level_name
                                    FROM tbl_trainer t
                                    LEFT JOIN tbl_qualifications q_primary ON t.qualification_id = q_primary.qualification_id
                                    ORDER BY t.trainer_id DESC");
            $stmt->execute();
        }
        $trainers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get qualifications and NC levels for each trainer
        foreach ($trainers as &$trainer) {
            hydrateTrainerAddress($conn, $trainer);
            try {
                $qualStmt = $conn->prepare("
                    SELECT DISTINCT q.qualification_name, COALESCE(nc.nc_level_code, nc_q.nc_level_code) AS nc_level_code
                    FROM tbl_trainer_qualifications tq
                    LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                    LEFT JOIN tbl_nc_levels nc ON tq.nc_level_id = nc.nc_level_id
                    LEFT JOIN tbl_nc_levels nc_q ON q.nc_level_id = nc_q.nc_level_id
                    WHERE tq.trainer_id = ?
                ");
                $qualStmt->execute([$trainer['trainer_id']]);
            } catch (Exception $schemaErr) {
                try {
                    $qualStmt = $conn->prepare("
                        SELECT DISTINCT q.qualification_name, COALESCE(tq.nc_level, nc_q.nc_level_code) AS nc_level_code
                        FROM tbl_trainer_qualifications tq
                        LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                        LEFT JOIN tbl_nc_levels nc_q ON q.nc_level_id = nc_q.nc_level_id
                        WHERE tq.trainer_id = ?
                    ");
                    $qualStmt->execute([$trainer['trainer_id']]);
                } catch (Exception $legacyErr) {
                    $qualStmt = $conn->prepare("
                        SELECT DISTINCT q.qualification_name, tq.nc_level AS nc_level_code
                        FROM tbl_trainer_qualifications tq
                        LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                        WHERE tq.trainer_id = ?
                    ");
                    $qualStmt->execute([$trainer['trainer_id']]);
                }
            }
            $qualifications = $qualStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $qualNames = [];
            $ncLevels = [];
            foreach ($qualifications as $qual) {
                if ($qual['qualification_name']) $qualNames[] = $qual['qualification_name'];
                if ($qual['nc_level_code']) $ncLevels[] = $qual['nc_level_code'];
            }
            
            // Add primary qualification  if not already in list
            if ($trainer['qualification_name'] && !in_array($trainer['qualification_name'], $qualNames)) {
                array_unshift($qualNames, $trainer['qualification_name']);
            }
            if ($trainer['nc_level_code'] && !in_array($trainer['nc_level_code'], $ncLevels)) {
                array_unshift($ncLevels, $trainer['nc_level_code']);
            }
            
            $trainer['qualification_names'] = implode(', ', $qualNames);
            $trainer['nc_levels'] = implode(', ', $ncLevels);
            unset($trainer['qualification_name']); // Remove single qual from output
        }
        unset($trainer);
        
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
            try {
                $qualStmt = $conn->prepare("SELECT tq.qualification_id, q.qualification_name, tq.nc_level_id, nc.nc_level_code, nc.nc_level_name, tq.nc_file, tq.experience_file
                                            FROM tbl_trainer_qualifications tq
                                            LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                                            LEFT JOIN tbl_nc_levels nc ON tq.nc_level_id = nc.nc_level_id
                                            WHERE tq.trainer_id = ?
                                            ORDER BY q.qualification_name");
                $qualStmt->execute([$id]);
                $qualifications = $qualStmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $schemaErr) {
                try {
                    $qualStmt = $conn->prepare("SELECT tq.qualification_id, q.qualification_name, NULL AS nc_level_id, tq.nc_level AS nc_level_code, COALESCE(nc.nc_level_name, tq.nc_level) AS nc_level_name, tq.nc_file, tq.experience_file
                                                FROM tbl_trainer_qualifications tq
                                                LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                                                LEFT JOIN tbl_nc_levels nc ON nc.nc_level_code = tq.nc_level
                                                WHERE tq.trainer_id = ?
                                                ORDER BY q.qualification_name");
                    $qualStmt->execute([$id]);
                    $qualifications = $qualStmt->fetchAll(PDO::FETCH_ASSOC);
                } catch (Exception $legacyErr) {
                    $qualStmt = $conn->prepare("SELECT tq.qualification_id, q.qualification_name, NULL AS nc_level_id, tq.nc_level AS nc_level_code, tq.nc_level AS nc_level_name, tq.nc_file, tq.experience_file
                                                FROM tbl_trainer_qualifications tq
                                                LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                                                WHERE tq.trainer_id = ?
                                                ORDER BY q.qualification_name");
                    $qualStmt->execute([$id]);
                    $qualifications = $qualStmt->fetchAll(PDO::FETCH_ASSOC);
                }
            }

            foreach ($qualifications as &$qualification) {
                if (empty($qualification['nc_level_id']) && !empty($qualification['nc_level_code'])) {
                    $qualification['nc_level_id'] = mapNcLevelCodeToId($qualification['nc_level_code']);
                }
                if (empty($qualification['nc_level_name']) && !empty($qualification['nc_level_code'])) {
                    $qualification['nc_level_name'] = $qualification['nc_level_code'];
                }
            }
            unset($qualification);

            hydrateTrainerAddress($conn, $trainer);
            $trainer['qualifications'] = $qualifications;
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

function mapNcLevelCodeToId($code) {
    $normalized = strtoupper(trim((string)$code));
    $mapping = [
        'NC I' => 1,
        'NC II' => 2,
        'NC III' => 3,
        'NC IV' => 4
    ];
    return $mapping[$normalized] ?? null;
}

function resolveNcLevelCode($conn, $ncLevelId) {
    if (empty($ncLevelId)) return null;

    static $cache = [];
    $id = (int)$ncLevelId;
    if (isset($cache[$id])) return $cache[$id];

    try {
        $stmt = $conn->prepare("SELECT nc_level_code FROM tbl_nc_levels WHERE nc_level_id = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!empty($row['nc_level_code'])) {
            $cache[$id] = $row['nc_level_code'];
            return $cache[$id];
        }
    } catch (Exception $e) {
    }

    $fallback = [
        1 => 'NC I',
        2 => 'NC II',
        3 => 'NC III',
        4 => 'NC IV'
    ];
    $cache[$id] = $fallback[$id] ?? null;
    return $cache[$id];
}

function addTrainer($conn) {
    $data = $_POST;
    $files = $_FILES;

    $qualificationIds = $data['qualification_ids'] ?? [];
    $ncLevelIds = $data['nc_level_ids'] ?? [];  // Changed from nc_levels to nc_level_ids
    if (!is_array($qualificationIds)) {
        $qualificationIds = [$qualificationIds];
    }
    if (!is_array($ncLevelIds)) {
        $ncLevelIds = [$ncLevelIds];
    }

    $requiredFields = ['first_name', 'last_name', 'email', 'phone', 'address'];
    foreach ($requiredFields as $field) {
        if (empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'All fields are required.']);
            return;
        }
    }

    $requiredFiles = ['tm_file'];
    foreach ($requiredFiles as $fileKey) {
        if (!isset($files[$fileKey]) || $files[$fileKey]['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Trainer Methodology (TM) certificate is required.']);
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

        if (empty($ncLevelIds[$idx])) {
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
        ensureTrainerAddressSchema($conn);
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
                'nc_level_id' => (int)$ncLevelIds[$idx],
                'nc_level_code' => resolveNcLevelCode($conn, (int)$ncLevelIds[$idx]),
                'nc_file' => $ncFile,
                'experience_file' => $expFile
            ];
        }

        $primaryQualificationId = $qualificationRows[0]['qualification_id'] ?? null;
        $primaryNcLevelId = $qualificationRows[0]['nc_level_id'] ?? null;
        $primaryNcFile = $qualificationRows[0]['nc_file'] ?? null;
        $primaryExpFile = $qualificationRows[0]['experience_file'] ?? null;

        try {
            $query = "INSERT INTO tbl_trainer (user_id, first_name, last_name, email, phone_number, qualification_id, address, nttc_no, nttc_file, tm_file, trainer_nc_level_id, nc_file, experience_file, status) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')";
            $stmt = $conn->prepare($query);
            $stmt->execute([
                $userId, $data['first_name'], $data['last_name'], $data['email'],
                $data['phone'], $primaryQualificationId, $data['address'],
                $data['nttc_no'],
                $file_paths['nttc_file'] ?? null, $file_paths['tm_file'] ?? null,
                $primaryNcLevelId,
                $qualificationRows[0]['nc_file'], $qualificationRows[0]['experience_file']
            ]);
        } catch (Exception $schemaErr) {
            $query = "INSERT INTO tbl_trainer (user_id, first_name, last_name, email, phone_number, qualification_id, address, nttc_no, nttc_file, tm_file, nc_level, nc_file, experience_file, status) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')";
            $stmt = $conn->prepare($query);
            $stmt->execute([
                $userId, $data['first_name'], $data['last_name'], $data['email'],
                $data['phone'], $primaryQualificationId, $data['address'],
                $data['nttc_no'],
                $file_paths['nttc_file'] ?? null, $file_paths['tm_file'] ?? null,
                $qualificationRows[0]['nc_level_code'] ?? null,
                $qualificationRows[0]['nc_file'], $qualificationRows[0]['experience_file']
            ]);
        }

        $trainerId = $conn->lastInsertId();
        try {
            $qualStmt = $conn->prepare("INSERT INTO tbl_trainer_qualifications (trainer_id, qualification_id, nc_level_id, nc_file, experience_file) VALUES (?, ?, ?, ?, ?)");
            foreach ($qualificationRows as $row) {
                $qualStmt->execute([
                    $trainerId,
                    $row['qualification_id'],
                    $row['nc_level_id'],
                    $row['nc_file'],
                    $row['experience_file']
                ]);
            }
        } catch (Exception $schemaErr) {
            $qualStmt = $conn->prepare("INSERT INTO tbl_trainer_qualifications (trainer_id, qualification_id, nc_level, nc_file, experience_file) VALUES (?, ?, ?, ?, ?)");
            foreach ($qualificationRows as $row) {
                $qualStmt->execute([
                    $trainerId,
                    $row['qualification_id'],
                    $row['nc_level_code'] ?? null,
                    $row['nc_file'],
                    $row['experience_file']
                ]);
            }
        }

        saveTrainerAddressAndLink($conn, $trainerId, $data, $data['address'] ?? null, null);
        
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
    $ncLevelIds = $data['nc_level_ids'] ?? [];  // Changed from nc_levels to nc_level_ids
    if (!is_array($qualificationIds)) {
        $qualificationIds = [$qualificationIds];
    }
    if (!is_array($ncLevelIds)) {
        $ncLevelIds = [$ncLevelIds];
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

        if (empty($ncLevelIds[$idx])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'NC Level is required for each qualification.']);
            return;
        }
    }

    try {
        ensureTrainerAddressSchema($conn);
        $stmt = $conn->prepare("SELECT user_id, nttc_file, tm_file FROM tbl_trainer WHERE trainer_id = ?");
        $stmt->execute([$trainerId]);
        $existing_files = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing_files) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Trainer not found.']);
            return;
        }
        $existingAddressId = getTrainerAddressId($conn, (int)$trainerId);

        try {
            $existingQualStmt = $conn->prepare("SELECT qualification_id, nc_level_id, nc_file, experience_file FROM tbl_trainer_qualifications WHERE trainer_id = ?");
            $existingQualStmt->execute([$trainerId]);
            $existingQuals = $existingQualStmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $schemaErr) {
            $existingQualStmt = $conn->prepare("SELECT qualification_id, nc_level, nc_file, experience_file FROM tbl_trainer_qualifications WHERE trainer_id = ?");
            $existingQualStmt->execute([$trainerId]);
            $existingQuals = $existingQualStmt->fetchAll(PDO::FETCH_ASSOC);
        }
        $existingQualMap = [];
        foreach ($existingQuals as $row) {
            if (!isset($row['nc_level_id']) && isset($row['nc_level'])) {
                $row['nc_level_id'] = mapNcLevelCodeToId($row['nc_level']);
            }
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
                'nc_level_id' => (int)$ncLevelIds[$idx] ?? null,
                'nc_level_code' => resolveNcLevelCode($conn, (int)$ncLevelIds[$idx]),
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

        $primaryQualificationId = $qualificationRows[0]['qualification_id'] ?? null;
        $primaryNcLevelId = $qualificationRows[0]['nc_level_id'] ?? null;
        $primaryNcLevelCode = $qualificationRows[0]['nc_level_code'] ?? null;
        $primaryNcFile = $qualificationRows[0]['nc_file'] ?? null;
        $primaryExpFile = $qualificationRows[0]['experience_file'] ?? null;
        try {
            $query = "UPDATE tbl_trainer SET 
                        first_name = ?, last_name = ?, email = ?, phone_number = ?, qualification_id = ?, address = ?, nttc_no = ?, trainer_nc_level_id = ?, 
                        nttc_file = ?, tm_file = ?, nc_file = ?, experience_file = ?
                      WHERE trainer_id = ?";
            $stmt = $conn->prepare($query);
            $stmt->execute([
                $data['first_name'], $data['last_name'], $data['email'], $data['phone'] ?? null,
                $primaryQualificationId, $data['address'] ?? null, $data['nttc_no'] ?? null, $primaryNcLevelId,
                $file_paths['nttc_file'] ?? $existing_files['nttc_file'],
                $file_paths['tm_file'] ?? $existing_files['tm_file'],
                $primaryNcFile,
                $primaryExpFile,
                $trainerId
            ]);
        } catch (Exception $schemaErr) {
            $query = "UPDATE tbl_trainer SET 
                        first_name = ?, last_name = ?, email = ?, phone_number = ?, qualification_id = ?, address = ?, nttc_no = ?, nc_level = ?, 
                        nttc_file = ?, tm_file = ?, nc_file = ?, experience_file = ?
                      WHERE trainer_id = ?";
            $stmt = $conn->prepare($query);
            $stmt->execute([
                $data['first_name'], $data['last_name'], $data['email'], $data['phone'] ?? null,
                $primaryQualificationId, $data['address'] ?? null, $data['nttc_no'] ?? null, $primaryNcLevelCode,
                $file_paths['nttc_file'] ?? $existing_files['nttc_file'],
                $file_paths['tm_file'] ?? $existing_files['tm_file'],
                $primaryNcFile,
                $primaryExpFile,
                $trainerId
            ]);
        }

        $delQualStmt = $conn->prepare("DELETE FROM tbl_trainer_qualifications WHERE trainer_id = ?");
        $delQualStmt->execute([$trainerId]);
        try {
            $qualStmt = $conn->prepare("INSERT INTO tbl_trainer_qualifications (trainer_id, qualification_id, nc_level_id, nc_file, experience_file) VALUES (?, ?, ?, ?, ?)");
            foreach ($qualificationRows as $row) {
                $qualStmt->execute([
                    $trainerId,
                    $row['qualification_id'],
                    $row['nc_level_id'],
                    $row['nc_file'],
                    $row['experience_file']
                ]);
            }
        } catch (Exception $schemaErr) {
            $qualStmt = $conn->prepare("INSERT INTO tbl_trainer_qualifications (trainer_id, qualification_id, nc_level, nc_file, experience_file) VALUES (?, ?, ?, ?, ?)");
            foreach ($qualificationRows as $row) {
                $qualStmt->execute([
                    $trainerId,
                    $row['qualification_id'],
                    $row['nc_level_code'] ?? null,
                    $row['nc_file'],
                    $row['experience_file']
                ]);
            }
        }

        saveTrainerAddressAndLink($conn, (int)$trainerId, $data, $data['address'] ?? null, $existingAddressId);

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

function getTrainerAddressId($conn, $trainerId) {
    try {
        $stmt = $conn->prepare("SELECT address_id FROM tbl_trainer WHERE trainer_id = ?");
        $stmt->execute([(int)$trainerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return isset($row['address_id']) ? (int)$row['address_id'] : null;
    } catch (Exception $e) {
        return null;
    }
}

function ensureTrainerAddressSchema($conn) {
    static $done = false;
    if ($done) return;

    try {
        $conn->exec("CREATE TABLE IF NOT EXISTS tbl_trainer_address (
            address_id INT AUTO_INCREMENT PRIMARY KEY,
            house_no_street VARCHAR(255) NULL,
            barangay VARCHAR(255) NULL,
            district VARCHAR(255) NULL,
            city_municipality VARCHAR(255) NULL,
            province VARCHAR(255) NULL,
            region VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");
    } catch (Exception $e) {
    }

    try { $conn->exec("ALTER TABLE tbl_trainer ADD COLUMN address_id INT NULL"); } catch (Exception $e) {}
    try { $conn->exec("ALTER TABLE tbl_trainer ADD INDEX idx_trainer_address_id (address_id)"); } catch (Exception $e) {}
    try { $conn->exec("ALTER TABLE tbl_trainer ADD CONSTRAINT fk_trainer_address FOREIGN KEY (address_id) REFERENCES tbl_trainer_address(address_id) ON DELETE SET NULL ON UPDATE CASCADE"); } catch (Exception $e) {}

    $done = true;
}

function parseLegacyAddressString($address) {
    $result = [
        'house_no_street' => null,
        'barangay' => null,
        'district' => null,
        'city_municipality' => null,
        'province' => null,
        'region' => null
    ];
    if (empty($address)) return $result;

    $parts = array_values(array_filter(array_map('trim', explode(',', (string)$address))));
    if (empty($parts)) return $result;

    $last = $parts[count($parts) - 1] ?? '';
    $hasRegion = preg_match('/^region\b/i', $last) === 1;
    if ($hasRegion) {
        $result['region'] = array_pop($parts);
    }

    if (count($parts) >= 5) {
        [$result['house_no_street'], $result['barangay'], $result['district'], $result['city_municipality'], $result['province']] = array_slice($parts, 0, 5);
    } else if (count($parts) === 4) {
        [$result['house_no_street'], $result['barangay'], $result['city_municipality'], $result['province']] = $parts;
    } else if (count($parts) === 3) {
        [$result['barangay'], $result['city_municipality'], $result['province']] = $parts;
    } else if (count($parts) === 2) {
        [$result['city_municipality'], $result['province']] = $parts;
    } else if (count($parts) === 1) {
        $result['province'] = $parts[0];
    }

    if (empty($result['district']) && !empty($result['city_municipality'])) {
        $result['district'] = $result['city_municipality'];
    }

    return $result;
}

function extractAddressParts($data, $fallbackAddress = null) {
    $parts = [
        'house_no_street' => trim((string)($data['address_house'] ?? $data['house_no_street'] ?? '')),
        'barangay' => trim((string)($data['address_barangay'] ?? $data['barangay'] ?? '')),
        'district' => trim((string)($data['address_district'] ?? $data['district'] ?? '')),
        'city_municipality' => trim((string)($data['address_city'] ?? $data['city_municipality'] ?? '')),
        'province' => trim((string)($data['address_province'] ?? $data['province'] ?? '')),
        'region' => trim((string)($data['address_region'] ?? $data['region'] ?? ''))
    ];

    $hasAny = implode('', $parts) !== '';
    if (!$hasAny) {
        $parts = parseLegacyAddressString($fallbackAddress ?? ($data['address'] ?? null));
    }
    if (empty($parts['district']) && !empty($parts['city_municipality'])) {
        $parts['district'] = $parts['city_municipality'];
    }
    return $parts;
}

function buildFullAddressFromParts($parts) {
    $ordered = [
        $parts['house_no_street'] ?? null,
        $parts['barangay'] ?? null,
        $parts['district'] ?? null,
        $parts['city_municipality'] ?? null,
        $parts['province'] ?? null,
        $parts['region'] ?? null
    ];
    $filtered = array_values(array_filter(array_map(function ($value) {
        return trim((string)$value);
    }, $ordered)));
    return implode(', ', $filtered);
}

function saveTrainerAddressAndLink($conn, $trainerId, $data, $fallbackAddress = null, $existingAddressId = null) {
    $parts = extractAddressParts($data, $fallbackAddress);
    $fullAddress = buildFullAddressFromParts($parts);
    if ($fullAddress === '') {
        return null;
    }

    $addressId = $existingAddressId ? (int)$existingAddressId : null;
    try {
        if ($addressId) {
            $stmt = $conn->prepare("UPDATE tbl_trainer_address 
                                    SET house_no_street = ?, barangay = ?, district = ?, city_municipality = ?, province = ?, region = ?
                                    WHERE address_id = ?");
            $stmt->execute([
                $parts['house_no_street'] ?: null,
                $parts['barangay'] ?: null,
                $parts['district'] ?: null,
                $parts['city_municipality'] ?: null,
                $parts['province'] ?: null,
                $parts['region'] ?: null,
                $addressId
            ]);
        } else {
            $stmt = $conn->prepare("INSERT INTO tbl_trainer_address (house_no_street, barangay, district, city_municipality, province, region) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $parts['house_no_street'] ?: null,
                $parts['barangay'] ?: null,
                $parts['district'] ?: null,
                $parts['city_municipality'] ?: null,
                $parts['province'] ?: null,
                $parts['region'] ?: null
            ]);
            $addressId = (int)$conn->lastInsertId();
        }
    } catch (Exception $e) {
    }

    if ($addressId) {
        try {
            $stmt = $conn->prepare("UPDATE tbl_trainer SET address_id = ?, address = ? WHERE trainer_id = ?");
            $stmt->execute([$addressId, $fullAddress, (int)$trainerId]);
        } catch (Exception $e) {
            try {
                $stmt = $conn->prepare("UPDATE tbl_trainer SET address = ? WHERE trainer_id = ?");
                $stmt->execute([$fullAddress, (int)$trainerId]);
            } catch (Exception $ignored) {}
        }
    } else {
        try {
            $stmt = $conn->prepare("UPDATE tbl_trainer SET address = ? WHERE trainer_id = ?");
            $stmt->execute([$fullAddress, (int)$trainerId]);
        } catch (Exception $ignored) {}
    }
    return $addressId;
}

function hydrateTrainerAddress($conn, &$trainer) {
    if (!is_array($trainer)) return;

    $trainer['house_no_street'] = $trainer['house_no_street'] ?? null;
    $trainer['barangay'] = $trainer['barangay'] ?? null;
    $trainer['district'] = $trainer['district'] ?? null;
    $trainer['city_municipality'] = $trainer['city_municipality'] ?? null;
    $trainer['province'] = $trainer['province'] ?? null;
    $trainer['region'] = $trainer['region'] ?? null;

    $addressId = $trainer['address_id'] ?? null;
    if (!empty($addressId)) {
        try {
            $stmt = $conn->prepare("SELECT house_no_street, barangay, district, city_municipality, province, region FROM tbl_trainer_address WHERE address_id = ? LIMIT 1");
            $stmt->execute([(int)$addressId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $trainer['house_no_street'] = $row['house_no_street'] ?? null;
                $trainer['barangay'] = $row['barangay'] ?? null;
                $trainer['district'] = $row['district'] ?? null;
                $trainer['city_municipality'] = $row['city_municipality'] ?? null;
                $trainer['province'] = $row['province'] ?? null;
                $trainer['region'] = $row['region'] ?? null;
            }
        } catch (Exception $e) {
        }
    }

    $hasStructured = !empty($trainer['house_no_street']) || !empty($trainer['barangay']) || !empty($trainer['district']) || !empty($trainer['city_municipality']) || !empty($trainer['province']) || !empty($trainer['region']);
    if (!$hasStructured) {
        $legacy = parseLegacyAddressString($trainer['address'] ?? null);
        foreach ($legacy as $key => $value) {
            if (empty($trainer[$key]) && !empty($value)) {
                $trainer[$key] = $value;
            }
        }
    }

    $computed = buildFullAddressFromParts($trainer);
    if (!empty($computed)) {
        $trainer['address'] = $computed;
    }
}
?>
