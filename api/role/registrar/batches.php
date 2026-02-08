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

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        listBatches($conn);
        break;
    case 'get-form-data':
        getFormData($conn);
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
        break;
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
                    b.scholarship_type,
                    b.trainer_id,
                    c.qualification_name as course_name,
                    CONCAT(t.first_name, ' ', t.last_name) AS trainer_name
                FROM
                    tbl_batch AS b
                LEFT JOIN
                    tbl_qualifications AS c ON b.qualification_id = c.qualification_id
                LEFT JOIN
                    tbl_trainer AS t ON b.trainer_id = t.trainer_id
                ORDER BY
                    b.batch_id DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $batches]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error fetching batches: ' . $e->getMessage()]);
        http_response_code(500);
    }
}

function getFormData($conn) {
    try {
        // Get trainers
        $trainer_query = "SELECT trainer_id, first_name, last_name FROM tbl_trainer WHERE status = 'active'";
        $trainer_stmt = $conn->prepare($trainer_query);
        $trainer_stmt->execute();
        $trainers = $trainer_stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get scholarship types
        $scholarship_query = "SELECT scholarship_name FROM tbl_scholarship_type WHERE status = 'active'";
        $scholarship_stmt = $conn->prepare($scholarship_query);
        $scholarship_stmt->execute();
        $scholarships = $scholarship_stmt->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            'success' => true,
            'data' => [
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
    $data = json_decode(file_get_contents("php://input"));

    if (empty($data->batch_name) || empty($data->start_date) || empty($data->end_date) || empty($data->qualification_id)) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
        http_response_code(400);
        return;
    }

    try {
        $query = "INSERT INTO tbl_batch (qualification_id, batch_name, trainer_id, scholarship_type, start_date, end_date, status) 
                  VALUES (:qualification_id, :batch_name, :trainer_id, :scholarship_type, :start_date, :end_date, :status)";
        $stmt = $conn->prepare($query);

        $stmt->bindParam(':qualification_id', $data->qualification_id, PDO::PARAM_INT);
        $stmt->bindParam(':batch_name', $data->batch_name);
        $stmt->bindParam(':trainer_id', $data->trainer_id, PDO::PARAM_INT);
        $stmt->bindParam(':scholarship_type', $data->scholarship_type);
        $stmt->bindParam(':start_date', $data->start_date);
        $stmt->bindParam(':end_date', $data->end_date);
        $stmt->bindParam(':status', $data->status);

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
    $data = json_decode(file_get_contents("php://input"));

    if (empty($data->batch_id) || empty($data->batch_name) || empty($data->start_date) || empty($data->end_date) || empty($data->qualification_id)) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
        http_response_code(400);
        return;
    }

    try {
        $query = "UPDATE tbl_batch SET 
                    qualification_id = :qualification_id, 
                    batch_name = :batch_name, 
                    trainer_id = :trainer_id, 
                    scholarship_type = :scholarship_type, 
                    start_date = :start_date, 
                    end_date = :end_date, 
                    status = :status 
                  WHERE batch_id = :batch_id";
        $stmt = $conn->prepare($query);

        $stmt->bindParam(':qualification_id', $data->qualification_id, PDO::PARAM_INT);
        $stmt->bindParam(':batch_name', $data->batch_name);
        $stmt->bindParam(':trainer_id', $data->trainer_id, PDO::PARAM_INT);
        $stmt->bindParam(':scholarship_type', $data->scholarship_type);
        $stmt->bindParam(':start_date', $data->start_date);
        $stmt->bindParam(':end_date', $data->end_date);
        $stmt->bindParam(':status', $data->status);
        $stmt->bindParam(':batch_id', $data->batch_id, PDO::PARAM_INT);

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
                    th.first_name,
                    th.last_name,
                    th.email,
                    th.phone_number,
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

    if (!$traineeId) {
        echo json_encode(['success' => false, 'message' => 'Trainee ID is required.']);
        http_response_code(400);
        return;
    }

    try {
        $query = "SELECT 
                    th.*, td.*, tf.*,
                    c.duration as nominal_duration,
                    e.scholarship_type
                  FROM tbl_trainee_hdr th
                  LEFT JOIN tbl_trainee_dtl td ON th.trainee_id = td.trainee_id
                  LEFT JOIN tbl_trainee_ftr tf ON th.trainee_id = tf.trainee_id
                  LEFT JOIN tbl_enrollment e ON th.trainee_id = e.trainee_id
                  LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                  LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                  WHERE th.trainee_id = ?";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([$traineeId]);
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
?>