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
    private $requestData;

    public function __construct($db) {
        $this->conn = $db;
        $this->requestData = json_decode(file_get_contents('php://input'), true);
        if (!is_array($this->requestData)) {
            $this->requestData = [];
        }
    }

    private function requestValue(string $key) {
        return $_GET[$key] ?? $_POST[$key] ?? $this->requestData[$key] ?? null;
    }

    private function getEnrollmentRecord($traineeId, $enrollmentId): ?array {
        $stmt = $this->conn->prepare("
            SELECT e.enrollment_id, e.trainee_id, e.status, e.is_archived, e.completion_date, e.enrollment_date,
                   b.end_date, b.batch_name
            FROM tbl_enrollment e
            LEFT JOIN tbl_batch b ON b.batch_id = e.batch_id
            WHERE e.enrollment_id = ? AND e.trainee_id = ?
            LIMIT 1
        ");
        $stmt->execute([$enrollmentId, $traineeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function hasReachedEndDate(?string $endDate): bool {
        $normalized = trim((string)$endDate);
        if ($normalized === '') {
            return false;
        }

        $timestamp = strtotime($normalized . ' 23:59:59');
        if ($timestamp === false) {
            return false;
        }

        return $timestamp <= time();
    }

    public function handleRequest() {
        $action = $this->requestValue('action');
        $traineeId = $this->requestValue('trainee_id');
        $enrollmentId = $this->requestValue('enrollment_id');

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
            $enrollment = $this->getEnrollmentRecord($traineeId, $enrollmentId);
            if (!$enrollment) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Unauthorized']);
                return;
            }

            if (!$this->hasReachedEndDate($enrollment['end_date'] ?? null)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'This qualification cannot be archived yet because the batch end date has not been reached.'
                ]);
                return;
            }

            $updateStmt = $this->conn->prepare(
                "UPDATE tbl_enrollment 
                 SET status = CASE WHEN status = 'approved' THEN 'completed' ELSE status END,
                     completion_date = COALESCE(completion_date, CURDATE()),
                     is_archived = 1,
                     archive_date = CURDATE() 
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
            $enrollment = $this->getEnrollmentRecord($traineeId, $enrollmentId);
            if (!$enrollment) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Unauthorized']);
                return;
            }

            $shouldRestoreActiveState = !$this->hasReachedEndDate($enrollment['end_date'] ?? null)
                && ($enrollment['status'] ?? '') === 'completed';

            $updateStmt = $this->conn->prepare(
                "UPDATE tbl_enrollment 
                 SET is_archived = 0,
                     archive_date = NULL,
                     status = CASE WHEN ? = 1 THEN 'approved' ELSE status END,
                     completion_date = CASE WHEN ? = 1 THEN NULL ELSE completion_date END
                 WHERE enrollment_id = ? AND trainee_id = ?"
            );
            $flag = $shouldRestoreActiveState ? 1 : 0;
            $updateStmt->execute([$flag, $flag, $enrollmentId, $traineeId]);

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
