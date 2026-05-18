<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';
require_once '../../utils/trainer_assignment_helper.php';

function td_column_exists(PDO $conn, string $table, string $column): bool {
    try {
        $stmt = $conn->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
        $stmt->execute([$column]);
        return (bool)$stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return false;
    }
}

function td_resolved_task_completion_status(): array {
    return ['approved', 'recorded'];
}

function td_pick_reviewed_task_status(PDO $conn): string {
    static $resolved = null;
    if ($resolved !== null) {
        return $resolved;
    }

    try {
        $stmt = $conn->query("SHOW COLUMNS FROM `tbl_task_sheet_submissions` LIKE 'status'");
        $column = $stmt->fetch(PDO::FETCH_ASSOC);
        $type = strtolower((string)($column['Type'] ?? ''));

        if (preg_match_all("/'([^']+)'/", $type, $matches) && !empty($matches[1])) {
            $enumValues = array_map('strtolower', $matches[1]);
            if (in_array('approved', $enumValues, true)) {
                $resolved = 'approved';
                return $resolved;
            }
            if (in_array('recorded', $enumValues, true)) {
                $resolved = 'recorded';
                return $resolved;
            }
        }
    } catch (Exception $e) {
        error_log('Unable to inspect task sheet submission statuses in trainee_details.php: ' . $e->getMessage());
    }

    $resolved = 'approved';
    return $resolved;
}

