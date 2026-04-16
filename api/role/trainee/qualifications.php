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

$database = new Database();
$conn = $database->getConnection();
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        getTraineeQualifications($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        http_response_code(400);
        break;
}

/**
 * Get all qualifications enrolled by a trainee
 */
function getTraineeQualifications($conn) {
    $traineeId = (int)($_GET['trainee_id'] ?? 0);

    if (!$traineeId) {
        echo json_encode(['success' => false, 'message' => 'Trainee ID is required']);
        http_response_code(400);
        return;
    }

    try {
        // Get qualifications from active enrollments in open batches.
        // Fallback to batch/legacy enrollment qualification IDs when offered_qualification_id is not set.
        $stmt = $conn->prepare("
            SELECT DISTINCT
                q.qualification_id,
                q.qualification_name,
                q.description,
                q.duration,
                b.batch_id,
                b.batch_name
            FROM tbl_enrollment e
            JOIN tbl_batch b ON b.batch_id = e.batch_id
            LEFT JOIN tbl_offered_qualifications oq ON oq.offered_qualification_id = e.offered_qualification_id
            JOIN tbl_qualifications q
                ON q.qualification_id = COALESCE(oq.qualification_id, b.qualification_id)
            WHERE e.trainee_id = ?
              AND e.status IN ('approved', 'enrolled')
              AND b.status = 'open'
            ORDER BY q.qualification_name
        ");
        $stmt->execute([$traineeId]);
        $qualifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $qualifications]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}
?>
