<?php
chdir(__DIR__ . '/../api/role/registrar');
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET = ['action' => 'list'];
require __DIR__ . '/../api/role/registrar/trainers.php';
