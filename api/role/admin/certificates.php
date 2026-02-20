<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    case 'eligible-trainees':
        getEligibleTrainees($conn);
        break;
    case 'generate':
        generateCertificates($conn);
        break;
    case 'get-certificate':
        getCertificate($conn);
        break;
    case 'list-certificates':
        listCertificates($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getEligibleTrainees($conn) {
    try {
        $stmt = $conn->query("
            SELECT 
                t.trainee_id,
                CONCAT(t.first_name, ' ', t.last_name) as trainee_name,
                q.qualification_name,
                e.batch_id,
                b.batch_name,
                AVG(g.score) as avg_score,
                COUNT(DISTINCT l.lesson_id) as lessons_completed,
                (SELECT COUNT(*) FROM tbl_lessons WHERE module_id IN (SELECT module_id FROM tbl_module WHERE qualification_id = q.qualification_id)) as total_lessons
            FROM tbl_trainee_hdr t
            JOIN tbl_enrollment e ON t.trainee_id = e.trainee_id
            JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
            JOIN tbl_qualifications q ON oq.qualification_id = q.qualification_id
            LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
            LEFT JOIN tbl_grades g ON t.trainee_id = g.trainee_id
            LEFT JOIN tbl_lessons l ON 1=1
            WHERE e.status = 'completed' OR (AVG(g.score) >= 80 AND e.status = 'approved')
            GROUP BY t.trainee_id, q.qualification_id
            HAVING AVG(g.score) >= 80
        ");
        $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $trainees]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function generateCertificates($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $traineeIds = $data['trainee_ids'] ?? [];
        if (empty($traineeIds)) {
            throw new Exception('No trainees selected');
        }
        
        // Ensure table exists
        $conn->exec("CREATE TABLE IF NOT EXISTS tbl_certificates (
            certificate_id INT AUTO_INCREMENT PRIMARY KEY,
            trainee_id INT NOT NULL,
            qualification_id INT NOT NULL,
            certificate_number VARCHAR(100) UNIQUE NOT NULL,
            issue_date DATE NOT NULL,
            valid_from DATE,
            valid_until DATE,
            certificate_file_path VARCHAR(255),
            issued_by INT COMMENT 'User ID of admin who issued',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        
        $generated = 0;
        $errors = [];
        
        foreach ($traineeIds as $traineeId) {
            try {
                // Get trainee and qualification info
                $stmt = $conn->prepare("
                    SELECT t.trainee_id, CONCAT(t.first_name, ' ', t.last_name) as trainee_name,
                           q.qualification_id, q.qualification_name
                    FROM tbl_trainee_hdr t
                    JOIN tbl_enrollment e ON t.trainee_id = e.trainee_id
                    JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
                    JOIN tbl_qualifications q ON oq.qualification_id = q.qualification_id
                    WHERE t.trainee_id = ? AND e.status IN ('completed', 'approved')
                    LIMIT 1
                ");
                $stmt->execute([$traineeId]);
                $trainee = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$trainee) continue;
                
                // Check if certificate already exists
                $checkStmt = $conn->prepare("SELECT certificate_id FROM tbl_certificates WHERE trainee_id = ? AND qualification_id = ?");
                $checkStmt->execute([$traineeId, $trainee['qualification_id']]);
                if ($checkStmt->fetch()) {
                    $errors[] = "Certificate already exists for trainee {$trainee['trainee_name']}";
                    continue;
                }
                
                // Generate certificate number (YEAR-RANDOMNUMBER)
                $certificateNumber = date('Y') . '-' . strtoupper(bin2hex(random_bytes(4)));
                
                // Create certificate record
                $insertStmt = $conn->prepare("
                    INSERT INTO tbl_certificates (trainee_id, qualification_id, certificate_number, issue_date, issued_by)
                    VALUES (?, ?, ?, CURDATE(), ?)
                ");
                $adminId = $data['issued_by'] ?? 1; // Default admin
                $insertStmt->execute([$traineeId, $trainee['qualification_id'], $certificateNumber, $adminId]);
                
                $generated++;
            } catch (Exception $e) {
                $errors[] = "Error for trainee {$traineeId}: " . $e->getMessage();
            }
        }
        
        echo json_encode([
            'success' => true,
            'generated' => $generated,
            'errors' => array_slice($errors, 0, 10)
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getCertificate($conn) {
    try {
        $certId = $_GET['cert_id'] ?? null;
        if (!$certId) throw new Exception('Certificate ID required');
        
        $stmt = $conn->prepare("
            SELECT c.*, t.trainee_id, CONCAT(t.first_name, ' ', t.last_name) as trainee_name,
                   q.qualification_name, u.username as issued_by_user
            FROM tbl_certificates c
            JOIN tbl_trainee_hdr t ON c.trainee_id = t.trainee_id
            JOIN tbl_qualifications q ON c.qualification_id = q.qualification_id
            LEFT JOIN tbl_users u ON c.issued_by = u.user_id
            WHERE c.certificate_id = ?
        ");
        $stmt->execute([$certId]);
        $certificate = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$certificate) throw new Exception('Certificate not found');
        
        echo json_encode(['success' => true, 'data' => $certificate]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function listCertificates($conn) {
    try {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = ($page - 1) * $limit;
        
        $stmt = $conn->query("
            SELECT c.certificate_id, c.certificate_number, 
                   CONCAT(t.first_name, ' ', t.last_name) as trainee_name,
                   q.qualification_name, c.issue_date, c.issued_by
            FROM tbl_certificates c
            JOIN tbl_trainee_hdr t ON c.trainee_id = t.trainee_id
            JOIN tbl_qualifications q ON c.qualification_id = q.qualification_id
            ORDER BY c.issue_date DESC
            LIMIT {$limit} OFFSET {$offset}
        ");
        $certificates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $countStmt = $conn->query("SELECT COUNT(*) FROM tbl_certificates");
        $total = $countStmt->fetchColumn();
        
        echo json_encode([
            'success' => true,
            'data' => $certificates,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
