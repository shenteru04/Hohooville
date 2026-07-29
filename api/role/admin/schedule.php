<?php
// Reuse the scheduling workflow while recording Admin as the workflow actor.
define('SCHEDULE_WORKFLOW_ACTOR_ROLE', 'admin');
require_once __DIR__ . '/../registrar/schedule.php';
