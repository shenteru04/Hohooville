<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../database/db.php';
require_once __DIR__ . '/../../utils/trainer_assignment_helper.php';
require_once __DIR__ . '/../../utils/schedule_workflow_helper.php';

$database = new Database();
$conn = $database->getConnection();
ta_ensure_schema($conn);
sw_ensure_schema($conn);

$action = $_GET['action'] ?? '';
switch ($action) {
    case 'get-data':
        getData($conn);
        break;

    case 'get-presets':
        getPresets($conn);
        break;

    case 'available-rooms':
        getAvailableRooms($conn);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        http_response_code(400);
}

function getPresets(PDO $conn): void
{
    try {
        $presets = sw_fetch_schedule_presets($conn);
        echo json_encode(['success' => true, 'data' => $presets]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error loading schedule presets: ' . $e->getMessage()]);
        http_response_code(500);
    }
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
                            c.qualification_name,
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
                        'qualification_name' => $batch['qualification_name'],
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
                        'qualification_name' => $batch['qualification_name'],
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
                'qualification_name' => $batch['qualification_name'],
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

function getAvailableRooms(PDO $conn): void
{
    try {
        $batchId = (int)($_GET['batch_id'] ?? 0);
        if ($batchId <= 0) {
            throw new Exception('Batch ID is required.');
        }

        $batch = sw_fetch_batch_context($conn, $batchId);
        if (!$batch) {
            throw new Exception('Batch not found.');
        }

        $candidate = [
            'request_id' => normalizeNullableInt($_GET['request_id'] ?? null),
            'batch_id' => $batchId,
            'module_id' => normalizeNullableInt($_GET['module_id'] ?? null),
            'trainer_id' => normalizeNullableInt($_GET['trainer_id'] ?? null),
            'scope_type' => $_GET['scope_type'] ?? '',
            'trainer_assignment_mode' => $_GET['trainer_assignment_mode'] ?? ($batch['trainer_assignment_mode'] ?? 'single'),
            'schedule' => trim((string)($_GET['schedule'] ?? '')),
            'effective_date' => $_GET['effective_date'] ?? null
        ];

        if ($candidate['schedule'] === '') {
            echo json_encode(['success' => true, 'data' => []]);
            return;
        }

        $rooms = sw_fetch_available_rooms($conn, $candidate);
        echo json_encode(['success' => true, 'data' => $rooms]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        http_response_code(400);
    }
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

function normalizeNullableInt($value): ?int
{
    $number = (int)$value;
    return $number > 0 ? $number : null;
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
