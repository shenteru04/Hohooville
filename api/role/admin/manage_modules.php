<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

class AdminModules {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_REQUEST['action'] ?? '';

        switch($action) {
            case 'get-courses':
                $this->getCourses();
                break;
            case 'get-modules':
                $this->getModules();
                break;
            case 'create-module':
                $this->createModule();
                break;
            case 'create-lesson':
                $this->createLesson();
                break;
            default:
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
    }

    private function getCourses() {
        $stmt = $this->conn->query("SELECT course_id, course_name FROM tbl_course WHERE status = 'active' ORDER BY course_name");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    private function getModules() {
        $courseId = $_GET['course_id'] ?? null;
        if (!$courseId) {
            echo json_encode(['success' => false, 'message' => 'Course ID required']);
            return;
        }

        $stmt = $this->conn->prepare("SELECT * FROM tbl_module WHERE course_id = ? ORDER BY module_id");
        $stmt->execute([$courseId]);
        $modules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($modules as &$module) {
            $lStmt = $this->conn->prepare("SELECT * FROM tbl_lessons WHERE module_id = ? ORDER BY lesson_id");
            $lStmt->execute([$module['module_id']]);
            $module['lessons'] = $lStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode(['success' => true, 'data' => $modules]);
    }

    private function createModule() {
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['course_id']) || empty($data['module_title'])) {
            echo json_encode(['success' => false, 'message' => 'Course and Title are required']);
            return;
        }

        $stmt = $this->conn->prepare("INSERT INTO tbl_module (course_id, module_title, module_description) VALUES (?, ?, ?)");
        if ($stmt->execute([$data['course_id'], $data['module_title'], $data['module_description'] ?? ''])) {
            echo json_encode(['success' => true, 'message' => 'Module created']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to create module']);
        }
    }

    private function createLesson() {
        $moduleId = $_POST['module_id'] ?? null;
        $title = $_POST['lesson_title'] ?? null;

        if (!$moduleId || !$title) {
            echo json_encode(['success' => false, 'message' => 'Module and Title are required']);
            return;
        }

        $filePath = null;
        if (isset($_FILES['lesson_file']) && $_FILES['lesson_file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../../uploads/modules/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            $fileName = time() . '_' . basename($_FILES['lesson_file']['name']);
            $targetPath = $uploadDir . $fileName;
            
            if (move_uploaded_file($_FILES['lesson_file']['tmp_name'], $targetPath)) {
                $filePath = '/Hohoo-ville/api/uploads/modules/' . $fileName;
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to upload file.']);
                return;
            }
        }

        $stmt = $this->conn->prepare("INSERT INTO tbl_lessons (module_id, lesson_title, file_path) VALUES (?, ?, ?)");
        if ($stmt->execute([$moduleId, $title, $filePath])) {
            echo json_encode(['success' => true, 'message' => 'Lesson created successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Database error on lesson creation']);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new AdminModules($db);
$api->handleRequest();
?>