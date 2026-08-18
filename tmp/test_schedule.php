<?php
require_once __DIR__ . "\..\api\database\db.php";

$database = new Database();
$db = $database->getConnection();

$trainerId = 2;
$stmt = $db->prepare("
    SELECT
        b.batch_id,
        b.batch_name,
        q.qualification_name AS course_name,
        s.schedule,
        COALESCE(r.room_name, 'TBA') AS room,
        b.trainer_id,
        b.status
    FROM tbl_batch b
    LEFT JOIN tbl_qualifications q ON q.qualification_id = b.qualification_id
    LEFT JOIN tbl_schedule s ON s.batch_id = b.batch_id
    LEFT JOIN tbl_rooms r ON r.room_id = s.room_id
    WHERE b.trainer_id = ? AND b.status = 'open'
    LIMIT 10
");
$stmt->execute([$trainerId]);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Trainer $trainerId open batches:\n";
var_dump($results);
