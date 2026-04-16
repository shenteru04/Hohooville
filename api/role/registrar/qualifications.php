<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'create':
        createQualification($conn);
        break;
    case 'list':
        getApprovedQualifications($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getApprovedQualifications($conn) {
    try {
        autoActivatePendingQualifications($conn);
<<<<<<< HEAD
        $stmt = $conn->query("SELECT q.qualification_id, q.qualification_name, q.qualification_name as course_name, q.ctpr_number, q.duration, q.training_cost, q.status, q.nc_level_id, nc.nc_level_code, nc.nc_level_name FROM tbl_qualifications q LEFT JOIN tbl_nc_levels nc ON q.nc_level_id = nc.nc_level_id WHERE q.status = 'active' AND q.is_archived = 0 ORDER BY q.qualification_name ASC");
=======
        $stmt = $conn->query("SELECT q.qualification_id, q.qualification_name, q.qualification_name as course_name, q.ctpr_number, q.duration, q.training_cost, q.status, q.nc_level_id, nc.nc_level_code, nc.nc_level_name FROM tbl_qualifications q LEFT JOIN tbl_nc_levels nc ON q.nc_level_id = nc.nc_level_id WHERE q.status = 'active' ORDER BY q.qualification_name ASC");
>>>>>>> e4d81815babfc583ce81df77f2941dff0d144ca6
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function autoActivatePendingQualifications($conn) {
    try {
        $conn->exec("UPDATE tbl_qualifications SET status = 'active' WHERE status = 'pending'");
        $conn->exec(
            "INSERT INTO tbl_offered_qualifications (qualification_id)
             SELECT q.qualification_id
             FROM tbl_qualifications q
             LEFT JOIN tbl_offered_qualifications oq ON oq.qualification_id = q.qualification_id
             WHERE q.status = 'active' AND oq.qualification_id IS NULL"
        );
    } catch (Exception $e) {
        // Ignore auto-activation failures to avoid breaking list endpoint
    }
}

function createQualification($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['qualification_name'])) {
            throw new Exception('Qualification name is required');
        }

<<<<<<< HEAD
        $stmt = $conn->prepare("INSERT INTO tbl_qualifications (qualification_name, nc_level_id, ctpr_number, duration, training_cost, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
=======
        $stmt = $conn->prepare("INSERT INTO tbl_qualifications (qualification_name, nc_level_id, ctpr_number, duration, training_cost, description, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
>>>>>>> e4d81815babfc583ce81df77f2941dff0d144ca6
        $stmt->execute([
            $data['qualification_name'],
            $data['nc_level_id'] ?? null,
            $data['ctpr_number'] ?? null,
            $data['duration'] ?? null,
            $data['training_cost'] ?? 0,
            $data['description'] ?? null,
            $data['status'] ?? 'active'
        ]);

        echo json_encode(['success' => true, 'message' => 'Qualification created successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
