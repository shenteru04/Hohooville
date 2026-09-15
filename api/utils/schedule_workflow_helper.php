<?php
/**
 * Schedule Workflow Helper - Simplified for Schedule Presets Only
 * 
 * NOTE: Schedule Request feature has been removed as of 2026-08-16.
 * This file now only manages schedule presets that can be used for batch scheduling.
 * 
 * Trainer scheduling and availability is now determined by the trainer_type column 
 * in tbl_trainer (part-time or full-time).
 */

require_once __DIR__ . '/trainer_assignment_helper.php';

if (!function_exists('sw_ensure_schema')) {
    function sw_ensure_schema(PDO $conn): void
    {
        static $ensured = false;
        if ($ensured) {
            return;
        }

        try {
            $conn->exec("CREATE TABLE IF NOT EXISTS `tbl_schedule_presets` (
                `preset_id` INT AUTO_INCREMENT PRIMARY KEY,
                `preset_name` VARCHAR(255) NOT NULL,
                `schedule` VARCHAR(255) NOT NULL,
                `created_by_user_id` INT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `uniq_schedule` (`schedule`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");

            sw_ensure_schedule_presets($conn);
        } catch (Exception $e) {
            error_log('Unable to ensure tbl_schedule_presets exists: ' . $e->getMessage());
        }

        $ensured = true;
    }
}

if (!function_exists('sw_ensure_schedule_presets')) {
    function sw_ensure_schedule_presets(PDO $conn): void
    {
        if (!ta_table_exists($conn, 'tbl_schedule_presets')) {
            return;
        }

        $stmt = $conn->prepare('SELECT COUNT(*) FROM tbl_schedule_presets');
        $stmt->execute();
        $count = (int)$stmt->fetchColumn();
        if ($count > 0) {
            return;
        }

        return;
    }
}

if (!function_exists('sw_fetch_schedule_presets')) {
    function sw_fetch_schedule_presets(PDO $conn): array
    {
        sw_ensure_schema($conn);

        $stmt = $conn->prepare('SELECT preset_id, preset_name, schedule FROM tbl_schedule_presets ORDER BY preset_name ASC, preset_id ASC');
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map(function ($row) {
            return [
                'preset_id' => (int)($row['preset_id'] ?? 0),
                'preset_name' => trim((string)($row['preset_name'] ?? '')),
                'schedule' => trim((string)($row['schedule'] ?? ''))
            ];
        }, $rows);
    }
}

if (!function_exists('sw_normalize_scope_type')) {
    function sw_normalize_scope_type(string $scopeType, ?int $moduleId, string $assignmentMode): string
    {
        $type = strtolower(trim($scopeType));
        
        if ($type === 'module' && $moduleId > 0 && $assignmentMode === 'multiple') {
            return 'module';
        }
        if ($type === 'lead_batch' && $assignmentMode === 'multiple') {
            return 'lead_batch';
        }
        
        return 'batch';
    }
}

if (!function_exists('sw_build_scope_label')) {
    function sw_build_scope_label(array $row): string
    {
        $scopeType = $row['scope_type'] ?? 'batch';
        $moduleTitle = trim((string)($row['module_title'] ?? ''));
        $competencyType = trim((string)($row['competency_type'] ?? ''));
        $unitCode = trim((string)($row['unit_code'] ?? ''));
        
        if ($scopeType === 'module' && $moduleTitle) {
            $label = $moduleTitle;
            if ($competencyType) {
                $label .= " ($competencyType)";
            }
            if ($unitCode) {
                $label .= " - $unitCode";
            }
            return $label;
        }
        
        if ($scopeType === 'lead_batch') {
            return 'Full Batch';
        }
        
        return 'Full Batch';
    }
}

if (!function_exists('sw_build_scope_key')) {
    function sw_build_scope_key(int $batchId, string $scopeType, ?int $moduleId = null): string
    {
        if ($scopeType === 'module' && $moduleId > 0) {
            return "batch_{$batchId}_module_{$moduleId}";
        }
        return "batch_{$batchId}";
    }
}

if (!function_exists('sw_fetch_batch_context')) {
    function sw_fetch_batch_context(PDO $conn, int $batchId): ?array
    {
        $stmt = $conn->prepare('SELECT batch_id, qualification_id, trainer_id, trainer_assignment_mode, start_date, end_date, status FROM tbl_batch WHERE batch_id = ? LIMIT 1');
        $stmt->execute([$batchId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}

if (!function_exists('sw_fetch_available_rooms')) {
    /**
     * Returns active rooms that do not overlap another batch's saved session.
     * The legacy schema stores one display schedule string per batch, so overlap
     * is calculated from the days and time ranges embedded in that string.
     */
    function sw_fetch_available_rooms(PDO $conn, array $candidate): array
    {
        if (!ta_table_exists($conn, 'tbl_rooms')) {
            return [];
        }

        $roomStmt = $conn->query('SELECT room_id, room_name, room_description FROM tbl_rooms WHERE COALESCE(is_archived, 0) = 0 ORDER BY room_name, room_id');
        $rooms = $roomStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        if (empty($rooms)) {
            return [];
        }

        $occupied = [];
        $scheduleStmt = $conn->prepare('SELECT s.batch_id, s.room_id, s.schedule FROM tbl_schedule s WHERE s.batch_id <> ? AND s.room_id IS NOT NULL AND s.schedule IS NOT NULL AND TRIM(s.schedule) <> ""');
        $scheduleStmt->execute([(int)$candidate['batch_id']]);
        foreach ($scheduleStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $saved) {
            if (sw_schedules_overlap((string)$candidate['schedule'], (string)$saved['schedule'])) {
                $occupied[(int)$saved['room_id']] = true;
            }
        }

        return array_values(array_filter($rooms, static fn(array $room): bool => empty($occupied[(int)$room['room_id']])));
    }
}

if (!function_exists('sw_schedules_overlap')) {
    function sw_schedules_overlap(string $first, string $second): bool
    {
        $left = sw_parse_schedule($first);
        $right = sw_parse_schedule($second);
        if (empty($left['days']) || empty($right['days']) || empty($left['ranges']) || empty($right['ranges'])) {
            // Unparseable legacy strings are conservatively treated as conflicts.
            return true;
        }
        if (empty(array_intersect($left['days'], $right['days']))) {
            return false;
        }
        foreach ($left['ranges'] as [$leftStart, $leftEnd]) {
            foreach ($right['ranges'] as [$rightStart, $rightEnd]) {
                if ($leftStart < $rightEnd && $rightStart < $leftEnd) return true;
            }
        }
        return false;
    }
}

if (!function_exists('sw_parse_schedule')) {
    function sw_parse_schedule(string $schedule): array
    {
        $dayMap = ['mon' => 1, 'monday' => 1, 'tue' => 2, 'tues' => 2, 'tuesday' => 2, 'wed' => 3, 'wednesday' => 3, 'thu' => 4, 'thur' => 4, 'thurs' => 4, 'thursday' => 4, 'fri' => 5, 'friday' => 5, 'sat' => 6, 'saturday' => 6, 'sun' => 7, 'sunday' => 7];
        $days = [];
        foreach ($dayMap as $name => $value) {
            if (preg_match('/\b' . preg_quote($name, '/') . '\b/i', $schedule)) $days[] = $value;
        }
        if (preg_match('/\b(mon|tue|wed|thu|fri|sat|sun)\s*-\s*(mon|tue|wed|thu|fri|sat|sun)\b/i', $schedule, $range)) {
            $ordered = ['mon' => 1, 'tue' => 2, 'wed' => 3, 'thu' => 4, 'fri' => 5, 'sat' => 6, 'sun' => 7];
            $start = $ordered[strtolower($range[1])]; $end = $ordered[strtolower($range[2])];
            $days = $start <= $end ? range($start, $end) : array_merge(range($start, 7), range(1, $end));
        }
        // Custom schedules created by the modal use compact codes such as
        // MTWThFS (Monday through Saturday) or MWFSu.
        if (empty($days)) {
            $dayCode = preg_split('/\s*\(/', $schedule, 2)[0] ?? '';
            preg_match_all('/Th|Su|M|T|W|F|S/i', $dayCode, $compactMatches);
            $compactMap = ['m' => 1, 't' => 2, 'w' => 3, 'th' => 4, 'f' => 5, 's' => 6, 'su' => 7];
            foreach ($compactMatches[0] ?? [] as $token) {
                $token = strtolower($token);
                if (isset($compactMap[$token])) $days[] = $compactMap[$token];
            }
        }
        preg_match_all('/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i', $schedule, $matches, PREG_SET_ORDER);
        $ranges = [];
        foreach ($matches as $match) {
            $start = sw_time_to_minutes($match[1]); $end = sw_time_to_minutes($match[2]);
            if ($start !== null && $end !== null && $end > $start) $ranges[] = [$start, $end];
        }
        return ['days' => array_values(array_unique($days)), 'ranges' => $ranges];
    }
}

if (!function_exists('sw_time_to_minutes')) {
    function sw_time_to_minutes(string $time): ?int
    {
        if (!preg_match('/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i', trim($time), $parts)) return null;
        $hour = (int)$parts[1]; $minute = (int)$parts[2]; $meridiem = strtoupper($parts[3] ?? '');
        if ($minute > 59 || $hour > 23 || $hour < 0) return null;
        if ($meridiem !== '') { if ($hour < 1 || $hour > 12) return null; if ($meridiem === 'PM' && $hour !== 12) $hour += 12; if ($meridiem === 'AM' && $hour === 12) $hour = 0; }
        return ($hour * 60) + $minute;
    }
}
