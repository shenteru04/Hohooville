-- Seed five pending applications for the Registrar Application List.
-- Safe to re-run: only records using the seed5.pending@demo.hohooville.local addresses are replaced.
-- Target: open Batch 2 / Electrical Installation and Maintenance.

START TRANSACTION;

DELETE FROM tbl_trainee_hdr
WHERE email IN (
    'seed5.pending01@demo.hohooville.local',
    'seed5.pending02@demo.hohooville.local',
    'seed5.pending03@demo.hohooville.local',
    'seed5.pending04@demo.hohooville.local',
    'seed5.pending05@demo.hohooville.local'
);

INSERT INTO tbl_trainee_hdr (
    first_name, middle_name, last_name, sex, birth_certificate_no,
    email, facebook_account, phone_number, address, status
) VALUES
    ('Mika', 'Anne', 'Dela Cruz', 'Female', 'SEED5-BC-001', 'seed5.pending01@demo.hohooville.local', 'mika.delacruz.seed', '09171230001', '12 Mabini St., San Isidro, Quezon City', 'active'),
    ('John', 'Paolo', 'Reyes', 'Male', 'SEED5-BC-002', 'seed5.pending02@demo.hohooville.local', 'john.reyes.seed', '09171230002', '45 Rizal Ave., Santa Mesa, Manila', 'active'),
    ('Angela', 'Marie', 'Santos', 'Female', 'SEED5-BC-003', 'seed5.pending03@demo.hohooville.local', 'angela.santos.seed', '09171230003', '8 Luna St., Bagong Silang, Caloocan City', 'active'),
    ('Mark', 'Joseph', 'Garcia', 'Male', 'SEED5-BC-004', 'seed5.pending04@demo.hohooville.local', 'mark.garcia.seed', '09171230004', '22 Bonifacio St., Commonwealth, Quezon City', 'active'),
    ('Rhea', 'Mae', 'Villanueva', 'Female', 'SEED5-BC-005', 'seed5.pending05@demo.hohooville.local', 'rhea.villanueva.seed', '09171230005', '31 Katipunan Rd., Loyola Heights, Quezon City', 'active');

INSERT INTO tbl_trainee_dtl (
    trainee_id, civil_status, birthdate, age, birthplace_city, birthplace_province,
    birthplace_region, nationality, house_no_street, barangay, district,
    city_municipality, province, region
)
SELECT trainee_id, 'Single', '2003-03-14', 23, 'Quezon City', 'Metro Manila', 'NCR', 'Filipino', '12 Mabini St.', 'San Isidro', 'District 2', 'Quezon City', 'Metro Manila', 'NCR'
FROM tbl_trainee_hdr WHERE email = 'seed5.pending01@demo.hohooville.local'
UNION ALL SELECT trainee_id, 'Single', '2001-07-22', 25, 'Manila', 'Metro Manila', 'NCR', 'Filipino', '45 Rizal Ave.', 'Santa Mesa', 'District 4', 'Manila', 'Metro Manila', 'NCR'
FROM tbl_trainee_hdr WHERE email = 'seed5.pending02@demo.hohooville.local'
UNION ALL SELECT trainee_id, 'Single', '2004-10-05', 21, 'Caloocan City', 'Metro Manila', 'NCR', 'Filipino', '8 Luna St.', 'Bagong Silang', 'District 1', 'Caloocan City', 'Metro Manila', 'NCR'
FROM tbl_trainee_hdr WHERE email = 'seed5.pending03@demo.hohooville.local'
UNION ALL SELECT trainee_id, 'Single', '2000-12-18', 25, 'Quezon City', 'Metro Manila', 'NCR', 'Filipino', '22 Bonifacio St.', 'Commonwealth', 'District 2', 'Quezon City', 'Metro Manila', 'NCR'
FROM tbl_trainee_hdr WHERE email = 'seed5.pending04@demo.hohooville.local'
UNION ALL SELECT trainee_id, 'Single', '2002-06-09', 24, 'Quezon City', 'Metro Manila', 'NCR', 'Filipino', '31 Katipunan Rd.', 'Loyola Heights', 'District 3', 'Quezon City', 'Metro Manila', 'NCR'
FROM tbl_trainee_hdr WHERE email = 'seed5.pending05@demo.hohooville.local';

INSERT INTO tbl_trainee_ftr (
    trainee_id, educational_attainment, employment_status, employment_type,
    learner_classification, is_pwd, privacy_consent, date_submitted
)
SELECT trainee_id, 'Senior High Graduate', 'Unemployed', NULL, 'Out of School Youth', 0, 1, NOW()
FROM tbl_trainee_hdr
WHERE email LIKE 'seed5.pending%@demo.hohooville.local';

INSERT INTO tbl_enrollment (
    trainee_id, offered_qualification_id, batch_id, enrollment_date, status, scholarship_type
)
SELECT trainee_id, 1, 2, DATE_SUB(NOW(), INTERVAL 5 MINUTE), 'pending', 'STEP'
FROM tbl_trainee_hdr WHERE email = 'seed5.pending01@demo.hohooville.local'
UNION ALL SELECT trainee_id, 1, 2, DATE_SUB(NOW(), INTERVAL 4 MINUTE), 'pending', 'STEP'
FROM tbl_trainee_hdr WHERE email = 'seed5.pending02@demo.hohooville.local'
UNION ALL SELECT trainee_id, 1, 2, DATE_SUB(NOW(), INTERVAL 3 MINUTE), 'pending', 'STEP'
FROM tbl_trainee_hdr WHERE email = 'seed5.pending03@demo.hohooville.local'
UNION ALL SELECT trainee_id, 1, 2, DATE_SUB(NOW(), INTERVAL 2 MINUTE), 'pending', 'STEP'
FROM tbl_trainee_hdr WHERE email = 'seed5.pending04@demo.hohooville.local'
UNION ALL SELECT trainee_id, 1, 2, DATE_SUB(NOW(), INTERVAL 1 MINUTE), 'pending', 'STEP'
FROM tbl_trainee_hdr WHERE email = 'seed5.pending05@demo.hohooville.local';

COMMIT;
