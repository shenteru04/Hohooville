<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get-batch-data':
            getBatchData($conn);
            break;
        case 'list':
            listCharts($conn);
            break;
        case 'get':
            getChart($conn);
            break;
        case 'save':
            saveChart($conn);
            break;
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function getBatchData($conn) {
    $batchId = $_GET['batch_id'] ?? null;
    if (!$batchId) throw new Exception('Batch ID is required');

    // 1. Get Trainees
    $stmt = $conn->prepare("
        SELECT t.trainee_id, CONCAT(t.first_name, ' ', t.last_name) as full_name
        FROM tbl_enrollment e
        JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
        WHERE e.batch_id = ? AND e.status = 'approved'
        ORDER BY t.last_name, t.first_name
    ");
    $stmt->execute([$batchId]);
    $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Get Qualification ID
    // Try getting it from the batch table directly
    $stmtQ = $conn->prepare("SELECT qualification_id FROM tbl_batch WHERE batch_id = ?");
    $stmtQ->execute([$batchId]);
    $qualificationId = $stmtQ->fetchColumn();

    if (!$qualificationId) {
        // Fallback: try getting from enrollment
        $stmtQ = $conn->prepare("
            SELECT oc.qualification_id 
            FROM tbl_enrollment e 
            JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id 
            WHERE e.batch_id = ? LIMIT 1
        ");
        $stmtQ->execute([$batchId]);
        $qualificationId = $stmtQ->fetchColumn();
    }

    if (!$qualificationId) {
        echo json_encode(['success' => true, 'data' => ['trainees' => [], 'outcomes' => [], 'completion_status' => [], 'all_outcomes_completed' => []]]);
        return;
    }

    // 3. Get Core Outcomes (Lessons)
    $stmtOutcomes = $conn->prepare("
        SELECT l.lesson_id as outcome_id, l.lesson_title as outcome_title, m.module_title
        FROM tbl_lessons l
        JOIN tbl_module m ON l.module_id = m.module_id
        WHERE m.qualification_id = ? AND m.competency_type = 'core'
        ORDER BY m.module_id, l.lesson_id
    ");
    $stmtOutcomes->execute([$qualificationId]);
    $outcomes = $stmtOutcomes->fetchAll(PDO::FETCH_ASSOC);

    // 4. Check Completion
    $completionStatus = [];
    $completedCounts = []; // outcome_id => count

    foreach ($trainees as $trainee) {
        foreach ($outcomes as $outcome) {
            if (isOutcomeCompleted($conn, $trainee['trainee_id'], $outcome['outcome_id'])) {
                $completionStatus[] = [
                    'trainee_id' => $trainee['trainee_id'],
                    'outcome_id' => $outcome['outcome_id'],
                    'mark' => '✓'
                ];
                if (!isset($completedCounts[$outcome['outcome_id']])) $completedCounts[$outcome['outcome_id']] = 0;
                $completedCounts[$outcome['outcome_id']]++;
            }
        }
    }

    // 5. All Completed
    $allOutcomesCompleted = [];
    $totalTrainees = count($trainees);
    if ($totalTrainees > 0) {
        foreach ($completedCounts as $oid => $count) {
            if ($count == $totalTrainees) $allOutcomesCompleted[] = $oid;
        }
    }

    echo json_encode([
        'success' => true, 
        'data' => [
            'trainees' => $trainees,
            'outcomes' => $outcomes,
            'completion_status' => $completionStatus,
            'all_outcomes_completed' => $allOutcomesCompleted
        ]
    ]);
}

function isOutcomeCompleted($conn, $traineeId, $lessonId) {
    $hasRequirements = false;

    // Check Quiz
    $stmtQuiz = $conn->prepare("SELECT test_id FROM tbl_test WHERE lesson_id = ? AND activity_type_id = 1");
    $stmtQuiz->execute([$lessonId]);
    $testId = $stmtQuiz->fetchColumn();

    if ($testId) {
        $hasRequirements = true;
        $stmtGrade = $conn->prepare("SELECT grade_id FROM tbl_grades WHERE trainee_id = ? AND test_id = ?");
        $stmtGrade->execute([$traineeId, $testId]);
        if (!$stmtGrade->fetch()) return false;
    }

    // Check Task Sheets
    $stmtTasks = $conn->prepare("SELECT task_sheet_id FROM tbl_task_sheets WHERE lesson_id = ?");
    $stmtTasks->execute([$lessonId]);
    $taskSheets = $stmtTasks->fetchAll(PDO::FETCH_COLUMN);

    if (!empty($taskSheets)) {
        $hasRequirements = true;
        $placeholders = implode(',', array_fill(0, count($taskSheets), '?'));
        $stmtSubs = $conn->prepare("
            SELECT COUNT(DISTINCT task_sheet_id) 
            FROM tbl_task_sheet_submissions 
            WHERE trainee_id = ? 
            AND task_sheet_id IN ($placeholders) 
            AND status IN ('submitted', 'approved')
        ");
        $stmtSubs->execute(array_merge([$traineeId], $taskSheets));
        $count = $stmtSubs->fetchColumn();
        
        if ($count < count($taskSheets)) return false;
    }

    return $hasRequirements;
}

// Placeholder functions for list, get, save to avoid errors if called
function listCharts($conn) {
    $trainerId = $_GET['trainer_id'] ?? null;
    if (!$trainerId) throw new Exception('Trainer ID required');
    try {
        $stmt = $conn->prepare("SELECT chart_id, title, updated_at FROM tbl_trainer_charts WHERE trainer_id = ? ORDER BY updated_at DESC");
        $stmt->execute([$trainerId]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (Exception $e) { echo json_encode(['success' => true, 'data' => []]); }
}

function getChart($conn) {
    $id = $_GET['id'] ?? null;
    if (!$id) throw new Exception('Chart ID required');
    $stmt = $conn->prepare("SELECT * FROM tbl_trainer_charts WHERE chart_id = ?");
    $stmt->execute([$id]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($data) echo json_encode(['success' => true, 'data' => $data]);
    else throw new Exception('Chart not found');
}

function saveChart($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $trainerId = $data['trainer_id'] ?? null;
    $title = $data['title'] ?? null;
    $content = $data['content'] ?? null;
    $chartId = $data['chart_id'] ?? null;
    if (!$trainerId || !$title) throw new Exception('Trainer ID and Title required');
    
    $conn->exec("CREATE TABLE IF NOT EXISTS tbl_trainer_charts (
        chart_id INT AUTO_INCREMENT PRIMARY KEY,
        trainer_id INT,
        title VARCHAR(255),
        chart_content LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    if ($chartId) {
        $stmt = $conn->prepare("UPDATE tbl_trainer_charts SET title = ?, chart_content = ? WHERE chart_id = ? AND trainer_id = ?");
        $stmt->execute([$title, $content, $chartId, $trainerId]);
    } else {
        $stmt = $conn->prepare("INSERT INTO tbl_trainer_charts (trainer_id, title, chart_content) VALUES (?, ?, ?)");
        $stmt->execute([$trainerId, $title, $content]);
    }
    echo json_encode(['success' => true, 'message' => 'Chart saved']);
}
?>