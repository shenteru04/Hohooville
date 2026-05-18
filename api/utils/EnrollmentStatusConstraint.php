<?php

if (!function_exists('normalizeEnrollmentStatusDefinition')) {
    function normalizeEnrollmentStatusDefinition($definition) {
        return strtolower(str_replace(["`", " ", "\r", "\n", "\t"], '', (string) $definition));
    }
}

if (!function_exists('ensureEnrollmentStatusSchema')) {
    function ensureEnrollmentStatusSchema(PDO $conn) {
        static $isChecked = false;

        if ($isChecked) {
            return;
        }

        $isChecked = true;

        $expectedStatuses = ['pending', 'approved', 'rejected', 'completed', 'qualified', 'unqualified', 'reserved'];
        $expectedEnum = "enum('pending','approved','rejected','completed','qualified','unqualified','reserved')";
        $expectedCheckClause = "statusin('pending','approved','rejected','completed','qualified','unqualified','reserved')";

        $columnStmt = $conn->query("SHOW FULL COLUMNS FROM `tbl_enrollment` LIKE 'status'");
        $column = $columnStmt->fetch(PDO::FETCH_ASSOC);

        if (!$column) {
            throw new RuntimeException('Column tbl_enrollment.status was not found.');
        }

        $normalizedType = normalizeEnrollmentStatusDefinition($column['Type'] ?? '');
        if ($normalizedType !== $expectedEnum) {
            $conn->exec("
                ALTER TABLE `tbl_enrollment`
                MODIFY COLUMN `status` ENUM('pending', 'approved', 'rejected', 'completed', 'qualified', 'unqualified', 'reserved')
                NOT NULL DEFAULT 'pending'
            ");
        }

        $constraintStmt = $conn->prepare("
            SELECT CHECK_CLAUSE
            FROM information_schema.CHECK_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE()
              AND CONSTRAINT_NAME = 'chk_enrollment_status'
            LIMIT 1
        ");
        $constraintStmt->execute();
        $checkClause = $constraintStmt->fetchColumn();

        if (normalizeEnrollmentStatusDefinition($checkClause) !== $expectedCheckClause) {
            if ($checkClause !== false) {
                $conn->exec("ALTER TABLE `tbl_enrollment` DROP CONSTRAINT `chk_enrollment_status`");
            }

            $conn->exec("
                ALTER TABLE `tbl_enrollment`
                ADD CONSTRAINT `chk_enrollment_status`
                CHECK (`status` IN ('pending', 'approved', 'rejected', 'completed', 'qualified', 'unqualified', 'reserved'))
            ");
        }
    }
}
