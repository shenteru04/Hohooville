<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
require_once '../../database/db.php';

class BulkImport {
    private $conn;
    private $schemas;
    private $qualificationCache = null;
    private $batchCache = null;
    private $scholarshipCache = null;
    private $ncLevelCache = null;

    public function __construct($db) {
        $this->conn = $db;
        $this->schemas = $this->buildSchemas();
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';

        if ($action === 'preview') {
            $this->preview();
            return;
        }

        if ($action === 'import') {
            $this->import();
            return;
        }

        $this->sendJson([
            'success' => false,
            'message' => 'Invalid action.'
        ], 400);
    }

    private function preview() {
        if (empty($_FILES['file'])) {
            $this->sendJson([
                'success' => false,
                'message' => 'No file uploaded.'
            ], 400);
            return;
        }

        $userType = $this->sanitizeUserType($_POST['user_type'] ?? $_GET['user_type'] ?? 'trainee');

        try {
            $csv = $this->readCsvRows($_FILES['file']['tmp_name'], null);
            if (empty($csv['header'])) {
                throw new Exception('CSV header row is missing.');
            }

            $validation = $this->validateHeaders($csv['header'], $userType);
            $tempPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'import_' . bin2hex(random_bytes(12)) . '.csv';

            if (!move_uploaded_file($_FILES['file']['tmp_name'], $tempPath)) {
                throw new Exception('Failed to save uploaded CSV file.');
            }

            $this->sendJson([
                'success' => true,
                'user_type' => $userType,
                'total_rows' => $csv['row_count'],
                'header' => $csv['header'],
                'preview' => $csv['rows'],
                'missing_required' => $validation['missing_required'],
                'unknown_headers' => $validation['unknown_headers'],
                'can_import' => $validation['can_import'],
                'file_token' => basename($tempPath)
            ]);
        } catch (Exception $e) {
            $this->sendJson([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    private function import() {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            $input = [];
        }

        $token = basename((string)($input['file_token'] ?? ''));
        $userType = $this->sanitizeUserType($input['user_type'] ?? '');

        if ($token === '' || $userType === '') {
            $this->sendJson([
                'success' => false,
                'message' => 'Missing file token or user type.'
            ], 400);
            return;
        }

        $tempPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $token;
        if (!file_exists($tempPath)) {
            $this->sendJson([
                'success' => false,
                'message' => 'Session expired or file not found. Please upload again.'
            ], 404);
            return;
        }

        try {
            $csv = $this->readCsvRows($tempPath, null);
            if (empty($csv['header'])) {
                throw new Exception('CSV header row is missing.');
            }

            $validation = $this->validateHeaders($csv['header'], $userType);
            if (!$validation['can_import']) {
                $this->sendJson([
                    'success' => false,
                    'message' => 'Missing required columns: ' . implode(', ', $validation['missing_required']),
                    'missing_required' => $validation['missing_required']
                ], 422);
                return;
            }

            $headerMap = $validation['header_map'];
            $imported = 0;
            $skipped = 0;
            $errors = [];

            foreach ($csv['rows'] as $index => $row) {
                $rowNumber = $index + 2;

                if ($this->isAssocRowEmpty($row)) {
                    continue;
                }

                $this->conn->beginTransaction();

                try {
                    $rowData = $this->buildRowData($csv['header'], $row, $headerMap, $userType);
                    $this->validateRequiredRowFields($rowData, $userType);

                    if ($userType === 'trainee') {
                        $this->importTraineeRow($rowData);
                    } else {
                        $this->importTrainerRow($rowData);
                    }

                    $this->conn->commit();
                    $imported++;
                } catch (Exception $e) {
                    if ($this->conn->inTransaction()) {
                        $this->conn->rollBack();
                    }

                    $skipped++;
                    $errors[] = 'Row ' . $rowNumber . ': ' . $e->getMessage();
                }
            }

            @unlink($tempPath);

            $this->sendJson([
                'success' => true,
                'imported' => $imported,
                'skipped' => $skipped,
                'errors' => $errors
            ]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }

            $this->sendJson([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function buildSchemas() {
        return [
            'trainee' => [
                'required' => [
                    'first_name' => 'First Name',
                    'last_name' => 'Last Name',
                    'sex' => 'Sex',
                    'birthdate' => 'Birthdate',
                    'civil_status' => 'Civil Status',
                    'house_no_street' => 'House No/Street',
                    'barangay' => 'Barangay',
                    'city_municipality' => 'City/Municipality',
                    'province' => 'Province',
                    'educational_attainment' => 'Educational Attainment',
                    'employment_status' => 'Employment Status',
                    'learner_classification' => 'Learner Classification',
                    'qualification_name' => 'Qualification'
                ],
                'aliases' => [
                    'first_name' => ['first name', 'firstname'],
                    'middle_name' => ['middle name', 'middlename'],
                    'last_name' => ['last name', 'lastname'],
                    'extension_name' => ['extension name', 'ext name', 'suffix'],
                    'email' => ['email', 'email address'],
                    'phone_number' => ['phone number', 'phone', 'contact number'],
                    'sex' => ['sex', 'gender'],
                    'birthdate' => ['birthdate', 'birth date', 'date of birth'],
                    'civil_status' => ['civil status', 'marital status'],
                    'birth_certificate_no' => ['birth certificate no', 'birth certificate number'],
                    'facebook_account' => ['facebook account', 'facebook'],
                    'nationality' => ['nationality'],
                    'house_no_street' => ['house no/street', 'house no street', 'house number street'],
                    'barangay' => ['barangay'],
                    'district' => ['district'],
                    'city_municipality' => ['city/municipality', 'city municipality', 'city', 'municipality'],
                    'province' => ['province'],
                    'region' => ['region'],
                    'birthplace_city' => ['birthplace city', 'birth city'],
                    'birthplace_province' => ['birthplace province', 'birth province'],
                    'birthplace_region' => ['birthplace region', 'birth region'],
                    'educational_attainment' => ['educational attainment', 'education'],
                    'employment_status' => ['employment status'],
                    'employment_type' => ['employment type'],
                    'learner_classification' => ['learner classification', 'learner class'],
                    'is_pwd' => ['is pwd', 'pwd', 'is person with disability'],
                    'disability_type' => ['disability type'],
                    'disability_cause' => ['disability cause'],
                    'qualification_name' => ['qualification', 'qualification name', 'course', 'course name'],
                    'batch_name' => ['batch', 'batch name'],
                    'scholarship_type' => ['scholarship type', 'scholarship', 'scholarship name'],
                    'enrollment_status' => ['enrollment status'],
                    'enrollment_date' => ['enrollment date'],
                    'privacy_consent' => ['privacy consent'],
                    'trainee_status' => ['trainee status', 'profile status'],
                    'trainee_school_id' => ['trainee school id', 'school id']
                ]
            ],
            'trainer' => [
                'required' => [
                    'first_name' => 'First Name',
                    'last_name' => 'Last Name',
                    'qualifications' => 'Qualifications'
                ],
                'aliases' => [
                    'first_name' => ['first name', 'firstname'],
                    'last_name' => ['last name', 'lastname'],
                    'email' => ['email', 'email address'],
                    'phone_number' => ['phone number', 'phone', 'contact number'],
                    'username' => ['username', 'user name'],
                    'password' => ['password'],
                    'qualifications' => ['qualifications', 'qualification names', 'qualification name', 'qualification', 'course', 'courses'],
                    'nc_levels' => ['nc levels', 'nc level', 'trainer nc level'],
                    'nttc_no' => ['nttc no', 'nttc number'],
                    'house_no_street' => ['house no/street', 'house no street', 'house number street'],
                    'barangay' => ['barangay'],
                    'district' => ['district'],
                    'city_municipality' => ['city/municipality', 'city municipality', 'city', 'municipality'],
                    'province' => ['province'],
                    'region' => ['region'],
                    'address' => ['address'],
                    'trainer_status' => ['trainer status', 'status']
                ]
            ]
        ];
    }

    private function readCsvRows($path, $previewLimit = null) {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            throw new Exception('Could not open CSV file.');
        }

        $header = fgetcsv($handle);
        if ($header === false) {
            fclose($handle);
            return [
                'header' => [],
                'rows' => [],
                'row_count' => 0
            ];
        }

        if (isset($header[0])) {
            $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string)$header[0]);
        }

        $header = array_map(function ($value) {
            return trim((string)$value);
        }, $header);

        $rows = [];
        $rowCount = 0;
        $columnCount = count($header);

        while (($row = fgetcsv($handle)) !== false) {
            if ($this->isNumericRowEmpty($row)) {
                continue;
            }

            $rowCount++;
            $normalizedRow = array_slice(array_pad($row, $columnCount, ''), 0, $columnCount);
            $assocRow = array_combine($header, $normalizedRow);

            if ($previewLimit === null || count($rows) < $previewLimit) {
                $rows[] = $assocRow;
            }
        }

        fclose($handle);

        return [
            'header' => $header,
            'rows' => $rows,
            'row_count' => $rowCount
        ];
    }

    private function validateHeaders(array $header, $userType) {
        $headerMap = $this->getHeaderMap($header, $userType);
        $missing = [];

        foreach ($this->schemas[$userType]['required'] as $key => $label) {
            if (!isset($headerMap[$key])) {
                $missing[] = $label;
            }
        }

        $recognizedIndexes = array_values($headerMap);
        $unknownHeaders = [];

        foreach ($header as $index => $column) {
            if (trim((string)$column) === '') {
                continue;
            }

            if (!in_array($index, $recognizedIndexes, true)) {
                $unknownHeaders[] = trim((string)$column);
            }
        }

        return [
            'header_map' => $headerMap,
            'missing_required' => $missing,
            'unknown_headers' => $unknownHeaders,
            'can_import' => empty($missing)
        ];
    }

    private function getHeaderMap(array $header, $userType) {
        $aliasMap = [];

        foreach ($this->schemas[$userType]['aliases'] as $key => $aliases) {
            foreach ($aliases as $alias) {
                $aliasMap[$this->normalizeText($alias)] = $key;
            }
        }

        $headerMap = [];
        foreach ($header as $index => $column) {
            $normalized = $this->normalizeText($column);
            if ($normalized === '' || !isset($aliasMap[$normalized])) {
                continue;
            }

            $canonical = $aliasMap[$normalized];
            if (!isset($headerMap[$canonical])) {
                $headerMap[$canonical] = $index;
            }
        }

        return $headerMap;
    }

    private function buildRowData(array $header, array $row, array $headerMap, $userType) {
        $rowData = [];

        foreach ($this->schemas[$userType]['aliases'] as $key => $aliases) {
            $rowData[$key] = '';

            if (!isset($headerMap[$key])) {
                continue;
            }

            $columnName = $header[$headerMap[$key]] ?? null;
            if ($columnName === null) {
                continue;
            }

            $rowData[$key] = trim((string)($row[$columnName] ?? ''));
        }

        return $rowData;
    }

    private function validateRequiredRowFields(array $rowData, $userType) {
        foreach ($this->schemas[$userType]['required'] as $key => $label) {
            if (trim((string)($rowData[$key] ?? '')) === '') {
                throw new Exception($label . ' is required.');
            }
        }
    }

    private function importTraineeRow(array $rowData) {
        $firstName = $this->requireValue($rowData['first_name'] ?? '', 'First Name');
        $lastName = $this->requireValue($rowData['last_name'] ?? '', 'Last Name');
        $middleName = $this->emptyToNull($rowData['middle_name'] ?? '');
        $extensionName = $this->emptyToNull($rowData['extension_name'] ?? '');
        $email = $this->emptyToNull($rowData['email'] ?? '');
        $phone = $this->emptyToNull($rowData['phone_number'] ?? '');
        $sex = $this->normalizeSex($rowData['sex'] ?? '');
        $birthdate = $this->parseDateValue($rowData['birthdate'] ?? '', 'Birthdate', false);
        $civilStatus = $this->requireValue($rowData['civil_status'] ?? '', 'Civil Status');
        $birthCertificateNo = $this->emptyToNull($rowData['birth_certificate_no'] ?? '');
        $facebookAccount = $this->emptyToNull($rowData['facebook_account'] ?? '');
        $nationality = $this->emptyToNull($rowData['nationality'] ?? '') ?: 'Filipino';
        $educationalAttainment = $this->requireValue($rowData['educational_attainment'] ?? '', 'Educational Attainment');
        $employmentStatus = $this->requireValue($rowData['employment_status'] ?? '', 'Employment Status');
        $employmentType = $this->emptyToNull($rowData['employment_type'] ?? '');
        $learnerClassification = $this->requireValue($rowData['learner_classification'] ?? '', 'Learner Classification');
        $isPwd = $this->parseBooleanValue($rowData['is_pwd'] ?? '', false) ? 1 : 0;
        $disabilityType = $this->emptyToNull($rowData['disability_type'] ?? '');
        $disabilityCause = $this->emptyToNull($rowData['disability_cause'] ?? '');
        $qualificationLabel = $this->requireValue($rowData['qualification_name'] ?? '', 'Qualification');
        $batchName = $this->emptyToNull($rowData['batch_name'] ?? '');
        $scholarshipName = $this->emptyToNull($rowData['scholarship_type'] ?? '');
        $traineeStatus = $this->normalizeActiveStatus($rowData['trainee_status'] ?? '', 'active');

        $addressParts = $this->extractAddressPartsFromRow($rowData, null);
        if ($this->buildFullAddressFromParts($addressParts) === '') {
            throw new Exception('Address fields are incomplete.');
        }

        $birthdateObject = new DateTime($birthdate);
        $age = (new DateTime())->diff($birthdateObject)->y;
        $fullAddress = $this->buildFullAddressFromParts($addressParts);

        $qualification = $this->findQualificationByLabel($qualificationLabel);
        $batch = null;
        $batchId = null;

        if ($batchName) {
            $batch = $this->findBatchByName($batchName);
            if (!$batch) {
                throw new Exception('Batch "' . $batchName . '" was not found.');
            }

            $batchId = (int)$batch['batch_id'];
            if (!empty($batch['qualification_id']) && (int)$batch['qualification_id'] !== (int)$qualification['qualification_id']) {
                throw new Exception('Batch "' . $batchName . '" does not belong to qualification "' . $qualificationLabel . '".');
            }
        }

        $enrollmentStatus = $this->normalizeEnrollmentStatus($rowData['enrollment_status'] ?? '', $batchId > 0);
        $enrollmentDate = $this->parseDateTimeValue($rowData['enrollment_date'] ?? '', 'Enrollment Date', true);
        $privacyConsent = $this->parseBooleanValue($rowData['privacy_consent'] ?? '', true) ? 1 : 0;
        $schoolId = $this->emptyToNull($rowData['trainee_school_id'] ?? '');

        if ($schoolId === null && in_array($enrollmentStatus, ['approved', 'completed', 'qualified', 'unqualified'], true) && $batchId > 0) {
            $schoolYear = !empty($batch['start_date']) ? date('Y', strtotime($batch['start_date'])) : date('Y', strtotime($enrollmentDate));
            $schoolId = $this->generateTraineeSchoolId($batchId, $schoolYear);
        }

        $stmt = $this->conn->prepare(
            "INSERT INTO tbl_trainee_hdr (
                user_id, trainee_school_id, first_name, middle_name, last_name, extension_name,
                sex, birth_certificate_no, email, facebook_account, phone_number, address, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            null,
            $schoolId,
            $firstName,
            $middleName,
            $lastName,
            $extensionName,
            $sex,
            $birthCertificateNo,
            $email,
            $facebookAccount,
            $phone,
            $fullAddress,
            $traineeStatus
        ]);

        $traineeId = (int)$this->conn->lastInsertId();

        $stmt = $this->conn->prepare(
            "INSERT INTO tbl_trainee_dtl (
                trainee_id, civil_status, birthdate, age, birthplace_city, birthplace_province,
                birthplace_region, nationality, house_no_street, barangay, district,
                city_municipality, province, region
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $traineeId,
            $civilStatus,
            $birthdate,
            $age,
            $this->emptyToNull($rowData['birthplace_city'] ?? ''),
            $this->emptyToNull($rowData['birthplace_province'] ?? ''),
            $this->emptyToNull($rowData['birthplace_region'] ?? ''),
            $nationality,
            $this->emptyToNull($addressParts['house_no_street'] ?? ''),
            $this->emptyToNull($addressParts['barangay'] ?? ''),
            $this->emptyToNull($addressParts['district'] ?? ''),
            $this->emptyToNull($addressParts['city_municipality'] ?? ''),
            $this->emptyToNull($addressParts['province'] ?? ''),
            $this->emptyToNull($addressParts['region'] ?? '')
        ]);

        $stmt = $this->conn->prepare(
            "INSERT INTO tbl_trainee_ftr (
                trainee_id, educational_attainment, employment_status, employment_type,
                learner_classification, is_pwd, disability_type, disability_cause, privacy_consent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $traineeId,
            $educationalAttainment,
            $employmentStatus,
            $employmentType,
            $learnerClassification,
            $isPwd,
            $disabilityType,
            $disabilityCause,
            $privacyConsent
        ]);

        $offeredQualificationId = $this->resolveOrCreateOfferedQualification((int)$qualification['qualification_id']);
        $scholarship = $this->resolveScholarshipByName($scholarshipName);

        $stmt = $this->conn->prepare(
            "INSERT INTO tbl_enrollment (
                trainee_id, offered_qualification_id, batch_id, enrollment_date, status,
                scholarship_type, scholarship_type_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $traineeId,
            $offeredQualificationId,
            $batchId ?: null,
            $enrollmentDate,
            $enrollmentStatus,
            $scholarship ? $scholarship['scholarship_name'] : $scholarshipName,
            $scholarship['scholarship_type_id'] ?? null
        ]);

        $enrollmentId = (int)$this->conn->lastInsertId();

        if (in_array($enrollmentStatus, ['approved', 'completed', 'qualified', 'unqualified'], true)) {
            $stmt = $this->conn->prepare("INSERT INTO tbl_enrolled_trainee (enrollment_id, trainee_id) VALUES (?, ?)");
            $stmt->execute([$enrollmentId, $traineeId]);

            if (!empty($scholarshipName)) {
                $existingScholarship = $this->conn->prepare(
                    "SELECT scholarship_id FROM tbl_scholarship WHERE trainee_id = ? AND scholarship_name = ? LIMIT 1"
                );
                $existingScholarship->execute([$traineeId, $scholarshipName]);

                if (!$existingScholarship->fetch()) {
                    $stmt = $this->conn->prepare(
                        "INSERT INTO tbl_scholarship (trainee_id, scholarship_name, scholarship_type_id, date_granted)
                         VALUES (?, ?, ?, CURDATE())"
                    );
                    $stmt->execute([
                        $traineeId,
                        $scholarshipName,
                        $scholarship['scholarship_type_id'] ?? null
                    ]);
                }
            }
        }

        if ($enrollmentStatus === 'approved' && $batchId > 0) {
            $this->checkAndCloseBatch($batchId);
        }
    }

