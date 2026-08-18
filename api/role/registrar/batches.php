<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../database/db.php';
require_once __DIR__ . '/../../utils/trainer_assignment_helper.php';

$database = new Database();
$conn = $database->getConnection();
ta_ensure_schema($conn);

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        listBatches($conn);
        break;
    case 'get-form-data':
        getFormData($conn);
        break;
    case 'get-qualification-units':
        getQualificationUnits($conn);
        break;
    case 'save-unit-assignments':
        saveUnitAssignments($conn);
        break;
    case 'add':
        addBatch($conn);
        break;
    case 'update':
        updateBatch($conn);
        break;
    case 'delete':
        deleteBatch($conn);
        break;
    case 'get-trainees':
        getTraineesForBatch($conn);
        break;
    case 'get-trainee-details':
        getTraineeDetails($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action specified.']);
        http_response_code(400);
            // Removed stray query assignment
}

function listBatches($conn) {
    try {
        // Close batches that have passed their enrollment deadline (start_date)
        closeExpiredBatches($conn);
        
        $query = "SELECT
                    b.batch_id,
                    b.batch_name,
                    b.qualification_id,
                    b.start_date,
                    b.status,
                    b.scholarship_type_id,
                    COALESCE(b.trainer_assignment_mode, 'single') AS trainer_assignment_mode,
                    COALESCE(st.scholarship_name, 'No Scholarship') as scholarship_type,
                    b.trainer_id,
                    b.max_trainees,
                    COALESCE(c.training_cost, 0) AS training_cost,
                    COALESCE(c.training_cost, 0) * COALESCE(b.max_trainees, 0) AS projected_total,
                    c.qualification_name,
                    CONCAT(t.first_name, ' ', t.last_name) AS trainer_name
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


function getQualificationUnits(PDO $conn): void
{
    $qualificationId = (int)($_GET['qualification_id'] ?? 0);
    $batchId = (int)($_GET['batch_id'] ?? 0);

    if ($qualificationId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Qualification ID is required.']);
        http_response_code(400);
        return;
    }

    try {
        $groups = ta_fetch_qualification_unit_groups($conn, $qualificationId, true);
        $existingAssignments = $batchId > 0 ? ta_fetch_batch_module_assignments($conn, $batchId) : [];
        $assignmentByGroup = [];

        foreach ($existingAssignments as $assignment) {
            $groupKey = ta_build_module_group_key($assignment);
            if (!isset($assignmentByGroup[$groupKey])) {
                $assignmentByGroup[$groupKey] = $assignment;
            }
        }

        $units = array_map(static function (array $group) use ($assignmentByGroup): array {
            $existing = $assignmentByGroup[$group['group_key']] ?? null;
            $selectedModuleId = !empty($existing['module_id']) ? (int)$existing['module_id'] : null;
            $selectedTrainerId = !empty($existing['trainer_id']) ? (int)$existing['trainer_id'] : null;
            $selectedTrainerName = trim((string)($existing['trainer_name'] ?? ''));
            $selectedSchedule = trim((string)($existing['schedule'] ?? ''));
            $selectedRoomId = !empty($existing['room_id']) ? (int)$existing['room_id'] : null;
            $selectedRoomName = trim((string)($existing['room'] ?? ''));
            $type = strtolower(trim((string)($group['competency_type'] ?? '')));
            $typeLabel = ucfirst($type !== '' ? $type : 'unit');

            return [
                'group_key' => $group['group_key'],
                'qualification_id' => (int)($group['qualification_id'] ?? 0),
                'competency_type' => $type,
                'competency_label' => $typeLabel,
                'module_title' => (string)($group['module_title'] ?? ''),
                'unit_code' => (string)($group['unit_code'] ?? ''),
                'scope_label' => buildBatchUnitScopeLabel($group),
                'assignable' => !empty($group['trainer_options']),
                'trainer_options' => array_values($group['trainer_options'] ?? []),
                'selected_module_id' => $selectedModuleId,
                'selected_trainer_id' => $selectedTrainerId,
                'selected_trainer_name' => $selectedTrainerName !== '' ? $selectedTrainerName : null,
                'selected_schedule' => $selectedSchedule !== '' ? $selectedSchedule : null,
                'selected_room_id' => $selectedRoomId,
                'selected_room' => $selectedRoomName !== '' ? $selectedRoomName : null,
                'has_saved_assignment' => !empty($existing)
            ];
        }, $groups);

        echo json_encode([
            'success' => true,
            'data' => [
                'units' => $units
            ]
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error fetching qualification units: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function saveUnitAssignments(PDO $conn): void
{
    $data = json_decode(file_get_contents("php://input"));
    $batchId = (int)($data->batch_id ?? 0);

    if ($batchId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Batch ID is required.']);
        http_response_code(400);
        return;
    }

    try {
        $batchStmt = $conn->prepare("
            SELECT
                batch_id,
                qualification_id,
                COALESCE(trainer_assignment_mode, 'single') AS trainer_assignment_mode
            FROM tbl_batch
            WHERE batch_id = ?
            LIMIT 1
        ");
        $batchStmt->execute([$batchId]);
        $batch = $batchStmt->fetch(PDO::FETCH_ASSOC);

        if (!$batch) {
            echo json_encode(['success' => false, 'message' => 'Batch not found.']);
            http_response_code(404);
            return;
        }

        if (ta_normalize_mode($batch['trainer_assignment_mode'] ?? 'single') !== 'multiple') {
            echo json_encode(['success' => false, 'message' => 'Unit trainer assignment is only available for multiple-mode batches.']);
            http_response_code(400);
            return;
        }

        $unitAssignments = normalizeUnitAssignments($data->unit_assignments ?? []);

        $conn->beginTransaction();
        syncBatchUnitAssignments($conn, $batchId, (int)$batch['qualification_id'], $unitAssignments);
        $conn->commit();

        echo json_encode(['success' => true, 'message' => 'Unit trainer assignments saved successfully.']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }

        echo json_encode(['success' => false, 'message' => 'Error saving unit trainer assignments: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function addBatch($conn) {
    $data = json_decode(file_get_contents("php://input"));

    if (empty($data->batch_name) || empty($data->start_date) || empty($data->end_date) || empty($data->qualification_id)) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
        http_response_code(400);
        return;
    }

    try {
        $trainerAssignmentMode = ta_normalize_mode($data->trainer_assignment_mode ?? 'single');
        $trainerId = normalizeNullableInt($data->trainer_id ?? null);
        $scholarshipTypeId = normalizeNullableInt($data->scholarship_type_id ?? null);
        $maxTrainees = normalizeMaxTrainees($data->max_trainees ?? null);
        $status = normalizeBatchStatus($data->status ?? 'open');
        $unitAssignments = normalizeUnitAssignments($data->unit_assignments ?? []);

        $conn->beginTransaction();

        $query = "INSERT INTO tbl_batch (qualification_id, batch_name, trainer_id, trainer_assignment_mode, scholarship_type_id, start_date, end_date, status, max_trainees) 
                  VALUES (:qualification_id, :batch_name, :trainer_id, :trainer_assignment_mode, :scholarship_type_id, :start_date, :end_date, :status, :max_trainees)";
        $stmt = $conn->prepare($query);

        $stmt->bindParam(':qualification_id', $data->qualification_id, PDO::PARAM_INT);
        $stmt->bindParam(':batch_name', $data->batch_name);
        $stmt->bindValue(':trainer_id', $trainerId, $trainerId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(':trainer_assignment_mode', $trainerAssignmentMode);
        $stmt->bindValue(':scholarship_type_id', $scholarshipTypeId, $scholarshipTypeId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindParam(':start_date', $data->start_date);
        $stmt->bindParam(':end_date', $data->end_date);
        $stmt->bindValue(':status', $status);
        $stmt->bindValue(':max_trainees', $maxTrainees, PDO::PARAM_INT);

        if ($stmt->execute()) {
            $batchId = (int)$conn->lastInsertId();
            if ($trainerAssignmentMode === 'multiple') {
                syncBatchUnitAssignments($conn, $batchId, (int)$data->qualification_id, $unitAssignments);
            }
            $conn->commit();
            echo json_encode(['success' => true, 'message' => 'Batch added successfully.']);
        } else {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            echo json_encode(['success' => false, 'message' => 'Failed to add batch.']);
            http_response_code(500);
        }
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function updateBatch($conn) {
    $data = json_decode(file_get_contents("php://input"));

    if (empty($data->batch_id) || empty($data->batch_name) || empty($data->start_date) || empty($data->end_date) || empty($data->qualification_id)) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
        http_response_code(400);
        return;
    }

    try {
        $trainerAssignmentMode = ta_normalize_mode($data->trainer_assignment_mode ?? 'single');
        $trainerId = normalizeNullableInt($data->trainer_id ?? null);
        $scholarshipTypeId = normalizeNullableInt($data->scholarship_type_id ?? null);
                $maxTrainees = normalizeMaxTrainees($data->max_trainees ?? null);
                $status = normalizeBatchStatus($data->status ?? 'open');
                $unitAssignments = normalizeUnitAssignments($data->unit_assignments ?? []);

                $conn->beginTransaction();

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

                $stmt->bindParam(':qualification_id', $data->qualification_id, PDO::PARAM_INT);
                $stmt->bindParam(':batch_name', $data->batch_name);
                $stmt->bindValue(':trainer_id', $trainerId, $trainerId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
                $stmt->bindValue(':trainer_assignment_mode', $trainerAssignmentMode);
                $stmt->bindValue(':scholarship_type_id', $scholarshipTypeId, $scholarshipTypeId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
                $stmt->bindParam(':start_date', $data->start_date);
                $stmt->bindParam(':end_date', $data->end_date);
                $stmt->bindValue(':status', $status);
                $stmt->bindValue(':max_trainees', $maxTrainees, PDO::PARAM_INT);
                $stmt->bindParam(':batch_id', $data->batch_id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            if ($trainerAssignmentMode === 'multiple') {
                syncBatchUnitAssignments($conn, (int)$data->batch_id, (int)$data->qualification_id, $unitAssignments);
            } else {
                $clearStmt = $conn->prepare("DELETE FROM tbl_batch_trainer_assignments WHERE batch_id = ?");
                $clearStmt->execute([(int)$data->batch_id]);
            }
            $conn->commit();
            echo json_encode(['success' => true, 'message' => 'Batch updated successfully.']);
        } else {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            echo json_encode(['success' => false, 'message' => 'Failed to update batch.']);
            http_response_code(500);
        }
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
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
                    th.first_name,
                    th.last_name,
                    th.email,
                    th.phone_number,
                    th.status,
                    e.status as enrollment_status
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

function getTraineeDetails($conn) {
    $traineeId = $_GET['trainee_id'] ?? 0;
    $batchId = (int)($_GET['batch_id'] ?? 0);

    if (!$traineeId) {
        echo json_encode(['success' => false, 'message' => 'Trainee ID is required.']);
        http_response_code(400);
        return;
    }

    try {
        $params = [];
        $enrollmentJoin = "LEFT JOIN tbl_enrollment e ON th.trainee_id = e.trainee_id";

        if ($batchId > 0) {
            $enrollmentJoin .= " AND e.batch_id = ?";
            $params[] = $batchId;
        }

        $params[] = $traineeId;

        $query = "SELECT 
                    th.*, td.*, tf.*,
                    c.duration as nominal_duration,
                    COALESCE(st.scholarship_name, NULLIF(e.scholarship_type, ''), NULLIF(b.scholarship_type, ''), 'No Scholarship') AS scholarship_type,
                    e.batch_id,
                    b.batch_name,
                    c.qualification_name,
                    e.enrollment_date,
                    DATE_FORMAT(e.enrollment_date, '%Y-%m-%d %H:%i:%s') AS formatted_enrollment_date,
                    e.status AS enrollment_status
                  FROM tbl_trainee_hdr th
                  LEFT JOIN tbl_trainee_dtl td ON th.trainee_id = td.trainee_id
                  LEFT JOIN tbl_trainee_ftr tf ON th.trainee_id = tf.trainee_id
                  {$enrollmentJoin}
                  LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                  LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                  LEFT JOIN tbl_qualifications c ON COALESCE(oc.qualification_id, b.qualification_id) = c.qualification_id
                  LEFT JOIN tbl_scholarship_type st ON COALESCE(e.scholarship_type_id, b.scholarship_type_id) = st.scholarship_type_id
                  WHERE th.trainee_id = ?
                  ORDER BY
                    CASE WHEN e.batch_id IS NULL THEN 1 ELSE 0 END,
                    e.enrollment_date DESC
                  LIMIT 1";
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $trainee = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($trainee) {
            echo json_encode(['success' => true, 'data' => $trainee]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Trainee not found.']);
            http_response_code(404);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

/**
 * Closes batches that have passed their enrollment deadline (start_date)
 */
function closeExpiredBatches($conn) {
    try {
        $query = "UPDATE tbl_batch 
                  SET status = 'closed' 
                  WHERE status = 'open' 
                  AND start_date <= CURDATE()";
        $stmt = $conn->prepare($query);
        $stmt->execute();
    } catch (Exception $e) {
        error_log("Error closing expired batches: " . $e->getMessage());
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

function normalizeUnitAssignments($value): array
{
    if (!is_array($value)) {
        return [];
    }

    return array_values(array_filter(array_map(static function ($item): ?array {
        if (is_array($item)) {
            return $item;
        }

        if ($item instanceof stdClass) {
            return get_object_vars($item);
        }

        return null;
    }, $value)));
}

function syncBatchUnitAssignments(PDO $conn, int $batchId, int $qualificationId, array $unitAssignments): void
{
    $groups = ta_fetch_qualification_unit_groups($conn, $qualificationId, true);
    $groupMap = [];
    foreach ($groups as $group) {
        $groupMap[$group['group_key']] = $group;
    }

    $existingByGroup = [];
    foreach (ta_fetch_batch_module_assignments($conn, $batchId) as $assignment) {
        $groupKey = ta_build_module_group_key($assignment);
        if (!isset($existingByGroup[$groupKey])) {
            $existingByGroup[$groupKey] = $assignment;
        }
    }

    $selectedByGroup = [];
    foreach ($unitAssignments as $assignment) {
        $groupKey = trim((string)($assignment['group_key'] ?? ''));
        $moduleId = normalizeNullableInt($assignment['module_id'] ?? null);

        if ($groupKey === '') {
            continue;
        }

        if (!isset($groupMap[$groupKey])) {
            throw new Exception('One of the selected unit assignments is no longer available.');
        }

        if ($moduleId === null) {
            $selectedByGroup[$groupKey] = null;
            continue;
        }

        $selectedOption = null;
        foreach (($groupMap[$groupKey]['trainer_options'] ?? []) as $option) {
            if ((int)($option['module_id'] ?? 0) === $moduleId) {
                $selectedOption = $option;
                break;
            }
        }

        if ($selectedOption === null) {
            throw new Exception('Selected trainer assignment is no longer available for ' . buildBatchUnitScopeLabel($groupMap[$groupKey]) . '.');
        }

        $selectedByGroup[$groupKey] = $selectedOption;
    }

    $deleteStmt = $conn->prepare("DELETE FROM tbl_batch_trainer_assignments WHERE batch_id = ?");
    $deleteStmt->execute([$batchId]);

    if (empty($selectedByGroup)) {
        return;
    }

    $insertStmt = $conn->prepare("
        INSERT INTO tbl_batch_trainer_assignments (batch_id, module_id, trainer_id, schedule, room_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    ");

    foreach ($groupMap as $groupKey => $group) {
        $selectedOption = $selectedByGroup[$groupKey] ?? null;
        if (!is_array($selectedOption)) {
            continue;
        }

        $previousAssignment = $existingByGroup[$groupKey] ?? null;
        $roomId = normalizeNullableInt($previousAssignment['room_id'] ?? null);
        $schedule = $previousAssignment['schedule'] ?? null;

        $insertStmt->execute([
            $batchId,
            (int)$selectedOption['module_id'],
            (int)$selectedOption['trainer_id'],
            $schedule !== '' ? $schedule : null,
            $roomId
        ]);
    }
}

function buildBatchUnitScopeLabel(array $group): string
{
    $moduleTitle = trim((string)($group['module_title'] ?? 'Untitled Unit'));
    $competencyType = ucfirst(strtolower(trim((string)($group['competency_type'] ?? ''))));

    return $competencyType !== '' ? $moduleTitle . ' (' . $competencyType . ')' : $moduleTitle;
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
