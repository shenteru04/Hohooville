<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'list':
        getPendingApplications($conn);
        break;
    case 'list_unqualified':
        getUnqualifiedApplications($conn);
        break;
    case 'qualify':
        updateStatus($conn, 'qualified');
        break;
    case 'unqualify':
        updateStatus($conn, 'unqualified');
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getPendingApplications($conn) {
    try {
        $query = "SELECT e.enrollment_id, DATE_FORMAT(e.enrollment_date, '%Y-%m-%d %H:%i:%s') as enrollment_date, e.status, e.scholarship_type,
                         h.*, 
                         d.civil_status, d.birthdate, d.age, d.birthplace_city, d.birthplace_province, d.birthplace_region, d.nationality, 
                         d.house_no_street, d.barangay, d.district, d.city_municipality, d.province, d.region,
                         f.educational_attainment, f.employment_status, f.employment_type, f.learner_classification, 
                         f.is_pwd, f.disability_type, f.disability_cause, f.privacy_consent, f.digital_signature,
                         c.qualification_name as course_name, b.batch_name
                  FROM tbl_enrollment e
                  JOIN tbl_trainee_hdr h ON e.trainee_id = h.trainee_id
                  LEFT JOIN tbl_trainee_dtl d ON h.trainee_id = d.trainee_id
                  LEFT JOIN tbl_trainee_ftr f ON h.trainee_id = f.trainee_id
                  LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                  LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                  LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                  WHERE e.status = 'pending'
                  ORDER BY e.enrollment_date DESC";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getUnqualifiedApplications($conn) {
    try {
        $query = "SELECT e.enrollment_id, DATE_FORMAT(e.enrollment_date, '%Y-%m-%d %H:%i:%s') as enrollment_date, e.status, e.scholarship_type,
                         h.*, 
                         d.civil_status, d.birthdate, d.age, d.birthplace_city, d.birthplace_province, d.birthplace_region, d.nationality, 
                         d.house_no_street, d.barangay, d.district, d.city_municipality, d.province, d.region,
                         f.educational_attainment, f.employment_status, f.employment_type, f.learner_classification, 
                         f.is_pwd, f.disability_type, f.disability_cause, f.privacy_consent, f.digital_signature,
                         c.qualification_name as course_name, b.batch_name
                  FROM tbl_enrollment e
                  JOIN tbl_trainee_hdr h ON e.trainee_id = h.trainee_id
                  LEFT JOIN tbl_trainee_dtl d ON h.trainee_id = d.trainee_id
                  LEFT JOIN tbl_trainee_ftr f ON h.trainee_id = f.trainee_id
                  LEFT JOIN tbl_offered_qualifications oc ON e.offered_qualification_id = oc.offered_qualification_id
                  LEFT JOIN tbl_qualifications c ON oc.qualification_id = c.qualification_id
                  LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                  WHERE e.status = 'unqualified'
                  ORDER BY e.enrollment_date DESC";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateStatus($conn, $status) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['enrollment_id'] ?? null;

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'ID required']);
        return;
    }

    try {
        // Fetch details for email notification
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
        $stmtDetails->execute([$id]);
        $traineeDetails = $stmtDetails->fetch(PDO::FETCH_ASSOC);

        $stmt = $conn->prepare("UPDATE tbl_enrollment SET status = ? WHERE enrollment_id = ?");
        $stmt->execute([$status, $id]);

        $emailSent = false;
        if ($traineeDetails && !empty($traineeDetails['email'])) {
            $emailSent = sendQualificationEmail($traineeDetails, $status);
        }

        $message = 'Status updated to ' . $status;
        if (!$emailSent && $traineeDetails && !empty($traineeDetails['email'])) {
            $message .= ' (Warning: Could not send notification email.)';
        }

        echo json_encode(['success' => true, 'message' => $message]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function sendQualificationEmail($details, $status) {
    $to = $details['email'];
    $name = trim(($details['first_name'] ?? '') . ' ' . ($details['last_name'] ?? ''));
    $course = $details['course_name'] ?? 'your course';
    $batch = $details['batch_name'] ?? 'your batch';

    $brandColor = '#4e73df';
    $successColor = '#28a745';
    $dangerColor = '#dc3545';

    if ($status === 'qualified') {
        $subject = "Your Application Passed Initial Review";
        $message = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <style>
                body { font-family: Arial, Helvetica, sans-serif; background: #f5f7fb; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
                .header { background: $brandColor; color: #fff; padding: 24px; text-align: center; }
                .content { padding: 24px; color: #333; line-height: 1.6; }
                .badge { display: inline-block; background: $successColor; color: #fff; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
                .info { background: #f3f6ff; border-left: 4px solid $brandColor; padding: 12px; border-radius: 6px; margin: 16px 0; }
                .footer { padding: 16px 24px; font-size: 12px; color: #666; background: #f8f9fa; text-align: center; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h2>Hohoo-Ville Technical School</h2>
                </div>
                <div class='content'>
                    <p>Dear <strong>$name</strong>,</p>
                    <p>Your application for <strong>$course</strong> (<em>$batch</em>) has passed our initial review.</p>
                    <p><span class='badge'>QUALIFIED</span></p>
                    <div class='info'>
                        Your application has been forwarded to the Admin for final approval. We will notify you once a final decision is made.
                    </div>
                    <p>If you have any questions, please contact the registrar's office.</p>
                    <p>Thank you,<br><strong>Hohoo-Ville Technical School</strong></p>
                </div>
                <div class='footer'>This is an automated message. Please do not reply.</div>
            </div>
        </body>
        </html>";
    } elseif ($status === 'unqualified') {
        $subject = "Your Application Status Update";
        $message = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <style>
                body { font-family: Arial, Helvetica, sans-serif; background: #f5f7fb; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
                .header { background: $brandColor; color: #fff; padding: 24px; text-align: center; }
                .content { padding: 24px; color: #333; line-height: 1.6; }
                .badge { display: inline-block; background: $dangerColor; color: #fff; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
                .info { background: #fff5f5; border-left: 4px solid $dangerColor; padding: 12px; border-radius: 6px; margin: 16px 0; }
                .footer { padding: 16px 24px; font-size: 12px; color: #666; background: #f8f9fa; text-align: center; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h2>Hohoo-Ville Technical School</h2>
                </div>
                <div class='content'>
                    <p>Dear <strong>$name</strong>,</p>
                    <p>Thank you for your application for <strong>$course</strong> (<em>$batch</em>).</p>
                    <p><span class='badge'>NOT QUALIFIED</span></p>
                    <div class='info'>
                        We are unable to move your application forward at this time. You may reapply in the next intake.
                    </div>
                    <p>If you have questions, please contact the registrar's office.</p>
                    <p>Thank you,<br><strong>Hohoo-Ville Technical School</strong></p>
                </div>
                <div class='footer'>This is an automated message. Please do not reply.</div>
            </div>
        </body>
        </html>";
    } else {
        return false;
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
