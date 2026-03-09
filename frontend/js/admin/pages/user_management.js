const API_BASE_URL = `${window.location.origin}/hohoo-ville/api`;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../../login.html';
        }
        return Promise.reject(error);
    }
);

let allUsers = [];
const usersByRole = {
    trainer: [],
    trainee: [],
    registrar: []
};

const roleMap = {
    2: 'trainer',
    3: 'trainee',
    4: 'registrar'
};

const dom = {
    modal: null,
    form: null,
    modalTitle: null,
    addBtn: null,
    saveBtn: null,
    statusContainer: null
};

document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    bindHeaderEvents();
    setupTabs();
    setupModalEvents();
    setupFormEvents();
    initUserManagement();
});

function cacheDom() {
    dom.modal = document.getElementById('userModal');
    dom.form = document.getElementById('addUserForm');
    dom.modalTitle = document.getElementById('userModalTitle');
    dom.addBtn = document.getElementById('addUserBtn');
    dom.saveBtn = document.getElementById('saveUserBtn');
    dom.statusContainer = document.getElementById('editStatusContainer');
}

function bindHeaderEvents() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.clear();
            window.location.href = '/hohoo-ville/frontend/login.html';
        });
    }

    const dropdownBtn = document.getElementById('userDropdown');
    const dropdownMenu = document.getElementById('userDropdownMenu');
    if (dropdownBtn && dropdownMenu) {
        dropdownBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            dropdownMenu.classList.toggle('hidden');
        });
        document.addEventListener('click', (event) => {
            if (!event.target.closest('#userDropdownMenu') && !event.target.closest('#userDropdown')) {
                dropdownMenu.classList.add('hidden');
            }
        });
    }
}

function initUserManagement() {
    loadUsers();
}

function setupTabs() {
    const tabButtons = Array.from(document.querySelectorAll('#userRoleTabs .tab-role-btn'));
    if (!tabButtons.length) return;

    tabButtons.forEach((button) => {
        button.addEventListener('click', () => activateTab(button));
    });

    const activeButton = tabButtons.find((button) => button.classList.contains('active')) || tabButtons[0];
    activateTab(activeButton);
}

