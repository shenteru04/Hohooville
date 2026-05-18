<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../database/db.php';

class TraineeProfile {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';

        switch ($action) {
            case 'get':
                $this->getProfile();
                break;
            case 'update':
                $this->updateProfile();
                break;
            case 'change-password':
                $this->changePassword();
                break;
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid action']);
        }
    }

    private function resolveTraineeId(?array $data = null): ?int {
        $data = $data ?? [];

        $traineeId = $data['trainee_id'] ?? $_GET['trainee_id'] ?? null;
        if (!empty($traineeId)) {
            return (int)$traineeId;
        }

        $userId = $data['user_id'] ?? $_GET['user_id'] ?? $_GET['id'] ?? null;
        if (empty($userId)) {
            return null;
        }

        $stmt = $this->conn->prepare("SELECT trainee_id FROM tbl_trainee_hdr WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $resolvedTraineeId = $stmt->fetchColumn();

        return $resolvedTraineeId ? (int)$resolvedTraineeId : null;
    }

    private function buildAddress(array $profile): string {
        $parts = array_filter([
            $profile['house_no_street'] ?? null,
            $profile['barangay'] ?? null,
            $profile['city_municipality'] ?? null,
            $profile['province'] ?? null,
        ], static function ($part) {
            return $part !== null && trim((string)$part) !== '';
        });

        if (!empty($parts)) {
            return implode(', ', $parts);
        }

        return $profile['header_address'] ?? '';
    }

    private function buildPhotoUrl(array $profile): ?string {
        if (!empty($profile['profile_image'])) {
            return '/Hohoo-ville/uploads/profile_images/' . rawurlencode($profile['profile_image']);
        }

        if (!empty($profile['photo_file'])) {
            return '/Hohoo-ville/uploads/trainees/' . rawurlencode($profile['photo_file']);
        }

        return null;
    }

    private function getProfile() {
        $traineeId = $this->resolveTraineeId();
        if (!$traineeId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Trainee ID required']);
            return;
        }

        try {
            $query = "SELECT
                        th.trainee_id,
                        th.user_id,
                        th.trainee_school_id,
                        th.first_name,
                        th.middle_name,
                        th.last_name,
                        th.extension_name,
                        th.sex,
                        th.email,
                        th.facebook_account,
                        th.phone_number,
                        th.address AS header_address,
                        th.status,
                        th.photo_file,
                        COALESCE(th.profile_image, '') AS profile_image,
                        td.civil_status,
                        td.birthdate,
                        td.age,
                        td.birthplace_city,
                        td.birthplace_province,
                        td.nationality,
                        td.house_no_street,
                        td.barangay,
                        td.city_municipality,
                        td.province,
                        tf.educational_attainment,
                        tf.employment_status,
                        u.username,
                        b.batch_name,
                        q.qualification_name AS course_name,
                        COALESCE(NULLIF(st.scholarship_name, ''), NULLIF(e.scholarship_type, ''), NULLIF(b.scholarship_type, ''), 'No Scholarship') AS scholarship_type,
                        e.enrollment_date,
                        DATE_FORMAT(e.enrollment_date, '%Y-%m-%d %H:%i:%s') AS formatted_enrollment_date
                      FROM tbl_trainee_hdr th
                      LEFT JOIN tbl_trainee_dtl td ON th.trainee_id = td.trainee_id
                      LEFT JOIN tbl_trainee_ftr tf ON th.trainee_id = tf.trainee_id
                      JOIN tbl_users u ON th.user_id = u.user_id
                      LEFT JOIN tbl_enrollment e ON e.enrollment_id = (
                          SELECT e2.enrollment_id
                          FROM tbl_enrollment e2
                          WHERE e2.trainee_id = th.trainee_id
                          ORDER BY
                              CASE WHEN COALESCE(e2.is_archived, 0) = 0 THEN 0 ELSE 1 END,
                              CASE
                                  WHEN e2.status = 'approved' THEN 0
                                  WHEN e2.status = 'completed' THEN 1
                                  WHEN e2.status = 'pending' THEN 2
                                  ELSE 3
                              END,
                              COALESCE(e2.enrollment_date, '1970-01-01') DESC,
                              e2.enrollment_id DESC
                          LIMIT 1
                      )
                      LEFT JOIN tbl_batch b ON e.batch_id = b.batch_id
                      LEFT JOIN tbl_offered_qualifications oq ON e.offered_qualification_id = oq.offered_qualification_id
                      LEFT JOIN tbl_qualifications q ON COALESCE(oq.qualification_id, b.qualification_id) = q.qualification_id
                      LEFT JOIN tbl_scholarship_type st ON e.scholarship_type_id = st.scholarship_type_id
                      WHERE th.trainee_id = ?
                      LIMIT 1";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$traineeId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Trainee not found']);
                return;
            }

            $data['address'] = $this->buildAddress($data);
            $data['photo_url'] = $this->buildPhotoUrl($data);

            echo json_encode(['success' => true, 'data' => $data]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function updateProfile() {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $traineeId = $this->resolveTraineeId($data);

        if (!$traineeId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Trainee ID required']);
            return;
        }

        try {
            $updateFields = [];
            $params = [];

            if (array_key_exists('first_name', $data)) {
                $updateFields[] = "first_name = ?";
                $params[] = $data['first_name'];
            }
            if (array_key_exists('last_name', $data)) {
                $updateFields[] = "last_name = ?";
                $params[] = $data['last_name'];
            }
            if (array_key_exists('email', $data)) {
                $updateFields[] = "email = ?";
                $params[] = $data['email'];
            }
            if (array_key_exists('phone_number', $data) || array_key_exists('phone', $data)) {
                $updateFields[] = "phone_number = ?";
                $params[] = $data['phone_number'] ?? $data['phone'];
            }
            if (array_key_exists('facebook_account', $data) || array_key_exists('facebook', $data)) {
                $updateFields[] = "facebook_account = ?";
                $params[] = $data['facebook_account'] ?? $data['facebook'];
            }
            if (array_key_exists('address', $data)) {
                $updateFields[] = "address = ?";
                $params[] = $data['address'];
            }
            if (array_key_exists('profile_image', $data)) {
                $updateFields[] = "profile_image = ?";
                $params[] = $data['profile_image'];
            }

            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No fields to update']);
                return;
            }

            $params[] = $traineeId;
            $query = "UPDATE tbl_trainee_hdr SET " . implode(", ", $updateFields) . " WHERE trainee_id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);

            echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function changePassword() {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? null;

        if (empty($userId)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'User ID required']);
            return;
        }

        try {
            if (empty($data['current_password'])) {
                throw new Exception('Current password required');
            }
            if (empty($data['new_password'])) {
                throw new Exception('New password required');
            }
            if (empty($data['confirm_password'])) {
                throw new Exception('Confirm password required');
            }

            if ($data['new_password'] !== $data['confirm_password']) {
                throw new Exception('New passwords do not match');
            }

            if (strlen($data['new_password']) < 8) {
                throw new Exception('New password must be at least 8 characters');
            }

            $stmtUser = $this->conn->prepare("SELECT password FROM tbl_users WHERE user_id = ?");
            $stmtUser->execute([$userId]);
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                throw new Exception('User not found');
            }

            if (!password_verify($data['current_password'], $user['password'])) {
                throw new Exception('Current password is incorrect');
            }

            $hashedPassword = password_hash($data['new_password'], PASSWORD_DEFAULT);
            $stmtUpdate = $this->conn->prepare("UPDATE tbl_users SET password = ? WHERE user_id = ?");
            $stmtUpdate->execute([$hashedPassword, $userId]);

            echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$database = new Database();
$db = $database->getConnection();
$api = new TraineeProfile($db);
$api->handleRequest();
?>
