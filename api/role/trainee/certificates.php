<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';

class TraineeCertificates {
    private $conn;
    public function __construct($db) {
        $this->conn = $db;
    }

    private function moduleStatusColumnExists(): bool {
        static $exists = null;
        if ($exists !== null) {
            return $exists;
        }

        try {
            $stmt = $this->conn->prepare("SHOW COLUMNS FROM `tbl_module` LIKE 'module_status'");
            $stmt->execute();
            $exists = (bool)$stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $exists = false;
        }

        return $exists;
    }

    private function publishedModuleFilter(string $alias = 'm'): string {
        return $this->moduleStatusColumnExists()
            ? " AND COALESCE($alias.module_status, 'published') = 'published'"
            : '';
    }

    public function handleRequest() {
        $traineeId = $_GET['trainee_id'] ?? null;
        if (!$traineeId) {
            echo json_encode(['success' => false, 'message' => 'Trainee ID required']);
            return;
        }
        try {
            // Fetch certificates for each finished unit of competency (using tbl_certificate)
            $query = "SELECT m.module_id, m.module_title, m.competency_type, c.certificate_id, c.qualification_id, c.issue_date, c.validity_date, c.certificate_status
                      FROM tbl_module m
                      JOIN tbl_certificate c ON m.qualification_id = c.qualification_id AND c.trainee_id = ?
                      WHERE c.certificate_status = 'issued'" . $this->publishedModuleFilter('m') . "
                      ORDER BY m.competency_type, m.module_title";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$traineeId]);
            $certificates = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $certificates]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TraineeCertificates($db);
$api->handleRequest();
