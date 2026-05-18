<?php
// Debug endpoint to check if notifications API is working correctly
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$debug = [
    'timestamp' => date('Y-m-d H:i:s'),
    'server_info' => [
        'PHP_VERSION' => PHP_VERSION,
        'SERVER_SOFTWARE' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'],
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'unknown'
    ],
    'headers_received' => [
        'Authorization' => isset($_SERVER['HTTP_AUTHORIZATION']) ? 'present' : 'missing',
        'Redirect_HTTP_Authorization' => isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? 'present' : 'missing',
        'Content_Type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
    ],
    'getallheaders_available' => function_exists('getallheaders') ? 'yes' : 'no',
    'all_headers' => []
];

if (function_exists('getallheaders')) {
    $headers = getallheaders();
    foreach ($headers as $key => $value) {
        if (stripos($key, 'auth') !== false) {
            $debug['all_headers'][$key] = 'present (sensitive)';
        }
    }
}

// Try to get token from various sources
$token = '';
if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $debug['token_source'] = 'HTTP_AUTHORIZATION';
    if (stripos($_SERVER['HTTP_AUTHORIZATION'], 'Bearer ') === 0) {
        $token = substr($_SERVER['HTTP_AUTHORIZATION'], 7);
    }
} elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $debug['token_source'] = 'REDIRECT_HTTP_AUTHORIZATION';
    if (stripos($_SERVER['REDIRECT_HTTP_AUTHORIZATION'], 'Bearer ') === 0) {
        $token = substr($_SERVER['REDIRECT_HTTP_AUTHORIZATION'], 7);
    }
} elseif (function_exists('getallheaders')) {
    $headers = getallheaders();
    if (!empty($headers['Authorization'])) {
        $debug['token_source'] = 'getallheaders Authorization';
        if (stripos($headers['Authorization'], 'Bearer ') === 0) {
            $token = substr($headers['Authorization'], 7);
        }
    } elseif (!empty($headers['authorization'])) {
        $debug['token_source'] = 'getallheaders authorization';
        if (stripos($headers['authorization'], 'Bearer ') === 0) {
            $token = substr($headers['authorization'], 7);
        }
    }
}

$debug['token_found'] = !empty($token) ? 'yes' : 'no';
$debug['token_length'] = strlen($token);
$debug['token_parts'] = count(explode('.', $token));

// Check database connection
$debug['database'] = [];
try {
    require_once 'database/db.php';
    $db = new Database();
    $conn = $db->getConnection();
    $debug['database']['connection'] = 'success';
    
    // Check if tbl_notifications exists
    $stmt = $conn->prepare("SELECT 1 FROM tbl_notifications LIMIT 1");
    $stmt->execute();
    $debug['database']['table_exists'] = 'yes';
} catch (Exception $e) {
    $debug['database']['connection'] = 'failed';
    $debug['database']['error'] = $e->getMessage();
}

echo json_encode($debug, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
