<?php

function startSecureSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_secure', $isHttps ? '1' : '0');
    ini_set('session.cookie_samesite', 'Lax');

    session_name('HOHOOVILLE_SESSION');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

function establishSecureSession(int $userId, int $roleId, ?int $traineeId = null, ?int $trainerId = null): void
{
    startSecureSession();
    session_regenerate_id(true);
    $_SESSION['authenticated'] = true;
    $_SESSION['user_id'] = $userId;
    $_SESSION['role_id'] = $roleId;
    $_SESSION['trainee_id'] = $traineeId;
    $_SESSION['trainer_id'] = $trainerId;
    $_SESSION['authenticated_at'] = time();
}

function destroySecureSession(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        startSecureSession();
    }

    $_SESSION = [];
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $params['path'] ?? '/',
        'domain' => $params['domain'] ?? '',
        'secure' => (bool)($params['secure'] ?? false),
        'httponly' => true,
        'samesite' => $params['samesite'] ?? 'Lax'
    ]);
    session_destroy();
}

function applyNoStoreHeaders(): void
{
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
}
