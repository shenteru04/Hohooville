<?php

if (!function_exists('ta_table_exists')) {
    function ta_table_exists(PDO $conn, string $table): bool
    {
        try {
            $stmt = $conn->prepare('SHOW TABLES LIKE ?');
            $stmt->execute([$table]);
            return (bool)$stmt->fetchColumn();
        } catch (Exception $e) {
            return false;
        }
    }
}

if (!function_exists('ta_column_exists')) {
    function ta_column_exists(PDO $conn, string $table, string $column): bool
    {
        if (!ta_table_exists($conn, $table)) {
            return false;
        }

        try {
            $stmt = $conn->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
            $stmt->execute([$column]);
            return (bool)$stmt->fetchColumn();
        } catch (Exception $e) {
            return false;
        }
    }
}

if (!function_exists('ta_normalize_mode')) {
    function ta_normalize_mode($mode): string
    {
        return strtolower(trim((string)$mode)) === 'multiple' ? 'multiple' : 'single';
    }
}

if (!function_exists('ta_ensure_schema')) {
    function ta_ensure_schema(PDO $conn): void
    {
        static $ensured = false;
        if ($ensured) {
            return;
        }

        try {
            if (!ta_column_exists($conn, 'tbl_batch', 'trainer_assignment_mode')) {
                $conn->exec("ALTER TABLE `tbl_batch`
                    ADD COLUMN `trainer_assignment_mode` ENUM('single','multiple') NOT NULL DEFAULT 'single'
                    AFTER `trainer_id`");
            }
        } catch (Exception $e) {
            error_log('Unable to ensure tbl_batch.trainer_assignment_mode: ' . $e->getMessage());
        }

        

        try {
            if (!ta_column_exists($conn, 'tbl_lessons', 'lesson_resource_url')) {
                $conn->exec("ALTER TABLE `tbl_lessons`
                    ADD COLUMN `lesson_resource_url` VARCHAR(2048) NULL DEFAULT NULL
                    AFTER `lesson_file_path`");
            }
        } catch (Exception $e) {
            error_log('Unable to ensure tbl_lessons.lesson_resource_url: ' . $e->getMessage());
        }

        try {
            if (ta_column_exists($conn, 'tbl_batch', 'trainer_assignment_mode')) {
                $conn->exec("UPDATE `tbl_batch`
                    SET `trainer_assignment_mode` = 'single'
                    WHERE `trainer_assignment_mode` IS NULL OR TRIM(`trainer_assignment_mode`) = ''");
            }
        } catch (Exception $e) {
            error_log('Unable to normalize trainer assignment modes: ' . $e->getMessage());
        }

        

        try {
            $conn->exec("CREATE TABLE IF NOT EXISTS `tbl_batch_trainer_assignments` (
                `assignment_id` INT AUTO_INCREMENT PRIMARY KEY,
                `batch_id` INT NOT NULL,
                `module_id` INT NOT NULL,
                `trainer_id` INT NOT NULL,
                `schedule` VARCHAR(255) NULL,
                `room_id` INT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `uniq_batch_module` (`batch_id`, `module_id`),
                KEY `idx_batch_trainer` (`batch_id`, `trainer_id`),
                KEY `idx_trainer_batch` (`trainer_id`, `batch_id`),
                KEY `idx_module` (`module_id`),
                KEY `idx_room` (`room_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");
        } catch (Exception $e) {
            error_log('Unable to ensure tbl_batch_trainer_assignments exists: ' . $e->getMessage());
        }

        $ensured = true;
    }
}

if (!function_exists('ta_fetch_trainer_assigned_batch_ids')) {
    function ta_fetch_trainer_assigned_batch_ids(PDO $conn, int $trainerId, array $statuses = []): array
    {
        ta_ensure_schema($conn);

        if ($trainerId <= 0) {
            return [];
        }

        $paramsSingle = [$trainerId];
        $paramsMulti = [$trainerId];
        $statusFilterSingle = '';
        $statusFilterMulti = '';

        if (!empty($statuses)) {
            $placeholders = implode(',', array_fill(0, count($statuses), '?'));
            $statusFilterSingle = " AND b.status IN ($placeholders)";
            $statusFilterMulti = " AND b.status IN ($placeholders)";
            $paramsSingle = array_merge($paramsSingle, $statuses);
            $paramsMulti = array_merge($paramsMulti, $statuses);
        }

        $batchIds = [];

        try {
            $stmt = $conn->prepare("
                SELECT DISTINCT b.batch_id
                FROM tbl_batch b
                WHERE b.trainer_id = ?
                  $statusFilterSingle
            ");
            $stmt->execute($paramsSingle);
            $batchIds = array_merge($batchIds, array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []));
        } catch (Exception $e) {
            error_log('Unable to fetch single-mode trainer batches: ' . $e->getMessage());
        }

        try {
            $stmt = $conn->prepare("
                SELECT DISTINCT b.batch_id
                FROM tbl_batch b
                JOIN tbl_batch_trainer_assignments a ON a.batch_id = b.batch_id
                WHERE COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
                  AND a.trainer_id = ?
                  $statusFilterMulti
            ");
            $stmt->execute($paramsMulti);
            $batchIds = array_merge($batchIds, array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []));
        } catch (Exception $e) {
            error_log('Unable to fetch multi-mode trainer batches: ' . $e->getMessage());
        }

        $batchIds = array_values(array_unique(array_filter($batchIds)));
        sort($batchIds);

        return $batchIds;
    }
}

if (!function_exists('ta_trainer_has_batch_access')) {
    function ta_trainer_has_batch_access(PDO $conn, int $trainerId, int $batchId): bool
    {
        if ($trainerId <= 0 || $batchId <= 0) {
            return false;
        }

        return in_array($batchId, ta_fetch_trainer_assigned_batch_ids($conn, $trainerId), true);
    }
}

if (!function_exists('ta_fetch_batch_assignment_summary')) {
    function ta_fetch_batch_assignment_summary(PDO $conn, array $batchIds): array
    {
        ta_ensure_schema($conn);

        $batchIds = array_values(array_unique(array_filter(array_map('intval', $batchIds))));
        if (empty($batchIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($batchIds), '?'));
        $summary = [];

        try {
            $stmt = $conn->prepare("
                SELECT
                    a.batch_id,
                    COUNT(DISTINCT a.module_id) AS assigned_modules,
                    COUNT(DISTINCT a.trainer_id) AS distinct_trainers,
                    GROUP_CONCAT(
                        DISTINCT TRIM(CONCAT_WS(' ', t.first_name, t.last_name))
                        ORDER BY t.last_name, t.first_name
                        SEPARATOR '||'
                    ) AS trainer_names
                FROM tbl_batch_trainer_assignments a
                LEFT JOIN tbl_trainer t ON t.trainer_id = a.trainer_id
                WHERE a.batch_id IN ($placeholders)
                GROUP BY a.batch_id
            ");
            $stmt->execute($batchIds);

            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $names = array_values(array_filter(array_map('trim', explode('||', (string)($row['trainer_names'] ?? '')))));
                $summary[(int)$row['batch_id']] = [
                    'assigned_modules' => (int)($row['assigned_modules'] ?? 0),
                    'distinct_trainers' => (int)($row['distinct_trainers'] ?? 0),
                    'trainer_names' => $names
                ];
            }
        } catch (Exception $e) {
            error_log('Unable to fetch batch assignment summary: ' . $e->getMessage());
        }

        return $summary;
    }
}

if (!function_exists('ta_fetch_qualification_modules')) {
    function ta_fetch_qualification_modules(PDO $conn, int $qualificationId, bool $includeUnowned = false): array
    {
        ta_ensure_schema($conn);

        if ($qualificationId <= 0) {
            return [];
        }

        $statusSelect = ta_column_exists($conn, 'tbl_module', 'module_status')
            ? "COALESCE(m.module_status, 'published') AS module_status,"
            : "'published' AS module_status,";
        $orderExpr = ta_column_exists($conn, 'tbl_module', 'module_order')
            ? 'COALESCE(m.module_order, 0),'
            : '';
        $orderSelect = ta_column_exists($conn, 'tbl_module', 'module_order')
            ? 'COALESCE(m.module_order, 0) AS module_order,'
            : '0 AS module_order,';
        $unitCodeSelect = ta_column_exists($conn, 'tbl_module', 'unit_code')
            ? 'COALESCE(m.unit_code, \'\') AS unit_code,'
            : '\'\' AS unit_code,';
        $ownershipFilter = $includeUnowned ? '' : 'AND m.trainer_id IS NOT NULL';

        $stmt = $conn->prepare("
            SELECT
                m.module_id,
                m.qualification_id,
                m.module_title,
                $unitCodeSelect
                m.competency_type,
                m.trainer_id,
                $orderSelect
                $statusSelect
                TRIM(CONCAT_WS(' ', t.first_name, t.last_name)) AS trainer_name
            FROM tbl_module m
            LEFT JOIN tbl_trainer t ON t.trainer_id = m.trainer_id
            WHERE m.qualification_id = ?
              $ownershipFilter
            ORDER BY
                FIELD(COALESCE(m.competency_type, ''), 'core', 'common', 'basic'),
                $orderExpr
                m.module_title,
                m.module_id
        ");
        $stmt->execute([$qualificationId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}

if (!function_exists('ta_normalize_group_text')) {
    function ta_normalize_group_text(string $value): string
    {
        $normalized = strtolower(trim($value));
        return preg_replace('/\s+/', ' ', $normalized) ?? '';
    }
}

if (!function_exists('ta_build_module_group_key')) {
    function ta_build_module_group_key(array $module): string
    {
        $qualificationId = (int)($module['qualification_id'] ?? 0);
        $competencyType = ta_normalize_group_text((string)($module['competency_type'] ?? ''));
        $unitCode = trim((string)($module['unit_code'] ?? ''));
        $moduleTitle = ta_normalize_group_text((string)($module['module_title'] ?? ''));

        if ($unitCode !== '') {
            return $qualificationId . '|' . $competencyType . '|code|' . strtoupper($unitCode);
        }

        return $qualificationId . '|' . $competencyType . '|title|' . $moduleTitle;
    }
}

if (!function_exists('ta_fetch_qualification_unit_groups')) {
    function ta_fetch_qualification_unit_groups(PDO $conn, int $qualificationId, bool $includeUnowned = true): array
    {
        $modules = ta_fetch_qualification_modules($conn, $qualificationId, $includeUnowned);
        if (empty($modules)) {
            return [];
        }

        $typeOrderMap = [
            'core' => 1,
            'basic' => 2,
            'common' => 3
        ];
        $groups = [];

        foreach ($modules as $module) {
            $groupKey = ta_build_module_group_key($module);
            $moduleId = (int)($module['module_id'] ?? 0);
            $moduleOrder = (int)($module['module_order'] ?? 0);
            $trainerId = !empty($module['trainer_id']) ? (int)$module['trainer_id'] : null;
            $trainerName = trim((string)($module['trainer_name'] ?? ''));
            $competencyType = strtolower(trim((string)($module['competency_type'] ?? '')));
            $unitCode = trim((string)($module['unit_code'] ?? ''));
            $moduleTitle = trim((string)($module['module_title'] ?? ''));

            if (!isset($groups[$groupKey])) {
                $groups[$groupKey] = [
                    'group_key' => $groupKey,
                    'qualification_id' => (int)($module['qualification_id'] ?? 0),
                    'competency_type' => $competencyType,
                    'module_title' => $moduleTitle,
                    'unit_code' => $unitCode,
                    'module_order' => $moduleOrder,
                    'type_order' => $typeOrderMap[$competencyType] ?? 99,
                    'module_ids' => [],
                    'trainer_options' => []
                ];
            }

            $groups[$groupKey]['module_ids'][] = $moduleId;

            if ($groups[$groupKey]['module_title'] === '' && $moduleTitle !== '') {
                $groups[$groupKey]['module_title'] = $moduleTitle;
            }
            if ($groups[$groupKey]['unit_code'] === '' && $unitCode !== '') {
                $groups[$groupKey]['unit_code'] = $unitCode;
            }
            if ($moduleOrder > 0 && ($groups[$groupKey]['module_order'] <= 0 || $moduleOrder < $groups[$groupKey]['module_order'])) {
                $groups[$groupKey]['module_order'] = $moduleOrder;
            }

            if ($trainerId !== null) {
                $hasTrainerOption = false;
                foreach ($groups[$groupKey]['trainer_options'] as $existingOption) {
                    if ((int)($existingOption['trainer_id'] ?? 0) === $trainerId) {
                        $hasTrainerOption = true;
                        break;
                    }
                }

                if (!$hasTrainerOption) {
                    $groups[$groupKey]['trainer_options'][] = [
                        'module_id' => $moduleId,
                        'trainer_id' => $trainerId,
                        'trainer_name' => $trainerName !== '' ? $trainerName : 'Unnamed Trainer',
                        'module_status' => $module['module_status'] ?? 'published'
                    ];
                }
            }
        }

        foreach ($groups as &$group) {
            $group['module_ids'] = array_values(array_unique(array_filter(array_map('intval', $group['module_ids']))));
            usort($group['trainer_options'], static function (array $left, array $right): int {
                $nameCompare = strcasecmp((string)($left['trainer_name'] ?? ''), (string)($right['trainer_name'] ?? ''));
                if ($nameCompare !== 0) {
                    return $nameCompare;
                }

                return ((int)($left['trainer_id'] ?? 0)) <=> ((int)($right['trainer_id'] ?? 0));
            });
        }
        unset($group);

        $groups = array_values($groups);
        usort($groups, static function (array $left, array $right): int {
            $typeCompare = ((int)($left['type_order'] ?? 99)) <=> ((int)($right['type_order'] ?? 99));
            if ($typeCompare !== 0) {
                return $typeCompare;
            }

            $orderCompare = ((int)($left['module_order'] ?? 0)) <=> ((int)($right['module_order'] ?? 0));
            if ($orderCompare !== 0) {
                return $orderCompare;
            }

            return strcasecmp((string)($left['module_title'] ?? ''), (string)($right['module_title'] ?? ''));
        });

        return $groups;
    }
}

if (!function_exists('ta_fetch_batch_module_assignments')) {
    function ta_fetch_batch_module_assignments(PDO $conn, int $batchId): array
    {
        ta_ensure_schema($conn);

        if ($batchId <= 0) {
            return [];
        }

        $roomJoin = '';
        $roomSelect = "CAST(a.room_id AS CHAR) AS room";
        $unitCodeSelect = ta_column_exists($conn, 'tbl_module', 'unit_code')
            ? "COALESCE(m.unit_code, '') AS unit_code"
            : "'' AS unit_code";
        $moduleOrderSelect = ta_column_exists($conn, 'tbl_module', 'module_order')
            ? 'COALESCE(m.module_order, 0) AS module_order'
            : '0 AS module_order';

        if (ta_table_exists($conn, 'tbl_rooms') && ta_column_exists($conn, 'tbl_rooms', 'room_name')) {
            $roomJoin = 'LEFT JOIN tbl_rooms r ON r.room_id = a.room_id';
            $roomSelect = "COALESCE(r.room_name, CAST(a.room_id AS CHAR)) AS room";
        }

        $stmt = $conn->prepare("
            SELECT
                a.assignment_id,
                a.batch_id,
                a.module_id,
                a.trainer_id,
                a.schedule,
                a.room_id,
                $roomSelect,
                m.qualification_id,
                m.module_title,
                $unitCodeSelect,
                m.competency_type,
                $moduleOrderSelect,
                TRIM(CONCAT_WS(' ', t.first_name, t.last_name)) AS trainer_name
            FROM tbl_batch_trainer_assignments a
            JOIN tbl_module m ON m.module_id = a.module_id
            LEFT JOIN tbl_trainer t ON t.trainer_id = a.trainer_id
            $roomJoin
            WHERE a.batch_id = ?
            ORDER BY
                FIELD(COALESCE(m.competency_type, ''), 'core', 'common', 'basic'),
                m.module_title,
                a.assignment_id
        ");
        $stmt->execute([$batchId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}

if (!function_exists('ta_fetch_trainee_accessible_module_ids')) {
    function ta_fetch_trainee_accessible_module_ids(PDO $conn, int $traineeId, int $qualificationId): array
    {
        ta_ensure_schema($conn);

        if ($traineeId <= 0 || $qualificationId <= 0) {
            return [];
        }

        $enrollmentQualificationExpr = ta_column_exists($conn, 'tbl_enrollment', 'qualification_id')
            ? 'e.qualification_id'
            : 'NULL';

        $stmt = $conn->prepare("
            SELECT
                b.batch_id,
                b.trainer_id,
                COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode
            FROM tbl_enrollment e
            JOIN tbl_batch b ON b.batch_id = e.batch_id
            LEFT JOIN tbl_offered_qualifications oq ON oq.offered_qualification_id = e.offered_qualification_id
            WHERE e.trainee_id = ?
              AND e.status = 'approved'
              AND COALESCE($enrollmentQualificationExpr, oq.qualification_id, b.qualification_id) = ?
        ");
        $stmt->execute([$traineeId, $qualificationId]);
        $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $singleTrainerIds = [];
        $multiBatchIds = [];
        $multiFallbackTrainerIds = [];
        $multiSummaries = [];

        foreach ($enrollments as $row) {
            if (ta_normalize_mode($row['trainer_assignment_mode'] ?? 'single') === 'multiple') {
                $multiBatchIds[] = (int)$row['batch_id'];
            }
        }

        $multiBatchIds = array_values(array_unique(array_filter($multiBatchIds)));
        if (!empty($multiBatchIds)) {
            $multiSummaries = ta_fetch_batch_assignment_summary($conn, $multiBatchIds);
        }

        foreach ($enrollments as $row) {
            $mode = ta_normalize_mode($row['trainer_assignment_mode'] ?? 'single');
            if ($mode === 'multiple') {
                $batchId = (int)$row['batch_id'];
                $summary = $multiSummaries[$batchId] ?? null;
                if ((int)($summary['assigned_modules'] ?? 0) > 0) {
                    $multiBatchIds[] = $batchId;
                } elseif (!empty($row['trainer_id'])) {
                    $multiFallbackTrainerIds[] = (int)$row['trainer_id'];
                }
            } elseif (!empty($row['trainer_id'])) {
                $singleTrainerIds[] = (int)$row['trainer_id'];
            }
        }

        $moduleIds = [];
        $publishedModuleFilter = ta_column_exists($conn, 'tbl_module', 'module_status')
            ? " AND COALESCE(m.module_status, 'published') = 'published'"
            : '';

        $singleTrainerIds = array_values(array_unique(array_filter(array_merge($singleTrainerIds, $multiFallbackTrainerIds))));
        if (!empty($singleTrainerIds)) {
            $placeholders = implode(',', array_fill(0, count($singleTrainerIds), '?'));
            $stmt = $conn->prepare("
                SELECT DISTINCT m.module_id
                FROM tbl_module m
                WHERE m.qualification_id = ?
                  AND m.trainer_id IN ($placeholders)
                  $publishedModuleFilter
            ");
            $stmt->execute(array_merge([$qualificationId], $singleTrainerIds));
            $moduleIds = array_merge($moduleIds, array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []));
        }

        $multiBatchIds = array_values(array_unique(array_filter($multiBatchIds)));
        if (!empty($multiBatchIds)) {
            $placeholders = implode(',', array_fill(0, count($multiBatchIds), '?'));
            $stmt = $conn->prepare("
                SELECT DISTINCT bta.module_id
                FROM tbl_batch_trainer_assignments bta
                INNER JOIN tbl_module m ON m.module_id = bta.module_id
                WHERE bta.batch_id IN ($placeholders)
                  $publishedModuleFilter
            ");
            $stmt->execute($multiBatchIds);
            $moduleIds = array_merge($moduleIds, array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []));
        }

        $moduleIds = array_values(array_unique(array_filter($moduleIds)));
        sort($moduleIds);

        return $moduleIds;
    }
}

if (!function_exists('ta_fetch_trainees_for_module')) {
    function ta_fetch_trainees_for_module(PDO $conn, int $moduleId, int $trainerId, int $qualificationId): array
    {
        ta_ensure_schema($conn);

        if ($moduleId <= 0 || $trainerId <= 0 || $qualificationId <= 0) {
            return [];
        }

        $enrollmentQualificationExpr = ta_column_exists($conn, 'tbl_enrollment', 'qualification_id')
            ? 'e.qualification_id'
            : 'NULL';

        $stmt = $conn->prepare("
            SELECT DISTINCT
                th.user_id,
                th.email,
                th.first_name,
                th.last_name
            FROM tbl_enrollment e
            JOIN tbl_batch b ON b.batch_id = e.batch_id
            LEFT JOIN tbl_offered_qualifications oq ON oq.offered_qualification_id = e.offered_qualification_id
            JOIN tbl_trainee_hdr th ON th.trainee_id = e.trainee_id
            WHERE e.status = 'approved'
              AND th.user_id IS NOT NULL
              AND COALESCE($enrollmentQualificationExpr, oq.qualification_id, b.qualification_id) = ?
              AND (
                    (
                        COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
                        AND EXISTS (
                            SELECT 1
                            FROM tbl_batch_trainer_assignments a
                            WHERE a.batch_id = b.batch_id
                              AND a.module_id = ?
                              AND a.trainer_id = ?
                        )
                    )
                    OR (
                        COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
                        AND NOT EXISTS (
                            SELECT 1
                            FROM tbl_batch_trainer_assignments fallback_assignments
                            WHERE fallback_assignments.batch_id = b.batch_id
                        )
                        AND b.trainer_id = ?
                    )
                    OR (
                        COALESCE(b.trainer_assignment_mode, 'single') <> 'multiple'
                        AND b.trainer_id = ?
                    )
              )
            ORDER BY th.last_name, th.first_name
        ");
        $stmt->execute([$qualificationId, $moduleId, $trainerId, $trainerId, $trainerId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}
