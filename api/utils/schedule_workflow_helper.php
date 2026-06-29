<?php

require_once __DIR__ . '/trainer_assignment_helper.php';

if (!function_exists('sw_ensure_schema')) {
    function sw_ensure_schema(PDO $conn): void
    {
        static $ensured = false;
        if ($ensured) {
            return;
        }

        try {
            $conn->exec("CREATE TABLE IF NOT EXISTS `tbl_schedule_requests` (
                `request_id` INT AUTO_INCREMENT PRIMARY KEY,
                `scope_key` VARCHAR(190) NOT NULL,
                `batch_id` INT NOT NULL,
                `module_id` INT NULL,
                `trainer_id` INT NOT NULL,
                `scope_type` ENUM('batch','lead_batch','module') NOT NULL DEFAULT 'batch',
                `schedule` VARCHAR(255) NULL,
                `room_id` INT NULL,
                `effective_date` DATE NULL,
                `status` ENUM('pending_trainer_response','pending_registrar_approval','approved','rejected','modification_requested') NOT NULL DEFAULT 'pending_trainer_response',
                `proposed_by_role` ENUM('registrar','trainer') NOT NULL DEFAULT 'registrar',
                `created_by_user_id` INT NULL,
                `trainer_note` TEXT NULL,
                `registrar_note` TEXT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `uniq_scope_key` (`scope_key`),
                KEY `idx_batch` (`batch_id`),
                KEY `idx_module` (`module_id`),
                KEY `idx_trainer` (`trainer_id`),
                KEY `idx_room` (`room_id`),
                KEY `idx_status` (`status`),
                KEY `idx_creator` (`created_by_user_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");
        } catch (Exception $e) {
            error_log('Unable to ensure tbl_schedule_requests exists: ' . $e->getMessage());
        }

        $ensured = true;
    }
}

if (!function_exists('sw_normalize_status')) {
    function sw_normalize_status($status): string
    {
        $normalized = strtolower(trim((string)$status));
        $allowed = [
            'pending_trainer_response',
            'pending_registrar_approval',
            'approved',
            'rejected',
            'modification_requested'
        ];

        return in_array($normalized, $allowed, true) ? $normalized : 'pending_trainer_response';
    }
}

if (!function_exists('sw_normalize_scope_type')) {
    function sw_normalize_scope_type($scopeType, ?int $moduleId = null, string $mode = 'single'): string
    {
        $normalized = strtolower(trim((string)$scopeType));
        if ($normalized === 'module_summary') {
            $normalized = 'module';
        }

        if ($normalized === 'module' && ($moduleId === null || $moduleId <= 0)) {
            $normalized = ta_normalize_mode($mode) === 'multiple' ? 'lead_batch' : 'batch';
        }

        if (!in_array($normalized, ['batch', 'lead_batch', 'module'], true)) {
            $normalized = ta_normalize_mode($mode) === 'multiple' ? 'lead_batch' : 'batch';
        }

        return $normalized;
    }
}

if (!function_exists('sw_build_scope_key')) {
    function sw_build_scope_key(int $batchId, string $scopeType, ?int $moduleId = null): string
    {
        $normalizedScope = sw_normalize_scope_type($scopeType, $moduleId);
        if ($normalizedScope === 'module') {
            return sprintf('batch:%d:module:%d', $batchId, (int)$moduleId);
        }

        return sprintf('batch:%d:%s', $batchId, $normalizedScope);
    }
}

if (!function_exists('sw_normalize_date')) {
    function sw_normalize_date($value): ?string
    {
        $text = trim((string)$value);
        if ($text === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $text)) {
            return null;
        }

        return $text;
    }
}

if (!function_exists('sw_resolve_effective_date')) {
    function sw_resolve_effective_date(array $batch, $effectiveDate = null): ?string
    {
        $candidate = sw_normalize_date($effectiveDate);
        $batchStart = sw_normalize_date($batch['start_date'] ?? null);
        $batchEnd = sw_normalize_date($batch['end_date'] ?? null);

        if ($candidate === null) {
            return $batchStart;
        }

        if ($batchStart !== null && $candidate < $batchStart) {
            throw new Exception('Selected date cannot be earlier than the batch start date.');
        }

        if ($batchEnd !== null && $candidate > $batchEnd) {
            throw new Exception('Selected date cannot be later than the batch end date.');
        }

        return $candidate;
    }
}

if (!function_exists('sw_fetch_batch_context')) {
    function sw_fetch_batch_context(PDO $conn, int $batchId): ?array
    {
        if ($batchId <= 0) {
            return null;
        }

        ta_ensure_schema($conn);
        sw_ensure_schema($conn);

        $stmt = $conn->prepare("
            SELECT
                b.batch_id,
                b.batch_name,
                b.qualification_id,
                b.trainer_id,
                b.start_date,
                b.end_date,
                b.status,
                COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode,
                q.qualification_name AS course_name
            FROM tbl_batch b
            LEFT JOIN tbl_qualifications q ON q.qualification_id = b.qualification_id
            WHERE b.batch_id = ?
            LIMIT 1
        ");
        $stmt->execute([$batchId]);
        $batch = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

        if ($batch) {
            $batch['batch_id'] = (int)$batch['batch_id'];
            $batch['qualification_id'] = (int)($batch['qualification_id'] ?? 0);
            $batch['trainer_id'] = !empty($batch['trainer_id']) ? (int)$batch['trainer_id'] : null;
            $batch['trainer_assignment_mode'] = ta_normalize_mode($batch['trainer_assignment_mode'] ?? 'single');
        }

        return $batch;
    }
}

if (!function_exists('sw_fetch_trainer_user_id')) {
    function sw_fetch_trainer_user_id(PDO $conn, int $trainerId): ?int
    {
        if ($trainerId <= 0) {
            return null;
        }

        $stmt = $conn->prepare("SELECT user_id FROM tbl_trainer WHERE trainer_id = ? LIMIT 1");
        $stmt->execute([$trainerId]);
        $userId = $stmt->fetchColumn();

        $normalized = (int)$userId;
        return $normalized > 0 ? $normalized : null;
    }
}

if (!function_exists('sw_fetch_registrar_user_ids')) {
    function sw_fetch_registrar_user_ids(PDO $conn): array
    {
        $stmt = $conn->prepare("
            SELECT u.user_id
            FROM tbl_users u
            JOIN tbl_role r ON r.role_id = u.role_id
            WHERE LOWER(TRIM(r.role_name)) = 'registrar'
        ");
        $stmt->execute();

        return array_values(array_unique(array_filter(array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []))));
    }
}

if (!function_exists('sw_insert_notification')) {
    function sw_insert_notification(PDO $conn, array $payload): void
    {
        if (!ta_table_exists($conn, 'tbl_notifications')) {
            return;
        }

        $message = trim((string)($payload['message'] ?? ''));
        if ($message === '') {
            return;
        }

        $title = trim((string)($payload['title'] ?? ''));
        $link = trim((string)($payload['link'] ?? ''));
        $targetRole = trim((string)($payload['target_role'] ?? ''));
        $targetUserId = (int)($payload['target_user_id'] ?? 0);
        $userId = (int)($payload['user_id'] ?? 0);
        $actorId = (int)($payload['actor_id'] ?? 0);

        $columns = [];
        $placeholders = [];
        $params = [];

        if (ta_column_exists($conn, 'tbl_notifications', 'target_role')) {
            $columns[] = 'target_role';
            $placeholders[] = '?';
            $params[] = $targetRole !== '' ? $targetRole : null;
        }

        if (ta_column_exists($conn, 'tbl_notifications', 'target_user_id')) {
            $columns[] = 'target_user_id';
            $placeholders[] = '?';
            $params[] = $targetUserId > 0 ? $targetUserId : null;
        }

        if (ta_column_exists($conn, 'tbl_notifications', 'user_id')) {
            $columns[] = 'user_id';
            $placeholders[] = '?';
            $params[] = $userId > 0 ? $userId : ($targetUserId > 0 ? $targetUserId : null);
        }

        if (ta_column_exists($conn, 'tbl_notifications', 'actor_id')) {
            $columns[] = 'actor_id';
            $placeholders[] = '?';
            $params[] = $actorId > 0 ? $actorId : null;
        }

        $columns[] = 'title';
        $placeholders[] = '?';
        $params[] = $title !== '' ? $title : null;

        $columns[] = 'message';
        $placeholders[] = '?';
        $params[] = $message;

        $columns[] = 'link';
        $placeholders[] = '?';
        $params[] = $link !== '' ? $link : null;

        $stmt = $conn->prepare(sprintf(
            'INSERT INTO tbl_notifications (%s) VALUES (%s)',
            implode(', ', $columns),
            implode(', ', $placeholders)
        ));
        $stmt->execute($params);
    }
}

if (!function_exists('sw_build_trainer_request_link')) {
    function sw_build_trainer_request_link(int $requestId, string $action = 'respond'): string
    {
        return '/Hohoo-ville/frontend/html/trainer/trainer_dashboard.html?schedule_request_id=' . urlencode((string)$requestId) . '&schedule_action=' . urlencode($action);
    }
}

if (!function_exists('sw_build_registrar_request_link')) {
    function sw_build_registrar_request_link(int $requestId, string $action = 'review'): string
    {
        return '/Hohoo-ville/frontend/html/registrar/pages/schedule.html?schedule_request_id=' . urlencode((string)$requestId) . '&schedule_action=' . urlencode($action);
    }
}

if (!function_exists('sw_convert_to_24_hour')) {
    function sw_convert_to_24_hour(string $hour, string $minute, string $meridiem): string
    {
        $numericHour = (int)$hour;
        $suffix = strtolower(trim($meridiem));
        if ($suffix === 'pm' && $numericHour !== 12) {
            $numericHour += 12;
        }
        if ($suffix === 'am' && $numericHour === 12) {
            $numericHour = 0;
        }

        return str_pad((string)$numericHour, 2, '0', STR_PAD_LEFT) . ':' . $minute;
    }
}

if (!function_exists('sw_parse_compact_schedule_days')) {
    function sw_parse_compact_schedule_days(string $scheduleText): array
    {
        $prefix = trim(explode('(', $scheduleText)[0] ?? '');
        $compactCode = strtolower(preg_replace('/[^A-Za-z]/', '', $prefix));
        if ($compactCode === '' || !preg_match('/^(?:m|t|w|th|f|s)+$/', $compactCode)) {
            return [];
        }

        $dayMap = [
            'm' => 'Monday',
            't' => 'Tuesday',
            'w' => 'Wednesday',
            'th' => 'Thursday',
            'f' => 'Friday',
            's' => 'Saturday'
        ];

        $days = [];
        $index = 0;
        while ($index < strlen($compactCode)) {
            if (substr($compactCode, $index, 2) === 'th') {
                $days[] = $dayMap['th'];
                $index += 2;
                continue;
            }

            $token = $compactCode[$index];
            if (isset($dayMap[$token])) {
                $days[] = $dayMap[$token];
            }
            $index += 1;
        }

        return array_values(array_unique($days));
    }
}

if (!function_exists('sw_parse_schedule_for_conflict')) {
    function sw_parse_schedule_for_conflict(string $scheduleText): array
    {
        $text = strtolower(trim($scheduleText));
        if ($text === '') {
            return ['days' => [], 'startTime' => '', 'endTime' => ''];
        }

        $days = sw_parse_compact_schedule_days($scheduleText);
        $startTime = '';
        $endTime = '';

        if (preg_match('/(\d{2}):(\d{2})-(\d{2}):(\d{2})/', $text, $matches)) {
            $startTime = $matches[1] . ':' . $matches[2];
            $endTime = $matches[3] . ':' . $matches[4];
        } elseif (preg_match('/(\d+):(\d+)\s*(am|pm)\s*-\s*(\d+):(\d+)\s*(am|pm)/i', $scheduleText, $matches)) {
            $startTime = sw_convert_to_24_hour($matches[1], $matches[2], $matches[3]);
            $endTime = sw_convert_to_24_hour($matches[4], $matches[5], $matches[6]);
        }

        $shorthandMap = [
            'weekday' => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            'mwf' => ['Monday', 'Wednesday', 'Friday'],
            'tth' => ['Tuesday', 'Thursday'],
            'mon' => ['Monday'],
            'tue' => ['Tuesday'],
            'wed' => ['Wednesday'],
            'thu' => ['Thursday'],
            'fri' => ['Friday'],
            'sat' => ['Saturday']
        ];

        foreach ($shorthandMap as $token => $tokenDays) {
            if (strpos($text, $token) !== false) {
                $days = array_values(array_unique(array_merge($days, $tokenDays)));
            }
        }

        if (empty($days)) {
            $patterns = [
                '/mon(?:day)?/i' => 'Monday',
                '/tue(?:sday)?/i' => 'Tuesday',
                '/wed(?:nesday)?/i' => 'Wednesday',
                '/thu(?:rsday)?/i' => 'Thursday',
                '/fri(?:day)?/i' => 'Friday',
                '/sat(?:urday)?/i' => 'Saturday'
            ];

            foreach ($patterns as $pattern => $day) {
                if (preg_match($pattern, $scheduleText)) {
                    $days[] = $day;
                }
            }
        }

        if (empty($days) && (strpos($text, 'shift') !== false || strpos($text, 'day') !== false || strpos($text, 'night') !== false)) {
            $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        }

        return [
            'days' => array_values(array_unique($days)),
            'startTime' => $startTime,
            'endTime' => $endTime
        ];
    }
}

if (!function_exists('sw_schedules_overlap')) {
    function sw_schedules_overlap(string $leftSchedule, string $rightSchedule): bool
    {
        $left = sw_parse_schedule_for_conflict($leftSchedule);
        $right = sw_parse_schedule_for_conflict($rightSchedule);

        if (
            empty($left['days']) ||
            empty($right['days']) ||
            empty($left['startTime']) ||
            empty($left['endTime']) ||
            empty($right['startTime']) ||
            empty($right['endTime'])
        ) {
            return false;
        }

        $sharedDays = array_values(array_intersect($left['days'], $right['days']));
        if (empty($sharedDays)) {
            return false;
        }

        return $left['startTime'] < $right['endTime'] && $right['startTime'] < $left['endTime'];
    }
}

if (!function_exists('sw_date_ranges_overlap')) {
    function sw_date_ranges_overlap(?string $startA, ?string $endA, ?string $startB, ?string $endB): bool
    {
        $normalizedStartA = sw_normalize_date($startA);
        $normalizedEndA = sw_normalize_date($endA);
        $normalizedStartB = sw_normalize_date($startB);
        $normalizedEndB = sw_normalize_date($endB);

        if ($normalizedStartA === null || $normalizedEndA === null || $normalizedStartB === null || $normalizedEndB === null) {
            return true;
        }

        return max($normalizedStartA, $normalizedStartB) <= min($normalizedEndA, $normalizedEndB);
    }
}

if (!function_exists('sw_build_scope_label')) {
    function sw_build_scope_label(array $row): string
    {
        $scopeType = sw_normalize_scope_type($row['scope_type'] ?? 'batch', !empty($row['module_id']) ? (int)$row['module_id'] : null);
        if ($scopeType === 'module') {
            $moduleTitle = trim((string)($row['module_title'] ?? 'Untitled Unit'));
            $competencyType = ucfirst(trim((string)($row['competency_type'] ?? '')));
            return $competencyType !== '' ? $moduleTitle . ' (' . $competencyType . ')' : $moduleTitle;
        }

        return $scopeType === 'lead_batch' ? 'Lead Trainer Batch Schedule' : 'Full Batch';
    }
}

if (!function_exists('sw_fetch_schedule_request_rows')) {
    function sw_fetch_schedule_request_rows(PDO $conn, array $filters = []): array
    {
        ta_ensure_schema($conn);
        sw_ensure_schema($conn);

        $unitCodeSelect = ta_column_exists($conn, 'tbl_module', 'unit_code')
            ? "COALESCE(m.unit_code, '') AS unit_code,"
            : "'' AS unit_code,";

        $requestRoomSelect = "COALESCE(CAST(sr.room_id AS CHAR), 'TBA') AS requested_room_name";
        $requestRoomJoin = '';
        $batchCurrentRoomSelect = "COALESCE(CAST(s_current.room_id AS CHAR), 'TBA') AS batch_current_room_name";
        $batchCurrentRoomJoin = '';
        $moduleCurrentRoomSelect = "COALESCE(CAST(a_current.room_id AS CHAR), 'TBA') AS module_current_room_name";
        $moduleCurrentRoomJoin = '';

        if (ta_table_exists($conn, 'tbl_rooms') && ta_column_exists($conn, 'tbl_rooms', 'room_name')) {
            $requestRoomSelect = "COALESCE(r_request.room_name, CAST(sr.room_id AS CHAR), 'TBA') AS requested_room_name";
            $requestRoomJoin = "LEFT JOIN tbl_rooms r_request ON r_request.room_id = sr.room_id";
            $batchCurrentRoomSelect = "COALESCE(r_batch_current.room_name, CAST(s_current.room_id AS CHAR), 'TBA') AS batch_current_room_name";
            $batchCurrentRoomJoin = "LEFT JOIN tbl_rooms r_batch_current ON r_batch_current.room_id = s_current.room_id";
            $moduleCurrentRoomSelect = "COALESCE(r_module_current.room_name, CAST(a_current.room_id AS CHAR), 'TBA') AS module_current_room_name";
            $moduleCurrentRoomJoin = "LEFT JOIN tbl_rooms r_module_current ON r_module_current.room_id = a_current.room_id";
        }

        $where = [];
        $params = [];

        if (!empty($filters['request_id'])) {
            $where[] = 'sr.request_id = ?';
            $params[] = (int)$filters['request_id'];
        }

        if (!empty($filters['trainer_id'])) {
            $where[] = 'sr.trainer_id = ?';
            $params[] = (int)$filters['trainer_id'];
        }

        if (!empty($filters['batch_ids']) && is_array($filters['batch_ids'])) {
            $batchIds = array_values(array_unique(array_filter(array_map('intval', $filters['batch_ids']))));
            if (!empty($batchIds)) {
                $where[] = 'sr.batch_id IN (' . implode(',', array_fill(0, count($batchIds), '?')) . ')';
                $params = array_merge($params, $batchIds);
            }
        }

        if (!empty($filters['statuses']) && is_array($filters['statuses'])) {
            $statuses = array_values(array_unique(array_map('sw_normalize_status', $filters['statuses'])));
            if (!empty($statuses)) {
                $where[] = 'sr.status IN (' . implode(',', array_fill(0, count($statuses), '?')) . ')';
                $params = array_merge($params, $statuses);
            }
        }

        $sql = "
            SELECT
                sr.request_id,
                sr.scope_key,
                sr.batch_id,
                sr.module_id,
                sr.trainer_id,
                sr.scope_type,
                sr.schedule,
                sr.room_id,
                sr.effective_date,
                sr.status,
                sr.proposed_by_role,
                sr.created_by_user_id,
                sr.trainer_note,
                sr.registrar_note,
                sr.created_at,
                sr.updated_at,
                b.batch_name,
                b.qualification_id,
                b.start_date,
                b.end_date,
                b.status AS batch_status,
                COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode,
                q.qualification_name AS course_name,
                m.module_title,
                COALESCE(m.competency_type, '') AS competency_type,
                {$unitCodeSelect}
                TRIM(CONCAT_WS(' ', t.first_name, t.last_name)) AS trainer_name,
                t.user_id AS trainer_user_id,
                {$requestRoomSelect},
                s_current.schedule AS batch_current_schedule,
                s_current.room_id AS batch_current_room_id,
                {$batchCurrentRoomSelect},
                a_current.schedule AS module_current_schedule,
                a_current.room_id AS module_current_room_id,
                {$moduleCurrentRoomSelect}
            FROM tbl_schedule_requests sr
            JOIN tbl_batch b ON b.batch_id = sr.batch_id
            LEFT JOIN tbl_qualifications q ON q.qualification_id = b.qualification_id
            LEFT JOIN tbl_module m ON m.module_id = sr.module_id
            LEFT JOIN tbl_trainer t ON t.trainer_id = sr.trainer_id
            {$requestRoomJoin}
            LEFT JOIN tbl_schedule s_current ON s_current.batch_id = sr.batch_id
            {$batchCurrentRoomJoin}
            LEFT JOIN tbl_batch_trainer_assignments a_current
                ON a_current.batch_id = sr.batch_id
               AND a_current.module_id = sr.module_id
            {$moduleCurrentRoomJoin}
        ";

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY sr.updated_at DESC, sr.request_id DESC';

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        foreach ($rows as &$row) {
            $row['request_id'] = (int)$row['request_id'];
            $row['batch_id'] = (int)$row['batch_id'];
            $row['qualification_id'] = (int)($row['qualification_id'] ?? 0);
            $row['module_id'] = !empty($row['module_id']) ? (int)$row['module_id'] : null;
            $row['trainer_id'] = !empty($row['trainer_id']) ? (int)$row['trainer_id'] : null;
            $row['trainer_user_id'] = !empty($row['trainer_user_id']) ? (int)$row['trainer_user_id'] : null;
            $row['room_id'] = !empty($row['room_id']) ? (int)$row['room_id'] : null;
            $row['batch_current_room_id'] = !empty($row['batch_current_room_id']) ? (int)$row['batch_current_room_id'] : null;
            $row['module_current_room_id'] = !empty($row['module_current_room_id']) ? (int)$row['module_current_room_id'] : null;
            $row['status'] = sw_normalize_status($row['status'] ?? '');
            $row['trainer_assignment_mode'] = ta_normalize_mode($row['trainer_assignment_mode'] ?? 'single');
            $row['scope_type'] = sw_normalize_scope_type($row['scope_type'] ?? '', $row['module_id'], $row['trainer_assignment_mode']);
            $row['scope_label'] = sw_build_scope_label($row);
            $row['room'] = $row['requested_room_name'] ?? 'TBA';
            $row['resolved_effective_date'] = sw_normalize_date($row['effective_date'] ?? null) ?: sw_normalize_date($row['start_date'] ?? null);

            if ($row['scope_type'] === 'module') {
                $row['current_schedule'] = $row['module_current_schedule'] ?? null;
                $row['current_room_id'] = $row['module_current_room_id'];
                $row['current_room'] = $row['module_current_room_name'] ?? 'TBA';
            } else {
                $row['current_schedule'] = $row['batch_current_schedule'] ?? null;
                $row['current_room_id'] = $row['batch_current_room_id'];
                $row['current_room'] = $row['batch_current_room_name'] ?? 'TBA';
            }
        }
        unset($row);

        return $rows;
    }
}

if (!function_exists('sw_fetch_schedule_request_by_id')) {
    function sw_fetch_schedule_request_by_id(PDO $conn, int $requestId): ?array
    {
        $rows = sw_fetch_schedule_request_rows($conn, ['request_id' => $requestId]);
        return $rows[0] ?? null;
    }
}

if (!function_exists('sw_fetch_schedule_request_by_scope')) {
    function sw_fetch_schedule_request_by_scope(PDO $conn, int $batchId, string $scopeType, ?int $moduleId = null): ?array
    {
        ta_ensure_schema($conn);
        sw_ensure_schema($conn);

        $scopeKey = sw_build_scope_key($batchId, $scopeType, $moduleId);
        $stmt = $conn->prepare("SELECT request_id FROM tbl_schedule_requests WHERE scope_key = ? LIMIT 1");
        $stmt->execute([$scopeKey]);
        $requestId = (int)$stmt->fetchColumn();

        return $requestId > 0 ? sw_fetch_schedule_request_by_id($conn, $requestId) : null;
    }
}

if (!function_exists('sw_persist_schedule_request')) {
    function sw_persist_schedule_request(PDO $conn, array $payload): int
    {
        sw_ensure_schema($conn);

        $scopeKey = sw_build_scope_key(
            (int)$payload['batch_id'],
            (string)$payload['scope_type'],
            !empty($payload['module_id']) ? (int)$payload['module_id'] : null
        );

        $existingStmt = $conn->prepare("SELECT request_id FROM tbl_schedule_requests WHERE scope_key = ? LIMIT 1");
        $existingStmt->execute([$scopeKey]);
        $existingId = (int)$existingStmt->fetchColumn();

        $params = [
            ':batch_id' => (int)$payload['batch_id'],
            ':module_id' => !empty($payload['module_id']) ? (int)$payload['module_id'] : null,
            ':trainer_id' => (int)$payload['trainer_id'],
            ':scope_type' => (string)$payload['scope_type'],
            ':schedule' => trim((string)$payload['schedule']) ?: null,
            ':room_id' => !empty($payload['room_id']) ? (int)$payload['room_id'] : null,
            ':effective_date' => sw_normalize_date($payload['effective_date'] ?? null),
            ':status' => sw_normalize_status($payload['status'] ?? ''),
            ':proposed_by_role' => strtolower(trim((string)($payload['proposed_by_role'] ?? 'registrar'))) === 'trainer' ? 'trainer' : 'registrar',
            ':created_by_user_id' => !empty($payload['created_by_user_id']) ? (int)$payload['created_by_user_id'] : null,
            ':trainer_note' => array_key_exists('trainer_note', $payload) ? $payload['trainer_note'] : null,
            ':registrar_note' => array_key_exists('registrar_note', $payload) ? $payload['registrar_note'] : null
        ];

        if ($existingId > 0) {
            $stmt = $conn->prepare("
                UPDATE tbl_schedule_requests
                SET batch_id = :batch_id,
                    module_id = :module_id,
                    trainer_id = :trainer_id,
                    scope_type = :scope_type,
                    schedule = :schedule,
                    room_id = :room_id,
                    effective_date = :effective_date,
                    status = :status,
                    proposed_by_role = :proposed_by_role,
                    created_by_user_id = :created_by_user_id,
                    trainer_note = :trainer_note,
                    registrar_note = :registrar_note,
                    updated_at = NOW()
                WHERE request_id = :request_id
            ");
            $stmt->execute($params + [':request_id' => $existingId]);
            return $existingId;
        }

        $stmt = $conn->prepare("
            INSERT INTO tbl_schedule_requests (
                scope_key,
                batch_id,
                module_id,
                trainer_id,
                scope_type,
                schedule,
                room_id,
                effective_date,
                status,
                proposed_by_role,
                created_by_user_id,
                trainer_note,
                registrar_note,
                created_at,
                updated_at
            ) VALUES (
                :scope_key,
                :batch_id,
                :module_id,
                :trainer_id,
                :scope_type,
                :schedule,
                :room_id,
                :effective_date,
                :status,
                :proposed_by_role,
                :created_by_user_id,
                :trainer_note,
                :registrar_note,
                NOW(),
                NOW()
            )
        ");
        $stmt->execute($params + [':scope_key' => $scopeKey]);
        return (int)$conn->lastInsertId();
    }
}

if (!function_exists('sw_fetch_schedule_conflict_allocations')) {
    function sw_fetch_schedule_conflict_allocations(PDO $conn): array
    {
        ta_ensure_schema($conn);
        sw_ensure_schema($conn);

        $unitCodeSelect = ta_column_exists($conn, 'tbl_module', 'unit_code')
            ? "COALESCE(m.unit_code, '') AS unit_code"
            : "'' AS unit_code";

        $batchRoomSelect = "COALESCE(CAST(s.room_id AS CHAR), 'TBA') AS room_name";
        $batchRoomJoin = '';
        $moduleRoomSelect = "COALESCE(CAST(a.room_id AS CHAR), 'TBA') AS room_name";
        $moduleRoomJoin = '';

        if (ta_table_exists($conn, 'tbl_rooms') && ta_column_exists($conn, 'tbl_rooms', 'room_name')) {
            $batchRoomSelect = "COALESCE(r_batch.room_name, CAST(s.room_id AS CHAR), 'TBA') AS room_name";
            $batchRoomJoin = "LEFT JOIN tbl_rooms r_batch ON r_batch.room_id = s.room_id";
            $moduleRoomSelect = "COALESCE(r_module.room_name, CAST(a.room_id AS CHAR), 'TBA') AS room_name";
            $moduleRoomJoin = "LEFT JOIN tbl_rooms r_module ON r_module.room_id = a.room_id";
        }

        $batchStmt = $conn->prepare("
            SELECT
                'approved' AS source,
                NULL AS request_id,
                NULL AS scope_key,
                b.batch_id,
                CASE WHEN COALESCE(b.trainer_assignment_mode, 'single') = 'multiple' THEN 'lead_batch' ELSE 'batch' END AS scope_type,
                NULL AS module_id,
                b.trainer_id,
                s.room_id,
                s.schedule,
                b.start_date AS effective_start_date,
                b.end_date AS effective_end_date,
                b.batch_name,
                b.status AS batch_status,
                TRIM(CONCAT_WS(' ', t.first_name, t.last_name)) AS trainer_name,
                {$batchRoomSelect},
                CASE WHEN COALESCE(b.trainer_assignment_mode, 'single') = 'multiple' THEN 'Lead Trainer Batch Schedule' ELSE 'Full Batch' END AS scope_label
            FROM tbl_schedule s
            JOIN tbl_batch b ON b.batch_id = s.batch_id
            LEFT JOIN tbl_trainer t ON t.trainer_id = b.trainer_id
            {$batchRoomJoin}
            WHERE COALESCE(TRIM(s.schedule), '') <> ''
              AND b.status IN ('open', 'in-progress')
        ");
        $batchStmt->execute();
        $batchRows = $batchStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $moduleStmt = $conn->prepare("
            SELECT
                'approved' AS source,
                NULL AS request_id,
                NULL AS scope_key,
                a.batch_id,
                'module' AS scope_type,
                a.module_id,
                a.trainer_id,
                a.room_id,
                a.schedule,
                b.start_date AS effective_start_date,
                b.end_date AS effective_end_date,
                b.batch_name,
                b.status AS batch_status,
                TRIM(CONCAT_WS(' ', t.first_name, t.last_name)) AS trainer_name,
                {$moduleRoomSelect},
                m.module_title,
                COALESCE(m.competency_type, '') AS competency_type,
                {$unitCodeSelect}
            FROM tbl_batch_trainer_assignments a
            JOIN tbl_batch b ON b.batch_id = a.batch_id
            JOIN tbl_module m ON m.module_id = a.module_id
            LEFT JOIN tbl_trainer t ON t.trainer_id = a.trainer_id
            {$moduleRoomJoin}
            WHERE COALESCE(TRIM(a.schedule), '') <> ''
              AND b.status IN ('open', 'in-progress')
        ");
        $moduleStmt->execute();
        $moduleRows = $moduleStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        foreach ($moduleRows as &$row) {
            $row['scope_label'] = sw_build_scope_label($row);
        }
        unset($row);

        $requestRows = sw_fetch_schedule_request_rows($conn, [
            'statuses' => ['pending_trainer_response', 'pending_registrar_approval', 'modification_requested']
        ]);

        $requestAllocations = array_map(static function (array $row): array {
            return [
                'source' => 'request',
                'request_id' => (int)$row['request_id'],
                'scope_key' => $row['scope_key'],
                'batch_id' => (int)$row['batch_id'],
                'scope_type' => $row['scope_type'],
                'module_id' => !empty($row['module_id']) ? (int)$row['module_id'] : null,
                'trainer_id' => !empty($row['trainer_id']) ? (int)$row['trainer_id'] : null,
                'room_id' => !empty($row['room_id']) ? (int)$row['room_id'] : null,
                'schedule' => $row['schedule'] ?? null,
                'effective_start_date' => $row['resolved_effective_date'] ?? null,
                'effective_end_date' => $row['end_date'] ?? null,
                'batch_name' => $row['batch_name'] ?? '',
                'batch_status' => $row['batch_status'] ?? '',
                'trainer_name' => $row['trainer_name'] ?? '',
                'room_name' => $row['room'] ?? 'TBA',
                'scope_label' => $row['scope_label'] ?? '',
                'status' => $row['status'] ?? ''
            ];
        }, $requestRows);

        $allocations = array_merge($batchRows, $moduleRows, $requestAllocations);
        foreach ($allocations as &$allocation) {
            $allocation['batch_id'] = (int)($allocation['batch_id'] ?? 0);
            $allocation['module_id'] = !empty($allocation['module_id']) ? (int)$allocation['module_id'] : null;
            $allocation['trainer_id'] = !empty($allocation['trainer_id']) ? (int)$allocation['trainer_id'] : null;
            $allocation['room_id'] = !empty($allocation['room_id']) ? (int)$allocation['room_id'] : null;
            $allocation['request_id'] = !empty($allocation['request_id']) ? (int)$allocation['request_id'] : null;
            $allocation['scope_type'] = sw_normalize_scope_type($allocation['scope_type'] ?? '', $allocation['module_id']);
            $allocation['effective_start_date'] = sw_normalize_date($allocation['effective_start_date'] ?? null);
            $allocation['effective_end_date'] = sw_normalize_date($allocation['effective_end_date'] ?? null);
        }
        unset($allocation);

        return $allocations;
    }
}

if (!function_exists('sw_same_scope')) {
    function sw_same_scope(array $left, array $right): bool
    {
        $leftScope = sw_normalize_scope_type($left['scope_type'] ?? '', !empty($left['module_id']) ? (int)$left['module_id'] : null);
        $rightScope = sw_normalize_scope_type($right['scope_type'] ?? '', !empty($right['module_id']) ? (int)$right['module_id'] : null);

        if ((int)($left['batch_id'] ?? 0) !== (int)($right['batch_id'] ?? 0)) {
            return false;
        }

        if ($leftScope !== $rightScope) {
            return false;
        }

        if ($leftScope === 'module') {
            return (int)($left['module_id'] ?? 0) === (int)($right['module_id'] ?? 0);
        }

        return true;
    }
}

if (!function_exists('sw_format_conflict_message')) {
    function sw_format_conflict_message(array $conflict): string
    {
        $batchName = trim((string)($conflict['batch_name'] ?? 'another batch'));
        $scopeLabel = trim((string)($conflict['scope_label'] ?? 'scheduled session'));
        $schedule = trim((string)($conflict['schedule'] ?? ''));

        switch ($conflict['type'] ?? '') {
            case 'room':
                $roomName = trim((string)($conflict['room_name'] ?? 'Selected room'));
                return sprintf(
                    '%s is already reserved for %s under %s%s',
                    $roomName,
                    $batchName,
                    $scopeLabel,
                    $schedule !== '' ? ' (' . $schedule . ')' : ''
                );
            case 'trainer':
                $trainerName = trim((string)($conflict['trainer_name'] ?? 'Selected trainer'));
                return sprintf(
                    '%s already has a conflicting session for %s under %s%s',
                    $trainerName,
                    $batchName,
                    $scopeLabel,
                    $schedule !== '' ? ' (' . $schedule . ')' : ''
                );
            case 'batch':
                return sprintf(
                    '%s already has an overlapping session under %s%s',
                    $batchName,
                    $scopeLabel,
                    $schedule !== '' ? ' (' . $schedule . ')' : ''
                );
            case 'duplicate':
                return 'This schedule already matches the current approved schedule for this assignment.';
            default:
                return 'A conflicting schedule was detected.';
        }
    }
}

if (!function_exists('sw_find_conflicts')) {
    function sw_find_conflicts(PDO $conn, array $candidate): array
    {
        $batch = sw_fetch_batch_context($conn, (int)($candidate['batch_id'] ?? 0));
        if (!$batch) {
            throw new Exception('Batch not found.');
        }

        $schedule = trim((string)($candidate['schedule'] ?? ''));
        if ($schedule === '') {
            return [];
        }

        $scopeType = sw_normalize_scope_type(
            $candidate['scope_type'] ?? '',
            !empty($candidate['module_id']) ? (int)$candidate['module_id'] : null,
            $candidate['trainer_assignment_mode'] ?? ($batch['trainer_assignment_mode'] ?? 'single')
        );
        $moduleId = !empty($candidate['module_id']) ? (int)$candidate['module_id'] : null;
        $trainerId = !empty($candidate['trainer_id']) ? (int)$candidate['trainer_id'] : null;
        $roomId = !empty($candidate['room_id']) ? (int)$candidate['room_id'] : null;
        $effectiveDate = sw_resolve_effective_date($batch, $candidate['effective_date'] ?? null);
        $candidateScope = [
            'batch_id' => (int)$batch['batch_id'],
            'scope_type' => $scopeType,
            'module_id' => $moduleId
        ];

        $approvedScope = null;
        if ($scopeType === 'module') {
            $stmt = $conn->prepare("
                SELECT schedule, room_id
                FROM tbl_batch_trainer_assignments
                WHERE batch_id = ? AND module_id = ?
                LIMIT 1
            ");
            $stmt->execute([(int)$batch['batch_id'], (int)$moduleId]);
            $approvedScope = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } else {
            $stmt = $conn->prepare("
                SELECT schedule, room_id
                FROM tbl_schedule
                WHERE batch_id = ?
                LIMIT 1
            ");
            $stmt->execute([(int)$batch['batch_id']]);
            $approvedScope = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        if ($approvedScope) {
            $approvedSchedule = trim((string)($approvedScope['schedule'] ?? ''));
            $approvedRoomId = !empty($approvedScope['room_id']) ? (int)$approvedScope['room_id'] : null;
            $approvedEffectiveDate = sw_normalize_date($batch['start_date'] ?? null);

            if (
                $approvedSchedule !== '' &&
                $approvedSchedule === $schedule &&
                $approvedRoomId === $roomId &&
                $approvedEffectiveDate === $effectiveDate
            ) {
                return [[
                    'type' => 'duplicate',
                    'batch_name' => $batch['batch_name'] ?? '',
                    'scope_label' => $scopeType === 'module'
                        ? sw_build_scope_label(['scope_type' => 'module', 'module_id' => $moduleId, 'module_title' => $candidate['module_title'] ?? '', 'competency_type' => $candidate['competency_type'] ?? '', 'unit_code' => $candidate['unit_code'] ?? ''])
                        : ($scopeType === 'lead_batch' ? 'Lead Trainer Batch Schedule' : 'Full Batch'),
                    'schedule' => $approvedSchedule
                ]];
            }
        }

        $allocations = sw_fetch_schedule_conflict_allocations($conn);
        $conflicts = [];
        $candidateRequestId = !empty($candidate['request_id']) ? (int)$candidate['request_id'] : null;

        foreach ($allocations as $allocation) {
            if (empty($allocation['schedule']) || !sw_schedules_overlap($schedule, (string)$allocation['schedule'])) {
                continue;
            }

            if (!sw_date_ranges_overlap(
                $effectiveDate,
                sw_normalize_date($batch['end_date'] ?? null),
                $allocation['effective_start_date'] ?? null,
                $allocation['effective_end_date'] ?? null
            )) {
                continue;
            }

            if ($candidateRequestId !== null && (int)($allocation['request_id'] ?? 0) === $candidateRequestId) {
                continue;
            }

            if (sw_same_scope($candidateScope, $allocation)) {
                continue;
            }

            if ($roomId !== null && $roomId > 0 && $roomId === (int)($allocation['room_id'] ?? 0)) {
                $conflicts[] = array_merge($allocation, ['type' => 'room']);
            }

            if ($trainerId !== null && $trainerId > 0 && $trainerId === (int)($allocation['trainer_id'] ?? 0)) {
                $conflicts[] = array_merge($allocation, ['type' => 'trainer']);
            }

            if ((int)$batch['batch_id'] === (int)($allocation['batch_id'] ?? 0)) {
                $conflicts[] = array_merge($allocation, ['type' => 'batch']);
            }
        }

        $seen = [];
        $uniqueConflicts = [];
        foreach ($conflicts as $conflict) {
            $key = implode('|', [
                $conflict['type'] ?? '',
                $conflict['source'] ?? '',
                (int)($conflict['request_id'] ?? 0),
                (int)($conflict['batch_id'] ?? 0),
                sw_normalize_scope_type($conflict['scope_type'] ?? '', !empty($conflict['module_id']) ? (int)$conflict['module_id'] : null),
                (int)($conflict['module_id'] ?? 0)
            ]);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $uniqueConflicts[] = $conflict;
        }

        usort($uniqueConflicts, static function (array $left, array $right): int {
            $priority = ['duplicate' => 0, 'room' => 1, 'trainer' => 2, 'batch' => 3];
            return ($priority[$left['type'] ?? 'batch'] ?? 99) <=> ($priority[$right['type'] ?? 'batch'] ?? 99);
        });

        return $uniqueConflicts;
    }
}

if (!function_exists('sw_fetch_available_rooms')) {
    function sw_fetch_available_rooms(PDO $conn, array $candidate): array
    {
        if (!ta_table_exists($conn, 'tbl_rooms')) {
            return [];
        }

        $stmt = $conn->prepare("SELECT room_id, room_name FROM tbl_rooms WHERE COALESCE(is_archived, 0) = 0 ORDER BY room_name");
        $stmt->execute();
        $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $available = [];
        foreach ($rooms as $room) {
            $roomId = (int)($room['room_id'] ?? 0);
            if ($roomId <= 0) {
                continue;
            }

            $roomCandidate = $candidate;
            $roomCandidate['room_id'] = $roomId;
            $conflicts = sw_find_conflicts($conn, $roomCandidate);
            $roomConflicts = array_values(array_filter($conflicts, static function (array $conflict): bool {
                return ($conflict['type'] ?? '') === 'room';
            }));

            if (!empty($roomConflicts)) {
                continue;
            }

            $available[] = [
                'room_id' => $roomId,
                'room_name' => $room['room_name'] ?? ('Room ' . $roomId)
            ];
        }

        return $available;
    }
}

if (!function_exists('sw_upsert_batch_schedule')) {
    function sw_upsert_batch_schedule(PDO $conn, int $batchId, string $schedule, ?int $roomId): void
    {
        $checkStmt = $conn->prepare("SELECT schedule_id FROM tbl_schedule WHERE batch_id = ?");
        $checkStmt->execute([$batchId]);
        $scheduleId = $checkStmt->fetchColumn();

        if ($scheduleId) {
            $stmt = $conn->prepare("UPDATE tbl_schedule SET schedule = ?, room_id = ?, updated_at = NOW() WHERE batch_id = ?");
            $stmt->execute([$schedule !== '' ? $schedule : null, $roomId, $batchId]);
            return;
        }

        $stmt = $conn->prepare("INSERT INTO tbl_schedule (batch_id, schedule, room_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())");
        $stmt->execute([$batchId, $schedule !== '' ? $schedule : null, $roomId]);
    }
}

if (!function_exists('sw_apply_request_approval')) {
    function sw_apply_request_approval(PDO $conn, array $request): void
    {
        $batchId = (int)($request['batch_id'] ?? 0);
        $trainerId = (int)($request['trainer_id'] ?? 0);
        $moduleId = !empty($request['module_id']) ? (int)$request['module_id'] : null;
        $scopeType = sw_normalize_scope_type($request['scope_type'] ?? '', $moduleId, $request['trainer_assignment_mode'] ?? 'single');
        $schedule = trim((string)($request['schedule'] ?? ''));
        $roomId = !empty($request['room_id']) ? (int)$request['room_id'] : null;

        if ($batchId <= 0 || $trainerId <= 0 || $schedule === '') {
            throw new Exception('Approved schedule request is incomplete.');
        }

        if ($scopeType === 'module') {
            if ($moduleId === null || $moduleId <= 0) {
                throw new Exception('Module-based schedule requests must reference a unit.');
            }

            $stmtBatch = $conn->prepare("UPDATE tbl_batch SET trainer_assignment_mode = 'multiple' WHERE batch_id = ?");
            $stmtBatch->execute([$batchId]);

            $upsertStmt = $conn->prepare("
                INSERT INTO tbl_batch_trainer_assignments (batch_id, module_id, trainer_id, schedule, room_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    trainer_id = VALUES(trainer_id),
                    schedule = VALUES(schedule),
                    room_id = VALUES(room_id),
                    updated_at = NOW()
            ");
            $upsertStmt->execute([$batchId, $moduleId, $trainerId, $schedule, $roomId]);
            return;
        }

        $mode = $scopeType === 'lead_batch' ? 'multiple' : 'single';
        $stmtBatch = $conn->prepare("UPDATE tbl_batch SET trainer_id = ?, trainer_assignment_mode = ? WHERE batch_id = ?");
        $stmtBatch->execute([$trainerId, $mode, $batchId]);
        sw_upsert_batch_schedule($conn, $batchId, $schedule, $roomId);
    }
}
