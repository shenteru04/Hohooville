<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';
require_once '../../utils/trainer_assignment_helper.php';
require_once '../../utils/schedule_workflow_helper.php';

class TrainerDashboard
{
    private $conn;
    private $requestBody;

    public function __construct($db)
    {
        $this->conn = $db;
        ta_ensure_schema($this->conn);
        sw_ensure_schema($this->conn);
        $decoded = json_decode(file_get_contents('php://input'), true);
        $this->requestBody = is_array($decoded) ? $decoded : [];
    }

    public function handleRequest(): void
    {
        $action = $_GET['action'] ?? ($this->requestBody['action'] ?? '');
        $trainerId = (int)($_GET['trainer_id'] ?? ($this->requestBody['trainer_id'] ?? 0));

        if ($trainerId <= 0) {
            echo json_encode(['success' => false, 'message' => 'Trainer ID required']);
            return;
        }

        try {
            switch ($action) {
                case 'dashboard':
                    $this->getDashboardData($trainerId);
                    break;
                case 'statistics':
                    $this->getStatistics($trainerId);
                    break;
                case 'module-performance':
                    $this->getModulePerformance($trainerId);
                    break;
                case 'schedule':
                    $this->getSchedule($trainerId);
                    break;
                case 'schedule-requests':
                    $this->getScheduleRequests($trainerId);
                    break;
                case 'respond-schedule-request':
                    $this->respondToScheduleRequest($trainerId);
                    break;
                default:
                    echo json_encode(['success' => false, 'message' => 'Invalid action']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function getDashboardData(int $trainerId): void
    {
        $stats = $this->getStatisticsData($trainerId);
        $schedule = $this->getScheduleData($trainerId);

        echo json_encode(['success' => true, 'data' => array_merge($stats, ['schedule' => $schedule])]);
    }

    private function getStatistics(int $trainerId): void
    {
        echo json_encode(['success' => true, 'data' => $this->getStatisticsData($trainerId)]);
    }

    private function getStatisticsData(int $trainerId): array
    {
        $activeBatchIds = ta_fetch_trainer_assigned_batch_ids($this->conn, $trainerId, ['open']);
        $allBatchIds = ta_fetch_trainer_assigned_batch_ids($this->conn, $trainerId);

        if (empty($allBatchIds)) {
            return [
                'active_batches' => 0,
                'total_trainees' => 0,
                'competent' => 0,
                'nyc' => 0
            ];
        }

        [$batchPlaceholders, $batchParams] = $this->buildInClause($allBatchIds);

        $stmt = $this->conn->prepare("
            SELECT COUNT(DISTINCT e.trainee_id)
            FROM tbl_enrollment e
            WHERE e.batch_id IN ($batchPlaceholders)
              AND e.status = 'approved'
        ");
        $stmt->execute($batchParams);
        $totalTrainees = (int)$stmt->fetchColumn();

        $stmt = $this->conn->prepare("
            SELECT
                COALESCE(SUM(CASE WHEN avg_score >= 80 THEN 1 ELSE 0 END), 0) AS competent,
                COALESCE(SUM(CASE WHEN avg_score < 80 THEN 1 ELSE 0 END), 0) AS nyc
            FROM (
                SELECT AVG(
                    CASE
                        WHEN COALESCE(NULLIF(t.max_score, 0), qc.question_count, 0) > 0
                            THEN (g.score / COALESCE(NULLIF(t.max_score, 0), qc.question_count)) * 100
                        ELSE g.score
                    END
                ) AS avg_score
                FROM tbl_grades g
                JOIN tbl_test t ON g.test_id = t.test_id
                JOIN tbl_lessons l ON t.lesson_id = l.lesson_id
                JOIN tbl_module m ON l.module_id = m.module_id
                JOIN tbl_enrollment e ON g.trainee_id = e.trainee_id
                LEFT JOIN (
                    SELECT test_id, COUNT(*) AS question_count
                    FROM tbl_quiz_questions
                    GROUP BY test_id
                ) qc ON qc.test_id = t.test_id
                WHERE e.batch_id IN ($batchPlaceholders)
                  AND e.status = 'approved'
                  AND m.trainer_id = ?
                GROUP BY g.trainee_id
            ) AS scores
        ");
        $stmt->execute(array_merge($batchParams, [$trainerId]));
        $competency = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'active_batches' => count($activeBatchIds),
            'total_trainees' => $totalTrainees,
            'competent' => (int)($competency['competent'] ?? 0),
            'nyc' => (int)($competency['nyc'] ?? 0)
        ];
    }

    private function getModulePerformance(int $trainerId): void
    {
        $batchIds = ta_fetch_trainer_assigned_batch_ids($this->conn, $trainerId);
        if (empty($batchIds)) {
            echo json_encode(['success' => true, 'data' => []]);
            return;
        }

        [$placeholders, $params] = $this->buildInClause($batchIds);

        $query = "
            SELECT
                m.module_title,
                ROUND(AVG(
                    CASE
                        WHEN COALESCE(NULLIF(t.max_score, 0), qc.question_count, 0) > 0
                            THEN (g.score / COALESCE(NULLIF(t.max_score, 0), qc.question_count)) * 100
                        ELSE g.score
                    END
                ), 2) AS avg_score
            FROM tbl_grades g
            JOIN tbl_test t ON g.test_id = t.test_id
            JOIN tbl_lessons l ON t.lesson_id = l.lesson_id
            JOIN tbl_module m ON l.module_id = m.module_id
            JOIN tbl_enrollment e ON g.trainee_id = e.trainee_id
            LEFT JOIN (
                SELECT test_id, COUNT(*) AS question_count
                FROM tbl_quiz_questions
                GROUP BY test_id
            ) qc ON qc.test_id = t.test_id
            WHERE e.batch_id IN ($placeholders)
              AND e.status = 'approved'
              AND m.trainer_id = ?
              AND t.activity_type_id = 1
            GROUP BY m.module_id, m.module_title
            ORDER BY avg_score DESC, m.module_title
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->execute(array_merge($params, [$trainerId]));

        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC) ?: []]);
    }

    private function getSchedule(int $trainerId): void
    {
        echo json_encode(['success' => true, 'data' => $this->getScheduleData($trainerId)]);
    }

    private function getScheduleData(int $trainerId): array
    {
        [$singleRoomSelect, $singleRoomJoin] = $this->buildRoomQueryParts('s');
        [$multiRoomSelect, $multiRoomJoin] = $this->buildRoomQueryParts('a');

        $singleStmt = $this->conn->prepare("
            SELECT
                b.batch_id,
                b.batch_name,
                q.qualification_name AS course_name,
                s.schedule,
                $singleRoomSelect,
                COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode,
                'batch' AS scope_type,
                NULL AS module_id,
                NULL AS module_title,
                NULL AS competency_type,
                '' AS unit_code
            FROM tbl_batch b
            LEFT JOIN tbl_qualifications q ON q.qualification_id = b.qualification_id
            LEFT JOIN tbl_schedule s ON s.batch_id = b.batch_id
            $singleRoomJoin
            WHERE COALESCE(b.trainer_assignment_mode, 'single') <> 'multiple'
              AND b.trainer_id = ?
              AND b.status = 'open'
            ORDER BY b.batch_id DESC
        ");
        $singleStmt->execute([$trainerId]);
        $singleRows = $singleStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $multiStmt = $this->conn->prepare("
            SELECT
                b.batch_id,
                b.batch_name,
                q.qualification_name AS course_name,
                a.schedule,
                $multiRoomSelect,
                COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode,
                'module' AS scope_type,
                a.module_id,
                m.module_title,
                COALESCE(m.competency_type, '') AS competency_type,
                " . (ta_column_exists($this->conn, 'tbl_module', 'unit_code') ? "COALESCE(m.unit_code, '') AS unit_code" : "'' AS unit_code") . "
            FROM tbl_batch_trainer_assignments a
            JOIN tbl_batch b ON b.batch_id = a.batch_id
            JOIN tbl_module m ON m.module_id = a.module_id
            LEFT JOIN tbl_qualifications q ON q.qualification_id = b.qualification_id
            $multiRoomJoin
            WHERE COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
              AND a.trainer_id = ?
              AND b.status = 'open'
            ORDER BY b.batch_id DESC, m.module_title
        ");
        $multiStmt->execute([$trainerId]);
        $multiRows = $multiStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $multiFallbackStmt = $this->conn->prepare("
            SELECT
                b.batch_id,
                b.batch_name,
                q.qualification_name AS course_name,
                s.schedule,
                $singleRoomSelect,
                COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode,
                'lead_batch' AS scope_type,
                NULL AS module_id,
                NULL AS module_title,
                NULL AS competency_type,
                '' AS unit_code
            FROM tbl_batch b
            LEFT JOIN tbl_qualifications q ON q.qualification_id = b.qualification_id
            LEFT JOIN tbl_schedule s ON s.batch_id = b.batch_id
            $singleRoomJoin
            WHERE COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
              AND b.trainer_id = ?
              AND b.status = 'open'
              AND NOT EXISTS (
                    SELECT 1
                    FROM tbl_batch_trainer_assignments fallback_assignments
                    WHERE fallback_assignments.batch_id = b.batch_id
              )
            ORDER BY b.batch_id DESC
        ");
        $multiFallbackStmt->execute([$trainerId]);
        $multiFallbackRows = $multiFallbackStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $rows = array_merge($singleRows, $multiFallbackRows, $multiRows);
        foreach ($rows as &$row) {
            $row['trainer_assignment_mode'] = ta_normalize_mode($row['trainer_assignment_mode'] ?? 'single');
            $row['module_id'] = !empty($row['module_id']) ? (int)$row['module_id'] : null;
            $row['scope_type'] = sw_normalize_scope_type($row['scope_type'] ?? '', $row['module_id'], $row['trainer_assignment_mode']);
            $row['scope_label'] = sw_build_scope_label($row);
        }
        unset($row);

        return $rows;
    }

    private function getScheduleRequests(int $trainerId): void
    {
        $requests = $this->getScheduleRequestData($trainerId);
        echo json_encode(['success' => true, 'data' => $requests]);
    }

    private function respondToScheduleRequest(int $trainerId): void
    {
        $requestId = (int)($this->requestBody['request_id'] ?? 0);
        $responseAction = strtolower(trim((string)($this->requestBody['response_action'] ?? '')));
        $actorUserId = $this->normalizeNullableInt($this->requestBody['user_id'] ?? null);
        $trainerNote = trim((string)($this->requestBody['trainer_note'] ?? '')) ?: null;

        if (!in_array($responseAction, ['accept', 'propose'], true)) {
            throw new Exception('Invalid response action.');
        }

        if ($requestId <= 0 && $responseAction !== 'propose') {
            throw new Exception('Schedule request ID is required.');
        }

        $request = $requestId > 0 ? sw_fetch_schedule_request_by_id($this->conn, $requestId) : null;
        if ($requestId > 0 && !$request) {
            throw new Exception('Schedule request not found.');
        }

        if ($request && (int)($request['trainer_id'] ?? 0) !== $trainerId) {
            throw new Exception('This schedule request does not belong to you.');
        }

        if ($responseAction === 'accept') {
            if (($request['status'] ?? '') !== 'pending_trainer_response') {
                throw new Exception('This request is no longer waiting for trainer confirmation.');
            }

            $conflicts = sw_find_conflicts($this->conn, [
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

            $this->conn->beginTransaction();
            sw_apply_request_approval($this->conn, $request);

            $stmt = $this->conn->prepare("
                UPDATE tbl_schedule_requests
                SET status = 'approved',
                    trainer_note = :trainer_note,
                    created_by_user_id = :created_by_user_id,
                    updated_at = NOW()
                WHERE request_id = :request_id
            ");
            $stmt->execute([
                ':trainer_note' => $trainerNote,
                ':created_by_user_id' => $actorUserId,
                ':request_id' => $requestId
            ]);

            $updatedRequest = sw_fetch_schedule_request_by_id($this->conn, $requestId);
            $this->notifyRegistrarsOfTrainerAction($updatedRequest, 'accepted', $actorUserId);
            $this->conn->commit();

            echo json_encode(['success' => true, 'message' => 'Schedule accepted successfully.']);
            return;
        }

        if ($request && !in_array($request['status'] ?? '', ['pending_trainer_response', 'modification_requested'], true)) {
            throw new Exception('This request is not open for trainer changes.');
        }

        $schedule = trim((string)($this->requestBody['schedule'] ?? ''));
        if ($schedule === '') {
            throw new Exception('Schedule is required.');
        }

        $context = $request ?: $this->buildAdHocScheduleContext($trainerId);
        $batch = sw_fetch_batch_context($this->conn, (int)$context['batch_id']);
        if (!$batch) {
            throw new Exception('Batch not found.');
        }

        $effectiveDate = sw_resolve_effective_date($batch, $this->requestBody['effective_date'] ?? null);
        $roomId = $this->normalizeNullableInt($this->requestBody['room_id'] ?? null);

        $candidate = [
            'request_id' => $context['request_id'] ?? null,
            'batch_id' => $context['batch_id'],
            'module_id' => $context['module_id'],
            'trainer_id' => $context['trainer_id'],
            'scope_type' => $context['scope_type'],
            'trainer_assignment_mode' => $context['trainer_assignment_mode'],
            'schedule' => $schedule,
            'room_id' => $roomId,
            'effective_date' => $effectiveDate,
            'module_title' => $context['module_title'] ?? '',
            'competency_type' => $context['competency_type'] ?? '',
            'unit_code' => $context['unit_code'] ?? ''
        ];
        $conflicts = sw_find_conflicts($this->conn, $candidate);
        if (!empty($conflicts)) {
            throw new Exception(sw_format_conflict_message($conflicts[0]));
        }

        $this->conn->beginTransaction();
        $savedRequestId = sw_persist_schedule_request($this->conn, [
            'batch_id' => $context['batch_id'],
            'module_id' => $context['module_id'],
            'trainer_id' => $context['trainer_id'],
            'scope_type' => $context['scope_type'],
            'schedule' => $schedule,
            'room_id' => $roomId,
            'effective_date' => $effectiveDate,
            'status' => 'pending_registrar_approval',
            'proposed_by_role' => 'trainer',
            'created_by_user_id' => $actorUserId,
            'trainer_note' => $trainerNote,
            'registrar_note' => $request['registrar_note'] ?? null
        ]);

        $updatedRequest = sw_fetch_schedule_request_by_id($this->conn, $savedRequestId);
        $this->notifyRegistrarsOfTrainerAction($updatedRequest, 'proposed', $actorUserId);
        $this->conn->commit();

        echo json_encode(['success' => true, 'message' => 'Schedule proposal sent to the registrar for approval.']);
    }

    private function getScheduleRequestData(int $trainerId): array
    {
        $requests = sw_fetch_schedule_request_rows($this->conn, ['trainer_id' => $trainerId]);
        $existingScopeKeys = [];
        foreach ($requests as $request) {
            $scopeKey = trim((string)($request['scope_key'] ?? ''));
            if ($scopeKey !== '') {
                $existingScopeKeys[$scopeKey] = true;
            }
        }

        $syntheticRows = [];
        $scheduleRoomSelect = $this->tableExists('tbl_rooms')
            ? "COALESCE(r_schedule.room_name, CAST(s.room_id AS CHAR), 'TBA') AS current_room_name"
            : "COALESCE(CAST(s.room_id AS CHAR), 'TBA') AS current_room_name";
        $scheduleRoomJoin = $this->tableExists('tbl_rooms')
            ? "LEFT JOIN tbl_rooms r_schedule ON r_schedule.room_id = s.room_id"
            : '';
        $assignmentRoomSelect = $this->tableExists('tbl_rooms')
            ? "COALESCE(r_assignment.room_name, CAST(a.room_id AS CHAR), 'TBA') AS current_room_name"
            : "COALESCE(CAST(a.room_id AS CHAR), 'TBA') AS current_room_name";
        $assignmentRoomJoin = $this->tableExists('tbl_rooms')
            ? "LEFT JOIN tbl_rooms r_assignment ON r_assignment.room_id = a.room_id"
            : '';

        $singleStmt = $this->conn->prepare("
            SELECT
                b.batch_id,
                b.batch_name,
                b.qualification_id,
                q.qualification_name AS course_name,
                b.start_date,
                b.end_date,
                b.status AS batch_status,
                b.trainer_id,
                COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode,
                TRIM(CONCAT_WS(' ', t.first_name, t.last_name)) AS trainer_name,
                s.schedule AS current_schedule,
                s.room_id AS current_room_id,
                $scheduleRoomSelect
            FROM tbl_batch b
            LEFT JOIN tbl_qualifications q ON q.qualification_id = b.qualification_id
            LEFT JOIN tbl_trainer t ON t.trainer_id = b.trainer_id
            LEFT JOIN tbl_schedule s ON s.batch_id = b.batch_id
            $scheduleRoomJoin
            WHERE COALESCE(b.trainer_assignment_mode, 'single') <> 'multiple'
              AND b.trainer_id = ?
              AND b.status = 'open'
        ");
        $singleStmt->execute([$trainerId]);
        foreach ($singleStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            if (trim((string)($row['current_schedule'] ?? '')) !== '') {
                continue;
            }

            $scopeKey = sw_build_scope_key((int)$row['batch_id'], 'batch', null);
            if (isset($existingScopeKeys[$scopeKey])) {
                continue;
            }

            $syntheticRows[] = $this->buildSyntheticScheduleRow($row, 'batch', null);
        }

        $leadStmt = $this->conn->prepare("
            SELECT
                b.batch_id,
                b.batch_name,
                b.qualification_id,
                q.qualification_name AS course_name,
                b.start_date,
                b.end_date,
                b.status AS batch_status,
                b.trainer_id,
                COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode,
                TRIM(CONCAT_WS(' ', t.first_name, t.last_name)) AS trainer_name,
                s.schedule AS current_schedule,
                s.room_id AS current_room_id,
                $scheduleRoomSelect
            FROM tbl_batch b
            LEFT JOIN tbl_qualifications q ON q.qualification_id = b.qualification_id
            LEFT JOIN tbl_trainer t ON t.trainer_id = b.trainer_id
            LEFT JOIN tbl_schedule s ON s.batch_id = b.batch_id
            $scheduleRoomJoin
            WHERE COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
              AND b.trainer_id = ?
              AND b.status = 'open'
              AND NOT EXISTS (
                    SELECT 1
                    FROM tbl_batch_trainer_assignments lead_assignments
                    WHERE lead_assignments.batch_id = b.batch_id
              )
        ");
        $leadStmt->execute([$trainerId]);
        foreach ($leadStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            if (trim((string)($row['current_schedule'] ?? '')) !== '') {
                continue;
            }

            $scopeKey = sw_build_scope_key((int)$row['batch_id'], 'lead_batch', null);
            if (isset($existingScopeKeys[$scopeKey])) {
                continue;
            }

            $syntheticRows[] = $this->buildSyntheticScheduleRow($row, 'lead_batch', null);
        }

        $moduleStmt = $this->conn->prepare("
            SELECT
                a.batch_id,
                a.module_id,
                a.trainer_id,
                a.schedule AS current_schedule,
                a.room_id AS current_room_id,
                b.batch_name,
                b.qualification_id,
                q.qualification_name AS course_name,
                b.start_date,
                b.end_date,
                b.status AS batch_status,
                COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode,
                TRIM(CONCAT_WS(' ', t.first_name, t.last_name)) AS trainer_name,
                $assignmentRoomSelect,
                m.module_title,
                COALESCE(m.competency_type, '') AS competency_type,
                " . (ta_column_exists($this->conn, 'tbl_module', 'unit_code') ? "COALESCE(m.unit_code, '') AS unit_code" : "'' AS unit_code") . "
            FROM tbl_batch_trainer_assignments a
            JOIN tbl_batch b ON b.batch_id = a.batch_id
            JOIN tbl_module m ON m.module_id = a.module_id
            LEFT JOIN tbl_qualifications q ON q.qualification_id = b.qualification_id
            LEFT JOIN tbl_trainer t ON t.trainer_id = a.trainer_id
            $assignmentRoomJoin
            WHERE a.trainer_id = ?
              AND COALESCE(b.trainer_assignment_mode, 'single') = 'multiple'
              AND b.status = 'open'
        ");
        $moduleStmt->execute([$trainerId]);
        foreach ($moduleStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            if (trim((string)($row['current_schedule'] ?? '')) !== '') {
                continue;
            }

            $scopeKey = sw_build_scope_key((int)$row['batch_id'], 'module', (int)$row['module_id']);
            if (isset($existingScopeKeys[$scopeKey])) {
                continue;
            }

            $syntheticRows[] = $this->buildSyntheticScheduleRow($row, 'module', (int)$row['module_id']);
        }

        $merged = array_merge($requests, $syntheticRows);
        usort($merged, static function (array $left, array $right): int {
            $leftTimestamp = strtotime((string)($left['updated_at'] ?? $left['created_at'] ?? 'now')) ?: 0;
            $rightTimestamp = strtotime((string)($right['updated_at'] ?? $right['created_at'] ?? 'now')) ?: 0;
            return $rightTimestamp <=> $leftTimestamp;
        });

        return $merged;
    }

    private function buildSyntheticScheduleRow(array $row, string $scopeType, ?int $moduleId): array
    {
        $scopeKey = sw_build_scope_key((int)$row['batch_id'], $scopeType, $moduleId);
        $scopeLabel = $scopeType === 'module'
            ? sw_build_scope_label([
                'scope_type' => 'module',
                'module_id' => $moduleId,
                'module_title' => $row['module_title'] ?? '',
                'competency_type' => $row['competency_type'] ?? '',
                'unit_code' => $row['unit_code'] ?? ''
            ])
            : ($scopeType === 'lead_batch' ? 'Lead Trainer Batch Schedule' : 'Full Batch');

        return [
            'request_id' => null,
            'scope_key' => $scopeKey,
            'batch_id' => (int)$row['batch_id'],
            'module_id' => $moduleId,
            'trainer_id' => (int)$row['trainer_id'],
            'scope_type' => $scopeType,
            'schedule' => null,
            'room_id' => null,
            'effective_date' => null,
            'status' => 'awaiting_schedule',
            'proposed_by_role' => 'trainer',
            'created_by_user_id' => null,
            'trainer_note' => null,
            'registrar_note' => null,
            'created_at' => null,
            'updated_at' => null,
            'batch_name' => $row['batch_name'] ?? '',
            'qualification_id' => (int)($row['qualification_id'] ?? 0),
            'start_date' => $row['start_date'] ?? null,
            'end_date' => $row['end_date'] ?? null,
            'batch_status' => $row['batch_status'] ?? 'open',
            'trainer_assignment_mode' => ta_normalize_mode($row['trainer_assignment_mode'] ?? 'single'),
            'course_name' => $row['course_name'] ?? '',
            'module_title' => $row['module_title'] ?? null,
            'competency_type' => $row['competency_type'] ?? null,
            'unit_code' => $row['unit_code'] ?? '',
            'trainer_name' => $row['trainer_name'] ?? '',
            'trainer_user_id' => null,
            'requested_room_name' => 'TBA',
            'batch_current_schedule' => $scopeType === 'module' ? null : ($row['current_schedule'] ?? null),
            'batch_current_room_id' => $scopeType === 'module' ? null : (!empty($row['current_room_id']) ? (int)$row['current_room_id'] : null),
            'batch_current_room_name' => $scopeType === 'module' ? 'TBA' : ($row['current_room_name'] ?? 'TBA'),
            'module_current_schedule' => $scopeType === 'module' ? ($row['current_schedule'] ?? null) : null,
            'module_current_room_id' => $scopeType === 'module' ? (!empty($row['current_room_id']) ? (int)$row['current_room_id'] : null) : null,
            'module_current_room_name' => $scopeType === 'module' ? ($row['current_room_name'] ?? 'TBA') : 'TBA',
            'scope_label' => $scopeLabel,
            'room' => $row['current_room_name'] ?? 'TBA',
            'resolved_effective_date' => $row['start_date'] ?? null,
            'current_schedule' => trim((string)($row['current_schedule'] ?? '')) ?: null,
            'current_room_id' => !empty($row['current_room_id']) ? (int)$row['current_room_id'] : null,
            'current_room' => $row['current_room_name'] ?? 'TBA'
        ];
    }

    private function buildAdHocScheduleContext(int $trainerId): array
    {
        $batchId = (int)($this->requestBody['batch_id'] ?? 0);
        $moduleId = $this->normalizeNullableInt($this->requestBody['module_id'] ?? null);
        $scopeType = sw_normalize_scope_type(
            $this->requestBody['scope_type'] ?? '',
            $moduleId,
            $this->requestBody['trainer_assignment_mode'] ?? 'single'
        );

        if ($batchId <= 0) {
            throw new Exception('Batch ID is required.');
        }

        $batch = sw_fetch_batch_context($this->conn, $batchId);
        if (!$batch) {
            throw new Exception('Batch not found.');
        }

        if ($scopeType === 'module') {
            if ($moduleId === null || $moduleId <= 0) {
                throw new Exception('Module ID is required for unit schedule proposals.');
            }

            $stmt = $this->conn->prepare("
                SELECT
                    a.batch_id,
                    a.module_id,
                    a.trainer_id,
                    m.module_title,
                    COALESCE(m.competency_type, '') AS competency_type,
                    " . (ta_column_exists($this->conn, 'tbl_module', 'unit_code') ? "COALESCE(m.unit_code, '') AS unit_code" : "'' AS unit_code") . "
                FROM tbl_batch_trainer_assignments a
                JOIN tbl_module m ON m.module_id = a.module_id
                WHERE a.batch_id = ?
                  AND a.module_id = ?
                  AND a.trainer_id = ?
                LIMIT 1
            ");
            $stmt->execute([$batchId, $moduleId, $trainerId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                throw new Exception('This unit is not assigned to your trainer account.');
            }

            return [
                'request_id' => null,
                'batch_id' => $batchId,
                'module_id' => $moduleId,
                'trainer_id' => $trainerId,
                'scope_type' => 'module',
                'trainer_assignment_mode' => 'multiple',
                'module_title' => $row['module_title'] ?? '',
                'competency_type' => $row['competency_type'] ?? '',
                'unit_code' => $row['unit_code'] ?? '',
                'registrar_note' => null
            ];
        }

        if ((int)($batch['trainer_id'] ?? 0) !== $trainerId) {
            throw new Exception('This batch-level schedule is not assigned to your trainer account.');
        }

        return [
            'request_id' => null,
            'batch_id' => $batchId,
            'module_id' => null,
            'trainer_id' => $trainerId,
            'scope_type' => $scopeType === 'lead_batch' ? 'lead_batch' : 'batch',
            'trainer_assignment_mode' => $scopeType === 'lead_batch' ? 'multiple' : 'single',
            'module_title' => '',
            'competency_type' => '',
            'unit_code' => '',
            'registrar_note' => null
        ];
    }

    private function notifyRegistrarsOfTrainerAction(?array $request, string $action, ?int $actorUserId = null): void
    {
        if (!$request) {
            return;
        }

        $registrarIds = sw_fetch_registrar_user_ids($this->conn);
        if (empty($registrarIds)) {
            return;
        }

        $trainerName = trim((string)($request['trainer_name'] ?? 'Trainer'));
        $scopeLabel = trim((string)($request['scope_label'] ?? 'schedule'));
        $batchName = trim((string)($request['batch_name'] ?? 'this batch'));
        $title = 'Schedule Update';
        $message = sprintf('%s updated the schedule for %s - %s.', $trainerName, $batchName, $scopeLabel);

        if ($action === 'accepted') {
            $title = 'Schedule Accepted';
            $message = sprintf('%s accepted the proposed schedule for %s - %s.', $trainerName, $batchName, $scopeLabel);
        } elseif ($action === 'proposed') {
            $title = 'Trainer Proposed a Schedule';
            $message = sprintf('%s submitted a schedule proposal for %s - %s.', $trainerName, $batchName, $scopeLabel);
        }

        foreach ($registrarIds as $registrarId) {
            try {
                sw_insert_notification($this->conn, [
                    'user_id' => $registrarId,
                    'target_user_id' => $registrarId,
                    'target_role' => 'registrar',
                    'actor_id' => $actorUserId,
                    'title' => $title,
                    'message' => $message,
                    'link' => sw_build_registrar_request_link((int)$request['request_id'], 'review')
                ]);
            } catch (Exception $e) {
                error_log('Unable to notify registrar of trainer action: ' . $e->getMessage());
            }
        }
    }

    private function buildInClause(array $ids): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        return [implode(',', array_fill(0, count($ids), '?')), $ids];
    }

    private function buildRoomQueryParts(string $alias): array
    {
        $scheduleTable = $alias === 's' ? 'tbl_schedule' : 'tbl_batch_trainer_assignments';

        if ($this->columnExists($scheduleTable, 'room_id') && $this->tableExists('tbl_rooms')) {
            return ["COALESCE(r_{$alias}.room_name, 'TBA') AS room", "LEFT JOIN tbl_rooms r_{$alias} ON r_{$alias}.room_id = {$alias}.room_id"];
        }

        if ($this->columnExists($scheduleTable, 'room')) {
            return ["COALESCE(NULLIF(TRIM({$alias}.room), ''), 'TBA') AS room", ''];
        }

        if ($this->columnExists($scheduleTable, 'room_id')) {
            return ["COALESCE(CAST({$alias}.room_id AS CHAR), 'TBA') AS room", ''];
        }

        return ["'TBA' AS room", ''];
    }

    private function normalizeNullableInt($value): ?int
    {
        $number = (int)$value;
        return $number > 0 ? $number : null;
    }

    private function tableExists(string $table): bool
    {
        return ta_table_exists($this->conn, $table);
    }

    private function columnExists(string $table, string $column): bool
    {
        return ta_column_exists($this->conn, $table, $column);
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TrainerDashboard($db);
$api->handleRequest();
?>
