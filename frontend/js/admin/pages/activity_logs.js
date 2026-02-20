const API_BASE = 'http://localhost/Hohoo-ville/api/role/admin';
let currentPage = 1;
const logsPerPage = 50;
let detailsModal;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    const modalEl = document.getElementById('detailsModal');
    if(modalEl) {
        detailsModal = new bootstrap.Modal(modalEl);
    }
    loadLogs();
    loadUsers();
});

async function loadUsers() {
    const token = localStorage.getItem('token');
    try {
        const response = await axios.get(`${API_BASE}/user_management.php?action=list`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
            const select = document.getElementById('filterUser');
            response.data.data.forEach(user => {
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

window.loadLogs = async function() {
    const actionType = document.getElementById('filterAction').value;
    const date = document.getElementById('filterDate').value;
    const userId = document.getElementById('filterUser').value;
    const token = localStorage.getItem('token');

    try {
        const response = await axios.get(`${API_BASE}/activity_logs.php?action=list&page=${currentPage}&limit=${logsPerPage}&action_type=${actionType}&date=${date}&user_id=${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
            renderLogs(response.data.data);
            renderPagination(response.data.pagination);
        } else {
             document.getElementById('logsTableBody').innerHTML = `<tr><td colspan="7" class="text-center text-danger">${response.data.message || 'Error loading logs'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        document.getElementById('logsTableBody').innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading logs. Please check console.</td></tr>';
    }
};

function renderLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No logs found</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map(log => `
        <tr>
            <td class="small">${new Date(log.created_at).toLocaleString()}</td>
            <td>${log.username || 'System'}</td>
            <td><span class="badge bg-primary badge-action">${log.action_type}</span></td>
            <td>${log.entity_type}</td>
            <td>${log.entity_id || '-'}</td>
            <td class="small">${log.ip_address}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="showDetails('${encodeURIComponent(JSON.stringify(log))}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    let html = '';

    if (pagination.page > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="currentPage=1; loadLogs()">First</a></li>`;
        html += `<li class="page-item"><a class="page-link" href="#" onclick="currentPage--; loadLogs()">Previous</a></li>`;
    }

    html += `<li class="page-item active"><span class="page-link">${pagination.page} / ${pagination.pages}</span></li>`;

    if (pagination.page < pagination.pages) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="currentPage++; loadLogs()">Next</a></li>`;
        html += `<li class="page-item"><a class="page-link" href="#" onclick="currentPage=${pagination.pages}; loadLogs()">Last</a></li>`;
    }

    container.innerHTML = html;
}

window.showDetails = function(logString) {
    const log = JSON.parse(decodeURIComponent(logString));
    
    let content = '<div class="table-responsive"><table class="table table-bordered mb-0">';
    content += '<tbody>';
    
    for (const [key, value] of Object.entries(log)) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        content += `<tr><th class="bg-light" style="width: 35%">${label}</th><td>${value !== null ? value : '<span class="text-muted">N/A</span>'}</td></tr>`;
    }
    
    content += '</tbody></table></div>';
    document.getElementById('detailsContent').innerHTML = content;
    detailsModal.show();
};

window.clearOldLogs = async function() {
    const result = await Swal.fire({
        title: 'Clear Old Logs?',
        text: "Are you sure? This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, Clear Logs'
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
    } catch (error) { Swal.fire('Error', 'Error: ' + error.message, 'error'); }
};