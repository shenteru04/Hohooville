<?php
// Reuse the scheduling workflow while recording Admin as the workflow actor.
define('SCHEDULE_WORKFLOW_ACTOR_ROLE', 'admin');
require_once __DIR__ . '/../../database/db.php';
require_once __DIR__ . '/../../utils/AuthGuard.php';

$database = new Database();
$conn = $database->getConnection();
AuthGuard::requireRole($conn, ['admin']);
require_once __DIR__ . '/../registrar/schedule.php';
