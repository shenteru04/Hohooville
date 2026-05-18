-- Seed listed batches so each ends up with 10 approved trainees visible in Admin > View Batches.
-- Rerunnable: deletes and recreates only records inserted by this script.

START TRANSACTION;

-- Remove prior seed records from this batch-visibility seed.
DELETE FROM `tbl_trainee_hdr`
WHERE `email` LIKE 'batchfill.b%@demo.hohooville.local';

DROP TEMPORARY TABLE IF EXISTS `seed_target_batches`;
CREATE TEMPORARY TABLE `seed_target_batches` (
    `batch_id` INT NOT NULL PRIMARY KEY,
    `offered_qualification_id` INT NOT NULL,
    `desired_visible_count` INT NOT NULL DEFAULT 10
);

INSERT INTO `seed_target_batches` (`batch_id`, `offered_qualification_id`, `desired_visible_count`) VALUES
(2, 1, 10),
(3, 2, 10),
(4, 5, 10),
(5, 4, 10),
(11, 7, 10),
(12, 7, 10),
(13, 1, 10),
(22, 7, 10);

DROP TEMPORARY TABLE IF EXISTS `seed_numbers`;
CREATE TEMPORARY TABLE `seed_numbers` (`n` INT NOT NULL PRIMARY KEY);

INSERT INTO `seed_numbers` (`n`) VALUES
(1),(2),(3),(4),(5),(6),(7),(8),(9),(10);

DROP TEMPORARY TABLE IF EXISTS `seed_needed`;
CREATE TEMPORARY TABLE `seed_needed` AS
SELECT
    tb.`batch_id`,
    b.`batch_name`,
    tb.`offered_qualification_id`,
    COALESCE(NULLIF(b.`scholarship_type`, ''), st.`scholarship_name`) AS `scholarship_type`,
    b.`scholarship_type_id`,
    GREATEST(
        tb.`desired_visible_count` - (
            SELECT COUNT(*)
            FROM `tbl_enrollment` e
            WHERE e.`batch_id` = tb.`batch_id`
              AND e.`status` = 'approved'
        ),
        0
    ) AS `needed_count`
FROM `seed_target_batches` tb
JOIN `tbl_batch` b ON b.`batch_id` = tb.`batch_id`
LEFT JOIN `tbl_scholarship_type` st ON st.`scholarship_type_id` = b.`scholarship_type_id`;

DROP TEMPORARY TABLE IF EXISTS `seed_new_trainees`;
CREATE TEMPORARY TABLE `seed_new_trainees` AS
SELECT
    sn.`batch_id`,
    sn.`batch_name`,
    sn.`offered_qualification_id`,
    sn.`scholarship_type`,
    sn.`scholarship_type_id`,
    nums.`n` AS `seed_no`,
    CONCAT('batchfill.b', sn.`batch_id`, '.s', LPAD(nums.`n`, 2, '0'), '@demo.hohooville.local') AS `email`,
    CONCAT('Batch', sn.`batch_id`) AS `first_name`,
    CONCAT('Seed', LPAD(nums.`n`, 2, '0')) AS `last_name`,
    CASE WHEN MOD(nums.`n`, 2) = 0 THEN 'Female' ELSE 'Male' END AS `sex`,
    CONCAT('BCN-B', sn.`batch_id`, '-S', LPAD(nums.`n`, 2, '0')) AS `birth_certificate_no`,
    CONCAT('batchfill.b', sn.`batch_id`, '.s', LPAD(nums.`n`, 2, '0')) AS `facebook_account`,
    CONCAT('0917', LPAD(sn.`batch_id`, 2, '0'), LPAD(nums.`n`, 5, '0')) AS `phone_number`,
    CONCAT('Batch ', sn.`batch_id`, ' Seed Street, Barangay Demo, Sample City, Demo Province') AS `address`,
    CONCAT('SB-', LPAD(sn.`batch_id`, 4, '0'), '-', LPAD(nums.`n`, 4, '0')) AS `trainee_school_id`,
    DATE_ADD('2000-01-01', INTERVAL (sn.`batch_id` + nums.`n`) DAY) AS `birthdate`,
    20 + MOD(nums.`n`, 7) AS `age`,
    CONCAT('2026-04-20 ', LPAD(8 + MOD(nums.`n`, 10), 2, '0'), ':', LPAD(MOD(nums.`n` * 7, 60), 2, '0'), ':00') AS `enrollment_date`
