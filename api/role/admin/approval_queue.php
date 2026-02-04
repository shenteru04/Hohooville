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
        getPendingEnrollments($conn);
        break;
    case 'approve':
        processEnrollment($conn, 'approved');
        break;
    case 'reject':
        processEnrollment($conn, 'rejected');
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getPendingEnrollments($conn) {
    try {
        // Join with trainee, offered_courses -> course, and batch to get details
        $query = "
            SELECT 
                e.enrollment_id, 
                e.enrollment_date, 
                e.status,
                e.scholarship_type,
                h.*, 
                d.civil_status, d.birthdate, d.age, d.birthplace_city, d.birthplace_province, d.birthplace_region, d.nationality, 
                d.house_no_street, d.barangay, d.district, d.city_municipality, d.province, d.region,
                f.educational_attainment, f.employment_status, f.employment_type, f.learner_classification, 
                f.is_pwd, f.disability_type, f.disability_cause, f.privacy_consent, f.digital_signature,
                c.course_name,
                b.batch_name
            FROM tbl_enrollment e
            JOIN tbl_trainee_hdr h ON e.trainee_id = h.trainee_id
            LEFT JOIN tbl_trainee_dtl d ON h.trainee_id = d.trainee_id
            LEFT JOIN tbl_trainee_ftr f ON h.trainee_id = f.trainee_id
            LEFT JOIN tbl_offered_courses oc ON e.offered_id = oc.offered_id
            LEFT JOIN tbl_course c ON oc.course_id = c.course_id
            LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
            WHERE e.status = 'qualified'
            ORDER BY e.enrollment_date ASC
        ";
        $stmt = $conn->query($query);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function processEnrollment($conn, $status) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $enrollmentId = $data['enrollment_id'] ?? null;
        
        if (!$enrollmentId) {
            throw new Exception('Enrollment ID is required');
        }

        $conn->beginTransaction();

        // Update enrollment status
        $stmt = $conn->prepare("UPDATE tbl_enrollment SET status = ? WHERE enrollment_id = ?");
        $stmt->execute([$status, $enrollmentId]);

        // If approved, add to tbl_enrolled_trainee if not exists
        if ($status === 'approved') {
            // Get trainee_id
            $stmtGet = $conn->prepare("SELECT trainee_id FROM tbl_enrollment WHERE enrollment_id = ?");
            $stmtGet->execute([$enrollmentId]);
            $enrollment = $stmtGet->fetch(PDO::FETCH_ASSOC);

            if ($enrollment) {
                // Check if already in enrolled_trainee
                $stmtCheck = $conn->prepare("SELECT enrolled_id FROM tbl_enrolled_trainee WHERE enrollment_id = ?");
                $stmtCheck->execute([$enrollmentId]);
                
                if (!$stmtCheck->fetch()) {
                    $stmtIns = $conn->prepare("INSERT INTO tbl_enrolled_trainee (enrollment_id, trainee_id) VALUES (?, ?)");
                    $stmtIns->execute([$enrollmentId, $enrollment['trainee_id']]);
                }

                // Assign Financial Classification / Scholarship if provided
                if (!empty($data['scholarship_type'])) {
                    $stmtSch = $conn->prepare("INSERT INTO tbl_scholarship (trainee_id, scholarship_name, date_granted) VALUES (?, ?, NOW())");
                    $stmtSch->execute([$enrollment['trainee_id'], $data['scholarship_type']]);
                }
            }
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Enrollment ' . $status . ' successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>