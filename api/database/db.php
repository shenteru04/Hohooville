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
            echo json_encode([
                'success' => false,
                'message' => 'Connection Error: ' . $e->getMessage()
            ]);
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
            "CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'trainer', 'trainee') NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                phone VARCHAR(20),
                status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                INDEX idx_role (role),
                INDEX idx_status (status)
            )",

            // Qualifications table
            "CREATE TABLE IF NOT EXISTS qualifications (
                qualification_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                ctpr_number VARCHAR(100) UNIQUE,
                nominal_duration INT NOT NULL,
                training_cost DECIMAL(10,2),
                allowance DECIMAL(10,2),
                description TEXT,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status)
            )",

            // Batches table
            "CREATE TABLE IF NOT EXISTS batches (
                batch_id INT AUTO_INCREMENT PRIMARY KEY,
                batch_code VARCHAR(50) UNIQUE NOT NULL,
                qualification_id INT,
                trainer_id INT,
                start_date DATE,
                end_date DATE,
                max_trainees INT DEFAULT 30,
                status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (qualification_id) REFERENCES qualifications(qualification_id) ON DELETE CASCADE,
                FOREIGN KEY (trainer_id) REFERENCES users(user_id) ON DELETE SET NULL,
                INDEX idx_status (status)
            )",

            // Trainees table
            "CREATE TABLE IF NOT EXISTS trainees (
                trainee_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE,
                student_number VARCHAR(50) UNIQUE,
                date_of_birth DATE,
                gender ENUM('male', 'female', 'other'),
                address TEXT,
                emergency_contact VARCHAR(100),
                emergency_phone VARCHAR(20),
                enrollment_status ENUM('pending', 'approved', 'incomplete', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                INDEX idx_enrollment_status (enrollment_status)
            )",

            // Enrollments table
            "CREATE TABLE IF NOT EXISTS enrollments (
                enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
                trainee_id INT,
                batch_id INT,
                qualification_id INT,
                enrollment_date DATE,
                ctpr_number VARCHAR(100),
                scholarship_type ENUM('none', 'TWSP', 'TTSP', 'STEP', 'PESFA') DEFAULT 'none',
                tuition_fee DECIMAL(10,2),
                scholarship_amount DECIMAL(10,2) DEFAULT 0,
                balance DECIMAL(10,2),
                status ENUM('enrolled', 'completed', 'dropped', 'transferred') DEFAULT 'enrolled',
                completion_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trainee_id) REFERENCES trainees(trainee_id) ON DELETE CASCADE,
                FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
                FOREIGN KEY (qualification_id) REFERENCES qualifications(qualification_id) ON DELETE CASCADE,
                INDEX idx_status (status)
            )",

            // Attendance table
            "CREATE TABLE IF NOT EXISTS attendance (
                attendance_id INT AUTO_INCREMENT PRIMARY KEY,
                enrollment_id INT,
                batch_id INT,
                training_day INT NOT NULL,
                attendance_date DATE NOT NULL,
                status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'present',
                remarks TEXT,
                recorded_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
                FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
                FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE SET NULL,
                UNIQUE KEY unique_attendance (enrollment_id, training_day),
                INDEX idx_date (attendance_date)
            )",

            // Grades table
            "CREATE TABLE IF NOT EXISTS grades (
                grade_id INT AUTO_INCREMENT PRIMARY KEY,
                enrollment_id INT,
                pre_test_score DECIMAL(5,2),
                post_test_score DECIMAL(5,2),
                basic_uoc_score DECIMAL(5,2),
                common_uoc_score DECIMAL(5,2),
                core_uoc_score DECIMAL(5,2),
                final_result ENUM('Competent', 'Not Yet Competent') NULL,
                remarks TEXT,
                graded_by INT,
                approved_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
                FOREIGN KEY (graded_by) REFERENCES users(user_id) ON DELETE SET NULL,
                FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
                UNIQUE KEY unique_enrollment_grade (enrollment_id)
            )",

            // Daily Lesson Scores table
            "CREATE TABLE IF NOT EXISTS daily_lesson_scores (
                lesson_score_id INT AUTO_INCREMENT PRIMARY KEY,
                enrollment_id INT,
                training_day INT NOT NULL,
                score DECIMAL(5,2),
                topic VARCHAR(200),
                remarks TEXT,
                recorded_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
                FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE SET NULL,
                UNIQUE KEY unique_daily_score (enrollment_id, training_day)
            )",

            // Modules table
            "CREATE TABLE IF NOT EXISTS modules (
                module_id INT AUTO_INCREMENT PRIMARY KEY,
                batch_id INT,
                training_day INT NOT NULL,
                module_title VARCHAR(200),
                description TEXT,
                file_path VARCHAR(255),
                uploaded_by INT,
                status ENUM('pending', 'completed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
                FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE SET NULL,
                INDEX idx_training_day (training_day)
            )",

            // Payments table
            "CREATE TABLE IF NOT EXISTS payments (
                payment_id INT AUTO_INCREMENT PRIMARY KEY,
                enrollment_id INT,
                amount DECIMAL(10,2) NOT NULL,
                payment_type ENUM('tuition', 'allowance', 'scholarship', 'refund') NOT NULL,
                payment_method ENUM('cash', 'bank', 'online', 'scholarship') DEFAULT 'cash',
                reference_number VARCHAR(100),
                payment_date DATE NOT NULL,
                verified_by INT NULL,
                status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
                FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL,
                INDEX idx_payment_date (payment_date)
            )",

            // Documents table
            "CREATE TABLE IF NOT EXISTS documents (
                document_id INT AUTO_INCREMENT PRIMARY KEY,
                trainee_id INT,
                document_type VARCHAR(100),
                file_name VARCHAR(255),
                file_path VARCHAR(255),
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verified BOOLEAN DEFAULT FALSE,
                verified_by INT NULL,
                FOREIGN KEY (trainee_id) REFERENCES trainees(trainee_id) ON DELETE CASCADE,
                FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL
            )",

            // Certificates table
            "CREATE TABLE IF NOT EXISTS certificates (
                certificate_id INT AUTO_INCREMENT PRIMARY KEY,
                enrollment_id INT,
                certificate_type ENUM('enrollment', 'completion', 'competency', 'diploma') NOT NULL,
                certificate_number VARCHAR(100) UNIQUE,
                issue_date DATE,
                file_path VARCHAR(255),
                status ENUM('pending', 'issued', 'revoked') DEFAULT 'pending',
                issued_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
                FOREIGN KEY (issued_by) REFERENCES users(user_id) ON DELETE SET NULL
            )",

            // Announcements table
            "CREATE TABLE IF NOT EXISTS announcements (
                announcement_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                content TEXT NOT NULL,
                target_role ENUM('all', 'admin', 'trainer', 'trainee') DEFAULT 'all',
                batch_id INT NULL,
                posted_by INT,
                status ENUM('active', 'archived') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
                FOREIGN KEY (posted_by) REFERENCES users(user_id) ON DELETE SET NULL
            )",

            // Activity Logs table
            "CREATE TABLE IF NOT EXISTS activity_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                action VARCHAR(100),
                table_name VARCHAR(50),
                record_id INT,
                details TEXT,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
                INDEX idx_user (user_id),
                INDEX idx_created_at (created_at)
            )"
        ];

        foreach ($queries as $query) {
            try {
                $this->conn->exec($query);
            } catch(PDOException $e) {
                echo "Error creating table: " . $e->getMessage() . "\n";
            }
        }

        return true;
    }

    public function createDefaultAdmin() {
        $query = "INSERT IGNORE INTO users (username, email, password, role, first_name, last_name, status) 
                  VALUES (:username, :email, :password, 'admin', 'System', 'Administrator', 'active')";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':username', 'admin');
        $stmt->bindValue(':email', 'admin@hohooville.edu');
        $stmt->bindValue(':password', password_hash('Admin@123', PASSWORD_BCRYPT));
        
        return $stmt->execute();
    }
}
?>