<?php
/**
 * Safe Migration: Remove duplicate ctpr_no and nominal_duration columns from tbl_trainee_hdr
 * 
 * These columns are being removed because:
 * 1. The data is already stored in tbl_qualifications (ctpr_number, duration)
 * 2. We can fetch this data via the qualification_id stored in tbl_enrollment
 * 3. The API already JOINs with tbl_qualifications to provide this data
 * 4. Removing duplicates prevents data inconsistencies
 * 
 * This script:
 * - Checks if the columns exist before dropping them
 * - Won't cause errors if columns are already gone
 * - Provides clear feedback on what was done
 */

require_once 'db.php';

$database = new Database();
$conn = $database->getConnection();

echo "=== Removing Duplicate Columns Migration ===\n\n";

try {
    // Check if columns exist before dropping
    $checkQuery = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'tbl_trainee_hdr' 
                   AND COLUMN_NAME IN ('ctpr_no', 'nominal_duration')";
    
    $stmt = $conn->prepare($checkQuery);
    $stmt->execute();
    $existingColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($existingColumns)) {
        echo "✓ Columns already removed or don't exist.\n";
        echo "No migration needed.\n";
        exit;
    }
    
    // Drop columns if they exist
    $columnsToRemove = ['ctpr_no', 'nominal_duration'];
    foreach ($columnsToRemove as $column) {
        if (in_array($column, $existingColumns)) {
            $dropQuery = "ALTER TABLE tbl_trainee_hdr DROP COLUMN $column";
            $conn->exec($dropQuery);
            echo "✓ Dropped column: $column\n";
        }
    }
    
    echo "\n=== Migration Complete ===\n";
    echo "The following columns have been safely removed from tbl_trainee_hdr:\n";
    echo "- ctpr_no\n";
    echo "- nominal_duration\n\n";
    echo "Data is now retrieved from tbl_qualifications via JOIN:\n";
    echo "SELECT c.ctpr_number, c.duration\n";
    echo "FROM tbl_qualifications c\n";
    echo "JOIN tbl_enrollment e ON c.qualification_id = e.qualification_id\n";
    echo "WHERE e.trainee_id = ?\n";
    
} catch (Exception $e) {
    echo "✗ Error during migration: " . $e->getMessage() . "\n";
    exit(1);
}
?>
