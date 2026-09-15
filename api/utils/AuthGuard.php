<?php
/** Shared server-side JWT/session validation for protected API endpoints. */
require_once __DIR__ . '/SecuritySession.php';

class AuthGuard {
    private const SECRET = 'hohoo_ville_secret_key_2024';

    public static function requireAuthenticated(PDO $conn): array {
        startSecureSession();
        applyNoStoreHeaders();
        $headers = getallheaders();
        $authorization = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (!preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
            $sessionUserId = (int)($_SESSION['user_id'] ?? 0);
            $sessionRoleId = (int)($_SESSION['role_id'] ?? 0);
            if (empty($_SESSION['authenticated']) || $sessionUserId <= 0 || $sessionRoleId <= 0) {
                self::deny('Authentication is required.');
            }
            $sessionStmt = $conn->prepare("SELECT user_id, role_id FROM tbl_users WHERE user_id = ? AND role_id = ? AND status = 'active' AND COALESCE(is_archived, 0) = 0");
            $sessionStmt->execute([$sessionUserId, $sessionRoleId]);
            if (!$sessionStmt->fetch(PDO::FETCH_ASSOC)) self::deny('Your session has ended.');
            return ['user_id' => $sessionUserId, 'role_id' => $sessionRoleId];
        }
        $parts = explode('.', $matches[1]);
        if (count($parts) !== 3) self::deny('Invalid session.');
        $expected = self::encode(hash_hmac('sha256', $parts[0] . '.' . $parts[1], self::SECRET, true));
        if (!hash_equals($expected, $parts[2])) self::deny('Invalid session.');
        $payload = json_decode(self::decode($parts[1]), true);
        if (!is_array($payload) || empty($payload['user_id']) || empty($payload['role_id']) || empty($payload['sid']) || empty($payload['exp']) || $payload['exp'] < time()) self::deny('Invalid or expired session.');
        $stmt = $conn->prepare("SELECT user_id, role_id FROM tbl_users WHERE user_id = ? AND role_id = ? AND status = 'active' AND is_archived = 0 AND active_session_id = ?");
        $stmt->execute([(int)$payload['user_id'], (int)$payload['role_id'], $payload['sid']]);
        if (!$stmt->fetch(PDO::FETCH_ASSOC)) self::deny('Your session has ended because the account was used in another browser or is no longer active.');
        if (empty($_SESSION['authenticated']) || (int)($_SESSION['user_id'] ?? 0) !== (int)$payload['user_id']) {
            self::deny('Your PHP session is missing or expired.');
        }
        return ['user_id' => (int)$payload['user_id'], 'role_id' => (int)$payload['role_id']];
    }
    public static function requireRole(PDO $conn, array $allowedRoles): array {
        $identity = self::requireAuthenticated($conn);
        $placeholders = implode(',', array_fill(0, count($allowedRoles), '?'));
        $stmt = $conn->prepare("SELECT r.role_name FROM tbl_users u JOIN tbl_role r ON r.role_id = u.role_id WHERE u.user_id = ? AND r.role_name IN ($placeholders)");
        $stmt->execute(array_merge([$identity['user_id']], $allowedRoles));
        if (!$stmt->fetchColumn()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied.']);
            exit;
        }
        return $identity;
    }
    public static function requireTraineeAccess(PDO $conn, int $traineeId): array {
        $identity = self::requireRole($conn, ['trainee']);
        $sessionTraineeId = (int)($_SESSION['trainee_id'] ?? 0);
        if ($sessionTraineeId <= 0) {
            $stmt = $conn->prepare('SELECT trainee_id FROM tbl_trainee_hdr WHERE user_id = ? LIMIT 1');
            $stmt->execute([$identity['user_id']]);
            $sessionTraineeId = (int)$stmt->fetchColumn();
        }
        if ($traineeId <= 0 || $sessionTraineeId !== $traineeId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied.']);
            exit;
        }
        return $identity;
    }
    public static function requireUserAccess(PDO $conn, int $userId): array {
        $identity = self::requireAuthenticated($conn);
        if ($userId <= 0 || $identity['user_id'] !== $userId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied.']);
            exit;
        }
        return $identity;
    }
    public static function requireTrainerAccess(PDO $conn, int $trainerId): array {
        $identity = self::requireRole($conn, ['trainer', 'admin']);
        $roleStmt = $conn->prepare('SELECT role_name FROM tbl_role WHERE role_id = ?');
        $roleStmt->execute([$identity['role_id']]);
        $roleName = strtolower((string)$roleStmt->fetchColumn());
        if ($roleName === 'admin') return $identity;

        $stmt = $conn->prepare('SELECT trainer_id FROM tbl_trainer WHERE user_id = ? LIMIT 1');
        $stmt->execute([$identity['user_id']]);
        $ownedTrainerId = (int)$stmt->fetchColumn();
        if ($ownedTrainerId <= 0 || $trainerId <= 0 || $ownedTrainerId !== $trainerId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied.']);
            exit;
        }
        return $identity;
    }
    private static function deny(string $message): void { http_response_code(401); echo json_encode(['success' => false, 'message' => $message]); exit; }
    private static function encode(string $value): string { return rtrim(strtr(base64_encode($value), '+/', '-_'), '='); }
    private static function decode(string $value): string { return base64_decode(strtr($value, '-_', '+/')); }
}
