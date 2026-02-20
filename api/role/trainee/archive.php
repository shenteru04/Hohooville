<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

class ArchiveManager {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? $_POST['action'] ?? null;
        $traineeId = $_GET['trainee_id'] ?? $_POST['trainee_id'] ?? null;
        $enrollmentId = $_GET['enrollment_id'] ?? $_POST['enrollment_id'] ?? null;

        if (!$traineeId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Trainee ID is required']);
            return;
        }

        switch ($action) {
            case 'archive-course':
                $this->archiveCourse($traineeId, $enrollmentId);
                break;
            case 'unarchive-course':
                $this->unarchiveCourse($traineeId, $enrollmentId);
                break;
            case 'get-archived':
                $this->getArchivedCourses($traineeId);
                break;
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
                break;
        }
    }

    private function archiveCourse($traineeId, $enrollmentId) {
        if (!$enrollmentId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Enrollment ID is required']);
            return;
        }

        try {
            // Verify ownership
            $verifyStmt = $this->conn->prepare("SELECT enrollment_id FROM tbl_enrollment WHERE enrollment_id = ? AND trainee_id = ?");
            $verifyStmt->execute([$enrollmentId, $traineeId]);
            if (!$verifyStmt->fetch()) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Unauthorized']);
                return;
            }

            // Archive the course
            $updateStmt = $this->conn->prepare(
                "UPDATE tbl_enrollment 
                 SET is_archived = 1, archive_date = CURDATE() 
                 WHERE enrollment_id = ? AND trainee_id = ?"
            );
            $updateStmt->execute([$enrollmentId, $traineeId]);

            echo json_encode([
                'success' => true,
                'message' => 'Qualification archived successfully'
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error archiving course: ' . $e->getMessage()]);
        }
    }

    private function unarchiveCourse($traineeId, $enrollmentId) {
        if (!$enrollmentId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Enrollment ID is required']);
            return;
        }

        try {
            // Verify ownership
            $verifyStmt = $this->conn->prepare("SELECT enrollment_id FROM tbl_enrollment WHERE enrollment_id = ? AND trainee_id = ?");
            $verifyStmt->execute([$enrollmentId, $traineeId]);
            if (!$verifyStmt->fetch()) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Unauthorized']);
                return;
            }

            // Unarchive the course
            $updateStmt = $this->conn->prepare(
                "UPDATE tbl_enrollment 
                 SET is_archived = 0, archive_date = NULL 
                 WHERE enrollment_id = ? AND trainee_id = ?"
            );
            $updateStmt->execute([$enrollmentId, $traineeId]);

            echo json_encode([
                'success' => true,
                'message' => 'Qualification unarchived successfully'
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error unarchiving course: ' . $e->getMessage()]);
        }
    }

    private function getArchivedCourses($traineeId) {
        try {
            $query = "SELECT e.enrollment_id, c.qualification_id, c.qualification_name, b.batch_name, 
                             b.start_date, b.end_date, e.completion_date, e.archive_date,
                             (SELECT AVG(score) FROM tbl_grades WHERE trainee_id = ? AND qualification_id = c.qualification_id) as final_score
                      FROM tbl_enrollment e
                      JOIN tbl_batch b ON e.batch_id = b.batch_id
                      JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                      JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                      WHERE e.trainee_id = ? AND e.is_archived = 1
                      ORDER BY e.completion_date DESC, e.archive_date DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$traineeId, $traineeId]);
            $archivedCourses = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $archivedCourses
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error fetching archived courses: ' . $e->getMessage()]);
        }
    }
}

try {
    $database = new Database();
    $db = $database->getConnection();
    $manager = new ArchiveManager($db);
    $manager->handleRequest();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>
