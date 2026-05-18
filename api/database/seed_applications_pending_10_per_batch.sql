-- Seed script to create 10 pending trainee applications for each target batch
-- Displays in Registrar > Applications as "Pending Review" applications
-- Uses email pattern: applseed.b{batch_id}.s{seq}@demo.hohooville.local for easy identification
-- Uses Filipino names for applicants

START TRANSACTION;

-- Remove prior seed records from this application seed
DELETE FROM tbl_trainee_hdr WHERE email LIKE 'applseed.b%@demo.hohooville.local';

DROP TEMPORARY TABLE IF EXISTS app_seed_target_batches;
CREATE TEMPORARY TABLE app_seed_target_batches (
    batch_id INT NOT NULL PRIMARY KEY,
    batch_name VARCHAR(255) NOT NULL,
    qualification_name VARCHAR(255) NOT NULL,
    trainer_name VARCHAR(255) NOT NULL,
    scholarship_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    max_trainees INT NOT NULL
);

-- Insert target batches
INSERT INTO app_seed_target_batches (batch_id, batch_name, qualification_name, trainer_name, scholarship_type, start_date, end_date, max_trainees) VALUES
(22, 'Driving 101 - Batch 4', 'Driving 101', 'Venkyle Gacita', 'TWSP', '2026-04-30', '2026-05-20', 25),
(13, 'Electrical Installation and Maintenance NC II - Batch 2', 'Electrical Installation and Maintenance', 'Lorenzo Mactabish', 'TWSP', '2027-01-27', '2027-02-27', 20),
(12, 'Driving 101 - Batch 2', 'Driving 101', 'Venkyle Gacita', 'TTSP', '2027-02-01', '2027-02-27', 25),
(11, 'Driving 101 - Batch 1', 'Driving 101', 'Venkyle Gacita', 'TTSP', '2026-12-20', '2027-01-20', 25),
(5, 'Shielded Metal Arc Welding (SMAW) NC II - Batch 1', 'Shielded Metal Arc Welding (SMAW)', 'Lorenzo Mactabish', 'TTSP', '2026-12-01', '2026-12-20', 15),
(4, 'Cookery NC II - Batch 1', 'Cookery', 'Andrei Davinci', 'TTSP', '2027-01-01', '2027-01-25', 25),
(3, 'Electronic Products Assembly and Servicing (EPAS) NC II - Batch 1', 'Electronic Products Assembly and Servicing (EPAS)', 'Vincent Micabalo', 'STEP', '2026-10-01', '2026-10-20', 25),
(2, 'Electrical Installation and Maintenance NC II - Batch 1', 'Electrical Installation and Maintenance', 'Juan Dela Cruz', 'STEP', '2027-02-01', '2027-02-24', 25);

DROP TEMPORARY TABLE IF EXISTS app_seed_numbers;
CREATE TEMPORARY TABLE app_seed_numbers (n INT NOT NULL PRIMARY KEY);

INSERT INTO app_seed_numbers (n) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10);

-- Filipino names pool for random selection
DROP TEMPORARY TABLE IF EXISTS app_seed_names;
CREATE TEMPORARY TABLE app_seed_names (
    seq INT NOT NULL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100)
);

INSERT INTO app_seed_names (seq, first_name, last_name) VALUES
(1, 'Maria', 'Santos'),
(2, 'Juan', 'Reyes'),
(3, 'Ana', 'Garcia'),
(4, 'Carlos', 'Lopez'),
(5, 'Rosa', 'Fernandez'),
(6, 'Miguel', 'Torres'),
(7, 'Carmen', 'Rivera'),
(8, 'Antonio', 'Gonzales'),
(9, 'Lucia', 'Cruz'),
(10, 'Ramon', 'Valdez');

-- Get offered_qualification_ids for each batch
DROP TEMPORARY TABLE IF EXISTS app_seed_batch_qual;
CREATE TEMPORARY TABLE app_seed_batch_qual AS
SELECT 
    astb.batch_id,
    astb.batch_name,
    astb.qualification_name,
    astb.trainer_name,
    astb.scholarship_type,
    astb.start_date,
    astb.end_date,
    b.offered_qualification_id,
    COALESCE(b.scholarship_type_id, (SELECT scholarship_type_id FROM tbl_scholarship_type WHERE scholarship_name = astb.scholarship_type LIMIT 1)) AS scholarship_type_id
FROM app_seed_target_batches astb
JOIN tbl_batch b ON b.batch_id = astb.batch_id;

