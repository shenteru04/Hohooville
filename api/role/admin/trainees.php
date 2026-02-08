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
    case 'get-form-data':
        getFormData($conn);
        break;
    case 'list':
        getTrainees($conn);
        break;
    case 'add':
        addTrainee($conn);
        break;
    case 'update':
        updateTrainee($conn);
        break;
    case 'toggle-status':
        toggleStatus($conn);
        break;
    case 'create-account':
        createTraineeAccount($conn);
        break;
    case 'delete':
        deleteTrainee($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getFormData($conn) {
    try {
        $stmtCourses = $conn->query("SELECT qualification_id as course_id, qualification_name as course_name FROM tbl_qualifications WHERE status = 'active' ORDER BY qualification_name ASC");
        $courses = $stmtCourses->fetchAll(PDO::FETCH_ASSOC);

        $stmtBatches = $conn->query("SELECT batch_id, batch_name FROM tbl_batch WHERE status = 'open' ORDER BY batch_id DESC");
        $batches = $stmtBatches->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => ['courses' => $courses, 'batches' => $batches]]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getTrainees($conn) {
    try {
        $stmt = $conn->query("
            SELECT t.*, b.batch_name, c.qualification_name as course_name
            FROM tbl_trainee_hdr t 
            JOIN tbl_enrollment e ON t.trainee_id = e.trainee_id 
            LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id 
            LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
            LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
            WHERE e.status = 'approved'
            ORDER BY t.trainee_id DESC
        ");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function addTrainee($conn) {
    try {
        // Using $_POST and $_FILES for multipart/form-data
        $data = $_POST;
        
        if (empty($data['first_name']) || empty($data['last_name']) || empty($data['course_id']) || empty($data['batch_id'])) {
            throw new Exception('Please fill in all required fields (Name, Course, Batch)');
        }
        
        $conn->beginTransaction();

        // 1. Handle File Uploads
        $uploadDir = '../../../uploads/trainees/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

        $validIdPath = null;
        $birthCertPath = null;
        $photoPath = null;

        if (isset($_FILES['valid_id']) && $_FILES['valid_id']['error'] === UPLOAD_ERR_OK) {
            $validIdPath = 'valid_id_' . time() . '_' . $_FILES['valid_id']['name'];
            move_uploaded_file($_FILES['valid_id']['tmp_name'], $uploadDir . $validIdPath);
        }
        if (isset($_FILES['birth_cert']) && $_FILES['birth_cert']['error'] === UPLOAD_ERR_OK) {
            $birthCertPath = 'birth_' . time() . '_' . $_FILES['birth_cert']['name'];
            move_uploaded_file($_FILES['birth_cert']['tmp_name'], $uploadDir . $birthCertPath);
        }
        if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            $photoPath = 'photo_' . time() . '_' . $_FILES['photo']['name'];
            move_uploaded_file($_FILES['photo']['tmp_name'], $uploadDir . $photoPath);
        }

        // Fetch Course Details (CTPR & Duration) to save in Trainee record
        $ctprNo = null;
        $nominalDuration = null;
        if (!empty($data['course_id'])) {
            $stmtCourse = $conn->prepare("SELECT ctpr_number, duration FROM tbl_qualifications WHERE qualification_id = ?");
            $stmtCourse->execute([$data['course_id']]);
            $courseDetails = $stmtCourse->fetch(PDO::FETCH_ASSOC);
            if ($courseDetails) {
                $ctprNo = $courseDetails['ctpr_number'];
                $nominalDuration = $courseDetails['duration'];
            }
        }

        // 2. Insert into tbl_trainee (User ID is NULL initially)
        $stmt = $conn->prepare("INSERT INTO tbl_trainee_hdr (first_name, last_name, email, phone_number, birth_certificate_no, address, ctpr_no, nominal_duration, valid_id_file, birth_cert_file, photo_file, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')");
        
        $stmt->execute([
            $data['first_name'],
            $data['last_name'],
            $data['email'],
            $data['phone'],
            $data['birth_certificate_no'] ?? null,
            $data['address'],
            $ctprNo,
            $nominalDuration,
            $validIdPath,
            $birthCertPath,
            $photoPath
        ]);
        $traineeId = $conn->lastInsertId();

        // 3. Handle Enrollment
        // Check/Create Offered Course
        $stmtOffered = $conn->prepare("SELECT offered_qualification_id FROM tbl_offered_qualifications WHERE qualification_id = ? LIMIT 1");
        $stmtOffered->execute([$data['course_id']]);
        $offered = $stmtOffered->fetch(PDO::FETCH_ASSOC);
        
        if ($offered) {
            $offeredId = $offered['offered_qualification_id'];
        } else {
            $stmtInsOffered = $conn->prepare("INSERT INTO tbl_offered_qualifications (qualification_id) VALUES (?)");
            $stmtInsOffered->execute([$data['course_id']]);
            $offeredId = $conn->lastInsertId();
        }

        // Insert Enrollment (Pending - Sent to Approval Queue for Document Verification)
        $stmtEnroll = $conn->prepare("INSERT INTO tbl_enrollment (trainee_id, offered_qualification_id, batch_id, enrollment_date, status) VALUES (?, ?, ?, CURDATE(), 'pending')");
        $stmtEnroll->execute([$traineeId, $offeredId, $data['batch_id']]);
        $enrollmentId = $conn->lastInsertId();

        // Insert Enrolled Trainee
        $stmtEnrolled = $conn->prepare("INSERT INTO tbl_enrolled_trainee (enrollment_id, trainee_id) VALUES (?, ?)");
        $stmtEnrolled->execute([$enrollmentId, $traineeId]);

        // Insert Scholarship if selected
        if (!empty($data['scholarship'])) {
            $stmtSch = $conn->prepare("INSERT INTO tbl_scholarship (trainee_id, scholarship_name, date_granted) VALUES (?, ?, CURDATE())");
            $stmtSch->execute([$traineeId, $data['scholarship']]);
        }
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Trainee added successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function createTraineeAccount($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['trainee_id']) || empty($data['username']) || empty($data['password'])) {
            throw new Exception('Username and Password are required');
        }

        $conn->beginTransaction();

        // 1. Get Trainee Email and check if account exists
        $stmt = $conn->prepare("SELECT email, user_id FROM tbl_trainee_hdr WHERE trainee_id = ?");
        $stmt->execute([$data['trainee_id']]);
        $trainee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$trainee) throw new Exception('Trainee not found');
        if (!empty($trainee['user_id'])) throw new Exception('Trainee already has an account');

        // Check if username exists
        $stmtCheck = $conn->prepare("SELECT user_id FROM tbl_users WHERE username = ?");
        $stmtCheck->execute([$data['username']]);
        if ($stmtCheck->fetch()) throw new Exception('Username already exists');

        // 2. Get Role ID for 'trainee'
        $stmtRole = $conn->prepare("SELECT role_id FROM tbl_role WHERE role_name = ? LIMIT 1");
        $stmtRole->execute(['trainee']);
        $role = $stmtRole->fetch(PDO::FETCH_ASSOC);
        
        if ($role) {
            $roleId = $role['role_id'];
        } else {
            $stmtInsRole = $conn->prepare("INSERT INTO tbl_role (role_name) VALUES (?)");
            $stmtInsRole->execute(['trainee']);
            $roleId = $conn->lastInsertId();
        }

        // 3. Create User
        $hashed = password_hash($data['password'], PASSWORD_DEFAULT);
        $stmtUser = $conn->prepare("INSERT INTO tbl_users (role_id, username, password, email, status, date_created) VALUES (?, ?, ?, ?, 'active', NOW())");
        $stmtUser->execute([$roleId, $data['username'], $hashed, $trainee['email']]);
        $userId = $conn->lastInsertId();

        // 4. Link User to Trainee
        $stmtUpdate = $conn->prepare("UPDATE tbl_trainee_hdr SET user_id = ? WHERE trainee_id = ?");
        $stmtUpdate->execute([$userId, $data['trainee_id']]);

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Account created successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateTrainee($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['trainee_id'])) {
            throw new Exception('Trainee ID is required');
        }
        
        $conn->beginTransaction();

        // Update Trainee details
        $stmt = $conn->prepare("UPDATE tbl_trainee_hdr SET first_name = ?, last_name = ?, phone_number = ?, address = ? WHERE trainee_id = ?");
        $stmt->execute([
            $data['first_name'],
            $data['last_name'],
            $data['phone'],
            $data['address'],
            $data['trainee_id']
        ]);

        // Update Email in Users table if needed
        $stmt = $conn->prepare("SELECT user_id FROM tbl_trainee_hdr WHERE trainee_id = ?");
        $stmt->execute([$data['trainee_id']]);
        $trainee = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($trainee && $trainee['user_id'] && !empty($data['email'])) {
            $stmt = $conn->prepare("UPDATE tbl_users SET email = ? WHERE user_id = ?");
            $stmt->execute([$data['email'], $trainee['user_id']]);
        }
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Trainee updated successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function toggleStatus($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['trainee_id'] ?? null;
        $status = $data['status'] ?? 'active'; // 'active' or 'inactive'
        
        if (!$id) throw new Exception('ID required');
        
        $stmt = $conn->prepare("UPDATE tbl_trainee_hdr SET status = ? WHERE trainee_id = ?");
        $stmt->execute([$status, $id]);
        
        echo json_encode(['success' => true, 'message' => 'Trainee status updated']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function deleteTrainee($conn) {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) throw new Exception('ID required');
        
        // Get user_id to delete the user account (Cascades to trainee)
        $stmt = $conn->prepare("SELECT user_id FROM tbl_trainee_hdr WHERE trainee_id = ?");
        $stmt->execute([$id]);
        $trainee = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($trainee && $trainee['user_id']) {
            $stmt = $conn->prepare("DELETE FROM tbl_users WHERE user_id = ?");
            $stmt->execute([$trainee['user_id']]);
        } else {
            $stmt = $conn->prepare("DELETE FROM tbl_trainee_hdr WHERE trainee_id = ?");
            $stmt->execute([$id]);
        }
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>