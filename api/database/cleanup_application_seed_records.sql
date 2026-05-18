-- Cleanup script to remove application seed records inserted by seed_applications_pending_10_per_batch.sql
-- Removes all records with email pattern: applseed.b*@demo.hohooville.local
-- Deletes in reverse order of insertion to respect foreign key constraints

START TRANSACTION;

-- Remove enrollment records first
DELETE FROM tbl_enrollment 
WHERE trainee_id IN (
    SELECT trainee_id 
    FROM tbl_trainee_hdr 
    WHERE email LIKE 'applseed.b%@demo.hohooville.local'
);

-- Remove trainee footer records
DELETE FROM tbl_trainee_ftr 
WHERE trainee_id IN (
    SELECT trainee_id 
    FROM tbl_trainee_hdr 
    WHERE email LIKE 'applseed.b%@demo.hohooville.local'
);

-- Remove trainee detail records
DELETE FROM tbl_trainee_dtl 
WHERE trainee_id IN (
    SELECT trainee_id 
    FROM tbl_trainee_hdr 
    WHERE email LIKE 'applseed.b%@demo.hohooville.local'
);

-- Remove trainee header records
DELETE FROM tbl_trainee_hdr 
WHERE email LIKE 'applseed.b%@demo.hohooville.local';

COMMIT;
