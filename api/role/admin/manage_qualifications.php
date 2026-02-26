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
        getQualifications($conn);
        break;
    case 'add':
        addQualification($conn);
        break;
    case 'update':
        updateQualification($conn);
        break;
    case 'update-status':
        updateQualificationStatus($conn);
        break;
    case 'delete':
        deleteQualification($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getQualifications($conn) {
    try {
        autoActivatePendingQualifications($conn);
        $stmt = $conn->query("SELECT * FROM tbl_qualifications ORDER BY FIELD(status, 'active', 'inactive', 'rejected', 'pending'), qualification_id DESC");
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

function addQualification($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['qualification_name'])) {
            throw new Exception('Qualification name is required');
        }
        
        $conn->beginTransaction();

        $stmt = $conn->prepare("INSERT INTO tbl_qualifications (qualification_name, ctpr_number, training_cost, description, duration, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['qualification_name'],
            $data['ctpr_number'] ?? null,
            $data['training_cost'] ?? 0,
            $data['description'] ?? null, 
            $data['duration'] ?? null, 
            $data['status'] ?? 'active'
        ]);
        $qualificationId = $conn->lastInsertId();

        // Automatically add to offered courses so it can be enrolled in
        $stmtOffered = $conn->prepare("INSERT INTO tbl_offered_qualifications (qualification_id) VALUES (?)");
        $stmtOffered->execute([$qualificationId]);
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Qualification added successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateQualification($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['qualification_id'] ?? null;
        
        if (!$id) throw new Exception('ID required');
        
        $stmt = $conn->prepare("UPDATE tbl_qualifications SET qualification_name = ?, ctpr_number = ?, training_cost = ?, description = ?, duration = ?, status = ? WHERE qualification_id = ?");
        $stmt->execute([
            $data['qualification_name'], 
            $data['ctpr_number'] ?? null,
            $data['training_cost'] ?? 0,
            $data['description'] ?? null, 
            $data['duration'] ?? null, 
            $data['status'], 
            $id
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Qualification updated successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateQualificationStatus($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['qualification_id'] ?? null;
        $status = $data['status'] ?? null;
        
        if (!$id || !$status) throw new Exception('ID and Status required');
        
        $stmt = $conn->prepare("UPDATE tbl_qualifications SET status = ? WHERE qualification_id = ?");
        $stmt->execute([$status, $id]);
        // Notify registrars if qualification approved or rejected (per-registrar user notification)
        try {
            if ($status === 'active' || $status === 'rejected') {
                // get qualification name
                $qstmt = $conn->prepare("SELECT qualification_name FROM tbl_qualifications WHERE qualification_id = ?");
                $qstmt->execute([$id]);
                $qual = $qstmt->fetch(PDO::FETCH_ASSOC);
                $qname = $qual['qualification_name'] ?? 'Qualification';
                $actionText = ($status === 'active') ? 'approved' : 'rejected';
                $message = 'Qualification ' . $actionText . ': ' . $qname;
                $link = '/Hohoo-ville/frontend/html/registrar/pages/create_qualification.html';
                $title = 'Qualification ' . ucfirst($actionText);

                // find registrar users
                $uStmt = $conn->prepare("SELECT u.user_id FROM tbl_users u JOIN tbl_role r ON u.role_id = r.role_id WHERE r.role_name = 'registrar'");
                $uStmt->execute();
                $regIds = $uStmt->fetchAll(PDO::FETCH_COLUMN);
                if (!empty($regIds)) {
                    $nstmt = $conn->prepare("INSERT INTO tbl_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)");
                    foreach ($regIds as $rid) {
                        $nstmt->execute([$rid, $title, $message, $link]);
                    }
                }
            }
        } catch (Exception $ne) {
            // ignore notification errors
        }

        echo json_encode(['success' => true, 'message' => 'Status updated']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deleteQualification($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('ID required');
        
        $stmt = $conn->prepare("DELETE FROM tbl_qualifications WHERE qualification_id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true, 'message' => 'Qualification deleted successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
