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
require_once '../../utils/AuthGuard.php';

$database = new Database();
$conn = $database->getConnection();
ta_ensure_schema($conn);
AuthGuard::requireRole($conn, ['trainer', 'admin']);

$action = isset($_GET['action']) ? $_GET['action'] : 'list';
$trainerId = isset($_GET['trainer_id']) ? (int)$_GET['trainer_id'] : 0;
$traineeId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
AuthGuard::requireTrainerAccess($conn, $trainerId);

switch ($action) {
    case 'list':
        if ($trainerId <= 0) {
            echo json_encode(['success' => false, 'message' => 'Trainer ID is required.']);
            exit;
        }
        listTrainees($conn, $trainerId);
        break;
    case 'get-details':
        if ($traineeId <= 0) {
            echo json_encode(['success' => false, 'message' => 'Trainee ID is required.']);
            exit;
        }
        getTraineeDetails($conn, $traineeId);
        break;
    case 'issue-certificate':
        issueCertificate($conn, $trainerId);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
        break;
}

function listTrainees(PDO $conn, int $trainerId) {
    $batchIds = ta_fetch_trainer_assigned_batch_ids($conn, $trainerId);
    if (empty($batchIds)) {
        echo json_encode(['success' => true, 'data' => []]);
        return;
    }

    $placeholders = implode(',', array_fill(0, count($batchIds), '?'));
    $query = "
        SELECT DISTINCT
            t.trainee_id,
            t.trainee_school_id,
            t.first_name,
            t.last_name,
            t.email,
            COALESCE(t.profile_image, '') AS profile_image,
            b.batch_id, b.batch_name,
            c.qualification_id, c.qualification_name AS course_name,
            e.status, cert.certificate_id, cert.issue_date, cert.certificate_status
        FROM tbl_trainee_hdr t
        JOIN tbl_enrollment e ON t.trainee_id = e.trainee_id
        JOIN tbl_batch b ON e.batch_id = b.batch_id
        JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
        JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
        LEFT JOIN tbl_certificate cert ON cert.trainee_id = t.trainee_id AND cert.qualification_id = c.qualification_id
        WHERE e.batch_id IN ($placeholders)
          AND e.status = 'approved'
        ORDER BY t.last_name, t.first_name
    ";

    try {
        $stmt = $conn->prepare($query);
        $stmt->execute($batchIds);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC) ?: []]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function issueCertificate(PDO $conn, int $trainerId) {
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $traineeId = (int)($data['trainee_id'] ?? 0);
    $batchId = (int)($data['batch_id'] ?? 0);
    $qualificationId = (int)($data['qualification_id'] ?? 0);
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$trainerId || !$traineeId || !$batchId || !$qualificationId) {
        http_response_code(422); echo json_encode(['success' => false, 'message' => 'Trainer, trainee, batch, and qualification are required.']); return;
    }
    try {
        $assigned = array_map('intval', ta_fetch_trainer_assigned_batch_ids($conn, $trainerId));
        if (!in_array($batchId, $assigned, true)) { http_response_code(403); echo json_encode(['success' => false, 'message' => 'You can issue certificates only for your assigned batches.']); return; }
        $check = $conn->prepare("SELECT 1 FROM tbl_enrollment e JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id WHERE e.trainee_id = ? AND e.batch_id = ? AND oq.qualification_id = ? AND e.status = 'approved' LIMIT 1");
        $check->execute([$traineeId, $batchId, $qualificationId]);
        if (!$check->fetchColumn()) { http_response_code(403); echo json_encode(['success' => false, 'message' => 'The trainee is not in this assigned batch and qualification.']); return; }
        if (!hasCompletedAllCoreCompetencies($conn, $traineeId, $qualificationId)) {
            http_response_code(403); echo json_encode(['success' => false, 'message' => 'Certificates can be issued only after the trainee completes all core competencies.']); return;
        }
        $exists = $conn->prepare('SELECT certificate_id FROM tbl_certificate WHERE trainee_id = ? AND qualification_id = ? LIMIT 1');
        $exists->execute([$traineeId, $qualificationId]);
        if ($exists->fetchColumn()) { echo json_encode(['success' => false, 'message' => 'Certificate already issued for this qualification.']); return; }
        $stmt = $conn->prepare("INSERT INTO tbl_certificate (trainee_id, qualification_id, issue_date, certificate_status) VALUES (?, ?, CURDATE(), 'valid')");
        $stmt->execute([$traineeId, $qualificationId]);
        echo json_encode(['success' => true, 'message' => 'Certificate issued successfully.']);
    } catch (Exception $e) { error_log('Certificate issue error: ' . $e->getMessage()); http_response_code(500); echo json_encode(['success' => false, 'message' => 'Unable to issue certificate.']); }
}

