<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list-scholarships':
        listScholarships($conn);
        break;
    case 'save-scholarship':
        saveScholarship($conn);
        break;
    case 'delete-scholarship':
        deleteScholarship($conn);
        break;
    case 'list-offered-courses':
        listOfferedCourses($conn);
        break;
    case 'toggle-scholarship-status':
        toggleScholarshipStatus($conn);
        break;
    case 'toggle-course-offer':
        toggleCourseOffer($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function listScholarships($conn) {
    try {
        $stmt = $conn->query("SELECT * FROM tbl_scholarship_type ORDER BY scholarship_name");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function saveScholarship($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;
    $name = $data['name'] ?? '';
    $desc = $data['description'] ?? '';

    if (!$name) {
        echo json_encode(['success' => false, 'message' => 'Scholarship name is required']);
        return;
    }

    try {
        if ($id) {
            $stmt = $conn->prepare("UPDATE tbl_scholarship_type SET scholarship_name = ?, description = ? WHERE scholarship_type_id = ?");
            $stmt->execute([$name, $desc, $id]);
        } else {
            $stmt = $conn->prepare("INSERT INTO tbl_scholarship_type (scholarship_name, description) VALUES (?, ?)");
            $stmt->execute([$name, $desc]);
        }
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deleteScholarship($conn) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'ID required']);
        return;
    }
    try {
        $stmt = $conn->prepare("DELETE FROM tbl_scholarship_type WHERE scholarship_type_id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function listOfferedCourses($conn) {
    try {
        // Assuming tbl_course has course_id, course_name, and status/is_offered
        // If is_offered column doesn't exist, we might need to rely on status='active'
        // For this feature, let's assume we check 'status' column.
        $stmt = $conn->query("SELECT qualification_id, qualification_name as course_name, status FROM tbl_qualifications ORDER BY qualification_name");
        $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $courses]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function toggleCourseOffer($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['qualification_id'] ?? null;
    $status = $data['status'] ?? 'active'; // 'active' or 'inactive'

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Qualification ID required']);
        return;
    }

    try {
        $stmt = $conn->prepare("UPDATE tbl_qualifications SET status = ? WHERE qualification_id = ?");
        $stmt->execute([$status, $id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function toggleScholarshipStatus($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;
    $status = $data['status'] ?? 'active';

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'ID required']);
        return;
    }

    try {
        $stmt = $conn->prepare("UPDATE tbl_scholarship_type SET status = ? WHERE scholarship_type_id = ?");
        $stmt->execute([$status, $id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
