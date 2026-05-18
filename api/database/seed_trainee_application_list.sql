-- Seed 10 sample pending applications for the Registrar Trainee Application List
-- Safe to re-run: it removes only the sample records defined in this file.

START TRANSACTION;

DELETE FROM `tbl_trainee_hdr`
WHERE `email` IN (
    'seed.applicant01@demo.hohooville.local',
    'seed.applicant02@demo.hohooville.local',
    'seed.applicant03@demo.hohooville.local',
    'seed.applicant04@demo.hohooville.local',
    'seed.applicant05@demo.hohooville.local',
    'seed.applicant06@demo.hohooville.local',
    'seed.applicant07@demo.hohooville.local',
    'seed.applicant08@demo.hohooville.local',
    'seed.applicant09@demo.hohooville.local',
    'seed.applicant10@demo.hohooville.local'
);

INSERT INTO `tbl_trainee_hdr` (
    `first_name`,
    `middle_name`,
    `last_name`,
    `extension_name`,
    `sex`,
    `birth_certificate_no`,
    `email`,
    `facebook_account`,
    `phone_number`,
    `address`,
    `status`
) VALUES
('Ana', 'Mae', 'Rivera', NULL, 'Female', 'BCN-SEED-001', 'seed.applicant01@demo.hohooville.local', 'ana.rivera.demo', '09170000001', 'Purok 1, San Isidro, Quezon City, Metro Manila', 'active'),
('Carlo', 'Miguel', 'Santos', NULL, 'Male', 'BCN-SEED-002', 'seed.applicant02@demo.hohooville.local', 'carlo.santos.demo', '09170000002', 'Blk 4 Lot 2, Maligaya, Caloocan City, Metro Manila', 'active'),
('Bea', 'Lynn', 'Lopez', NULL, 'Female', 'BCN-SEED-003', 'seed.applicant03@demo.hohooville.local', 'bea.lopez.demo', '09170000003', '12 Mabini St, San Roque, Antipolo City, Rizal', 'active'),
('Daniel', 'Jose', 'Cruz', NULL, 'Male', 'BCN-SEED-004', 'seed.applicant04@demo.hohooville.local', 'daniel.cruz.demo', '09170000004', '45 Bonifacio Ave, Sta. Lucia, Pasig City, Metro Manila', 'active'),
('Elaine', 'Grace', 'Mendoza', NULL, 'Female', 'BCN-SEED-005', 'seed.applicant05@demo.hohooville.local', 'elaine.mendoza.demo', '09170000005', '18 Sampaguita Rd, Dela Paz, Makati City, Metro Manila', 'active'),
('Francis', 'Paul', 'Ramos', NULL, 'Male', 'BCN-SEED-006', 'seed.applicant06@demo.hohooville.local', 'francis.ramos.demo', '09170000006', '27 Narra St, Rosario, Marikina City, Metro Manila', 'active'),
('Grace', 'Anne', 'Villanueva', NULL, 'Female', 'BCN-SEED-007', 'seed.applicant07@demo.hohooville.local', 'grace.villanueva.demo', '09170000007', '63 Maharlika Hwy, San Juan, Taytay, Rizal', 'active'),
('Hector', 'Luis', 'Garcia', NULL, 'Male', 'BCN-SEED-008', 'seed.applicant08@demo.hohooville.local', 'hector.garcia.demo', '09170000008', '9 Rizal St, Sta. Cruz, Manila, Metro Manila', 'active'),
('Ivy', 'Rose', 'Torres', NULL, 'Female', 'BCN-SEED-009', 'seed.applicant09@demo.hohooville.local', 'ivy.torres.demo', '09170000009', '88 Katipunan Ext, Bagumbayan, Taguig City, Metro Manila', 'active'),
('Joshua', 'Neil', 'Navarro', NULL, 'Male', 'BCN-SEED-010', 'seed.applicant10@demo.hohooville.local', 'joshua.navarro.demo', '09170000010', '31 Luna St, Poblacion, San Pedro, Laguna', 'active');

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
SELECT `trainee_id`, 'Single', '2002-05-14', 23, 'Quezon City', 'Metro Manila', 'NCR', 'Filipino', 'Purok 1', 'San Isidro', 'District 2', 'Quezon City', 'Metro Manila', 'NCR'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant01@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'Single', '2001-11-22', 24, 'Caloocan City', 'Metro Manila', 'NCR', 'Filipino', 'Blk 4 Lot 2', 'Maligaya', 'District 1', 'Caloocan City', 'Metro Manila', 'NCR'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant02@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'Single', '2003-02-09', 23, 'Antipolo City', 'Rizal', 'Region IV-A', 'Filipino', '12 Mabini St', 'San Roque', NULL, 'Antipolo City', 'Rizal', 'Region IV-A'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant03@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'Single', '1999-08-30', 26, 'Pasig City', 'Metro Manila', 'NCR', 'Filipino', '45 Bonifacio Ave', 'Sta. Lucia', NULL, 'Pasig City', 'Metro Manila', 'NCR'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant04@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'Married', '1998-04-17', 28, 'Makati City', 'Metro Manila', 'NCR', 'Filipino', '18 Sampaguita Rd', 'Dela Paz', NULL, 'Makati City', 'Metro Manila', 'NCR'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant05@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'Single', '2000-01-05', 26, 'Marikina City', 'Metro Manila', 'NCR', 'Filipino', '27 Narra St', 'Rosario', NULL, 'Marikina City', 'Metro Manila', 'NCR'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant06@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'Single', '2004-07-11', 21, 'Taytay', 'Rizal', 'Region IV-A', 'Filipino', '63 Maharlika Hwy', 'San Juan', NULL, 'Taytay', 'Rizal', 'Region IV-A'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant07@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'Single', '1997-09-19', 28, 'Manila', 'Metro Manila', 'NCR', 'Filipino', '9 Rizal St', 'Sta. Cruz', 'District 3', 'Manila', 'Metro Manila', 'NCR'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant08@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'Single', '2002-12-03', 23, 'Taguig City', 'Metro Manila', 'NCR', 'Filipino', '88 Katipunan Ext', 'Bagumbayan', NULL, 'Taguig City', 'Metro Manila', 'NCR'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant09@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'Single', '2001-06-25', 24, 'San Pedro', 'Laguna', 'Region IV-A', 'Filipino', '31 Luna St', 'Poblacion', NULL, 'San Pedro', 'Laguna', 'Region IV-A'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant10@demo.hohooville.local';

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
SELECT `trainee_id`, 'High School Graduate', 'Unemployed', NULL, 'Out of School Youth', 0, NULL, NULL, 1, NULL, '2026-04-20 08:00:00'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant01@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'College Level', 'Employed', 'Part-time', 'Employed Worker', 0, NULL, NULL, 1, NULL, '2026-04-20 08:10:00'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant02@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'Senior High Graduate', 'Unemployed', NULL, 'Out of School Youth', 0, NULL, NULL, 1, NULL, '2026-04-20 08:20:00'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant03@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'High School Graduate', 'Self-employed', 'Part-time', 'Self-employed', 0, NULL, NULL, 1, NULL, '2026-04-20 08:30:00'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant04@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'College Graduate', 'Unemployed', NULL, 'Returning Learner', 0, NULL, NULL, 1, NULL, '2026-04-20 08:40:00'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant05@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'Senior High Graduate', 'Employed', 'Full-time', 'Employed Worker', 0, NULL, NULL, 1, NULL, '2026-04-20 08:50:00'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant06@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'High School Graduate', 'Unemployed', NULL, 'Out of School Youth', 0, NULL, NULL, 1, NULL, '2026-04-20 09:00:00'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant07@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'College Level', 'Self-employed', 'Full-time', 'Self-employed', 0, NULL, NULL, 1, NULL, '2026-04-20 09:10:00'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant08@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'Senior High Graduate', 'Unemployed', NULL, 'Out of School Youth', 0, NULL, NULL, 1, NULL, '2026-04-20 09:20:00'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant09@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 'College Graduate', 'Employed', 'Full-time', 'Employed Worker', 0, NULL, NULL, 1, NULL, '2026-04-20 09:30:00'
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant10@demo.hohooville.local';

