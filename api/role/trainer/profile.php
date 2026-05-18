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

function sendJsonResponse(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload);
}

function fail(string $message, int $statusCode = 400): void
{
    throw new Exception($message, $statusCode);
}

function resolveUserId(?array $input = null): int
{
    $input = $input ?? [];

    $candidate = $input['user_id']
        ?? $input['userId']
        ?? $input['id']
        ?? $_GET['user_id']
        ?? $_GET['userId']
        ?? $_GET['id']
        ?? null;

    $userId = (int)$candidate;
    if ($userId <= 0) {
        fail('User ID is required.');
    }

    return $userId;
}

function buildTrainerPhotoUrl(array $trainer): ?string
{
    $profileImage = trim((string)($trainer['profile_image'] ?? ''));
    if ($profileImage === '') {
        return null;
    }

    return '/Hohoo-ville/uploads/profile_images/' . rawurlencode($profileImage);
}

function fetchTrainerQualifications(PDO $conn, int $trainerId): array
{
    $stmt = $conn->prepare("
        SELECT
            tq.qualification_id,
            q.qualification_name,
            COALESCE(nc.nc_level_code, nc.nc_level_name, '') AS nc_level
        FROM tbl_trainer_qualifications tq
        JOIN tbl_qualifications q ON q.qualification_id = tq.qualification_id
        LEFT JOIN tbl_nc_levels nc ON nc.nc_level_id = q.nc_level_id
        WHERE tq.trainer_id = ?
        ORDER BY q.qualification_name, tq.qualification_id
    ");
    $stmt->execute([$trainerId]);

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $qualifications = [];

    foreach ($rows as $row) {
        $qualificationName = trim((string)($row['qualification_name'] ?? ''));
        $ncLevel = trim((string)($row['nc_level'] ?? ''));
        $displayName = $qualificationName;
        if ($qualificationName !== '' && $ncLevel !== '') {
            $displayName .= ' (' . $ncLevel . ')';
        }

        $qualifications[] = [
            'qualification_id' => (int)$row['qualification_id'],
            'qualification_name' => $qualificationName,
            'nc_level' => $ncLevel,
            'display_name' => $displayName,
        ];
    }

    return $qualifications;
}

function fetchTrainerProfile(PDO $conn, int $userId): ?array
{
    $stmt = $conn->prepare("
        SELECT
            t.*,
            u.username,
            u.email AS user_email,
            q.qualification_name,
            COALESCE(nc.nc_level_code, nc.nc_level_name, '') AS qualification_nc_level
        FROM tbl_trainer t
        LEFT JOIN tbl_users u ON u.user_id = t.user_id
        LEFT JOIN tbl_qualifications q ON q.qualification_id = t.qualification_id
        LEFT JOIN tbl_nc_levels nc ON nc.nc_level_id = q.nc_level_id
        WHERE t.user_id = ?
        LIMIT 1
    ");
    $stmt->execute([$userId]);
    $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$trainer) {
        return null;
    }

    unset($trainer['password']);
    $trainer['photo_url'] = buildTrainerPhotoUrl($trainer);

    $trainerId = (int)($trainer['trainer_id'] ?? 0);
    if ($trainerId > 0) {
        $qualifications = fetchTrainerQualifications($conn, $trainerId);
        $trainer['qualifications'] = $qualifications;
        $trainer['qualification_names'] = implode(', ', array_values(array_filter(array_map(
            static fn(array $item): string => trim((string)($item['display_name'] ?? '')),
            $qualifications
        ))));
    } else {
        $trainer['qualifications'] = [];
        $trainer['qualification_names'] = '';
    }

    return $trainer;
}

function getTrainerId(PDO $conn): void
{
    $userId = resolveUserId();

    $stmt = $conn->prepare("
        SELECT trainer_id, first_name, last_name
        FROM tbl_trainer
        WHERE user_id = ?
        LIMIT 1
    ");
    $stmt->execute([$userId]);
    $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$trainer) {
        try {
            $fallbackStmt = $conn->prepare("
                SELECT trainer_id, first_name, last_name
                FROM tbl_trainer_hdr
                WHERE user_id = ?
                LIMIT 1
            ");
            $fallbackStmt->execute([$userId]);
            $trainer = $fallbackStmt->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $ignored) {
        }
    }

    if (!$trainer) {
        sendJsonResponse(404, ['success' => false, 'message' => 'No trainer profile linked to this user.']);
        return;
    }

    sendJsonResponse(200, ['success' => true, 'data' => $trainer]);
}

function getTrainerProfileAction(PDO $conn): void
{
    $userId = resolveUserId();
    $trainer = fetchTrainerProfile($conn, $userId);

    if (!$trainer) {
        sendJsonResponse(404, ['success' => false, 'message' => 'Trainer profile not found.']);
        return;
    }

    sendJsonResponse(200, ['success' => true, 'data' => $trainer]);
}

function updateTrainerProfile(PDO $conn): void
{
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        fail('Invalid request payload.');
    }

    $userId = resolveUserId($payload);
    $existingTrainer = fetchTrainerProfile($conn, $userId);
    if (!$existingTrainer) {
        fail('Trainer profile not found.', 404);
    }

    $updateFields = [];
    $params = [];

    if (array_key_exists('first_name', $payload)) {
        $firstName = trim((string)$payload['first_name']);
        if ($firstName === '') {
            fail('First name is required.');
        }
        $updateFields[] = 'first_name = ?';
        $params[] = $firstName;
    }

    if (array_key_exists('last_name', $payload)) {
        $lastName = trim((string)$payload['last_name']);
        if ($lastName === '') {
            fail('Last name is required.');
        }
        $updateFields[] = 'last_name = ?';
        $params[] = $lastName;
    }

    if (array_key_exists('email', $payload)) {
        $email = trim((string)$payload['email']);
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            fail('A valid email address is required.');
        }
        $updateFields[] = 'email = ?';
        $params[] = $email;
    }

    if (array_key_exists('phone_number', $payload) || array_key_exists('phone', $payload)) {
        $updateFields[] = 'phone_number = ?';
        $params[] = trim((string)($payload['phone_number'] ?? $payload['phone']));
    }

    if (array_key_exists('address', $payload)) {
        $updateFields[] = 'address = ?';
        $params[] = trim((string)$payload['address']);
    }

    if (array_key_exists('profile_image', $payload)) {
        $updateFields[] = 'profile_image = ?';
        $params[] = trim((string)$payload['profile_image']);
    }

    if (empty($updateFields)) {
        fail('No profile changes were provided.');
    }

    $conn->beginTransaction();

    try {
        if (array_key_exists('email', $payload)) {
            $email = trim((string)$payload['email']);
            $stmtUser = $conn->prepare("UPDATE tbl_users SET email = ? WHERE user_id = ?");
            $stmtUser->execute([$email, $userId]);
        }

        $params[] = $userId;
        $stmtTrainer = $conn->prepare("
            UPDATE tbl_trainer
            SET " . implode(', ', $updateFields) . "
            WHERE user_id = ?
        ");
        $stmtTrainer->execute($params);

        $conn->commit();
        sendJsonResponse(200, ['success' => true, 'message' => 'Profile updated successfully.']);
    } catch (Throwable $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        throw $e;
    }
}

function changeTrainerPassword(PDO $conn): void
{
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        fail('Invalid request payload.');
    }

    $userId = resolveUserId($payload);
    $currentPassword = (string)($payload['current_password'] ?? '');
    $newPassword = (string)($payload['new_password'] ?? '');
    $confirmPassword = (string)($payload['confirm_password'] ?? '');

    if ($currentPassword === '') {
        fail('Current password required.');
    }
    if ($newPassword === '') {
        fail('New password required.');
    }
    if ($confirmPassword === '') {
        fail('Confirm password required.');
    }
    if ($newPassword !== $confirmPassword) {
        fail('New passwords do not match.');
    }
    if (strlen($newPassword) < 8) {
        fail('New password must be at least 8 characters.');
    }

    $stmtUser = $conn->prepare("SELECT password FROM tbl_users WHERE user_id = ? LIMIT 1");
    $stmtUser->execute([$userId]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        fail('User not found.', 404);
    }

    if (!password_verify($currentPassword, (string)$user['password'])) {
        fail('Current password is incorrect.');
    }

    $stmtUpdate = $conn->prepare("UPDATE tbl_users SET password = ? WHERE user_id = ?");
    $stmtUpdate->execute([password_hash($newPassword, PASSWORD_DEFAULT), $userId]);

    sendJsonResponse(200, ['success' => true, 'message' => 'Password changed successfully.']);
}

$database = new Database();
$conn = $database->getConnection();
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get-trainer-id':
            getTrainerId($conn);
            break;
        case 'get':
            getTrainerProfileAction($conn);
            break;
        case 'update':
            updateTrainerProfile($conn);
            break;
        case 'change-password':
            changeTrainerPassword($conn);
            break;
        default:
            fail('Invalid action specified: ' . $action);
    }
} catch (Throwable $e) {
    $statusCode = (int)$e->getCode();
    if ($statusCode < 100 || $statusCode > 599) {
        $statusCode = 500;
    }

    sendJsonResponse($statusCode, [
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
