<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';

class EmailService {
    private $mailer;
    private $fromEmail;
    private $fromName;

    public function __construct() {
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
}
?>
