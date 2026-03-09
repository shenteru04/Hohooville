const API_BASE = '/Hohoo-ville/api/role/admin';
let createRoleModal;

class SimpleModal {
    constructor(element) {
        this.element = element;
    }

    show() {
        if (!this.element) return;
        this.element.classList.remove('hidden');
        this.element.classList.add('flex');
        document.body.classList.add('overflow-hidden');
    }

    hide() {
        if (!this.element) return;
        this.element.classList.add('hidden');
        this.element.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await ensureSwal();
    initUserDropdown();
    initLogout();
    initTabs();
    initModals();

    loadRoles();
    loadPermissions();
});

async function ensureSwal() {
    if (typeof window.Swal !== 'undefined') return;
    await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
    });
}

function initUserDropdown() {
    const button = document.getElementById('userDropdown');
    const menu = document.getElementById('userDropdownMenu');
    if (!button || !menu) return;

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#userDropdown') && !event.target.closest('#userDropdownMenu')) {
            menu.classList.add('hidden');
        }
    });
}

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (typeof window.logout === 'function') {
            window.logout();
            return;
        }
        localStorage.clear();
        window.location.href = '/Hohoo-ville/frontend/login.html';
    });
}

function initTabs() {
    const buttons = Array.from(document.querySelectorAll('[data-tab-group="main"]'));
    const panes = Array.from(document.querySelectorAll('.tab-main-pane'));
    if (!buttons.length || !panes.length) return;

    const activate = (button) => {
        buttons.forEach((btn) => setTabButtonState(btn, btn === button));
        const target = button.getAttribute('data-tab-target');
        panes.forEach((pane) => pane.classList.add('hidden'));
        const targetPane = target ? document.querySelector(target) : null;
        if (targetPane) targetPane.classList.remove('hidden');
    };

    buttons.forEach((button) => {
        button.addEventListener('click', () => activate(button));
    });

    const initial = buttons.find((button) => button.classList.contains('active')) || buttons[0];
    activate(initial);
}

function setTabButtonState(button, active) {
    button.classList.toggle('active', active);
    button.classList.toggle('bg-blue-600', active);
    button.classList.toggle('text-white', active);

    button.classList.toggle('border', !active);
    button.classList.toggle('border-slate-300', !active);
    button.classList.toggle('bg-white', !active);
    button.classList.toggle('text-slate-700', !active);
    button.classList.toggle('hover:bg-slate-50', !active);
}

function initModals() {
    createRoleModal = new SimpleModal(document.getElementById('createRoleModal'));

    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            const target = button.getAttribute('data-modal-hide');
            if (target === 'createRoleModal' && createRoleModal) createRoleModal.hide();
        });
    });
}

async function loadRoles() {
    try {
        const response = await axios.get(`${API_BASE}/roles_permissions.php?action=list-roles`);
        const tbody = document.getElementById('rolesTable');
        if (!tbody) return;

        if (!response.data.success) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-rose-600">Error loading roles</td></tr>';
            return;
        }

        const roles = response.data.data || [];
        tbody.innerHTML = roles.map((role) => `
            <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 text-sm font-semibold text-slate-900">${escapeHtml(role.role_name || '')}</td>
                <td class="px-3 py-3 text-sm">
                    <span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold ${role.is_custom ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}">
                        ${role.is_custom ? 'Custom' : 'System'}
                    </span>
                </td>
                <td class="px-3 py-3 text-sm">
                    <span class="inline-flex rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
                        ${Number(role.permission_count || 0)} permissions
                    </span>
                </td>
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(role.description || '-')}</td>
                <td class="px-3 py-3 text-sm">
                    ${role.is_custom
                        ? `<button class="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100" onclick="deleteRole(${role.role_id})">Delete</button>`
                        : '<span class="text-xs text-slate-400">System</span>'
                    }
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading roles:', error);
        const tbody = document.getElementById('rolesTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-rose-600">Failed to load roles</td></tr>';
        }
    }
}

async function loadPermissions() {
    try {
        const response = await axios.get(`${API_BASE}/roles_permissions.php?action=list-permissions`);
        const list = document.getElementById('permissionsList');
        const checkboxes = document.getElementById('permissionsCheckboxes');
        if (!list || !checkboxes) return;

        if (!response.data.success) {
            list.innerHTML = '<div class="col-span-full text-center text-sm text-rose-600">Failed to load permissions.</div>';
            checkboxes.innerHTML = '<div class="text-sm text-rose-600">Failed to load permissions.</div>';
            return;
        }

        const permissions = response.data.data || [];
        list.innerHTML = permissions.map((permission) => `
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <strong class="text-slate-900">${escapeHtml(permission.resource || '')}</strong>: ${escapeHtml(permission.action || '')}
            </div>
        `).join('');

        checkboxes.innerHTML = permissions.map((permission) => `
            <label class="mb-2 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input class="permission-checkbox h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" type="checkbox" value="${permission.permission_id}">
                <span>${escapeHtml(permission.resource || '')} - ${escapeHtml(permission.action || '')}</span>
            </label>
        `).join('');
    } catch (error) {
        console.error('Error loading permissions:', error);
        const list = document.getElementById('permissionsList');
        if (list) list.innerHTML = '<div class="col-span-full text-center text-sm text-rose-600">Failed to load permissions.</div>';
    }
}

function openCreateRoleModal() {
    if (createRoleModal) createRoleModal.show();
}

async function saveRole() {
    const name = document.getElementById('roleName')?.value.trim() || '';
    const desc = document.getElementById('roleDescription')?.value.trim() || '';
    const permissions = Array.from(document.querySelectorAll('.permission-checkbox:checked')).map((checkbox) => checkbox.value);

    if (!name) {
        Swal.fire('Validation Error', 'Please enter a role name', 'warning');
        return;
    }
    if (name.length > 50) {
        Swal.fire('Validation Error', 'Role name must be less than 50 characters', 'warning');
        return;
    }

    try {
        const response = await axios.post(`${API_BASE}/roles_permissions.php?action=create-role`, {
            role_name: name,
            description: desc,
            permissions
        });

        if (!response.data.success) {
            Swal.fire('Error', `Error: ${response.data.message || 'Failed to create role'}`, 'error');
            return;
        }

        Swal.fire('Success', 'Role created successfully!', 'success');
        if (createRoleModal) createRoleModal.hide();
        setValue('roleName', '');
        setValue('roleDescription', '');
        document.querySelectorAll('.permission-checkbox').forEach((checkbox) => {
            checkbox.checked = false;
        });
        loadRoles();
    } catch (error) {
        console.error('Error creating role:', error);
        Swal.fire('Error', `Error creating role: ${error.response?.data?.message || error.message}`, 'error');
    }
}

async function deleteRole(id) {
    const result = await Swal.fire({
        title: 'Delete Role?',
        text: 'Users with this role may lose permissions.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await axios.post(`${API_BASE}/roles_permissions.php?action=delete-role`, { role_id: id });
        if (!response.data.success) {
            Swal.fire('Error', `Error: ${response.data.message || 'Failed to delete role'}`, 'error');
            return;
        }
        Swal.fire('Deleted!', 'Role deleted successfully!', 'success');
        loadRoles();
    } catch (error) {
        console.error('Error deleting role:', error);
        Swal.fire('Error', `Error deleting role: ${error.response?.data?.message || error.message}`, 'error');
    }
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

window.openCreateRoleModal = openCreateRoleModal;
window.saveRole = saveRole;
window.deleteRole = deleteRole;