function td_user_exists(PDO $conn, int $userId): bool {
    if ($userId <= 0) {
        return false;
    }

    try {
        $stmt = $conn->prepare("SELECT 1 FROM tbl_users WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        return (bool)$stmt->fetchColumn();
    } catch (Exception $e) {
        error_log('Unable to check user existence in trainee_details.php: ' . $e->getMessage());
        return false;
    }
}

function td_resolve_submission_grader_id(PDO $conn, int $userId): int {
    if ($userId <= 0) {
        return 0;
    }

    $referencedTable = '';
    $referencedColumn = '';

    try {
        $stmt = $conn->prepare("
            SELECT REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'tbl_task_sheet_submissions'
              AND COLUMN_NAME = 'graded_by'
              AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 1
        ");
        $stmt->execute();
        $reference = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        $referencedTable = strtolower((string)($reference['REFERENCED_TABLE_NAME'] ?? ''));
        $referencedColumn = strtolower((string)($reference['REFERENCED_COLUMN_NAME'] ?? ''));
    } catch (Exception $e) {
        error_log('Unable to inspect graded_by foreign key in trainee_details.php: ' . $e->getMessage());
    }

    if ($referencedTable === 'tbl_users' && $referencedColumn === 'user_id') {
        return td_user_exists($conn, $userId) ? $userId : 0;
    }

    try {
        $stmt = $conn->prepare("SELECT trainer_id FROM tbl_trainer WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $trainerId = (int)$stmt->fetchColumn();
        if ($trainerId > 0 && ($referencedTable === 'tbl_trainer' || $referencedTable === '')) {
            return $trainerId;
        }
    } catch (Exception $e) {
        error_log('Unable to resolve trainer_id from tbl_trainer in trainee_details.php: ' . $e->getMessage());
    }

    try {
        $stmt = $conn->prepare("SELECT trainer_id FROM tbl_trainer_hdr WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $trainerId = (int)$stmt->fetchColumn();
        if ($trainerId > 0 && ($referencedTable === 'tbl_trainer_hdr' || $referencedTable === '')) {
            return $trainerId;
        }
    } catch (Exception $e) {
        error_log('Unable to resolve trainer_id from tbl_trainer_hdr in trainee_details.php: ' . $e->getMessage());
    }

    return td_user_exists($conn, $userId) ? $userId : 0;
}

function td_upsert_learning_outcome_progress(PDO $conn, int $traineeId, int $lessonId, bool $quizCompleted, bool $taskCompleted): void {
    $columns = ['trainee_id', 'lesson_id'];
    $values = [$traineeId, $lessonId];
    $updates = [];

    if (td_column_exists($conn, 'tbl_learning_outcome_progress', 'quiz_completed')) {
        $columns[] = 'quiz_completed';
        $values[] = $quizCompleted ? 1 : 0;
        $updates[] = 'quiz_completed = VALUES(quiz_completed)';
    }

    if (td_column_exists($conn, 'tbl_learning_outcome_progress', 'quiz_passed')) {
        $columns[] = 'quiz_passed';
        $values[] = $quizCompleted ? 1 : 0;
        $updates[] = 'quiz_passed = VALUES(quiz_passed)';
    }

    if (td_column_exists($conn, 'tbl_learning_outcome_progress', 'task_completed')) {
        $columns[] = 'task_completed';
        $values[] = $taskCompleted ? 1 : 0;
        $updates[] = 'task_completed = VALUES(task_completed)';
    }

    if (td_column_exists($conn, 'tbl_learning_outcome_progress', 'task_passed')) {
        $columns[] = 'task_passed';
        $values[] = $taskCompleted ? 1 : 0;
        $updates[] = 'task_passed = VALUES(task_passed)';
    }

    if (td_column_exists($conn, 'tbl_learning_outcome_progress', 'learning_outcome_completed')) {
        $columns[] = 'learning_outcome_completed';
        $values[] = ($quizCompleted && $taskCompleted) ? 1 : 0;
        $updates[] = 'learning_outcome_completed = VALUES(learning_outcome_completed)';
    }

    if (td_column_exists($conn, 'tbl_learning_outcome_progress', 'completed_date')) {
        $columns[] = 'completed_date';
        $values[] = ($quizCompleted && $taskCompleted) ? date('Y-m-d H:i:s') : null;
        $updates[] = 'completed_date = VALUES(completed_date)';
    }

    if (td_column_exists($conn, 'tbl_learning_outcome_progress', 'updated_at')) {
        $updates[] = 'updated_at = NOW()';
    }

    $placeholders = implode(', ', array_fill(0, count($columns), '?'));
    $sql = sprintf(
        'INSERT INTO tbl_learning_outcome_progress (%s) VALUES (%s) ON DUPLICATE KEY UPDATE %s',
        implode(', ', $columns),
        $placeholders,
        implode(', ', $updates)
    );

    $stmt = $conn->prepare($sql);
    $stmt->execute($values);
}

function td_sync_module_progress(PDO $conn, int $traineeId, int $moduleId): void {
    $completedTaskStatuses = td_resolved_task_completion_status();
    $completedTaskStatusList = "'" . implode("','", array_map('addslashes', $completedTaskStatuses)) . "'";

    $stmt = $conn->prepare("
        SELECT
            COUNT(*) AS total_lessons,
            SUM(
                CASE
                    WHEN (
                        ((SELECT COUNT(*) FROM tbl_test t WHERE t.lesson_id = l.lesson_id AND t.activity_type_id = 1) = 0)
                        OR EXISTS (
                            SELECT 1
                            FROM tbl_grades g
                            JOIN tbl_test t2
                              ON t2.test_id = g.test_id
                             AND t2.activity_type_id = 1
                            WHERE g.trainee_id = ?
                              AND t2.lesson_id = l.lesson_id
                        )
                    )
                    AND (
                        ((SELECT COUNT(*) FROM tbl_task_sheets ts WHERE ts.lesson_id = l.lesson_id) = 0)
                        OR (
                            (SELECT COUNT(DISTINCT ts2.task_sheet_id) FROM tbl_task_sheets ts2 WHERE ts2.lesson_id = l.lesson_id)
                            <=
                            (SELECT COUNT(DISTINCT s.task_sheet_id)
                             FROM tbl_task_sheet_submissions s
                             JOIN tbl_task_sheets ts3
                               ON ts3.task_sheet_id = s.task_sheet_id
                              AND ts3.lesson_id = l.lesson_id
                             WHERE s.trainee_id = ?
                               AND s.status IN ($completedTaskStatusList))
                        )
                    )
                    THEN 1 ELSE 0
                END
            ) AS completed_lessons
        FROM tbl_lessons l
        WHERE l.module_id = ?
    ");
    $stmt->execute([$traineeId, $traineeId, $moduleId]);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['total_lessons' => 0, 'completed_lessons' => 0];

    $totalLessons = (int)($summary['total_lessons'] ?? 0);
    $completedLessons = (int)($summary['completed_lessons'] ?? 0);
    $status = 'not_started';
    $allOutcomesCompleted = 0;

    if ($totalLessons > 0 && $completedLessons >= $totalLessons) {
        $status = 'completed';
        $allOutcomesCompleted = 1;
    } elseif ($completedLessons > 0) {
        $status = 'in_progress';
    }

    $columns = ['trainee_id', 'module_id', 'status'];
    $values = [$traineeId, $moduleId, $status];
    $updates = ['status = VALUES(status)'];

    if (td_column_exists($conn, 'tbl_module_progress', 'all_outcomes_completed')) {
        $columns[] = 'all_outcomes_completed';
        $values[] = $allOutcomesCompleted;
        $updates[] = 'all_outcomes_completed = VALUES(all_outcomes_completed)';
    }

    if (td_column_exists($conn, 'tbl_module_progress', 'started_date')) {
        $columns[] = 'started_date';
        $values[] = $completedLessons > 0 ? date('Y-m-d H:i:s') : null;
        $updates[] = "started_date = CASE WHEN VALUES(status) = 'not_started' THEN started_date ELSE COALESCE(started_date, VALUES(started_date)) END";
    }

    if (td_column_exists($conn, 'tbl_module_progress', 'completed_date')) {
        $columns[] = 'completed_date';
        $values[] = $status === 'completed' ? date('Y-m-d H:i:s') : null;
        $updates[] = "completed_date = CASE WHEN VALUES(status) = 'completed' THEN VALUES(completed_date) ELSE NULL END";
    }

    if (td_column_exists($conn, 'tbl_module_progress', 'updated_at')) {
        $updates[] = 'updated_at = NOW()';
    }

    $placeholders = implode(', ', array_fill(0, count($columns), '?'));
    $sql = sprintf(
        'INSERT INTO tbl_module_progress (%s) VALUES (%s) ON DUPLICATE KEY UPDATE %s',
        implode(', ', $columns),
        $placeholders,
        implode(', ', $updates)
    );

    $stmt = $conn->prepare($sql);
    $stmt->execute($values);
}

function approveTaskSheetSubmission(PDO $conn): void {
    $payload = json_decode(file_get_contents('php://input'), true) ?: [];

    $traineeId = (int)($payload['trainee_id'] ?? 0);
    $lessonId = (int)($payload['lesson_id'] ?? 0);
    $taskSheetId = (int)($payload['task_sheet_id'] ?? 0);
    $trainerUserId = (int)($payload['trainer_user_id'] ?? 0);

    if ($traineeId <= 0 || $lessonId <= 0 || $taskSheetId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Trainee, lesson, and task sheet are required.']);
        return;
    }

    try {
        $conn->beginTransaction();

        $stmt = $conn->prepare("
            SELECT ts.task_sheet_id, ts.lesson_id, l.module_id
            FROM tbl_task_sheets ts
            JOIN tbl_lessons l ON l.lesson_id = ts.lesson_id
            WHERE ts.task_sheet_id = ? AND ts.lesson_id = ?
            LIMIT 1
        ");
        $stmt->execute([$taskSheetId, $lessonId]);
        $taskSheet = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$taskSheet) {
            throw new Exception('Task sheet not found for this lesson.');
        }

        $graderId = td_resolve_submission_grader_id($conn, $trainerUserId);
        $gradedByExists = td_column_exists($conn, 'tbl_task_sheet_submissions', 'graded_by');
        $gradeDateExists = td_column_exists($conn, 'tbl_task_sheet_submissions', 'grade_date');

        $reviewedStatus = td_pick_reviewed_task_status($conn);
        $updateParts = ["status = " . $conn->quote($reviewedStatus)];
        $updateParams = [];
        if ($gradedByExists && $graderId > 0) {
            $updateParts[] = 'graded_by = ?';
            $updateParams[] = $graderId;
        }
        if ($gradeDateExists) {
            $updateParts[] = 'grade_date = NOW()';
        }

        $updateParams[] = $traineeId;
        $updateParams[] = $lessonId;
        $updateParams[] = $taskSheetId;

        $updateSql = "
            UPDATE tbl_task_sheet_submissions
            SET " . implode(', ', $updateParts) . "
            WHERE trainee_id = ? AND lesson_id = ? AND task_sheet_id = ?
        ";
        $stmt = $conn->prepare($updateSql);
        $stmt->execute($updateParams);

        if ($stmt->rowCount() === 0) {
            throw new Exception('No submitted task sheet was found to approve.');
        }

        $quizRequiredStmt = $conn->prepare("SELECT COUNT(*) FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1");
        $quizRequiredStmt->execute([$lessonId]);
        $quizRequired = (int)$quizRequiredStmt->fetchColumn() > 0;

        $quizCompleted = true;
        if ($quizRequired) {
            $quizCompletedStmt = $conn->prepare("
                SELECT 1
                FROM tbl_grades g
                JOIN tbl_test t ON t.test_id = g.test_id AND t.activity_type_id = 1
                WHERE g.trainee_id = ? AND t.lesson_id = ?
                LIMIT 1
            ");
            $quizCompletedStmt->execute([$traineeId, $lessonId]);
            $quizCompleted = (bool)$quizCompletedStmt->fetchColumn();
        }

        $taskRequiredStmt = $conn->prepare("SELECT COUNT(*) FROM tbl_task_sheets WHERE lesson_id = ?");
        $taskRequiredStmt->execute([$lessonId]);
        $taskRequiredCount = (int)$taskRequiredStmt->fetchColumn();

        $approvedTaskCount = 0;
        if ($taskRequiredCount > 0) {
            $approvedTaskStmt = $conn->prepare("
                SELECT COUNT(DISTINCT s.task_sheet_id)
                FROM tbl_task_sheet_submissions s
                JOIN tbl_task_sheets ts ON ts.task_sheet_id = s.task_sheet_id
                WHERE s.trainee_id = ? AND ts.lesson_id = ? AND s.status IN ('approved', 'recorded')
            ");
            $approvedTaskStmt->execute([$traineeId, $lessonId]);
            $approvedTaskCount = (int)$approvedTaskStmt->fetchColumn();
        }

        $taskCompleted = $taskRequiredCount === 0 || $approvedTaskCount >= $taskRequiredCount;

        td_upsert_learning_outcome_progress($conn, $traineeId, $lessonId, $quizCompleted, $taskCompleted);
        td_sync_module_progress($conn, $traineeId, (int)$taskSheet['module_id']);

        $conn->commit();
        echo json_encode([
            'success' => true,
            'message' => 'Task sheet marked as done successfully.',
            'data' => [
                'quiz_completed' => $quizCompleted,
                'task_completed' => $taskCompleted
            ]
        ]);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

class TraineeDetails {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
        ta_ensure_schema($this->conn);
    }

    public function handleRequest() {
        $traineeId = $_GET['trainee_id'] ?? null;
        $action = $_GET['action'] ?? '';

        if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'approve-task-sheet') {
            approveTaskSheetSubmission($this->conn);
            return;
        }

        if (!$traineeId) {
            echo json_encode(['success' => false, 'message' => 'Trainee ID required']);
            return;
        }

        try {
            // 1. Personal Info & Enrollment
            $queryInfo = "SELECT
                            t.trainee_id, t.user_id, t.trainee_school_id, t.first_name, t.middle_name, t.last_name, t.extension_name, t.sex, t.email, t.phone_number, t.facebook_account, t.status as trainee_status, t.photo_file, t.valid_id_file, t.birth_cert_file,
                            dtl.civil_status, dtl.birthdate, dtl.age, dtl.birthplace_city, dtl.birthplace_province, dtl.nationality, dtl.house_no_street, dtl.barangay, dtl.city_municipality, dtl.province, dtl.region,
                            ftr.educational_attainment, ftr.employment_status, ftr.employment_type, ftr.learner_classification, ftr.is_pwd, ftr.disability_type, ftr.disability_cause, ftr.privacy_consent, ftr.digital_signature,
                            e.enrollment_date, DATE_FORMAT(e.enrollment_date, '%Y-%m-%d %H:%i:%s') as formatted_enrollment_date,
                            c.qualification_name as course_name,
                            c.qualification_id, 
                            b.batch_name, 
                            e.status as enrollment_status, 
                            e.scholarship_type
                         FROM tbl_trainee_hdr t
                         LEFT JOIN tbl_trainee_dtl dtl ON t.trainee_id = dtl.trainee_id
                         LEFT JOIN tbl_trainee_ftr ftr ON t.trainee_id = ftr.trainee_id
                         LEFT JOIN tbl_enrollment e ON e.enrollment_id = (
                             SELECT e2.enrollment_id
                             FROM tbl_enrollment e2
                             WHERE e2.trainee_id = t.trainee_id
                             ORDER BY
                                 CASE
                                     WHEN e2.status = 'approved' AND COALESCE(e2.is_archived, 0) = 0 THEN 0
                                     WHEN e2.status IN ('qualified', 'reserved', 'pending') AND COALESCE(e2.is_archived, 0) = 0 THEN 1
                                     WHEN e2.status = 'completed' AND COALESCE(e2.is_archived, 0) = 0 THEN 2
                                     ELSE 3
                                 END,
                                 COALESCE(e2.enrollment_date, '1970-01-01 00:00:00') DESC,
                                 e2.enrollment_id DESC
                             LIMIT 1
                         )
                         LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                         LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                         LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                         WHERE t.trainee_id = ?";
            $stmtInfo = $this->conn->prepare($queryInfo);
            $stmtInfo->execute([$traineeId]);
            $profile = $stmtInfo->fetch(PDO::FETCH_ASSOC);
            $qualificationId = $profile['qualification_id'] ?? null;

            // 2. Training Progress
            $training_progress = [];
            if ($qualificationId) {
                $accessibleModuleIds = ta_fetch_trainee_accessible_module_ids($this->conn, (int)$traineeId, (int)$qualificationId);
                if (empty($accessibleModuleIds)) {
                    $accessibleModuleIds = [-1];
                }

                $modulePlaceholders = implode(',', array_fill(0, count($accessibleModuleIds), '?'));
                $moduleOrderSelect = ta_column_exists($this->conn, 'tbl_module', 'module_order')
                    ? 'COALESCE(m.module_order, 0) AS module_order,'
                    : '0 AS module_order,';
                $lessonOrderSelect = ta_column_exists($this->conn, 'tbl_lessons', 'lesson_order')
                    ? 'COALESCE(l.lesson_order, 0) AS lesson_order'
                    : '0 AS lesson_order';

                // Get only the modules the trainee can actually access for this qualification.
                $moduleQuery = "SELECT
                                    m.module_id,
                                    m.module_title,
                                    m.competency_type,
                                    {$moduleOrderSelect}
                                    l.lesson_id,
                                    l.lesson_title,
                                    {$lessonOrderSelect}
                                FROM tbl_module m
                                LEFT JOIN tbl_lessons l ON m.module_id = l.module_id
                                WHERE m.module_id IN ($modulePlaceholders)
                                ORDER BY
                                    FIELD(COALESCE(m.competency_type, ''), 'core', 'common', 'basic'),
                                    module_order,
                                    m.module_title,
                                    lesson_order,
                                    l.lesson_id";
                $stmtModules = $this->conn->prepare($moduleQuery);
                $stmtModules->execute($accessibleModuleIds);
                $lessons_by_module = $stmtModules->fetchAll(PDO::FETCH_ASSOC);

                $lesson_ids = array_values(array_unique(array_filter(array_map('intval', array_column($lessons_by_module, 'lesson_id')))));

                $quiz_scores = [];
                $task_sheets_by_lesson = [];

                if (!empty($lesson_ids)) {
                    $in_clause = implode(',', array_fill(0, count($lesson_ids), '?'));

                    // Keep the latest recorded quiz result per lesson.
                    $quizQuery = "SELECT
                                         l.lesson_id,
                                         g.grade_id,
                                         g.score,
                                         COALESCE(NULLIF(t.max_score, 0), qc.question_count, 0) AS max_score,
                                         g.date_recorded
                                  FROM tbl_grades g
                                  JOIN tbl_test t ON g.test_id = t.test_id
                                  JOIN tbl_lessons l ON t.lesson_id = l.lesson_id
                                  LEFT JOIN (
                                      SELECT test_id, COUNT(*) AS question_count
                                      FROM tbl_quiz_questions
                                      GROUP BY test_id
                                  ) qc ON qc.test_id = t.test_id
                                  WHERE g.trainee_id = ? AND t.activity_type_id = 1 AND l.lesson_id IN ($in_clause)
                                  ORDER BY l.lesson_id, g.grade_id DESC";
                    $stmtQuiz = $this->conn->prepare($quizQuery);
                    $params = array_merge([$traineeId], $lesson_ids);
                    $stmtQuiz->execute($params);
                    while ($row = $stmtQuiz->fetch(PDO::FETCH_ASSOC)) {
                        $lessonId = (int)($row['lesson_id'] ?? 0);
                        if ($lessonId <= 0 || isset($quiz_scores[$lessonId])) {
                            continue;
                        }
                        unset($row['grade_id']);
                        $quiz_scores[$lessonId] = $row;
                    }

                    // Keep only the latest submission per task sheet.
                    $taskSheetQuery = "SELECT
                                           ts.lesson_id,
                                           ts.task_sheet_id,
                                           ts.title,
                                           s.submission_id,
                                           s.submitted_content,
                                           s.status,
                                           s.submission_date,
                                           s.grade,
                                           s.remarks
                                       FROM tbl_task_sheet_submissions s
                                       JOIN tbl_task_sheets ts ON s.task_sheet_id = ts.task_sheet_id
                                       WHERE s.trainee_id = ? AND ts.lesson_id IN ($in_clause)
                                       ORDER BY ts.lesson_id, ts.task_sheet_id, s.submission_id DESC";
                    $stmtTasks = $this->conn->prepare($taskSheetQuery);
                    $params = array_merge([$traineeId], $lesson_ids);
                    $stmtTasks->execute($params);
                    $seenTaskSheets = [];
                    while ($row = $stmtTasks->fetch(PDO::FETCH_ASSOC)) {
                        $lessonId = (int)($row['lesson_id'] ?? 0);
                        $taskSheetId = (int)($row['task_sheet_id'] ?? 0);
                        $taskKey = $lessonId . ':' . $taskSheetId;
                        if ($lessonId <= 0 || $taskSheetId <= 0 || isset($seenTaskSheets[$taskKey])) {
                            continue;
                        }
                        $seenTaskSheets[$taskKey] = true;
                        unset($row['submission_id']);
                        $task_sheets_by_lesson[$lessonId][] = $row;
                    }
                }

                // Assemble the data
                $modules = [];
                foreach ($lessons_by_module as $row) {
                    if (!isset($modules[$row['module_id']])) {
                        $modules[$row['module_id']] = [
                            'module_id' => $row['module_id'], 
                            'module_title' => $row['module_title'], 
                            'competency_type' => $row['competency_type'],
                            'lessons' => []
                        ];
                    }
                    $lesson_id = !empty($row['lesson_id']) ? (int)$row['lesson_id'] : 0;
                    if ($lesson_id <= 0) {
                        continue;
                    }
                    $modules[$row['module_id']]['lessons'][] = [
                        'lesson_id' => $lesson_id, 'lesson_title' => $row['lesson_title'],
                        'quiz' => $quiz_scores[$lesson_id] ?? null,
                        'task_sheets' => $task_sheets_by_lesson[$lesson_id] ?? []
                    ];
                }
                $training_progress = array_values($modules);
            }

            // 3. Attendance Summary
            $queryAtt = "SELECT status, COUNT(*) as count FROM tbl_attendance WHERE trainee_id = ? GROUP BY status";
            $stmtAtt = $this->conn->prepare($queryAtt);
            $stmtAtt->execute([$traineeId]);
            $attendance = $stmtAtt->fetchAll(PDO::FETCH_KEY_PAIR);

            echo json_encode([
                'success' => true,
                'data' => [
                    'profile' => $profile,
                    'training_progress' => $training_progress,
                    'attendance_summary' => $attendance
                ]
            ]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TraineeDetails($db);
$api->handleRequest();
?>
