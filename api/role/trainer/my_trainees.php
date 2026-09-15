<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';
require_once '../../utils/trainer_assignment_helper.php';
require_once '../../utils/AuthGuard.php';

class MyTrainees {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
        ta_ensure_schema($this->conn);
        AuthGuard::requireRole($this->conn, ['trainer', 'admin']);
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';
        $trainerId = (int)($_GET['trainer_id'] ?? 0);
        $batchId = (int)($_GET['batch_id'] ?? 0);
        AuthGuard::requireTrainerAccess($this->conn, $trainerId);

        if ($action !== 'list' || $trainerId <= 0 || $batchId <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid request']);
            return;
        }

        $this->getTrainees($trainerId, $batchId);
    }

    private function getTrainees(int $trainerId, int $batchId) {
        try {
            if (!ta_trainer_has_batch_access($this->conn, $trainerId, $batchId)) {
                echo json_encode(['success' => false, 'message' => 'You are not assigned to this batch.']);
                return;
            }

            $stmt = $this->conn->prepare("
                SELECT
                    e.trainee_id,
                    e.status AS enrollment_status,
                    e.enrollment_date,
                    DATE_FORMAT(e.enrollment_date, '%Y-%m-%d %H:%i:%s') AS formatted_enrollment_date,
                    h.first_name,
                    h.last_name,
                    h.email,
                    h.phone_number,
                    CONCAT(h.first_name, ' ', h.last_name) AS full_name,
                    b.batch_id,
                    b.batch_name,
                    q.qualification_id,
                    q.qualification_name,
                    q.qualification_name AS course_name,
                    cert.certificate_id,
                    cert.issue_date AS certificate_issue_date,
                    cert.certificate_status,
                    ftr.digital_signature
                FROM tbl_enrollment e
                JOIN tbl_trainee_hdr h ON e.trainee_id = h.trainee_id
                JOIN tbl_batch b ON e.batch_id = b.batch_id
                LEFT JOIN tbl_qualifications q ON b.qualification_id = q.qualification_id
                LEFT JOIN tbl_trainee_ftr ftr ON h.trainee_id = ftr.trainee_id
                LEFT JOIN tbl_certificate cert
                    ON cert.trainee_id = e.trainee_id
                    AND cert.qualification_id = b.qualification_id
                WHERE e.batch_id = ?
                  AND e.status = 'approved'
                ORDER BY h.last_name, h.first_name
            ");
            $stmt->execute([$batchId]);

            $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($trainees as &$trainee) {
                $progress = $this->getCoreCompetencyProgress(
                    (int)$trainee['trainee_id'],
                    (int)($trainee['qualification_id'] ?? 0)
                );
                $trainee['core_outcomes_total'] = $progress['total'];
                $trainee['core_outcomes_completed'] = $progress['completed'];
                $trainee['certificate_eligible'] = $progress['eligible'];
            }
            unset($trainee);

            echo json_encode(['success' => true, 'data' => $trainees]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function getCoreCompetencyProgress(int $traineeId, int $qualificationId): array {
        if ($traineeId <= 0 || $qualificationId <= 0) {
            return ['total' => 0, 'completed' => 0, 'eligible' => false];
        }

        $lessons = $this->conn->prepare("SELECT l.lesson_id
            FROM tbl_lessons l
            JOIN tbl_module m ON l.module_id = m.module_id
            WHERE m.qualification_id = ? AND LOWER(COALESCE(m.competency_type, '')) = 'core'");
        $lessons->execute([$qualificationId]);
        $lessonIds = array_map('intval', $lessons->fetchAll(PDO::FETCH_COLUMN) ?: []);
        $completed = 0;

        foreach ($lessonIds as $lessonId) {
            if ($this->isCoreOutcomeCompleted($traineeId, $lessonId)) {
                $completed++;
            }
        }

        return [
            'total' => count($lessonIds),
            'completed' => $completed,
            'eligible' => !empty($lessonIds) && $completed === count($lessonIds)
        ];
    }

    private function isCoreOutcomeCompleted(int $traineeId, int $lessonId): bool {
        $hasRequirements = false;

        $quiz = $this->conn->prepare('SELECT test_id FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1 LIMIT 1');
        $quiz->execute([$lessonId]);
        $testId = $quiz->fetchColumn();
        if ($testId) {
            $hasRequirements = true;
            $grade = $this->conn->prepare('SELECT 1 FROM tbl_grades WHERE trainee_id = ? AND test_id = ? LIMIT 1');
            $grade->execute([$traineeId, $testId]);
            if (!$grade->fetchColumn()) return false;
        }

        $tasks = $this->conn->prepare('SELECT task_sheet_id FROM tbl_task_sheets WHERE lesson_id = ?');
        $tasks->execute([$lessonId]);
        $taskSheetIds = $tasks->fetchAll(PDO::FETCH_COLUMN) ?: [];
        if (!empty($taskSheetIds)) {
            $hasRequirements = true;
            $placeholders = implode(',', array_fill(0, count($taskSheetIds), '?'));
            $submissions = $this->conn->prepare("SELECT COUNT(DISTINCT task_sheet_id)
                FROM tbl_task_sheet_submissions
                WHERE trainee_id = ? AND task_sheet_id IN ($placeholders)
                    AND status IN ('approved', 'recorded')");
            $submissions->execute(array_merge([$traineeId], $taskSheetIds));
            if ((int)$submissions->fetchColumn() < count($taskSheetIds)) return false;
        }

        return $hasRequirements;
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new MyTrainees($db);
$api->handleRequest();
?>
