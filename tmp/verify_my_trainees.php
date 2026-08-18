<?php
chdir(__DIR__ . '/../api/role/trainer');
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET = ['action' => 'list', 'trainer_id' => 1, 'batch_id' => 1];
require __DIR__ . '/../api/role/trainer/my_trainees.php';