FROM `seed_needed` sn
JOIN `seed_numbers` nums
  ON nums.`n` <= sn.`needed_count`;

INSERT INTO `tbl_trainee_hdr` (
    `trainee_school_id`,
    `first_name`,
    `last_name`,
    `sex`,
    `birth_certificate_no`,
    `email`,
    `facebook_account`,
    `phone_number`,
    `address`,
    `status`
)
SELECT
    snt.`trainee_school_id`,
    snt.`first_name`,
    snt.`last_name`,
    snt.`sex`,
    snt.`birth_certificate_no`,
    snt.`email`,
    snt.`facebook_account`,
    snt.`phone_number`,
    snt.`address`,
    'active'
FROM `seed_new_trainees` snt;

INSERT INTO `tbl_trainee_dtl` (
    `trainee_id`,
    `civil_status`,
    `birthdate`,
    `age`,
    `birthplace_city`,
    `birthplace_province`,
    `birthplace_region`,
    `nationality`,
    `house_no_street`,
    `barangay`,
    `district`,
    `city_municipality`,
    `province`,
    `region`
)
SELECT
    th.`trainee_id`,
    'Single',
    snt.`birthdate`,
    snt.`age`,
    'Sample City',
    'Demo Province',
    'Region X',
    'Filipino',
    CONCAT('House ', snt.`seed_no`),
    'Barangay Demo',
    'District 1',
    'Sample City',
    'Demo Province',
    'Region X'
FROM `seed_new_trainees` snt
JOIN `tbl_trainee_hdr` th
  ON th.`email` = snt.`email`;

INSERT INTO `tbl_trainee_ftr` (
    `trainee_id`,
    `educational_attainment`,
    `employment_status`,
    `employment_type`,
    `learner_classification`,
    `is_pwd`,
    `disability_type`,
    `disability_cause`,
    `privacy_consent`,
    `digital_signature`,
    `date_submitted`
)
SELECT
    th.`trainee_id`,
    CASE WHEN MOD(snt.`seed_no`, 3) = 0 THEN 'College Level' ELSE 'Senior High Graduate' END,
    CASE WHEN MOD(snt.`seed_no`, 4) = 0 THEN 'Employed' ELSE 'Unemployed' END,
    CASE WHEN MOD(snt.`seed_no`, 4) = 0 THEN 'Part-time' ELSE NULL END,
    CASE WHEN MOD(snt.`seed_no`, 4) = 0 THEN 'Employed Worker' ELSE 'Out of School Youth' END,
    0,
    NULL,
    NULL,
    1,
    NULL,
    snt.`enrollment_date`
FROM `seed_new_trainees` snt
JOIN `tbl_trainee_hdr` th
  ON th.`email` = snt.`email`;

INSERT INTO `tbl_enrollment` (
    `trainee_id`,
    `offered_qualification_id`,
    `batch_id`,
    `enrollment_date`,
    `status`,
    `scholarship_type`,
    `scholarship_type_id`
)
SELECT
    th.`trainee_id`,
    snt.`offered_qualification_id`,
    snt.`batch_id`,
    snt.`enrollment_date`,
    'approved',
    snt.`scholarship_type`,
    snt.`scholarship_type_id`
FROM `seed_new_trainees` snt
JOIN `tbl_trainee_hdr` th
  ON th.`email` = snt.`email`;

INSERT INTO `tbl_enrolled_trainee` (
    `enrollment_id`,
    `trainee_id`
)
SELECT
    e.`enrollment_id`,
    e.`trainee_id`
FROM `tbl_enrollment` e
JOIN `tbl_trainee_hdr` th
  ON th.`trainee_id` = e.`trainee_id`
WHERE th.`email` LIKE 'batchfill.b%@demo.hohooville.local';

COMMIT;
