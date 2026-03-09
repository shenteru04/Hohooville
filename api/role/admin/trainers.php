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
    case 'get':
        getTrainer($conn);
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
        try {
            $stmt = $conn->query("SELECT 
                                        t.trainer_id,
                                        t.user_id,
                                        t.first_name,
                                        t.last_name,
                                        t.email,
                                        t.phone_number,
                                        t.address,
                                        t.address_id,
                                        t.qualification_id,
                                        t.trainer_nc_level_id,
                                        t.status,
                                        q_primary.qualification_name,
                                        COALESCE(nc_trainer.nc_level_code, nc_q.nc_level_code, t.nc_level) AS nc_level_code,
                                        COALESCE(nc_trainer.nc_level_name, nc_q.nc_level_name, t.nc_level) AS nc_level_name
                                    FROM tbl_trainer t
                                    LEFT JOIN tbl_qualifications q_primary ON t.qualification_id = q_primary.qualification_id
                                    LEFT JOIN tbl_nc_levels nc_trainer ON t.trainer_nc_level_id = nc_trainer.nc_level_id
                                    LEFT JOIN tbl_nc_levels nc_q ON q_primary.nc_level_id = nc_q.nc_level_id
                                    ORDER BY t.trainer_id DESC");
        } catch (Exception $schemaErr) {
            // Legacy schema fallback (uses string nc_level columns without tbl_nc_levels table).
            $stmt = $conn->query("SELECT 
                                        t.trainer_id,
                                        t.user_id,
                                        t.first_name,
                                        t.last_name,
                                        t.email,
                                        t.phone_number,
                                        t.address,
                                        NULL AS address_id,
                                        t.qualification_id,
                                        NULL AS trainer_nc_level_id,
                                        t.status,
                                        q_primary.qualification_name,
                                        t.nc_level AS nc_level_code,
                                        t.nc_level AS nc_level_name
                                    FROM tbl_trainer t
                                    LEFT JOIN tbl_qualifications q_primary ON t.qualification_id = q_primary.qualification_id
                                    ORDER BY t.trainer_id DESC");
        }
        $trainers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get additional qualifications and NC levels for each trainer
        foreach ($trainers as &$trainer) {
            hydrateTrainerAddress($conn, $trainer);
            $qualStmt = $conn->prepare("
                SELECT COUNT(DISTINCT tq.qualification_id) AS qual_count
                FROM tbl_trainer_qualifications tq
                WHERE tq.trainer_id = ?
            ");
            $qualStmt->execute([$trainer['trainer_id']]);
            $result = $qualStmt->fetch(PDO::FETCH_ASSOC);
            $additional_count = $result['qual_count'] ?? 0;
            
            // Qualification count: includes additional qualifications plus primary
            $trainer['qualification_count'] = $additional_count;
            if ($trainer['qualification_id'] && $additional_count == 0) {
                $trainer['qualification_count'] = 1;
            }
            
            // Get all qualification and NC level names
            try {
                $allQualStmt = $conn->prepare("
                    SELECT DISTINCT q.qualification_name, COALESCE(nc.nc_level_code, nc_q.nc_level_code) AS nc_level_code
                    FROM tbl_trainer_qualifications tq
                    LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                    LEFT JOIN tbl_nc_levels nc ON tq.nc_level_id = nc.nc_level_id
                    LEFT JOIN tbl_nc_levels nc_q ON q.nc_level_id = nc_q.nc_level_id
                    WHERE tq.trainer_id = ?
                    UNION
                    SELECT q.qualification_name, nc.nc_level_code
                    FROM tbl_qualifications q
                    LEFT JOIN tbl_nc_levels nc ON q.nc_level_id = nc.nc_level_id
                    WHERE q.qualification_id = ?
                ");
                $allQualStmt->execute([$trainer['trainer_id'], $trainer['qualification_id']]);
            } catch (Exception $schemaErr) {
                try {
                    $allQualStmt = $conn->prepare("
                        SELECT DISTINCT q.qualification_name, COALESCE(tq.nc_level, nc_q.nc_level_code) AS nc_level_code
                        FROM tbl_trainer_qualifications tq
                        LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                        LEFT JOIN tbl_nc_levels nc_q ON q.nc_level_id = nc_q.nc_level_id
                        WHERE tq.trainer_id = ?
                        UNION
                        SELECT q.qualification_name, nc_q.nc_level_code
                        FROM tbl_qualifications q
                        LEFT JOIN tbl_nc_levels nc_q ON q.nc_level_id = nc_q.nc_level_id
                        WHERE q.qualification_id = ?
                    ");
                    $allQualStmt->execute([$trainer['trainer_id'], $trainer['qualification_id']]);
                } catch (Exception $legacyErr) {
                    $allQualStmt = $conn->prepare("
                        SELECT DISTINCT q.qualification_name, tq.nc_level AS nc_level_code
                        FROM tbl_trainer_qualifications tq
                        LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                        WHERE tq.trainer_id = ?
                        UNION
                        SELECT q.qualification_name, NULL AS nc_level_code
                        FROM tbl_qualifications q
                        WHERE q.qualification_id = ?
                    ");
                    $allQualStmt->execute([$trainer['trainer_id'], $trainer['qualification_id']]);
                }
            }
            $allQuals = $allQualStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $qualNames = [];
            $ncLevels = [];
            foreach ($allQuals as $qual) {
                if ($qual['qualification_name']) $qualNames[] = $qual['qualification_name'];
                if ($qual['nc_level_code']) $ncLevels[] = $qual['nc_level_code'];
            }
            
            $trainer['qualification_names'] = implode(', ', array_unique($qualNames));
            $trainer['nc_levels'] = implode(', ', array_unique($ncLevels));
        }
        unset($trainer);
        
        echo json_encode(['success' => true, 'data' => $trainers]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function addTrainer($conn) {
    try {
        $data = $_POST;
        $files = $_FILES;
        
        if (empty($data['first_name']) || empty($data['last_name'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'First Name and Last Name are required']);
            return;
        }

        $qualificationIds = $data['qualification_ids'] ?? [];
        $ncLevelIds = $data['nc_level_ids'] ?? [];
        if (!is_array($qualificationIds)) {
            $qualificationIds = [$qualificationIds];
        }
        if (!is_array($ncLevelIds)) {
            $ncLevelIds = [$ncLevelIds];
        }

        if (empty($qualificationIds) || empty($qualificationIds[0])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'At least one qualification is required']);
            return;
        }

        // Handle File Uploads
        $uploadDir = '../../uploads/trainers/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

        $nttcPath = null;
        $tmPath = null;

        if (isset($files['nttc_file']) && $files['nttc_file']['error'] === UPLOAD_ERR_OK) {
            $nttcPath = 'nttc_' . time() . '_' . $files['nttc_file']['name'];
            move_uploaded_file($files['nttc_file']['tmp_name'], $uploadDir . $nttcPath);
        }
        if (isset($files['tm_file']) && $files['tm_file']['error'] === UPLOAD_ERR_OK) {
            $tmPath = 'tm_' . time() . '_' . $files['tm_file']['name'];
            move_uploaded_file($files['tm_file']['tmp_name'], $uploadDir . $tmPath);
        }

        $conn->beginTransaction();

        // Build qualification rows with file uploads
        $qualificationRows = [];
        foreach ($qualificationIds as $idx => $qid) {
            $ncFile = null;
            $expFile = null;

            // Handle nc_file for this qualification index
            if (isset($files['nc_files']) && isset($files['nc_files']['error'])) {
                if (is_array($files['nc_files']['error'])) {
                    if (isset($files['nc_files']['error'][$idx]) && $files['nc_files']['error'][$idx] === UPLOAD_ERR_OK) {
                        $ncFile = 'nc_' . time() . '_' . $idx . '_' . $files['nc_files']['name'][$idx];
                        move_uploaded_file($files['nc_files']['tmp_name'][$idx], $uploadDir . $ncFile);
                    }
                } else if ($files['nc_files']['error'] === UPLOAD_ERR_OK) {
                    $ncFile = 'nc_' . time() . '_' . $files['nc_files']['name'];
                    move_uploaded_file($files['nc_files']['tmp_name'], $uploadDir . $ncFile);
                }
            }

            // Handle experience_file for this qualification index
            if (isset($files['experience_files']) && isset($files['experience_files']['error'])) {
                if (is_array($files['experience_files']['error'])) {
                    if (isset($files['experience_files']['error'][$idx]) && $files['experience_files']['error'][$idx] === UPLOAD_ERR_OK) {
                        $expFile = 'exp_' . time() . '_' . $idx . '_' . $files['experience_files']['name'][$idx];
                        move_uploaded_file($files['experience_files']['tmp_name'][$idx], $uploadDir . $expFile);
                    }
                } else if ($files['experience_files']['error'] === UPLOAD_ERR_OK) {
                    $expFile = 'exp_' . time() . '_' . $files['experience_files']['name'];
                    move_uploaded_file($files['experience_files']['tmp_name'], $uploadDir . $expFile);
                }
            }

            $ncLevelId = isset($ncLevelIds[$idx]) && $ncLevelIds[$idx] !== '' ? (int)$ncLevelIds[$idx] : null;
            $qualificationRows[] = [
                'qualification_id' => (int)$qid,
                'nc_level_id' => $ncLevelId,
                'nc_level_code' => resolveNcLevelCode($conn, $ncLevelId),
                'nc_file' => $ncFile,
                'experience_file' => $expFile
            ];
        }

        // Set primary qualification and NC level
        $primaryQid = $qualificationRows[0]['qualification_id'];
        $primaryNcId = $qualificationRows[0]['nc_level_id'];
        $primaryNcCode = $qualificationRows[0]['nc_level_code'];
        $primaryNcFile = $qualificationRows[0]['nc_file'];
        $primaryExpFile = $qualificationRows[0]['experience_file'];

        // Insert trainer record. Prefer new schema, then fallback to legacy schema.
        try {
            $stmt = $conn->prepare("INSERT INTO tbl_trainer (first_name, last_name, email, phone_number, qualification_id, trainer_nc_level_id, address, nttc_no, nttc_file, tm_file, nc_file, experience_file, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')");
            $stmt->execute([
                $data['first_name'],
                $data['last_name'],
                $data['email'] ?? null,
                $data['phone'] ?? null,
                $primaryQid,
                $primaryNcId,
                $data['address'] ?? null,
                $data['nttc_no'] ?? null,
                $nttcPath,
                $tmPath,
                $primaryNcFile,
                $primaryExpFile
            ]);
        } catch (Exception $schemaErr) {
            $stmt = $conn->prepare("INSERT INTO tbl_trainer (first_name, last_name, email, phone_number, qualification_id, address, nttc_no, nttc_file, tm_file, nc_level, nc_file, experience_file, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')");
            $stmt->execute([
                $data['first_name'],
                $data['last_name'],
                $data['email'] ?? null,
                $data['phone'] ?? null,
                $primaryQid,
                $data['address'] ?? null,
                $data['nttc_no'] ?? null,
                $nttcPath,
                $tmPath,
                $primaryNcCode,
                $primaryNcFile,
                $primaryExpFile
            ]);
        }
        
        $trainerId = $conn->lastInsertId();

        // Insert trainer qualifications. Prefer new schema, then fallback to legacy schema.
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
                    $row['nc_level_code'],
                    $row['nc_file'],
                    $row['experience_file']
                ]);
            }
        }

        saveTrainerAddressAndLink($conn, $trainerId, $data, $data['address'] ?? null, null);
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Trainer added successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
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
        if (!$trainer) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Trainer not found.']);
            return;
        }

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
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
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
        // Legacy schema may not have tbl_nc_levels.
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

function mapNcLevelCodeToId($code) {
    if (empty($code)) return null;
    $normalized = strtoupper(trim((string)$code));
    $mapping = [
        'NC I' => 1,
        'NC II' => 2,
        'NC III' => 3,
        'NC IV' => 4
    ];
    return $mapping[$normalized] ?? null;
}

function handleTrainerFileUploads($files, $ownerId, $existingFiles = []) {
    $uploadDir = '../../uploads/trainers/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $uploaded = [];
    foreach (['nttc_file', 'tm_file'] as $key) {
        if (!isset($files[$key]) || $files[$key]['error'] !== UPLOAD_ERR_OK) continue;

        if (!empty($existingFiles[$key])) {
            deleteFileIfExists($existingFiles[$key]);
        }

        $ext = pathinfo($files[$key]['name'], PATHINFO_EXTENSION);
        $name = "{$key}_{$ownerId}_" . time() . ($ext ? ".{$ext}" : '');
        if (move_uploaded_file($files[$key]['tmp_name'], $uploadDir . $name)) {
            $uploaded[$key] = $name;
        }
    }
    return $uploaded;
}

function getIndexedFile($files, $key, $index) {
    if (!isset($files[$key]) || !isset($files[$key]['error']) || !is_array($files[$key]['error'])) {
        return null;
    }
    if (!array_key_exists($index, $files[$key]['error'])) {
        return null;
    }

    return [
        'name' => $files[$key]['name'][$index] ?? null,
        'tmp_name' => $files[$key]['tmp_name'][$index] ?? null,
        'error' => $files[$key]['error'][$index] ?? UPLOAD_ERR_NO_FILE
    ];
}

function uploadIndexedFile($files, $key, $index, $ownerId, $prefix, $existingFile = null) {
    $uploadDir = '../../uploads/trainers/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $file = getIndexedFile($files, $key, $index);
    if (!$file || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return $existingFile;
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return $existingFile;
    }

    if (!empty($existingFile)) {
        deleteFileIfExists($existingFile);
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $name = "{$prefix}_{$ownerId}_" . time() . "_{$index}" . ($ext ? ".{$ext}" : '');
    if (move_uploaded_file($file['tmp_name'], $uploadDir . $name)) {
        return $name;
    }
    return $existingFile;
}

function deleteFileIfExists($filename) {
    if (empty($filename)) return;
    $path = '../../uploads/trainers/' . $filename;
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

function updateTrainer($conn) {
    if (!empty($_POST) || !empty($_FILES)) {
        updateTrainerMultipart($conn);
        return;
    }

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

        if (isset($data['address']) || isset($data['address_house']) || isset($data['address_barangay']) || isset($data['address_district']) || isset($data['address_city']) || isset($data['address_province']) || isset($data['address_region'])) {
            $existingAddressId = getTrainerAddressId($conn, (int)$data['trainer_id']);
            saveTrainerAddressAndLink($conn, (int)$data['trainer_id'], $data, $data['address'] ?? null, $existingAddressId);
        }
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Trainer updated successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateTrainerMultipart($conn) {
    $data = $_POST;
    $files = $_FILES;
    $trainerId = (int)($data['trainer_id'] ?? 0);
    $qualificationIds = $data['qualification_ids'] ?? [];
    $ncLevelIds = $data['nc_level_ids'] ?? [];

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
    if (empty($data['first_name']) || empty($data['last_name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'First Name and Last Name are required.']);
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
        $conn->beginTransaction();

        $stmt = $conn->prepare("SELECT user_id, nttc_file, tm_file FROM tbl_trainer WHERE trainer_id = ?");
        $stmt->execute([$trainerId]);
        $existingFiles = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existingFiles) {
            $conn->rollBack();
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Trainer not found.']);
            return;
        }
        $existingAddressId = getTrainerAddressId($conn, $trainerId);

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
            $qid = (int)($row['qualification_id'] ?? 0);
            if (!$qid) continue;
            $row['nc_level_id'] = $row['nc_level_id'] ?? mapNcLevelCodeToId($row['nc_level'] ?? null);
            $existingQualMap[$qid] = $row;
        }

        $ownerId = !empty($existingFiles['user_id']) ? (int)$existingFiles['user_id'] : $trainerId;
        $uploadedMainFiles = handleTrainerFileUploads($files, $ownerId, $existingFiles);

        $qualificationRows = [];
        foreach ($qualificationIds as $idx => $qidRaw) {
            $qid = (int)$qidRaw;
            $ncLevelId = isset($ncLevelIds[$idx]) ? (int)$ncLevelIds[$idx] : null;
            $existing = $existingQualMap[$qid] ?? null;
            $ncFile = uploadIndexedFile($files, 'nc_files', $idx, $ownerId, 'nc', $existing['nc_file'] ?? null);
            $expFile = uploadIndexedFile($files, 'experience_files', $idx, $ownerId, 'exp', $existing['experience_file'] ?? null);
            $qualificationRows[] = [
                'qualification_id' => $qid,
                'nc_level_id' => $ncLevelId,
                'nc_level_code' => resolveNcLevelCode($conn, $ncLevelId),
                'nc_file' => $ncFile,
                'experience_file' => $expFile
            ];
        }

        $submittedIds = array_map('intval', $qualificationIds);
        foreach ($existingQualMap as $qid => $row) {
            if (!in_array((int)$qid, $submittedIds, true)) {
                deleteFileIfExists($row['nc_file'] ?? null);
                deleteFileIfExists($row['experience_file'] ?? null);
            }
        }

        $primary = $qualificationRows[0];
        $nttcFile = $uploadedMainFiles['nttc_file'] ?? $existingFiles['nttc_file'] ?? null;
        $tmFile = $uploadedMainFiles['tm_file'] ?? $existingFiles['tm_file'] ?? null;

        try {
            $updateStmt = $conn->prepare("UPDATE tbl_trainer SET
                                            first_name = ?, last_name = ?, email = ?, phone_number = ?,
                                            qualification_id = ?, trainer_nc_level_id = ?, address = ?, nttc_no = ?,
                                            nttc_file = ?, tm_file = ?, nc_file = ?, experience_file = ?
                                          WHERE trainer_id = ?");
            $updateStmt->execute([
                $data['first_name'],
                $data['last_name'],
                $data['email'] ?? null,
                $data['phone'] ?? null,
                $primary['qualification_id'],
                $primary['nc_level_id'],
                $data['address'] ?? null,
                $data['nttc_no'] ?? null,
                $nttcFile,
                $tmFile,
                $primary['nc_file'],
                $primary['experience_file'],
                $trainerId
            ]);
        } catch (Exception $schemaErr) {
            $updateStmt = $conn->prepare("UPDATE tbl_trainer SET
                                            first_name = ?, last_name = ?, email = ?, phone_number = ?,
                                            qualification_id = ?, nc_level = ?, address = ?, nttc_no = ?,
                                            nttc_file = ?, tm_file = ?, nc_file = ?, experience_file = ?
                                          WHERE trainer_id = ?");
            $updateStmt->execute([
                $data['first_name'],
                $data['last_name'],
                $data['email'] ?? null,
                $data['phone'] ?? null,
                $primary['qualification_id'],
                $primary['nc_level_code'],
                $data['address'] ?? null,
                $data['nttc_no'] ?? null,
                $nttcFile,
                $tmFile,
                $primary['nc_file'],
                $primary['experience_file'],
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
                    $row['nc_level_code'],
                    $row['nc_file'],
                    $row['experience_file']
                ]);
            }
        }

        $userStmt = $conn->prepare("SELECT user_id FROM tbl_trainer WHERE trainer_id = ?");
        $userStmt->execute([$trainerId]);
        $trainerUser = $userStmt->fetch(PDO::FETCH_ASSOC);
        if ($trainerUser && !empty($trainerUser['user_id']) && !empty($data['email'])) {
            $emailStmt = $conn->prepare("UPDATE tbl_users SET email = ? WHERE user_id = ?");
            $emailStmt->execute([$data['email'], $trainerUser['user_id']]);
        }

        saveTrainerAddressAndLink($conn, $trainerId, $data, $data['address'] ?? null, $existingAddressId);

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Trainer updated successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
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

        ensureTrainerAddressSchema($conn);
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
