<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS');
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
        getPayments($conn);
        break;
    case 'add':
        addPayment($conn);
        break;
    case 'get-trainees':
        getTrainees($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getPayments($conn) {
    try {
        $query = "SELECT f.*, t.first_name, t.last_name 
                  FROM tbl_finance_record f
                  JOIN tbl_trainee t ON f.trainee_id = t.trainee_id
                  ORDER BY f.payment_date DESC";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function addPayment($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['trainee_id']) || empty($data['amount']) || empty($data['payment_date'])) {
            throw new Exception('Required fields missing');
        }

        $query = "INSERT INTO tbl_finance_record (trainee_id, amount, payment_date, payment_method, reference_no, remarks) 
                  VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($query);
        $stmt->execute([
            $data['trainee_id'],
            $data['amount'],
            $data['payment_date'],
            $data['payment_method'],
            $data['reference_no'] ?? null,
            $data['remarks'] ?? null
        ]);

        echo json_encode(['success' => true, 'message' => 'Payment recorded successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getTrainees($conn) {
    try {
        $query = "SELECT trainee_id, first_name, last_name FROM tbl_trainee WHERE status = 'active' ORDER BY last_name";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>