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
                case 'get-presets':
                    $this->getPresets($trainerId);
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

    private function getPresets(int $trainerId): void
    {
        try {
            $presets = sw_fetch_schedule_presets($this->conn);
            echo json_encode(['success' => true, 'data' => $presets]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error loading schedule presets: ' . $e->getMessage()]);
        }
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