function activateTab(activeButton) {
    const tabButtons = document.querySelectorAll('#userRoleTabs .tab-role-btn');
    const panes = document.querySelectorAll('#userRoleTabContent .tab-role-pane');
    const targetSelector = activeButton.getAttribute('data-tab-target');

    tabButtons.forEach((button) => {
        const isActive = button === activeButton;
        button.classList.toggle('active', isActive);
        button.classList.toggle('bg-blue-600', isActive);
        button.classList.toggle('text-white', isActive);
        button.classList.toggle('border-blue-600', isActive);

        button.classList.toggle('border', !isActive);
        button.classList.toggle('border-slate-300', !isActive);
        button.classList.toggle('bg-white', !isActive);
        button.classList.toggle('text-slate-700', !isActive);
        button.classList.toggle('hover:bg-slate-50', !isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    panes.forEach((pane) => pane.classList.add('hidden'));
    if (targetSelector) {
        const targetPane = document.querySelector(targetSelector);
        if (targetPane) targetPane.classList.remove('hidden');
    }
}

function setupModalEvents() {
    if (!dom.modal) return;

    const closeButtons = document.querySelectorAll('[data-modal-hide="userModal"]');
    closeButtons.forEach((button) => {
        button.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !dom.modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    if (dom.addBtn) {
        dom.addBtn.addEventListener('click', () => {
            resetForm();
            dom.modalTitle.textContent = 'Add New User';
            const passwordField = document.getElementById('password');
            if (passwordField) {
                passwordField.required = true;
                passwordField.placeholder = 'Minimum 6 characters recommended';
            }
            openModal();
        });
    }
}

function openModal() {
    if (!dom.modal) return;
    dom.modal.classList.remove('hidden');
    dom.modal.classList.add('flex');
    dom.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');
}

function closeModal() {
    if (!dom.modal) return;
    dom.modal.classList.remove('flex');
    dom.modal.classList.add('hidden');
    dom.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
    resetForm();
}

function setupFormEvents() {
    if (dom.form) {
        dom.form.addEventListener('submit', (event) => {
            event.preventDefault();
            handleSave();
        });
    }

    if (dom.saveBtn) {
        dom.saveBtn.addEventListener('click', (event) => {
            event.preventDefault();
            handleSave();
        });
    }

    const togglePasswordBtn = document.getElementById('togglePassword');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const icon = togglePasswordBtn.querySelector('i');
            if (!passwordInput || !icon) return;

            const showing = passwordInput.type === 'text';
            passwordInput.type = showing ? 'password' : 'text';
            icon.classList.toggle('fa-eye', showing);
            icon.classList.toggle('fa-eye-slash', !showing);
        });
    }
}

function handleSave() {
    const userId = document.getElementById('userId').value;
    if (userId) updateUser(userId);
    else addUser();
}

async function loadUsers() {
    try {
        const response = await apiClient.get('/role/admin/user_management.php?action=list');
        if (!response.data.success) {
            showAlert(`Error loading users: ${response.data.message}`, 'danger');
            return;
        }

        allUsers = Array.isArray(response.data.data) ? response.data.data : [];
        usersByRole.trainer = [];
        usersByRole.trainee = [];
        usersByRole.registrar = [];

        allUsers.forEach((user) => {
            const role = resolveRole(user);
            if (usersByRole[role]) usersByRole[role].push(user);
        });

        renderRoleUsersTable('trainer');
        renderRoleUsersTable('trainee');
        renderRoleUsersTable('registrar');
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error loading users. Please try again.', 'danger');
    }
}

function resolveRole(user) {
    if (roleMap[user.role_id]) return roleMap[user.role_id];
    const normalizedRole = String(user.role_name || '').toLowerCase();
    return usersByRole[normalizedRole] ? normalizedRole : 'trainee';
}

function renderRoleUsersTable(role) {
    const tabPane = document.getElementById(`${role}Pane`);
    if (!tabPane) return;

    const data = usersByRole[role] || [];
    const tbody = tabPane.querySelector('.users-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-slate-500">No ${role}s found</td></tr>`;
        return;
    }

    data.forEach((user) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50';

        const isActive = user.status === 'active';
        const statusBadge = isActive
            ? '<span class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span>'
            : '<span class="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Inactive</span>';

        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&background=2563eb&color=ffffff&size=32`;
        const safeUsername = escapeHtml(user.username || 'Unknown User');
        const safeEmail = escapeHtml(user.email || 'No email');

        row.innerHTML = `
            <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                    <img src="${avatarUrl}" class="h-8 w-8 rounded-full object-cover" width="32" height="32" alt="${safeUsername}">
                    <div>
                        <div class="text-sm font-semibold text-slate-900">${safeUsername}</div>
                        <div class="text-xs text-slate-500">${safeEmail}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3">${statusBadge}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${formatDate(user.date_created)}</td>
            <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-2">
                    <button class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" onclick="editUser(${user.user_id})">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                    ${isActive
                        ? `<button class="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500" onclick="deactivateUser(${user.user_id})" title="Deactivate this user">
                            <i class="fas fa-ban mr-1"></i>Deactivate
                        </button>`
                        : '<span class="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">Inactive</span>'}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addUser() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const roleId = document.getElementById('roleId').value;

    if (!username) {
        showAlert('Username is required.', 'warning');
        return;
    }
    if (!password) {
        showAlert('Password is required.', 'warning');
        return;
    }
    if (!roleId) {
        showAlert('Role is required.', 'warning');
        return;
    }

    setSaveState(true, 'Saving...');

    const payload = {
        role_id: roleId,
        username,
        password,
        email: document.getElementById('email').value.trim(),
        status: 'active'
    };

    try {
        const response = await apiClient.post('/role/admin/user_management.php?action=add', payload);
        if (!response.data.success) {
            showAlert(`Error: ${response.data.message}`, 'danger');
            return;
        }

        showAlert('User added successfully.', 'success');
        closeModal();
        await loadUsers();
    } catch (error) {
        console.error('Error adding user:', error);
        const message = error.response?.data?.message || 'Error adding user. Please try again.';
        showAlert(message, 'danger');
    } finally {
        setSaveState(false, 'Save User');
    }
}

async function editUser(id) {
    try {
        const response = await apiClient.get(`/role/admin/user_management.php?action=get&id=${id}`);
        if (!response.data.success) {
            showAlert(`Error loading user data: ${response.data.message}`, 'danger');
            return;
        }

        const user = response.data.data;
        document.getElementById('userId').value = user.user_id;
        document.getElementById('username').value = user.username || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('roleId').value = user.role_id || '';

        const statusField = document.getElementById('status');
        if (statusField) statusField.value = user.status || 'active';
        if (dom.statusContainer) dom.statusContainer.classList.remove('hidden');

        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.required = false;
            passwordField.value = '';
            passwordField.placeholder = 'Leave blank to keep current password';
        }

        if (dom.modalTitle) dom.modalTitle.textContent = 'Edit User';
        openModal();
    } catch (error) {
        console.error('Error loading user:', error);
        showAlert('Error loading user data.', 'danger');
    }
}

async function updateUser(id) {
    const payload = {
        user_id: id,
        role_id: document.getElementById('roleId').value,
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        status: document.getElementById('status').value
    };

    const password = document.getElementById('password').value;
    if (password) payload.password = password;

    setSaveState(true, 'Updating...');

    try {
        const response = await apiClient.post('/role/admin/user_management.php?action=update', payload);
        if (!response.data.success) {
            showAlert(`Error: ${response.data.message}`, 'danger');
            return;
        }

        showAlert('User updated successfully.', 'success');
        closeModal();
        await loadUsers();
    } catch (error) {
        console.error('Error updating user:', error);
        const message = error.response?.data?.message || 'Error updating user. Please try again.';
        showAlert(message, 'danger');
    } finally {
        setSaveState(false, 'Save User');
    }
}

async function deactivateUser(id) {
    const confirmed = await confirmDeactivate();
    if (!confirmed) return;

    try {
        const response = await apiClient.get(`/role/admin/user_management.php?action=archive&id=${id}`);
        if (!response.data.success) {
            showAlert(`Error: ${response.data.message}`, 'danger');
            return;
        }
        showAlert('User deactivated successfully.', 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error deactivating user:', error);
        const message = error.response?.data?.message || 'Error deactivating user. Please try again.';
        showAlert(message, 'danger');
    }
}

function resetForm() {
    if (dom.form) dom.form.reset();
    document.getElementById('userId').value = '';
    if (dom.modalTitle) dom.modalTitle.textContent = 'Add New User';

    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.required = true;
        passwordField.placeholder = 'Minimum 6 characters recommended';
        passwordField.type = 'password';
    }

    const icon = document.querySelector('#togglePassword i');
    if (icon) {
        icon.classList.add('fa-eye');
        icon.classList.remove('fa-eye-slash');
    }

    if (dom.statusContainer) dom.statusContainer.classList.add('hidden');
}

function setSaveState(isLoading, label) {
    if (!dom.saveBtn) return;
    dom.saveBtn.disabled = isLoading;
    dom.saveBtn.classList.toggle('opacity-60', isLoading);
    dom.saveBtn.classList.toggle('cursor-not-allowed', isLoading);
    dom.saveBtn.innerHTML = isLoading
        ? `<i class="fas fa-spinner fa-spin mr-2"></i>${label}`
        : label;
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

function ensureToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'fixed right-4 top-20 z-[9999] flex w-[min(92vw,28rem)] flex-col gap-2';
        document.body.appendChild(container);
    }
    return container;
}

