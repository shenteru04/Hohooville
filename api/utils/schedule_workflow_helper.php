<?php
/**
 * Schedule Workflow Helper - Simplified for Schedule Presets Only
 * 
 * NOTE: Schedule Request feature has been removed as of 2026-08-16.
 * This file now only manages schedule presets that can be used for batch scheduling.
 * 
 * Trainer scheduling and availability is now determined by the trainer_type column 
 * in tbl_trainer (part-time or full-time).
 */

require_once __DIR__ . '/trainer_assignment_helper.php';

if (!function_exists('sw_ensure_schema')) {
    function sw_ensure_schema(PDO $conn): void
    {
        static $ensured = false;
        if ($ensured) {
            return;
        }

        try {
            $conn->exec("CREATE TABLE IF NOT EXISTS `tbl_schedule_presets` (
                `preset_id` INT AUTO_INCREMENT PRIMARY KEY,
                `preset_name` VARCHAR(255) NOT NULL,
                `schedule` VARCHAR(255) NOT NULL,
                `created_by_user_id` INT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `uniq_schedule` (`schedule`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");

            sw_ensure_schedule_presets($conn);
        } catch (Exception $e) {
            error_log('Unable to ensure tbl_schedule_presets exists: ' . $e->getMessage());
        }

        $ensured = true;
    }
}

if (!function_exists('sw_ensure_schedule_presets')) {
    function sw_ensure_schedule_presets(PDO $conn): void
    {
        if (!ta_table_exists($conn, 'tbl_schedule_presets')) {
            return;
        }

        $stmt = $conn->prepare('SELECT COUNT(*) FROM tbl_schedule_presets');
        $stmt->execute();
        $count = (int)$stmt->fetchColumn();
        if ($count > 0) {
            return;
        }

        return;
    }
}

if (!function_exists('sw_fetch_schedule_presets')) {
    function sw_fetch_schedule_presets(PDO $conn): array
    {
        sw_ensure_schema($conn);

        $stmt = $conn->prepare('SELECT preset_id, preset_name, schedule FROM tbl_schedule_presets ORDER BY preset_name ASC, preset_id ASC');
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map(function ($row) {
            return [
                'preset_id' => (int)($row['preset_id'] ?? 0),
                'preset_name' => trim((string)($row['preset_name'] ?? '')),
                'schedule' => trim((string)($row['schedule'] ?? ''))
            ];
        }, $rows);
    }
}

if (!function_exists('sw_normalize_scope_type')) {
    function sw_normalize_scope_type(string $scopeType, ?int $moduleId, string $assignmentMode): string
    {
        $type = strtolower(trim($scopeType));
        
        if ($type === 'module' && $moduleId > 0 && $assignmentMode === 'multiple') {
            return 'module';
        }
        if ($type === 'lead_batch' && $assignmentMode === 'multiple') {
            return 'lead_batch';
        }
        
        return 'batch';
    }
}

if (!function_exists('sw_build_scope_label')) {
    function sw_build_scope_label(array $row): string
    {
        $scopeType = $row['scope_type'] ?? 'batch';
        $moduleTitle = trim((string)($row['module_title'] ?? ''));
        $competencyType = trim((string)($row['competency_type'] ?? ''));
        $unitCode = trim((string)($row['unit_code'] ?? ''));
        
        if ($scopeType === 'module' && $moduleTitle) {
            $label = $moduleTitle;
            if ($competencyType) {
                $label .= " ($competencyType)";
            }
            if ($unitCode) {
                $label .= " - $unitCode";
            }
            return $label;
        }
        
        if ($scopeType === 'lead_batch') {
            return 'Full Batch';
        }
        
        return 'Full Batch';
    }
}

if (!function_exists('sw_build_scope_key')) {
    function sw_build_scope_key(int $batchId, string $scopeType, ?int $moduleId = null): string
    {
        if ($scopeType === 'module' && $moduleId > 0) {
            return "batch_{$batchId}_module_{$moduleId}";
        }
        return "batch_{$batchId}";
    }
}
