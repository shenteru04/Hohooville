<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : 'list';
$trainerId = isset($_GET['trainer_id']) ? $_GET['trainer_id'] : null;
$traineeId = isset($_GET['id']) ? $_GET['id'] : null;

switch ($action) {
    case 'list':
        if (!$trainerId) {
            echo json_encode(['success' => false, 'message' => 'Trainer ID is required.']);
            exit;
        }
        listTrainees($conn, $trainerId);
        break;
    case 'get-details':
        if (!$traineeId) {
            echo json_encode(['success' => false, 'message' => 'Trainee ID is required.']);
            exit;
        }
        getTraineeDetails($conn, $traineeId);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
        break;
}

function listTrainees($conn, $trainerId) {
    // This query gets all trainees under a specific trainer
    $query = "SELECT 
                t.trainee_id, t.trainee_school_id, t.first_name, t.last_name, t.email,
                b.batch_name,
                c.qualification_name as course_name,
                e.status
              FROM tbl_trainee_hdr t
              JOIN tbl_enrollment e ON t.trainee_id = e.trainee_id
              JOIN tbl_batch b ON e.batch_id = b.batch_id
              JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
              JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
              WHERE b.trainer_id = ? AND e.status = 'approved'
              ORDER BY t.last_name, t.first_name";
    
    try {
        $stmt = $conn->prepare($query);
        $stmt->execute([$trainerId]);
        $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $trainees]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getTraineeDetails($conn, $traineeId) {
    $query = "SELECT
                t_hdr.*,
                t_dtl.*,
                t_ftr.*,
                b.batch_name,
                c.qualification_name as course_name,
                e.status as enrollment_status,
                e.scholarship_type
            FROM
                tbl_trainee_hdr AS t_hdr
            LEFT JOIN tbl_trainee_dtl AS t_dtl ON t_hdr.trainee_id = t_dtl.trainee_id
            LEFT JOIN tbl_trainee_ftr AS t_ftr ON t_hdr.trainee_id = t_ftr.trainee_id
            LEFT JOIN tbl_enrollment AS e ON t_hdr.trainee_id = e.trainee_id
            LEFT JOIN tbl_batch AS b ON e.batch_id = b.batch_id
            LEFT JOIN tbl_offered_qualifications AS oc ON e.offered_qualification_id = oc.offered_qualification_id
            LEFT JOIN tbl_qualifications AS c ON oc.qualification_id = c.qualification_id
            WHERE
                t_hdr.trainee_id = ?
            LIMIT 1";
    try {
        $stmt = $conn->prepare($query);
        $stmt->execute([$traineeId]);
        $trainee = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($trainee) {
            // For demonstration, I'm adding placeholder data for attendance and competencies.
            // You would replace this with actual queries to your attendance and grades tables.
            $trainee['attendance'] = ['present' => 15, 'absent' => 1, 'late' => 2];
            $trainee['competencies'] = [
                ['module' => 'Core 1', 'lesson' => 'Install electrical metallic tubing', 'score' => 95, 'remarks' => 'Competent'],
                ['module' => 'Core 2', 'lesson' => 'Install wiring devices', 'score' => 88, 'remarks' => 'Competent']
            ];
            echo json_encode(['success' => true, 'data' => $trainee]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Trainee not found.']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
