<?php
/**
 * Database Migration Script
 * This script updates the database schema to use tbl_ prefixed table names
 * Run this once to fix the table naming inconsistency
 */

header('Content-Type: application/json');
require_once '../database/db.php';

$database = new Database();
$conn = $database->getConnection();

try {
    // Start transaction
    $conn->beginTransaction();
    
    echo "Starting database migration...\n";
    
    // Drop old tables if they exist (without tbl_ prefix)
    $dropQueries = [
        "DROP TABLE IF EXISTS enrollments",
        "DROP TABLE IF EXISTS attendance",
        "DROP TABLE IF EXISTS activity_logs",
        "DROP TABLE IF EXISTS announcements",
        "DROP TABLE IF EXISTS certificates",
        "DROP TABLE IF EXISTS daily_lesson_scores",
        "DROP TABLE IF EXISTS documents",
        "DROP TABLE IF EXISTS grades",
        "DROP TABLE IF EXISTS modules",
        "DROP TABLE IF EXISTS payments",
        "DROP TABLE IF EXISTS trainees",
        "DROP TABLE IF EXISTS batches",
        "DROP TABLE IF EXISTS qualifications",
        "DROP TABLE IF EXISTS users"
    ];
    
    foreach ($dropQueries as $query) {
        try {
            $conn->exec($query);
            echo "Executed: $query\n";
        } catch (Exception $e) {
            // Table doesn't exist, continue
        }
    }
    
    echo "Old tables removed.\n";
    
    // Now create tables with tbl_ prefix using the DatabaseSetup class
    $setup = new DatabaseSetup($conn);
    $setup->createTables();
    
    echo "New tables created with tbl_ prefix.\n";
    
    // Create default admin user
    $setup->createDefaultAdmin();
    
    echo "Default admin user created.\n";
    
    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Database migration completed successfully!'
    ]);
    
} catch (Exception $e) {
    $conn->rollBack();
    echo json_encode([
        'success' => false,
        'message' => 'Migration failed: ' . $e->getMessage()
    ]);
    http_response_code(500);
}
?>
