<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
require_once '../../database/db.php';

class BulkImport {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        if ($action === 'preview') {
            $this->preview();
        } elseif ($action === 'import') {
            $this->import();
        }
    }

    private function preview() {
        if (!isset($_FILES['file'])) {
            echo json_encode(['success' => false, 'message' => 'No file uploaded']);
            return;
        }

        $file = $_FILES['file']['tmp_name'];
        $handle = fopen($file, "r");
        $header = fgetcsv($handle);
        $preview = [];
        $rowCount = 0;

        while (($row = fgetcsv($handle)) !== FALSE) {
            $rowCount++;
            if (count($header) === count($row)) {
                $preview[] = array_combine($header, $row);
            }
        }
        fclose($handle);

        // Save file temporarily for the import step
        $tempPath = sys_get_temp_dir() . '/import_' . time() . '.csv';
        move_uploaded_file($_FILES['file']['tmp_name'], $tempPath);

        echo json_encode([
            'success' => true,
            'total_rows' => $rowCount,
            'header' => $header,
            'preview' => $preview,
            'file_token' => basename($tempPath) // Send token to frontend to identify file later
        ]);
    }

    private function import() {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = isset($input['file_token']) ? basename($input['file_token']) : '';
        $userType = isset($input['user_type']) ? $input['user_type'] : '';

        if (!$token || !$userType) {
            echo json_encode(['success' => false, 'message' => 'Missing file token or user type']);
            return;
        }

        $tempPath = sys_get_temp_dir() . '/' . $token;
        
        if (!file_exists($tempPath)) {
            echo json_encode(['success' => false, 'message' => 'Session expired or file not found. Please upload again.']);
            return;
        }

        $handle = fopen($tempPath, "r");
        if ($handle === FALSE) {
             echo json_encode(['success' => false, 'message' => 'Could not open file']);
             return;
        }

        $header = fgetcsv($handle); // Skip header
        
        $imported = 0;
        $skipped = 0;
        $errors = [];
        $rowNum = 1; // Header is 1

        while (($row = fgetcsv($handle)) !== FALSE) {
            $rowNum++;
            // Skip empty rows
            if (count($row) == 1 && $row[0] === null) continue;
            
            // Basic validation
            if (count($row) < 3) {
                $skipped++;
                $errors[] = "Row $rowNum: Insufficient columns";
                continue;
            }

            $this->conn->beginTransaction();
            try {
                // Extract data based on type
                if ($userType === 'trainee') {
                    // Expected: First Name, Middle Name, Last Name, Extension Name, Email, Phone, House No/Street, Barangay, City, Province, District, Region, Birthplace City, Birthplace Province, Birthplace Region, Sex, Birthdate, Civil Status, Education, Employment Status, Employment Type, Learner Classification, Is PWD, Disability Type, Disability Cause, Batch Name, Qualification, Scholarship
                    $firstName = trim($row[0]);
                    $middleName = trim($row[1]);
                    $lastName = trim($row[2]);
                    $extName = trim($row[3]);
                    $email = isset($row[4]) ? trim($row[4]) : '';
                    $phone = isset($row[5]) ? trim($row[5]) : '';
                    
                    // Detailed Address
                    $houseNo = isset($row[6]) ? trim($row[6]) : '';
                    $barangay = isset($row[7]) ? trim($row[7]) : '';
                    $city = isset($row[8]) ? trim($row[8]) : '';
                    $province = isset($row[9]) ? trim($row[9]) : '';
                    
                    // New Address & Birthplace Fields
                    $district = isset($row[10]) ? trim($row[10]) : '';
                    $region = isset($row[11]) ? trim($row[11]) : '';
                    $birthCity = isset($row[12]) ? trim($row[12]) : '';
                    $birthProvince = isset($row[13]) ? trim($row[13]) : '';
                    $birthRegion = isset($row[14]) ? trim($row[14]) : '';
                    
                    $fullAddress = implode(', ', array_filter([$houseNo, $barangay, $city, $province]));

                    $sex = isset($row[15]) ? trim($row[15]) : '';
                    $birthdate = isset($row[16]) ? trim($row[16]) : '';
                    $civilStatus = isset($row[17]) ? trim($row[17]) : '';
                    
                    // Calculate Age and Format Birthdate for DB
                    $age = null;
                    $birthdateDB = null;

                    if (!empty($birthdate)) {
                        $bdate = null;
                        // Try common formats, prioritizing d/m/Y as per user data
                        $formats = ['d/m/Y', 'Y-m-d', 'm/d/Y', 'Y/m/d'];
                        
                        foreach ($formats as $fmt) {
                            $d = DateTime::createFromFormat($fmt, $birthdate);
                            if ($d && $d->format($fmt) == $birthdate) {
                                $bdate = $d;
                                break;
                            }
                        }

                        if ($bdate) {
                            $birthdateDB = $bdate->format('Y-m-d');
                            $now = new DateTime();
                            $age = $now->diff($bdate)->y;
                        }
                    }

                    $education = isset($row[18]) ? trim($row[18]) : '';
                    $employmentStatus = isset($row[19]) ? trim($row[19]) : '';
                    $employmentType = isset($row[20]) ? trim($row[20]) : '';
                    $learnerClassification = isset($row[21]) ? trim($row[21]) : '';
                    
                    $isPwdRaw = isset($row[22]) ? trim($row[22]) : '';
                    $isPwd = (strtolower($isPwdRaw) === 'yes' || $isPwdRaw == '1') ? 1 : 0;
                    
                    $disabilityType = isset($row[23]) ? trim($row[23]) : '';
                    $disabilityCause = isset($row[24]) ? trim($row[24]) : '';

                    $facebookAccount = isset($row[25]) ? trim($row[25]) : '';
                    $birthCertificateNo = isset($row[26]) ? trim($row[26]) : '';
                    $ctprNo = isset($row[27]) ? trim($row[27]) : '';
                    $nominalDuration = isset($row[28]) ? trim($row[28]) : '';

                    $batchName = isset($row[29]) ? trim($row[29]) : '';
                    $qualificationName = isset($row[30]) ? trim($row[30]) : '';
                    $scholarshipName = isset($row[31]) ? trim($row[31]) : '';
                    $roleId = 3;
                } else {
                    // Expected: First Name, Last Name, Email, Phone, Address
                    $firstName = trim($row[0]);
                    $lastName = trim($row[1]);
                    $email = isset($row[2]) ? trim($row[2]) : '';
                    $phone = isset($row[3]) ? trim($row[3]) : '';
                    $address = isset($row[4]) ? trim($row[4]) : '';
                    $roleId = 2;
                }

                if (empty($firstName) || empty($lastName)) {
                    throw new Exception("First Name and Last Name are required");
                }

                // Generate Username (firstname.lastname)
                $baseUsername = strtolower($firstName . '.' . $lastName);
                $baseUsername = preg_replace('/[^a-z0-9.]/', '', $baseUsername);
                $username = $baseUsername;
                $counter = 1;
                
                // Check username uniqueness
                while(true) {
                    $stmt = $this->conn->prepare("SELECT user_id FROM tbl_users WHERE username = ?");
                    $stmt->execute([$username]);
                    if (!$stmt->fetch()) break;
                    $username = $baseUsername . $counter++;
                }

                // Check email uniqueness if provided
                if (!empty($email)) {
                    $stmt = $this->conn->prepare("SELECT user_id FROM tbl_users WHERE email = ?");
                    $stmt->execute([$email]);
                    if ($stmt->fetch()) {
                        throw new Exception("Email $email already exists");
                    }
                }

                $userId = null;
                
                // Insert User (Only for Trainers, Trainees get accounts later)
                if ($userType !== 'trainee') {
                    $password = password_hash('password123', PASSWORD_DEFAULT); // Default password
                    $stmt = $this->conn->prepare("INSERT INTO tbl_users (username, password, email, role_id, status, date_created) VALUES (?, ?, ?, ?, 'active', NOW())");
                    $stmt->execute([$username, $password, $email ?: null, $roleId]);
                    $userId = $this->conn->lastInsertId();
                }

                // Insert Profile
                if ($userType === 'trainee') {
                    // Resolve Batch ID and Year for School ID Generation
                    $batchId = 0;
                    $year = date('Y');
                    
                    if (!empty($batchName)) {
                        $stmtB = $this->conn->prepare("SELECT batch_id, start_date FROM tbl_batch WHERE batch_name = ?");
                        $stmtB->execute([$batchName]);
                        $batchData = $stmtB->fetch(PDO::FETCH_ASSOC);
                        if ($batchData) {
                            $batchId = $batchData['batch_id'];
                            if (!empty($batchData['start_date'])) {
                                $year = date('Y', strtotime($batchData['start_date']));
                            }
                        }
                    }

                    // Generate Trainee School ID: BATCH-YEAR-SEQUENCE
                    // Count existing trainees for this year to determine sequence
                    $stmtCount = $this->conn->prepare("SELECT COUNT(*) FROM tbl_trainee_hdr WHERE trainee_school_id LIKE ?");
                    $stmtCount->execute(["%-$year-%"]);
                    $currentCount = $stmtCount->fetchColumn();
                    $sequence = $currentCount + 1; // Simple increment, might need more robust logic for high concurrency
                    $schoolId = sprintf('%s-%s-%04d', $batchId, $year, $sequence);

                    // 1. Header
                    $stmt = $this->conn->prepare("INSERT INTO tbl_trainee_hdr (user_id, trainee_school_id, first_name, middle_name, last_name, extension_name, sex, birth_certificate_no, email, facebook_account, phone_number, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')");
                    $stmt->execute([$userId, $schoolId, $firstName, $middleName, $lastName, $extName, $sex ?: null, $birthCertificateNo ?: null, $email ?: null, $facebookAccount ?: null, $phone ?: null, $fullAddress ?: null]);
                    $traineeId = $this->conn->lastInsertId();

                    // 2. Details (Birthdate, Civil Status, Age, Address Parts, Birthplace, Nationality)
                    // NOTE: Column order matches database schema exactly
                    $stmt = $this->conn->prepare("INSERT INTO tbl_trainee_dtl (trainee_id, civil_status, birthdate, age, birthplace_city, birthplace_province, birthplace_region, nationality, house_no_street, barangay, district, city_municipality, province, region) VALUES (?, ?, ?, ?, ?, ?, ?, 'Filipino', ?, ?, ?, ?, ?, ?)");
                    $stmt->execute([$traineeId, $civilStatus ?: null, $birthdateDB, $age, $birthCity ?: null, $birthProvince ?: null, $birthRegion ?: null, $houseNo ?: null, $barangay ?: null, $district ?: null, $city ?: null, $province ?: null, $region ?: null]);

                    // 3. Features (Education, Employment, Privacy Consent)
                    $stmt = $this->conn->prepare("INSERT INTO tbl_trainee_ftr (trainee_id, educational_attainment, employment_status, employment_type, learner_classification, is_pwd, disability_type, disability_cause, privacy_consent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)");
                    $stmt->execute([$traineeId, $education ?: null, $employmentStatus ?: null, $employmentType ?: null, $learnerClassification ?: null, $isPwd, $disabilityType ?: null, $disabilityCause ?: null]);

                    // 4. Enrollment (Batch, Qualification, Scholarship)
                    if (!empty($qualificationName)) {
                        // Get Qualification ID
                        $stmtQ = $this->conn->prepare("SELECT qualification_id FROM tbl_qualifications WHERE qualification_name = ?");
                        $stmtQ->execute([$qualificationName]);
                        $qualId = $stmtQ->fetchColumn();

                        if ($qualId) {
                            // Get/Create Offered Qualification ID
                            $stmtOQ = $this->conn->prepare("SELECT offered_qualification_id FROM tbl_offered_qualifications WHERE qualification_id = ? LIMIT 1");
                            $stmtOQ->execute([$qualId]);
                            $offeredId = $stmtOQ->fetchColumn();

                            if (!$offeredId) {
                                $stmtInsOQ = $this->conn->prepare("INSERT INTO tbl_offered_qualifications (qualification_id) VALUES (?)");
                                $stmtInsOQ->execute([$qualId]);
                                $offeredId = $this->conn->lastInsertId();
                            }

                            // Get Scholarship Type ID
                            $scholarshipId = null;
                            if (!empty($scholarshipName)) {
                                $stmtS = $this->conn->prepare("SELECT scholarship_type_id FROM tbl_scholarship_type WHERE scholarship_name = ?");
                                $stmtS->execute([$scholarshipName]);
                                $scholarshipId = $stmtS->fetchColumn() ?: null;
                            }

                            // Determine Status: Approved if batch is assigned, otherwise Pending
                            $status = ($batchId > 0) ? 'approved' : 'pending';

                            // Insert Enrollment
                            $stmtEnroll = $this->conn->prepare("INSERT INTO tbl_enrollment (trainee_id, offered_qualification_id, batch_id, enrollment_date, status, scholarship_type, scholarship_type_id) VALUES (?, ?, ?, NOW(), ?, ?, ?)");
                            $stmtEnroll->execute([$traineeId, $offeredId, ($batchId > 0 ? $batchId : null), $status, $scholarshipName, $scholarshipId]);
                            $enrollmentId = $this->conn->lastInsertId();

                            if ($status === 'approved') {
                                $stmtEnrolled = $this->conn->prepare("INSERT INTO tbl_enrolled_trainee (enrollment_id, trainee_id) VALUES (?, ?)");
                                $stmtEnrolled->execute([$enrollmentId, $traineeId]);
                                
                                if (!empty($scholarshipName)) {
                                    $stmtSch = $this->conn->prepare("INSERT INTO tbl_scholarship (trainee_id, scholarship_name, scholarship_type_id, date_granted) VALUES (?, ?, ?, CURDATE())");
                                    $stmtSch->execute([$traineeId, $scholarshipName, $scholarshipId]);
                                }
                                
                                // Check and close batch if max trainees reached
                                $this->checkAndCloseBatch($batchId);
                            }
                        }
                    }
                } else {
                    $stmt = $this->conn->prepare("INSERT INTO tbl_trainer (user_id, first_name, last_name, email, phone_number, address) VALUES (?, ?, ?, ?, ?, ?)");
                    $stmt->execute([$userId, $firstName, $lastName, $email ?: null, $phone ?: null, $address ?: null]);
                }

                $this->conn->commit();
                $imported++;

            } catch (Exception $e) {
                $this->conn->rollBack();
                $skipped++;
                $errors[] = "Row $rowNum: " . $e->getMessage();
            }
        }
        
        fclose($handle);
        // Optional: unlink($tempPath); 

        echo json_encode([
            'success' => true,
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => $errors
        ]);
    }

    private function checkAndCloseBatch($batchId) {
        if (!$batchId) return;
        
        // Get batch info including max_trainees
        $stmtBatch = $this->conn->prepare("SELECT batch_id, qualification_id, max_trainees, batch_name, trainer_id, scholarship_type, scholarship_type_id, status FROM tbl_batch WHERE batch_id = ?");
        $stmtBatch->execute([$batchId]);
        $batch = $stmtBatch->fetch(PDO::FETCH_ASSOC);
        
        if (!$batch) return;
        
        // Count approved trainees in this batch
        $stmtCount = $this->conn->prepare("SELECT COUNT(*) FROM tbl_enrollment WHERE batch_id = ? AND status = 'approved'");
        $stmtCount->execute([$batchId]);
        $traineeCount = $stmtCount->fetchColumn();
        
        // Check if batch is full
        if ($traineeCount >= $batch['max_trainees'] && $batch['status'] !== 'closed') {
            // Close the current batch
            $stmtClose = $this->conn->prepare("UPDATE tbl_batch SET status = 'closed' WHERE batch_id = ?");
            $stmtClose->execute([$batchId]);
            
            // Check if there's an open batch for this qualification already
            $stmtCheckOpen = $this->conn->prepare("SELECT batch_id FROM tbl_batch WHERE qualification_id = ? AND status = 'open' LIMIT 1");
            $stmtCheckOpen->execute([$batch['qualification_id']]);
            $openBatch = $stmtCheckOpen->fetch(PDO::FETCH_ASSOC);
            
            // If no open batch exists for this qualification, create one
            if (!$openBatch) {
                $this->createNextBatch($batch);
            }
        }
    }

    private function createNextBatch($previousBatch) {
        try {
            // Generate new batch name
            $qualId = $previousBatch['qualification_id'];
            $stmtGetQual = $this->conn->prepare("SELECT qualification_name FROM tbl_qualifications WHERE qualification_id = ?");
            $stmtGetQual->execute([$qualId]);
            $qual = $stmtGetQual->fetch(PDO::FETCH_ASSOC);
            
            if (!$qual) return;
            
            // Count existing batches for this qualification to determine sequence
            $stmtCount = $this->conn->prepare("SELECT COUNT(*) FROM tbl_batch WHERE qualification_id = ? AND batch_name LIKE ?");
            $stmtCount->execute([$qualId, $qual['qualification_name'] . '%']);
            $batchSequence = $stmtCount->fetchColumn() + 1;
            
            $newBatchName = $qual['qualification_name'] . ' - Batch ' . $batchSequence;
            
            // Calculate new start and end dates (assume 1 month training)
            $startDate = date('Y-m-d'); // Today
            $endDate = date('Y-m-d', strtotime('+1 month'));
            
            // Create new batch with same properties as previous
            $stmtInsert = $this->conn->prepare("INSERT INTO tbl_batch (qualification_id, trainer_id, batch_name, scholarship_type, scholarship_type_id, start_date, end_date, status, max_trainees) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)");
            $stmtInsert->execute([
                $qualId,
                $previousBatch['trainer_id'],
                $newBatchName,
                $previousBatch['scholarship_type'],
                $previousBatch['scholarship_type_id'] ?? null,
                $startDate,
                $endDate,
                $previousBatch['max_trainees']
            ]);
            
            return $this->conn->lastInsertId();
        } catch (Exception $e) {
            // Log error but don't throw - batch creation failure shouldn't block import
            error_log("Batch auto-creation failed: " . $e->getMessage());
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$import = new BulkImport($db);
$import->handleRequest();
?>
