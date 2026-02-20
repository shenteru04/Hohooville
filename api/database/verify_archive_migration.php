<?php
/**
 * Database Migration Verification Script
 * Run this script to verify that the archive feature database changes are properly applied
 */

require_once 'db.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    echo "=== Archive Feature Database Verification ===\n\n";
    
    // Check if columns exist
    $stmt = $db->prepare("SHOW COLUMNS FROM tbl_enrollment WHERE Field IN ('completion_date', 'is_archived', 'archive_date')");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Checking for required columns:\n";
    $required_columns = ['completion_date', 'is_archived', 'archive_date'];
    $found_columns = array_column($columns, 'Field');
    
    foreach ($required_columns as $col) {
        $status = in_array($col, $found_columns) ? '✓ OK' : '✗ MISSING';
        echo "  - $col: $status\n";
    }
    
    // Check enum values
    echo "\nChecking enrollment status enum values:\n";
    $stmt = $db->prepare("SHOW COLUMNS FROM tbl_enrollment WHERE Field = 'status'");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "  Type: " . ($result ? $result['Type'] : 'NOT FOUND') . "\n";
    
    // Check indexes
    echo "\nChecking indexes:\n";
    $stmt = $db->prepare("SHOW INDEXES FROM tbl_enrollment WHERE Column_name IN ('trainee_id', 'is_archived', 'status')");
    $stmt->execute();
    $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "  Found " . count($indexes) . " relevant indexes\n";
    
    // Test archiving a sample record
    echo "\nTesting archive functionality:\n";
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM tbl_enrollment WHERE trainee_id = 5 AND is_archived = 0");
    $stmt->execute();
    $active = $stmt->fetchColumn();
    echo "  Active enrollments for trainee 5: $active\n";
    
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM tbl_enrollment WHERE trainee_id = 5 AND is_archived = 1");
    $stmt->execute();
    $archived = $stmt->fetchColumn();
    echo "  Archived enrollments for trainee 5: $archived\n";
    
    echo "\n=== Verification Complete ===\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>
