const API_BASE = `${window.location.origin}/Hohoo-ville/api/role/admin`;
let currentPage = 1;
let logsPerPage = 50;
let detailsModal = null;

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

document.addEventListener('DOMContentLoaded', async function () {
    await ensureSwal();
    initUserDropdown();
    initModalDismissers();
    initLogout();

    const modalEl = document.getElementById('detailsModal');
    if (modalEl) detailsModal = new SimpleModal(modalEl);

    loadLogs();
    loadUsers();
    loadActionTypes();
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

function initModalDismissers() {
    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            if (detailsModal) detailsModal.hide();
        });
    });
}

async function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        await ensureSwal();
        
        Swal.fire({
            title: 'Logout Confirmation',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Logout',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then((result) => {
            if (result.isConfirmed) {
                if (typeof window.logout === 'function') {
                    window.logout();
                    return;
                }
                localStorage.clear();
                window.location.href = '/Hohoo-ville/frontend/login.html';
            }
        });
    });
}

async function loadUsers() {
    const token = localStorage.getItem('token');
    try {
        const response = await axios.get(`${API_BASE}/user_management.php?action=list`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
            const select = document.getElementById('filterUser');
            response.data.data.forEach((user) => {
                const option = document.createElement('option');
                option.value = user.user_id;
                option.textContent = user.username;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.warn('Could not load users for filter');
    }
}

async function loadActionTypes() {
    const token = localStorage.getItem('token');
    const select = document.getElementById('filterAction');
    if (!select) return;

    try {
        const response = await axios.get(`${API_BASE}/activity_logs.php?action=action-types`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.data.success) return;

        response.data.data.forEach((action) => {
            const option = document.createElement('option');
            option.value = action;
            option.textContent = formatAction(action);
            select.appendChild(option);
        });
    } catch (error) {
        console.warn('Could not load activity types');
    }
}

window.loadLogs = async function () {
    const actionType = document.getElementById('filterAction').value;
    const date = document.getElementById('filterDate').value;
    const userId = document.getElementById('filterUser').value;
    const token = localStorage.getItem('token');

    try {
        const response = await axios.get(`${API_BASE}/activity_logs.php?action=list&page=${currentPage}&limit=${logsPerPage}&action_type=${encodeURIComponent(actionType)}&date=${encodeURIComponent(date)}&user_id=${encodeURIComponent(userId)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
            const total = response.data.pagination ? response.data.pagination.total : 0;
            const suggested = autoPageSize(total);
            if (suggested !== logsPerPage && currentPage === 1) {
                logsPerPage = suggested;
                return loadLogs();
            }
            renderLogs(response.data.data || []);
            renderPagination(response.data.pagination || { page: 1, pages: 1 });
        } else {
            document.getElementById('logsTableBody').innerHTML = `<tr><td colspan="8" class="px-4 py-6 text-center text-sm text-rose-600">${response.data.message || 'Error loading logs'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        document.getElementById('logsTableBody').innerHTML = '<tr><td colspan="8" class="px-4 py-6 text-center text-sm text-rose-600">Error loading logs. Please check console.</td></tr>';
    }
};

function renderLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;

    if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="px-4 py-6 text-center text-sm text-slate-500">No logs found</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map((log) => `
        <tr class="hover:bg-slate-50">
            <td class="px-3 py-3 text-xs text-slate-700">${new Date(log.created_at).toLocaleString()}</td>
            <td class="px-3 py-3 text-sm text-slate-800">${log.username || 'System'}</td>
            <td class="px-3 py-3 text-sm"><span class="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">${formatAction(log.action_type)}</span></td>
            <td class="px-3 py-3 text-sm text-slate-700">${formatEntity(log.entity_type, log.entity_id)}</td>
            <td class="max-w-xs px-3 py-3 text-sm text-slate-700">${escapeHtml(log.details || 'No additional details recorded.')}</td>
            <td class="px-3 py-3 text-xs text-slate-600">${log.ip_address || '-'}</td>
            <td class="px-3 py-3 text-sm">
                <button class="inline-flex items-center rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="showDetails('${encodeURIComponent(JSON.stringify(log))}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function formatAction(action) {
    const labels = {
        add: 'Created',
        create: 'Created',
        update: 'Updated',
        edit: 'Edited',
        delete: 'Deleted',
        submit: 'Submitted',
        approve: 'Approved',
        reject: 'Rejected',
        archive: 'Archived',
        reactivate: 'Reactivated',
        login_success: 'Logged in',
        login_failed: 'Login failed',
        login_locked: 'Login blocked',
        logout: 'Logged out',
        password_changed: 'Changed password',
        password_reset: 'Reset password',
        export: 'Exported'
    };
    return labels[action] || String(action || 'Unknown action').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatEntity(entityType, entityId) {
    const entity = entityType ? String(entityType).replace(/^tbl_/, '').replace(/_/g, ' ') : 'System';
    const label = entity.replace(/\b\w/g, (letter) => letter.toUpperCase());
    return entityId ? `${label} #${entityId}` : label;
}

function escapeHtml(value) {
    const element = document.createElement('div');
    element.textContent = String(value);
    return element.innerHTML;
}

function renderPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    const page = Number(pagination.page || 1);
    const pages = Number(pagination.pages || 1);

    const btn = (label, handler, disabled = false, active = false) => `
        <li>
            <button type="button" ${disabled ? 'disabled' : ''} class="rounded-lg border px-3 py-1.5 text-xs font-semibold ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}" onclick="${handler}">
                ${label}
            </button>
        </li>
    `;

    let html = '';
    html += btn('First', 'currentPage=1;loadLogs();', page <= 1);
    html += btn('Previous', 'currentPage=Math.max(1,currentPage-1);loadLogs();', page <= 1);
    html += btn(`${page} / ${pages}`, '', true, true);
    html += btn('Next', 'currentPage=Math.min(currentPage+1,' + pages + ');loadLogs();', page >= pages);
    html += btn('Last', 'currentPage=' + pages + ';loadLogs();', page >= pages);

    container.innerHTML = html;
}

window.showDetails = function (logString) {
    const log = JSON.parse(decodeURIComponent(logString));

    let content = '<div class="overflow-x-auto rounded-lg border border-slate-200"><table class="min-w-full divide-y divide-slate-200">';
    content += '<tbody class="divide-y divide-slate-100 bg-white">';

    Object.entries(log).forEach(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
        content += `
            <tr>
                <th class="w-1/3 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700">${label}</th>
                <td class="px-3 py-2 text-sm text-slate-700">${value !== null ? value : '<span class="text-slate-400">N/A</span>'}</td>
            </tr>
        `;
    });

    content += '</tbody></table></div>';
    document.getElementById('detailsContent').innerHTML = content;
    if (detailsModal) detailsModal.show();
};

window.clearOldLogs = async function () {
    const daysInput = document.getElementById('daysToKeep');
    const days = Number(daysInput?.value);

    if (!Number.isInteger(days) || days < 1) {
        await Swal.fire('Invalid retention period', 'Enter a whole number of days to keep (at least 1).', 'error');
        daysInput?.focus();
        return;
    }

    const result = await Swal.fire({
        title: 'Clear old logs?',
        text: `Logs older than ${days} day${days === 1 ? '' : 's'} will be permanently deleted. This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'Yes, clear logs'
    });
    if (!result.isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
        const response = await axios.post(`${API_BASE}/activity_logs.php?action=clear`, { days }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.data.success) {
            throw new Error(response.data.message || 'Unable to clear activity logs.');
        }

        currentPage = 1;
        await Swal.fire('Success', response.data.message, 'success');
        loadLogs();
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Unable to clear activity logs.';
        Swal.fire('Error', message, 'error');
    }
};

function autoPageSize(total) {
    if (total <= 0) return 1;
    if (total <= 10) return total;
    if (total <= 25) return 10;
    if (total <= 50) return 25;
    return 50;
}
