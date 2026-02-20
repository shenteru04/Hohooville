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

$database = new Database();
$conn = $database->getConnection();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list-archived':
        listArchivedUsers($conn);
        break;
    case 'deactivate':
        deactivateUser($conn);
        break;
    case 'reactivate':
        reactivateUser($conn);
        break;
    case 'archive-trainee':
        archiveTrainee($conn);
        break;
    case 'restore-trainee':
        restoreTrainee($conn);
        break;
    case 'restore-trainer':
        restoreTrainer($conn);
        break;
    case 'get-archival-status':
        getArchivalStatus($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function listArchivedUsers($conn) {
    try {
        $type = $_GET['type'] ?? 'both'; // trainee, trainer, or both
        
        $result = ['archived_trainees' => [], 'archived_trainers' => []];
        
        if ($type === 'trainee' || $type === 'both') {
            $stmt = $conn->query("
                SELECT u.user_id, u.username, u.email, u.status, u.archived_at, u.archived_by, r.role_name
                FROM tbl_users u
                LEFT JOIN tbl_role r ON u.role_id = r.role_id
                WHERE u.is_archived = 1 AND r.role_name = 'Trainee'
                ORDER BY u.archived_at DESC
            ");
            $result['archived_trainees'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        if ($type === 'trainer' || $type === 'both') {
            $stmt = $conn->query("
                SELECT u.user_id, u.username, u.email, u.status, u.archived_at, u.archived_by, r.role_name
                FROM tbl_users u
                LEFT JOIN tbl_role r ON u.role_id = r.role_id
                WHERE u.is_archived = 1 AND r.role_name = 'Trainer'
                ORDER BY u.archived_at DESC
            ");
            $result['archived_trainers'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        echo json_encode(['success' => true, 'data' => $result]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deactivateUser($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $userId = $data['user_id'] ?? null;
        $userType = $data['user_type'] ?? 'trainee'; // trainee or trainer
        $reason = $data['reason'] ?? null;
        
        if (!$userId) throw new Exception('User ID required');
        
        $conn->beginTransaction();
        
        try {
            if ($userType === 'trainee') {
                // Deactivate trainee account and linked user
                $stmt = $conn->prepare("SELECT user_id FROM tbl_trainee_hdr WHERE trainee_id = ?");
                $stmt->execute([$userId]);
                $userAccountId = $stmt->fetchColumn();
                
                if ($userAccountId) {
                    $userStmt = $conn->prepare("UPDATE tbl_users SET status = 'inactive' WHERE user_id = ?");
                    $userStmt->execute([$userAccountId]);
                }
                
                $traineeStmt = $conn->prepare("UPDATE tbl_trainee_hdr SET status = 'inactive' WHERE trainee_id = ?");
                $traineeStmt->execute([$userId]);
            } else {
                // Deactivate trainer
                $stmt = $conn->prepare("SELECT user_id FROM tbl_trainer WHERE trainer_id = ?");
                $stmt->execute([$userId]);
                $userAccountId = $stmt->fetchColumn();
                
                if ($userAccountId) {
                    $userStmt = $conn->prepare("UPDATE tbl_users SET status = 'inactive' WHERE user_id = ?");
                    $userStmt->execute([$userAccountId]);
                }
                
                $trainerStmt = $conn->prepare("UPDATE tbl_trainer SET status = 'inactive' WHERE trainer_id = ?");
                $trainerStmt->execute([$userId]);
            }
            
            $conn->commit();
            echo json_encode(['success' => true, 'message' => ucfirst($userType) . ' deactivated successfully']);
        } catch (Exception $e) {
            $conn->rollBack();
            throw $e;
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function reactivateUser($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $userId = $data['user_id'] ?? null;
        $userType = $data['user_type'] ?? 'trainee';
        
        if (!$userId) throw new Exception('User ID required');
        
        $conn->beginTransaction();
        
        try {
            if ($userType === 'trainee') {
                $stmt = $conn->prepare("SELECT user_id FROM tbl_trainee_hdr WHERE trainee_id = ?");
                $stmt->execute([$userId]);
                $userAccountId = $stmt->fetchColumn();
                
                if ($userAccountId) {
                    $userStmt = $conn->prepare("UPDATE tbl_users SET status = 'active' WHERE user_id = ?");
                    $userStmt->execute([$userAccountId]);
                }
                
                $traineeStmt = $conn->prepare("UPDATE tbl_trainee_hdr SET status = 'active' WHERE trainee_id = ?");
                $traineeStmt->execute([$userId]);
            } else {
                $stmt = $conn->prepare("SELECT user_id FROM tbl_trainer WHERE trainer_id = ?");
                $stmt->execute([$userId]);
                $userAccountId = $stmt->fetchColumn();
                
                if ($userAccountId) {
                    $userStmt = $conn->prepare("UPDATE tbl_users SET status = 'active' WHERE user_id = ?");
                    $userStmt->execute([$userAccountId]);
                }
                
                $trainerStmt = $conn->prepare("UPDATE tbl_trainer SET status = 'active' WHERE trainer_id = ?");
                $trainerStmt->execute([$userId]);
            }
            
            $conn->commit();
            echo json_encode(['success' => true, 'message' => ucfirst($userType) . ' reactivated successfully']);
        } catch (Exception $e) {
            $conn->rollBack();
            throw $e;
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function archiveTrainee($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $traineeId = $data['trainee_id'] ?? null;
        $reason = $data['reason'] ?? null;
        
        if (!$traineeId) throw new Exception('Trainee ID required');
        
        // Soft archive (don't delete, just mark as archived)
        $stmt = $conn->prepare("UPDATE tbl_trainee_hdr SET status = 'inactive' WHERE trainee_id = ?");
        $stmt->execute([$traineeId]);
        
        echo json_encode(['success' => true, 'message' => 'Trainee archived successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function restoreTrainee($conn) {
    try {
        $traineeId = $_GET['trainee_id'] ?? null;
        if (!$traineeId) throw new Exception('Trainee ID required');
        
        $stmt = $conn->prepare("UPDATE tbl_trainee_hdr SET status = 'active' WHERE trainee_id = ?");
        $stmt->execute([$traineeId]);
        
        echo json_encode(['success' => true, 'message' => 'Trainee restored successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function restoreTrainer($conn) {
    try {
        $trainerId = $_GET['trainer_id'] ?? null;
        if (!$trainerId) throw new Exception('Trainer ID required');
        
        $stmt = $conn->prepare("UPDATE tbl_trainer SET status = 'active' WHERE trainer_id = ?");
        $stmt->execute([$trainerId]);
        
        echo json_encode(['success' => true, 'message' => 'Trainer restored successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getArchivalStatus($conn) {
    try {
        $result = [];
        
        // Count archived trainees (from tbl_users where is_archived=1 and role=trainee)
        $stmt = $conn->query("
            SELECT COUNT(*) FROM tbl_users u
            LEFT JOIN tbl_role r ON u.role_id = r.role_id
            WHERE u.is_archived = 1 AND r.role_name = 'Trainee'
        ");
        $result['archived_trainees'] = $stmt->fetchColumn();
        
        // Count archived trainers (from tbl_users where is_archived=1 and role=trainer)
        $stmt = $conn->query("
            SELECT COUNT(*) FROM tbl_users u
            LEFT JOIN tbl_role r ON u.role_id = r.role_id
            WHERE u.is_archived = 1 AND r.role_name = 'Trainer'
        ");
        $result['archived_trainers'] = $stmt->fetchColumn();
        
        // Count inactive users (status=inactive and not archived)
        $stmt = $conn->query("SELECT COUNT(*) FROM tbl_users WHERE status = 'inactive' AND is_archived = 0");
        $result['inactive_users'] = $stmt->fetchColumn();
        
        echo json_encode(['success' => true, 'data' => $result]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
