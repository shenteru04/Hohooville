<?php
session_start();
ini_set('display_errors', 0);
error_reporting(E_ALL);
set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    error_log("[$errno] $errstr in $errfile:$errline");
    return true;
});

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'database/db.php';
require_once 'utils/trainer_assignment_helper.php';

const NOTIFICATION_TOKEN_SECRET = 'hohoo_ville_secret_key_2024';

$requestBody = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $decoded = json_decode(file_get_contents('php://input'), true);
    if (is_array($decoded)) {
        $requestBody = $decoded;
    }
}

$action = $_GET['action'] ?? ($requestBody['action'] ?? '');
if ($action === 'mark_as_read') {
    $action = 'markRead';
}

try {
    $database = new Database();
    $conn = $database->getConnection();

    switch ($action) {
        case 'get':
            handleGetNotifications($conn, $_GET);
            break;
        case 'markRead':
            handleMarkRead($conn, $_GET, $requestBody);
            break;
        case 'markAll':
            handleMarkAll($conn, $_GET, $requestBody);
            break;
        case 'clearAll':
            handleClearAll($conn, $_GET, $requestBody);
            break;
        case 'create':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Method not allowed']);
                break;
            }
            handleCreateNotification($conn, $requestBody);
            break;
        default:
            echo json_encode([]);
            break;
    }
} catch (Throwable $e) {
    error_log('Notification API error: ' . $e->getMessage());
    http_response_code(500);

    if ($action === 'get') {
        echo json_encode([]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Internal server error']);
    }
}

function handleGetNotifications(PDO $conn, array $input): void
{
    $authUser = requireAuthenticatedNotificationUser($conn, $input);
    
    // If authentication fails, try to get at least public notifications
    if (!$authUser) {
        $token = getNotificationBearerToken();
        error_log('Notification auth failed - Token: ' . (!empty($token) ? 'present' : 'missing'));
        
        // Try to get public notifications for unauthenticated access
        try {
            $stmt = $conn->prepare("
                SELECT notification_id AS id,
                       NULL AS resolved_user_id,
                       title,
                       message,
                       link,
                       is_read,
                       created_at
                FROM tbl_notifications
                WHERE user_id IS NULL
                ORDER BY created_at DESC
                LIMIT 50
            ");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            
            $items = array_map(function ($row) {
                return [
                    'id' => (int)($row['id'] ?? 0),
                    'user_id' => isset($row['resolved_user_id']) ? (int)$row['resolved_user_id'] : null,
                    'title' => $row['title'] ?? null,
                    'message' => $row['message'] ?? '',
                    'link' => $row['link'] ?? null,
                    'is_read' => (int)($row['is_read'] ?? 0),
                    'time' => $row['created_at'] ?? null,
                    'created_at' => $row['created_at'] ?? null
                ];
            }, $rows);
            
            echo json_encode($items);
            return;
        } catch (Exception $e) {
            error_log('Public notification fallback failed: ' . $e->getMessage());
            http_response_code(401);
            echo json_encode([]);
            return;
        }
    }

    try {
        ensureDueTraineeModuleNotifications($conn, (int)$authUser['user_id']);
    } catch (Exception $e) {
        error_log('Module notification error: ' . $e->getMessage());
        // Continue even if module notifications fail
    }

    try {
        $rows = fetchVisibleNotifications($conn, (int)$authUser['user_id'], (string)$authUser['role_name']);
    } catch (Exception $e) {
        error_log('Fetch visible notifications error: ' . $e->getMessage());
        // Fallback to simple fetch if complex logic fails
        $rows = simpleNotificationFetch($conn, (int)$authUser['user_id']);
    }

    $items = array_map(function ($row) {
        return [
            'id' => (int)($row['id'] ?? 0),
            'user_id' => isset($row['resolved_user_id']) ? (int)$row['resolved_user_id'] : null,
            'title' => $row['title'] ?? null,
            'message' => $row['message'] ?? '',
            'link' => $row['link'] ?? null,
            'is_read' => (int)($row['is_read'] ?? 0),
            'time' => $row['created_at'] ?? null,
            'created_at' => $row['created_at'] ?? null
        ];
    }, $rows);

    echo json_encode($items);
}

function handleMarkRead(PDO $conn, array $query, array $body): void
{
    $authUser = requireAuthenticatedNotificationUser($conn, $query + $body);
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $notificationId = normalizePositiveInt($query['id'] ?? ($body['notification_id'] ?? null));
    if ($notificationId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Notification ID required']);
        return;
    }

    $schema = getNotificationSchema($conn);
    $alias = 'n';
    $ownership = buildUserOwnershipCondition($schema, $alias);
    $sql = "UPDATE tbl_notifications {$alias}
            SET {$alias}.is_read = 1
            WHERE {$alias}.notification_id = ?
              AND {$ownership['sql']}";

    $stmt = $conn->prepare($sql);
    $stmt->execute(array_merge([$notificationId], bindUserOwnershipParams($ownership, (int)$authUser['user_id'])));

    echo json_encode(['success' => true]);
}

function handleMarkAll(PDO $conn, array $query, array $body): void
{
    $authUser = requireAuthenticatedNotificationUser($conn, $query + $body);
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $schema = getNotificationSchema($conn);
    $alias = 'n';
    $ownership = buildUserOwnershipCondition($schema, $alias);
    $sql = "UPDATE tbl_notifications {$alias}
            SET {$alias}.is_read = 1
            WHERE {$ownership['sql']}";

    $stmt = $conn->prepare($sql);
    $stmt->execute(bindUserOwnershipParams($ownership, (int)$authUser['user_id']));

    echo json_encode(['success' => true]);
}

function handleClearAll(PDO $conn, array $query, array $body): void
{
    $authUser = requireAuthenticatedNotificationUser($conn, $query + $body);
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }

    $schema = getNotificationSchema($conn);
    $alias = 'n';
    $ownership = buildUserOwnershipCondition($schema, $alias);
    $sql = "DELETE FROM tbl_notifications
            WHERE notification_id IN (
                SELECT notification_id FROM (
                    SELECT {$alias}.notification_id
                    FROM tbl_notifications {$alias}
                    WHERE {$ownership['sql']}
                ) owned_notifications
            )";

    $stmt = $conn->prepare($sql);
    $stmt->execute(bindUserOwnershipParams($ownership, (int)$authUser['user_id']));

    echo json_encode([
        'success' => true,
        'deleted_count' => (int)$stmt->rowCount()
    ]);
}

function handleCreateNotification(PDO $conn, array $data): void
{
    $message = trim((string)($data['message'] ?? ''));
    if ($message === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Message required']);
        return;
    }

    $title = trim((string)($data['title'] ?? ''));
    $link = trim((string)($data['link'] ?? ''));
    $userId = normalizePositiveInt($data['user_id'] ?? null);
    $targetUserId = normalizePositiveInt($data['target_user_id'] ?? null);
    $targetRole = trim((string)($data['target_role'] ?? ''));

    $schema = getNotificationSchema($conn);
    $columns = [];
    $placeholders = [];
    $params = [];

    if ($schema['has_target_role']) {
        $columns[] = 'target_role';
        $placeholders[] = '?';
        $params[] = $targetRole !== '' ? $targetRole : null;
    }

    if ($schema['has_target_user_id']) {
        $columns[] = 'target_user_id';
        $placeholders[] = '?';
        $params[] = $targetUserId > 0 ? $targetUserId : ($userId > 0 ? $userId : null);
    }

    if ($schema['has_user_id']) {
        $columns[] = 'user_id';
        $placeholders[] = '?';
        $params[] = $userId > 0 ? $userId : null;
    }

    if ($schema['has_actor_id']) {
        $actorUser = resolveAuthenticatedNotificationUser($conn, $data);
        $columns[] = 'actor_id';
        $placeholders[] = '?';
        $params[] = $actorUser ? (int)$actorUser['user_id'] : null;
    }

    $columns[] = 'title';
    $placeholders[] = '?';
    $params[] = $title !== '' ? $title : null;

    $columns[] = 'message';
    $placeholders[] = '?';
    $params[] = $message;

    $columns[] = 'link';
    $placeholders[] = '?';
    $params[] = $link !== '' ? $link : null;

    $sql = sprintf(
        'INSERT INTO tbl_notifications (%s) VALUES (%s)',
        implode(', ', $columns),
        implode(', ', $placeholders)
    );

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['success' => true, 'id' => (int)$conn->lastInsertId()]);
}

