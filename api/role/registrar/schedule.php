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
require_once '../../utils/trainer_assignment_helper.php';

$database = new Database();
$conn = $database->getConnection();
ta_ensure_schema($conn);

$action = isset($_GET['action']) ? $_GET['action'] : '';
switch ($action) {
    case 'get-data':
        getData($conn);
        break;

    case 'assign':
        assignSchedule($conn);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        http_response_code(400);
}

function getData(PDO $conn): void
{
    try {
        $trainersQuery = "SELECT
                            t.trainer_id,
                            t.first_name,
                            t.last_name,
                            COALESCE(
                                GROUP_CONCAT(DISTINCT tq.qualification_id ORDER BY tq.qualification_id SEPARATOR ','),
                                IFNULL(t.qualification_id, '')
                            ) AS qualification_ids
                         FROM tbl_trainer t
                         LEFT JOIN tbl_trainer_qualifications tq ON t.trainer_id = tq.trainer_id
                         WHERE t.status = 'active'
                         GROUP BY t.trainer_id";
        $trainersStmt = $conn->prepare($trainersQuery);
        $trainersStmt->execute();
        $trainers = $trainersStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        [$roomSelect, $roomJoin] = buildBatchScheduleRoomQueryParts($conn, 's');

        $batchesQuery = "SELECT
                            b.batch_id,
                            b.batch_name,
                            b.qualification_id,
                            b.start_date,
                            b.end_date,
                            c.qualification_name AS course_name,
                            b.trainer_id,
                            COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode,
                            TRIM(CONCAT_WS(' ', t.first_name, t.last_name)) AS lead_trainer_name,
                            s.schedule,
                            s.room_id,
                            {$roomSelect},
                            b.status AS batch_status
                         FROM tbl_batch b
                         LEFT JOIN tbl_qualifications c ON c.qualification_id = b.qualification_id
                         LEFT JOIN tbl_trainer t ON t.trainer_id = b.trainer_id
                         LEFT JOIN tbl_schedule s ON s.batch_id = b.batch_id
                         {$roomJoin}
                         WHERE b.status IN ('open', 'closed', 'in-progress')
                         ORDER BY b.status DESC, b.batch_id DESC";
        $batchesStmt = $conn->prepare($batchesQuery);
        $batchesStmt->execute();
        $batches = $batchesStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $summaries = ta_fetch_batch_assignment_summary($conn, array_column($batches, 'batch_id'));
        $scheduleRows = [];

        foreach ($batches as &$batch) {
            $batch['trainer_assignment_mode'] = ta_normalize_mode($batch['trainer_assignment_mode'] ?? 'single');
            $batch['trainer_summary'] = buildBatchTrainerSummary($batch, $summaries[(int)$batch['batch_id']] ?? null);
            $batch['trainer_name'] = $batch['trainer_assignment_mode'] === 'multiple'
                ? $batch['trainer_summary']
                : ($batch['lead_trainer_name'] ?: 'Not Assigned');

            if ($batch['trainer_assignment_mode'] === 'multiple') {
                $unitGroups = ta_fetch_qualification_unit_groups($conn, (int)$batch['qualification_id'], true);
                $assignmentByGroup = [];
                foreach (ta_fetch_batch_module_assignments($conn, (int)$batch['batch_id']) as $assignment) {
                    $groupKey = ta_build_module_group_key($assignment);
                    if (!isset($assignmentByGroup[$groupKey])) {
                        $assignmentByGroup[$groupKey] = $assignment;
                    }
                }
                $leadTrainerName = trim((string)($batch['lead_trainer_name'] ?? ''));

                if (empty($unitGroups)) {
                    $scheduleRows[] = [
                        'row_id' => 'batch-' . (int)$batch['batch_id'] . '-lead-batch',
                        'batch_id' => (int)$batch['batch_id'],
                        'batch_name' => $batch['batch_name'],
                        'qualification_id' => (int)$batch['qualification_id'],
                        'start_date' => $batch['start_date'] ?? null,
                        'end_date' => $batch['end_date'] ?? null,
                        'course_name' => $batch['course_name'],
                        'batch_status' => $batch['batch_status'],
                        'trainer_assignment_mode' => 'multiple',
                        'scope_type' => 'lead_batch',
                        'scope_label' => 'Lead Trainer Batch Schedule',
                        'module_id' => null,
                        'module_title' => null,
                        'competency_type' => null,
                        'trainer_id' => !empty($batch['trainer_id']) ? (int)$batch['trainer_id'] : null,
                        'trainer_name' => $leadTrainerName !== '' ? $leadTrainerName : 'No lead trainer assigned',
                        'schedule' => $batch['schedule'] ?? null,
                        'room_id' => !empty($batch['room_id']) ? (int)$batch['room_id'] : null,
                        'room' => $batch['room'] ?? null,
                        'is_assigned' => !empty($batch['schedule']) || !empty($batch['room_id']),
                        'assignable' => !empty($batch['trainer_id'])
                    ];
                    continue;
                }

                foreach ($unitGroups as $group) {
                    $groupKey = (string)($group['group_key'] ?? '');
                    $assignment = $assignmentByGroup[$groupKey] ?? null;
                    $moduleOptions = array_values($group['trainer_options'] ?? []);
                    $resolvedTrainerId = !empty($assignment['trainer_id']) ? (int)$assignment['trainer_id'] : null;
                    $resolvedTrainerName = trim((string)($assignment['trainer_name'] ?? ''));
                    $scheduleRows[] = [
                        'row_id' => 'batch-' . (int)$batch['batch_id'] . '-unit-' . md5($groupKey),
                        'batch_id' => (int)$batch['batch_id'],
                        'batch_name' => $batch['batch_name'],
                        'qualification_id' => (int)$batch['qualification_id'],
                        'start_date' => $batch['start_date'] ?? null,
                        'end_date' => $batch['end_date'] ?? null,
                        'course_name' => $batch['course_name'],
                        'batch_status' => $batch['batch_status'],
                        'trainer_assignment_mode' => 'multiple',
                        'scope_type' => 'module',
                        'scope_label' => buildModuleScopeLabel($group),
                        'module_id' => !empty($assignment['module_id']) ? (int)$assignment['module_id'] : null,
                        'module_group_key' => $groupKey,
                        'module_title' => $group['module_title'] ?? null,
                        'unit_code' => $group['unit_code'] ?? '',
                        'competency_type' => $group['competency_type'] ?? null,
                        'trainer_id' => $resolvedTrainerId,
                        'trainer_name' => $resolvedTrainerName !== ''
                            ? $resolvedTrainerName
                            : (!empty($moduleOptions) ? 'Not assigned yet' : 'No trainer available yet'),
                        'schedule' => $assignment['schedule'] ?? null,
                        'room_id' => !empty($assignment['room_id']) ? (int)$assignment['room_id'] : null,
                        'room' => $assignment['room'] ?? null,
                        'is_assigned' => !empty($assignment),
                        'assignable' => !empty($moduleOptions),
                        'module_options' => $moduleOptions
                    ];
                }

                continue;
            }

            $scheduleRows[] = [
                'row_id' => 'batch-' . (int)$batch['batch_id'] . '-single',
                'batch_id' => (int)$batch['batch_id'],
                'batch_name' => $batch['batch_name'],
                'qualification_id' => (int)$batch['qualification_id'],
                'start_date' => $batch['start_date'] ?? null,
                'end_date' => $batch['end_date'] ?? null,
                'course_name' => $batch['course_name'],
                'batch_status' => $batch['batch_status'],
                'trainer_assignment_mode' => 'single',
                'scope_type' => 'batch',
                'scope_label' => 'Full Batch',
                'module_id' => null,
                'module_title' => null,
                'competency_type' => null,
                'trainer_id' => !empty($batch['trainer_id']) ? (int)$batch['trainer_id'] : null,
                'trainer_name' => trim((string)($batch['lead_trainer_name'] ?? '')) !== '' ? $batch['lead_trainer_name'] : 'Not Assigned',
                'schedule' => $batch['schedule'] ?? null,
                'room_id' => !empty($batch['room_id']) ? (int)$batch['room_id'] : null,
                'room' => $batch['room'] ?? null,
                'is_assigned' => !empty($batch['trainer_id']) || !empty($batch['schedule']) || !empty($batch['room_id']),
                'assignable' => true
            ];
        }
        unset($batch);

        echo json_encode([
            'success' => true,
            'data' => [
                'trainers' => $trainers,
                'batches' => $batches,
                'schedule_rows' => $scheduleRows
            ]
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error fetching data: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function assignSchedule(PDO $conn): void
{
    $data = json_decode(file_get_contents('php://input'), true);
    $batchId = (int)($data['batch_id'] ?? 0);

    if ($batchId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Batch ID is required.']);
        http_response_code(400);
        return;
    }

    try {
        $batchStmt = $conn->prepare("
            SELECT batch_id, qualification_id, COALESCE(trainer_assignment_mode, 'single') AS trainer_assignment_mode
            FROM tbl_batch
            WHERE batch_id = ?
            LIMIT 1
        ");
        $batchStmt->execute([$batchId]);
        $batch = $batchStmt->fetch(PDO::FETCH_ASSOC);

        if (!$batch) {
            echo json_encode(['success' => false, 'message' => 'Batch not found.']);
            http_response_code(404);
            return;
        }

        $mode = ta_normalize_mode($data['trainer_assignment_mode'] ?? $batch['trainer_assignment_mode'] ?? 'single');
        $schedule = trim((string)($data['schedule'] ?? ''));
        $roomId = normalizeNullableInt($data['room_id'] ?? null);
        $trainerId = normalizeNullableInt($data['trainer_id'] ?? null);
        $moduleId = normalizeNullableInt($data['module_id'] ?? null);
        $scopeType = trim((string)($data['scope_type'] ?? ''));
        $removeAssignment = !empty($data['remove_assignment']);

        $conn->beginTransaction();

        if ($mode === 'single') {
            assertRoomAvailability($conn, $roomId, $schedule, $batchId, null);
            $stmtBatch = $conn->prepare("UPDATE tbl_batch SET trainer_id = :trainer_id, trainer_assignment_mode = 'single' WHERE batch_id = :batch_id");
            $stmtBatch->execute([
                ':trainer_id' => $trainerId,
                ':batch_id' => $batchId
            ]);

            upsertBatchSchedule($conn, $batchId, $schedule, $roomId);
        } else {
            if ($moduleId === null || $moduleId <= 0) {
                if ($scopeType !== 'lead_batch') {
                    throw new Exception('Please select a trainer for this unit before saving its schedule.');
                }
                assertRoomAvailability($conn, $roomId, $schedule, $batchId, null);
                $stmtBatch = $conn->prepare("UPDATE tbl_batch SET trainer_id = :trainer_id, trainer_assignment_mode = 'multiple' WHERE batch_id = :batch_id");
                $stmtBatch->execute([
                    ':trainer_id' => $trainerId,
                    ':batch_id' => $batchId
                ]);

                upsertBatchSchedule($conn, $batchId, $schedule, $roomId);
                $conn->commit();
                echo json_encode(['success' => true, 'message' => 'Schedule saved successfully.']);
                return;
            }

            $moduleStmt = $conn->prepare("
                SELECT
                    module_id,
                    qualification_id,
                    trainer_id,
                    module_title,
                    competency_type" . (ta_column_exists($conn, 'tbl_module', 'unit_code') ? ",
                    COALESCE(unit_code, '') AS unit_code" : ",
                    '' AS unit_code") . "
                FROM tbl_module
                WHERE module_id = ?
                LIMIT 1
            ");
            $moduleStmt->execute([$moduleId]);
            $module = $moduleStmt->fetch(PDO::FETCH_ASSOC);

            if (!$module) {
                throw new Exception('Selected module was not found.');
            }

            if ((int)$module['qualification_id'] !== (int)$batch['qualification_id']) {
                throw new Exception('That unit does not belong to the selected batch qualification.');
            }

            $moduleGroup = findQualificationUnitGroupByModuleId($conn, (int)$batch['qualification_id'], $moduleId);
            if ($moduleGroup === null) {
                throw new Exception('That unit could not be resolved for this batch.');
            }

            $equivalentModuleIds = array_values(array_unique(array_filter(array_map('intval', $moduleGroup['module_ids'] ?? [$moduleId]))));
            if (empty($equivalentModuleIds)) {
                $equivalentModuleIds = [$moduleId];
            }

            $stmtBatch = $conn->prepare("UPDATE tbl_batch SET trainer_assignment_mode = 'multiple' WHERE batch_id = ?");
            $stmtBatch->execute([$batchId]);

            deleteBatchAssignmentsForModuleIds($conn, $batchId, $equivalentModuleIds);

            if ($removeAssignment) {
            } else {
                $moduleTrainerId = normalizeNullableInt($module['trainer_id'] ?? null);
                if ($moduleTrainerId === null) {
                    throw new Exception('This unit has no module owner trainer yet.');
                }
                assertRoomAvailability($conn, $roomId, $schedule, $batchId, $moduleId);

                $upsertStmt = $conn->prepare("
                    INSERT INTO tbl_batch_trainer_assignments (batch_id, module_id, trainer_id, schedule, room_id, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                        trainer_id = VALUES(trainer_id),
                        schedule = VALUES(schedule),
                        room_id = VALUES(room_id),
                        updated_at = NOW()
                ");
                $upsertStmt->execute([
                    $batchId,
                    $moduleId,
                    $moduleTrainerId,
                    $schedule !== '' ? $schedule : null,
                    $roomId
                ]);
            }
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Schedule saved successfully.']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }

        echo json_encode(['success' => false, 'message' => 'Error assigning schedule: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function upsertBatchSchedule(PDO $conn, int $batchId, string $schedule, ?int $roomId): void
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

function buildBatchScheduleRoomQueryParts(PDO $conn, string $scheduleAlias = 's'): array
{
    if (ta_table_exists($conn, 'tbl_rooms') && ta_column_exists($conn, 'tbl_rooms', 'room_name')) {
        return [
            "COALESCE(r.room_name, CAST({$scheduleAlias}.room_id AS CHAR)) AS room",
            "LEFT JOIN tbl_rooms r ON r.room_id = {$scheduleAlias}.room_id"
        ];
    }

    return ["CAST({$scheduleAlias}.room_id AS CHAR) AS room", ''];
}

function assertRoomAvailability(PDO $conn, ?int $roomId, string $schedule, int $batchId, ?int $moduleId): void
{
    if ($roomId === null || $roomId <= 0 || trim($schedule) === '') {
        return;
    }

    $conflict = findRoomConflict($conn, $roomId, $schedule, $batchId, $moduleId);
    if ($conflict === null) {
        return;
    }

    $scope = $conflict['scope_type'] === 'module'
        ? trim((string)($conflict['module_title'] ?? 'Unit'))
        : 'Batch schedule';
    $batchName = trim((string)($conflict['batch_name'] ?? 'another batch'));
    $roomName = trim((string)($conflict['room_name'] ?? 'the selected room'));
    $conflictSchedule = trim((string)($conflict['schedule'] ?? ''));

    throw new Exception(sprintf(
        '%s is already scheduled for %s under %s%s',
        $roomName,
        $batchName,
        $scope,
        $conflictSchedule !== '' ? ' (' . $conflictSchedule . ')' : ''
    ));
}

function findRoomConflict(PDO $conn, int $roomId, string $schedule, int $batchId, ?int $moduleId): ?array
{
    $rows = [];

    $batchStmt = $conn->prepare("
        SELECT
            b.batch_id,
            b.batch_name,
            b.status AS batch_status,
            s.schedule,
            s.room_id,
            r.room_name,
            NULL AS module_id,
            NULL AS module_title,
            'batch' AS scope_type
        FROM tbl_schedule s
        JOIN tbl_batch b ON b.batch_id = s.batch_id
        LEFT JOIN tbl_rooms r ON r.room_id = s.room_id
        WHERE s.room_id = ?
          AND COALESCE(TRIM(s.schedule), '') <> ''
          AND b.status IN ('open', 'in-progress')
    ");
    $batchStmt->execute([$roomId]);
    $rows = array_merge($rows, $batchStmt->fetchAll(PDO::FETCH_ASSOC) ?: []);

    $moduleStmt = $conn->prepare("
        SELECT
            b.batch_id,
            b.batch_name,
            b.status AS batch_status,
            a.schedule,
            a.room_id,
            r.room_name,
            a.module_id,
            m.module_title,
            'module' AS scope_type
        FROM tbl_batch_trainer_assignments a
        JOIN tbl_batch b ON b.batch_id = a.batch_id
        JOIN tbl_module m ON m.module_id = a.module_id
        LEFT JOIN tbl_rooms r ON r.room_id = a.room_id
        WHERE a.room_id = ?
          AND COALESCE(TRIM(a.schedule), '') <> ''
          AND b.status IN ('open', 'in-progress')
    ");
    $moduleStmt->execute([$roomId]);
    $rows = array_merge($rows, $moduleStmt->fetchAll(PDO::FETCH_ASSOC) ?: []);

    foreach ($rows as $row) {
        if ((int)($row['batch_id'] ?? 0) === $batchId) {
            if (($row['scope_type'] ?? '') === 'batch' && ($moduleId === null || $moduleId <= 0)) {
                continue;
            }

            if (($row['scope_type'] ?? '') === 'module' && $moduleId !== null && (int)($row['module_id'] ?? 0) === $moduleId) {
                continue;
            }
        }

        if (schedulesOverlap($schedule, (string)($row['schedule'] ?? ''))) {
            return $row;
        }
    }

    return null;
}

function normalizeNullableInt($value): ?int
{
    $number = (int)$value;
    return $number > 0 ? $number : null;
}

function schedulesOverlap(string $leftSchedule, string $rightSchedule): bool
{
    $left = parseScheduleForConflict($leftSchedule);
    $right = parseScheduleForConflict($rightSchedule);

    if (empty($left['days']) || empty($right['days']) || empty($left['startTime']) || empty($left['endTime']) || empty($right['startTime']) || empty($right['endTime'])) {
        return false;
    }

    $sharedDays = array_values(array_intersect($left['days'], $right['days']));
    if (empty($sharedDays)) {
        return false;
    }

    return $left['startTime'] < $right['endTime'] && $right['startTime'] < $left['endTime'];
}

function parseScheduleForConflict(string $scheduleText): array
{
    $text = strtolower(trim($scheduleText));
    if ($text === '') {
        return ['days' => [], 'startTime' => '', 'endTime' => ''];
    }

    $days = parseCompactScheduleDays($scheduleText);
    $startTime = '';
    $endTime = '';

    if (preg_match('/(\d{2}):(\d{2})-(\d{2}):(\d{2})/', $text, $matches)) {
        $startTime = $matches[1] . ':' . $matches[2];
        $endTime = $matches[3] . ':' . $matches[4];
    } elseif (preg_match('/(\d+):(\d+)\s*(am|pm)\s*-\s*(\d+):(\d+)\s*(am|pm)/i', $scheduleText, $matches)) {
        $startTime = convertMeridiemTimeTo24Hour($matches[1], $matches[2], $matches[3]);
        $endTime = convertMeridiemTimeTo24Hour($matches[4], $matches[5], $matches[6]);
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
        'sat' => ['Saturday'],
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
            '/sat(?:urday)?/i' => 'Saturday',
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

function parseCompactScheduleDays(string $scheduleText): array
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

function convertMeridiemTimeTo24Hour(string $hour, string $minute, string $meridiem): string
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

function findQualificationUnitGroupByModuleId(PDO $conn, int $qualificationId, int $moduleId): ?array
{
    if ($qualificationId <= 0 || $moduleId <= 0) {
        return null;
    }

    foreach (ta_fetch_qualification_unit_groups($conn, $qualificationId, true) as $group) {
        foreach (($group['module_ids'] ?? []) as $candidateId) {
            if ((int)$candidateId === $moduleId) {
                return $group;
            }
        }
    }

    return null;
}

function deleteBatchAssignmentsForModuleIds(PDO $conn, int $batchId, array $moduleIds): void
{
    $moduleIds = array_values(array_unique(array_filter(array_map('intval', $moduleIds))));
    if ($batchId <= 0 || empty($moduleIds)) {
        return;
    }

    $placeholders = implode(',', array_fill(0, count($moduleIds), '?'));
    $params = array_merge([$batchId], $moduleIds);
    $stmt = $conn->prepare("DELETE FROM tbl_batch_trainer_assignments WHERE batch_id = ? AND module_id IN ($placeholders)");
    $stmt->execute($params);
}

function buildModuleScopeLabel(array $module): string
{
    $moduleTitle = trim((string)($module['module_title'] ?? 'Untitled Unit'));
    $competencyType = ucfirst(trim((string)($module['competency_type'] ?? '')));

    return $competencyType !== '' ? $moduleTitle . ' (' . $competencyType . ')' : $moduleTitle;
}

function buildBatchTrainerSummary(array $batch, ?array $summary): string
{
    $mode = ta_normalize_mode($batch['trainer_assignment_mode'] ?? 'single');
    if ($mode !== 'multiple') {
        return trim((string)($batch['lead_trainer_name'] ?? '')) !== '' ? (string)$batch['lead_trainer_name'] : 'Not Assigned';
    }

    $trainerCount = (int)($summary['distinct_trainers'] ?? 0);
    $moduleCount = (int)($summary['assigned_modules'] ?? 0);

    if ($trainerCount <= 0) {
        $leadTrainerName = trim((string)($batch['lead_trainer_name'] ?? ''));
        return $leadTrainerName !== '' ? $leadTrainerName . ' (Lead Trainer)' : 'Multiple Trainers (Not Scheduled)';
    }

    if ($trainerCount === 1 && !empty($summary['trainer_names'][0])) {
        return sprintf('%s (%d module%s)', $summary['trainer_names'][0], $moduleCount, $moduleCount === 1 ? '' : 's');
    }

    return sprintf('%d trainers / %d modules', $trainerCount, $moduleCount);
}
?>
