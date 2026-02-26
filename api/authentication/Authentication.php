<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../database/db.php';
// Load Composer's autoloader
require_once '../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class Authentication {
    private $conn;
    private $table = 'tbl_users';

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        switch($action) {
            case 'login':
                if ($method === 'POST') {
                    $this->login();
                }
                break;
            
            case 'logout':
                if ($method === 'POST') {
                    $this->logout();
                }
                break;

            case 'verify-otp':
                if ($method === 'POST') {
                    $this->verifyOtp();
                }
                break;
            
            case 'verify':
                if ($method === 'GET') {
                    $this->verifyToken();
                }
                break;
            
            case 'change-password':
                if ($method === 'POST') {
                    $this->changePassword();
                }
                break;
            
            case 'reset-password':
                if ($method === 'POST') {
                    $this->resetPassword();
                }
                break;
            
            case 'forgot-password':
                if ($method === 'POST') {
                    $this->forgotPassword();
                }
                break;
            
            case 'confirm-reset-password':
                if ($method === 'POST') {
                    $this->confirmResetPassword();
                }
                break;
            
            default:
                $this->sendResponse(400, false, 'Invalid action');
        }
    }

    private function login() {
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->username) || empty($data->password)) {
            $this->sendResponse(400, false, 'Username and password are required');
            return;
        }

        try {
            $query = "SELECT u.*, r.role_name as role,
                      CASE 
                        WHEN r.role_name = 'trainee' THEN t.trainee_id
                        ELSE NULL
                      END as trainee_id,
                      CASE 
                        WHEN r.role_name = 'trainer' THEN tr.trainer_id
                        ELSE NULL
                      END as trainer_id
                      FROM " . $this->table . " u
                      LEFT JOIN tbl_role r ON u.role_id = r.role_id
                      LEFT JOIN tbl_trainee_hdr t ON u.user_id = t.user_id
                      LEFT JOIN tbl_trainer tr ON u.user_id = tr.user_id
                      WHERE (u.username = :username OR u.email = :username) 
                      AND u.status = 'active'";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':username', $data->username);
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                $this->logActivity(null, 'login_failed', 'tbl_users', null, 'Invalid username: ' . $data->username);
                $this->sendResponse(401, false, 'Invalid credentials');
                return;
            }

            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $this->sendResponse(500, false, 'Database error: ' . $e->getMessage());
            return;
        }

        if (!password_verify($data->password, $user['password'])) {
            $this->logActivity($user['user_id'], 'login_failed', 'tbl_users', $user['user_id'], 'Invalid password');
            $this->sendResponse(401, false, 'Invalid credentials');
            return;
        }

        // --- Role-Based Security Check ---
        
        // 1. Admin & Registrar: OTP Security
        if (in_array($user['role'], ['admin', 'registrar'])) {
            $otp = rand(100000, 999999);
            
            // Create a stateless OTP token containing the hash of the OTP
            $otpHash = password_hash($otp, PASSWORD_BCRYPT);
            $otpPayload = [
                'user_id' => $user['user_id'],
                'otp_hash' => $otpHash,
                'exp' => time() + 300 // 5 minutes expiration
            ];
            $otpToken = $this->encodeJwt($otpPayload);

            // Send OTP via Email using PHPMailer
            if (!$this->sendOtpEmail($user['email'], $otp, 'login')) {
                $this->sendResponse(500, false, 'Failed to send OTP email. Please contact support.');
            }

            $this->sendResponse(200, true, 'OTP sent to your registered email.', [
                'require_otp' => true,
                'user_id' => $user['user_id'],
                'otp_token' => $otpToken
            ]);
            return;
        }

        // 2. Trainer & Trainee: CAPTCHA Security
        if (in_array($user['role'], ['trainer', 'trainee'])) {
            if (!isset($data->captcha_input) || !isset($data->captcha_challenge) || $data->captcha_input != $data->captcha_challenge) {
                $this->sendResponse(400, false, 'Incorrect CAPTCHA answer.');
                return;
            }
        }

        // Generate token
        $token = $this->generateToken($user['user_id']);

        $this->logActivity($user['user_id'], 'login_success', 'tbl_users', $user['user_id'], 'User logged in successfully');

        unset($user['password']);

        $response = [
            'user' => $user,
            'token' => $token
        ];

        $this->sendResponse(200, true, 'Login successful', $response);
    }

    private function verifyOtp() {
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->user_id) || empty($data->otp) || empty($data->otp_token)) {
            $this->sendResponse(400, false, 'User ID, OTP, and validation token are required');
            return;
        }

        // 1. Verify the Token Signature and Expiry
        $payload = $this->decodeJwt($data->otp_token);
        
        if (!$payload) {
            $this->sendResponse(400, false, 'Invalid or expired OTP session. Please login again.');
            return;
        }

        // 2. Verify User ID matches
        if ($payload->user_id != $data->user_id) {
            $this->sendResponse(400, false, 'User mismatch.');
            return;
        }

        // 3. Verify OTP against the hash in the token
        if (!password_verify($data->otp, $payload->otp_hash)) {
            $this->sendResponse(400, false, 'Invalid OTP.');
            return;
        }

        // Fetch user details for final login response
        $stmt = $this->conn->prepare("SELECT * FROM " . $this->table . " WHERE user_id = :user_id");
        $stmt->execute([':user_id' => $data->user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // Login Success
        $token = $this->generateToken($user['user_id']);
        
        // Fetch role name again for frontend redirection
        $roleStmt = $this->conn->prepare("SELECT role_name FROM tbl_role WHERE role_id = ?");
        $roleStmt->execute([$user['role_id']]);
        $roleName = $roleStmt->fetchColumn();
        $user['role'] = $roleName;

        unset($user['password']);
        unset($user['otp_code']);
        unset($user['otp_expiry']);

        $this->sendResponse(200, true, 'OTP Verified. Login successful.', [
            'user' => $user,
            'token' => $token
        ]);
    }

    private function logout() {
        $headers = getallheaders();
        $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

        if (!$token) {
            $this->sendResponse(400, false, 'Token is required');
            return;
        }

        $userId = $this->validateToken($token);

        if ($userId) {
            $this->logActivity($userId, 'logout', 'tbl_users', $userId, 'User logged out');
            $this->sendResponse(200, true, 'Logout successful');
        } else {
            $this->sendResponse(401, false, 'Invalid token');
        }
    }

    private function verifyToken() {
        $headers = getallheaders();
        $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

        if (!$token) {
            $this->sendResponse(401, false, 'Token is required');
            return;
        }

        $userId = $this->validateToken($token);

        if (!$userId) {
            $this->sendResponse(401, false, 'Invalid or expired token');
            return;
        }

        try {
            $query = "SELECT u.*, r.role_name as role,
                      CASE 
                        WHEN r.role_name = 'trainee' THEN t.trainee_id
                        ELSE NULL
                      END as trainee_id,
                      CASE 
                        WHEN r.role_name = 'trainer' THEN tr.trainer_id
                        ELSE NULL
                      END as trainer_id
                      FROM " . $this->table . " u
                      LEFT JOIN tbl_role r ON u.role_id = r.role_id
                      LEFT JOIN tbl_trainee_hdr t ON u.user_id = t.user_id
                      LEFT JOIN tbl_trainer tr ON u.user_id = tr.user_id
                      WHERE u.user_id = :user_id AND u.status = 'active'";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                $this->sendResponse(401, false, 'User not found or inactive');
                return;
            }

            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $this->sendResponse(500, false, 'Database error: ' . $e->getMessage());
            return;
        }
        unset($user['password']);

        $this->sendResponse(200, true, 'Token is valid', ['user' => $user]);
    }

    private function changePassword() {
        $data = json_decode(file_get_contents("php://input"));
        $headers = getallheaders();
        $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

        if (!$token) {
            $this->sendResponse(401, false, 'Unauthorized');
            return;
        }

        $userId = $this->validateToken($token);

        if (!$userId) {
            $this->sendResponse(401, false, 'Invalid token');
            return;
        }

        if (empty($data->old_password) || empty($data->new_password)) {
            $this->sendResponse(400, false, 'Old and new passwords are required');
            return;
        }

        // Verify old password
        $query = "SELECT password FROM " . $this->table . " WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!password_verify($data->old_password, $user['password'])) {
            $this->sendResponse(400, false, 'Old password is incorrect');
            return;
        }

        // Update password
        $hashedPassword = password_hash($data->new_password, PASSWORD_BCRYPT);
        $updateQuery = "UPDATE " . $this->table . " SET password = :password WHERE user_id = :user_id";
        $updateStmt = $this->conn->prepare($updateQuery);
        if ($updateStmt->execute([':password' => $hashedPassword, ':user_id' => $userId])) {
            $this->logActivity($userId, 'password_changed', 'tbl_users', $userId, 'Password changed successfully');
            $this->sendResponse(200, true, 'Password changed successfully');
        } else {
            $this->sendResponse(500, false, 'Failed to change password');
        }
    }

    private function resetPassword() {
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->user_id) || empty($data->new_password)) {
            $this->sendResponse(400, false, 'User ID and new password are required');
            return;
        }

        $headers = getallheaders();
        $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

        if (!$token) {
            $this->sendResponse(401, false, 'Unauthorized');
            return;
        }

        $adminId = $this->validateToken($token);

        if (!$adminId) {
            $this->sendResponse(401, false, 'Invalid token');
            return;
        }

        // Verify admin role
        $roleQuery = "SELECT r.role_name as role FROM " . $this->table . " u LEFT JOIN tbl_role r ON u.role_id = r.role_id WHERE u.user_id = :user_id";
        $roleStmt = $this->conn->prepare($roleQuery);
        $roleStmt->bindParam(':user_id', $adminId);
        $roleStmt->execute();
        $admin = $roleStmt->fetch(PDO::FETCH_ASSOC);

        if ($admin['role'] !== 'admin') {
            $this->sendResponse(403, false, 'Only admins can reset passwords');
            return;
        }

        // Reset password
        $hashedPassword = password_hash($data->new_password, PASSWORD_BCRYPT);
        $updateQuery = "UPDATE " . $this->table . " SET password = :password WHERE user_id = :user_id";
        $updateStmt = $this->conn->prepare($updateQuery);
        if ($updateStmt->execute([':password' => $hashedPassword, ':user_id' => $data->user_id])) {
            $this->logActivity($adminId, 'password_reset', 'tbl_users', $data->user_id, 'Password reset by admin');
            $this->sendResponse(200, true, 'Password reset successfully');
        } else {
            $this->sendResponse(500, false, 'Failed to reset password');
        }
    }

    private function forgotPassword() {
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->email)) {
            $this->sendResponse(400, false, 'Email is required');
            return;
        }

        $query = "SELECT user_id, email FROM " . $this->table . " WHERE email = :email AND status = 'active'";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $data->email);
        $stmt->execute();

        if ($stmt->rowCount() === 0) {
            $this->sendResponse(404, false, 'Email not found');
            return;
        }

        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $otp = rand(100000, 999999);
        $otpHash = password_hash($otp, PASSWORD_BCRYPT);

        $otpPayload = [
            'user_id' => $user['user_id'],
            'otp_hash' => $otpHash,
            'type' => 'reset_password',
            'exp' => time() + 300 // 5 minutes
        ];
        $otpToken = $this->encodeJwt($otpPayload);

        if ($this->sendOtpEmail($user['email'], $otp, 'reset')) {
            $this->sendResponse(200, true, 'OTP sent to your email.', [
                'user_id' => $user['user_id'],
                'otp_token' => $otpToken
            ]);
        } else {
            $this->sendResponse(500, false, 'Failed to send OTP email.');
        }
    }

    private function confirmResetPassword() {
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->user_id) || empty($data->otp) || empty($data->otp_token) || empty($data->new_password)) {
            $this->sendResponse(400, false, 'All fields are required');
            return;
        }

        $payload = $this->decodeJwt($data->otp_token);

        if (!$payload || (isset($payload->type) && $payload->type !== 'reset_password')) {
            $this->sendResponse(400, false, 'Invalid or expired session.');
            return;
        }

        if ($payload->user_id != $data->user_id || !password_verify($data->otp, $payload->otp_hash)) {
            $this->sendResponse(400, false, 'Invalid OTP or User.');
            return;
        }

        $hashedPassword = password_hash($data->new_password, PASSWORD_BCRYPT);
        $updateQuery = "UPDATE " . $this->table . " SET password = :password WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($updateQuery);
        if ($stmt->execute([':password' => $hashedPassword, ':user_id' => $data->user_id])) {
            $this->logActivity($data->user_id, 'password_reset', 'tbl_users', $data->user_id, 'Password reset via OTP');
            $this->sendResponse(200, true, 'Password reset successfully. You can now login.');
        } else {
            $this->sendResponse(500, false, 'Failed to reset password.');
        }
    }

    public function generateToken($userId) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'user_id' => $userId,
            'exp' => time() + (86400 * 7) // 7 days
        ]);

        $base64UrlHeader = $this->base64UrlEncode($header);
        $base64UrlPayload = $this->base64UrlEncode($payload);
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, 'hohoo_ville_secret_key_2024', true);
        $base64UrlSignature = $this->base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public function validateToken($token) {
        $tokenParts = explode('.', $token);
        
        if (count($tokenParts) !== 3) {
            return false;
        }

        $header = base64_decode($tokenParts[0]);
        $payload = base64_decode($tokenParts[1]);
        $signatureProvided = $tokenParts[2];

        $base64UrlHeader = $this->base64UrlEncode($header);
        $base64UrlPayload = $this->base64UrlEncode($payload);
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, 'hohoo_ville_secret_key_2024', true);
        $base64UrlSignature = $this->base64UrlEncode($signature);

        if ($base64UrlSignature !== $signatureProvided) {
            return false;
        }

        $payloadData = json_decode($payload);

        if ($payloadData->exp < time()) {
            return false;
        }

        return $payloadData->user_id;
    }

    private function encodeJwt($payload) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payloadJson = json_encode($payload);
        $base64UrlHeader = $this->base64UrlEncode($header);
        $base64UrlPayload = $this->base64UrlEncode($payloadJson);
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, 'hohoo_ville_secret_key_2024', true);
        $base64UrlSignature = $this->base64UrlEncode($signature);
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    private function decodeJwt($token) {
        $tokenParts = explode('.', $token);
        if (count($tokenParts) !== 3) return false;
        $header = base64_decode($tokenParts[0]);
        $payload = base64_decode($tokenParts[1]);
        $signatureProvided = $tokenParts[2];
        $base64UrlHeader = $this->base64UrlEncode($header);
        $base64UrlPayload = $this->base64UrlEncode($payload);
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, 'hohoo_ville_secret_key_2024', true);
        $base64UrlSignature = $this->base64UrlEncode($signature);
        if ($base64UrlSignature !== $signatureProvided) return false;
        $payloadData = json_decode($payload);
        if (isset($payloadData->exp) && $payloadData->exp < time()) return false;
        return $payloadData;
    }

    private function base64UrlEncode($text) {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($text));
    }

    private function logActivity($userId, $action, $tableName, $recordId, $details) {
        try {
            $query = "INSERT INTO tbl_activity_logs (user_id, action, table_name, record_id, details, ip_address) 
                      VALUES (:user_id, :action, :table_name, :record_id, :details, :ip_address)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':action', $action);
            $stmt->bindParam(':table_name', $tableName);
            $stmt->bindParam(':record_id', $recordId);
            $stmt->bindParam(':details', $details);
            $stmt->bindValue(':ip_address', $_SERVER['REMOTE_ADDR']);
            $stmt->execute();
        } catch (Exception $e) {
            // Silently fail if logging fails (e.g. table missing) to not disrupt main flow
        }
    }

    private function sendResponse($statusCode, $success, $message, $data = null) {
        http_response_code($statusCode);
        $response = [
            'success' => $success,
            'message' => $message
        ];
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        echo json_encode($response);
        exit();
    }

    private function sendOtpEmail($to, $otp, $type = 'login') {
        $subject = $type === 'reset' ? 'Reset Password OTP Code' : 'Your Login OTP Code';
        $title = $type === 'reset' ? 'Password Reset' : 'Login Verification';
        $bodyText = $type === 'reset' ? 'You requested to reset your password. Please use the code below to set a new password.' : 'You requested a One-Time Password (OTP) to log in to your account. Please use the code below to complete your sign-in.';

        $mail = new PHPMailer(true);

        try {
            //Server settings
            $mail->isSMTP();                                            // Send using SMTP
            $mail->Host       = 'smtp.gmail.com';                       // Set the SMTP server to send through
            $mail->SMTPAuth   = true;                                   // Enable SMTP authentication
            $mail->Username   = 'christiandaveboncales@gmail.com';      // SMTP username
            $mail->Password   = 'jdkr ijgy fsmc vffu';    // SMTP password (use App Password)
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;         // Enable TLS encryption
            $mail->Port       = 587;                                    // TCP port to connect to

            //Recipients
            $mail->setFrom('christiandaveboncales@gmail.com', 'Hohoo-Ville Security');
            $mail->addAddress($to);                                     // Add a recipient

            //Content
            $mail->isHTML(true);                                        // Set email format to HTML
            $mail->Subject = $subject;
            
            // Professional Blue & White HTML Template
            $mail->Body = "
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f6f9; padding: 20px;'>
                <div style='background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                    <div style='background-color: #4e73df; padding: 20px; text-align: center;'>
                        <h1 style='color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;'>Hohoo-Ville Security</h1>
                    </div>
                    <div style='padding: 40px 30px; text-align: center; color: #5a5c69;'>
                        <h2 style='color: #4e73df; margin-top: 0; font-size: 20px;'>$title</h2>
                        <p style='font-size: 16px; line-height: 1.5; margin-bottom: 25px;'>
                            $bodyText
                        </p>
                        <div style='background-color: #f8f9fc; border: 2px dashed #4e73df; border-radius: 8px; padding: 15px; margin: 0 auto 25px auto; display: inline-block; min-width: 200px;'>
                            <span style='font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4e73df; display: block;'>$otp</span>
                        </div>
                        <p style='font-size: 14px; color: #858796; margin: 0;'>
                            This code is valid for <strong>5 minutes</strong>.<br>
                            If you did not request this code, please ignore this email.
                        </p>
                    </div>
                    <div style='background-color: #f8f9fc; padding: 15px; text-align: center; font-size: 12px; color: #b7b9cc; border-top: 1px solid #e3e6f0;'>
                        &copy; " . date('Y') . " Hohoo-Ville Technical School. All rights reserved.
                    </div>
                </div>
            </div>";
            
            $mail->AltBody = "Your One-Time Password (OTP) is: $otp. This code is valid for 5 minutes.";

            $mail->send();
            return true;
        } catch (Exception $e) {
            error_log("Message could not be sent. Mailer Error: {$mail->ErrorInfo}");
            return false;
        }
    }
}

// Initialize and handle request
$database = new Database();
$db = $database->getConnection();

$auth = new Authentication($db);
$auth->handleRequest();
?>
