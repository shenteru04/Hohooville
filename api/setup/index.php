<?php
// Check if migration parameter is provided
if (isset($_GET['action']) && $_GET['action'] === 'migrate') {
    header('Content-Type: application/json');
    require_once '../database/db.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    try {
        // Drop old tables if they exist
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
            try { $conn->exec($query); } catch (Exception $e) {}
        }
        
        // Create new tables with tbl_ prefix
        $setup = new DatabaseSetup($conn);
        $setup->createTables();
        $setup->createDefaultAdmin();
        
        echo json_encode([
            'success' => true,
            'message' => 'Database successfully migrated to use tbl_ prefixed tables!'
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Migration failed: ' . $e->getMessage()
        ]);
    }
} else {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>System Setup</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 600px; }
            button { padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #1d4ed8; }
            .info { background: #f0f9ff; border-left: 4px solid #2563eb; padding: 10px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>System Database Setup</h1>
            <div class="info">
                <strong>⚠️ WARNING:</strong> This will drop existing tables and create new ones with the correct tbl_ prefix naming convention.
            </div>
            <p>Click the button below to initialize/reset the database:</p>
            <button onclick="runMigration()">Initialize Database</button>
            <div id="result"></div>
        </div>
        
        <script>
            async function runMigration() {
                try {
                    const response = await fetch('?action=migrate');
                    const data = await response.json();
                    document.getElementById('result').innerHTML = `
                        <div style="margin-top: 20px; padding: 10px; border-radius: 5px; background: ${data.success ? '#ecfdf5' : '#fef2f2'}; color: ${data.success ? '#065f46' : '#7f1d1d'};">
                            <strong>${data.success ? '✓ Success' : '✗ Error'}:</strong> ${data.message}
                        </div>
                    `;
                } catch (e) {
                    document.getElementById('result').innerHTML = `<div style="margin-top: 20px; padding: 10px; border-radius: 5px; background: #fef2f2; color: #7f1d1d;"><strong>✗ Error:</strong> ${e.message}</div>`;
                }
            }
        </script>
    </body>
    </html>
    <?php
}
?>