function fetchVisibleNotifications(PDO $conn, int $userId, string $roleName): array
{
    $schema = getNotificationSchema($conn);
    $alias = 'n';
    $visibility = buildVisibleNotificationCondition($schema, $alias, $roleName);
    $resolvedUserSql = buildResolvedUserSql($schema, $alias);

    $sql = "SELECT {$alias}.notification_id AS id,
                   {$resolvedUserSql} AS resolved_user_id,
                   {$alias}.title,
                   {$alias}.message,
                   {$alias}.link,
                   {$alias}.is_read,
                   {$alias}.created_at
            FROM tbl_notifications {$alias}
            WHERE {$visibility['sql']}
            ORDER BY {$alias}.created_at DESC
            LIMIT 50";

    $stmt = $conn->prepare($sql);
    $stmt->execute(bindVisibleNotificationParams($visibility, $userId));

    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

function simpleNotificationFetch(PDO $conn, int $userId): array
{
    try {
        $sql = "SELECT notification_id AS id,
                       user_id AS resolved_user_id,
                       title,
                       message,
                       link,
                       is_read,
                       created_at
                FROM tbl_notifications
                WHERE user_id = ? OR user_id IS NULL
                ORDER BY created_at DESC
                LIMIT 50";

        $stmt = $conn->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Exception $e) {
        error_log('Simple notification fetch failed: ' . $e->getMessage());
        return [];
    }
}

function requireAuthenticatedNotificationUser(PDO $conn, array $input = []): ?array
{
    $user = resolveAuthenticatedNotificationUser($conn, $input);
    if (!$user) {
        return null;
    }

    $requestedUserId = normalizePositiveInt($input['user_id'] ?? ($input['userId'] ?? ($input['id'] ?? null)));
    if ($requestedUserId > 0 && $requestedUserId !== (int)$user['user_id']) {
        return null;
    }

    return $user;
}

function resolveAuthenticatedNotificationUser(PDO $conn, array $input = []): ?array
{
    $token = getNotificationBearerToken();
    
    // Fallback: try to get token from input array (for cases where Authorization header is not available)
    if (!$token && isset($input['token'])) {
        $token = $input['token'];
    }
    
    // Fallback: try to get token from _GET (as last resort, for development only)
    if (!$token && isset($_GET['token'])) {
        $token = $_GET['token'];
    }
    
    error_log('Resolving auth user with token present: ' . (!empty($token) ? 'yes' : 'no'));
    
    $tokenUserId = validateNotificationToken($token);
    if ($tokenUserId > 0) {
        return fetchNotificationUserRow($conn, $tokenUserId);
    }

    error_log('Token validation failed or returned no user, trying session fallback');

    $sessionUserId = normalizePositiveInt($_SESSION['user_id'] ?? null);
    if ($sessionUserId > 0) {
        return fetchNotificationUserRow($conn, $sessionUserId);
    }

    return null;
}

function fetchNotificationUserRow(PDO $conn, int $userId): ?array
{
    try {
        $roleExpr = notificationUsersRoleColumnExists($conn)
            ? "LOWER(COALESCE(r.role_name, u.role, ''))"
            : "LOWER(COALESCE(r.role_name, ''))";

        $stmt = $conn->prepare("
            SELECT u.user_id,
                   {$roleExpr} AS role_name
            FROM tbl_users u
            LEFT JOIN tbl_role r ON r.role_id = u.role_id
            WHERE u.user_id = ?
            LIMIT 1
        ");
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || empty($row['user_id'])) {
            error_log('User not found for notification: user_id=' . $userId);
            return null;
        }

        $row['user_id'] = (int)$row['user_id'];
        $row['role_name'] = trim((string)($row['role_name'] ?? ''));
        return $row;
    } catch (Exception $e) {
        error_log('Error fetching notification user row: ' . $e->getMessage());
        return null;
    }
}

function notificationUsersRoleColumnExists(PDO $conn): bool
{
    static $exists = null;
    if ($exists !== null) {
        return $exists;
    }

    try {
        $stmt = $conn->prepare("SHOW COLUMNS FROM tbl_users LIKE 'role'");
        $stmt->execute();
        $exists = (bool)$stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        $exists = false;
    }

    return $exists;
}

function getNotificationSchema(PDO $conn): array
{
    static $schema = null;

    if ($schema !== null) {
        return $schema;
    }

    $schema = [
        'has_user_id' => notificationColumnExists($conn, 'user_id'),
        'has_target_user_id' => notificationColumnExists($conn, 'target_user_id'),
        'has_target_role' => notificationColumnExists($conn, 'target_role'),
        'has_actor_id' => notificationColumnExists($conn, 'actor_id')
    ];

    return $schema;
}

function notificationColumnExists(PDO $conn, string $columnName): bool
{
    try {
        $stmt = $conn->prepare("SHOW COLUMNS FROM tbl_notifications LIKE ?");
        $stmt->execute([$columnName]);
        return (bool)$stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        return false;
    }
}

function buildResolvedUserSql(array $schema, string $alias = 'n'): string
{
    $prefix = $alias !== '' ? $alias . '.' : '';

    if ($schema['has_target_user_id'] && $schema['has_user_id']) {
        return "COALESCE({$prefix}target_user_id, {$prefix}user_id)";
    }

    if ($schema['has_target_user_id']) {
        return "{$prefix}target_user_id";
    }

    return "{$prefix}user_id";
}

function buildVisibleNotificationCondition(array $schema, string $alias, string $roleName): array
{
    $prefix = $alias !== '' ? $alias . '.' : '';
    $resolvedUserSql = buildResolvedUserSql($schema, $alias);
    $conditions = ["{$resolvedUserSql} = ?"];
    $params = ['user_id'];

    if ($schema['has_target_role']) {
        $conditions[] = "({$resolvedUserSql} IS NULL AND ({$prefix}target_role IS NULL OR {$prefix}target_role = '' OR LOWER({$prefix}target_role) IN ('all', ?)))";
        $params[] = strtolower($roleName);
    } elseif ($schema['has_user_id']) {
        $conditions[] = "{$prefix}user_id IS NULL";
    }

    return [
        'sql' => '(' . implode(' OR ', $conditions) . ')',
        'params' => $params
    ];
}

function bindVisibleNotificationParams(array $visibility, int $userId): array
{
    $params = [];
    foreach ($visibility['params'] as $token) {
        if ($token === 'user_id') {
            $params[] = $userId;
        } else {
            $params[] = $token;
        }
    }
    return $params;
}

function buildUserOwnershipCondition(array $schema, string $alias): array
{
    $resolvedUserSql = buildResolvedUserSql($schema, $alias);
    return [
        'sql' => "{$resolvedUserSql} = ?",
        'params' => ['user_id']
    ];
}

function bindUserOwnershipParams(array $ownership, int $userId): array
{
    $params = [];
    foreach ($ownership['params'] as $token) {
        $params[] = $token === 'user_id' ? $userId : $token;
    }
    return $params;
}

function normalizePositiveInt($value): int
{
    $number = (int)$value;
    return $number > 0 ? $number : 0;
}

function getNotificationBearerToken(): string
{
    $authHeader = '';

    // Try getallheaders() first (most reliable)
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
    }

    // Fallback to $_SERVER variables
    if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    // Additional fallback for some server configurations
    if (!$authHeader && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    if (!is_string($authHeader) || stripos($authHeader, 'Bearer ') !== 0) {
        return '';
    }

    return trim(substr($authHeader, 7));
}

function validateNotificationToken(string $token): int
{
    if ($token === '') {
        error_log('Token validation: Empty token');
        return 0;
    }

    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        error_log('Token validation: Invalid format - expected 3 parts, got ' . count($parts));
        return 0;
    }

    // Convert base64url to standard base64 for decoding
    $base64Header = str_replace(['-', '_'], ['+', '/'], $parts[0]);
    $base64Payload = str_replace(['-', '_'], ['+', '/'], $parts[1]);
    
    // Add padding if necessary
    $base64Header .= str_repeat('=', (4 - (strlen($base64Header) % 4)) % 4);
    $base64Payload .= str_repeat('=', (4 - (strlen($base64Payload) % 4)) % 4);
    
    $header = base64_decode($base64Header, true);
    $payload = base64_decode($base64Payload, true);
    $providedSignature = $parts[2];

    if ($header === false || $payload === false) {
        error_log('Token validation: Base64 decode failed');
        return 0;
    }

    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode($payload);
    $signature = hash_hmac('sha256', $base64UrlHeader . '.' . $base64UrlPayload, NOTIFICATION_TOKEN_SECRET, true);
    $expectedSignature = base64UrlEncode($signature);

    if (!hash_equals($expectedSignature, $providedSignature)) {
        error_log('Token validation: Signature mismatch - expected ' . $expectedSignature . ', got ' . $providedSignature);
        return 0;
    }

    $payloadData = json_decode($payload);
    if (!$payloadData || !isset($payloadData->user_id) || !isset($payloadData->exp)) {
        error_log('Token validation: Invalid payload structure');
        return 0;
    }

    if ((int)$payloadData->exp < time()) {
        error_log('Token validation: Token expired - exp: ' . $payloadData->exp . ', now: ' . time());
        return 0;
    }

    error_log('Token validation: Success for user ' . (int)$payloadData->user_id);
    return (int)$payloadData->user_id;
}

