<?php
/**
 * Permission Checker
 * Enforces granular permission-based access control
 */
class PermissionChecker {
    private $conn;
    private $userPermissions = [];
    private $userId;
    private $roleId;

    public function __construct($conn, $userId = null, $roleId = null) {
        $this->conn = $conn;
        $this->userId = $userId;
        $this->roleId = $roleId;
        
        if ($userId || $roleId) {
            $this->loadUserPermissions();
        }
    }

    /**
     * Load user permissions based on role
     */
    private function loadUserPermissions() {
        try {
            $roleId = $this->roleId;
            
            // If userId is provided but not roleId, fetch roleId
            if (!$roleId && $this->userId) {
                $stmt = $this->conn->prepare("SELECT role_id FROM tbl_users WHERE user_id = ?");
                $stmt->execute([$this->userId]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($result) {
                    $roleId = $result['role_id'];
                }
            }

            if (!$roleId) {
                return;
            }

            // Load permissions for this role
            $stmt = $this->conn->prepare("
                SELECT p.permission_name, p.resource, p.action
                FROM tbl_permissions p
                INNER JOIN tbl_role_permissions rp ON p.permission_id = rp.permission_id
                WHERE rp.role_id = ?
            ");
            $stmt->execute([$roleId]);
            $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($permissions as $perm) {
                $this->userPermissions[] = $perm['permission_name'];
                // Also store by resource and action for flexible checking
                $resource = $perm['resource'];
                $action = $perm['action'];
                if ($resource && $action) {
                    $this->userPermissions[] = "{$resource}.{$action}";
                }
            }
        } catch (Exception $e) {
            error_log("Error loading permissions: " . $e->getMessage());
        }
    }

    /**
     * Check if user has a specific permission
     * @param string $permission Permission name or resource.action format
     * @return bool
     */
    public function hasPermission($permission) {
        return in_array($permission, $this->userPermissions);
    }

    /**
     * Check if user has any of the specified permissions
     * @param array $permissions Array of permission names
     * @return bool
     */
    public function hasAnyPermission($permissions) {
        foreach ($permissions as $perm) {
            if ($this->hasPermission($perm)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if user has all specified permissions
     * @param array $permissions Array of permission names
     * @return bool
     */
    public function hasAllPermissions($permissions) {
        foreach ($permissions as $perm) {
            if (!$this->hasPermission($perm)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Require permission - throws exception if not authorized
     * @param string $permission Permission name
     * @throws Exception
     */
    public function requirePermission($permission) {
        if (!$this->hasPermission($permission)) {
            throw new Exception("Access denied. Missing required permission: {$permission}");
        }
    }

    /**
     * Require any of the specified permissions
     * @param array $permissions Array of permission names
     * @throws Exception
     */
    public function requireAnyPermission($permissions) {
        if (!$this->hasAnyPermission($permissions)) {
            throw new Exception("Access denied. Missing required permissions.");
        }
    }

    /**
     * Get all user permissions
     * @return array
     */
    public function getUserPermissions() {
        return $this->userPermissions;
    }
}
