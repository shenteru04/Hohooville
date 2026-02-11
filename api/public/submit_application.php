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
} else {
    // Handle preflight or invalid
    if ($_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
    }
}

function getOptions($conn) {
    try {
        $courses = $conn->query("SELECT qualification_id, qualification_name AS course_name FROM tbl_qualifications WHERE status = 'active' ORDER BY qualification_name ASC")->fetchAll(PDO::FETCH_ASSOC);
        // Assumes tbl_batch has a qualification_id to link with courses
        $batches = $conn->query("SELECT batch_id, batch_name, qualification_id FROM tbl_batch WHERE status = 'open'")->fetchAll(PDO::FETCH_ASSOC);
        // Fetches scholarship programs to populate the dropdown
        $scholarships = $conn->query("SELECT scholarship_name FROM tbl_scholarship_type WHERE status = 'active' ORDER BY scholarship_name ASC")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => ['courses' => $courses, 'batches' => $batches, 'scholarships' => $scholarships]]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function checkTrainee($conn) {
    $email = $_GET['email'] ?? '';
    $firstName = $_GET['first_name'] ?? '';
    $lastName = $_GET['last_name'] ?? '';

    if (empty($email) || empty($firstName) || empty($lastName)) {
        echo json_encode(['success' => false, 'message' => 'Email, first name, and last name are required.']);
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
                  WHERE th.email = ? AND th.first_name = ? AND th.last_name = ?";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([$email, $firstName, $lastName]);
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
                email, phone_number, facebook_account, address,
                birth_certificate_no, valid_id_file, birth_cert_file, photo_file, status
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
                $_POST['email'],
                $_POST['phone'],
                $_POST['facebook_account'] ?? null,
                $fullAddress,
                $_POST['birth_certificate_no'] ?? null,
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
        $stmtEnroll = $conn->prepare("INSERT INTO tbl_enrollment (trainee_id, offered_qualification_id, batch_id, scholarship_type, enrollment_date, status) VALUES (?, ?, ?, ?, CURDATE(), 'pending')");
        $stmtEnroll->execute([$traineeId, $offeredId, $batchId, $_POST['scholarship_type'] ?? null]);

        $conn->commit();
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
?>
