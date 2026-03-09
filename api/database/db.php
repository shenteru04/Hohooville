<?php
class Database {
    private $host = "localhost";
    private $db_name = "technical_db";
    private $username = "root";
    private $password = "";
    private $conn;

    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Connection Error: ' . $e->getMessage()
            ]);
            exit;
        }
        
        return $this->conn;
    }

    public function closeConnection() {
        $this->conn = null;
    }
}

// Database Schema Creation
class DatabaseSetup {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function createTables() {
        $queries = [
            // Users table
            "CREATE TABLE IF NOT EXISTS tbl_users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role_id INT DEFAULT NULL,
                role ENUM('admin', 'trainer', 'trainee') DEFAULT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                phone VARCHAR(20),
                status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
                is_archived TINYINT DEFAULT 0,
                archived_at TIMESTAMP NULL,
                date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                INDEX idx_role (role),
                INDEX idx_status (status)
            )",

            // Roles table
            "CREATE TABLE IF NOT EXISTS tbl_role (
                role_id INT AUTO_INCREMENT PRIMARY KEY,
                role_name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )",

            // NC Levels reference table
            "CREATE TABLE IF NOT EXISTS tbl_nc_levels (
                nc_level_id INT AUTO_INCREMENT PRIMARY KEY,
                nc_level_code VARCHAR(20) NOT NULL UNIQUE,
                nc_level_name VARCHAR(100) NOT NULL,
                description TEXT,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )",

            // Qualifications table
            "CREATE TABLE IF NOT EXISTS tbl_qualifications (
                qualification_id INT AUTO_INCREMENT PRIMARY KEY,
                qualification_name VARCHAR(200) NOT NULL,
                nc_level_id INT,
                title VARCHAR(200),
                ctpr_number VARCHAR(100) UNIQUE,
                duration INT,
                nominal_duration INT,
                training_cost DECIMAL(10,2),
                allowance DECIMAL(10,2),
                description TEXT,
                status ENUM('active', 'inactive') DEFAULT 'active',
                is_archived INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_nc_level (nc_level_id),
                FOREIGN KEY (nc_level_id) REFERENCES tbl_nc_levels(nc_level_id) ON DELETE SET NULL
            )",

            // Batches table
            "CREATE TABLE IF NOT EXISTS tbl_batch (
                batch_id INT AUTO_INCREMENT PRIMARY KEY,
                batch_name VARCHAR(100),
                batch_code VARCHAR(50) UNIQUE NOT NULL,
                qualification_id INT,
                trainer_id INT,
                start_date DATE,
                end_date DATE,
                max_trainees INT DEFAULT 30,
                status ENUM('open', 'closed', 'upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'open',
                scholarship_type VARCHAR(50),
                scholarship_type_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (qualification_id) REFERENCES tbl_qualifications(qualification_id) ON DELETE CASCADE,
                FOREIGN KEY (trainer_id) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
                INDEX idx_status (status)
            )",

            // Trainers table
            "CREATE TABLE IF NOT EXISTS tbl_trainer (
                trainer_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                email VARCHAR(150),
                phone_number VARCHAR(20),
                qualification_id INT,
                trainer_nc_level_id INT,
                address VARCHAR(255),
                nttc_no VARCHAR(100),
                nttc_file VARCHAR(255),
                tm_file VARCHAR(255),
                nc_file VARCHAR(255),
                experience_file VARCHAR(255),
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES tbl_users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (qualification_id) REFERENCES tbl_qualifications(qualification_id) ON DELETE SET NULL,
                FOREIGN KEY (trainer_nc_level_id) REFERENCES tbl_nc_levels(nc_level_id) ON DELETE SET NULL
            )",

            // Trainer Qualifications junction table
            "CREATE TABLE IF NOT EXISTS tbl_trainer_qualifications (
                trainer_qualification_id INT AUTO_INCREMENT PRIMARY KEY,
                trainer_id INT,
                qualification_id INT,
                nc_level_id INT,
                nc_file VARCHAR(255),
                experience_file VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trainer_id) REFERENCES tbl_trainer(trainer_id) ON DELETE CASCADE,
                FOREIGN KEY (qualification_id) REFERENCES tbl_qualifications(qualification_id) ON DELETE CASCADE,
                FOREIGN KEY (nc_level_id) REFERENCES tbl_nc_levels(nc_level_id) ON DELETE SET NULL,
                UNIQUE KEY unique_trainer_qual (trainer_id, qualification_id)
            )",

            // Trainees header table
            "CREATE TABLE IF NOT EXISTS tbl_trainee_hdr (
                trainee_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE,
                trainee_school_id VARCHAR(50),
                student_number VARCHAR(50) UNIQUE,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                email VARCHAR(150),
                phone_number VARCHAR(20),
                birth_certificate_no VARCHAR(50),
                address TEXT,
                valid_id_file VARCHAR(255),
                birth_cert_file VARCHAR(255),
                photo_file VARCHAR(255),
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES tbl_users(user_id) ON DELETE CASCADE
            )",

            // Trainee Details table
            "CREATE TABLE IF NOT EXISTS tbl_trainee_dtl (
                trainee_dtl_id INT AUTO_INCREMENT PRIMARY KEY,
                trainee_id INT,
                detail_key VARCHAR(100),
                detail_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trainee_id) REFERENCES tbl_trainee_hdr(trainee_id) ON DELETE CASCADE
            )",

            // Trainee Father/Guardian table
            "CREATE TABLE IF NOT EXISTS tbl_trainee_ftr (
                trainee_ftr_id INT AUTO_INCREMENT PRIMARY KEY,
                trainee_id INT,
                parent_name VARCHAR(100),
                parent_contact VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trainee_id) REFERENCES tbl_trainee_hdr(trainee_id) ON DELETE CASCADE
            )",

            // Offered Qualifications junction table
            "CREATE TABLE IF NOT EXISTS tbl_offered_qualifications (
                offered_qualification_id INT AUTO_INCREMENT PRIMARY KEY,
                qualification_id INT,
                FOREIGN KEY (qualification_id) REFERENCES tbl_qualifications(qualification_id) ON DELETE CASCADE
            )",

            // Enrollments table
            "CREATE TABLE IF NOT EXISTS tbl_enrollment (
                enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
                trainee_id INT,
                batch_id INT,
                offered_qualification_id INT,
                qualification_id INT,
                enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                ctpr_number VARCHAR(100),
                scholarship_type VARCHAR(50),
                tuition_fee DECIMAL(10,2),
                scholarship_amount DECIMAL(10,2) DEFAULT 0,
                balance DECIMAL(10,2),
                status ENUM('pending', 'approved', 'enrolled', 'completed', 'dropped', 'transferred') DEFAULT 'pending',
                completion_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trainee_id) REFERENCES tbl_trainee_hdr(trainee_id) ON DELETE CASCADE,
                FOREIGN KEY (batch_id) REFERENCES tbl_batch(batch_id) ON DELETE CASCADE,
                FOREIGN KEY (offered_qualification_id) REFERENCES tbl_offered_qualifications(offered_qualification_id) ON DELETE CASCADE,
                FOREIGN KEY (qualification_id) REFERENCES tbl_qualifications(qualification_id) ON DELETE CASCADE,
                INDEX idx_status (status)
            )",

            // Enrolled Trainee junction table
            "CREATE TABLE IF NOT EXISTS tbl_enrolled_trainee (
                enrolled_id INT AUTO_INCREMENT PRIMARY KEY,
                enrollment_id INT,
                trainee_id INT,
                FOREIGN KEY (enrollment_id) REFERENCES tbl_enrollment(enrollment_id) ON DELETE CASCADE,
                FOREIGN KEY (trainee_id) REFERENCES tbl_trainee_hdr(trainee_id) ON DELETE CASCADE
            )",

            // Scholarships table
            "CREATE TABLE IF NOT EXISTS tbl_scholarship (
                scholarship_id INT AUTO_INCREMENT PRIMARY KEY,
                trainee_id INT,
                scholarship_name VARCHAR(100),
                date_granted DATE,
                FOREIGN KEY (trainee_id) REFERENCES tbl_trainee_hdr(trainee_id) ON DELETE CASCADE
            )",

            // Attendance table
            "CREATE TABLE IF NOT EXISTS tbl_attendance (
                attendance_id INT AUTO_INCREMENT PRIMARY KEY,
                trainee_id INT,
                batch_id INT,
                training_day INT,
                date_recorded DATE NOT NULL,
                status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'present',
                remarks TEXT,
                recorded_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trainee_id) REFERENCES tbl_trainee_hdr(trainee_id) ON DELETE CASCADE,
                FOREIGN KEY (batch_id) REFERENCES tbl_batch(batch_id) ON DELETE CASCADE,
                FOREIGN KEY (recorded_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
                INDEX idx_date (date_recorded)
            )",

            // Grades table
            "CREATE TABLE IF NOT EXISTS tbl_grades (
                grade_id INT AUTO_INCREMENT PRIMARY KEY,
                trainee_id INT,
                qualification_id INT,
                enrollment_id INT,
                score DECIMAL(5,2),
                pre_test_score DECIMAL(5,2),
                post_test_score DECIMAL(5,2),
                basic_uoc_score DECIMAL(5,2),
                common_uoc_score DECIMAL(5,2),
                core_uoc_score DECIMAL(5,2),
                final_result ENUM('Competent', 'Not Yet Competent') NULL,
                remarks TEXT,
                graded_by INT,
                approved_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (trainee_id) REFERENCES tbl_trainee_hdr(trainee_id) ON DELETE CASCADE,
                FOREIGN KEY (qualification_id) REFERENCES tbl_qualifications(qualification_id) ON DELETE CASCADE,
                FOREIGN KEY (enrollment_id) REFERENCES tbl_enrollment(enrollment_id) ON DELETE CASCADE,
                FOREIGN KEY (graded_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
                FOREIGN KEY (approved_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL
            )",

            // Daily Lesson Scores table
            "CREATE TABLE IF NOT EXISTS tbl_lesson_scores (
                lesson_score_id INT AUTO_INCREMENT PRIMARY KEY,
                enrollment_id INT,
                training_day INT NOT NULL,
                score DECIMAL(5,2),
                topic VARCHAR(200),
                remarks TEXT,
                recorded_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES tbl_enrollment(enrollment_id) ON DELETE CASCADE,
                FOREIGN KEY (recorded_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL
            )",

            // Modules table
            "CREATE TABLE IF NOT EXISTS tbl_module (
                module_id INT AUTO_INCREMENT PRIMARY KEY,
                batch_id INT,
                training_day INT NOT NULL,
                module_title VARCHAR(200),
                description TEXT,
                file_path VARCHAR(255),
                uploaded_by INT,
                status ENUM('pending', 'completed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (batch_id) REFERENCES tbl_batch(batch_id) ON DELETE CASCADE,
                FOREIGN KEY (uploaded_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
                INDEX idx_training_day (training_day)
            )",

            // Lessons table
            "CREATE TABLE IF NOT EXISTS tbl_lessons (
                lesson_id INT AUTO_INCREMENT PRIMARY KEY,
                module_id INT,
                lesson_title VARCHAR(200),
                duration INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (module_id) REFERENCES tbl_module(module_id) ON DELETE CASCADE
            )",

            // Payments table
            "CREATE TABLE IF NOT EXISTS tbl_payments (
                payment_id INT AUTO_INCREMENT PRIMARY KEY,
                enrollment_id INT,
                amount DECIMAL(10,2) NOT NULL,
                payment_type ENUM('tuition', 'allowance', 'scholarship', 'refund') DEFAULT 'tuition',
                payment_method ENUM('cash', 'bank', 'online', 'scholarship') DEFAULT 'cash',
                reference_number VARCHAR(100),
                payment_date DATE NOT NULL,
                verified_by INT,
                status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES tbl_enrollment(enrollment_id) ON DELETE CASCADE,
                FOREIGN KEY (verified_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
                INDEX idx_payment_date (payment_date)
            )",

            // Documents table
            "CREATE TABLE IF NOT EXISTS tbl_documents (
                document_id INT AUTO_INCREMENT PRIMARY KEY,
                trainee_id INT,
                document_type VARCHAR(100),
                file_name VARCHAR(255),
                file_path VARCHAR(255),
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verified BOOLEAN DEFAULT FALSE,
                verified_by INT,
                FOREIGN KEY (trainee_id) REFERENCES tbl_trainee_hdr(trainee_id) ON DELETE CASCADE,
                FOREIGN KEY (verified_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL
            )",

            // Certificates table
            "CREATE TABLE IF NOT EXISTS tbl_certificates (
                certificate_id INT AUTO_INCREMENT PRIMARY KEY,
                trainee_id INT,
                qualification_id INT,
                enrollment_id INT,
                certificate_type ENUM('enrollment', 'completion', 'competency', 'diploma') DEFAULT 'completion',
                certificate_number VARCHAR(100) UNIQUE,
                issue_date DATE,
                file_path VARCHAR(255),
                status ENUM('pending', 'issued', 'revoked') DEFAULT 'pending',
                issued_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trainee_id) REFERENCES tbl_trainee_hdr(trainee_id) ON DELETE CASCADE,
                FOREIGN KEY (qualification_id) REFERENCES tbl_qualifications(qualification_id) ON DELETE CASCADE,
                FOREIGN KEY (enrollment_id) REFERENCES tbl_enrollment(enrollment_id) ON DELETE CASCADE,
                FOREIGN KEY (issued_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL
            )",

            // Announcements table
            "CREATE TABLE IF NOT EXISTS tbl_announcements (
                announcement_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                content TEXT NOT NULL,
                target_role ENUM('all', 'admin', 'trainer', 'trainee') DEFAULT 'all',
                batch_id INT,
                posted_by INT,
                status ENUM('active', 'archived') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (batch_id) REFERENCES tbl_batch(batch_id) ON DELETE CASCADE,
                FOREIGN KEY (posted_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL
            )",

            // Notifications table
            "CREATE TABLE IF NOT EXISTS tbl_notifications (
                notification_id INT AUTO_INCREMENT PRIMARY KEY,
                target_role VARCHAR(50),
                target_user_id INT,
                user_id INT,
                actor_id INT,
                title VARCHAR(200),
                message TEXT NOT NULL,
                link VARCHAR(255),
                is_read TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (actor_id) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
                FOREIGN KEY (target_user_id) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
                INDEX idx_target_role (target_role),
                INDEX idx_target_user (target_user_id),
                INDEX idx_is_read (is_read)
            )",

            // Activity Logs table
            "CREATE TABLE IF NOT EXISTS tbl_activity_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                action VARCHAR(100),
                table_name VARCHAR(50),
                record_id INT,
                details TEXT,
                ip_address VARCHAR(45),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
                INDEX idx_user (user_id),
                INDEX idx_created_at (created_at)
            )",

            // System Settings table
            "CREATE TABLE IF NOT EXISTS tbl_system_settings (
                setting_id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )"
        ];

        // Execute CREATE TABLE queries
        foreach ($queries as $query) {
            try {
                $this->conn->exec($query);
            } catch(PDOException $e) {
                error_log("Error creating table: " . $e->getMessage());
            }
        }

        // Initialize NC Levels (run after tables are created)
        $initQueries = [
            "INSERT IGNORE INTO tbl_nc_levels (nc_level_code, nc_level_name, description, status) VALUES 
                ('NC I', 'National Certificate I', 'Entry-level national certification', 'active'),
                ('NC II', 'National Certificate II', 'Intermediate-level national certification', 'active'),
                ('NC III', 'National Certificate III', 'Advanced-level national certification', 'active'),
                ('NC IV', 'National Certificate IV', 'Highest-level national certification', 'active')"
        ];

        foreach ($initQueries as $query) {
            try {
                $this->conn->exec($query);
            } catch(PDOException $e) {
                error_log("Error initializing data: " . $e->getMessage());
            }
        }

        return true;
    }

    public function createDefaultAdmin() {
        $query = "INSERT IGNORE INTO tbl_users (username, email, password, role, first_name, last_name, status) 
                  VALUES (:username, :email, :password, 'admin', 'System', 'Administrator', 'active')";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':username', 'admin');
        $stmt->bindValue(':email', 'admin@hohooville.edu');
        $stmt->bindValue(':password', password_hash('Admin@123', PASSWORD_BCRYPT));
        
        return $stmt->execute();
    }
}
?>
