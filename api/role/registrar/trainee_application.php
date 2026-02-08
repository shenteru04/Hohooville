<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'list':
        getPendingApplications($conn);
        break;
    case 'list_unqualified':
        getUnqualifiedApplications($conn);
        break;
    case 'qualify':
        updateStatus($conn, 'qualified');
        break;
    case 'unqualify':
        updateStatus($conn, 'unqualified');
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getPendingApplications($conn) {
    try {
        $query = "SELECT e.enrollment_id, e.enrollment_date, e.status, e.scholarship_type,
                         h.*, 
                         d.civil_status, d.birthdate, d.age, d.birthplace_city, d.birthplace_province, d.birthplace_region, d.nationality, 
                         d.house_no_street, d.barangay, d.district, d.city_municipality, d.province, d.region,
                         f.educational_attainment, f.employment_status, f.employment_type, f.learner_classification, 
                         f.is_pwd, f.disability_type, f.disability_cause, f.privacy_consent, f.digital_signature,
                         c.qualification_name as course_name, b.batch_name
                  FROM tbl_enrollment e
                  JOIN tbl_trainee_hdr h ON e.trainee_id = h.trainee_id
                  LEFT JOIN tbl_trainee_dtl d ON h.trainee_id = d.trainee_id
                  LEFT JOIN tbl_trainee_ftr f ON h.trainee_id = f.trainee_id
                  LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                  LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                  LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                  WHERE e.status = 'pending'
                  ORDER BY e.enrollment_date DESC";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getUnqualifiedApplications($conn) {
    try {
        $query = "SELECT e.enrollment_id, e.enrollment_date, e.status, e.scholarship_type,
                         h.*, 
                         d.civil_status, d.birthdate, d.age, d.birthplace_city, d.birthplace_province, d.birthplace_region, d.nationality, 
                         d.house_no_street, d.barangay, d.district, d.city_municipality, d.province, d.region,
                         f.educational_attainment, f.employment_status, f.employment_type, f.learner_classification, 
                         f.is_pwd, f.disability_type, f.disability_cause, f.privacy_consent, f.digital_signature,
                         c.qualification_name as course_name, b.batch_name
                  FROM tbl_enrollment e
                  JOIN tbl_trainee_hdr h ON e.trainee_id = h.trainee_id
                  LEFT JOIN tbl_trainee_dtl d ON h.trainee_id = d.trainee_id
                  LEFT JOIN tbl_trainee_ftr f ON h.trainee_id = f.trainee_id
                  LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                  LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                  LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                  WHERE e.status = 'unqualified'
                  ORDER BY e.enrollment_date DESC";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateStatus($conn, $status) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['enrollment_id'] ?? null;

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'ID required']);
        return;
    }

    try {
        $stmt = $conn->prepare("UPDATE tbl_enrollment SET status = ? WHERE enrollment_id = ?");
        $stmt->execute([$status, $id]);
        echo json_encode(['success' => true, 'message' => 'Status updated to ' . $status]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>