function hasCompletedAllCoreCompetencies(PDO $conn, int $traineeId, int $qualificationId): bool {
    $lessons = $conn->prepare("SELECT l.lesson_id
        FROM tbl_lessons l
        JOIN tbl_module m ON l.module_id = m.module_id
        WHERE m.qualification_id = ? AND LOWER(COALESCE(m.competency_type, '')) = 'core'");
    $lessons->execute([$qualificationId]);
    $lessonIds = array_map('intval', $lessons->fetchAll(PDO::FETCH_COLUMN) ?: []);
    if (empty($lessonIds)) return false;

    foreach ($lessonIds as $lessonId) {
        if (!isCoreOutcomeCompleted($conn, $traineeId, $lessonId)) return false;
    }
    return true;
}

function isCoreOutcomeCompleted(PDO $conn, int $traineeId, int $lessonId): bool {
    $hasRequirements = false;
    $quiz = $conn->prepare('SELECT test_id FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1 LIMIT 1');
    $quiz->execute([$lessonId]);
    $testId = $quiz->fetchColumn();
    if ($testId) {
        $hasRequirements = true;
        $grade = $conn->prepare('SELECT 1 FROM tbl_grades WHERE trainee_id = ? AND test_id = ? LIMIT 1');
        $grade->execute([$traineeId, $testId]);
        if (!$grade->fetchColumn()) return false;
    }

    $tasks = $conn->prepare('SELECT task_sheet_id FROM tbl_task_sheets WHERE lesson_id = ?');
    $tasks->execute([$lessonId]);
    $taskSheetIds = $tasks->fetchAll(PDO::FETCH_COLUMN) ?: [];
    if (!empty($taskSheetIds)) {
        $hasRequirements = true;
        $placeholders = implode(',', array_fill(0, count($taskSheetIds), '?'));
        $submissions = $conn->prepare("SELECT COUNT(DISTINCT task_sheet_id)
            FROM tbl_task_sheet_submissions
            WHERE trainee_id = ? AND task_sheet_id IN ($placeholders)
                AND status IN ('approved', 'recorded')");
        $submissions->execute(array_merge([$traineeId], $taskSheetIds));
        if ((int)$submissions->fetchColumn() < count($taskSheetIds)) return false;
    }

    return $hasRequirements;
}

function getTraineeDetails(PDO $conn, int $traineeId) {
    $query = "SELECT
                t_hdr.*,
                t_dtl.*,
                t_ftr.*,
                b.batch_name,
                c.qualification_name AS course_name,
                e.status AS enrollment_status,
                e.scholarship_type
            FROM tbl_trainee_hdr AS t_hdr
            LEFT JOIN tbl_trainee_dtl AS t_dtl ON t_hdr.trainee_id = t_dtl.trainee_id
            LEFT JOIN tbl_trainee_ftr AS t_ftr ON t_hdr.trainee_id = t_ftr.trainee_id
            LEFT JOIN tbl_enrollment AS e ON t_hdr.trainee_id = e.trainee_id
            LEFT JOIN tbl_batch AS b ON e.batch_id = b.batch_id
            LEFT JOIN tbl_offered_qualifications AS oc ON e.offered_qualification_id = oc.offered_qualification_id
            LEFT JOIN tbl_qualifications AS c ON oc.qualification_id = c.qualification_id
            WHERE t_hdr.trainee_id = ?
            LIMIT 1";
    try {
        $stmt = $conn->prepare($query);
        $stmt->execute([$traineeId]);
        $trainee = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($trainee) {
            $trainee['attendance'] = ['present' => 15, 'absent' => 1, 'late' => 2];
            $trainee['competencies'] = [
                ['module' => 'Core 1', 'lesson' => 'Install electrical metallic tubing', 'score' => 95, 'remarks' => 'Competent'],
                ['module' => 'Core 2', 'lesson' => 'Install wiring devices', 'score' => 88, 'remarks' => 'Competent']
            ];
            echo json_encode(['success' => true, 'data' => $trainee]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Trainee not found.']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
