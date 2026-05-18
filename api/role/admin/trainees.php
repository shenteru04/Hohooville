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
require_once '../../utils/PermissionChecker.php';
require_once '../../utils/trainer_assignment_helper.php';

$database = new Database();
$conn = $database->getConnection();
ta_ensure_schema($conn);

$action = isset($_GET['action']) ? $_GET['action'] : '';

try {
    // Get JWT token from headers
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    // If no auth header, allow access for now (graceful degradation)
    if (!$authHeader) {
        $permissionChecker = null;
    } else {
        // Extract token
        $token = str_replace('Bearer ', '', $authHeader);
        
        // Decode JWT to get user_id and role_id
        $tokenParts = explode('.', $token);
        if (count($tokenParts) !== 3) {
            $permissionChecker = null;
        } else {
            $payload = json_decode(base64url_decode($tokenParts[1]), true);
            $userId = $payload['user_id'] ?? null;
            $roleId = $payload['role_id'] ?? null;

            if (!$userId || !$roleId) {
                $permissionChecker = null;
            } else {
                // Initialize permission checker
                $permissionChecker = new PermissionChecker($conn, $userId, $roleId);
            }
        }
    }

    // Check permissions based on action (only if permission checker is available)
    switch ($action) {
        case 'get-form-data':
            if ($permissionChecker) $permissionChecker->requirePermission('trainees.view');
            getFormData($conn);
            break;
        case 'list':
            if ($permissionChecker) $permissionChecker->requirePermission('trainees.view');
            getTrainees($conn);
            break;
        case 'add':
            if ($permissionChecker) $permissionChecker->requirePermission('trainees.create');
            addTrainee($conn);
            break;
        case 'update':
            if ($permissionChecker) $permissionChecker->requirePermission('trainees.update');
            updateTrainee($conn);
            break;
        case 'toggle-status':
            if ($permissionChecker) $permissionChecker->requirePermission('trainees.update');
            toggleStatus($conn);
            break;
        case 'create-account':
            if ($permissionChecker) $permissionChecker->requirePermission('trainees.create');
            createAccount($conn);
            break;
        case 'approve-enrollment':
            if ($permissionChecker) $permissionChecker->requirePermission('trainees.approve');
            approveEnrollment($conn);
            break;
        case 'delete':
            if ($permissionChecker) $permissionChecker->requirePermission('trainees.delete');
            deleteTrainee($conn);
            break;
        case 'get-batches':
            if ($permissionChecker) $permissionChecker->requirePermission('trainees.view');
            getBatches($conn);
            break;
        case 'get-batch-trainees':
            if ($permissionChecker) $permissionChecker->requirePermission('trainees.view');
            getBatchTrainees($conn);
            break;
        case 'check-and-close-batches':
            if ($permissionChecker) $permissionChecker->requirePermission('batches.manage');
            checkAndCloseBatches($conn);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
} catch (Throwable $e) {
    error_log("Fatal error in trainees.php action '{$action}': " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

// Helper function for base64url decode
function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

function getFormData($conn) {
    try {
        $stmtCourses = $conn->query("SELECT qualification_id as course_id, qualification_name as course_name FROM tbl_qualifications WHERE status = 'active' ORDER BY qualification_name ASC");
        $courses = $stmtCourses->fetchAll(PDO::FETCH_ASSOC);

        $stmtBatches = $conn->query("
            SELECT b.batch_id, b.batch_name, 
                   (SELECT COUNT(*) FROM tbl_enrollment e WHERE e.batch_id = b.batch_id AND e.status = 'approved') as enrolled_count
            FROM tbl_batch b 
            WHERE b.status = 'open' 
            ORDER BY b.batch_id DESC
        ");
        $batches = $stmtBatches->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => ['courses' => $courses, 'batches' => $batches]]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getTrainees($conn) {
    try {
        // Check if database connection is active
        if (!$conn) {
            throw new Exception('Database connection lost');
        }

        $stmt = $conn->query("
            SELECT
                t.trainee_id, t.user_id, t.trainee_school_id, t.first_name, t.last_name, t.email, t.phone_number, t.status,
                t.photo_file, t.valid_id_file, t.birth_cert_file, t.address, COALESCE(t.profile_image, '') as profile_image,
                e.batch_id, b.batch_name, c.qualification_name as course_name, e.enrollment_date, DATE_FORMAT(e.enrollment_date, '%Y-%m-%d %H:%i:%s') as formatted_enrollment_date
            FROM tbl_trainee_hdr t
            JOIN tbl_enrollment e ON t.trainee_id = e.trainee_id
            LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
            LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
            LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
            WHERE e.status = 'approved'
            ORDER BY t.trainee_id DESC
        ");
        
        if (!$stmt) {
            throw new Exception('Failed to execute query');
        }

        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Handle empty result set
        if (empty($data)) {
            echo json_encode(['success' => true, 'data' => [], 'message' => 'No trainees found']);
            return;
        }
        
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (PDOException $e) {
        error_log("Database error in getTrainees: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error occurred. Please try again.']);
    } catch (Exception $e) {
        error_log("Error in getTrainees: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function addTrainee($conn) {
    try {
        // Using $_POST and $_FILES for multipart/form-data
        $data = $_POST;
        
        // Validate required fields with better error messages
        $requiredFields = ['first_name', 'last_name', 'course_id', 'batch_id'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                $missingFields[] = $field;
            }
        }
        
        if (!empty($missingFields)) {
            throw new Exception('Missing required fields: ' . implode(', ', $missingFields));
        }

        // Sanitize input data
        $firstName = trim($data['first_name']);
        $lastName = trim($data['last_name']);
        $email = isset($data['email']) ? trim($data['email']) : null;
        
        // Validate email format if provided
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format');
        }

        // Check if batch exists and is not closed
        $stmtBatch = $conn->prepare("SELECT status, max_trainees FROM tbl_batch WHERE batch_id = ?");
        $stmtBatch->execute([$data['batch_id']]);
        $batch = $stmtBatch->fetch(PDO::FETCH_ASSOC);
        
        if (!$batch) {
            throw new Exception('Batch not found');
        }
        
        if ($batch['status'] === 'closed') {
            throw new Exception('This batch is full and cannot accept new trainees.');
        }
        
        $conn->beginTransaction();

        // 1. Handle File Uploads with validation
        $uploadDir = '../../../uploads/trainees/';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                throw new Exception('Failed to create upload directory');
            }
        }

        $validIdPath = null;
        $birthCertPath = null;
        $photoPath = null;

        // Allowed file types and max size (5MB)
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/jfif', 'application/pdf'];
        $maxFileSize = 5 * 1024 * 1024; // 5MB

        if (isset($_FILES['valid_id']) && $_FILES['valid_id']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['valid_id'];
            if ($file['size'] > $maxFileSize) {
                throw new Exception('Valid ID file size exceeds 5MB limit');
            }
            if (!in_array($file['type'], $allowedTypes)) {
                throw new Exception('Invalid file type for Valid ID. Allowed: JPG, PNG, JFIF, PDF');
            }
            $validIdPath = 'valid_id_' . time() . '_' . basename($file['name']);
            if (!move_uploaded_file($file['tmp_name'], $uploadDir . $validIdPath)) {
                throw new Exception('Failed to upload Valid ID file');
            }
        }

        if (isset($_FILES['birth_cert']) && $_FILES['birth_cert']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['birth_cert'];
            if ($file['size'] > $maxFileSize) {
                throw new Exception('Birth certificate file size exceeds 5MB limit');
            }
            if (!in_array($file['type'], $allowedTypes)) {
                throw new Exception('Invalid file type for Birth Certificate. Allowed: JPG, PNG, JFIF, PDF');
            }
            $birthCertPath = 'birth_' . time() . '_' . basename($file['name']);
            if (!move_uploaded_file($file['tmp_name'], $uploadDir . $birthCertPath)) {
                throw new Exception('Failed to upload Birth Certificate file');
            }
        }

        if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['photo'];
            if ($file['size'] > $maxFileSize) {
                throw new Exception('Photo file size exceeds 5MB limit');
            }
            if (!in_array($file['type'], $allowedTypes)) {
                throw new Exception('Invalid file type for Photo. Allowed: JPG, PNG, JFIF');
            }
            $photoPath = 'photo_' . time() . '_' . basename($file['name']);
            if (!move_uploaded_file($file['tmp_name'], $uploadDir . $photoPath)) {
                throw new Exception('Failed to upload Photo file');
            }
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
        $stmt = $conn->prepare("INSERT INTO tbl_trainee_hdr (first_name, last_name, email, phone_number, birth_certificate_no, address, valid_id_file, birth_cert_file, photo_file, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')");
        
        $stmt->execute([
            $data['first_name'],
            $data['last_name'],
            $data['email'],
            $data['phone'],
            $data['birth_certificate_no'] ?? null,
            $data['address'],
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
        $stmtEnroll = $conn->prepare("INSERT INTO tbl_enrollment (trainee_id, offered_qualification_id, batch_id, enrollment_date, status) VALUES (?, ?, ?, NOW(), 'pending')");
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
    } catch (PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        error_log("Database error in addTrainee: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error occurred. Please try again.']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        error_log("Error in addTrainee: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function createAccount($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['trainee_id']) || empty($data['username']) || empty($data['password'])) {
            throw new Exception('Username and Password are required');
        }

        $username = trim((string) $data['username']);
        $password = (string) $data['password'];

        if ($username === '' || $password === '') {
            throw new Exception('Username and Password are required');
        }

        if (!preg_match('/^[A-Za-z0-9_]+$/', $username)) {
            throw new Exception('Username can only contain letters, numbers, and underscores.');
        }

        $conn->beginTransaction();

        // 1. Get Trainee Email and check if account exists
        $stmt = $conn->prepare("SELECT email, user_id, first_name, last_name FROM tbl_trainee_hdr WHERE trainee_id = ?");
        $stmt->execute([$data['trainee_id']]);
        $trainee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$trainee) throw new Exception('Trainee not found');
        if (!empty($trainee['user_id'])) throw new Exception('Trainee already has an account');
        if (empty($trainee['email'])) throw new Exception('Trainee email is required before creating an account');

        // Check if username exists
        $stmtCheck = $conn->prepare("SELECT user_id FROM tbl_users WHERE username = ?");
        $stmtCheck->execute([$username]);
        if ($stmtCheck->fetch()) throw new Exception('Username already exists');

        // Check if email is already used by another user account
        $stmtCheckEmail = $conn->prepare("SELECT user_id FROM tbl_users WHERE email = ?");
        $stmtCheckEmail->execute([$trainee['email']]);
        if ($stmtCheckEmail->fetch()) throw new Exception('This trainee email is already linked to another user account');

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
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $stmtUser = $conn->prepare("INSERT INTO tbl_users (role_id, username, password, email, status, date_created) VALUES (?, ?, ?, ?, 'active', NOW())");
        $stmtUser->execute([$roleId, $username, $hashed, $trainee['email']]);
        $userId = $conn->lastInsertId();

        // 4. Link User to Trainee
        $stmtUpdate = $conn->prepare("UPDATE tbl_trainee_hdr SET user_id = ? WHERE trainee_id = ?");
        $stmtUpdate->execute([$userId, $data['trainee_id']]);
        // 5. Send credentials email (best-effort)
        try {
            require_once __DIR__ . '/../../utils/EmailService.php';
            $emailSvc = new EmailService();
            $traineeName = ($trainee['first_name'] ?? '') . ' ' . ($trainee['last_name'] ?? '');
            $sendResult = $emailSvc->sendTraineeAccountCredentials($trainee['email'], trim($traineeName), $username, $password);
            // log result for debugging
            if (!$sendResult['success']) {
                error_log('Trainee account email failed: ' . $sendResult['message']);
            }
        } catch (Exception $e) {
            error_log('Email service error: ' . $e->getMessage());
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Account created successfully']);
    } catch (Exception $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function approveEnrollment($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $enrollmentId = $data['enrollment_id'] ?? null;

        if (!$enrollmentId) {
            throw new Exception('Enrollment ID is required.');
        }

        $conn->beginTransaction();

        // 1. Get batch_id from enrollment
        $stmtEnroll = $conn->prepare("SELECT batch_id FROM tbl_enrollment WHERE enrollment_id = ?");
        $stmtEnroll->execute([$enrollmentId]);
        $batchId = $stmtEnroll->fetchColumn();

        if (!$batchId) {
            throw new Exception('Enrollment not found or not linked to a batch.');
        }

        // 2. Update enrollment status to 'approved'
        $stmtApprove = $conn->prepare("UPDATE tbl_enrollment SET status = 'approved' WHERE enrollment_id = ?");
        $stmtApprove->execute([$enrollmentId]);

        // 3. Check batch capacity and close if full
        checkAndCloseBatch($conn, $batchId);

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Trainee approved successfully.']);

    } catch (Exception $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function checkAndCloseBatch($conn, $batchId) {
    if (!$batchId) return;
    
    // Get batch info including max_trainees
    $stmtBatch = $conn->prepare("SELECT batch_id, qualification_id, max_trainees, training_cost, batch_name, trainer_id, scholarship_type, scholarship_type_id, status FROM tbl_batch WHERE batch_id = ?");
    $stmtBatch->execute([$batchId]);
    $batch = $stmtBatch->fetch(PDO::FETCH_ASSOC);
    
    if (!$batch) return;
    
    // Count approved trainees in this batch
    $stmtCount = $conn->prepare("SELECT COUNT(*) FROM tbl_enrollment WHERE batch_id = ? AND status = 'approved'");
    $stmtCount->execute([$batchId]);
    $traineeCount = $stmtCount->fetchColumn();
    
    // Check if batch is full
    if ($traineeCount >= $batch['max_trainees'] && $batch['status'] !== 'closed') {
        // Close the current batch
        $stmtClose = $conn->prepare("UPDATE tbl_batch SET status = 'closed' WHERE batch_id = ?");
        $stmtClose->execute([$batchId]);
        
        // Check if there's an open batch for this qualification already
        $stmtCheckOpen = $conn->prepare("SELECT batch_id FROM tbl_batch WHERE qualification_id = ? AND status = 'open' LIMIT 1");
        $stmtCheckOpen->execute([$batch['qualification_id']]);
        $openBatch = $stmtCheckOpen->fetch(PDO::FETCH_ASSOC);
        
        // If no open batch exists for this qualification, create one
        if (!$openBatch) {
            createNextBatch($conn, $batch);
        }
    }
}

function createNextBatch($conn, $previousBatch) {
    try {
        // Generate new batch name
        $qualId = $previousBatch['qualification_id'];
        $stmtGetQual = $conn->prepare("SELECT qualification_name FROM tbl_qualifications WHERE qualification_id = ?");
        $stmtGetQual->execute([$qualId]);
        $qual = $stmtGetQual->fetch(PDO::FETCH_ASSOC);
        
        if (!$qual) return;
        
        // Count existing batches for this qualification to determine sequence
        $stmtCount = $conn->prepare("SELECT COUNT(*) FROM tbl_batch WHERE qualification_id = ? AND batch_name LIKE ?");
        $stmtCount->execute([$qualId, $qual['qualification_name'] . '%']);
        $batchSequence = $stmtCount->fetchColumn() + 1;
        
        $newBatchName = $qual['qualification_name'] . ' - Batch ' . $batchSequence;
        
        // Calculate new start and end dates (assume 1 month training)
        $startDate = date('Y-m-d'); // Today
        $endDate = date('Y-m-d', strtotime('+1 month'));
        
        // Create new batch with same properties as previous
        $stmtInsert = $conn->prepare("INSERT INTO tbl_batch (qualification_id, trainer_id, batch_name, scholarship_type, scholarship_type_id, start_date, end_date, status, max_trainees, training_cost) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)");
        $stmtInsert->execute([
            $qualId,
            $previousBatch['trainer_id'],
            $newBatchName,
            $previousBatch['scholarship_type'],
            $previousBatch['scholarship_type_id'],
            $startDate,
            $endDate,
            $previousBatch['max_trainees'],
            $previousBatch['training_cost'] ?? null
        ]);
        
        return $conn->lastInsertId();
    } catch (Exception $e) {
        // Log error but don't throw - batch creation failure shouldn't block enrollment approval
        error_log("Batch auto-creation failed: " . $e->getMessage());
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

function getBatches($conn) {
    try {
        $stmt = $conn->query("
            SELECT b.batch_id, b.batch_name, b.status,
                   (SELECT COUNT(*) FROM tbl_enrollment e WHERE e.batch_id = b.batch_id AND e.status = 'approved') as enrolled_count
            FROM tbl_batch b
            ORDER BY b.batch_id DESC
        ");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getBatchTrainees($conn) {
    try {
        $batchId = $_GET['batch_id'] ?? null;
        if (!$batchId) throw new Exception('Batch ID required');

        $stmt = $conn->prepare("
            SELECT 
                t.trainee_id,
                t.trainee_school_id,
                t.first_name,
                t.last_name,
                t.email,
                t.phone_number,
                t.status,
                e.enrollment_date,
                DATE_FORMAT(e.enrollment_date, '%M %e, %Y') AS formatted_enrollment_date
            FROM tbl_trainee_hdr t
            JOIN tbl_enrollment e ON t.trainee_id = e.trainee_id
            WHERE e.batch_id = ? AND e.status = 'approved'
            ORDER BY e.enrollment_date DESC, t.last_name ASC
        ");
        $stmt->execute([$batchId]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function checkAndCloseBatches($conn) {
    try {
        $conn->beginTransaction();
        $closedCount = 0;
        $createdCount = 0;
        $details = [];

        // Find all open batches that have reached or exceeded max_trainees
        $stmtBatches = $conn->prepare("
            SELECT 
                b.batch_id, 
                b.qualification_id, 
                b.batch_name, 
                b.max_trainees,
                b.training_cost,
                b.trainer_id,
                b.scholarship_type,
                b.scholarship_type_id,
                COUNT(e.enrollment_id) as enrolled_count
            FROM tbl_batch b
            LEFT JOIN tbl_enrollment e ON b.batch_id = e.batch_id AND e.status = 'approved'
            WHERE b.status = 'open'
            GROUP BY b.batch_id, b.qualification_id, b.batch_name, b.max_trainees, b.trainer_id, b.scholarship_type, b.scholarship_type_id
            HAVING enrolled_count >= b.max_trainees
        ");
        $stmtBatches->execute();
        $batchesToClose = $stmtBatches->fetchAll(PDO::FETCH_ASSOC);

        foreach ($batchesToClose as $batch) {
            // Close the batch
            $stmtClose = $conn->prepare("UPDATE tbl_batch SET status = 'closed' WHERE batch_id = ?");
            $stmtClose->execute([$batch['batch_id']]);
            $closedCount++;

            $details[] = "Closed batch: {$batch['batch_name']} (ID: {$batch['batch_id']}) with {$batch['enrolled_count']} trainees";

            // Check if an open batch already exists for this qualification
            $stmtCheckOpen = $conn->prepare("
                SELECT batch_id FROM tbl_batch 
                WHERE qualification_id = ? AND status = 'open' 
                LIMIT 1
            ");
            $stmtCheckOpen->execute([$batch['qualification_id']]);
            $openBatch = $stmtCheckOpen->fetch(PDO::FETCH_ASSOC);

            // If no open batch, create one
            if (!$openBatch) {
                $stmtQual = $conn->prepare("SELECT qualification_name FROM tbl_qualifications WHERE qualification_id = ?");
                $stmtQual->execute([$batch['qualification_id']]);
                $qual = $stmtQual->fetch(PDO::FETCH_ASSOC);

                if ($qual) {
                    // Count existing batches for this qualification
                    $stmtCount = $conn->prepare("
                        SELECT COUNT(*) FROM tbl_batch 
                        WHERE qualification_id = ? AND batch_name LIKE ?
                    ");
                    $stmtCount->execute([$batch['qualification_id'], $qual['qualification_name'] . '%']);
                    $batchSequence = $stmtCount->fetchColumn() + 1;

                    $newBatchName = $qual['qualification_name'] . ' - Batch ' . $batchSequence;
                    $startDate = date('Y-m-d');
                    $endDate = date('Y-m-d', strtotime('+1 month'));

                    $stmtInsert = $conn->prepare("
                        INSERT INTO tbl_batch 
                        (qualification_id, trainer_id, batch_name, scholarship_type, scholarship_type_id, start_date, end_date, status, max_trainees, training_cost) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
                    ");
                    $stmtInsert->execute([
                        $batch['qualification_id'],
                        $batch['trainer_id'],
                        $newBatchName,
                        $batch['scholarship_type'],
                        $batch['scholarship_type_id'],
                        $startDate,
                        $endDate,
                        $batch['max_trainees'],
                        $batch['training_cost'] ?? null
                    ]);
                    $createdCount++;
                    $details[] = "Created new batch: $newBatchName";
                }
            } else {
                $details[] = "Open batch already exists for qualification ID: {$batch['qualification_id']}";
            }
        }

        $conn->commit();
        echo json_encode([
            'success' => true,
            'batches_closed' => $closedCount,
            'batches_created' => $createdCount,
            'details' => $details,
            'message' => "Closed $closedCount batches and created $createdCount new batches"
        ]);
    } catch (Exception $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