    private function importTrainerRow(array $rowData) {
        $firstName = $this->requireValue($rowData['first_name'] ?? '', 'First Name');
        $lastName = $this->requireValue($rowData['last_name'] ?? '', 'Last Name');
        $email = $this->emptyToNull($rowData['email'] ?? '');
        $phone = $this->emptyToNull($rowData['phone_number'] ?? '');
        $trainerStatus = $this->normalizeActiveStatus($rowData['trainer_status'] ?? '', 'active');
        $nttcNo = $this->emptyToNull($rowData['nttc_no'] ?? '');

        if ($email !== null) {
            $stmt = $this->conn->prepare("SELECT user_id FROM tbl_users WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                throw new Exception('Email "' . $email . '" already exists.');
            }
        }

        $qualificationLabels = $this->parseMultiValue($rowData['qualifications'] ?? '');
        if (empty($qualificationLabels)) {
            throw new Exception('At least one qualification is required.');
        }

        $ncLevelLabels = $this->parseMultiValue($rowData['nc_levels'] ?? '');
        if (count($ncLevelLabels) > 1 && count($ncLevelLabels) !== count($qualificationLabels)) {
            throw new Exception('NC Levels must match the number of qualifications when multiple values are provided.');
        }
        if (count($ncLevelLabels) === 1 && count($qualificationLabels) > 1) {
            $ncLevelLabels = array_fill(0, count($qualificationLabels), $ncLevelLabels[0]);
        }
        if (empty($ncLevelLabels)) {
            $ncLevelLabels = array_fill(0, count($qualificationLabels), '');
        }

        $qualificationRows = [];
        foreach ($qualificationLabels as $index => $qualificationLabel) {
            $qualification = $this->findQualificationByLabel($qualificationLabel);
            $resolvedNc = null;

            if (!empty($ncLevelLabels[$index])) {
                $resolvedNc = $this->findNcLevelByLabel($ncLevelLabels[$index]);
                if (!$resolvedNc) {
                    throw new Exception('NC level "' . $ncLevelLabels[$index] . '" was not found.');
                }
            } elseif (!empty($qualification['nc_level_id'])) {
                $resolvedNc = $this->findNcLevelById((int)$qualification['nc_level_id']);
            }

            $dedupeKey = $qualification['qualification_id'] . '|' . ($resolvedNc['nc_level_code'] ?? '');
            $qualificationRows[$dedupeKey] = [
                'qualification_id' => (int)$qualification['qualification_id'],
                'nc_level_id' => $resolvedNc['nc_level_id'] ?? null,
                'nc_level_code' => $resolvedNc['nc_level_code'] ?? ($qualification['nc_level_code'] ?? null)
            ];
        }

        $qualificationRows = array_values($qualificationRows);
        $primaryQualification = $qualificationRows[0];

        $usernameSeed = $this->emptyToNull($rowData['username'] ?? '') ?: ($firstName . '.' . $lastName);
        $username = $this->generateUniqueUsername($usernameSeed);
        $passwordHash = password_hash($this->emptyToNull($rowData['password'] ?? '') ?: 'password123', PASSWORD_DEFAULT);

        $stmt = $this->conn->prepare(
            "INSERT INTO tbl_users (role_id, username, password, email, status, date_created)
             VALUES (?, ?, ?, ?, ?, NOW())"
        );
        $stmt->execute([2, $username, $passwordHash, $email, $trainerStatus]);
        $userId = (int)$this->conn->lastInsertId();

        $addressParts = $this->extractAddressPartsFromRow($rowData, $rowData['address'] ?? null);
        $fullAddress = $this->buildFullAddressFromParts($addressParts);
        if ($fullAddress === '' && !empty($rowData['address'])) {
            $fullAddress = trim((string)$rowData['address']);
        }

        try {
            $stmt = $this->conn->prepare(
                "INSERT INTO tbl_trainer (
                    user_id, first_name, last_name, email, phone_number, qualification_id,
                    address, nttc_no, trainer_nc_level_id, nc_level, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $userId,
                $firstName,
                $lastName,
                $email,
                $phone,
                $primaryQualification['qualification_id'],
                $fullAddress ?: null,
                $nttcNo,
                $primaryQualification['nc_level_id'],
                $primaryQualification['nc_level_code'],
                $trainerStatus
            ]);
        } catch (Exception $schemaError) {
            $stmt = $this->conn->prepare(
                "INSERT INTO tbl_trainer (
                    user_id, first_name, last_name, email, phone_number, qualification_id,
                    address, nttc_no, nc_level, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $userId,
                $firstName,
                $lastName,
                $email,
                $phone,
                $primaryQualification['qualification_id'],
                $fullAddress ?: null,
                $nttcNo,
                $primaryQualification['nc_level_code'],
                $trainerStatus
            ]);
        }

        $trainerId = (int)$this->conn->lastInsertId();
        $this->saveTrainerAddressAndLink($trainerId, $addressParts, $fullAddress);

        try {
            $stmt = $this->conn->prepare(
                "INSERT INTO tbl_trainer_qualifications (trainer_id, qualification_id, nc_level_id, nc_file, experience_file)
                 VALUES (?, ?, ?, ?, ?)"
            );
            foreach ($qualificationRows as $qualificationRow) {
                $stmt->execute([
                    $trainerId,
                    $qualificationRow['qualification_id'],
                    $qualificationRow['nc_level_id'],
                    null,
                    null
                ]);
            }
        } catch (Exception $schemaError) {
            $stmt = $this->conn->prepare(
                "INSERT INTO tbl_trainer_qualifications (trainer_id, qualification_id, nc_level, nc_file, experience_file)
                 VALUES (?, ?, ?, ?, ?)"
            );
            foreach ($qualificationRows as $qualificationRow) {
                $stmt->execute([
                    $trainerId,
                    $qualificationRow['qualification_id'],
                    $qualificationRow['nc_level_code'],
                    null,
                    null
                ]);
            }
        }
    }

    private function extractAddressPartsFromRow(array $rowData, $fallbackAddress = null) {
        $parts = [
            'house_no_street' => trim((string)($rowData['house_no_street'] ?? '')),
            'barangay' => trim((string)($rowData['barangay'] ?? '')),
            'district' => trim((string)($rowData['district'] ?? '')),
            'city_municipality' => trim((string)($rowData['city_municipality'] ?? '')),
            'province' => trim((string)($rowData['province'] ?? '')),
            'region' => trim((string)($rowData['region'] ?? ''))
        ];

        $hasAnyPart = implode('', $parts) !== '';
        if (!$hasAnyPart && !empty($fallbackAddress)) {
            $parts = $this->parseLegacyAddressString($fallbackAddress);
        }

        return $parts;
    }

    private function parseLegacyAddressString($address) {
        $result = [
            'house_no_street' => null,
            'barangay' => null,
            'district' => null,
            'city_municipality' => null,
            'province' => null,
            'region' => null
        ];

        if (trim((string)$address) === '') {
            return $result;
        }

        $parts = array_values(array_filter(array_map('trim', explode(',', (string)$address))));
        if (empty($parts)) {
            return $result;
        }

        $lastPart = $parts[count($parts) - 1] ?? '';
        if (preg_match('/^region\b/i', $lastPart)) {
            $result['region'] = array_pop($parts);
        }

        if (count($parts) >= 5) {
            $slice = array_slice($parts, 0, 5);
            $result['house_no_street'] = $slice[0];
            $result['barangay'] = $slice[1];
            $result['district'] = $slice[2];
            $result['city_municipality'] = $slice[3];
            $result['province'] = $slice[4];
        } elseif (count($parts) === 4) {
            $result['house_no_street'] = $parts[0];
            $result['barangay'] = $parts[1];
            $result['city_municipality'] = $parts[2];
            $result['province'] = $parts[3];
        } elseif (count($parts) === 3) {
            $result['barangay'] = $parts[0];
            $result['city_municipality'] = $parts[1];
            $result['province'] = $parts[2];
        } elseif (count($parts) === 2) {
            $result['city_municipality'] = $parts[0];
            $result['province'] = $parts[1];
        } elseif (count($parts) === 1) {
            $result['province'] = $parts[0];
        }

        return $result;
    }

    private function buildFullAddressFromParts(array $parts) {
        $orderedParts = [
            $parts['house_no_street'] ?? null,
            $parts['barangay'] ?? null,
            $parts['district'] ?? null,
            $parts['city_municipality'] ?? null,
            $parts['province'] ?? null,
            $parts['region'] ?? null
        ];

        $filtered = array_values(array_filter(array_map(function ($value) {
            $text = trim((string)$value);
            return $text === '' ? null : $text;
        }, $orderedParts)));

        return implode(', ', $filtered);
    }

    private function saveTrainerAddressAndLink($trainerId, array $parts, $fallbackAddress = null) {
        $fullAddress = $this->buildFullAddressFromParts($parts);
        if ($fullAddress === '' && trim((string)$fallbackAddress) !== '') {
            $fullAddress = trim((string)$fallbackAddress);
        }

        if ($fullAddress === '') {
            return;
        }

        $this->ensureTrainerAddressSchema();

        try {
            $stmt = $this->conn->prepare(
                "INSERT INTO tbl_trainer_address (
                    house_no_street, barangay, district, city_municipality, province, region
                ) VALUES (?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $this->emptyToNull($parts['house_no_street'] ?? ''),
                $this->emptyToNull($parts['barangay'] ?? ''),
                $this->emptyToNull($parts['district'] ?? ''),
                $this->emptyToNull($parts['city_municipality'] ?? ''),
                $this->emptyToNull($parts['province'] ?? ''),
                $this->emptyToNull($parts['region'] ?? '')
            ]);

            $addressId = (int)$this->conn->lastInsertId();
            $stmt = $this->conn->prepare("UPDATE tbl_trainer SET address_id = ?, address = ? WHERE trainer_id = ?");
            $stmt->execute([$addressId, $fullAddress, $trainerId]);
        } catch (Exception $schemaError) {
            $stmt = $this->conn->prepare("UPDATE tbl_trainer SET address = ? WHERE trainer_id = ?");
            $stmt->execute([$fullAddress, $trainerId]);
        }
    }

    private function ensureTrainerAddressSchema() {
        static $checked = false;
        if ($checked) {
            return;
        }

        try {
            $this->conn->exec(
                "CREATE TABLE IF NOT EXISTS tbl_trainer_address (
                    address_id INT AUTO_INCREMENT PRIMARY KEY,
                    house_no_street VARCHAR(255) NULL,
                    barangay VARCHAR(255) NULL,
                    district VARCHAR(255) NULL,
                    city_municipality VARCHAR(255) NULL,
                    province VARCHAR(255) NULL,
                    region VARCHAR(255) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
            );
        } catch (Exception $ignored) {
        }

        try { $this->conn->exec("ALTER TABLE tbl_trainer ADD COLUMN address_id INT NULL"); } catch (Exception $ignored) {}
        try { $this->conn->exec("ALTER TABLE tbl_trainer ADD INDEX idx_trainer_address_id (address_id)"); } catch (Exception $ignored) {}
        try {
            $this->conn->exec(
                "ALTER TABLE tbl_trainer
                 ADD CONSTRAINT fk_trainer_address
                 FOREIGN KEY (address_id) REFERENCES tbl_trainer_address(address_id)
                 ON DELETE SET NULL ON UPDATE CASCADE"
            );
        } catch (Exception $ignored) {
        }

        $checked = true;
    }

    private function resolveOrCreateOfferedQualification($qualificationId) {
        $stmt = $this->conn->prepare(
            "SELECT offered_qualification_id FROM tbl_offered_qualifications WHERE qualification_id = ? LIMIT 1"
        );
        $stmt->execute([$qualificationId]);
        $offeredQualificationId = $stmt->fetchColumn();

        if ($offeredQualificationId) {
            return (int)$offeredQualificationId;
        }

        $stmt = $this->conn->prepare("INSERT INTO tbl_offered_qualifications (qualification_id) VALUES (?)");
        $stmt->execute([$qualificationId]);
        return (int)$this->conn->lastInsertId();
    }

    private function generateTraineeSchoolId($batchId, $year) {
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM tbl_trainee_hdr WHERE trainee_school_id LIKE ?");
        $stmt->execute([$batchId . '-' . $year . '-%']);
        $sequence = (int)$stmt->fetchColumn() + 1;

        return sprintf('%s-%s-%04d', $batchId, $year, $sequence);
    }

    private function findQualificationByLabel($label) {
        $catalog = $this->getQualificationCatalog();
        $normalized = $this->normalizeText($label);

        if ($normalized === '') {
            throw new Exception('Qualification is required.');
        }

        if (isset($catalog['by_full'][$normalized])) {
            return $catalog['by_full'][$normalized];
        }

        if (isset($catalog['by_name'][$normalized])) {
            if (count($catalog['by_name'][$normalized]) > 1) {
                $options = array_map(function ($row) {
                    return $row['full_label'];
                }, $catalog['by_name'][$normalized]);
                throw new Exception(
                    'Qualification "' . $label . '" is ambiguous. Use one of: ' . implode(', ', $options)
                );
            }

            return $catalog['by_name'][$normalized][0];
        }

        throw new Exception('Qualification "' . $label . '" was not found.');
    }

    private function getQualificationCatalog() {
        if ($this->qualificationCache !== null) {
            return $this->qualificationCache;
        }

        $rows = [];

        try {
            $stmt = $this->conn->query(
                "SELECT q.qualification_id, q.qualification_name, q.nc_level_id, nc.nc_level_code
                 FROM tbl_qualifications q
                 LEFT JOIN tbl_nc_levels nc ON q.nc_level_id = nc.nc_level_id"
            );
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $stmt = $this->conn->query("SELECT qualification_id, qualification_name, nc_level_id FROM tbl_qualifications");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $catalog = [
            'by_full' => [],
            'by_name' => []
        ];

        foreach ($rows as $row) {
            $row['qualification_id'] = (int)$row['qualification_id'];
            $row['nc_level_id'] = isset($row['nc_level_id']) ? (int)$row['nc_level_id'] : null;
            $row['nc_level_code'] = $row['nc_level_code'] ?? null;
            $row['full_label'] = trim($row['qualification_name'] . ' ' . ($row['nc_level_code'] ?? ''));

            $fullKey = $this->normalizeText($row['full_label']);
            $nameKey = $this->normalizeText($row['qualification_name']);

            if ($fullKey !== '') {
                $catalog['by_full'][$fullKey] = $row;
            }

            if ($nameKey !== '') {
                if (!isset($catalog['by_name'][$nameKey])) {
                    $catalog['by_name'][$nameKey] = [];
                }
                $catalog['by_name'][$nameKey][] = $row;
            }
        }

        $this->qualificationCache = $catalog;
        return $catalog;
    }

    private function findBatchByName($batchName) {
        $catalog = $this->getBatchCatalog();
        $normalized = $this->normalizeText($batchName);

        return $catalog[$normalized] ?? null;
    }

    private function getBatchCatalog() {
        if ($this->batchCache !== null) {
            return $this->batchCache;
        }

        $stmt = $this->conn->query("SELECT batch_id, batch_name, qualification_id, start_date FROM tbl_batch");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $catalog = [];

        foreach ($rows as $row) {
            $catalog[$this->normalizeText($row['batch_name'])] = $row;
        }

        $this->batchCache = $catalog;
        return $catalog;
    }

    private function resolveScholarshipByName($scholarshipName) {
        if ($scholarshipName === null || trim((string)$scholarshipName) === '') {
            return null;
        }

        $catalog = $this->getScholarshipCatalog();
        $normalized = $this->normalizeText($scholarshipName);

        return $catalog[$normalized] ?? [
            'scholarship_name' => $scholarshipName,
            'scholarship_type_id' => null
        ];
    }

    private function getScholarshipCatalog() {
        if ($this->scholarshipCache !== null) {
            return $this->scholarshipCache;
        }

        $stmt = $this->conn->query("SELECT scholarship_type_id, scholarship_name FROM tbl_scholarship_type");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $catalog = [];

        foreach ($rows as $row) {
            $catalog[$this->normalizeText($row['scholarship_name'])] = [
                'scholarship_type_id' => (int)$row['scholarship_type_id'],
                'scholarship_name' => $row['scholarship_name']
            ];
        }

        $this->scholarshipCache = $catalog;
        return $catalog;
    }

    private function findNcLevelByLabel($label) {
        $catalog = $this->getNcLevelCatalog();
        $normalized = $this->normalizeText($label);

        return $catalog['by_label'][$normalized] ?? null;
    }

    private function findNcLevelById($ncLevelId) {
        $catalog = $this->getNcLevelCatalog();
        return $catalog['by_id'][$ncLevelId] ?? null;
    }

    private function getNcLevelCatalog() {
        if ($this->ncLevelCache !== null) {
            return $this->ncLevelCache;
        }

        $stmt = $this->conn->query("SELECT nc_level_id, nc_level_code, nc_level_name FROM tbl_nc_levels");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $catalog = [
            'by_id' => [],
            'by_label' => []
        ];

        foreach ($rows as $row) {
            $row['nc_level_id'] = (int)$row['nc_level_id'];
            $catalog['by_id'][$row['nc_level_id']] = $row;
            $catalog['by_label'][$this->normalizeText($row['nc_level_code'])] = $row;
            $catalog['by_label'][$this->normalizeText($row['nc_level_name'])] = $row;
        }

        $this->ncLevelCache = $catalog;
        return $catalog;
    }

    private function generateUniqueUsername($seed) {
        $base = strtolower(trim((string)$seed));
        $base = preg_replace('/[^a-z0-9.]+/', '.', $base);
        $base = trim(preg_replace('/\.{2,}/', '.', $base), '.');

        if ($base === '') {
            $base = 'user';
        }

        $candidate = $base;
        $counter = 1;

        while (true) {
            $stmt = $this->conn->prepare("SELECT user_id FROM tbl_users WHERE username = ? LIMIT 1");
            $stmt->execute([$candidate]);
            if (!$stmt->fetch()) {
                return $candidate;
            }

            $candidate = $base . $counter;
            $counter++;
        }
    }

    private function parseMultiValue($value) {
        $text = trim((string)$value);
        if ($text === '') {
            return [];
        }

        $parts = preg_split('/\s*\|\s*|\s*;\s*/', $text);
        return array_values(array_filter(array_map('trim', $parts), function ($item) {
            return $item !== '';
        }));
    }

    private function parseDateValue($value, $fieldName, $allowBlank = false) {
        $text = trim((string)$value);
        if ($text === '') {
            if ($allowBlank) {
                return null;
            }
            throw new Exception($fieldName . ' is required.');
        }

        $formats = ['Y-m-d', 'd/m/Y', 'm/d/Y', 'd-m-Y', 'm-d-Y', 'Y/m/d'];
        foreach ($formats as $format) {
            $date = DateTime::createFromFormat($format, $text);
            if ($date && $date->format($format) === $text) {
                return $date->format('Y-m-d');
            }
        }

        $timestamp = strtotime($text);
        if ($timestamp === false) {
            throw new Exception($fieldName . ' has an invalid date format.');
        }

        return date('Y-m-d', $timestamp);
    }

    private function parseDateTimeValue($value, $fieldName, $allowBlank = true) {
        $text = trim((string)$value);
        if ($text === '') {
            if ($allowBlank) {
                return date('Y-m-d H:i:s');
            }
            throw new Exception($fieldName . ' is required.');
        }

        $formats = [
            'Y-m-d H:i:s',
            'Y-m-d H:i',
            'm/d/Y H:i:s',
            'm/d/Y H:i',
            'd/m/Y H:i:s',
            'd/m/Y H:i',
            'Y-m-d'
        ];

        foreach ($formats as $format) {
            $date = DateTime::createFromFormat($format, $text);
            if ($date && $date->format($format) === $text) {
                return $date->format('Y-m-d H:i:s');
            }
        }

        $timestamp = strtotime($text);
        if ($timestamp === false) {
            throw new Exception($fieldName . ' has an invalid date or time format.');
        }

        return date('Y-m-d H:i:s', $timestamp);
    }

    private function normalizeSex($value) {
        $normalized = $this->normalizeText($value);
        if (in_array($normalized, ['male', 'm'], true)) {
            return 'Male';
        }
        if (in_array($normalized, ['female', 'f'], true)) {
            return 'Female';
        }
        throw new Exception('Sex must be Male or Female.');
    }

    private function normalizeEnrollmentStatus($value, $hasBatch) {
        $text = trim((string)$value);
        if ($text === '') {
            return $hasBatch ? 'approved' : 'pending';
        }

        $normalized = strtolower($text);
        $allowed = ['pending', 'approved', 'rejected', 'completed', 'qualified', 'unqualified', 'reserved'];
        if (!in_array($normalized, $allowed, true)) {
            throw new Exception('Enrollment Status "' . $value . '" is invalid.');
        }

        return $normalized;
    }

    private function normalizeActiveStatus($value, $default = 'active') {
        $text = trim((string)$value);
        if ($text === '') {
            return $default;
        }

        $normalized = strtolower($text);
        if (!in_array($normalized, ['active', 'inactive'], true)) {
            throw new Exception('Status "' . $value . '" is invalid.');
        }

        return $normalized;
    }

    private function parseBooleanValue($value, $default = false) {
        $text = strtolower(trim((string)$value));
        if ($text === '') {
            return (bool)$default;
        }

        if (in_array($text, ['1', 'true', 'yes', 'y'], true)) {
            return true;
        }

        if (in_array($text, ['0', 'false', 'no', 'n'], true)) {
            return false;
        }

        return (bool)$default;
    }

    private function normalizeText($value) {
        $text = strtolower(trim((string)$value));
        $text = preg_replace('/[^a-z0-9]+/', ' ', $text);
        return trim($text);
    }

    private function requireValue($value, $label) {
        $text = trim((string)$value);
        if ($text === '') {
            throw new Exception($label . ' is required.');
        }
        return $text;
    }

    private function emptyToNull($value) {
        $text = trim((string)$value);
        return $text === '' ? null : $text;
    }

    private function sanitizeUserType($userType) {
        return strtolower((string)$userType) === 'trainer' ? 'trainer' : 'trainee';
    }

    private function isNumericRowEmpty(array $row) {
        foreach ($row as $value) {
            if (trim((string)$value) !== '') {
                return false;
            }
        }
        return true;
    }

    private function isAssocRowEmpty(array $row) {
        foreach ($row as $value) {
            if (trim((string)$value) !== '') {
                return false;
            }
        }
        return true;
    }

    private function sendJson(array $payload, $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode($payload);
    }

    private function checkAndCloseBatch($batchId) {
        if (!$batchId) {
            return;
        }

        $stmtBatch = $this->conn->prepare(
            "SELECT batch_id, qualification_id, max_trainees, training_cost, batch_name, trainer_id, scholarship_type, scholarship_type_id, status
             FROM tbl_batch WHERE batch_id = ?"
        );
        $stmtBatch->execute([$batchId]);
        $batch = $stmtBatch->fetch(PDO::FETCH_ASSOC);

        if (!$batch) {
            return;
        }

        $stmtCount = $this->conn->prepare(
            "SELECT COUNT(*) FROM tbl_enrollment WHERE batch_id = ? AND status = 'approved'"
        );
        $stmtCount->execute([$batchId]);
        $traineeCount = (int)$stmtCount->fetchColumn();

        if ($traineeCount >= (int)$batch['max_trainees'] && $batch['status'] !== 'closed') {
            $stmtClose = $this->conn->prepare("UPDATE tbl_batch SET status = 'closed' WHERE batch_id = ?");
            $stmtClose->execute([$batchId]);

            $stmtCheckOpen = $this->conn->prepare(
                "SELECT batch_id FROM tbl_batch WHERE qualification_id = ? AND status = 'open' LIMIT 1"
            );
            $stmtCheckOpen->execute([$batch['qualification_id']]);
            $openBatch = $stmtCheckOpen->fetch(PDO::FETCH_ASSOC);

            if (!$openBatch) {
                $this->createNextBatch($batch);
            }
        }
    }

    private function createNextBatch(array $previousBatch) {
        try {
            $stmtGetQual = $this->conn->prepare(
                "SELECT qualification_name FROM tbl_qualifications WHERE qualification_id = ?"
            );
            $stmtGetQual->execute([$previousBatch['qualification_id']]);
            $qualification = $stmtGetQual->fetch(PDO::FETCH_ASSOC);

            if (!$qualification) {
                return null;
            }

            $stmtCount = $this->conn->prepare(
                "SELECT COUNT(*) FROM tbl_batch WHERE qualification_id = ? AND batch_name LIKE ?"
            );
            $stmtCount->execute([
                $previousBatch['qualification_id'],
                $qualification['qualification_name'] . '%'
            ]);
            $batchSequence = (int)$stmtCount->fetchColumn() + 1;

            $newBatchName = $qualification['qualification_name'] . ' - Batch ' . $batchSequence;
            $startDate = date('Y-m-d');
            $endDate = date('Y-m-d', strtotime('+1 month'));

            $stmtInsert = $this->conn->prepare(
                "INSERT INTO tbl_batch (
                    qualification_id, trainer_id, batch_name, scholarship_type, scholarship_type_id,
                    start_date, end_date, status, max_trainees, training_cost
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)"
            );
            $stmtInsert->execute([
                $previousBatch['qualification_id'],
                $previousBatch['trainer_id'],
                $newBatchName,
                $previousBatch['scholarship_type'],
                $previousBatch['scholarship_type_id'] ?? null,
                $startDate,
                $endDate,
                $previousBatch['max_trainees'],
                $previousBatch['training_cost'] ?? null
            ]);

            return (int)$this->conn->lastInsertId();
        } catch (Exception $e) {
            error_log('Batch auto-creation failed: ' . $e->getMessage());
            return null;
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$import = new BulkImport($db);
$import->handleRequest();
?>