function showAlert(message, type = 'info') {
    const styles = {
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        danger: 'border-rose-200 bg-rose-50 text-rose-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        info: 'border-blue-200 bg-blue-50 text-blue-800'
    };

    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-sm transition-all duration-200 ${styles[type] || styles.info}`;
    toast.innerHTML = `
        <div class="flex items-start justify-between gap-3">
            <p class="leading-5">${escapeHtml(message)}</p>
            <button type="button" class="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Close notification">
                <i class="fas fa-times text-xs"></i>
            </button>
        </div>
    `;

    const closeBtn = toast.querySelector('button');
    const removeToast = () => {
        toast.classList.add('opacity-0', 'translate-x-2');
        setTimeout(() => toast.remove(), 180);
    };

    closeBtn?.addEventListener('click', removeToast);
    container.appendChild(toast);

    setTimeout(removeToast, 5000);
}

async function confirmDeactivate() {
    await ensureSweetAlert();
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'Deactivate User?',
            text: 'The user account will be deactivated and can be reactivated later.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Deactivate'
        });
        return result.isConfirmed;
    }
    return window.confirm('Deactivate this user?');
}

function ensureSweetAlert() {
    if (typeof Swal !== 'undefined') {
        return Promise.resolve();
    }

    const existing = document.querySelector('script[data-swal-loader="true"]');
    if (existing) {
        return new Promise((resolve) => {
            if (typeof Swal !== 'undefined') resolve();
            else existing.addEventListener('load', resolve, { once: true });
        });
    }

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        script.async = true;
        script.dataset.swalLoader = 'true';
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
