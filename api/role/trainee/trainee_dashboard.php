<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';

class TraineeDashboard {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    private function moduleStatusColumnExists(): bool {
        static $exists = null;
        if ($exists !== null) {
            return $exists;
        }

        try {
            $stmt = $this->conn->prepare("SHOW COLUMNS FROM `tbl_module` LIKE 'module_status'");
            $stmt->execute();
            $exists = (bool)$stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $exists = false;
        }

        return $exists;
    }

    private function publishedModuleFilter(string $alias = 'm'): string {
        return $this->moduleStatusColumnExists()
            ? " AND COALESCE($alias.module_status, 'published') = 'published'"
            : '';
    }

    private function normalizedScoreExpression(
        string $gradeAlias = 'g',
        string $testAlias = 't',
        string $questionCountAlias = 'qc'
    ): string {
        return "CASE
                    WHEN COALESCE(NULLIF($testAlias.max_score, 0), $questionCountAlias.question_count, 0) > 0
                        THEN ($gradeAlias.score / COALESCE(NULLIF($testAlias.max_score, 0), $questionCountAlias.question_count)) * 100
                    ELSE $gradeAlias.score
                END";
    }

    private function getGradeSummary($traineeId, $qualificationId): ?array {
        if (!$qualificationId) {
            return null;
        }

        $normalizedScore = $this->normalizedScoreExpression();
        $gradeQuery = "SELECT
                            ROUND(AVG($normalizedScore), 2) AS total_grade,
                            CASE
                                WHEN COUNT(g.trainee_id) = 0 THEN 'Pending'
                                WHEN AVG($normalizedScore) >= 80 THEN 'Competent'
                                ELSE 'Not Yet Competent'
                            END AS remarks
                       FROM tbl_grades g
                       LEFT JOIN tbl_test t ON g.test_id = t.test_id
                       LEFT JOIN (
                            SELECT test_id, COUNT(*) AS question_count
                            FROM tbl_quiz_questions
                            GROUP BY test_id
                       ) qc ON qc.test_id = t.test_id
                       WHERE g.trainee_id = ? AND g.qualification_id = ?";

        $stmt = $this->conn->prepare($gradeQuery);
        $stmt->execute([$traineeId, $qualificationId]);
        $grade = $stmt->fetch(PDO::FETCH_ASSOC);

        return $grade ?: null;
    }

    private function hasReachedEndDate(?string $endDate): bool {
        $normalized = trim((string)$endDate);
        if ($normalized === '') {
            return false;
        }

        $timestamp = strtotime($normalized . ' 23:59:59');
        if ($timestamp === false) {
            return false;
        }

        return $timestamp <= time();
    }

    private function repairPrematureAutoArchivedEnrollments($traineeId): void {
        try {
            $repairQuery = "UPDATE tbl_enrollment e
                            JOIN tbl_batch b ON b.batch_id = e.batch_id
                            SET e.status = 'approved',
                                e.completion_date = NULL,
                                e.is_archived = 0,
                                e.archive_date = NULL
                            WHERE e.trainee_id = ?
                              AND e.status = 'completed'
                              AND e.is_archived = 1
                              AND e.completion_date IS NOT NULL
                              AND b.end_date IS NOT NULL
                              AND b.end_date > CURDATE()
                              AND b.end_date > e.completion_date
                              AND NOT EXISTS (
                                  SELECT 1
                                  FROM tbl_enrollment e2
                                  WHERE e2.trainee_id = e.trainee_id
                                    AND e2.enrollment_id <> e.enrollment_id
                                    AND COALESCE(e2.is_archived, 0) = 0
                                    AND e2.status = 'approved'
                              )";
            $stmt = $this->conn->prepare($repairQuery);
            $stmt->execute([$traineeId]);
        } catch (Exception $e) {
            error_log('Failed to repair premature archived enrollments in trainee_dashboard.php: ' . $e->getMessage());
        }
    }

    private function canArchiveActiveCourse(?array $activeCourse, ?array $grade): bool {
        if (!$activeCourse || !$grade) {
            return false;
        }

        if (($grade['remarks'] ?? '') !== 'Competent') {
            return false;
        }

        return $this->hasReachedEndDate($activeCourse['end_date'] ?? null);
    }

