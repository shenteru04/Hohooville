<?php
// Unit-assignment helpers shared with the registrar scheduling workflow.
require_once __DIR__ . '/../registrar/batches.php';
require_once __DIR__ . '/../../utils/AuthGuard.php';

$database = new Database();
$conn = $database->getConnection();
AuthGuard::requireRole($conn, ['admin']);
