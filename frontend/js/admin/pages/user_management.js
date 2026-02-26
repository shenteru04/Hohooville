// API Configuration
const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

// Axios Instance Configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
apiClient.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// Handle response errors
apiClient.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../../login.html';
        }
        return Promise.reject(error);
    }
);

// State Management
let allUsers = [];
let usersByRole = {
    admin: [],
    trainer: [],
    trainee: [],
    registrar: []
};
const roleMap = {
    1: 'admin',
    2: 'trainer',
    3: 'trainee',
    4: 'registrar'
};

// Initialize when script loads
document.addEventListener('DOMContentLoaded', function() {
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

    initUserManagement();

    // Inject Sidebar CSS (W3.CSS Reference Style)
    const ms = document.createElement('style');
    ms.innerHTML = `
        #sidebar {
            width: 200px;
            position: fixed;
            z-index: 1050;
            top: 0;
            left: 0;
            height: 100vh;
            overflow-y: auto;
            background-color: #fff;
            box-shadow: 0 2px 5px 0 rgba(0,0,0,0.16), 0 2px 10px 0 rgba(0,0,0,0.12);
            display: block;
        }
        .main-content, #content, .content-wrapper {
            margin-left: 200px !important;
            transition: margin-left .4s;
        }
        #sidebarCloseBtn {
            display: none;
            width: 100%;
            text-align: left;
            padding: 8px 16px;
            background: none;
            border: none;
            font-size: 18px;
        }
        #sidebarCloseBtn:hover { background-color: #ccc; }
        
        @media (max-width: 991.98px) {
            #sidebar { display: none; }
            .main-content, #content, .content-wrapper { margin-left: 0 !important; }
            #sidebarCloseBtn { display: block; }
        }
        .table-responsive, table { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    `;
    document.head.appendChild(ms);

    // Sidebar Logic
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (!document.getElementById('sidebarCloseBtn')) {
            const closeBtn = document.createElement('button');
            closeBtn.id = 'sidebarCloseBtn';
            closeBtn.innerHTML = 'Close &times;';
            closeBtn.addEventListener('click', () => {
                sidebar.style.display = 'none';
            });
            sidebar.insertBefore(closeBtn, sidebar.firstChild);
        }
    }

    // Open Button Logic
    let sc = document.getElementById('sidebarCollapse');
    if (!sc) {
        const nb = document.querySelector('.navbar');
        if (nb) {
            const c = nb.querySelector('.container-fluid') || nb;
            const b = document.createElement('button');
            b.id = 'sidebarCollapse';
            b.className = 'btn btn-outline-primary me-2 d-lg-none';
            b.type = 'button';
            b.innerHTML = '&#9776;';
            c.insertBefore(b, c.firstChild);
            sc = b;
        }
    }
    if (sc) {
        const nb = sc.cloneNode(true);
        if(sc.parentNode) sc.parentNode.replaceChild(nb, sc);
        nb.addEventListener('click', () => {
            if (sidebar) sidebar.style.display = 'block';
        });
    }
});

function initUserManagement() {
    console.log('Initializing User Management...');
    loadUsers();
    setupEventListeners();
}

function setupEventListeners() {
    // Form submit handler - PREVENT DEFAULT
    const form = document.getElementById('addUserForm');
    if (form) {
        // Remove any existing listeners
        form.onsubmit = null;
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Form submitted');
            
            const userId = document.getElementById('userId').value;
            if (userId) {
                updateUser(userId);
            } else {
                addUser();
            }
            return false;
        });
    }

    // Save button click handler as backup
    const saveBtn = document.getElementById('saveUserBtn');
    if (saveBtn) {
        saveBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Save button clicked');
            
            const userId = document.getElementById('userId').value;
            if (userId) {
                updateUser(userId);
            } else {
                addUser();
            }
            return false;
        };
    }

    // Reset form when modal is closed
    const userModal = document.getElementById('userModal');
    if (userModal) {
        userModal.addEventListener('hidden.bs.modal', function() {
            resetForm();
        });
    }

    // Add user button click
    const addBtn = document.getElementById('addUserBtn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            resetForm();
            document.getElementById('userModalTitle').textContent = 'Add New User';
            const passwordField = document.getElementById('password');
            if (passwordField) {
                passwordField.required = true;
            }
        });
    }

    // Password Toggle
    const togglePasswordBtn = document.getElementById('togglePassword');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }
}

