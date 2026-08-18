<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../database/db.php';

class EmailService {
    private $mailer;
    private $fromEmail;
    private $fromName;
    private $conn;

    public function __construct() {
        $this->conn = (new Database())->getConnection();
        $this->ensureTemplateSchema();
        $this->mailer = new PHPMailer(true);
        
        // Configure SMTP
        $this->mailer->isSMTP();
        $this->mailer->Host = $_ENV['SMTP_HOST'] ?? 'smtp.gmail.com'; // Gmail SMTP
        $this->mailer->SMTPAuth = true;
        $this->mailer->Username = $_ENV['SMTP_USER'] ?? 'christiandaveboncales@gmail.com';
        $this->mailer->Password = $_ENV['SMTP_PASSWORD'] ?? 'utwy kkof fjjq jaok';
        $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $this->mailer->Port = 587;
        
        // Set from address
        $this->fromEmail = $_ENV['SMTP_USER'] ?? 'HohooVille@gmail.com';
        $this->fromName = 'Hohoo-ville Training System';
        
        $this->mailer->setFrom($this->fromEmail, $this->fromName);
    }

    /**
     * Send trainee account credentials email
     */
    public function sendTraineeAccountCredentials($traineeEmail, $traineeName, $username, $password) {
        return $this->sendTemplateEmail('trainee_account_created', $traineeEmail, [
            'user_name' => $traineeName,
            'trainee_name' => $traineeName,
            'user_email' => $traineeEmail,
            'username' => $username,
            'password' => $password
        ]);

        try {
            // Set recipient
            $this->mailer->addAddress($traineeEmail);

            // Subject
            $this->mailer->Subject = 'Your Hohoo-ville Account Credentials';

            // HTML Body
            $htmlBody = $this->getTraineeCredentialsTemplate($traineeName, $username, $password);
            $this->mailer->isHTML(true);
            $this->mailer->Body = $htmlBody;

            // Plain text fallback
            $this->mailer->AltBody = $this->getTraineeCredentialsPlainText($traineeName, $username, $password);

            // Send
            $this->mailer->send();
            
            return [
                'success' => true,
                'message' => 'Email sent successfully'
            ];
        } catch (Exception $e) {
            error_log('Email Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Email could not be sent. Reason: ' . $this->mailer->ErrorInfo
            ];
        } finally {
            // Clear mailer addresses for next use
            $this->mailer->clearAddresses();
        }
    }

    /**
     * Send trainer account credentials email
     */
    public function sendTrainerAccountCredentials($trainerEmail, $trainerName, $username, $password) {
        return $this->sendTemplateEmail('trainer_account_created', $trainerEmail, [
            'user_name' => $trainerName,
            'trainee_name' => $trainerName,
            'user_email' => $trainerEmail,
            'username' => $username,
            'password' => $password
        ]);

        try {
            $this->mailer->addAddress($trainerEmail);
            $this->mailer->Subject = 'Your Hohoo-ville Trainer Account Credentials';

            $htmlBody = $this->getTrainerCredentialsTemplate($trainerName, $username, $password);
            $this->mailer->isHTML(true);
            $this->mailer->Body = $htmlBody;
            $this->mailer->AltBody = $this->getTrainerCredentialsPlainText($trainerName, $username, $password);

            $this->mailer->send();
            
            return [
                'success' => true,
                'message' => 'Email sent successfully'
            ];
        } catch (Exception $e) {
            error_log('Email Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Email could not be sent. Reason: ' . $this->mailer->ErrorInfo
            ];
        } finally {
            $this->mailer->clearAddresses();
        }
    }

    /**
     * Generic send email method
     */
    public function sendEmail($to, $subject, $body) {
        try {
            $this->mailer->addAddress($to);
            $this->mailer->Subject = $subject;
            $this->mailer->isHTML(true);
            $this->mailer->Body = $body;
            $this->mailer->AltBody = strip_tags($body);

            $this->mailer->send();
            
            return [
                'success' => true,
                'message' => 'Email sent successfully'
            ];
        } catch (Exception $e) {
            error_log('Email Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Email could not be sent. Reason: ' . $this->mailer->ErrorInfo
            ];
        } finally {
            $this->mailer->clearAddresses();
        }
    }

