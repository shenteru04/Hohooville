<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

class RegistrarProfile {
    private $conn;
    private $tokenSecret = 'hohoo_ville_secret_key_2024';

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';

        try {
            switch ($action) {
                case 'get':
                    $this->getProfile();
                    break;
                case 'update':
                    $this->updateProfile();
                    break;
                default:
                    throw new Exception('Invalid action');
            }
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function resolveUserId(array $input = [], $allowTokenFallback = true) {
        $candidate = $input['user_id'] ?? $input['userId'] ?? $input['id'] ?? null;
        $userId = intval($candidate);
        if ($userId > 0) {
            return $userId;
        }

        if ($allowTokenFallback) {
            $token = $this->getBearerToken();
            if ($token) {
                $tokenUserId = $this->validateToken($token);
                if ($tokenUserId > 0) {
                    return intval($tokenUserId);
                }
            }
        }

        throw new Exception('User ID required');
    }

    private function resolveAuthenticatedUserId(array $input = []) {
        $candidate = $input['user_id'] ?? $input['userId'] ?? $input['id'] ?? null;
        $inputUserId = intval($candidate);
        $tokenUserId = $this->validateToken($this->getBearerToken());

        if ($tokenUserId > 0) {
            if ($inputUserId > 0 && $inputUserId !== $tokenUserId) {
                throw new Exception('User mismatch');
            }
            return $tokenUserId;
        }

        if ($inputUserId > 0) {
            return $inputUserId;
        }

        throw new Exception('User ID required');
    }

    private function getProfile() {
        $userId = $this->resolveUserId($_GET, true);
        $data = $this->fetchUserProfileRow($userId);

        if (!$data) {
            $tokenUserId = $this->validateToken($this->getBearerToken());
            if ($tokenUserId > 0 && $tokenUserId !== $userId) {
                $data = $this->fetchUserProfileRow($tokenUserId);
            }
        }

        if (!$data) {
            throw new Exception('User not found');
        }

        echo json_encode(['success' => true, 'data' => $data]);
    }

    private function updateProfile() {
        $payload = json_decode(file_get_contents('php://input'), true);
        if (!is_array($payload)) {
            throw new Exception('Invalid request payload');
        }

        $userId = $this->resolveAuthenticatedUserId($payload);
        $firstName = trim((string)($payload['first_name'] ?? ''));
        $lastName = trim((string)($payload['last_name'] ?? ''));
        $email = trim((string)($payload['email'] ?? ''));
        $phone = trim((string)($payload['phone_number'] ?? ''));

        if ($firstName === '' || $lastName === '' || $email === '') {
            throw new Exception('First name, last name, and email are required');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format');
        }

        $query = "UPDATE tbl_users
                  SET first_name = ?, last_name = ?, email = ?, phone_number = ?
                  WHERE user_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$firstName, $lastName, $email, $phone, $userId]);

        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
    }

    private function fetchUserProfileRow($userId) {
        $query = "SELECT 
                    u.user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.phone_number,
                    u.username
                  FROM tbl_users u
                  WHERE u.user_id = ?
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([intval($userId)]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function getBearerToken() {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $authHeader = '';

        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
        } elseif (isset($headers['authorization'])) {
            $authHeader = $headers['authorization'];
        } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }

        if (!$authHeader) return '';
        if (stripos($authHeader, 'Bearer ') !== 0) return '';
        return trim(substr($authHeader, 7));
    }

    private function base64UrlEncode($text) {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($text));
    }

    private function validateToken($token) {
        $parts = explode('.', (string)$token);
        if (count($parts) !== 3) return 0;

        $header = base64_decode($parts[0]);
        $payload = base64_decode($parts[1]);
        $providedSignature = $parts[2];

        if ($header === false || $payload === false) return 0;

        $base64UrlHeader = $this->base64UrlEncode($header);
        $base64UrlPayload = $this->base64UrlEncode($payload);
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $this->tokenSecret, true);
        $expectedSignature = $this->base64UrlEncode($signature);

        if (!hash_equals($expectedSignature, $providedSignature)) return 0;

        $payloadData = json_decode($payload);
        if (!$payloadData || !isset($payloadData->user_id) || !isset($payloadData->exp)) return 0;
        if (intval($payloadData->exp) < time()) return 0;

        return intval($payloadData->user_id);
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new RegistrarProfile($db);
$api->handleRequest();
?>
