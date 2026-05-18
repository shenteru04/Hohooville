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

class TrainerDashboard {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
        ta_ensure_schema($this->conn);
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';
        $trainerId = (int)($_GET['trainer_id'] ?? 0);

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
                default:
                    echo json_encode(['success' => false, 'message' => 'Invalid action']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function getDashboardData(int $trainerId) {
        $stats = $this->getStatisticsData($trainerId);
        $schedule = $this->getScheduleData($trainerId);

        echo json_encode(['success' => true, 'data' => array_merge($stats, ['schedule' => $schedule])]);
    }

    private function getStatistics(int $trainerId) {
        echo json_encode(['success' => true, 'data' => $this->getStatisticsData($trainerId)]);
    }

    private function getStatisticsData(int $trainerId): array {
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

    private function getModulePerformance(int $trainerId) {
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

    private function getSchedule(int $trainerId) {
        echo json_encode(['success' => true, 'data' => $this->getScheduleData($trainerId)]);
    }

    private function getScheduleData(int $trainerId): array {
        [$singleRoomSelect, $singleRoomJoin] = $this->buildRoomQueryParts('s');
        [$multiRoomSelect, $multiRoomJoin] = $this->buildRoomQueryParts('a');

        $singleStmt = $this->conn->prepare("
            SELECT
                b.batch_id,
                b.batch_name,
                q.qualification_name AS course_name,
                s.schedule,
                $singleRoomSelect
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
                CONCAT(b.batch_name, ' - ', m.module_title) AS batch_name,
                q.qualification_name AS course_name,
                a.schedule,
                $multiRoomSelect
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
                $singleRoomSelect
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

        return array_merge($singleRows, $multiFallbackRows, $multiRows);
    }

    private function buildInClause(array $ids): array {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        return [implode(',', array_fill(0, count($ids), '?')), $ids];
    }

    private function buildRoomQueryParts(string $alias): array {
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

    private function tableExists(string $table): bool {
        return ta_table_exists($this->conn, $table);
    }

    private function columnExists(string $table, string $column): bool {
        return ta_column_exists($this->conn, $table, $column);
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TrainerDashboard($db);
$api->handleRequest();
?>
