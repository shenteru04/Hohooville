-- Repair missing EPAS seed batch and restore affected demo trainee enrollments.
-- Safe to re-run in environments where batch_id 14 is missing and the affected
-- example.com trainees have approved enrollments with batch_id = NULL.

START TRANSACTION;

INSERT INTO `tbl_batch` (
    `batch_id`,
    `batch_name`,
    `qualification_id`,
    `trainer_id`,
    `scholarship_type`,
    `scholarship_type_id`,
    `start_date`,
    `end_date`,
    `status`,
    `max_trainees`
)
SELECT
    14,
    'Electronic Products Assembly and Servicing (EPAS) - Batch 2',
    17,
    1,
    NULL,
    1,
    '2026-05-20',
    '2026-06-25',
    'closed',
    15
WHERE NOT EXISTS (
    SELECT 1
    FROM `tbl_batch`
    WHERE `batch_id` = 14
);

UPDATE `tbl_enrollment` e
JOIN `tbl_trainee_hdr` th ON th.`trainee_id` = e.`trainee_id`
SET e.`batch_id` = 14
WHERE e.`status` = 'approved'
  AND e.`batch_id` IS NULL
  AND e.`offered_qualification_id` = 12
  AND th.`email` LIKE '%@example.com';

COMMIT;
