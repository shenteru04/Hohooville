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

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'list':
        getGrades($conn);
        break;
    case 'get-filters':
        getFilters($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getGrades($conn) {
    try {
        $batchId = $_GET['batch_id'] ?? '';
        $courseId = $_GET['course_id'] ?? '';
        $traineeId = $_GET['trainee_id'] ?? '';

        $query = "
            SELECT 
                gh.grades_hdr_id,
                CONCAT(t.first_name, ' ', t.last_name) as trainee_name,
                c.course_name,
                b.batch_name,
                gh.total_grade,
                gh.remarks,
                gh.date_recorded
            FROM tbl_grades_hdr gh
            JOIN tbl_trainee_hdr t ON gh.trainee_id = t.trainee_id
            JOIN tbl_course c ON gh.course_id = c.course_id
            LEFT JOIN tbl_offered_courses oc ON oc.course_id = gh.course_id
            LEFT JOIN tbl_enrollment e ON e.trainee_id = gh.trainee_id AND e.offered_id = oc.offered_id
            LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
            WHERE 1=1
        ";

        $params = [];

        if (!empty($batchId)) {
            $query .= " AND b.batch_id = ?";
            $params[] = $batchId;
        }

        if (!empty($courseId)) {
            $query .= " AND gh.course_id = ?";
            $params[] = $courseId;
        }

        if (!empty($traineeId)) {
            $query .= " AND gh.trainee_id = ?";
            $params[] = $traineeId;
        }

        $query .= " ORDER BY gh.date_recorded DESC";

        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getFilters($conn) {
    try {
        // Get Batches
        $stmtBatches = $conn->query("SELECT batch_id, batch_name FROM tbl_batch ORDER BY batch_id DESC");
        $batches = $stmtBatches->fetchAll(PDO::FETCH_ASSOC);

        // Get Courses
        $stmtCourses = $conn->query("SELECT course_id, course_name FROM tbl_course WHERE status = 'active' ORDER BY course_name");
        $courses = $stmtCourses->fetchAll(PDO::FETCH_ASSOC);

        // Get Trainees
        $stmtTrainees = $conn->query("SELECT trainee_id, first_name, last_name FROM tbl_trainee_hdr WHERE status = 'active' ORDER BY last_name");
        $trainees = $stmtTrainees->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => [
            'batches' => $batches,
            'courses' => $courses,
            'trainees' => $trainees
        ]]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>