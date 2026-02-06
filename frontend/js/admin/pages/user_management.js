// API Configuration
const API_BASE_URL = 'http://localhost/hohoo-ville/api';

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
let filteredUsers = [];
let currentPage = 1;
const itemsPerPage = 10;

// Initialize when script loads
initUserManagement();

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

    // Filter Event Listeners
    document.getElementById('searchInput')?.addEventListener('keyup', applyFilters);
    document.getElementById('roleFilter')?.addEventListener('change', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);

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
            applyFilters();
        } else {
            showAlert('Error loading users: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error loading users. Please check console for details.', 'danger');
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value.toLowerCase();

    filteredUsers = allUsers.filter(user => {
        const matchesSearch = (user.username && user.username.toLowerCase().includes(searchTerm)) || 
                              (user.email && user.email.toLowerCase().includes(searchTerm));
        const matchesRole = roleFilter === '' || (user.role_name && user.role_name.toLowerCase() === roleFilter);
        const matchesStatus = statusFilter === '' || (user.status && user.status.toLowerCase() === statusFilter);
        return matchesSearch && matchesRole && matchesStatus;
    });

    currentPage = 1;
    renderPagination();
    renderUsersTable();
}

function renderUsersTable() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedData = filteredUsers.slice(start, end);

    const tbody = document.getElementById('usersTableBody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (paginatedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No users found matching your criteria</td></tr>';
        return;
    }
    
    paginatedData.forEach(user => {
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
            <td><span class="badge bg-light text-dark border">${user.role_name}</span></td>
            <td>${statusBadge}</td>
            <td>${formatDate(user.date_created)}</td>
            <td class="text-end pe-4">
                <button class="btn btn-warning btn-sm" onclick="editUser(${user.user_id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.user_id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous Button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">Previous</a>`;
    pagination.appendChild(prevLi);

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${currentPage === i ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>`;
        pagination.appendChild(li);
    }

    // Next Button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">Next</a>`;
    pagination.appendChild(nextLi);
}

window.changePage = function(page) {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderPagination();
    renderUsersTable();
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
        status: document.getElementById('status').value
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
            document.getElementById('status').value = user.status;
            
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

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    console.log('Deleting user:', id);
    
    try {
        const response = await apiClient.delete(`/role/admin/user_management.php?action=delete&id=${id}`);
        console.log('Delete user response:', response.data);
        
        if (response.data.success) {
            showAlert('User deleted successfully!', 'success');
            loadUsers();
        } else {
            showAlert('Error: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        if (error.response) {
            console.error('Error response:', error.response.data);
            showAlert('Error: ' + (error.response.data.message || 'Server error'), 'danger');
        } else {
            showAlert('Error deleting user. Please check console for details.', 'danger');
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