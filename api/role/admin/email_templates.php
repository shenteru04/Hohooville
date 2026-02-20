<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

$database = new Database();
$conn = $database->getConnection();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        listTemplates($conn);
        break;
    case 'get':
        getTemplate($conn);
        break;
    case 'update':
        updateTemplate($conn);
        break;
    case 'test':
        testTemplate($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function listTemplates($conn) {
    try {
        // Ensure table exists
        $conn->exec("CREATE TABLE IF NOT EXISTS tbl_email_templates (
            template_id INT AUTO_INCREMENT PRIMARY KEY,
            template_name VARCHAR(255) UNIQUE NOT NULL,
            subject VARCHAR(255) NOT NULL,
            body_html TEXT NOT NULL,
            body_text TEXT,
            variables TEXT COMMENT 'JSON array of available variables',
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )");
        
        // Check if default templates exist
        $stmt = $conn->query("SELECT COUNT(*) FROM tbl_email_templates");
        if ($stmt->fetchColumn() == 0) {
            insertDefaultTemplates($conn);
        }
        
        $stmt = $conn->query("SELECT * FROM tbl_email_templates ORDER BY template_name");
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $templates]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function getTemplate($conn) {
    try {
        $templateId = $_GET['id'] ?? null;
        if (!$templateId) throw new Exception('Template ID required');
        
        $stmt = $conn->prepare("SELECT * FROM tbl_email_templates WHERE template_id = ?");
        $stmt->execute([$templateId]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$template) throw new Exception('Template not found');
        
        $template['variables'] = json_decode($template['variables'], true);
        
        echo json_encode(['success' => true, 'data' => $template]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function updateTemplate($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $templateId = $data['template_id'] ?? null;
        $subject = $data['subject'] ?? null;
        $bodyHtml = $data['body_html'] ?? null;
        $bodyText = $data['body_text'] ?? null;
        $isActive = $data['is_active'] ?? 1;
        
        if (!$templateId || !$subject || !$bodyHtml) {
            throw new Exception('Required fields missing');
        }
        
        $stmt = $conn->prepare("UPDATE tbl_email_templates SET subject = ?, body_html = ?, body_text = ?, is_active = ? WHERE template_id = ?");
        $stmt->execute([$subject, $bodyHtml, $bodyText, $isActive, $templateId]);
        
        echo json_encode(['success' => true, 'message' => 'Template updated successfully']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function testTemplate($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $templateId = $data['template_id'] ?? null;
        $testEmail = $data['test_email'] ?? null;
        $variables = $data['variables'] ?? [];
        
        if (!$templateId || !$testEmail) {
            throw new Exception('Template ID and test email required');
        }
        
        $stmt = $conn->prepare("SELECT subject, body_html FROM tbl_email_templates WHERE template_id = ?");
        $stmt->execute([$templateId]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$template) throw new Exception('Template not found');
        
        // Replace variables in template
        $subject = $template['subject'];
        $body = $template['body_html'];
        
        foreach ($variables as $key => $value) {
            $subject = str_replace("{{$key}}", $value, $subject);
            $body = str_replace("{{$key}}", $value, $body);
        }
        
        // Send test email
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8" . "\r\n";
        
        $result = mail($testEmail, $subject, $body, $headers);
        
        echo json_encode([
            'success' => $result,
            'message' => $result ? 'Test email sent' : 'Failed to send test email'
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function insertDefaultTemplates($conn) {
    $defaults = [
        [
            'name' => 'Trainee Account Created',
            'subject' => 'Your Hohoo-ville Account Credentials',
            'html' => '<h1>Welcome to Hohoo-ville</h1><p>Hello {{trainee_name}},</p><p>Username: {{username}}</p><p>Password: {{password}}</p>',
            'text' => 'Username: {{username}}\nPassword: {{password}}',
            'variables' => ['trainee_name', 'username', 'password']
        ],
        [
            'name' => 'Enrollment Approved',
            'subject' => 'Your Enrollment Has Been Approved',
            'html' => '<p>Hello {{trainee_name}},</p><p>Your enrollment for {{course_name}} has been approved!</p><p>Batch: {{batch_name}}</p>',
            'text' => 'Your enrollment for {{course_name}} has been approved.\nBatch: {{batch_name}}',
            'variables' => ['trainee_name', 'course_name', 'batch_name']
        ],
        [
            'name' => 'Task Sheet Submission',
            'subject' => 'New Task Sheet Submission from {{trainee_name}}',
            'html' => '<p>Task: {{task_name}}</p><p>Submitted on: {{submitted_date}}</p>',
            'text' => 'Task: {{task_name}}\nSubmitted on: {{submitted_date}}',
            'variables' => ['trainee_name', 'task_name', 'submitted_date']
        ],
        [
            'name' => 'Course Completion',
            'subject' => 'Congratulations! Course Completed',
            'html' => '<p>Hello {{trainee_name}},</p><p>You have successfully completed {{course_name}}!</p><p>Score: {{final_score}}</p>',
            'text' => 'You have successfully completed {{course_name}}!\nScore: {{final_score}}',
            'variables' => ['trainee_name', 'course_name', 'final_score']
        ]
    ];
    
    foreach ($defaults as $d) {
        $stmt = $conn->prepare("INSERT FROM tbl_email_templates (template_name, subject, body_html, body_text, variables) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$d['name'], $d['subject'], $d['html'], $d['text'], json_encode($d['variables'])]);
    }
}
?>
