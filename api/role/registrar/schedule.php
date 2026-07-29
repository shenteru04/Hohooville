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

    case 'assign':
        assignSchedule($conn);
        break;

    case 'review-request':
        reviewScheduleRequest($conn);
        break;

    case 'available-rooms':
        getAvailableRooms($conn);
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

        $scheduleRequests = sw_fetch_schedule_request_rows($conn, [
            'batch_ids' => array_column($batches, 'batch_id')
        ]);

        echo json_encode([
            'success' => true,
            'data' => [
                'trainers' => $trainers,
                'batches' => $batches,
                'schedule_rows' => $scheduleRows,
                'schedule_requests' => $scheduleRequests
            ]
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error fetching data: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function scheduleWorkflowActorRole(): string
{
    $role = defined('SCHEDULE_WORKFLOW_ACTOR_ROLE')
        ? strtolower(trim((string) constant('SCHEDULE_WORKFLOW_ACTOR_ROLE')))
        : 'registrar';

    return $role === 'admin' ? 'admin' : 'registrar';
}

function scheduleWorkflowActorLabel(): string
{
    return scheduleWorkflowActorRole() === 'admin' ? 'Admin' : 'Registrar';
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
        $batch = sw_fetch_batch_context($conn, $batchId);
        if (!$batch) {
            throw new Exception('Batch not found.');
        }

        $mode = ta_normalize_mode($data['trainer_assignment_mode'] ?? $batch['trainer_assignment_mode'] ?? 'single');
        $moduleId = normalizeNullableInt($data['module_id'] ?? null);
        $scopeType = sw_normalize_scope_type($data['scope_type'] ?? '', $moduleId, $mode);
        $removeAssignment = !empty($data['remove_assignment']);

        if ($removeAssignment) {
            if ($mode !== 'multiple' || $moduleId === null || $moduleId <= 0) {
                throw new Exception('Only unit-based assignments can be removed here.');
            }

            $moduleGroup = findQualificationUnitGroupByModuleId($conn, (int)$batch['qualification_id'], $moduleId);
            if ($moduleGroup === null) {
                throw new Exception('That unit could not be resolved for this batch.');
            }

            $equivalentModuleIds = array_values(array_unique(array_filter(array_map('intval', $moduleGroup['module_ids'] ?? [$moduleId]))));
            if (empty($equivalentModuleIds)) {
                $equivalentModuleIds = [$moduleId];
            }

            $conn->beginTransaction();
            deleteBatchAssignmentsForModuleIds($conn, $batchId, $equivalentModuleIds);

            $scopeKeys = array_map(static function (int $candidateModuleId) use ($batchId): string {
                return sw_build_scope_key($batchId, 'module', $candidateModuleId);
            }, $equivalentModuleIds);
            $deleteStmt = $conn->prepare('DELETE FROM tbl_schedule_requests WHERE scope_key = ?');
            foreach ($scopeKeys as $scopeKey) {
                $deleteStmt->execute([$scopeKey]);
            }

            $conn->commit();
            echo json_encode(['success' => true, 'message' => 'Unit assignment removed successfully.']);
            return;
        }

        $requestContext = resolveScheduleProposalContext($conn, $data, $batch, $mode, $scopeType, $moduleId);
        $conflicts = sw_find_conflicts($conn, $requestContext);
        if (!empty($conflicts)) {
            throw new Exception(sw_format_conflict_message($conflicts[0]));
        }

        $conn->beginTransaction();
        $requestId = sw_persist_schedule_request($conn, [
            'batch_id' => $requestContext['batch_id'],
            'module_id' => $requestContext['module_id'],
            'trainer_id' => $requestContext['trainer_id'],
            'scope_type' => $requestContext['scope_type'],
            'schedule' => $requestContext['schedule'],
            'room_id' => $requestContext['room_id'],
            'effective_date' => $requestContext['effective_date'],
            'status' => 'pending_trainer_response',
            'proposed_by_role' => scheduleWorkflowActorRole(),
            'created_by_user_id' => normalizeNullableInt($data['user_id'] ?? null),
            'trainer_note' => null,
            'registrar_note' => trim((string)($data['registrar_note'] ?? '')) ?: null
        ]);
        $requestRow = sw_fetch_schedule_request_by_id($conn, $requestId);
        notifyTrainerOfRegistrarProposal($conn, $requestRow, normalizeNullableInt($data['user_id'] ?? null));
        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Schedule proposal sent to the trainer for review.',
            'request_id' => $requestId
        ]);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }

        echo json_encode(['success' => false, 'message' => 'Error assigning schedule: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function reviewScheduleRequest(PDO $conn): void
{
    $data = json_decode(file_get_contents('php://input'), true);
    $requestId = (int)($data['request_id'] ?? 0);
    $reviewAction = strtolower(trim((string)($data['review_action'] ?? '')));
    $registrarNote = trim((string)($data['registrar_note'] ?? '')) ?: null;
    $actorUserId = normalizeNullableInt($data['user_id'] ?? null);

    if ($requestId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Schedule request ID is required.']);
        http_response_code(400);
        return;
    }

    if (!in_array($reviewAction, ['approve', 'reject', 'request_modifications'], true)) {
        echo json_encode(['success' => false, 'message' => 'Invalid review action.']);
        http_response_code(400);
        return;
    }

    try {
        $request = sw_fetch_schedule_request_by_id($conn, $requestId);
        if (!$request) {
            throw new Exception('Schedule request not found.');
        }

        if (!in_array($request['status'], ['pending_registrar_approval', 'modification_requested'], true) && $reviewAction !== 'approve') {
            throw new Exception('Only trainer-submitted schedule proposals can be reviewed here.');
        }

        if ($reviewAction === 'approve' && !in_array($request['status'], ['pending_registrar_approval', 'modification_requested'], true)) {
            throw new Exception('This schedule is not waiting for registrar approval.');
        }

        $conn->beginTransaction();

        if ($reviewAction === 'approve') {
            $conflicts = sw_find_conflicts($conn, [
                'request_id' => $request['request_id'],
                'batch_id' => $request['batch_id'],
                'module_id' => $request['module_id'],
                'trainer_id' => $request['trainer_id'],
                'scope_type' => $request['scope_type'],
                'trainer_assignment_mode' => $request['trainer_assignment_mode'],
                'schedule' => $request['schedule'],
                'room_id' => $request['room_id'],
                'effective_date' => $request['resolved_effective_date'],
                'module_title' => $request['module_title'] ?? '',
                'competency_type' => $request['competency_type'] ?? '',
                'unit_code' => $request['unit_code'] ?? ''
            ]);
            if (!empty($conflicts)) {
                throw new Exception(sw_format_conflict_message($conflicts[0]));
            }

            sw_apply_request_approval($conn, $request);
            $stmt = $conn->prepare("
                UPDATE tbl_schedule_requests
                SET status = 'approved',
                    registrar_note = :registrar_note,
                    created_by_user_id = :created_by_user_id,
                    updated_at = NOW()
                WHERE request_id = :request_id
            ");
            $stmt->execute([
                ':registrar_note' => $registrarNote,
                ':created_by_user_id' => $actorUserId,
                ':request_id' => $requestId
            ]);

            $updatedRequest = sw_fetch_schedule_request_by_id($conn, $requestId);
            notifyTrainerOfRegistrarDecision($conn, $updatedRequest, 'approved', $actorUserId);
            $conn->commit();

            echo json_encode(['success' => true, 'message' => 'Schedule approved successfully.']);
            return;
        }

        $nextStatus = $reviewAction === 'reject' ? 'rejected' : 'modification_requested';
        $stmt = $conn->prepare("
            UPDATE tbl_schedule_requests
            SET status = :status,
                registrar_note = :registrar_note,
                created_by_user_id = :created_by_user_id,
                updated_at = NOW()
            WHERE request_id = :request_id
        ");
        $stmt->execute([
            ':status' => $nextStatus,
            ':registrar_note' => $registrarNote,
            ':created_by_user_id' => $actorUserId,
            ':request_id' => $requestId
        ]);

        $updatedRequest = sw_fetch_schedule_request_by_id($conn, $requestId);
        notifyTrainerOfRegistrarDecision($conn, $updatedRequest, $nextStatus, $actorUserId);
        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => $nextStatus === 'rejected'
                ? 'Schedule request rejected.'
                : 'Modification request sent to the trainer.'
        ]);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }

        echo json_encode(['success' => false, 'message' => 'Error reviewing schedule request: ' . $e->getMessage()]);
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

function resolveScheduleProposalContext(PDO $conn, array $data, array $batch, string $mode, string $scopeType, ?int $moduleId): array
{
    $schedule = trim((string)($data['schedule'] ?? ''));
    $roomId = normalizeNullableInt($data['room_id'] ?? null);
    $trainerId = normalizeNullableInt($data['trainer_id'] ?? null);
    $effectiveDate = sw_resolve_effective_date($batch, $data['effective_date'] ?? null);
    $moduleTitle = '';
    $competencyType = '';
    $unitCode = '';

    if ($schedule === '') {
        throw new Exception('Schedule is required.');
    }

    if ($mode === 'single') {
        if ($trainerId === null) {
            throw new Exception('Please select a trainer first.');
        }

        return [
            'batch_id' => (int)$batch['batch_id'],
            'module_id' => null,
            'trainer_id' => $trainerId,
            'scope_type' => 'batch',
            'trainer_assignment_mode' => 'single',
            'schedule' => $schedule,
            'room_id' => $roomId,
            'effective_date' => $effectiveDate,
            'module_title' => $moduleTitle,
            'competency_type' => $competencyType,
            'unit_code' => $unitCode
        ];
    }

    if ($scopeType === 'lead_batch') {
        $resolvedTrainerId = $trainerId ?: normalizeNullableInt($batch['trainer_id'] ?? null);
        if ($resolvedTrainerId === null) {
            throw new Exception('Assign a lead trainer before proposing a batch schedule.');
        }

        return [
            'batch_id' => (int)$batch['batch_id'],
            'module_id' => null,
            'trainer_id' => $resolvedTrainerId,
            'scope_type' => 'lead_batch',
            'trainer_assignment_mode' => 'multiple',
            'schedule' => $schedule,
            'room_id' => $roomId,
            'effective_date' => $effectiveDate,
            'module_title' => $moduleTitle,
            'competency_type' => $competencyType,
            'unit_code' => $unitCode
        ];
    }

    if ($moduleId === null || $moduleId <= 0) {
        throw new Exception('Please select a trainer for this unit before saving its schedule.');
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
        throw new Exception('Selected unit was not found.');
    }

    if ((int)$module['qualification_id'] !== (int)$batch['qualification_id']) {
        throw new Exception('That unit does not belong to the selected batch qualification.');
    }

    $resolvedTrainerId = $trainerId ?: normalizeNullableInt($module['trainer_id'] ?? null);
    if ($resolvedTrainerId === null) {
        throw new Exception('This unit has no trainer assigned yet.');
    }

    $moduleTitle = trim((string)($module['module_title'] ?? ''));
    $competencyType = trim((string)($module['competency_type'] ?? ''));
    $unitCode = trim((string)($module['unit_code'] ?? ''));

    return [
        'batch_id' => (int)$batch['batch_id'],
        'module_id' => $moduleId,
        'trainer_id' => $resolvedTrainerId,
        'scope_type' => 'module',
        'trainer_assignment_mode' => 'multiple',
        'schedule' => $schedule,
        'room_id' => $roomId,
        'effective_date' => $effectiveDate,
        'module_title' => $moduleTitle,
        'competency_type' => $competencyType,
        'unit_code' => $unitCode
    ];
}

function notifyTrainerOfRegistrarProposal(PDO $conn, ?array $requestRow, ?int $actorUserId = null): void
{
    if (!$requestRow) {
        return;
    }

    $trainerUserId = !empty($requestRow['trainer_user_id'])
        ? (int)$requestRow['trainer_user_id']
        : sw_fetch_trainer_user_id($conn, (int)($requestRow['trainer_id'] ?? 0));

    if ($trainerUserId <= 0) {
        return;
    }

    $scopeLabel = trim((string)($requestRow['scope_label'] ?? 'schedule'));
    $batchName = trim((string)($requestRow['batch_name'] ?? 'this batch'));
    $actorLabel = scheduleWorkflowActorLabel();

    try {
        sw_insert_notification($conn, [
            'user_id' => $trainerUserId,
            'target_user_id' => $trainerUserId,
            'target_role' => 'trainer',
            'actor_id' => $actorUserId,
            'title' => 'New Schedule Proposal',
            'message' => sprintf('%s proposed a schedule for %s - %s. Review it and accept or suggest changes.', $actorLabel, $batchName, $scopeLabel),
            'link' => sw_build_trainer_request_link((int)$requestRow['request_id'], 'respond')
        ]);
    } catch (Exception $e) {
        error_log('Unable to notify trainer of registrar proposal: ' . $e->getMessage());
    }
}

function notifyTrainerOfRegistrarDecision(PDO $conn, ?array $requestRow, string $decision, ?int $actorUserId = null): void
{
    if (!$requestRow) {
        return;
    }

    $trainerUserId = !empty($requestRow['trainer_user_id'])
        ? (int)$requestRow['trainer_user_id']
        : sw_fetch_trainer_user_id($conn, (int)($requestRow['trainer_id'] ?? 0));

    if ($trainerUserId <= 0) {
        return;
    }

    $scopeLabel = trim((string)($requestRow['scope_label'] ?? 'schedule'));
    $batchName = trim((string)($requestRow['batch_name'] ?? 'this batch'));
    $actorLabel = scheduleWorkflowActorLabel();
    $title = 'Schedule Update';
    $message = sprintf('%s updated the %s request for %s - %s.', $actorLabel, $scopeLabel, $batchName, $scopeLabel);

    if ($decision === 'approved') {
        $title = 'Schedule Approved';
        $message = sprintf('%s approved the schedule for %s - %s.', $actorLabel, $batchName, $scopeLabel);
    } elseif ($decision === 'rejected') {
        $title = 'Schedule Rejected';
        $message = sprintf('%s rejected the proposed schedule for %s - %s.', $actorLabel, $batchName, $scopeLabel);
    } elseif ($decision === 'modification_requested') {
        $title = 'Schedule Needs Changes';
        $message = sprintf('%s requested schedule changes for %s - %s.', $actorLabel, $batchName, $scopeLabel);
    }

    try {
        sw_insert_notification($conn, [
            'user_id' => $trainerUserId,
            'target_user_id' => $trainerUserId,
            'target_role' => 'trainer',
            'actor_id' => $actorUserId,
            'title' => $title,
            'message' => $message,
            'link' => sw_build_trainer_request_link((int)$requestRow['request_id'], 'respond')
        ]);
    } catch (Exception $e) {
        error_log('Unable to notify trainer of registrar decision: ' . $e->getMessage());
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
