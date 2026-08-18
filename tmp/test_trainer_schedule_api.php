<?php
chdir(__DIR__ . '/../api/role/trainer');
$_GET = ['action' => 'schedule', 'trainer_id' => 2];
$_SERVER['REQUEST_METHOD'] = 'GET';
require 'trainer_dashboard.php';
