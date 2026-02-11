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

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        listTrainees($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action specified.']);
        http_response_code(400);
        break;
}

function listTrainees($conn) {
    $trainerId = $_GET['trainer_id'] ?? 0;
    $batchId = $_GET['batch_id'] ?? 0;

    if (!$trainerId) {
        echo json_encode(['success' => false, 'message' => 'Trainer ID is required.']);
        http_response_code(400);
        return;
    }

    try {
        $baseQuery = "SELECT
                    th.trainee_id,
                    th.trainee_school_id,
                    CONCAT_WS(' ', th.first_name, th.middle_name, th.last_name) AS full_name,
                    th.email,
                    th.photo_file,
                    b.batch_id,
                    b.batch_name,
                    c.qualification_name as course_name,
                    e.status AS enrollment_status
                FROM
                    tbl_batch AS b
                JOIN
                    tbl_enrollment AS e ON b.batch_id = e.batch_id
                JOIN
                    tbl_trainee_hdr AS th ON e.trainee_id = th.trainee_id
                LEFT JOIN
                    tbl_qualifications AS c ON b.qualification_id = c.qualification_id
                ";
        
        $params = [$trainerId];
        $whereClauses = ["b.trainer_id = ?", "e.status = 'approved'"];

        if ($batchId > 0) {
            $whereClauses[] = "b.batch_id = ?";
            $params[] = $batchId;
        }

        $query = $baseQuery . " WHERE " . implode(" AND ", $whereClauses) . " ORDER BY b.batch_name, th.last_name, th.first_name";
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $trainees]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error fetching trainees: ' . $e->getMessage()]);
        http_response_code(500);
    }
}
?>