<?php

require_once __DIR__ . '/db.php';

function qualificationNcInfo(PDO $conn): array
{
    $stmt = $conn->query("
        SELECT
            q.qualification_id,
            q.qualification_name,
            q.nc_level_id,
            nc.nc_level_code,
            nc.nc_level_name
        FROM tbl_qualifications q
        LEFT JOIN tbl_nc_levels nc ON nc.nc_level_id = q.nc_level_id
        WHERE q.qualification_id IN (1, 3, 4, 6, 12, 14, 15, 16, 17, 18)
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $map = [];
    foreach ($rows as $row) {
        $map[(int)$row['qualification_id']] = $row;
    }

    return $map;
}

function trainerSeedDefinitions(): array
{
    return [
        [
            'username' => 'maria.santos.trainer',
            'email' => 'maria.santos.trainer@hohooville.local',
            'password' => 'Trainer@123',
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'phone_number' => '09170000021',
            'address' => 'Test Trainer Record - Maria Santos',
            'qualifications' => [1, 3, 15, 17, 18],
        ],
        [
            'username' => 'paulo.reyes.trainer',
            'email' => 'paulo.reyes.trainer@hohooville.local',
            'password' => 'Trainer@123',
            'first_name' => 'Paulo',
            'last_name' => 'Reyes',
            'phone_number' => '09170000022',
            'address' => 'Test Trainer Record - Paulo Reyes',
            'qualifications' => [4, 12, 16],
        ],
        [
            'username' => 'darren.flores.trainer',
            'email' => 'darren.flores.trainer@hohooville.local',
            'password' => 'Df!2026Secure#1',
            'first_name' => 'Darren',
            'last_name' => 'Flores',
            'phone_number' => '09170000023',
            'address' => 'Test Trainer Record - Darren Flores',
            'qualifications' => [1, 6, 18],
        ],
        [
            'username' => 'camille.dizon.trainer',
            'email' => 'camille.dizon.trainer@hohooville.local',
            'password' => 'Trainer@123',
            'first_name' => 'Camille',
            'last_name' => 'Dizon',
            'phone_number' => '09170000024',
            'address' => 'Test Trainer Record - Camille Dizon',
            'qualifications' => [4, 14, 15, 16],
        ],
    ];
}

function qualificationTemplateSourceId(int $qualificationId): int
{
    return match ($qualificationId) {
        14 => 15,
        16 => 4,
        17 => 3,
        18 => 1,
        default => $qualificationId,
    };
}

function findOrCreateTrainerUser(PDO $conn, array $trainer): int
{
    $lookupStmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE username = ? LIMIT 1");
    $lookupStmt->execute([$trainer['username']]);
    $userId = (int)$lookupStmt->fetchColumn();
    if ($userId > 0) {
        return $userId;
    }

    $insertStmt = $conn->prepare("
        INSERT INTO tbl_users (role_id, username, password, email, status)
        VALUES (2, ?, ?, ?, 'active')
    ");
    $insertStmt->execute([
        $trainer['username'],
        password_hash($trainer['password'], PASSWORD_BCRYPT),
        $trainer['email'],
    ]);

    return (int)$conn->lastInsertId();
}

function findOrCreateTrainerProfile(PDO $conn, int $userId, array $trainer, array $qualificationInfo): int
{
    $lookupStmt = $conn->prepare("SELECT trainer_id FROM tbl_trainer WHERE user_id = ? LIMIT 1");
    $lookupStmt->execute([$userId]);
    $trainerId = (int)$lookupStmt->fetchColumn();

    $primaryQualificationId = (int)$trainer['qualifications'][0];
    $ncInfo = $qualificationInfo[$primaryQualificationId] ?? [];
    $ncLevelId = !empty($ncInfo['nc_level_id']) ? (int)$ncInfo['nc_level_id'] : null;
    $ncLevelCode = $ncInfo['nc_level_code'] ?? ($ncInfo['nc_level_name'] ?? null);

    if ($trainerId > 0) {
        $updateStmt = $conn->prepare("
            UPDATE tbl_trainer
            SET first_name = ?, last_name = ?, email = ?, phone_number = ?, qualification_id = ?, address = ?,
                trainer_nc_level_id = ?, nc_level = ?, status = 'active'
            WHERE trainer_id = ?
        ");
        $updateStmt->execute([
            $trainer['first_name'],
            $trainer['last_name'],
            $trainer['email'],
            $trainer['phone_number'],
            $primaryQualificationId,
            $trainer['address'],
            $ncLevelId,
            $ncLevelCode,
            $trainerId,
        ]);

        return $trainerId;
    }

    $insertStmt = $conn->prepare("
        INSERT INTO tbl_trainer (
            user_id, first_name, last_name, email, phone_number, qualification_id, address,
            trainer_nc_level_id, nc_level, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    ");
    $insertStmt->execute([
        $userId,
        $trainer['first_name'],
        $trainer['last_name'],
        $trainer['email'],
        $trainer['phone_number'],
        $primaryQualificationId,
        $trainer['address'],
        $ncLevelId,
        $ncLevelCode,
    ]);

    return (int)$conn->lastInsertId();
}

function ensureTrainerQualifications(PDO $conn, int $trainerId, array $qualificationIds, array $qualificationInfo, array &$summary): void
{
    $selectStmt = $conn->prepare("
        SELECT trainer_qualification_id
        FROM tbl_trainer_qualifications
        WHERE trainer_id = ? AND qualification_id = ?
        LIMIT 1
    ");
    $insertStmt = $conn->prepare("
        INSERT INTO tbl_trainer_qualifications (trainer_id, qualification_id, nc_level, nc_file, experience_file)
        VALUES (?, ?, ?, NULL, NULL)
    ");

    foreach ($qualificationIds as $qualificationId) {
        $selectStmt->execute([$trainerId, $qualificationId]);
        $existingId = (int)$selectStmt->fetchColumn();
        if ($existingId > 0) {
            $summary['reused_trainer_qualifications']++;
            continue;
        }

        $ncLevelCode = $qualificationInfo[$qualificationId]['nc_level_code'] ?? ($qualificationInfo[$qualificationId]['nc_level_name'] ?? null);
        $insertStmt->execute([$trainerId, $qualificationId, $ncLevelCode]);
        $summary['created_trainer_qualifications']++;
    }
}

function qualificationCoreTemplates(PDO $conn, int $qualificationId): array
{
    $sourceQualificationId = qualificationTemplateSourceId($qualificationId);
    $stmt = $conn->prepare("
        SELECT DISTINCT
            module_title,
            unit_code,
            module_description,
            module_order,
            module_status
        FROM tbl_module
        WHERE qualification_id = ?
          AND competency_type = 'core'
          AND unit_code IS NOT NULL
          AND unit_code <> ''
        ORDER BY module_order, module_title
    ");
    $stmt->execute([$sourceQualificationId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

function ensureCoreModules(PDO $conn, int $trainerId, int $qualificationId, array &$summary): void
{
    $templates = qualificationCoreTemplates($conn, $qualificationId);
    if (empty($templates)) {
        $summary['skipped_pairs'][] = [
            'trainer_id' => $trainerId,
            'qualification_id' => $qualificationId,
            'reason' => 'no_core_templates_found',
        ];
        return;
    }

    $selectStmt = $conn->prepare("
        SELECT module_id
        FROM tbl_module
        WHERE qualification_id = ? AND trainer_id = ? AND competency_type = 'core' AND unit_code = ?
        LIMIT 1
    ");
    $insertStmt = $conn->prepare("
        INSERT INTO tbl_module (
            qualification_id,
            competency_type,
            module_title,
            unit_code,
            module_description,
            module_order,
            module_status,
            trainer_id
        ) VALUES (?, 'core', ?, ?, ?, ?, ?, ?)
    ");

    foreach ($templates as $template) {
        $unitCode = (string)$template['unit_code'];
        $selectStmt->execute([$qualificationId, $trainerId, $unitCode]);
        $existingId = (int)$selectStmt->fetchColumn();
        if ($existingId > 0) {
            $summary['reused_core_modules']++;
            continue;
        }

        $insertStmt->execute([
            $qualificationId,
            $template['module_title'],
            $unitCode,
            $template['module_description'],
            (int)($template['module_order'] ?? 0),
            $template['module_status'] ?? 'draft',
            $trainerId,
        ]);
        $summary['created_core_modules']++;
    }
}

function seedAdditionalTrainersWithCoreModules(PDO $conn): array
{
    $qualificationInfo = qualificationNcInfo($conn);
    $summary = [
        'created_users' => 0,
        'created_trainers' => 0,
        'created_trainer_qualifications' => 0,
        'reused_trainer_qualifications' => 0,
        'created_core_modules' => 0,
        'reused_core_modules' => 0,
        'trainers' => [],
        'skipped_pairs' => [],
    ];

    $userExistsStmt = $conn->prepare("SELECT user_id FROM tbl_users WHERE username = ? LIMIT 1");
    $trainerExistsStmt = $conn->prepare("SELECT trainer_id FROM tbl_trainer WHERE user_id = ? LIMIT 1");

    foreach (trainerSeedDefinitions() as $trainer) {
        $conn->beginTransaction();
        try {
            $userExistsStmt->execute([$trainer['username']]);
            $existingUserId = (int)$userExistsStmt->fetchColumn();
            $userId = findOrCreateTrainerUser($conn, $trainer);
            if ($existingUserId === 0) {
                $summary['created_users']++;
            }

            $trainerExistsStmt->execute([$userId]);
            $existingTrainerId = (int)$trainerExistsStmt->fetchColumn();
            $trainerId = findOrCreateTrainerProfile($conn, $userId, $trainer, $qualificationInfo);
            if ($existingTrainerId === 0) {
                $summary['created_trainers']++;
            }

            ensureTrainerQualifications($conn, $trainerId, $trainer['qualifications'], $qualificationInfo, $summary);
            foreach ($trainer['qualifications'] as $qualificationId) {
                ensureCoreModules($conn, $trainerId, (int)$qualificationId, $summary);
            }

            $conn->commit();
            $summary['trainers'][] = [
                'trainer_id' => $trainerId,
                'user_id' => $userId,
                'username' => $trainer['username'],
                'name' => $trainer['first_name'] . ' ' . $trainer['last_name'],
                'qualifications' => $trainer['qualifications'],
            ];
        } catch (Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }
    }

    return $summary;
}

$database = new Database();
$conn = $database->getConnection();
$summary = seedAdditionalTrainersWithCoreModules($conn);

echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
