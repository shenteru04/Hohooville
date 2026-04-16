<?php
/**
 * Qualifications and NC Levels Helper
 * Utility functions for working with normalized qualification and NC level structure
 */

class QualificationsHelper {
    
    /**
     * Get all active qualifications with their NC level information
     * @param PDO $conn Database connection
     * @return array Array of qualifications with NC level details
     */
    public static function getActiveQualificationsWithNC($conn) {
        try {
            $stmt = $conn->prepare("
                SELECT 
                    q.qualification_id,
                    q.qualification_name,
                    q.ctpr_number,
                    q.duration,
                    q.training_cost,
                    q.nc_level_id,
                    nc.nc_level_id,
                    nc.nc_level_code,
                    nc.nc_level_name,
                    q.status,
                    CONCAT(q.qualification_name, ' ', COALESCE(nc.nc_level_code, '')) AS full_name
                FROM tbl_qualifications q
                LEFT JOIN tbl_nc_levels nc ON q.nc_level_id = nc.nc_level_id
                WHERE q.status = 'active'
                ORDER BY q.qualification_name ASC
            ");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error in getActiveQualificationsWithNC: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get all NC levels for dropdown selection
     * @param PDO $conn Database connection
     * @return array Array of NC levels
     */
    public static function getAllNCLevels($conn) {
        try {
            $stmt = $conn->prepare("
                SELECT 
                    nc_level_id,
                    nc_level_code,
                    nc_level_name,
                    status
                FROM tbl_nc_levels
                WHERE status = 'active'
                ORDER BY nc_level_code ASC
            ");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error in getAllNCLevels: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get NC level by ID
     * @param PDO $conn Database connection
     * @param int $ncLevelId NC Level ID
     * @return array|false NC level details or false if not found
     */
    public static function getNCLevelById($conn, $ncLevelId) {
        try {
            $stmt = $conn->prepare("
                SELECT *
                FROM tbl_nc_levels
                WHERE nc_level_id = ?
            ");
            $stmt->execute([$ncLevelId]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error in getNCLevelById: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get NC level by code (e.g., 'NC II')
     * @param PDO $conn Database connection
     * @param string $ncLevelCode NC Level code
     * @return array|false NC level details or false if not found
     */
    public static function getNCLevelByCode($conn, $ncLevelCode) {
        try {
            $stmt = $conn->prepare("
                SELECT *
                FROM tbl_nc_levels
                WHERE nc_level_code = ?
            ");
            $stmt->execute([$ncLevelCode]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error in getNCLevelByCode: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get qualification with NC level details
     * @param PDO $conn Database connection
     * @param int $qualificationId Qualification ID
     * @return array|false Qualification with NC level details or false if not found
     */
    public static function getQualificationWithNC($conn, $qualificationId) {
        try {
            $stmt = $conn->prepare("
                SELECT 
                    q.qualification_id,
                    q.qualification_name,
                    q.ctpr_number,
                    q.duration,
                    q.training_cost,
                    q.description,
                    q.nc_level_id,
                    nc.nc_level_code,
                    nc.nc_level_name,
                    q.status,
                    q.is_archived
                FROM tbl_qualifications q
                LEFT JOIN tbl_nc_levels nc ON q.nc_level_id = nc.nc_level_id
                WHERE q.qualification_id = ?
            ");
            $stmt->execute([$qualificationId]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error in getQualificationWithNC: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get trainer qualifications with NC level details
     * @param PDO $conn Database connection
     * @param int $trainerId Trainer ID
     * @return array Array of trainer qualifications with NC level details
     */
    public static function getTrainerQualificationsWithNC($conn, $trainerId) {
        try {
            $stmt = $conn->prepare("
                SELECT 
                    tq.trainer_qualification_id,
                    tq.trainer_id,
                    tq.qualification_id,
                    q.qualification_name,
                    tq.nc_level_id,
                    nc.nc_level_code,
                    nc.nc_level_name,
                    tq.nc_file,
                    tq.experience_file,
                    tq.created_at,
                    CONCAT(q.qualification_name, ' ', COALESCE(nc.nc_level_code, '')) AS full_qualification_name
                FROM tbl_trainer_qualifications tq
                LEFT JOIN tbl_qualifications q ON tq.qualification_id = q.qualification_id
                LEFT JOIN tbl_nc_levels nc ON tq.nc_level_id = nc.nc_level_id
                WHERE tq.trainer_id = ?
                ORDER BY q.qualification_name ASC
            ");
            $stmt->execute([$trainerId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error in getTrainerQualificationsWithNC: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get trainer primary NC level information
     * @param PDO $conn Database connection
     * @param int $trainerId Trainer ID
     * @return array|false Trainer's primary NC level or false if not found
     */
    public static function getTrainerPrimaryNCLevel($conn, $trainerId) {
        try {
            $stmt = $conn->prepare("
                SELECT 
                    t.trainer_nc_level_id,
                    nc.nc_level_code,
                    nc.nc_level_name
                FROM tbl_trainer t
                LEFT JOIN tbl_nc_levels nc ON t.trainer_nc_level_id = nc.nc_level_id
                WHERE t.trainer_id = ?
            ");
            $stmt->execute([$trainerId]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error in getTrainerPrimaryNCLevel: " . $e->getMessage());
            return false;
        }
    }
}
?>
