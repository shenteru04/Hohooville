<?php
// Prevent HTML error output
ini_set('display_errors', 0);
error_reporting(E_ALL);
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("[$errno] $errstr in $errfile:$errline");
    return true;
});

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';
require_once '../../utils/PermissionChecker.php';
require_once '../../utils/trainer_assignment_helper.php';

$database = new Database();
$conn = $database->getConnection();
ta_ensure_schema($conn);

$action = isset($_GET['action']) ? $_GET['action'] : '';

try {
    // Get JWT token from headers
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    // If no auth header, allow access for now (graceful degradation)
    if (!$authHeader) {
        $permissionChecker = null;
    } else {
        // Extract token
        $token = str_replace('Bearer ', '', $authHeader);
        
        // Decode JWT to get user_id and role_id
        $tokenParts = explode('.', $token);
        if (count($tokenParts) !== 3) {
            $permissionChecker = null;
        } else {
            $payload = json_decode(base64url_decode($tokenParts[1]), true);
            $userId = $payload['user_id'] ?? null;
            $roleId = $payload['role_id'] ?? null;

            if (!$userId || !$roleId) {
                $permissionChecker = null;
            } else {
                // Initialize permission checker
                $permissionChecker = new PermissionChecker($conn, $userId, $roleId);
            }
        }
    }

    // Check permissions based on action (only if permission checker is available)
    switch ($action) {
        case 'list':
            if ($permissionChecker) $permissionChecker->requirePermission('batches.view');
            listBatches($conn);
            break;
        case 'get-form-data':
            if ($permissionChecker) $permissionChecker->requirePermission('batches.view');
            getFormData($conn);
            break;
        case 'add':
            if ($permissionChecker) $permissionChecker->requirePermission('batches.create');
            addBatch($conn);
            break;
        case 'update':
            if ($permissionChecker) $permissionChecker->requirePermission('batches.update');
            updateBatch($conn);
            break;
        case 'delete':
            if ($permissionChecker) $permissionChecker->requirePermission('batches.delete');
            deleteBatch($conn);
            break;
        case 'get-trainees':
            if ($permissionChecker) $permissionChecker->requirePermission('trainees.view');
            getBatchTrainees($conn);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

// Helper function for base64url decode
function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

function listBatches($conn) {
    try {
        $query = "SELECT
                    b.batch_id,
                    b.batch_name,
                    b.qualification_id,
                    b.start_date,
                    b.end_date,
                    b.status,
                    b.scholarship_type_id,
                    COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode,
                    COALESCE(st.scholarship_name, 'No Scholarship') as scholarship_type,
                    b.trainer_id,
                    b.max_trainees,
                    COALESCE(c.training_cost, 0) AS training_cost,
                    COALESCE(c.training_cost, 0) * COALESCE(b.max_trainees, 0) AS projected_total,
                    c.qualification_name,
                    CONCAT(t.first_name, ' ', t.last_name) AS trainer_name,
                    (SELECT COUNT(*) FROM tbl_enrollment e WHERE e.batch_id = b.batch_id AND e.status = 'approved') as enrolled_count
                FROM
                    tbl_batch AS b
                LEFT JOIN
                    tbl_qualifications AS c ON b.qualification_id = c.qualification_id
                LEFT JOIN
                    tbl_trainer AS t ON b.trainer_id = t.trainer_id
                LEFT JOIN
                    tbl_scholarship_type AS st ON b.scholarship_type_id = st.scholarship_type_id
                ORDER BY
                    b.batch_id DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $summaries = ta_fetch_batch_assignment_summary($conn, array_column($batches, 'batch_id'));
        foreach ($batches as &$batch) {
            $mode = ta_normalize_mode($batch['trainer_assignment_mode'] ?? 'single');
            $batch['trainer_assignment_mode'] = $mode;
            $batch['lead_trainer_name'] = $batch['trainer_name'] ?? null;
            $batch['trainer_summary'] = buildBatchTrainerSummary($batch, $summaries[(int)$batch['batch_id']] ?? null);
            if ($mode === 'multiple') {
                $batch['trainer_name'] = $batch['trainer_summary'];
            }
        }
        unset($batch);

        echo json_encode(['success' => true, 'data' => $batches]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error fetching batches: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function getFormData($conn) {
    try {
        // Get qualifications
        $qual_query = "SELECT
                            q.qualification_id,
                            q.qualification_name,
                            COALESCE(q.training_cost, 0) AS training_cost,
                            q.nc_level_id,
                            nc.nc_level_code,
                            nc.nc_level_name
                       FROM tbl_qualifications q
                       LEFT JOIN tbl_nc_levels nc ON nc.nc_level_id = q.nc_level_id
                       WHERE q.status = 'active'
                       ORDER BY q.qualification_name";
        $qual_stmt = $conn->prepare($qual_query);
        $qual_stmt->execute();
        $qualifications = $qual_stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get trainers
        $trainer_query = "SELECT
                            t.trainer_id,
                            t.first_name,
                            t.last_name,
                            COALESCE(
                                GROUP_CONCAT(DISTINCT tq.qualification_id ORDER BY tq.qualification_id SEPARATOR ','),
                                IFNULL(t.qualification_id, '')
                            ) AS qualification_ids
                          FROM tbl_trainer t
                          LEFT JOIN tbl_trainer_qualifications tq ON t.trainer_id = tq.trainer_id
                          WHERE t.status = 'active'
                          GROUP BY t.trainer_id";
        $trainer_stmt = $conn->prepare($trainer_query);
        $trainer_stmt->execute();
        $trainers = $trainer_stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get scholarship types
        $scholarship_query = "SELECT scholarship_type_id, scholarship_name FROM tbl_scholarship_type WHERE status = 'active'";
        $scholarship_stmt = $conn->prepare($scholarship_query);
        $scholarship_stmt->execute();
        $scholarships = $scholarship_stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => [
                'qualifications' => $qualifications,
                'trainers' => $trainers,
                'scholarships' => $scholarships
            ]
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error fetching form data: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function addBatch($conn) {
    $data = json_decode(file_get_contents("php://input"), true);

    if (empty($data['batch_name']) || empty($data['start_date']) || empty($data['end_date']) || empty($data['qualification_id'])) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
        http_response_code(400);
        return;
    }

    try {
        $trainerAssignmentMode = ta_normalize_mode($data['trainer_assignment_mode'] ?? 'single');
        $trainerId = normalizeNullableInt($data['trainer_id'] ?? null);
        $scholarshipTypeId = normalizeNullableInt($data['scholarship_type_id'] ?? null);
        $maxTrainees = normalizeMaxTrainees($data['max_trainees'] ?? null);
        $status = normalizeBatchStatus($data['status'] ?? 'open');
        $query = "INSERT INTO tbl_batch (qualification_id, batch_name, trainer_id, trainer_assignment_mode, scholarship_type_id, start_date, end_date, status, max_trainees) 
              VALUES (:qualification_id, :batch_name, :trainer_id, :trainer_assignment_mode, :scholarship_type_id, :start_date, :end_date, :status, :max_trainees)";
        $stmt = $conn->prepare($query);

        $stmt->bindParam(':qualification_id', $data['qualification_id'], PDO::PARAM_INT);
        $stmt->bindParam(':batch_name', $data['batch_name']);
        $stmt->bindValue(':trainer_id', $trainerId, $trainerId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(':trainer_assignment_mode', $trainerAssignmentMode);
        $stmt->bindValue(':scholarship_type_id', $scholarshipTypeId, $scholarshipTypeId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindParam(':start_date', $data['start_date']);
        $stmt->bindParam(':end_date', $data['end_date']);
        $stmt->bindValue(':status', $status);
        $stmt->bindValue(':max_trainees', $maxTrainees, PDO::PARAM_INT);
        

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Batch added successfully.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to add batch.']);
            http_response_code(500);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function updateBatch($conn) {
    $data = json_decode(file_get_contents("php://input"), true);

    if (empty($data['batch_id']) || empty($data['batch_name']) || empty($data['start_date']) || empty($data['end_date']) || empty($data['qualification_id'])) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
        http_response_code(400);
        return;
    }

    try {
        $trainerAssignmentMode = ta_normalize_mode($data['trainer_assignment_mode'] ?? 'single');
        $trainerId = normalizeNullableInt($data['trainer_id'] ?? null);
        $scholarshipTypeId = normalizeNullableInt($data['scholarship_type_id'] ?? null);
                $maxTrainees = normalizeMaxTrainees($data['max_trainees'] ?? null);
        $status = normalizeBatchStatus($data['status'] ?? 'open');
        $query = "UPDATE tbl_batch SET 
                    qualification_id = :qualification_id, 
                    batch_name = :batch_name, 
                    trainer_id = :trainer_id, 
                    trainer_assignment_mode = :trainer_assignment_mode,
                    scholarship_type_id = :scholarship_type_id, 
                    start_date = :start_date, 
                    end_date = :end_date, 
                    status = :status,
                    max_trainees = :max_trainees
                  WHERE batch_id = :batch_id";
        $stmt = $conn->prepare($query);

        $stmt->bindParam(':qualification_id', $data['qualification_id'], PDO::PARAM_INT);
        $stmt->bindParam(':batch_name', $data['batch_name']);
        $stmt->bindValue(':trainer_id', $trainerId, $trainerId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(':trainer_assignment_mode', $trainerAssignmentMode);
        $stmt->bindValue(':scholarship_type_id', $scholarshipTypeId, $scholarshipTypeId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindParam(':start_date', $data['start_date']);
        $stmt->bindParam(':end_date', $data['end_date']);
        $stmt->bindValue(':status', $status);
        $stmt->bindValue(':max_trainees', $maxTrainees, PDO::PARAM_INT);
        
        $stmt->bindParam(':batch_id', $data['batch_id'], PDO::PARAM_INT);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Batch updated successfully.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update batch.']);
            http_response_code(500);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function deleteBatch($conn) {
    $id = $_GET['id'] ?? 0;

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Batch ID is required.']);
        http_response_code(400);
        return;
    }

    try {
        $query = "DELETE FROM tbl_batch WHERE batch_id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Batch deleted successfully.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to delete batch.']);
            http_response_code(500);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function getTraineesForBatch($conn) {
    $batchId = $_GET['batch_id'] ?? 0;

    if (!$batchId) {
        echo json_encode(['success' => false, 'message' => 'Batch ID is required.']);
        http_response_code(400);
        return;
    }

    try {
        $query = "SELECT 
                    th.trainee_id,
                    th.trainee_school_id,
                    th.first_name,
                    th.last_name,
                    th.email,
                    th.phone_number,
                    th.status,
                    e.status as enrollment_status,
                    e.enrollment_date,
                    DATE_FORMAT(e.enrollment_date, '%Y-%m-%d %H:%i:%s') as formatted_enrollment_date
                  FROM tbl_enrollment e
                  JOIN tbl_trainee_hdr th ON e.trainee_id = th.trainee_id
                  WHERE e.batch_id = ?";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([$batchId]);
        $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $trainees]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function normalizeNullableInt($value): ?int {
    $number = (int)$value;
    return $number > 0 ? $number : null;
}

function normalizeMoneyValue($value): float {
    if ($value === null || $value === '') {
        return 0.0;
    }

    $amount = round((float)$value, 2);
    return $amount >= 0 ? $amount : 0.0;
}

function normalizeMaxTrainees($value): int {
    $number = (int)$value;
    return $number > 0 ? $number : 25;
}

function normalizeBatchStatus($value): string {
    return strtolower((string)$value) === 'closed' ? 'closed' : 'open';
}

function buildBatchTrainerSummary(array $batch, ?array $summary): string {
    $mode = ta_normalize_mode($batch['trainer_assignment_mode'] ?? 'single');
    if ($mode !== 'multiple') {
        return trim((string)($batch['trainer_name'] ?? '')) !== '' ? (string)$batch['trainer_name'] : 'Not Assigned';
    }

    $trainerCount = (int)($summary['distinct_trainers'] ?? 0);
    $moduleCount = (int)($summary['assigned_modules'] ?? 0);

    if ($trainerCount <= 0) {
        $leadTrainerName = trim((string)($batch['lead_trainer_name'] ?? ''));
        return $leadTrainerName !== '' ? $leadTrainerName . ' (Lead Trainer)' : 'Multiple Trainers (Not Scheduled)';
    }

    if ($trainerCount === 1 && !empty($summary['trainer_names'][0])) {
        return sprintf('%s (%d module%s)', $summary['trainer_names'][0], $moduleCount, $moduleCount === 1 ? '' : 's');
    }

    return sprintf('%d trainers / %d modules', $trainerCount, $moduleCount);
}
?>

