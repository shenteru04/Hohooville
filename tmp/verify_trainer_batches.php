<?php
chdir(__DIR__ . '/../api/role/trainer');
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET = ['trainer_id' => 2];
require __DIR__ . '/../api/role/trainer/my_batches.php';
