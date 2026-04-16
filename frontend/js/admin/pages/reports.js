const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;
let reportChart = null;

document.addEventListener('DOMContentLoaded', async function () {
    await ensureSwal();
    initUserDropdown();
    initLogout();

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), 0, 1);
    document.getElementById('startDate').valueAsDate = firstDay;
    document.getElementById('endDate').valueAsDate = today;

    document.getElementById('generateBtn').addEventListener('click', generateReport);
    document.getElementById('exportReportBtn').addEventListener('click', () => {
        const type = document.getElementById('reportType')?.value || 'report';
        const filename = `admin_${type}_report`;
        if (typeof window.exportTableToExcel === 'function') {
            window.exportTableToExcel('reportTable', filename);
        } else {
            alert('Export is not available.');
        }
    });

    generateReport();
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

async function generateReport() {
    const type = document.getElementById('reportType').value;
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/reports.php`, {
            params: { type, start_date: start, end_date: end }
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to generate report');
        }
        updateChart(type, response.data.chart || []);
        updateTable(type, response.data.table || []);
    } catch (error) {
        console.error('Error generating report:', error);
        if (window.Swal) Swal.fire('Error', error.message || 'Failed to generate report', 'error');
    }
}

function updateChart(type, data) {
    const ctx = document.getElementById('reportChart');
    if (!ctx) return;

    if (reportChart) reportChart.destroy();

    const labels = data.map((item) => item.abbreviated || item.label);
    const values = data.map((item) => item.value);
    let datasetLabel = 'Count';
    let chartType = 'bar';

    if (type === 'financial') {
        datasetLabel = 'Revenue (PHP)';
        chartType = 'line';
    } else if (type === 'attendance' || type === 'performance') {
        datasetLabel = 'Average (%)';
    }

    reportChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels,
            datasets: [{
                label: datasetLabel,
                data: values,
                backgroundColor: chartType === 'line' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.8)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 2,
                borderRadius: chartType === 'bar' ? 8 : 0,
                fill: chartType === 'line',
                tension: chartType === 'line' ? 0.3 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#334155' } } },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#475569' }, grid: { color: '#e2e8f0' } },
                x: { ticks: { color: '#475569' }, grid: { display: false } }
            }
        }
    });
}

function statusBadge(statusText) {
    const status = String(statusText || '').toLowerCase();
    const colors = status === 'approved'
        ? 'bg-emerald-100 text-emerald-700'
        : status === 'pending'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-slate-100 text-slate-700';
    return `<span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors}">${statusText || '-'}</span>`;
}

function updateTable(type, data) {
    const thead = document.querySelector('#reportTable thead');
    const tbody = document.querySelector('#reportTable tbody');
    if (!thead || !tbody) return;

    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No data found for this period</td></tr>';
        return;
    }

    let headers = [];
    if (type === 'enrollment') headers = ['Date', 'Trainee', 'Course', 'Batch', 'Status'];
    else if (type === 'attendance') headers = ['Date', 'Batch', 'Total Students', 'Present', 'Absent'];
    else if (type === 'financial') headers = ['Date', 'Trainee', 'Amount', 'Method', 'Reference'];
    else if (type === 'performance') headers = ['Trainee', 'Course', 'Grade', 'Remarks', 'Date Recorded'];

    thead.innerHTML = `<tr>${headers.map((h) => `<th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">${h}</th>`).join('')}</tr>`;

    tbody.innerHTML = data.map((row) => {
        if (type === 'enrollment') {
            return `<tr>
                <td class="px-4 py-3 text-sm text-slate-700">${row.enrollment_date || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-800">${row.trainee || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${row.course_name || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${row.batch_name || '-'}</td>
                <td class="px-4 py-3 text-sm">${statusBadge(row.status)}</td>
            </tr>`;
        }
        if (type === 'attendance') {
            return `<tr>
                <td class="px-4 py-3 text-sm text-slate-700">${row.date_recorded || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-800">${row.batch_name || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${row.total_students || 0}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${row.present_count || 0}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${row.absent_count || 0}</td>
            </tr>`;
        }
        if (type === 'financial') {
            const amount = Number(row.amount || 0).toLocaleString();
            return `<tr>
                <td class="px-4 py-3 text-sm text-slate-700">${row.payment_date || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-800">${row.trainee || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-700">PHP ${amount}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${row.payment_method || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${row.reference_no || '-'}</td>
            </tr>`;
        }
        return `<tr>
            <td class="px-4 py-3 text-sm text-slate-800">${row.trainee || '-'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${row.course_name || '-'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${row.total_grade || '-'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${row.remarks || '-'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${row.date_recorded || '-'}</td>
        </tr>`;
    }).join('');
}
