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
            document.getElementById('logsTableBody').innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center text-sm text-rose-600">${response.data.message || 'Error loading logs'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        document.getElementById('logsTableBody').innerHTML = '<tr><td colspan="7" class="px-4 py-6 text-center text-sm text-rose-600">Error loading logs. Please check console.</td></tr>';
    }
};

function renderLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;

    if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-6 text-center text-sm text-slate-500">No logs found</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map((log) => `
        <tr class="hover:bg-slate-50">
            <td class="px-3 py-3 text-xs text-slate-700">${new Date(log.created_at).toLocaleString()}</td>
            <td class="px-3 py-3 text-sm text-slate-800">${log.username || 'System'}</td>
            <td class="px-3 py-3 text-sm"><span class="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">${log.action_type}</span></td>
            <td class="px-3 py-3 text-sm text-slate-700">${log.entity_type || '-'}</td>
            <td class="px-3 py-3 text-sm text-slate-700">${log.entity_id || '-'}</td>
            <td class="px-3 py-3 text-xs text-slate-600">${log.ip_address || '-'}</td>
            <td class="px-3 py-3 text-sm">
                <button class="inline-flex items-center rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="showDetails('${encodeURIComponent(JSON.stringify(log))}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
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
    const result = await Swal.fire({
        title: 'Clear old logs?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'Yes, clear logs'
    });
    if (!result.isConfirmed) return;

    const days = document.getElementById('daysToKeep').value;
    const token = localStorage.getItem('token');
    try {
        const response = await axios.post(`${API_BASE}/activity_logs.php?action=clear`, { days }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire('Success', response.data.message, 'success');
        loadLogs();
    } catch (error) {
        Swal.fire('Error', `Error: ${error.message}`, 'error');
    }
};

function autoPageSize(total) {
    if (total <= 0) return 1;
    if (total <= 10) return total;
    if (total <= 25) return 10;
    if (total <= 50) return 25;
    return 50;
}
