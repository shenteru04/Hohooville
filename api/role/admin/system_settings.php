<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
require_once '../../database/db.php';

class SystemSettings {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = isset($_REQUEST['action']) ? $_REQUEST['action'] : '';

        if ($action === 'list') {
            $this->getSettings();
        } elseif ($action === 'get-holidays') {
            $this->getHolidays();
        } elseif ($action === 'save-holiday') {
            $this->saveHoliday();
        } elseif ($action === 'delete-holiday') {
            $this->deleteHoliday();
        } elseif ($action === 'get-eligible-trainees') {
            $this->getEligibleTrainees();
        } elseif ($action === 'generate-certificates') {
            $this->generateCertificates();
        } elseif ($action === 'get-certificate-stats') {
            $this->getCertificateStats();
        } else {
            // Mock other endpoints to prevent 404s
            echo json_encode(['success' => true, 'data' => []]);
        }
    }

    private function getSettings() {
        $stmt = $this->conn->query("SELECT * FROM tbl_system_settings");
        $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $settings]);
    }

    private function getHolidays() {
        try {
            $stmt = $this->conn->query("SELECT * FROM tbl_holidays ORDER BY holiday_date DESC");
            $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $holidays]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function saveHoliday() {
        $name = $_POST['holiday_name'] ?? '';
        $date = $_POST['holiday_date'] ?? '';
        $type = $_POST['holiday_type'] ?? 'national';
        $desc = $_POST['description'] ?? '';

        if (empty($name) || empty($date)) {
            echo json_encode(['success' => false, 'message' => 'Holiday Name and Date are required']);
            return;
        }

        try {
            $sql = "INSERT INTO tbl_holidays (holiday_name, holiday_date, holiday_type, description, is_active) VALUES (:name, :date, :type, :desc, 1)";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':name' => $name,
                ':date' => $date,
                ':type' => $type,
                ':desc' => $desc
            ]);
            echo json_encode(['success' => true, 'message' => 'Holiday saved successfully']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()]);
        }
    }

    private function deleteHoliday() {
        $id = $_POST['holiday_id'] ?? '';
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'Invalid ID']);
            return;
        }
        try {
            $stmt = $this->conn->prepare("DELETE FROM tbl_holidays WHERE holiday_id = :id");
            $stmt->execute([':id' => $id]);
            echo json_encode(['success' => true, 'message' => 'Holiday deleted successfully']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function getEligibleTrainees() {
        try {
            // Logic: Get trainees who are 'approved' in enrollment but do NOT have a certificate for that qualification yet.
            // Also fetches average score from grades if available.
            $sql = "
                SELECT 
                    t.trainee_id, t.first_name, t.last_name, 
                    q.qualification_id, q.qualification_name,
                    (SELECT AVG(score) FROM tbl_grades g WHERE g.trainee_id = t.trainee_id AND g.qualification_id = q.qualification_id) as final_score
                FROM tbl_enrollment e
                JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
                JOIN tbl_qualifications q ON e.offered_qualification_id = q.qualification_id
                WHERE e.status = 'approved'
                AND NOT EXISTS (
                    SELECT 1 FROM tbl_certificate c 
                    WHERE c.trainee_id = t.trainee_id 
                    AND c.qualification_id = q.qualification_id
                )
            ";
            $stmt = $this->conn->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function generateCertificates() {
        $data = json_decode(file_get_contents("php://input"), true);
        $trainees = $data['trainees'] ?? [];

        if (empty($trainees)) {
            echo json_encode(['success' => false, 'message' => 'No trainees selected']);
            return;
        }

        try {
            $this->conn->beginTransaction();
            $sql = "INSERT INTO tbl_certificate (trainee_id, qualification_id, issue_date, certificate_status) VALUES (:tid, :qid, CURDATE(), 'valid')";
            $stmt = $this->conn->prepare($sql);

            foreach ($trainees as $t) {
                $stmt->execute([
                    ':tid' => $t['trainee_id'],
                    ':qid' => $t['qualification_id']
                ]);
            }
            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Certificates generated successfully']);
        } catch (Exception $e) {
            $this->conn->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function getCertificateStats() {
        try {
            $stmt = $this->conn->query("SELECT COUNT(*) as total_issued FROM tbl_certificate");
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $result]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$settings = new SystemSettings($db);
$settings->handleRequest();
?>