    /**
     * HTML template for trainee credentials
     */
    private function getTraineeCredentialsTemplate($traineeName, $username, $password) {
        $loginUrl = 'http://localhost/Hohoo-ville/frontend/login.html';
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .credentials-box { background-color: white; border: 2px solid #ddd; border-radius: 5px; padding: 15px; margin: 20px 0; }
                .credential-item { margin: 10px 0; }
                .label { font-weight: bold; color: #007bff; }
                .value { background-color: #f0f0f0; padding: 8px; border-radius: 3px; font-family: monospace; word-break: break-all; }
                .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Welcome to Hohoo-ville!</h1>
                    <p>Training Management System</p>
                </div>
                
                <div class='content'>
                    <p>Hello <strong>{$traineeName}</strong>,</p>
                    
                    <p>Your training account has been created by the administrator. Below are your login credentials:</p>
                    
                    <div class='credentials-box'>
                        <div class='credential-item'>
                            <div class='label'>Username:</div>
                            <div class='value'>{$username}</div>
                        </div>
                        <div class='credential-item'>
                            <div class='label'>Password:</div>
                            <div class='value'>{$password}</div>
                        </div>
                    </div>
                    
                    <div class='warning'>
                        <strong>⚠️ Important Security Notes:</strong>
                        <ul style='margin: 5px 0; padding-left: 20px;'>
                            <li>Keep your credentials confidential and do not share them with anyone</li>
                            <li>We recommend changing your password on your first login</li>
                            <li>If you did not request this account, please contact the administrator immediately</li>
                        </ul>
                    </div>
                    
                    <p style='text-align: center;'>
                        <a href='{$loginUrl}' class='button'>Login to Your Account</a>
                    </p>
                    
                    <p>If you have any issues logging in or need assistance, please contact the training administrator.</p>
                </div>
                
                <div class='footer'>
                    <p>&copy; 2026 Hohoo-ville Training System. All rights reserved.</p>
                    <p>This is an automated email. Please do not reply to this message.</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Plain text template for trainee credentials
     */
    private function getTraineeCredentialsPlainText($traineeName, $username, $password) {
        $loginUrl = 'http://localhost/Hohoo-ville/frontend/login.html';
        
        return "
Welcome to Hohoo-ville! - Training Management System

Hello {$traineeName},

Your training account has been created by the administrator. Below are your login credentials:

Username: {$username}
Password: {$password}

IMPORTANT SECURITY NOTES:
- Keep your credentials confidential and do not share them with anyone
- We recommend changing your password on your first login
- If you did not request this account, please contact the administrator immediately

Login to your account: {$loginUrl}

If you have any issues logging in or need assistance, please contact the training administrator.

---
© 2026 Hohoo-ville Training System. All rights reserved.
This is an automated email. Please do not reply to this message.
        ";
    }

    /**
     * HTML template for trainer credentials
     */
    private function getTrainerCredentialsTemplate($trainerName, $username, $password) {
        $loginUrl = 'http://localhost/Hohoo-ville/frontend/login.html';
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .credentials-box { background-color: white; border: 2px solid #ddd; border-radius: 5px; padding: 15px; margin: 20px 0; }
                .credential-item { margin: 10px 0; }
                .label { font-weight: bold; color: #28a745; }
                .value { background-color: #f0f0f0; padding: 8px; border-radius: 3px; font-family: monospace; word-break: break-all; }
                .button { display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Welcome to Hohoo-ville!</h1>
                    <p>Trainer Portal</p>
                </div>
                
                <div class='content'>
                    <p>Hello <strong>{$trainerName}</strong>,</p>
                    
                    <p>Your trainer account has been created by the administrator. Below are your login credentials:</p>
                    
                    <div class='credentials-box'>
                        <div class='credential-item'>
                            <div class='label'>Username:</div>
                            <div class='value'>{$username}</div>
                        </div>
                        <div class='credential-item'>
                            <div class='label'>Password:</div>
                            <div class='value'>{$password}</div>
                        </div>
                    </div>
                    
                    <div class='warning'>
                        <strong>⚠️ Important Security Notes:</strong>
                        <ul style='margin: 5px 0; padding-left: 20px;'>
                            <li>Keep your credentials confidential and do not share them with anyone</li>
                            <li>We recommend changing your password on your first login</li>
                            <li>If you did not request this account, please contact the administrator immediately</li>
                        </ul>
                    </div>
                    
                    <p style='text-align: center;'>
                        <a href='{$loginUrl}' class='button'>Login to Your Account</a>
                    </p>
                    
                    <p>If you have any issues logging in or need assistance, please contact the administrator.</p>
                </div>
                
                <div class='footer'>
                    <p>&copy; 2026 Hohoo-ville Training System. All rights reserved.</p>
                    <p>This is an automated email. Please do not reply to this message.</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Sends a database-managed template after replacing its {{placeholders}}.
     */
    public function sendTemplateEmail($templateKey, $to, array $data = []) {
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'A valid recipient email address is required.'];
        }

        try {
            $stmt = $this->conn->prepare('SELECT subject, body_html, body_text, is_active FROM tbl_email_templates WHERE template_key = ? LIMIT 1');
            $stmt->execute([$templateKey]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$template) return ['success' => false, 'message' => "Email template '{$templateKey}' was not found."];
            if (!(int)$template['is_active']) return ['success' => false, 'message' => "Email template '{$templateKey}' is disabled."];

            $data += ['date' => date('F j, Y'), 'system_name' => 'Hohoo-ville Training System'];
            $missing = [];
            foreach ([$template['subject'], $template['body_html'], $template['body_text'] ?? ''] as $content) {
                preg_match_all('/{{\s*([a-zA-Z0-9_]+)\s*}}/', $content, $matches);
                foreach ($matches[1] as $key) if (!array_key_exists($key, $data) || $data[$key] === null || $data[$key] === '') $missing[$key] = true;
            }
            if ($missing) return ['success' => false, 'message' => 'Template data is missing: ' . implode(', ', array_keys($missing)) . '.'];

            $subject = $this->replaceTemplateValues($template['subject'], $data, false);
            $body = $this->replaceTemplateValues($template['body_html'], $data, true);
            $altBody = $template['body_text'] ? $this->replaceTemplateValues($template['body_text'], $data, false) : trim(strip_tags($body));
            return $this->sendPreparedEmail($to, $subject, $body, $altBody);
        } catch (Exception $e) {
            error_log('Template email error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Unable to prepare the email template.'];
        }
    }

    private function sendPreparedEmail($to, $subject, $body, $altBody = '') {
        try {
            $this->mailer->addAddress($to);
            $this->mailer->Subject = $subject;
            $this->mailer->isHTML(true);
            $this->mailer->Body = $body;
            $this->mailer->AltBody = $altBody ?: trim(strip_tags($body));
            $this->mailer->send();
            return ['success' => true, 'message' => 'Email sent successfully'];
        } catch (Exception $e) {
            error_log('Email Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Email could not be sent. Reason: ' . $this->mailer->ErrorInfo];
        } finally {
            $this->mailer->clearAddresses();
        }
    }

    private function replaceTemplateValues($content, array $data, $escapeHtml) {
        return preg_replace_callback('/{{\s*([a-zA-Z0-9_]+)\s*}}/', function ($match) use ($data, $escapeHtml) {
            $value = (string)$data[$match[1]];
            return $escapeHtml ? htmlspecialchars($value, ENT_QUOTES, 'UTF-8') : $value;
        }, $content);
    }

    private function ensureTemplateSchema() {
        $this->conn->exec("CREATE TABLE IF NOT EXISTS tbl_email_templates (template_id INT AUTO_INCREMENT PRIMARY KEY, template_key VARCHAR(100) UNIQUE NULL, template_name VARCHAR(255) UNIQUE NOT NULL, subject VARCHAR(255) NOT NULL, body_html TEXT NOT NULL, body_text TEXT NULL, variables TEXT NULL, is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
        $columns = $this->conn->query("SHOW COLUMNS FROM tbl_email_templates LIKE 'template_key'")->fetch();
        if (!$columns) $this->conn->exec("ALTER TABLE tbl_email_templates ADD COLUMN template_key VARCHAR(100) NULL UNIQUE AFTER template_id");

        $defaults = [
            ['trainee_account_created','Trainee Account Created','Your Hohoo-ville Account Credentials','<p>Hello {{user_name}},</p><p>Your account is ready.</p><p>Username: {{username}}<br>Password: {{password}}</p>',['user_name','user_email','username','password','system_name']],
            ['trainer_account_created','Trainer Account Created','Your Hohoo-ville Trainer Account Credentials','<p>Hello {{user_name}},</p><p>Your trainer account is ready.</p><p>Username: {{username}}<br>Password: {{password}}</p>',['user_name','user_email','username','password','system_name']],
            ['enrollment_approved','Enrollment Approved','Your enrollment has been approved','<p>Hello {{user_name}},</p><p>Your enrollment for {{course_name}} in {{batch_name}} has been approved.</p>',['user_name','user_email','course_name','batch_name','application_status','approval_date','system_name']],
            ['application_rejected','Application Rejected','Application {{application_id}} - Rejected','<p>Hello {{user_name}},</p><p>Your application for {{course_name}} was rejected.</p><p>Reason: {{rejection_reason}}</p>',['user_name','user_email','application_id','course_name','batch_name','application_status','rejection_reason','application_date','date','system_name']],
            ['application_qualified','Application Qualified','Your application passed initial review','<p>Hello {{user_name}},</p><p>Your application for {{course_name}} has passed initial review.</p>',['user_name','user_email','application_id','course_name','batch_name','application_status','application_date','date','system_name']]
        ];
        $stmt = $this->conn->prepare('INSERT INTO tbl_email_templates (template_key, template_name, subject, body_html, body_text, variables, is_active) VALUES (?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE template_key = COALESCE(template_key, VALUES(template_key))');
        foreach ($defaults as $item) $stmt->execute([$item[0], $item[1], $item[2], $item[3], strip_tags($item[3]), json_encode($item[4])]);
    }

    /**
     * Plain text template for trainer credentials
     */
    private function getTrainerCredentialsPlainText($trainerName, $username, $password) {
        $loginUrl = 'http://localhost/Hohoo-ville/frontend/login.html';

        return "
Welcome to Hohoo-ville! - Trainer Portal

Hello {$trainerName},

Your trainer account has been created by the administrator. Below are your login credentials:

Username: {$username}
Password: {$password}

IMPORTANT SECURITY NOTES:
- Keep your credentials confidential and do not share them with anyone
- We recommend changing your password on your first login
- If you did not request this account, please contact the administrator immediately

Login to your account: {$loginUrl}

If you have any issues logging in or need assistance, please contact the administrator.

---
© 2026 Hohoo-ville Training System. All rights reserved.
This is an automated email. Please do not reply to this message.
        ";
    }

    /**
     * Send learning material notification email to trainee
     */
    public function sendLearningMaterialNotification($traineeEmail, $traineeName, $contentType, $contentTitle, $lessonTitle) {
        try {
            $this->mailer->addAddress($traineeEmail);
            $this->mailer->Subject = "New $contentType Posted - Hohoo-ville Training";

            $htmlBody = $this->getLearningMaterialTemplate($traineeName, $contentType, $contentTitle, $lessonTitle);
            $this->mailer->isHTML(true);
            $this->mailer->Body = $htmlBody;
            $this->mailer->AltBody = $this->getLearningMaterialPlainText($traineeName, $contentType, $contentTitle, $lessonTitle);

            $this->mailer->send();
            
            return [
                'success' => true,
                'message' => 'Email sent successfully'
            ];
        } catch (Exception $e) {
            error_log('Learning Material Email Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Email could not be sent. Reason: ' . $this->mailer->ErrorInfo
            ];
        } finally {
            $this->mailer->clearAddresses();
        }
    }

    /**
     * HTML template for learning material notification
     */
    private function getLearningMaterialTemplate($traineeName, $contentType, $contentTitle, $lessonTitle) {
        $portalUrl = 'http://localhost/Hohoo-ville/frontend/html/trainee/pages/my_training.html';
        
        $contentDisplay = !empty($contentTitle) ? "<strong>$contentTitle</strong>" : "your lesson materials";
        if (!empty($lessonTitle)) {
            $contentDisplay .= " in <strong>$lessonTitle</strong>";
        }
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .material-box { background-color: white; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 3px; }
                .material-type { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
                .material-name { font-size: 18px; font-weight: bold; color: #2196F3; margin: 10px 0; }
                .material-description { color: #555; margin: 10px 0; }
                .button { display: inline-block; background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                .icon { font-size: 48px; text-align: center; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>📚 New Learning Material Posted</h1>
                    <p>Hohoo-ville Training System</p>
                </div>
                
                <div class='content'>
                    <p>Hello <strong>{$traineeName}</strong>,</p>
                    
                    <p>Your trainer has uploaded new learning material for your course:</p>
                    
                    <div class='material-box'>
                        <div class='material-type'>📄 {$contentType}</div>
                        <div class='material-name'>{$contentDisplay}</div>
                        <div class='material-description'>
                            This material is now available for you to view and study. 
                            Please log in to the training portal to access it.
                        </div>
                    </div>
                    
                    <p><strong>What to do next:</strong></p>
                    <ul>
                        <li>Log in to your trainee portal</li>
                        <li>Navigate to \"My Training\" section</li>
                        <li>Review the newly posted $contentType</li>
                        <li>Complete any associated tasks or quizzes as instructed</li>
                    </ul>
                    
                    <p style='text-align: center;'>
                        <a href='{$portalUrl}' class='button'>View in Training Portal</a>
                    </p>
                    
                    <p>If you have any questions or need assistance, please contact your trainer or the support team.</p>
                </div>
                
                <div class='footer'>
                    <p>&copy; 2026 Hohoo-ville Training System. All rights reserved.</p>
                    <p>This is an automated notification email. Please do not reply to this message.</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Plain text template for learning material notification
     */
    private function getLearningMaterialPlainText($traineeName, $contentType, $contentTitle, $lessonTitle) {
        $portalUrl = 'http://localhost/Hohoo-ville/frontend/html/trainee/pages/my_training.html';
        
        $contentDisplay = !empty($contentTitle) ? "'{$contentTitle}'" : "your lesson materials";
        if (!empty($lessonTitle)) {
            $contentDisplay .= " in '{$lessonTitle}'";
        }
        
        return "
NEW LEARNING MATERIAL POSTED - Hohoo-ville Training System

Hello {$traineeName},

Your trainer has uploaded new learning material for your course:

MATERIAL TYPE: {$contentType}
MATERIAL: {$contentDisplay}

This material is now available for you to view and study. Please log in to the training portal to access it.

What to do next:
- Log in to your trainee portal
- Navigate to \"My Training\" section
- Review the newly posted {$contentType}
- Complete any associated tasks or quizzes as instructed

View in Training Portal: {$portalUrl}

If you have any questions or need assistance, please contact your trainer or the support team.

---
© 2026 Hohoo-ville Training System. All rights reserved.
This is an automated notification email. Please do not reply to this message.
        ";
    }

    /**
     * Send module publication notification email to trainee
     */
    public function sendModulePublishedNotification($traineeEmail, $traineeName, $moduleTitle, $isUpdated = false) {
        try {
            $this->mailer->addAddress($traineeEmail);
            $this->mailer->Subject = $isUpdated
                ? 'Updated Training Module Available - Hohoo-ville'
                : 'New Training Module Available - Hohoo-ville';

            $htmlBody = $this->getModulePublishedTemplate($traineeName, $moduleTitle, $isUpdated);
            $this->mailer->isHTML(true);
            $this->mailer->Body = $htmlBody;
            $this->mailer->AltBody = $this->getModulePublishedPlainText($traineeName, $moduleTitle, $isUpdated);

            $this->mailer->send();

            return [
                'success' => true,
                'message' => 'Email sent successfully'
            ];
        } catch (Exception $e) {
            error_log('Module Notification Email Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Email could not be sent. Reason: ' . $this->mailer->ErrorInfo
            ];
        } finally {
            $this->mailer->clearAddresses();
        }
    }

    /**
     * Send trainer submission alert email
     */
    public function sendTrainerSubmissionNotification($trainerEmail, $trainerName, $traineeName, $submissionType, $itemTitle, $lessonTitle, $traineeId = null) {
        try {
            $this->mailer->addAddress($trainerEmail);
            $this->mailer->Subject = "{$submissionType} Submitted - Hohoo-ville";

            $htmlBody = $this->getTrainerSubmissionTemplate($trainerName, $traineeName, $submissionType, $itemTitle, $lessonTitle, $traineeId);
            $this->mailer->isHTML(true);
            $this->mailer->Body = $htmlBody;
            $this->mailer->AltBody = $this->getTrainerSubmissionPlainText($trainerName, $traineeName, $submissionType, $itemTitle, $lessonTitle, $traineeId);

            $this->mailer->send();

            return [
                'success' => true,
                'message' => 'Email sent successfully'
            ];
        } catch (Exception $e) {
            error_log('Trainer Submission Email Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Email could not be sent. Reason: ' . $this->mailer->ErrorInfo
            ];
        } finally {
            $this->mailer->clearAddresses();
        }
    }

    private function getModulePublishedTemplate($traineeName, $moduleTitle, $isUpdated) {
        $portalUrl = 'http://localhost/Hohoo-ville/frontend/html/trainee/pages/my_training.html';
        $headline = $isUpdated ? 'Updated Module Available' : 'New Module Available';
        $intro = $isUpdated
            ? 'Your trainer updated a module in your training portal.'
            : 'Your trainer uploaded a new module in your training portal.';

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
                .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; }
                .content { padding: 24px; background-color: #f9fafb; }
                .box { background: white; border-left: 4px solid #16a34a; padding: 16px; border-radius: 4px; margin: 20px 0; }
                .button { display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { background-color: #f3f4f6; padding: 14px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>{$headline}</h1>
                    <p>Hohoo-ville Training System</p>
                </div>
                <div class='content'>
                    <p>Hello <strong>{$traineeName}</strong>,</p>
                    <p>{$intro}</p>
                    <div class='box'>
                        <p style='margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b;'>Module</p>
                        <p style='margin: 10px 0 0; font-size: 20px; font-weight: bold; color: #16a34a;'>{$moduleTitle}</p>
                    </div>
                    <p>Please open your trainee portal to review the module, read the materials, and complete any required quiz or task sheet.</p>
                    <p style='text-align: center;'>
                        <a href='{$portalUrl}' class='button'>Open My Training</a>
                    </p>
                </div>
                <div class='footer'>
                    <p>&copy; 2026 Hohoo-ville Training System. All rights reserved.</p>
                    <p>This is an automated notification email. Please do not reply to this message.</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    private function getModulePublishedPlainText($traineeName, $moduleTitle, $isUpdated) {
        $portalUrl = 'http://localhost/Hohoo-ville/frontend/html/trainee/pages/my_training.html';
        $intro = $isUpdated
            ? 'Your trainer updated a module in your training portal.'
            : 'Your trainer uploaded a new module in your training portal.';

        return "
MODULE NOTIFICATION - Hohoo-ville Training System

Hello {$traineeName},

{$intro}

Module: {$moduleTitle}

Please open your trainee portal to review the module, read the materials, and complete any required quiz or task sheet.

Open My Training: {$portalUrl}

---
© 2026 Hohoo-ville Training System. All rights reserved.
This is an automated notification email. Please do not reply to this message.
        ";
    }

    private function getTrainerSubmissionTemplate($trainerName, $traineeName, $submissionType, $itemTitle, $lessonTitle, $traineeId) {
        $portalUrl = $traineeId
            ? "http://localhost/Hohoo-ville/frontend/html/trainer/pages/trainee_details.html?trainee_id={$traineeId}&tab=progress"
            : 'http://localhost/Hohoo-ville/frontend/html/trainer/pages/trainee_management.html';
        $itemLine = $itemTitle !== '' ? "<p><strong>Submitted item:</strong> {$itemTitle}</p>" : '';
        $lessonLine = $lessonTitle !== '' ? "<p><strong>Lesson:</strong> {$lessonTitle}</p>" : '';

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
                .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
                .content { padding: 24px; background-color: #f8fafc; }
                .box { background: white; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin: 20px 0; }
                .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { background-color: #f3f4f6; padding: 14px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>{$submissionType} Submitted</h1>
                    <p>Hohoo-ville Training System</p>
                </div>
                <div class='content'>
                    <p>Hello <strong>{$trainerName}</strong>,</p>
                    <p><strong>{$traineeName}</strong> submitted a {$submissionType}.</p>
                    <div class='box'>
                        {$itemLine}
                        {$lessonLine}
                    </div>
                    <p>Open the trainer portal to review the trainee submission.</p>
                    <p style='text-align: center;'>
                        <a href='{$portalUrl}' class='button'>Review Submission</a>
                    </p>
                </div>
                <div class='footer'>
                    <p>&copy; 2026 Hohoo-ville Training System. All rights reserved.</p>
                    <p>This is an automated notification email. Please do not reply to this message.</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    private function getTrainerSubmissionPlainText($trainerName, $traineeName, $submissionType, $itemTitle, $lessonTitle, $traineeId) {
        $portalUrl = $traineeId
            ? "http://localhost/Hohoo-ville/frontend/html/trainer/pages/trainee_details.html?trainee_id={$traineeId}&tab=progress"
            : 'http://localhost/Hohoo-ville/frontend/html/trainer/pages/trainee_management.html';

        return "
TRAINER ALERT - Hohoo-ville Training System

Hello {$trainerName},

{$traineeName} submitted a {$submissionType}.

Submitted item: {$itemTitle}
Lesson: {$lessonTitle}

Review submission: {$portalUrl}

---
© 2026 Hohoo-ville Training System. All rights reserved.
This is an automated notification email. Please do not reply to this message.
        ";
    }
}
?>
