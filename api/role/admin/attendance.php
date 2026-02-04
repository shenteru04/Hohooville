<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'list':
        getAttendanceList($conn);
        break;
    case 'get-batches':
        getBatches($conn);
        break;
    case 'get-trainees':
        getTraineesByBatch($conn);
        break;
    case 'save':
        saveAttendance($conn);
        break;
    case 'delete':
        deleteAttendance($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getAttendanceList($conn) {
    try {
        $batchId = $_GET['batch_id'] ?? null;
        $date = $_GET['date'] ?? null;

        $query = "
            SELECT 
                d.attendance_dtl_id,
                t.first_name,
                t.last_name,
                b.batch_name,
                h.date_recorded,
                d.status
            FROM tbl_attendance_dtl d
            JOIN tbl_attendance_hdr h ON d.attendance_hdr_id = h.attendance_hdr_id
            JOIN tbl_trainee_hdr t ON d.trainee_id = t.trainee_id
            LEFT JOIN tbl_batch b ON h.batch_id = b.batch_id
            WHERE 1=1
        ";

        $params = [];
        if ($batchId) {
            $query .= " AND h.batch_id = ?";
            $params[] = $batchId;
        }
        if ($date) {
            $query .= " AND h.date_recorded = ?";
            $params[] = $date;
        }

        $query .= " ORDER BY h.date_recorded DESC, b.batch_name ASC, t.last_name ASC";

        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getBatches($conn) {
    try {
        $stmt = $conn->query("SELECT batch_id, batch_name FROM tbl_batch WHERE status = 'open' ORDER BY batch_name ASC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getTraineesByBatch($conn) {
    try {
        $batchId = $_GET['batch_id'] ?? null;
        if (!$batchId) throw new Exception('Batch ID is required');

        $query = "
            SELECT t.trainee_id, t.first_name, t.last_name
            FROM tbl_trainee_hdr t
            JOIN tbl_enrollment e ON t.trainee_id = e.trainee_id
            WHERE e.batch_id = ? AND e.status = 'approved'
            ORDER BY t.last_name ASC
        ";
        $stmt = $conn->prepare($query);
        $stmt->execute([$batchId]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function saveAttendance($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['batch_id']) || empty($data['date']) || empty($data['attendance'])) {
            throw new Exception('Missing required fields');
        }

        $conn->beginTransaction();

        // Check if header exists for this batch and date
        $stmtCheck = $conn->prepare("SELECT attendance_hdr_id FROM tbl_attendance_hdr WHERE batch_id = ? AND date_recorded = ?");
        $stmtCheck->execute([$data['batch_id'], $data['date']]);
        $existingHdr = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($existingHdr) {
            $hdrId = $existingHdr['attendance_hdr_id'];
            // Delete existing details to overwrite with new data
            $stmtDel = $conn->prepare("DELETE FROM tbl_attendance_dtl WHERE attendance_hdr_id = ?");
            $stmtDel->execute([$hdrId]);
        } else {
            // Create Header
            $stmtHdr = $conn->prepare("INSERT INTO tbl_attendance_hdr (batch_id, date_recorded) VALUES (?, ?)");
            $stmtHdr->execute([$data['batch_id'], $data['date']]);
            $hdrId = $conn->lastInsertId();
        }

        // Create Details
        $stmtDtl = $conn->prepare("INSERT INTO tbl_attendance_dtl (attendance_hdr_id, trainee_id, status) VALUES (?, ?, ?)");
        foreach ($data['attendance'] as $record) {
            $stmtDtl->execute([$hdrId, $record['trainee_id'], $record['status']]);
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Attendance saved successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deleteAttendance($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('ID required');
        $stmt = $conn->prepare("DELETE FROM tbl_attendance_dtl WHERE attendance_dtl_id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>