async function loadUsers() {
    console.log('Loading users...');
    try {
        const response = await apiClient.get('/role/admin/user_management.php?action=list');
        console.log('Users response:', response.data);
        
        if (response.data.success) {
            allUsers = response.data.data;
            
            // Organize users by role
            usersByRole.admin = allUsers.filter(u => u.role_id === 1 || u.role_name === 'admin');
            usersByRole.trainer = allUsers.filter(u => u.role_id === 2 || u.role_name === 'trainer');
            usersByRole.trainee = allUsers.filter(u => u.role_id === 3 || u.role_name === 'trainee');
            usersByRole.registrar = allUsers.filter(u => u.role_id === 4 || u.role_name === 'registrar');
            
            renderRoleUsersTable('admin');
            renderRoleUsersTable('trainer');
            renderRoleUsersTable('trainee');
            renderRoleUsersTable('registrar');
        } else {
            showAlert('Error loading users: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error loading users. Please check console for details.', 'danger');
    }
}

function renderRoleUsersTable(role) {
    const tabPane = document.getElementById(role + 'Pane');
    if (!tabPane) return;
    
    const data = usersByRole[role] || [];
    
    const tbody = tabPane.querySelector('.users-table-body');
    if (!tbody) {
        console.error('Table body not found for role:', role);
        return;
    }
    
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No ${role}s found</td></tr>`;
        return;
    }
    
    data.forEach(user => {
        const row = document.createElement('tr');
        const statusBadge = user.status === 'active' 
            ? '<span class="badge bg-success">Active</span>' 
            : '<span class="badge bg-danger">Inactive</span>';
        
        const avatarUrl = `https://ui-avatars.com/api/?name=${user.username}&background=random&color=fff&size=32`;

        row.innerHTML = `
            <td class="ps-4">
                <div class="d-flex align-items-center">
                    <img src="${avatarUrl}" class="rounded-circle me-3" width="32" height="32" alt="${user.username}">
                    <div>
                        <div class="fw-bold text-dark">${user.username}</div>
                        <div class="small text-muted">${user.email || 'No email'}</div>
                    </div>
                </div>
            </td>
            <td>${statusBadge}</td>
            <td>${formatDate(user.date_created)}</td>
            <td class="text-end pe-4">
                <button class="btn btn-warning btn-sm" onclick="editUser(${user.user_id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                ${user.status === 'active' ? `<button class="btn btn-danger btn-sm" onclick="archiveUser(${user.user_id})" title="Archive this user">
                    <i class="fas fa-archive"></i> Archive
                </button>` : `<span class="badge bg-secondary">Archived</span>`}
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addUser() {
    console.log('Adding user...');
    
    // Validate form
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const roleId = document.getElementById('roleId').value;
    
    if (!username) {
        showAlert('Username is required', 'warning');
        return;
    }
    
    if (!password) {
        showAlert('Password is required', 'warning');
        return;
    }
    
    if (!roleId) {
        showAlert('Role is required', 'warning');
        return;
    }

    const saveBtn = document.getElementById('saveUserBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const data = {
        role_id: roleId,
        username: username,
        password: password,
        email: document.getElementById('email').value.trim(),
        status: 'active'
    };

    console.log('Sending data:', data);

    try {
        const response = await apiClient.post('/role/admin/user_management.php?action=add', data);
        console.log('Add user response:', response.data);
        
        if (response.data.success) {
            showAlert('User added successfully!', 'success');
            
            // Close modal
            const modalElement = document.getElementById('userModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
            
            // Reset form and reload users
            document.getElementById('addUserForm').reset();
            setTimeout(() => {
                loadUsers();
            }, 500);
        } else {
            showAlert('Error: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        if (error.response) {
            console.error('Error response:', error.response.data);
            showAlert('Error: ' + (error.response.data.message || 'Server error'), 'danger');
        } else {
            showAlert('Error adding user. Please check console for details.', 'danger');
        }
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save User';
    }
}

async function editUser(id) {
                // Show status dropdown for edit
                const statusContainer = document.getElementById('editStatusContainer');
                if (statusContainer) statusContainer.style.display = 'block';
    console.log('Editing user:', id);
    try {
        const response = await apiClient.get(`/role/admin/user_management.php?action=get&id=${id}`);
        console.log('Get user response:', response.data);
        
        if (response.data.success) {
            const user = response.data.data;
            
            // Populate form
            document.getElementById('userId').value = user.user_id;
            document.getElementById('username').value = user.username;
            document.getElementById('email').value = user.email || '';
            document.getElementById('roleId').value = user.role_id;
            // Only set status if field exists (for edit, not add)
            const statusField = document.getElementById('status');
            if (statusField) statusField.value = user.status;
            
            // Password not required for edit
            const passwordField = document.getElementById('password');
            passwordField.required = false;
            passwordField.placeholder = 'Leave blank to keep current password';
            
            // Update modal title
            document.getElementById('userModalTitle').textContent = 'Edit User';
            
            // Show modal
            const modalElement = document.getElementById('userModal');
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            showAlert('Error loading user data: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showAlert('Error loading user data', 'danger');
    }
}

async function updateUser(id) {
    console.log('Updating user:', id);
    
    const saveBtn = document.getElementById('saveUserBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    const data = {
        user_id: id,
        role_id: document.getElementById('roleId').value,
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        status: document.getElementById('status').value
    };

    // Only include password if it's filled
    const password = document.getElementById('password').value;
    if (password) {
        data.password = password;
    }

    console.log('Sending update data:', data);

    try {
        const response = await apiClient.post('/role/admin/user_management.php?action=update', data);
        console.log('Update user response:', response.data);
        
        if (response.data.success) {
            showAlert('User updated successfully!', 'success');
            
            // Close modal
            const modalElement = document.getElementById('userModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
            
            // Reset form and reload users
            resetForm();
            setTimeout(() => {
                loadUsers();
            }, 500);
        } else {
            showAlert('Error: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        if (error.response) {
            console.error('Error response:', error.response.data);
            showAlert('Error: ' + (error.response.data.message || 'Server error'), 'danger');
        } else {
            showAlert('Error updating user. Please check console for details.', 'danger');
        }
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save User';
    }
}

async function archiveUser(id) {
    const result = await Swal.fire({
        title: 'Archive User?',
        text: "The user data will be retained and can be restored later.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Archive'
    });

    if (!result.isConfirmed) return;
    
    console.log('Archiving user:', id);
    
    try {
        const response = await apiClient.get(`/role/admin/user_management.php?action=archive&id=${id}`);
        console.log('Archive user response:', response.data);
        
        if (response.data.success) {
            showAlert('User archived successfully! Data has been retained.', 'success');
            loadUsers();
        } else {
            showAlert('Error: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error archiving user:', error);
        if (error.response) {
            console.error('Error response:', error.response.data);
            showAlert('Error: ' + (error.response.data.message || 'Server error'), 'danger');
        } else {
            showAlert('Error archiving user. Please check console for details.', 'danger');
        }
    }
}

function resetForm() {
    const form = document.getElementById('addUserForm');
    if (form) {
        form.reset();
    }
    document.getElementById('userId').value = '';
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.required = true;
        passwordField.placeholder = 'Minimum 6 characters recommended';
    }
    document.getElementById('userModalTitle').textContent = 'Add New User';
    // Hide status dropdown when adding
    const statusContainer = document.getElementById('editStatusContainer');
    if (statusContainer) statusContainer.style.display = 'none';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showAlert(message, type) {
    console.log(`Alert [${type}]:`, message);
    
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-notification');
    existingAlerts.forEach(alert => alert.remove());

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-notification`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '80px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.style.maxWidth = '500px';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}
