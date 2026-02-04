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
        getPayments($conn);
        break;
    case 'add':
        addPayment($conn);
        break;
    case 'delete':
        deletePayment($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getPayments($conn) {
    try {
        $query = "
            SELECT f.*, t.first_name, t.last_name 
            FROM tbl_finance_record f 
            LEFT JOIN tbl_trainee t ON f.trainee_id = t.trainee_id 
            ORDER BY f.payment_date DESC
        ";
        $stmt = $conn->query($query);
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
        
        if (empty($data['trainee_id']) || empty($data['amount'])) {
            throw new Exception('Trainee and Amount are required');
        }
        
        $stmt = $conn->prepare("INSERT INTO tbl_finance_record (trainee_id, amount, payment_date, payment_method, reference_no, remarks) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['trainee_id'],
            $data['amount'],
            $data['payment_date'] ?? date('Y-m-d'),
            $data['payment_method'] ?? 'cash',
            $data['reference_no'] ?? null,
            $data['remarks'] ?? null
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Payment recorded successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deletePayment($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('ID required');
        
        $stmt = $conn->prepare("DELETE FROM tbl_finance_record WHERE finance_id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>