    private function buildDashboardAssessment(?array $grade, float $progressRate): array {
        $rawGrade = $grade['total_grade'] ?? null;
        $numericGrade = ($rawGrade !== null && $rawGrade !== '')
            ? (float)$rawGrade
            : null;

        if ($numericGrade === null) {
            return [
                'current_grade' => null,
                'current_grade_display' => 'Pending',
                'competency_status' => 'Pending'
            ];
        }

        if ($progressRate < 100) {
            return [
                'current_grade' => round($numericGrade, 2),
                'current_grade_display' => null,
                'competency_status' => 'In Progress'
            ];
        }

        return [
            'current_grade' => round($numericGrade, 2),
            'current_grade_display' => null,
            'competency_status' => $grade['remarks'] ?? 'Pending'
        ];
    }

    public function handleRequest() {
        $traineeId = $_GET['trainee_id'] ?? null;
        if (!$traineeId) {
            echo json_encode(['success' => false, 'message' => 'Trainee ID required']);
            return;
        }

        try {
            $this->repairPrematureAutoArchivedEnrollments($traineeId);

            // 1. Get Active Course/Batch (not archived and still active, or completed but not archived after end date)
            $courseQuery = "SELECT th.trainee_school_id, c.qualification_id AS course_id, c.qualification_name AS course_name, 
                                b.batch_name, b.start_date, b.end_date, 
                                COALESCE(s.schedule, oc.schedule) as schedule, 
                                s.room_id as room_id, 
                                COALESCE(r.room_name, oc.room) as room_name, 
                                e.enrollment_id, e.status as enrollment_status
                            FROM tbl_enrollment e
                            JOIN tbl_batch b ON e.batch_id = b.batch_id
                            LEFT JOIN tbl_schedule s ON b.batch_id = s.batch_id
                            LEFT JOIN tbl_rooms r ON s.room_id = r.room_id
                            JOIN tbl_trainee_hdr th ON e.trainee_id = th.trainee_id
                            JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                            JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                            WHERE e.trainee_id = ?
                              AND (e.is_archived = 0 OR e.is_archived IS NULL)
                              AND (
                                  e.status = 'approved'
                                  OR (e.status = 'completed' AND (b.end_date IS NULL OR b.end_date <= CURDATE()))
                              )
                            ORDER BY
                              CASE WHEN e.status = 'approved' THEN 0 ELSE 1 END,
                              COALESCE(b.end_date, '9999-12-31') DESC,
                              e.enrollment_id DESC
                            LIMIT 1";
            $stmt = $this->conn->prepare($courseQuery);
            $stmt->execute([$traineeId]);
            $activeCourse = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
            // DEBUG OUTPUT
            file_put_contents(__DIR__ . '/debug_active_course.log', print_r($activeCourse, true));

            $qualificationId = $activeCourse ? $activeCourse['course_id'] : null;

            // 2. Get Progress Rate (quiz + task sheet completion)
            $progressRate = $this->calculateProgressRate($traineeId, $qualificationId);

            // 3. Get Average Grade (Current Course)
            $grade = $this->getGradeSummary($traineeId, $qualificationId);
            $assessment = $this->buildDashboardAssessment($grade, $progressRate);
            $canArchive = $this->canArchiveActiveCourse(
                $activeCourse,
                ($assessment['competency_status'] ?? '') === 'Competent' ? $grade : null
            );

            // 4. Get Upcoming Schedule (Mock logic based on batch schedule string)
            // In a real app, this would query a calendar table.
            $schedule = [
                'course' => $activeCourse ? ($activeCourse['course_name'] ?? 'No Active Course') : 'No Active Course',
                'time' => $activeCourse ? ($activeCourse['schedule'] ?? 'N/A') : 'N/A',
                'room' => $activeCourse ? ($activeCourse['room_name'] ?? 'N/A') : 'N/A'
            ];

            // 5. Get Archived Courses
            $archivedQuery = "SELECT c.qualification_id AS course_id, c.qualification_name AS course_name, b.batch_name, 
                                     b.start_date, b.end_date, e.completion_date, e.archive_date, e.enrollment_id
                              FROM tbl_enrollment e
                              JOIN tbl_batch b ON e.batch_id = b.batch_id
                              JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                              JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                              WHERE e.trainee_id = ? AND e.is_archived = 1
                              ORDER BY e.completion_date DESC, e.archive_date DESC";
            $archivedStmt = $this->conn->prepare($archivedQuery);
            $archivedStmt->execute([$traineeId]);
            $archivedCourses = $archivedStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($archivedCourses as &$course) {
                $archivedGrade = $this->getGradeSummary($traineeId, $course['course_id'] ?? null);
                $course['final_score'] = $archivedGrade['total_grade'] ?? null;
            }
            unset($course);

            echo json_encode(['success' => true, 'data' => [
                'active_course' => $activeCourse,
                'progress_rate' => $progressRate,
                'current_grade' => $assessment['current_grade'],
                'current_grade_display' => $assessment['current_grade_display'],
                'competency_status' => $assessment['competency_status'],
                'can_archive' => $canArchive,
                'schedule' => $schedule,
                'archived_courses' => $archivedCourses
            ]]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function calculateProgressRate($traineeId, $qualificationId) {
        if (!$qualificationId) return 0;

        try {
            $lessonQuery = "SELECT 
                                l.lesson_id,
                                IF(t.test_id IS NULL, 0, 1) as has_quiz,
                                (SELECT COUNT(*) FROM tbl_task_sheets ts WHERE ts.lesson_id = l.lesson_id) as task_sheet_count
                            FROM tbl_module m
                            JOIN tbl_lessons l ON m.module_id = l.module_id
                            LEFT JOIN tbl_test t ON l.lesson_id = t.lesson_id AND t.activity_type_id = 1
                            WHERE m.qualification_id = ? AND (l.posting_date IS NULL OR l.posting_date <= NOW())" . $this->publishedModuleFilter('m') . "
                            ORDER BY m.module_id, l.lesson_id";
            $stmt = $this->conn->prepare($lessonQuery);
            $stmt->execute([$qualificationId]);
            $lessons = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($lessons)) return 0;

            $lessonIds = array_column($lessons, 'lesson_id');
            $in = implode(',', array_fill(0, count($lessonIds), '?'));

            // Quiz completions (per lesson)
            $quizStmt = $this->conn->prepare(
                "SELECT DISTINCT tt.lesson_id
                 FROM tbl_grades g
                 JOIN tbl_test tt ON g.test_id = tt.test_id
                 WHERE g.trainee_id = ? AND tt.activity_type_id = 1 AND tt.lesson_id IN ($in)"
            );
            $quizStmt->execute(array_merge([$traineeId], $lessonIds));
            $quizDone = $quizStmt->fetchAll(PDO::FETCH_COLUMN);
            $quizDoneSet = array_flip($quizDone);

            // Task sheet submissions (per lesson)
            $taskStmt = $this->conn->prepare(
                "SELECT lesson_id, COUNT(DISTINCT task_sheet_id) as submitted_count
                 FROM tbl_task_sheet_submissions
                 WHERE trainee_id = ? AND status IN ('approved', 'recorded') AND lesson_id IN ($in)
                 GROUP BY lesson_id"
            );
            $taskStmt->execute(array_merge([$traineeId], $lessonIds));
            $submittedCounts = $taskStmt->fetchAll(PDO::FETCH_KEY_PAIR);

            $totalUnits = 0;
            $completedUnits = 0;

            foreach ($lessons as $lesson) {
                $hasQuiz = (int)$lesson['has_quiz'] === 1;
                $taskCount = (int)$lesson['task_sheet_count'];

                if ($hasQuiz) {
                    $totalUnits++;
                    if (isset($quizDoneSet[$lesson['lesson_id']])) $completedUnits++;
                }

                if ($taskCount > 0) {
                    $totalUnits++;
                    $submitted = (int)($submittedCounts[$lesson['lesson_id']] ?? 0);
                    if ($submitted >= $taskCount) $completedUnits++;
                }
            }

            if ($totalUnits === 0) return 0;
            return round(($completedUnits / $totalUnits) * 100, 1);
        } catch (Exception $e) {
            return 0;
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TraineeDashboard($db);
$api->handleRequest();
?>
