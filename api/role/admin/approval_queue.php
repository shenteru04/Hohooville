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
    case 'list':
        getPendingEnrollments($conn);
        break;
    case 'list_reserved':
        getReservedEnrollments($conn);
        break;
    case 'approve':
        processEnrollment($conn, 'approved');
        break;
    case 'reject':
        processEnrollment($conn, 'rejected');
        break;
    case 'reserve':
        processEnrollment($conn, 'reserved');
        break;
    case 'reassign':
        reassignBatch($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function getPendingEnrollments($conn) {
    try {
        // Join with trainee, offered_courses -> course, and batch to get details
        $query = "
            SELECT 
                e.enrollment_id, 
                e.enrollment_date, 
                e.status,
                e.scholarship_type,
                h.*, 
                d.civil_status, d.birthdate, d.age, d.birthplace_city, d.birthplace_province, d.birthplace_region, d.nationality, 
                d.house_no_street, d.barangay, d.district, d.city_municipality, d.province, d.region,
                f.educational_attainment, f.employment_status, f.employment_type, f.learner_classification, 
                f.is_pwd, f.disability_type, f.disability_cause, f.privacy_consent, f.digital_signature,
                c.qualification_name as course_name,
                b.batch_name,
                (SELECT COUNT(*) FROM tbl_enrollment en WHERE en.batch_id = e.batch_id AND en.status = 'approved') as current_batch_count
            FROM tbl_enrollment e
            JOIN tbl_trainee_hdr h ON e.trainee_id = h.trainee_id
            LEFT JOIN tbl_trainee_dtl d ON h.trainee_id = d.trainee_id
            LEFT JOIN tbl_trainee_ftr f ON h.trainee_id = f.trainee_id
            LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
            LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
            LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
            WHERE e.status = 'qualified'
            ORDER BY e.enrollment_date ASC
        ";
        $stmt = $conn->query($query);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getReservedEnrollments($conn) {
    try {
        $query = "
            SELECT 
                e.enrollment_id, 
                e.enrollment_date, 
                e.status,
                h.trainee_id, h.first_name, h.last_name, h.photo_file,
                c.qualification_id, c.qualification_name as course_name
            FROM tbl_enrollment e
            JOIN tbl_trainee_hdr h ON e.trainee_id = h.trainee_id
            LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
            LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
            WHERE e.status = 'reserved'
            ORDER BY e.enrollment_date ASC
        ";
        $stmt = $conn->query($query);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function processEnrollment($conn, $status) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $enrollmentId = $data['enrollment_id'] ?? null;
        $rejectionReason = $data['rejection_reason'] ?? '';

        if (!$enrollmentId) {
            throw new Exception('Enrollment ID is required');
        }

        // Fetch trainee details for email notification
        $stmtDetails = $conn->prepare("
            SELECT 
                h.email, h.first_name, h.last_name,
                b.batch_name, c.qualification_name as course_name
            FROM tbl_enrollment e
            JOIN tbl_trainee_hdr h ON e.trainee_id = h.trainee_id
            LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
            LEFT JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
            LEFT JOIN tbl_qualifications c ON oq.qualification_id = c.qualification_id
            WHERE e.enrollment_id = ?
        ");
        $stmtDetails->execute([$enrollmentId]);
        $traineeDetails = $stmtDetails->fetch(PDO::FETCH_ASSOC);

        $conn->beginTransaction();

        if ($status === 'approved') {
            finalizeApproval($conn, $enrollmentId, $data['scholarship_type'] ?? null);
        } else { // 'rejected' or 'reserved'
            // Just update the status
            $stmt = $conn->prepare("UPDATE tbl_enrollment SET status = ? WHERE enrollment_id = ?");
            $stmt->execute([$status, $enrollmentId]);
        }

        $conn->commit();

        $emailSent = false;
        if ($traineeDetails && !empty($traineeDetails['email'])) {
            $emailSent = sendNotificationEmail($traineeDetails, $status, $rejectionReason);
        }

        $message = 'Enrollment ' . $status . ' successfully';
        if (!$emailSent && $traineeDetails && !empty($traineeDetails['email'])) {
            $message .= ' (Warning: Could not send notification email. Please check server mail configuration.)';
        }

        echo json_encode(['success' => true, 'message' => $message]);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function finalizeApproval($conn, $enrollmentId, $scholarshipType) {
    // Get trainee_id and batch_id
    $stmtGet = $conn->prepare("SELECT trainee_id, batch_id, enrollment_date FROM tbl_enrollment WHERE enrollment_id = ?");
    $stmtGet->execute([$enrollmentId]);
    $enrollment = $stmtGet->fetch(PDO::FETCH_ASSOC);

    if ($enrollment) {
        $traineeId = $enrollment['trainee_id'];
        $batchId = $enrollment['batch_id'];
        $year = date('Y', strtotime($enrollment['enrollment_date']));

        // Update enrollment status
        $stmtUpdateStatus = $conn->prepare("UPDATE tbl_enrollment SET status = ? WHERE enrollment_id = ?");
        $stmtUpdateStatus->execute(['approved', $enrollmentId]);

        // Generate unique trainee school ID if it doesn't exist
        $stmtCheckId = $conn->prepare("SELECT trainee_school_id FROM tbl_trainee_hdr WHERE trainee_id = ?");
        $stmtCheckId->execute([$traineeId]);
        if (!$stmtCheckId->fetchColumn()) {
            // Count approved trainees globally for the year to get the new trainee's number.
            // This count includes the current trainee since we just updated the status.
            $stmtCount = $conn->prepare("SELECT COUNT(*) FROM tbl_enrollment WHERE status = 'approved' AND YEAR(enrollment_date) = ?");
            $stmtCount->execute([$year]);
            $traineeCount = $stmtCount->fetchColumn();

            // Format: BATCH_ID-YEAR-000N
            $schoolId = sprintf('%s-%s-%04d', $batchId, $year, $traineeCount);

            // Update trainee header with the new school ID
            $stmtUpdateId = $conn->prepare("UPDATE tbl_trainee_hdr SET trainee_school_id = ? WHERE trainee_id = ?");
            $stmtUpdateId->execute([$schoolId, $traineeId]);
        }

        // Check if already in enrolled_trainee
        $stmtCheck = $conn->prepare("SELECT enrolled_id FROM tbl_enrolled_trainee WHERE enrollment_id = ?");
        $stmtCheck->execute([$enrollmentId]);

        if (!$stmtCheck->fetch()) {
            $stmtIns = $conn->prepare("INSERT INTO tbl_enrolled_trainee (enrollment_id, trainee_id) VALUES (?, ?)");
            $stmtIns->execute([$enrollmentId, $traineeId]);
        }

        // Assign Financial Classification / Scholarship if provided
        if (!empty($scholarshipType)) {
            $stmtSchCheck = $conn->prepare("SELECT scholarship_id FROM tbl_scholarship WHERE trainee_id = ? AND scholarship_name = ?");
            $stmtSchCheck->execute([$traineeId, $scholarshipType]);
            if (!$stmtSchCheck->fetch()) {
                $stmtSch = $conn->prepare("INSERT INTO tbl_scholarship (trainee_id, scholarship_name, date_granted) VALUES (?, ?, NOW())");
                $stmtSch->execute([$traineeId, $scholarshipType]);
            }
        }

        // Create notification for the trainee (target specific user if available)
        try {
            // Fetch trainee details for notification
            $stmtDetails = $conn->prepare("
                SELECT h.user_id, c.qualification_name as course_name
                FROM tbl_enrollment e
                JOIN tbl_trainee_hdr h ON e.trainee_id = h.trainee_id
                LEFT JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
                LEFT JOIN tbl_qualifications c ON oq.qualification_id = c.qualification_id
                WHERE e.enrollment_id = ?
            ");
            $stmtDetails->execute([$enrollmentId]);
            $details = $stmtDetails->fetch(PDO::FETCH_ASSOC);

            $targetUserId = $details['user_id'] ?? null;
            $messageNotif = 'Your enrollment for ' . ($details['course_name'] ?? 'the course') . ' has been approved.';
            if ($targetUserId) {
                // Insert notification for specific user
                $nstmt = $conn->prepare("INSERT INTO tbl_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)");
                $nstmt->execute([$targetUserId, 'Enrollment Approved', $messageNotif, null]);
            }
        } catch (Exception $ne) {
            // ignore notification errors
        }
    } else {
        throw new Exception('Enrollment record not found.');
    }
}

function reassignBatch($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $enrollmentId = $data['enrollment_id'] ?? null;
        $newBatchId = $data['new_batch_id'] ?? null;

        if (!$enrollmentId || !$newBatchId) {
            throw new Exception('Enrollment ID and New Batch ID are required');
        }

        $conn->beginTransaction();

        // Update the batch_id for the enrollment
        $stmtUpdateBatch = $conn->prepare("UPDATE tbl_enrollment SET batch_id = ? WHERE enrollment_id = ?");
        $stmtUpdateBatch->execute([$newBatchId, $enrollmentId]);

        // Now, run the standard approval process
        finalizeApproval($conn, $enrollmentId, null); // Scholarship is not changed here

        // Fetch details for email
        $stmtDetails = $conn->prepare("
            SELECT h.email, h.first_name, h.last_name, b.batch_name, c.qualification_name as course_name
            FROM tbl_enrollment e
            JOIN tbl_trainee_hdr h ON e.trainee_id = h.trainee_id
            LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
            LEFT JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
            LEFT JOIN tbl_qualifications c ON oq.qualification_id = c.qualification_id
            WHERE e.enrollment_id = ?
        ");
        $stmtDetails->execute([$enrollmentId]);
        $traineeDetails = $stmtDetails->fetch(PDO::FETCH_ASSOC);

        $conn->commit();

        $emailSent = false;
        if ($traineeDetails && !empty($traineeDetails['email'])) {
            $emailSent = sendNotificationEmail($traineeDetails, 'approved');
        }

        $message = 'Trainee reassigned and enrollment approved.';
        if (!$emailSent && $traineeDetails && !empty($traineeDetails['email'])) {
            $message .= ' (Warning: Could not send notification email.)';
        }

        echo json_encode(['success' => true, 'message' => $message]);

    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function sendNotificationEmail($details, $status, $reason = '') {
    $to = $details['email'];
    $name = $details['first_name'] . ' ' . $details['last_name'];
    $course = $details['course_name'] ?? 'Course';
    $batch = $details['batch_name'] ?? 'Batch';
    
    $brandColor = '#4e73df';
    $successColor = '#28a745';
    $warnColor = '#ffc107';
    $dangerColor = '#dc3545';

    if ($status === 'approved') {
        $subject = "🎉 Congratulations! Your Application has been Approved";
        $message = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
                .header { background: linear-gradient(135deg, $brandColor 0%, #5a7ee0 100%); color: white; padding: 40px 30px; text-align: center; }
                .header h1 { font-size: 28px; margin-bottom: 10px; font-weight: 700; }
                .header .subtitle { font-size: 14px; opacity: 0.95; }
                .badge { display: inline-block; background: $successColor; color: white; padding: 8px 16px; border-radius: 50px; font-size: 13px; font-weight: 600; margin: 15px 0; }
                .content { padding: 40px 30px; }
                .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
                .greeting strong { color: $brandColor; }
                .status-card { background: linear-gradient(135deg, #f0f7ff 0%, #e8f1ff 100%); border-left: 5px solid $successColor; padding: 20px; border-radius: 8px; margin: 25px 0; }
                .status-card .label { font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; }
                .status-card .value { font-size: 20px; color: $successColor; font-weight: 700; margin-top: 5px; }
                .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .info-box h3 { color: $brandColor; font-size: 16px; margin-bottom: 15px; font-weight: 600; display: flex; align-items: center; }
                .info-box h3 .icon { font-size: 20px; margin-right: 10px; }
                .info-box ul { list-style: none; }
                .info-box li { padding: 10px 0; border-bottom: 1px solid #e0e0e0; font-size: 14px; color: #555; display: flex; align-items: flex-start; }
                .info-box li:last-child { border-bottom: none; }
                .info-box li:before { content: '✓'; color: $successColor; font-weight: bold; margin-right: 12px; font-size: 16px; min-width: 20px; }
                .cta-button { display: inline-block; background: linear-gradient(135deg, $brandColor 0%, #5a7ee0 100%); color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 15px; }
                .divider { border: none; border-top: 2px solid #f0f0f0; margin: 30px 0; }
                .footer-text { text-align: center; color: #999; font-size: 13px; margin-top: 30px; padding-top: 30px; border-top: 1px solid #f0f0f0; }
                .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; font-size: 12px; }
                .footer a { color: $brandColor; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🎓 Welcome!</h1>
                    <p class='subtitle'>Your journey with us begins now</p>
                </div>
                <div class='content'>
                    <p class='greeting'>Dear <strong>$name</strong>,</p>
                    
                    <div class='status-card'>
                        <div class='label'>Status</div>
                        <div class='value'>✓ APPROVED</div>
                    </div>
                    
                    <p style='color: #555; line-height: 1.6; margin-bottom: 20px;'>
                        Congratulations! We are thrilled to inform you that your application for <strong>$course</strong> (<em>$batch</em>) has been <strong>APPROVED</strong>. Your application stood out among many qualified candidates, and we're confident you'll thrive in our program.
                    </p>
                    
                    <div class='info-box'>
                        <h3><span class='icon'>📋</span> What's Next?</h3>
                        <ul>
                            <li>Your account is being prepared and will be activated soon</li>
                            <li>Your login credentials will be sent within 1-2 business days</li>
                            <li>Access course materials and complete your online orientation</li>
                            <li>Review the Student Handbook and Training Schedule</li>
                        </ul>
                    </div>
                    
                    <div class='info-box'>
                        <h3><span class='icon'>⏰</span> Timeline</h3>
                        <ul>
                            <li><strong>Day 1-2:</strong> Account setup and credential generation</li>
                            <li><strong>Day 3-5:</strong> Access to portal and orientation materials</li>
                            <li><strong>Day 7:</strong> First class begins</li>
                        </ul>
                    </div>
                    
                    <p style='color: #666; font-size: 14px; margin-top: 25px;'>
                        We're here to support your success every step of the way. Don't hesitate to reach out if you have any questions!
                    </p>
                    
                    <p class='footer-text'>
                        Best regards,<br>
                        <strong>Hohoo-Ville Technical School</strong><br>
                        Registrar's Office
                    </p>
                </div>
                <div class='footer'>
                    <p>📧 registrar@hohoo-ville.edu | 📞 +1 (123) 456-7890 | 🌐 www.hohoo-ville.edu</p>
                </div>
            </div>
        </body>
        </html>";
    } elseif ($status === 'reserved') {
        $subject = "📋 Your Application Status: On Our Priority Waitlist";
        $message = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
                .header { background: linear-gradient(135deg, $warnColor 0%, #ffb700 100%); color: #333; padding: 40px 30px; text-align: center; }
                .header h1 { font-size: 28px; margin-bottom: 10px; font-weight: 700; }
                .header .subtitle { font-size: 14px; opacity: 0.9; }
                .badge { display: inline-block; background: $warnColor; color: #333; padding: 8px 16px; border-radius: 50px; font-size: 13px; font-weight: 600; margin: 15px 0; }
                .content { padding: 40px 30px; }
                .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
                .greeting strong { color: $warnColor; }
                .status-card { background: linear-gradient(135deg, #fffaf0 0%, #fff9e6 100%); border-left: 5px solid $warnColor; padding: 20px; border-radius: 8px; margin: 25px 0; }
                .status-card .label { font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; }
                .status-card .value { font-size: 20px; color: $warnColor; font-weight: 700; margin-top: 5px; }
                .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .info-box h3 { color: $warnColor; font-size: 16px; margin-bottom: 15px; font-weight: 600; display: flex; align-items: center; }
                .info-box h3 .icon { font-size: 20px; margin-right: 10px; }
                .info-box ul { list-style: none; }
                .info-box li { padding: 10px 0; border-bottom: 1px solid #e0e0e0; font-size: 14px; color: #555; display: flex; align-items: flex-start; }
                .info-box li:last-child { border-bottom: none; }
                .info-box li:before { content: '→'; color: $warnColor; font-weight: bold; margin-right: 12px; font-size: 16px; min-width: 20px; }
                .reason-box { background: linear-gradient(135deg, #fff5e6 0%, #ffe6cc 100%); border: 2px solid $warnColor; padding: 15px; border-radius: 8px; margin: 20px 0; }
                .reason-box strong { color: $warnColor; }
                .divider { border: none; border-top: 2px solid #f0f0f0; margin: 30px 0; }
                .footer-text { text-align: center; color: #999; font-size: 13px; margin-top: 30px; padding-top: 30px; border-top: 1px solid #f0f0f0; }
                .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; font-size: 12px; }
                .footer a { color: $warnColor; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>⏳ Thank You!</h1>
                    <p class='subtitle'>Your application is now on our priority list</p>
                </div>
                <div class='content'>
                    <p class='greeting'>Dear <strong>$name</strong>,</p>
                    
                    <div class='status-card'>
                        <div class='label'>Status</div>
                        <div class='value'>📌 RESERVED (Priority Waitlist)</div>
                    </div>
                    
                    <p style='color: #555; line-height: 1.6; margin-bottom: 20px;'>
                        Thank you for your application for <strong>$course</strong>. We've reviewed your submission and believe you're a strong candidate. Unfortunately, our current batch is at full capacity, but we don't want to lose you!
                    </p>
                    
                    <div class='reason-box'>
                        <strong>Remark:</strong><br>$reason
                    </div>
                    
                    <div class='info-box'>
                        <h3><span class='icon'>✨</span> You're In Our Priority List</h3>
                        <ul>
                            <li>Your application is secured on our waitlist</li>
                            <li>You'll be contacted first when a spot opens in upcoming batches</li>
                            <li>Priority given to reserved applicants over new applications</li>
                            <li>No need to reapply - we'll reach out to you directly</li>
                        </ul>
                    </div>
                    
                    <div class='info-box'>
                        <h3><span class='icon'>🎯</span> In the Meantime</h3>
                        <ul>
                            <li>Explore our other training programs and specializations</li>
                            <li>Check out our learning resources and guides</li>
                            <li>Follow us on social media for announcements</li>
                            <li>Contact admissions to discuss alternative options</li>
                        </ul>
                    </div>
                    
                    <p style='color: #666; font-size: 14px; margin-top: 25px;'>
                        We truly value your interest in our program and promise to get back to you as soon as an opportunity arises. Thank you for your patience!
                    </p>
                    
                    <p class='footer-text'>
                        Warm regards,<br>
                        <strong>Hohoo-Ville Technical School</strong><br>
                        Registrar's Office
                    </p>
                </div>
                <div class='footer'>
                    <p>📧 registrar@hohoo-ville.edu | 📞 +1 (123) 456-7890 | 🌐 www.hohoo-ville.edu</p>
                </div>
            </div>
        </body>
        </html>";
    } else {
        $subject = "📌 Your Application Status - Next Steps Available";
        $message = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
                .header { background: linear-gradient(135deg, $dangerColor 0%, #c92a2a 100%); color: white; padding: 40px 30px; text-align: center; }
                .header h1 { font-size: 28px; margin-bottom: 10px; font-weight: 700; }
                .header .subtitle { font-size: 14px; opacity: 0.95; }
                .badge { display: inline-block; background: $dangerColor; color: white; padding: 8px 16px; border-radius: 50px; font-size: 13px; font-weight: 600; margin: 15px 0; }
                .content { padding: 40px 30px; }
                .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
                .greeting strong { color: $dangerColor; }
                .status-card { background: linear-gradient(135deg, #ffe0e0 0%, #ffcccc 100%); border-left: 5px solid $dangerColor; padding: 20px; border-radius: 8px; margin: 25px 0; }
                .status-card .label { font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; }
                .status-card .value { font-size: 20px; color: $dangerColor; font-weight: 700; margin-top: 5px; }
                .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e9ecef; }
                .info-box h3 { color: #333; font-size: 16px; margin-bottom: 15px; font-weight: 600; display: flex; align-items: center; }
                .info-box h3 .icon { font-size: 20px; margin-right: 10px; }
                .info-box ul { list-style: none; }
                .info-box li { padding: 10px 0; border-bottom: 1px solid #e0e0e0; font-size: 14px; color: #555; display: flex; align-items: flex-start; }
                .info-box li:last-child { border-bottom: none; }
                .info-box li:before { content: '▸'; color: $dangerColor; font-weight: bold; margin-right: 12px; font-size: 16px; min-width: 20px; }
                .feedback-box { background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%); border: 2px solid #ffcccc; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .feedback-box .label { font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; }
                .feedback-box .content { font-size: 16px; color: #333; margin-top: 10px; line-height: 1.6; }
                .highlight-box { background: #f0f7ff; border-left: 4px solid #4e73df; padding: 15px; border-radius: 4px; margin: 20px 0; }
                .divider { border: none; border-top: 2px solid #f0f0f0; margin: 30px 0; }
                .footer-text { text-align: center; color: #999; font-size: 13px; margin-top: 30px; padding-top: 30px; border-top: 1px solid #f0f0f0; }
                .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; font-size: 12px; }
                .footer a { color: $dangerColor; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>📌 Decision Update</h1>
                    <p class='subtitle'>Your next steps await</p>
                </div>
                <div class='content'>
                    <p class='greeting'>Dear <strong>$name</strong>,</p>
                    
                    <div class='status-card'>
                        <div class='label'>Status</div>
                        <div class='value'>⊘ NOT APPROVED AT THIS TIME</div>
                    </div>
                    
                    <p style='color: #555; line-height: 1.6; margin-bottom: 20px;'>
                        Thank you for applying to Hohoo-Ville Technical School and for your interest in <strong>$course</strong> ($batch). We've carefully reviewed your application, and while we were impressed by your enthusiasm, we aren't able to move forward with your application at this time.
                    </p>
                    
                    <div class='feedback-box'>
                        <div class='label'>📋 Feedback</div>
                        <div class='content'>$reason</div>
                    </div>
                    
                    <div class='highlight-box'>
                        <strong style='color: #4e73df;'>💡 This is Not the End!</strong><br><br>
                        Many successful students weren't accepted on their first attempt. Your rejection is an opportunity to grow, develop your skills, and come back stronger.
                    </div>
                    
                    <div class='info-box'>
                        <h3><span class='icon'>🚀</span> How to Move Forward</h3>
                        <ul>
                            <li>Address the feedback provided above</li>
                            <li>Strengthen your technical skills and qualifications</li>
                            <li>Reapply in our next intake period with improved credentials</li>
                            <li>Contact our admissions team for personalized guidance</li>
                        </ul>
                    </div>
                    
                    <div class='info-box'>
                        <h3><span class='icon'>🔄</span> Alternative Opportunities</h3>
                        <ul>
                            <li>Explore other programs that match your current skills</li>
                            <li>Take our free online preparation courses</li>
                            <li>Join our community of aspiring professionals</li>
                            <li>Get mentorship from industry experts</li>
                        </ul>
                    </div>
                    
                    <div class='info-box'>
                        <h3><span class='icon'>💬</span> Get Support</h3>
                        <ul>
                            <li>Schedule a consultation with our admissions counselor</li>
                            <li>Join our support community and connect with peers</li>
                            <li>Access free career guidance resources</li>
                            <li>Learn about reapplication timelines and requirements</li>
                        </ul>
                    </div>
                    
                    <p style='color: #666; font-size: 14px; margin-top: 25px;'>
                        We genuinely believe in your potential and would love to see you succeed with us in the future. Don't hesitate to reach out—we're here to help you on your journey.
                    </p>
                    
                    <p class='footer-text'>
                        Best of luck,<br>
                        <strong>Hohoo-Ville Technical School</strong><br>
                        Registrar's Office & Admissions Team
                    </p>
                </div>
                <div class='footer'>
                    <p>📧 registrar@hohoo-ville.edu | 📞 +1 (123) 456-7890 | 🌐 www.hohoo-ville.edu</p>
                </div>
            </div>
        </body>
        </html>";
    }

    $isSent = false;
    try {
        require_once __DIR__ . '/../../utils/EmailService.php';
        $emailSvc = new EmailService();
        $result = $emailSvc->sendEmail($to, $subject, $message);
        $isSent = $result['success'] ?? false;
        if (!$isSent) error_log("EmailService Failed: " . ($result['message'] ?? 'Unknown error'));
    } catch (Exception $e) {
        error_log("EmailService Exception: " . $e->getMessage());
    }

    return $isSent;
}
?>