INSERT INTO `tbl_enrollment` (
    `trainee_id`,
    `offered_qualification_id`,
    `batch_id`,
    `enrollment_date`,
    `status`,
    `scholarship_type`,
    `scholarship_type_id`
)
SELECT `trainee_id`, 1, 2, '2026-04-20 08:15:00', 'pending', 'STEP', 3
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant01@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 2, 3, '2026-04-20 08:25:00', 'pending', 'STEP', 3
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant02@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 5, 4, '2026-04-20 08:35:00', 'pending', 'TTSP', 2
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant03@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 4, 5, '2026-04-20 08:45:00', 'pending', 'TTSP', 2
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant04@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 7, 11, '2026-04-20 08:55:00', 'pending', 'TTSP', 2
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant05@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 7, 12, '2026-04-20 09:05:00', 'pending', 'TTSP', 2
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant06@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 1, 13, '2026-04-20 09:15:00', 'pending', 'TWSP', 1
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant07@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 1, 2, '2026-04-20 09:25:00', 'pending', 'STEP', 3
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant08@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 2, 3, '2026-04-20 09:35:00', 'pending', 'STEP', 3
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant09@demo.hohooville.local'
UNION ALL
SELECT `trainee_id`, 5, 4, '2026-04-20 09:45:00', 'pending', 'TTSP', 2
FROM `tbl_trainee_hdr` WHERE `email` = 'seed.applicant10@demo.hohooville.local';

COMMIT;
