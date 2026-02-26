<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

require_once '../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    submitApplication($conn);
} elseif ($action === 'get-options') {
    getOptions($conn);
} elseif ($action === 'check-trainee') {
    checkTrainee($conn);
} elseif ($action === 'update-status') {
    updateApplicationStatus($conn);
} else {
    // Handle preflight or invalid
    if ($_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
    }
}

function getOptions($conn) {
    try {
        $courses = $conn->query("SELECT qualification_id, qualification_name AS course_name FROM tbl_qualifications WHERE status = 'active' ORDER BY qualification_name ASC")->fetchAll(PDO::FETCH_ASSOC);
        // Include scholarship type for auto-population on batch selection
        $batches = $conn->query("
            SELECT 
                b.batch_id,
                b.batch_name,
                b.qualification_id,
                COALESCE(NULLIF(b.scholarship_type, ''), st.scholarship_name) AS scholarship_type
            FROM tbl_batch b
            LEFT JOIN tbl_scholarship_type st ON b.scholarship_type_id = st.scholarship_type_id
            WHERE b.status = 'open'
        ")->fetchAll(PDO::FETCH_ASSOC);
        // Fetches scholarship programs to populate the dropdown
        $scholarships = $conn->query("SELECT scholarship_name FROM tbl_scholarship_type WHERE status = 'active' ORDER BY scholarship_name ASC")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => ['courses' => $courses, 'batches' => $batches, 'scholarships' => $scholarships]]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function checkTrainee($conn) {
    $schoolId = $_GET['school_id'] ?? '';

    if (empty($schoolId)) {
        echo json_encode(['success' => false, 'message' => 'School ID is required.']);
        return;
    }

    try {
        $query = "SELECT 
                    th.trainee_id, th.first_name, th.middle_name, th.last_name, th.extension_name,
                    th.sex, th.email, th.phone_number, th.facebook_account, th.birth_certificate_no,
                    td.civil_status, td.birthdate, td.age, 
                    td.birthplace_city, td.birthplace_province, td.birthplace_region, td.nationality,
                    td.house_no_street, td.barangay, td.district, td.city_municipality, td.province, td.region,
                    tf.educational_attainment, tf.employment_status, tf.employment_type, 
                    tf.learner_classification, tf.is_pwd, tf.disability_type, tf.disability_cause
                  FROM tbl_trainee_hdr AS th
                  LEFT JOIN tbl_trainee_dtl td ON th.trainee_id = td.trainee_id
                  LEFT JOIN tbl_trainee_ftr tf ON th.trainee_id = tf.trainee_id
                  WHERE th.trainee_school_id = ?";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([$schoolId]);
        $trainee = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($trainee) {
            // Also check which qualifications the trainee is already enrolled in or has completed
            $enrollmentQuery = "SELECT oq.qualification_id 
                                FROM tbl_enrollment e
                                JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
                                WHERE e.trainee_id = ? AND e.status IN ('pending', 'approved', 'completed')";
            $enrollmentStmt = $conn->prepare($enrollmentQuery);
            $enrollmentStmt->execute([$trainee['trainee_id']]);
            $trainee['enrolled_qualifications'] = $enrollmentStmt->fetchAll(PDO::FETCH_COLUMN, 0);

            echo json_encode(['success' => true, 'exists' => true, 'data' => $trainee]);
        } else {
            echo json_encode(['success' => true, 'exists' => false]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'API Error: ' . $e->getMessage()]);
    }
}

function submitApplication($conn) {
    try {
        $conn->beginTransaction();
        
        // Check if trainee already exists
        $checkStmt = $conn->prepare("SELECT trainee_id FROM tbl_trainee_hdr WHERE email = ? AND first_name = ? AND last_name = ?");
        $checkStmt->execute([$_POST['email'], $_POST['first_name'], $_POST['last_name']]);
        $existingTrainee = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($existingTrainee) {
            $traineeId = $existingTrainee['trainee_id'];
        } else {
            // 1. Handle File Uploads
            $uploadDir = '../../uploads/trainees/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

            $validId = isset($_FILES['valid_id']) ? uploadFile($_FILES['valid_id'], $uploadDir, 'valid_id_') : null;
            $birthCert = isset($_FILES['birth_cert']) ? uploadFile($_FILES['birth_cert'], $uploadDir, 'birth_') : null;
            $photo = isset($_FILES['photo']) ? uploadFile($_FILES['photo'], $uploadDir, 'photo_') : null;

            // Handle Digital Signature (Base64 to Image)
            $signatureContent = $_POST['digital_signature'] ?? '';
            $signatureFilename = null;
            
            if (preg_match('/^data:image\/(\w+);base64,/', $signatureContent, $type)) {
                $data = substr($signatureContent, strpos($signatureContent, ',') + 1);
                $type = strtolower($type[1]); // png
                $data = base64_decode($data);
                if ($data !== false) {
                    $signatureFilename = 'sig_' . time() . '.' . $type;
                    file_put_contents($uploadDir . $signatureFilename, $data);
                }
            }

            // Handle Checkboxes
            $learnerClass = isset($_POST['learner_classification']) ? implode(',', $_POST['learner_classification']) : '';
            $isPwd = (isset($_POST['is_pwd']) && $_POST['is_pwd'] === 'yes') ? 1 : 0;
            $privacyConsent = (isset($_POST['privacy_consent'])) ? 1 : 0;

            // 2. Insert Trainee Header (tbl_trainee_hdr)
            // Note: We keep 'address' and file paths in header for backward compatibility with other modules
            $queryHdr = "INSERT INTO tbl_trainee_hdr (
                first_name, middle_name, last_name, extension_name, sex, 
                birth_certificate_no, email, facebook_account, phone_number, address,
                valid_id_file, birth_cert_file, photo_file, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')";

            $stmtHdr = $conn->prepare($queryHdr);
            
            // Address concatenation for legacy support
            $fullAddress = $_POST['house_no_street'] . ', ' . $_POST['barangay'] . ', ' . $_POST['city_municipality'] . ', ' . $_POST['province'];

            $stmtHdr->execute([
                $_POST['first_name'],
                $_POST['middle_name'] ?? null,
                $_POST['last_name'],
                $_POST['extension_name'] ?? null,
                $_POST['sex'],
                $_POST['birth_certificate_no'] ?? null,
                $_POST['email'],
                $_POST['facebook_account'] ?? null,
                $_POST['phone'],
                $fullAddress,
                $validId,
                $birthCert,
                $photo
            ]);
            $traineeId = $conn->lastInsertId();

            // 3. Insert Trainee Details (tbl_trainee_dtl)
            $queryDtl = "INSERT INTO tbl_trainee_dtl (
                trainee_id, civil_status, birthdate, age, 
                birthplace_city, birthplace_province, birthplace_region, nationality,
                house_no_street, barangay, district, city_municipality, province, region
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmtDtl = $conn->prepare($queryDtl);
            $stmtDtl->execute([
                $traineeId,
                $_POST['civil_status'],
                $_POST['birthdate'],
                $_POST['age'],
                $_POST['birthplace_city'],
                $_POST['birthplace_province'],
                $_POST['birthplace_region'] ?? null,
                $_POST['nationality'],
                $_POST['house_no_street'],
                $_POST['barangay'],
                $_POST['district'] ?? null,
                $_POST['city_municipality'],
                $_POST['province'],
                $_POST['region'] ?? null
            ]);

            // 4. Insert Trainee Footer (tbl_trainee_ftr)
            $queryFtr = "INSERT INTO tbl_trainee_ftr (
                trainee_id, educational_attainment, employment_status, employment_type, 
                learner_classification, is_pwd, disability_type, disability_cause, 
                privacy_consent, digital_signature
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            $stmtFtr = $conn->prepare($queryFtr);
            $stmtFtr->execute([
                $traineeId,
                $_POST['educational_attainment'],
                $_POST['employment_status'],
                $_POST['employment_type'] ?? null,
                $learnerClass,
                $isPwd,
                $_POST['disability_type'] ?? null,
                $_POST['disability_cause'] ?? null,
                $privacyConsent,
                $signatureFilename // Save the filename, not the base64 string
            ]);
        }

        // 5. Handle Enrollment (Create Offered Course link if needed)
        $qualificationId = $_POST['qualification_id'];
        $batchId = $_POST['batch_id'];

        // CHECK FOR EXISTING ENROLLMENT for this qualification
        $enrollmentCheckStmt = $conn->prepare("
            SELECT e.enrollment_id 
            FROM tbl_enrollment e
            JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
            WHERE e.trainee_id = ? AND oq.qualification_id = ? AND e.status IN ('pending', 'approved', 'completed')
        ");
        $enrollmentCheckStmt->execute([$traineeId, $qualificationId]);
        if ($enrollmentCheckStmt->fetch()) {
            throw new Exception("You are already enrolled in or have completed this qualification.");
        }

        // Check if offered course exists for this course, if not create one
        $stmtOffered = $conn->prepare("SELECT offered_qualification_id FROM tbl_offered_qualifications WHERE qualification_id = ? LIMIT 1");
        $stmtOffered->execute([$qualificationId]);
        $offered = $stmtOffered->fetch(PDO::FETCH_ASSOC);
        
        if ($offered) {
            $offeredId = $offered['offered_qualification_id'];
        } else {
            $stmtIns = $conn->prepare("INSERT INTO tbl_offered_qualifications (qualification_id) VALUES (?)");
            $stmtIns->execute([$qualificationId]);
            $offeredId = $conn->lastInsertId();
        }

        // Insert Enrollment with 'pending' status
        $stmtEnroll = $conn->prepare("INSERT INTO tbl_enrollment (trainee_id, offered_qualification_id, batch_id, scholarship_type, enrollment_date, status) VALUES (?, ?, ?, ?, NOW(), 'pending')");
        $stmtEnroll->execute([$traineeId, $offeredId, $batchId, $_POST['scholarship_type'] ?? null]);

        $conn->commit();
        // Notify all registrars (one notification per registrar user)
        try {
            $db2 = new Database();
            $c2 = $db2->getConnection();
            $title = 'New Application Submitted';
            $msg = 'New application submitted by ' . ($_POST['first_name'] ?? '') . ' ' . ($_POST['last_name'] ?? '');
            $link = '/Hohoo-ville/frontend/html/registrar/pages/trainee_application_list.html';

            $uStmt = $c2->prepare("SELECT u.user_id FROM tbl_users u JOIN tbl_role r ON u.role_id = r.role_id WHERE r.role_name = 'registrar'");
            $uStmt->execute();
            $regIds = $uStmt->fetchAll(PDO::FETCH_COLUMN);
            if (!empty($regIds)) {
                $nstmt = $c2->prepare("INSERT INTO tbl_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)");
                foreach ($regIds as $rid) {
                    $nstmt->execute([$rid, $title, $msg, $link]);
                }
            }
        } catch (Exception $ex) {
            // ignore notification errors
        }

        echo json_encode(['success' => true, 'message' => 'Application submitted']);
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function uploadFile($file, $dir, $prefix) {
    if ($file['error'] === UPLOAD_ERR_OK) {
        $filename = $prefix . time() . '_' . basename($file['name']);
        if (move_uploaded_file($file['tmp_name'], $dir . $filename)) {
            return $filename;
        }
    }
    return null;
}

function updateApplicationStatus($conn) {
    // Note: In a production environment, ensure this action is protected by Admin/Registrar authentication.
    
    $enrollmentId = $_POST['enrollment_id'] ?? null;
    $status = $_POST['status'] ?? null; // Expected values: 'reserved', 'rejected', 'qualified'
    $remarks = $_POST['remarks'] ?? '';

    if (!$enrollmentId || !$status) {
        echo json_encode(['success' => false, 'message' => 'Missing parameters']);
        return;
    }

    try {
        // 1. Fetch trainee email and course details
        $stmt = $conn->prepare("
            SELECT t.email, t.first_name, t.last_name, q.qualification_name
            FROM tbl_enrollment e
            JOIN tbl_trainee_hdr t ON e.trainee_id = t.trainee_id
            JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
            JOIN tbl_qualifications q ON oq.qualification_id = q.qualification_id
            WHERE e.enrollment_id = ?
        ");
        $stmt->execute([$enrollmentId]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) {
            echo json_encode(['success' => false, 'message' => 'Enrollment record not found']);
            return;
        }

        // 2. Update Status
        $updateStmt = $conn->prepare("UPDATE tbl_enrollment SET status = ? WHERE enrollment_id = ?");
        $updateStmt->execute([$status, $enrollmentId]);

        // 3. Send Email Notification
        $to = $data['email'];
        $name = $data['first_name'] . ' ' . $data['last_name'];
        $course = $data['qualification_name'];
        $subject = "Application Status Update - Hohoo-Ville Technical School";
        $message = "Dear $name,\n\n";

        if ($status === 'reserved') {
            $message .= "Thank you for your interest in $course.\n\nPlease be informed that the current batch is full. However, you are qualified for the program. Your application has been placed on our RESERVE list for the next available batch.\n\nWe will notify you once a slot opens up.";
        } elseif ($status === 'rejected') {
            $message .= "Thank you for your interest in $course.\n\nAfter careful review, we regret to inform you that your application has been REJECTED.\n\nRemarks: $remarks";
        } elseif ($status === 'qualified') {
            $message .= "Congratulations! You have been deemed QUALIFIED for the $course.\n\nPlease wait for the creation of your user account. You will receive a separate email containing your login credentials and further instructions soon.";
        }

        $message .= "\n\nRegards,\nRegistrar Office";
        $headers = "From: registrar@hohooville.edu.ph";

        // Use PHP's built-in mail function (requires SMTP config in php.ini)
        mail($to, $subject, $message, $headers);

        echo json_encode(['success' => true, 'message' => 'Status updated and notification sent.']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}
?>
