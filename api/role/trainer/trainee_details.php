<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';

class TraineeDetails {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $traineeId = $_GET['trainee_id'] ?? null;

        if (!$traineeId) {
            echo json_encode(['success' => false, 'message' => 'Trainee ID required']);
            return;
        }

        try {
            // 1. Personal Info & Enrollment
            $queryInfo = "SELECT
                            t.trainee_id, t.user_id, t.trainee_school_id, t.first_name, t.middle_name, t.last_name, t.extension_name, t.sex, t.email, t.phone_number, t.facebook_account, t.status as trainee_status, t.photo_file, t.valid_id_file, t.birth_cert_file,
                            dtl.civil_status, dtl.birthdate, dtl.age, dtl.birthplace_city, dtl.birthplace_province, dtl.nationality, dtl.house_no_street, dtl.barangay, dtl.city_municipality, dtl.province,
                            ftr.educational_attainment, ftr.employment_status,
                            c.qualification_name as course_name,
                            c.qualification_id, 
                            b.batch_name, 
                            e.status as enrollment_status, 
                            e.scholarship_type
                         FROM tbl_trainee_hdr t
                         LEFT JOIN tbl_trainee_dtl dtl ON t.trainee_id = dtl.trainee_id
                         LEFT JOIN tbl_trainee_ftr ftr ON t.trainee_id = ftr.trainee_id
                         LEFT JOIN tbl_enrollment e ON t.trainee_id = e.trainee_id
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
                // Get modules and lessons
                $moduleQuery = "SELECT m.module_id, m.module_title, m.competency_type, l.lesson_id, l.lesson_title
                                FROM tbl_module m
                                JOIN tbl_lessons l ON m.module_id = l.module_id
                                WHERE m.qualification_id = ?
                                ORDER BY m.module_id, l.lesson_id";
                $stmtModules = $this->conn->prepare($moduleQuery);
                $stmtModules->execute([$qualificationId]);
                $lessons_by_module = $stmtModules->fetchAll(PDO::FETCH_ASSOC);

                $lesson_ids = array_column($lessons_by_module, 'lesson_id');

                $quiz_scores = [];
                $task_sheets_by_lesson = [];

                if (!empty($lesson_ids)) {
                    $in_clause = implode(',', array_fill(0, count($lesson_ids), '?'));

                    // Get all quiz scores for the trainee in this qualification
                    $quizQuery = "SELECT l.lesson_id, g.score, t.max_score, g.date_recorded
                                  FROM tbl_grades g
                                  JOIN tbl_test t ON g.test_id = t.test_id
                                  JOIN tbl_lessons l ON t.lesson_id = l.lesson_id
                                  WHERE g.trainee_id = ? AND g.qualification_id = ? AND t.activity_type_id = 1 AND l.lesson_id IN ($in_clause)";
                    $stmtQuiz = $this->conn->prepare($quizQuery);
                    $params = array_merge([$traineeId, $qualificationId], $lesson_ids);
                    $stmtQuiz->execute($params);
                    $quiz_scores = $stmtQuiz->fetchAll(PDO::FETCH_GROUP | PDO::FETCH_UNIQUE | PDO::FETCH_ASSOC);

                    // Get all task sheet submissions
                    $taskSheetQuery = "SELECT ts.lesson_id, ts.task_sheet_id, ts.title, s.submitted_content, s.status, s.submission_date, s.grade, s.remarks
                                       FROM tbl_task_sheet_submissions s
                                       JOIN tbl_task_sheets ts ON s.task_sheet_id = ts.task_sheet_id
                                       WHERE s.trainee_id = ? AND ts.lesson_id IN ($in_clause)
                                       ORDER BY ts.lesson_id, ts.task_sheet_id";
                    $stmtTasks = $this->conn->prepare($taskSheetQuery);
                    $params = array_merge([$traineeId], $lesson_ids);
                    $stmtTasks->execute($params);
                    while ($row = $stmtTasks->fetch(PDO::FETCH_ASSOC)) {
                        $task_sheets_by_lesson[$row['lesson_id']][] = $row;
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
                    $lesson_id = $row['lesson_id'];
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