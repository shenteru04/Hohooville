<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

require_once '../../database/db.php';

class TrainerAttendance {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';

        switch($action) {
            case 'get-trainees':
                $this->getTrainees();
                break;
            case 'save':
                $this->saveAttendance();
                break;
            default:
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
    }

    private function lessonDayNumberColumnExists(): bool {
        static $exists = null;
        if ($exists !== null) {
            return $exists;
        }

        try {
            $stmt = $this->conn->prepare("SHOW COLUMNS FROM `tbl_lessons` LIKE 'day_number'");
            $stmt->execute();
            $exists = (bool)$stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $exists = false;
        }

        return $exists;
    }

    private function quizAttemptsTableExists(): bool {
        static $exists = null;
        if ($exists !== null) {
            return $exists;
        }

        try {
            $stmt = $this->conn->prepare("SHOW TABLES LIKE 'tbl_quiz_attempts'");
            $stmt->execute();
            $exists = (bool)$stmt->fetchColumn();
        } catch (Exception $e) {
            $exists = false;
        }

        return $exists;
    }

    private function getBatchContext($batchId): array {
        $stmt = $this->conn->prepare("
            SELECT
                COALESCE(MAX(b.qualification_id), MAX(oq.qualification_id), 0) AS qualification_id,
                MAX(b.start_date) AS start_date
            FROM tbl_batch b
            LEFT JOIN tbl_enrollment e ON e.batch_id = b.batch_id
            LEFT JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
            WHERE b.batch_id = ?
        ");
        $stmt->execute([$batchId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'qualification_id' => (int)($row['qualification_id'] ?? 0),
            'start_date' => $row['start_date'] ?? null
        ];
    }

    private function calculateTrainingDayNumber(?string $startDate, string $selectedDate): ?int {
        if (!$startDate) {
            return null;
        }

        try {
            $batchStart = new DateTimeImmutable(date('Y-m-d', strtotime($startDate)));
            $attendanceDate = new DateTimeImmutable(date('Y-m-d', strtotime($selectedDate)));
        } catch (Exception $e) {
            return null;
        }

        if ($attendanceDate < $batchStart) {
            return null;
        }

        return $batchStart->diff($attendanceDate)->days + 1;
    }

    private function fetchRelevantLessonIds(int $qualificationId, string $selectedDate, ?int $trainingDayNumber): array {
        if ($qualificationId <= 0) {
            return [];
        }

        $activityClause = "(
                EXISTS (
                    SELECT 1
                    FROM tbl_test tt
                    WHERE tt.lesson_id = l.lesson_id
                      AND tt.activity_type_id = 1
                )
                OR EXISTS (
                    SELECT 1
                    FROM tbl_task_sheets ts
                    WHERE ts.lesson_id = l.lesson_id
                )
            )";

        if ($trainingDayNumber !== null && $this->lessonDayNumberColumnExists()) {
            $stmt = $this->conn->prepare("
                SELECT l.lesson_id
                FROM tbl_lessons l
                JOIN tbl_module m ON l.module_id = m.module_id
                WHERE m.qualification_id = ?
                  AND l.day_number = ?
                  AND $activityClause
                ORDER BY l.lesson_id
            ");
            $stmt->execute([$qualificationId, $trainingDayNumber]);
            $lessonIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (!empty($lessonIds)) {
                return array_map('intval', $lessonIds);
            }
        }

        $stmt = $this->conn->prepare("
            SELECT l.lesson_id
            FROM tbl_lessons l
            JOIN tbl_module m ON l.module_id = m.module_id
            WHERE m.qualification_id = ?
              AND DATE(l.posting_date) = ?
              AND $activityClause
            ORDER BY l.lesson_id
        ");
        $stmt->execute([$qualificationId, $selectedDate]);
        $lessonIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        return array_map('intval', $lessonIds ?: []);
    }

    private function fetchAutomaticPresentMap(array $lessonIds, string $selectedDate): array {
        if (empty($lessonIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($lessonIds), '?'));
        $params = array_merge($lessonIds, [$selectedDate]);

        $quizTrainees = [];
        if ($this->quizAttemptsTableExists()) {
            $attemptStmt = $this->conn->prepare("
                SELECT DISTINCT qa.trainee_id
                FROM tbl_quiz_attempts qa
                WHERE qa.lesson_id IN ($placeholders)
                  AND DATE(qa.created_at) = ?
            ");
            $attemptStmt->execute($params);
            $quizTrainees = $attemptStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        }

        $quizStmt = $this->conn->prepare("
            SELECT DISTINCT g.trainee_id
            FROM tbl_grades g
            JOIN tbl_test tt ON g.test_id = tt.test_id
            WHERE tt.lesson_id IN ($placeholders)
              AND DATE(g.date_recorded) = ?
        ");
        $quizStmt->execute($params);
        $quizGradeTrainees = $quizStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

        $taskStmt = $this->conn->prepare("
            SELECT DISTINCT s.trainee_id
            FROM tbl_task_sheet_submissions s
            WHERE s.lesson_id IN ($placeholders)
              AND s.status IN ('submitted', 'approved')
              AND DATE(s.submission_date) = ?
        ");
        $taskStmt->execute($params);
        $taskTrainees = $taskStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

        $presentMap = [];
        foreach (array_unique(array_merge($quizTrainees, $quizGradeTrainees, $taskTrainees)) as $traineeId) {
            $presentMap[(string)$traineeId] = true;
        }

        return $presentMap;
    }

    private function getTrainees() {
        $batchId = $_GET['batch_id'] ?? null;
        $date = $_GET['date'] ?? date('Y-m-d');

        if (!$batchId) {
            echo json_encode(['success' => false, 'message' => 'Batch ID required']);
            return;
        }

        $batchContext = $this->getBatchContext($batchId);
        $trainingDayNumber = $this->calculateTrainingDayNumber($batchContext['start_date'], $date);

        // Check if attendance already exists for this date/batch
        $hdrQuery = "SELECT attendance_hdr_id FROM tbl_attendance_hdr WHERE batch_id = ? AND date_recorded = ?";
        $hdrStmt = $this->conn->prepare($hdrQuery);
        $hdrStmt->execute([$batchId, $date]);
        $hdr = $hdrStmt->fetch(PDO::FETCH_ASSOC);
        $hdrId = $hdr ? $hdr['attendance_hdr_id'] : null;

        $relevantLessonIds = $hdrId
            ? []
            : $this->fetchRelevantLessonIds($batchContext['qualification_id'], $date, $trainingDayNumber);
        $autoPresentMap = $hdrId
            ? []
            : $this->fetchAutomaticPresentMap($relevantLessonIds, $date);

        // Fetch trainees and their status if exists
        $query = "SELECT t.trainee_id, t.trainee_school_id, t.first_name, t.last_name, 
                         ad.status
                  FROM tbl_enrollment e
                  JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
                  LEFT JOIN tbl_attendance_dtl ad ON t.trainee_id = ad.trainee_id AND ad.attendance_hdr_id = ?
                  WHERE e.batch_id = ? AND e.status = 'approved'
                  ORDER BY t.last_name ASC, t.first_name ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$hdrId, $batchId]);
        $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($trainees as &$trainee) {
            if (!empty($trainee['status'])) {
                continue;
            }

            $traineeId = (string)($trainee['trainee_id'] ?? '');
            if (!empty($relevantLessonIds)) {
                $trainee['status'] = isset($autoPresentMap[$traineeId]) ? 'present' : 'absent';
            } else {
                $trainee['status'] = 'present';
            }
        }
        unset($trainee);

        echo json_encode(['success' => true, 'data' => $trainees]);
    }

    private function saveAttendance() {
        $data = json_decode(file_get_contents('php://input'), true);
        $batchId = $data['batch_id'] ?? null;
        $date = $data['date'] ?? null;
        $trainees = $data['trainees'] ?? [];

        if (!$batchId || !$date || empty($trainees)) {
            echo json_encode(['success' => false, 'message' => 'Missing data']);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // 1. Check or Create Header
            $hdrQuery = "SELECT attendance_hdr_id FROM tbl_attendance_hdr WHERE batch_id = ? AND date_recorded = ?";
            $hdrStmt = $this->conn->prepare($hdrQuery);
            $hdrStmt->execute([$batchId, $date]);
            $hdr = $hdrStmt->fetch(PDO::FETCH_ASSOC);

            if ($hdr) {
                $hdrId = $hdr['attendance_hdr_id'];
                // Clear existing details to overwrite
                $delStmt = $this->conn->prepare("DELETE FROM tbl_attendance_dtl WHERE attendance_hdr_id = ?");
                $delStmt->execute([$hdrId]);
            } else {
                $insHdr = $this->conn->prepare("INSERT INTO tbl_attendance_hdr (batch_id, date_recorded) VALUES (?, ?)");
                $insHdr->execute([$batchId, $date]);
                $hdrId = $this->conn->lastInsertId();
            }

            // 2. Insert Details
            $insDtl = $this->conn->prepare("INSERT INTO tbl_attendance_dtl (attendance_hdr_id, trainee_id, status, remarks) VALUES (?, ?, ?, '')");
            foreach ($trainees as $t) {
                $insDtl->execute([$hdrId, $t['trainee_id'], $t['status']]);
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Attendance saved successfully']);
        } catch (Exception $e) {
            $this->conn->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TrainerAttendance($db);
$api->handleRequest();
?>
