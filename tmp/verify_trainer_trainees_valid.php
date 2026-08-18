<?php
chdir('C:\xampp\htdocs\Hohoo-ville\api\role\trainer');
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET = ['action' => 'list', 'trainer_id' => 2, 'batch_id' => 3];
require __DIR__ . '/../api/role/trainer/my_trainees.php';
