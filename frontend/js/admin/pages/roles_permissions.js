const API_BASE = '/Hohoo-ville/api/role/admin';
let createRoleModal, assignRoleModal;

document.addEventListener('DOMContentLoaded', () => {
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.clear();
                window.location.href = '/hohoo-ville/frontend/login.html';
            });
        }
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    createRoleModal = new bootstrap.Modal(document.getElementById('createRoleModal'));
    assignRoleModal = new bootstrap.Modal(document.getElementById('assignRoleModal'));
    loadRoles();
    loadPermissions();
    loadUsersForAssignment();
});

async function loadRoles() {
    try {
        const response = await axios.get(`${API_BASE}/roles_permissions.php?action=list-roles`);
        if (response.data.success) {
            document.getElementById('rolesTable').innerHTML = response.data.data.map(role => `
                <tr>
                    <td><strong>${role.role_name}</strong></td>
                    <td><span class="badge ${role.is_custom ? 'bg-primary' : 'bg-secondary'}">${role.is_custom ? 'Custom' : 'System'}</span></td>
                    <td><span class="badge bg-info">${role.permission_count || 0} permissions</span></td>
                    <td>${role.description || '-'}</td>
                    <td>
                        ${role.is_custom ? `<button class="btn btn-sm btn-danger" onclick="deleteRole(${role.role_id})">Delete</button>` : '<small class="text-muted">System</small>'}
                    </td>
                </tr>
            `).join('');
        } else {
            document.getElementById('rolesTable').innerHTML = '<tr><td colspan="5" class="text-danger">Error loading roles</td></tr>';
        }
    } catch (error) { 
        console.error('Error loading roles:', error);
        document.getElementById('rolesTable').innerHTML = '<tr><td colspan="5" class="text-danger">Failed to load roles</td></tr>';
    }
}

async function loadPermissions() {
    try {
        const response = await axios.get(`${API_BASE}/roles_permissions.php?action=list-permissions`);
        if (response.data.success) {
            const list = document.getElementById('permissionsList');
            list.innerHTML = response.data.data.map(p => `
                <div class="col-md-4 mb-2">
                    <div class="permission-item border p-2 rounded">
                        <strong>${p.resource}</strong>: ${p.action}
                    </div>
                </div>
            `).join('');
            
            // Populate checkboxes for modal
            document.getElementById('permissionsCheckboxes').innerHTML = response.data.data.map(p => `
                <div class="form-check">
                    <input class="form-check-input permission-checkbox" type="checkbox" value="${p.permission_id}">
                    <label class="form-check-label">${p.resource} - ${p.action}</label>
                </div>
            `).join('');
        }
    } catch (error) { 
        console.error('Error loading permissions:', error);
        document.getElementById('permissionsList').innerHTML = '<div class="col-12 text-danger">Failed to load permissions</div>';
    }
}

async function loadUsersForAssignment() {
    try {
        const response = await axios.get(`${API_BASE}/user_management.php?action=list`);
        if (response.data.success) {
            // Filter out archived users (only show active and inactive non-archived users)
            const activeUsers = response.data.data.filter(u => u.is_archived === 0 || !u.is_archived);
            const options = activeUsers.map(u => `<option value="${u.user_id}">${u.username} (${u.role_name || 'Unknown'})</option>`).join('');
            document.getElementById('userSelect').innerHTML += options;
            document.getElementById('assignUserSelect').innerHTML += options;
        }
        // Load roles into select
        const rolesRes = await axios.get(`${API_BASE}/roles_permissions.php?action=list-roles`);
        if(rolesRes.data.success) {
             document.getElementById('assignRoleSelect').innerHTML += rolesRes.data.data.map(r => `<option value="${r.role_id}">${r.role_name}</option>`).join('');
        }
    } catch (error) { 
        console.error('Error loading users:', error);
        Swal.fire('Error', 'Error loading users and roles', 'error');
    }
}

window.openCreateRoleModal = function() { createRoleModal.show(); };
window.openAssignRoleModal = function() { assignRoleModal.show(); };

window.saveRole = async function() {
    const name = document.getElementById('roleName').value.trim();
    const desc = document.getElementById('roleDescription').value.trim();
    const permissions = Array.from(document.querySelectorAll('.permission-checkbox:checked')).map(cb => cb.value);

    // Validation
    if (!name) {
        Swal.fire('Validation Error', 'Please enter a role name', 'warning');
        return;
    }
    if (name.length > 50) {
        Swal.fire('Validation Error', 'Role name must be less than 50 characters', 'warning');
        return;
    }

    try {
        const response = await axios.post(`${API_BASE}/roles_permissions.php?action=create-role`, { role_name: name, description: desc, permissions });
        if (response.data.success) {
            Swal.fire('Success', 'Role created successfully!', 'success');
            createRoleModal.hide();
            document.getElementById('roleName').value = '';
            document.getElementById('roleDescription').value = '';
            document.querySelectorAll('.permission-checkbox').forEach(cb => cb.checked = false);
            loadRoles();
        } else {
            Swal.fire('Error', 'Error: ' + (response.data.message || 'Failed to create role'), 'error');
        }
    } catch (error) { 
        console.error('Error creating role:', error);
        Swal.fire('Error', 'Error creating role: ' + (error.response?.data?.message || error.message), 'error');
    }
};

window.deleteRole = async function(id) {
    const result = await Swal.fire({
        title: 'Delete Role?',
        text: "Users with this role may lose permissions.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await axios.post(`${API_BASE}/roles_permissions.php?action=delete-role`, { role_id: id });
        if (response.data.success) {
            Swal.fire('Deleted!', 'Role deleted successfully!', 'success');
            loadRoles();
        } else {
            Swal.fire('Error', 'Error: ' + (response.data.message || 'Failed to delete role'), 'error');
        }
    } catch (error) { 
        console.error('Error deleting role:', error);
        Swal.fire('Error', 'Error deleting role: ' + (error.response?.data?.message || error.message), 'error');
    }
};

window.assignRole = async function() {
    const userId = document.getElementById('assignUserSelect').value;
    const roleId = document.getElementById('assignRoleSelect').value;
    
    // Validation
    if (!userId) {
        Swal.fire('Validation Error', 'Please select a user', 'warning');
        return;
    }
    if (!roleId) {
        Swal.fire('Validation Error', 'Please select a role', 'warning');
        return;
    }
    
    try {
        const response = await axios.post(`${API_BASE}/roles_permissions.php?action=assign-role`, { user_id: userId, role_id: roleId });
        if (response.data.success) {
            Swal.fire('Success', 'Role assigned successfully!', 'success');
            assignRoleModal.hide();
            document.getElementById('assignUserSelect').value = '';
            document.getElementById('assignRoleSelect').value = '';
        } else {
            Swal.fire('Error', 'Error: ' + (response.data.message || 'Failed to assign role'), 'error');
        }
    } catch (error) { 
        console.error('Error assigning role:', error);
        Swal.fire('Error', 'Error assigning role: ' + (error.response?.data?.message || error.message), 'error');
    }
};

window.loadUserRoles = function() { 
    const userId = document.getElementById('userSelect').value;
    if (!userId) {
        document.getElementById('userRolesCard').style.display = 'none';
        return;
    }
    // TODO: Implement loading user roles from API
    // This would fetch and display all roles assigned to the selected user
    document.getElementById('userRolesCard').style.display = 'block';
    document.getElementById('selectedUserName').innerText = 'User Roles for ID: ' + userId;
};