<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
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
    case 'save':
        saveChart($conn);
        break;
    case 'list':
        listCharts($conn);
        break;
    case 'get':
        getChart($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function saveChart($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $trainerId = $data['trainer_id'] ?? null;

    if (!$trainerId) {
        echo json_encode(['success' => false, 'message' => 'Trainer ID is required.']);
        return;
    }

    $title = $data['title'] ?? 'Untitled Chart';
    $content = $data['content'] ?? '';
    $chartId = $data['chart_id'] ?? null;

    try {
        if ($chartId) {
            $stmt = $conn->prepare("UPDATE tbl_progress_charts SET title = ?, chart_content = ? WHERE chart_id = ?");
            $stmt->execute([$title, $content, $chartId]);
        } else {
            $stmt = $conn->prepare("INSERT INTO tbl_progress_charts (trainer_id, title, chart_content) VALUES (?, ?, ?)");
            $stmt->execute([$trainerId, $title, $content]);
        }
        echo json_encode(['success' => true, 'message' => 'Chart saved successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function listCharts($conn) {
    $trainerId = $_GET['trainer_id'] ?? null;

    if (!$trainerId) {
        echo json_encode(['success' => false, 'message' => 'Trainer ID is required.']);
        return;
    }

    try {
        $stmt = $conn->prepare("SELECT chart_id, title, updated_at FROM tbl_progress_charts WHERE trainer_id = ? ORDER BY updated_at DESC");
        $stmt->execute([$trainerId]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getChart($conn) {
    $chartId = $_GET['id'] ?? 0;
    $trainerId = $_GET['trainer_id'] ?? null;

    if (!$trainerId || !$chartId) {
        echo json_encode(['success' => false, 'message' => 'Chart ID and Trainer ID are required.']);
        return;
    }

    try {
        $stmt = $conn->prepare("SELECT * FROM tbl_progress_charts WHERE chart_id = ? AND trainer_id = ?");
        $stmt->execute([$chartId, $trainerId]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($data) {
            echo json_encode(['success' => true, 'data' => $data]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Chart not found']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>