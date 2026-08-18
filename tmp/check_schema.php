<?php
$pdo = new PDO('mysql:host=localhost;dbname=technical_db;charset=utf8mb4', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

foreach (['tbl_trainer','tbl_trainer_qualifications','tbl_nc_levels','tbl_qualifications','tbl_users'] as $t) {
    echo "TABLE:$t\n";
    try {
        $stmt = $pdo->query("SHOW CREATE TABLE `$t`");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        echo ($row['Create Table'] ?? $row['Create view'] ?? 'NO DATA') . "\n\n";
    } catch (Throwable $e) {
        echo 'ERR: ' . $e->getMessage() . "\n\n";
    }
}

echo "\nCOLUMNS tbl_trainer\n";
$stmt = $pdo->query("SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.columns WHERE table_schema='technical_db' AND table_name='tbl_trainer' ORDER BY ORDINAL_POSITION");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['COLUMN_NAME'] . ' => ' . $row['COLUMN_TYPE'] . PHP_EOL;
}

echo "\nCOLUMNS tbl_trainer_qualifications\n";
$stmt = $pdo->query("SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.columns WHERE table_schema='technical_db' AND table_name='tbl_trainer_qualifications' ORDER BY ORDINAL_POSITION");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['COLUMN_NAME'] . ' => ' . $row['COLUMN_TYPE'] . PHP_EOL;
}

echo "\nQUERY TEST\n";
try {
    $query = "SELECT t.trainer_id, t.first_name, t.last_name, t.email, t.address, t.address_id, t.trainer_type, t.trainer_nc_level_id, t.status, t.qualification_id, COALESCE(t.profile_image, '') as profile_image, q_primary.qualification_name, COALESCE(nc_trainer.nc_level_code, nc_q.nc_level_code) AS nc_level_code, COALESCE(nc_trainer.nc_level_name, nc_q.nc_level_name) AS nc_level_name FROM tbl_trainer t LEFT JOIN tbl_qualifications q_primary ON t.qualification_id = q_primary.qualification_id LEFT JOIN tbl_nc_levels nc_trainer ON t.trainer_nc_level_id = nc_trainer.nc_level_id LEFT JOIN tbl_nc_levels nc_q ON q_primary.nc_level_id = nc_q.nc_level_id ORDER BY t.trainer_id DESC LIMIT 5";
    $rows = $pdo->query($query)->fetchAll(PDO::FETCH_ASSOC);
    echo 'ROWCOUNT=' . count($rows) . "\n";
    print_r($rows[0] ?? []);
} catch (Throwable $e) {
    echo 'QUERY_ERR: ' . $e->getMessage() . "\n";
}