function base64UrlEncode(string $text): string
{
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($text));
}

function ensureDueTraineeModuleNotifications(PDO $conn, int $userId): void
{
    try {
        ta_ensure_schema($conn);

        $userStmt = $conn->prepare("
            SELECT LOWER(r.role_name) AS role_name, th.trainee_id
            FROM tbl_users u
            JOIN tbl_role r ON r.role_id = u.role_id
            LEFT JOIN tbl_trainee_hdr th ON th.user_id = u.user_id
            WHERE u.user_id = ?
            LIMIT 1
        ");
        $userStmt->execute([$userId]);
        $userRow = $userStmt->fetch(PDO::FETCH_ASSOC);
        if (!$userRow || $userRow['role_name'] !== 'trainee' || empty($userRow['trainee_id'])) {
            return;
        }

        $traineeId = (int)$userRow['trainee_id'];
        $notifLink = '/Hohoo-ville/frontend/html/trainee/pages/my_training.html';
        $qualificationStmt = $conn->prepare("
            SELECT DISTINCT COALESCE(e.qualification_id, oq.qualification_id, b.qualification_id) AS qualification_id
            FROM tbl_enrollment e
            LEFT JOIN tbl_offered_qualifications oq ON oq.offered_qualification_id = e.offered_qualification_id
            LEFT JOIN tbl_batch b ON b.batch_id = e.batch_id
            WHERE e.trainee_id = ?
              AND e.status = 'approved'
        ");
        $qualificationStmt->execute([$traineeId]);
        $qualificationIds = array_values(array_unique(array_filter(array_map('intval', $qualificationStmt->fetchAll(PDO::FETCH_COLUMN) ?: []))));

        $accessibleModuleIds = [];
        foreach ($qualificationIds as $qualificationId) {
            $accessibleModuleIds = array_merge($accessibleModuleIds, ta_fetch_trainee_accessible_module_ids($conn, $traineeId, $qualificationId));
        }
        $accessibleModuleIds = array_values(array_unique(array_filter(array_map('intval', $accessibleModuleIds))));

        if (empty($accessibleModuleIds)) {
            return;
        }

        $modulePlaceholders = implode(',', array_fill(0, count($accessibleModuleIds), '?'));

        // Information Sheet notifications
        try {
            $infoStmt = $conn->prepare("
                SELECT DISTINCT c.title AS item_title, l.lesson_title
                FROM tbl_enrollment e
                JOIN tbl_batch b ON b.batch_id = e.batch_id
                JOIN tbl_module m ON m.qualification_id = b.qualification_id
                JOIN tbl_lessons l ON l.module_id = m.module_id
                JOIN tbl_lesson_contents c ON c.lesson_id = l.lesson_id
                WHERE e.trainee_id = ?
                  AND e.status = 'approved'
                  AND m.module_id IN ($modulePlaceholders)
                  AND l.posting_date IS NOT NULL
                  AND l.posting_date <= NOW()
            ");
            $infoStmt->execute(array_merge([$traineeId], $accessibleModuleIds));
            foreach ($infoStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $message = buildTraineeLessonNotifMessage('Information Sheet', $row['item_title'] ?? '', $row['lesson_title'] ?? '');
                insertNotificationIfMissing($conn, $userId, 'Information Sheet Posted', $message, $notifLink);
            }
        } catch (Exception $e) {
            error_log('Info sheet notification error: ' . $e->getMessage());
        }

        // Task Sheet notifications
        try {
            $taskStmt = $conn->prepare("
                SELECT DISTINCT ts.title AS item_title, l.lesson_title
                FROM tbl_enrollment e
                JOIN tbl_batch b ON b.batch_id = e.batch_id
                JOIN tbl_module m ON m.qualification_id = b.qualification_id
                JOIN tbl_lessons l ON l.module_id = m.module_id
                JOIN tbl_task_sheets ts ON ts.lesson_id = l.lesson_id
                WHERE e.trainee_id = ?
                  AND e.status = 'approved'
                  AND m.module_id IN ($modulePlaceholders)
                  AND l.posting_date IS NOT NULL
                  AND l.posting_date <= NOW()
            ");
            $taskStmt->execute(array_merge([$traineeId], $accessibleModuleIds));
            foreach ($taskStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $message = buildTraineeLessonNotifMessage('Task Sheet', $row['item_title'] ?? '', $row['lesson_title'] ?? '');
                insertNotificationIfMissing($conn, $userId, 'Task Sheet Posted', $message, $notifLink);
            }
        } catch (Exception $e) {
            error_log('Task sheet notification error: ' . $e->getMessage());
        }

        // Quiz notifications
        try {
            $quizStmt = $conn->prepare("
                SELECT DISTINCT l.lesson_title
                FROM tbl_enrollment e
                JOIN tbl_batch b ON b.batch_id = e.batch_id
                JOIN tbl_module m ON m.qualification_id = b.qualification_id
                JOIN tbl_lessons l ON l.module_id = m.module_id
                JOIN tbl_test t ON t.lesson_id = l.lesson_id AND t.activity_type_id = 1
                WHERE e.trainee_id = ?
                  AND e.status = 'approved'
                  AND m.module_id IN ($modulePlaceholders)
                  AND l.posting_date IS NOT NULL
                  AND l.posting_date <= NOW()
            ");
            $quizStmt->execute(array_merge([$traineeId], $accessibleModuleIds));
            foreach ($quizStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $message = buildTraineeLessonNotifMessage('Quiz', '', $row['lesson_title'] ?? '');
                insertNotificationIfMissing($conn, $userId, 'Quiz Posted', $message, $notifLink);
            }
        } catch (Exception $e) {
            error_log('Quiz notification error: ' . $e->getMessage());
        }
    } catch (Exception $e) {
        error_log('ensureDueTraineeModuleNotifications error: ' . $e->getMessage());
    }
}

function buildTraineeLessonNotifMessage(string $contentType, string $contentTitle, string $lessonTitle): string
{
    $contentTitle = trim($contentTitle);
    $lessonTitle = trim($lessonTitle);

    if ($contentTitle !== '') {
        $subject = "'$contentTitle'";
    } elseif ($lessonTitle !== '') {
        $subject = "for lesson '$lessonTitle'";
    } else {
        $subject = 'for your lesson';
    }

    return "$contentType $subject has been uploaded by your trainer.";
}

function insertNotificationIfMissing(PDO $conn, int $userId, string $title, string $message, string $link): void
{
    try {
        $existsStmt = $conn->prepare("
            SELECT notification_id
            FROM tbl_notifications
            WHERE user_id = ?
              AND title = ?
              AND message = ?
              AND link = ?
            LIMIT 1
        ");
        $existsStmt->execute([$userId, $title, $message, $link]);
        if ($existsStmt->fetchColumn()) {
            return;
        }

        $insertStmt = $conn->prepare("INSERT INTO tbl_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)");
        $insertStmt->execute([$userId, $title, $message, $link]);
    } catch (Exception $e) {
        error_log('insertNotificationIfMissing error: ' . $e->getMessage());
    }
}
