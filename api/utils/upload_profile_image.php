<?php
/**
 * Profile Image Upload Handler
 * Handles profile image uploads for all user roles.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../database/db.php';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const UPLOAD_DIR = __DIR__ . '/../../uploads/profile_images/';

if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

function fetchExistingProfileImage(PDO $conn, string $role, int $userId): ?string {
    if ($role === 'admin' || $role === 'registrar') {
        $stmt = $conn->prepare("SELECT profile_image FROM tbl_employee WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $value = $stmt->fetchColumn();
        return $value !== false ? $value : null;
    }

    if ($role === 'trainer') {
        $stmt = $conn->prepare("SELECT profile_image FROM tbl_trainer WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $value = $stmt->fetchColumn();
        return $value !== false ? $value : null;
    }

    $stmt = $conn->prepare("SELECT profile_image FROM tbl_trainee_hdr WHERE user_id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $value = $stmt->fetchColumn();
    return $value !== false ? $value : null;
}

function persistProfileImage(PDO $conn, string $role, int $userId, string $filename): void {
    if ($role === 'admin' || $role === 'registrar') {
        $checkStmt = $conn->prepare("SELECT employee_id FROM tbl_employee WHERE user_id = ? LIMIT 1");
        $checkStmt->execute([$userId]);
        $employeeId = $checkStmt->fetchColumn();

        if ($employeeId) {
            $updateStmt = $conn->prepare("UPDATE tbl_employee SET profile_image = ? WHERE user_id = ?");
            $updateStmt->execute([$filename, $userId]);
            return;
        }

        $insertStmt = $conn->prepare("
            INSERT INTO tbl_employee (user_id, first_name, last_name, email, phone_number, profile_image)
            SELECT u.user_id, '', '', COALESCE(u.email, ''), '', ?
            FROM tbl_users u
            WHERE u.user_id = ?
        ");
        $insertStmt->execute([$filename, $userId]);
        return;
    }

    if ($role === 'trainer') {
        $stmt = $conn->prepare("UPDATE tbl_trainer SET profile_image = ? WHERE user_id = ?");
        $stmt->execute([$filename, $userId]);
        return;
    }

    $stmt = $conn->prepare("UPDATE tbl_trainee_hdr SET profile_image = ? WHERE user_id = ?");
    $stmt->execute([$filename, $userId]);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method', 405);
    }

    if (!isset($_FILES['profile_image'])) {
        throw new Exception('No file uploaded', 400);
    }

    $role = trim((string)($_POST['role'] ?? ''));
    $userId = (int)($_POST['user_id'] ?? 0);

    if ($role === '' || $userId <= 0) {
        throw new Exception('Missing role or user_id', 400);
    }

    $validRoles = ['admin', 'registrar', 'trainer', 'trainee'];
    if (!in_array($role, $validRoles, true)) {
        throw new Exception('Invalid role', 400);
    }

    $file = $_FILES['profile_image'];

    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new Exception('File upload error: ' . ($file['error'] ?? 'unknown'), 400);
    }

    if (($file['size'] ?? 0) > MAX_FILE_SIZE) {
        throw new Exception('File size exceeds maximum limit (5MB)', 400);
    }

    $clientMime = $file['type'] ?? '';
    if (!in_array($clientMime, ALLOWED_TYPES, true)) {
        throw new Exception('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed', 400);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $detectedMime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($detectedMime, ALLOWED_TYPES, true)) {
        throw new Exception('File content does not match allowed types', 400);
    }

    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($extension === '') {
        $mimeMap = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
        ];
        $extension = $mimeMap[$detectedMime] ?? 'jpg';
    }

    $filename = sprintf('%s_%d_%d.%s', $role, $userId, time(), $extension);
    $filepath = UPLOAD_DIR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to save uploaded file', 500);
    }

    $database = new Database();
    $conn = $database->getConnection();
    $oldImage = fetchExistingProfileImage($conn, $role, $userId);

    persistProfileImage($conn, $role, $userId, $filename);

    if (!empty($oldImage)) {
        $oldPath = UPLOAD_DIR . $oldImage;
        if (is_file($oldPath) && basename($oldPath) !== $filename) {
            unlink($oldPath);
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Profile image uploaded successfully',
        'filename' => $filename,
        'url' => '/Hohoo-ville/uploads/profile_images/' . rawurlencode($filename),
    ]);
} catch (Exception $e) {
    $statusCode = $e->getCode();
    if (!is_int($statusCode) || $statusCode < 100 || $statusCode > 599) {
        $statusCode = 500;
    }

    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
?>
