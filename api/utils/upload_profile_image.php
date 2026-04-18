<?php
/**
 * Profile Image Upload Handler
 * Handles profile image uploads for all user roles
 * Supported roles: admin, registrar, trainer, trainee
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../database/db.php';
require_once __DIR__ . '/../authentication/Authentication.php';

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const UPLOAD_DIR = __DIR__ . '/../../uploads/profile_images/';

// Ensure upload directory exists
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

try {
    // Validate request method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method', 400);
    }

    // Check if file is uploaded
    if (!isset($_FILES['profile_image'])) {
        throw new Exception('No file uploaded', 400);
    }

    // Get user role and ID
    $role = $_POST['role'] ?? null;
    $user_id = $_POST['user_id'] ?? null;
    $identifier = $_POST['identifier'] ?? null; // For trainee: trainee_id, For trainer: trainer_id

    if (!$role || !$user_id) {
        throw new Exception('Missing role or user_id', 400);
    }

    // Validate role
    $valid_roles = ['admin', 'registrar', 'trainer', 'trainee'];
    if (!in_array($role, $valid_roles)) {
        throw new Exception('Invalid role', 400);
    }

    $file = $_FILES['profile_image'];

    // Validate file
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('File upload error: ' . $file['error'], 400);
    }

    if ($file['size'] > MAX_FILE_SIZE) {
        throw new Exception('File size exceeds maximum limit (5MB)', 400);
    }

    if (!in_array($file['type'], ALLOWED_TYPES)) {
        throw new Exception('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed', 400);
    }

    // Validate file content
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime_type = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime_type, ALLOWED_TYPES)) {
        throw new Exception('File content does not match allowed types', 400);
    }

    // Generate unique filename
    $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $timestamp = time();
    $filename = $role . '_' . $user_id . '_' . $timestamp . '.' . $file_extension;
    $filepath = UPLOAD_DIR . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to move uploaded file', 500);
    }

    // Delete old profile image if exists
    $db = new Database();
    $conn = $db->getConnection();

    $old_image = null;
    if ($role === 'admin' || $role === 'registrar') {
        $stmt = $conn->prepare("SELECT profile_image FROM tbl_employee WHERE user_id = ?");
        $old_image = $stmt->execute([$user_id])->fetchColumn();
    } elseif ($role === 'trainer') {
        $stmt = $conn->prepare("SELECT profile_image FROM tbl_trainer WHERE user_id = ?");
        $old_image = $stmt->execute([$user_id])->fetchColumn();
    } elseif ($role === 'trainee') {
        $stmt = $conn->prepare("SELECT profile_image FROM tbl_trainee_hdr WHERE user_id = ?");
        $old_image = $stmt->execute([$user_id])->fetchColumn();
    }

    // Delete old file if exists
    if ($old_image && file_exists(UPLOAD_DIR . $old_image)) {
        unlink(UPLOAD_DIR . $old_image);
    }

    // Update database
    if ($role === 'admin' || $role === 'registrar') {
        $stmt = $conn->prepare("UPDATE tbl_employee SET profile_image = ? WHERE user_id = ?");
        $stmt->execute([$filename, $user_id]);
    } elseif ($role === 'trainer') {
        $stmt = $conn->prepare("UPDATE tbl_trainer SET profile_image = ? WHERE user_id = ?");
        $stmt->execute([$filename, $user_id]);
    } elseif ($role === 'trainee') {
        $stmt = $conn->prepare("UPDATE tbl_trainee_hdr SET profile_image = ? WHERE user_id = ?");
        $stmt->execute([$filename, $user_id]);
    }

    // Return success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Profile image uploaded successfully',
        'filename' => $filename,
        'url' => '/Hohoo-ville/uploads/profile_images/' . $filename
    ]);

} catch (Exception $e) {
    $code = $e->getCode() ?: 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
    exit;
}
?>
