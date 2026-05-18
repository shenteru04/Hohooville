<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';
require_once '../../utils/trainer_assignment_helper.php';

class TrainerBatches {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
        ta_ensure_schema($this->conn);
    }

    public function handleRequest() {
        $trainerId = (int)($_GET['trainer_id'] ?? 0);

        if ($trainerId <= 0) {
            echo json_encode(['success' => false, 'message' => 'Trainer ID required']);
            return;
        }

        $this->getBatches($trainerId);
    }

    private function getBatches(int $trainerId) {
        try {
            $batchIds = ta_fetch_trainer_assigned_batch_ids($this->conn, $trainerId);
            if (empty($batchIds)) {
                echo json_encode(['success' => true, 'data' => []]);
                return;
            }

            [$roomSelect, $roomJoin] = $this->buildRoomQueryParts();
            $placeholders = implode(',', array_fill(0, count($batchIds), '?'));
            $hasCourseCode = $this->columnExists('tbl_qualifications', 'ctpr_number');
            $courseCodeSelect = $hasCourseCode ? 'c.ctpr_number AS course_code,' : 'NULL AS course_code,';

            $stmt = $this->conn->prepare("
                SELECT
                    b.batch_id,
                    b.batch_name,
                    b.qualification_id,
                    COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode,
                    c.qualification_name AS course_name,
                    $courseCodeSelect
                    c.duration,
                    s.schedule,
                    $roomSelect,
                    b.status,
                    b.start_date,
                    b.end_date
                FROM tbl_batch b
                LEFT JOIN tbl_qualifications c ON c.qualification_id = b.qualification_id
                LEFT JOIN tbl_schedule s ON s.batch_id = b.batch_id
                $roomJoin
                WHERE b.batch_id IN ($placeholders)
                ORDER BY b.status DESC, b.batch_id DESC
            ");
            $stmt->execute($batchIds);
            $batches = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $assignmentsByBatch = [];
            foreach ($batchIds as $batchId) {
                $assignmentsByBatch[$batchId] = array_values(array_filter(
                    ta_fetch_batch_module_assignments($this->conn, (int)$batchId),
                    fn($assignment) => (int)($assignment['trainer_id'] ?? 0) === $trainerId
                ));
            }

            foreach ($batches as &$batch) {
                $mode = ta_normalize_mode($batch['trainer_assignment_mode'] ?? 'single');
                $batch['trainer_assignment_mode'] = $mode;
                $batchAssignments = $assignmentsByBatch[(int)$batch['batch_id']] ?? [];
                if ($mode === 'multiple') {
                    if (empty($batchAssignments)) {
                        $schedule = trim((string)($batch['schedule'] ?? '')) !== '' ? $batch['schedule'] : 'TBA';
                        $room = trim((string)($batch['room'] ?? '')) !== '' ? $batch['room'] : 'TBA';
                    } else {
                        [$schedule, $room] = $this->summarizeModuleAssignments($batchAssignments);
                    }
                    $batch['schedule'] = $schedule;
                    $batch['room'] = $room;
                } else {
                    $batch['schedule'] = trim((string)($batch['schedule'] ?? '')) !== '' ? $batch['schedule'] : 'TBA';
                    $batch['room'] = trim((string)($batch['room'] ?? '')) !== '' ? $batch['room'] : 'TBA';
                }
            }
            unset($batch);

            echo json_encode(['success' => true, 'data' => $batches]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function summarizeModuleAssignments(array $assignments): array {
        if (empty($assignments)) {
            return ['Module schedules pending', 'TBA'];
        }

        $scheduleValues = array_values(array_unique(array_filter(array_map(
            fn($assignment) => trim((string)($assignment['schedule'] ?? '')),
            $assignments
        ))));
        $roomValues = array_values(array_unique(array_filter(array_map(
            fn($assignment) => trim((string)($assignment['room'] ?? '')),
            $assignments
        ))));

        $schedule = count($scheduleValues) === 1
            ? $scheduleValues[0]
            : sprintf('%d unit schedules', count($assignments));
        $room = count($roomValues) === 1
            ? $roomValues[0]
            : (count($roomValues) > 1 ? 'Multiple rooms' : 'TBA');

        return [$schedule ?: 'Module schedules pending', $room ?: 'TBA'];
    }

    private function buildRoomQueryParts(): array {
        if ($this->columnExists('tbl_schedule', 'room_id') && $this->tableExists('tbl_rooms')) {
            return ["COALESCE(r.room_name, 'TBA') AS room", 'LEFT JOIN tbl_rooms r ON r.room_id = s.room_id'];
        }

        if ($this->columnExists('tbl_schedule', 'room')) {
            return ["COALESCE(NULLIF(TRIM(s.room), ''), 'TBA') AS room", ''];
        }

        if ($this->columnExists('tbl_schedule', 'room_id')) {
            return ["COALESCE(CAST(s.room_id AS CHAR), 'TBA') AS room", ''];
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
$api = new TrainerBatches($db);
$api->handleRequest();
?>