-- Create pending applicant records
DROP TEMPORARY TABLE IF EXISTS app_seed_trainees;
CREATE TEMPORARY TABLE app_seed_trainees AS
SELECT 
    asq.batch_id,
    asq.batch_name,
    asq.qualification_name,
    asq.trainer_name,
    asq.scholarship_type,
    asq.start_date,
    asq.end_date,
    asq.offered_qualification_id,
    asq.scholarship_type_id,
    asn.n AS seq_no,
    CONCAT('applseed.b', asq.batch_id, '.s', LPAD(asn.n, 2, '0'), '@demo.hohooville.local') AS email,
    asn_names.first_name,
    asn_names.last_name,
    CASE WHEN MOD(asn.n, 2) = 0 THEN 'Female' ELSE 'Male' END AS sex,
    CONCAT('AC-', LPAD(asq.batch_id, 2, '0'), '-', LPAD(asn.n, 3, '0')) AS birth_certificate_no,
    CONCAT('applseed.b', asq.batch_id, '.s', LPAD(asn.n, 2, '0')) AS facebook_account,
    CONCAT('0918', LPAD(asq.batch_id, 2, '0'), LPAD(asn.n, 5, '0')) AS phone_number,
    CONCAT('Application Seed St., Demo District, City, Province') AS address,
    CONCAT('SC-', LPAD(asq.batch_id, 4, '0'), '-', LPAD(asn.n, 4, '0')) AS trainee_school_id,
    DATE_ADD('2000-01-01', INTERVAL (asq.batch_id + asn.n) DAY) AS birthdate,
    20 + MOD(asn.n, 8) AS age,
    DATE_SUB(DATE_ADD(asq.start_date, INTERVAL -7 DAY), INTERVAL FLOOR(RAND() * 7) DAY) AS enrollment_date
FROM app_seed_batch_qual asq
JOIN app_seed_numbers asn ON asn.n <= 10
JOIN app_seed_names asn_names ON asn_names.seq = asn.n;

-- Insert trainee header records
INSERT INTO tbl_trainee_hdr (
    trainee_school_id, first_name, last_name, sex, birth_certificate_no, 
    email, facebook_account, phone_number, address, status
)
SELECT 
    ast.trainee_school_id, ast.first_name, ast.last_name, ast.sex, 
    ast.birth_certificate_no, ast.email, ast.facebook_account, 
    ast.phone_number, ast.address, 'active'
FROM app_seed_trainees ast;

-- Insert trainee detail records
INSERT INTO tbl_trainee_dtl (
    trainee_id, civil_status, birthdate, age, birthplace_city, birthplace_province, 
    birthplace_region, nationality, house_no_street, barangay, district, city_municipality, 
    province, region
)
SELECT 
    th.trainee_id, 'Single', ast.birthdate, ast.age, 'Demo City', 'Demo Province', 
    'Region Demo', 'Filipino', CONCAT('House ', ast.seq_no), 'Demo Barangay', 
    'Demo District', 'Demo City', 'Demo Province', 'Region Demo'
FROM app_seed_trainees ast
JOIN tbl_trainee_hdr th ON th.email = ast.email;

-- Insert trainee footer records  
INSERT INTO tbl_trainee_ftr (
    trainee_id, educational_attainment, employment_status, employment_type, 
    learner_classification, is_pwd, disability_type, disability_cause, 
    privacy_consent, digital_signature, date_submitted
)
SELECT 
    th.trainee_id,
    CASE WHEN MOD(ast.seq_no, 3) = 0 THEN 'College Level' ELSE 'Senior High Graduate' END,
    CASE WHEN MOD(ast.seq_no, 2) = 0 THEN 'Employed' ELSE 'Unemployed' END,
    CASE WHEN MOD(ast.seq_no, 2) = 0 THEN CASE WHEN MOD(ast.seq_no, 4) = 0 THEN 'Full-time' ELSE 'Part-time' END ELSE NULL END,
    CASE WHEN MOD(ast.seq_no, 2) = 0 THEN 'Employed Worker' ELSE 'Out of School Youth' END,
    0, NULL, NULL, 1, NULL, ast.enrollment_date
FROM app_seed_trainees ast
JOIN tbl_trainee_hdr th ON th.email = ast.email;

-- Insert enrollment records with 'pending' status
INSERT INTO tbl_enrollment (
    trainee_id, offered_qualification_id, batch_id, enrollment_date, 
    status, scholarship_type, scholarship_type_id
)
SELECT 
    th.trainee_id, ast.offered_qualification_id, ast.batch_id, 
    ast.enrollment_date, 'pending', ast.scholarship_type, ast.scholarship_type_id
FROM app_seed_trainees ast
JOIN tbl_trainee_hdr th ON th.email = ast.email;

COMMIT;
