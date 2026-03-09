<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../database/db.php';

class TrainerBatches {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $trainerId = $_GET['trainer_id'] ?? null;

        if (!$trainerId) {
            echo json_encode(['success' => false, 'message' => 'Trainer ID required']);
            return;
        }

        $this->getBatches($trainerId);
    }

    private function getBatches($trainerId) {
        try {
            $scheduleHasRoomId = $this->columnExists('tbl_schedule', 'room_id');
            $scheduleHasRoomText = $this->columnExists('tbl_schedule', 'room');
            $hasRoomsTable = $this->tableExists('tbl_rooms');
            $hasCourseCode = $this->columnExists('tbl_qualifications', 'ctpr_number');

            if ($scheduleHasRoomId && $hasRoomsTable) {
                $roomSelect = "COALESCE(r.room_name, 'TBA') AS room";
                $roomJoin = "LEFT JOIN tbl_rooms r ON s.room_id = r.room_id";
            } elseif ($scheduleHasRoomText) {
                $roomSelect = "COALESCE(NULLIF(TRIM(s.room), ''), 'TBA') AS room";
                $roomJoin = "";
            } elseif ($scheduleHasRoomId) {
                $roomSelect = "COALESCE(CAST(s.room_id AS CHAR), 'TBA') AS room";
                $roomJoin = "";
            } else {
                $roomSelect = "'TBA' AS room";
                $roomJoin = "";
            }

            $courseCodeSelect = $hasCourseCode ? "c.ctpr_number as course_code," : "NULL as course_code,";

            $query = "SELECT b.batch_id, b.batch_name, b.qualification_id, c.qualification_name as course_name, $courseCodeSelect c.duration, s.schedule, $roomSelect, b.status, b.start_date, b.end_date
                      FROM tbl_batch b
                      LEFT JOIN tbl_qualifications c ON b.qualification_id = c.qualification_id
                      LEFT JOIN tbl_schedule s ON b.batch_id = s.batch_id
                      $roomJoin
                      WHERE b.trainer_id = ?
                      ORDER BY b.status DESC, b.batch_id DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$trainerId]);
            $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $batches]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function tableExists(string $table): bool {
        $stmt = $this->conn->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        return (bool)$stmt->fetchColumn();
    }

    private function columnExists(string $table, string $column): bool {
        if (!$this->tableExists($table)) return false;
        $stmt = $this->conn->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
        $stmt->execute([$column]);
        return (bool)$stmt->fetchColumn();
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TrainerBatches($db);
$api->handleRequest();
?>
