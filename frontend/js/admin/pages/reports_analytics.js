const API_BASE = `${window.location.origin}/Hohoo-ville/api/role/admin`;
const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;
const chartStore = {};
let reportChart = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function () {
    await ensureSwal();
    initUserDropdown();
    initLogout();
    initTabNavigation();
    initDateDefaults();
    initEventListeners();
    
    // Load initial analytics data
    await loadAllAnalytics();
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

function initTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Deactivate all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Activate selected tab
            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
}

function initDateDefaults() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), 0, 1);
    const startDateEl = document.getElementById('startDate');
    const endDateEl = document.getElementById('endDate');
    
    if (startDateEl) startDateEl.valueAsDate = firstDay;
    if (endDateEl) endDateEl.valueAsDate = today;
}

function initEventListeners() {
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateReport);
    }

    const exportBtn = document.getElementById('exportReportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const activeTab = document.querySelector('.tab-content.active');
            const tableId = activeTab.id === 'custom-reports' ? 'reportTable' : 'dropoutTableMain';
            const type = document.getElementById('reportType')?.value || 'reports_analytics';
            const filename = `admin_${type}`;
            if (typeof window.exportTableToExcel === 'function') {
                window.exportTableToExcel(tableId, filename);
            } else {
                alert('Export is not available.');
            }
        });
    }

    const exportCustomBtn = document.getElementById('exportCustomBtn');
    if (exportCustomBtn) {
        exportCustomBtn.addEventListener('click', () => {
            const type = document.getElementById('reportType')?.value || 'report';
            const filename = `admin_${type}_report`;
            if (typeof window.exportTableToExcel === 'function') {
                window.exportTableToExcel('reportTable', filename);
            } else {
                alert('Export is not available.');
            }
        });
    }
}

// ===== LOAD ALL ANALYTICS =====
async function loadAllAnalytics() {
    await Promise.all([
        loadCompletionRates(),
        loadModulePerformance(),
        loadEnrollmentTrends(),
        loadDropoutAnalysis(),
        loadTrainerPerformance(),
        loadDemographics()
    ]);
}

// ===== REPORT GENERATION =====
async function generateReport() {
    const type = document.getElementById('reportType').value;
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    if (!start || !end) {
        if (window.Swal) {
            Swal.fire('Error', 'Please select both start and end dates', 'error');
        } else {
            alert('Please select both start and end dates');
        }
        return;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/reports.php`, {
            params: { type, start_date: start, end_date: end }
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to generate report');
        }
        updateReportChart(type, response.data.chart || []);
        updateReportTable(type, response.data.table || []);
    } catch (error) {
        console.error('Error generating report:', error);
        if (window.Swal) {
            Swal.fire('Error', error.message || 'Failed to generate report', 'error');
        } else {
            alert(error.message || 'Failed to generate report');
        }
    }
}

// ===== CHART FUNCTIONS =====
function destroyChart(id) {
    if (chartStore[id]) {
        chartStore[id].destroy();
        delete chartStore[id];
    }
}

function renderChart(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    destroyChart(id);
    chartStore[id] = new Chart(ctx, config);
}

function setChartOverlay(canvasId, show, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const overlay = container.querySelector('.chart-overlay');
    if (!overlay) return;
    overlay.textContent = message;
    overlay.style.display = show ? 'flex' : 'none';
}

// ===== FORMATTING UTILITIES =====
function formatNumber(value) {
    if (value === null || value === undefined || value === '') return '-';
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return new Intl.NumberFormat('en-US').format(num);
}

function formatPercent(value, decimals = 1) {
    if (value === null || value === undefined || value === '') return '-';
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return `${num.toFixed(decimals)}%`;
}

function formatScore(value) {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return num.toFixed(1);
}

function formatMonthLabel(value) {
    if (!value) return value;
    const parts = String(value).split('-');
    if (parts.length < 2) return value;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthIndex < 0 || monthIndex > 11) return value;
    return `${months[monthIndex]} ${year}`;
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

function setTableBody(tbodyId, rowsHtml, emptyMessage) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const table = tbody.closest('table');
    const colCount = table && table.tHead && table.tHead.rows[0] ? table.tHead.rows[0].cells.length : 1;
    if (!rowsHtml) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="px-4 py-6 text-center text-sm text-slate-500">${emptyMessage}</td></tr>`;
        return;
    }
    tbody.innerHTML = rowsHtml;
}

// ===== COMPLETION RATES =====
async function loadCompletionRates() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=completion-rates`);
        const data = response.data.success ? response.data.data : [];
        if (!Array.isArray(data) || data.length === 0) {
            destroyChart('completionChart');
            setChartOverlay('completionChart', true, 'No completion data yet.');
            return;
        }
        setChartOverlay('completionChart', false, '');
        const labels = data.map(d => d.abbreviated || d.qualification_name);
        const values = data.map(d => Number(d.completion_rate || 0));
        renderChart('completionChart', {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Completion Rate (%)',
                    data: values,
                    backgroundColor: 'rgba(78, 115, 223, 0.8)',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: value => `${value}%` } }
                }
            }
        });
    } catch (error) {
        console.error('Error loading completion rates:', error);
        destroyChart('completionChart');
        setChartOverlay('completionChart', true, 'Unable to load completion data.');
    }
}

// ===== MODULE PERFORMANCE =====
async function loadModulePerformance() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=module-performance`);
        const data = response.data.success ? response.data.data : [];
        if (!Array.isArray(data) || data.length === 0) {
            destroyChart('moduleChart');
            setChartOverlay('moduleChart', true, 'No module performance data yet.');
            return;
        }
        setChartOverlay('moduleChart', false, '');
        const labels = data.map(d => d.module_title);
        const values = data.map(d => Number(d.competency_rate || 0));
        renderChart('moduleChart', {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Competency Rate (%)',
                    data: values,
                    backgroundColor: 'rgba(28, 200, 138, 0.8)',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: value => `${value}%` } }
                }
            }
        });
    } catch (error) {
        console.error('Error loading module performance:', error);
        destroyChart('moduleChart');
        setChartOverlay('moduleChart', true, 'Unable to load module performance.');
    }
}

// ===== ENROLLMENT TRENDS =====
async function loadEnrollmentTrends() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=enrollment-trends`);
        const data = response.data.success ? response.data.data : [];
        if (!Array.isArray(data) || data.length === 0) {
            destroyChart('trendChart');
            setChartOverlay('trendChart', true, 'No enrollment trend data yet.');
            return;
        }
        setChartOverlay('trendChart', false, '');
        const labels = data.map(d => formatMonthLabel(d.month));
        const approved = data.map(d => Number(d.approved || 0));
        const pending = data.map(d => Number(d.pending || 0));
        const completed = data.map(d => Number(d.completed || 0));

        renderChart('trendChart', {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Approved',
                        data: approved,
                        borderColor: '#1cc88a',
                        backgroundColor: 'rgba(28, 200, 138, 0.15)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Pending',
                        data: pending,
                        borderColor: '#f6c23e',
                        backgroundColor: 'rgba(246, 194, 62, 0.12)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Completed',
                        data: completed,
                        borderColor: '#4e73df',
                        backgroundColor: 'rgba(78, 115, 223, 0.12)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true } }
            }
        });
    } catch (error) {
        console.error('Error loading enrollment trends:', error);
        destroyChart('trendChart');
        setChartOverlay('trendChart', true, 'Unable to load enrollment trends.');
    }
}

// ===== DROPOUT ANALYSIS =====
async function loadDropoutAnalysis() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=dropout-analysis`);
        const data = response.data.success ? response.data.data : [];
        if (!Array.isArray(data) || data.length === 0) {
            setTableBody('dropoutTable', '', 'No dropout data available.');
            return;
        }
        const rows = data.map(d => `
            <tr>
                <td class="px-3 py-3 text-sm text-slate-700">${formatMonthLabel(d.month)}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${formatNumber(d.enrolled)}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${formatPercent(d.dropout_rate, 1)}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${formatNumber(d.completed)}</td>
            </tr>
        `).join('');
        setTableBody('dropoutTable', rows, 'No dropout data available.');
    } catch (error) {
        console.error('Error loading dropout analysis:', error);
        setTableBody('dropoutTable', '', 'Unable to load dropout data.');
    }
}

// ===== TRAINER PERFORMANCE =====
async function loadTrainerPerformance() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=trainer-performance`);
        const data = response.data.success ? response.data.data : [];
        if (!Array.isArray(data) || data.length === 0) {
            setTableBody('trainerTable', '', 'No trainer performance data available.');
            return;
        }
        const rows = data.map(d => `
            <tr>
                <td class="px-3 py-3 text-sm text-slate-800">${d.trainer_name || 'Unknown'}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${formatNumber(d.total_trainees)}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${formatScore(d.avg_trainee_score)}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${formatPercent(d.competency_rate || 0, 1)}</td>
            </tr>
        `).join('');
        setTableBody('trainerTable', rows, 'No trainer performance data available.');
    } catch (error) {
        console.error('Error loading trainer performance:', error);
        setTableBody('trainerTable', '', 'Unable to load trainer performance.');
    }
}

// ===== DEMOGRAPHICS =====
async function loadDemographics() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=demographic-analysis`);
        const data = response.data.success ? response.data.data : null;
        if (!data) {
            destroyChart('genderChart');
            destroyChart('batchChart');
            setChartOverlay('genderChart', true, 'No gender data yet.');
            setChartOverlay('batchChart', true, 'No batch distribution data yet.');
            return;
        }

        if (Array.isArray(data.gender) && data.gender.length > 0) {
            setChartOverlay('genderChart', false, '');
            renderChart('genderChart', {
                type: 'doughnut',
                data: {
                    labels: data.gender.map(d => d.sex || 'Unknown'),
                    datasets: [{
                        data: data.gender.map(d => Number(d.count || 0)),
                        backgroundColor: ['#4e73df', '#e83e8c', '#36b9cc', '#f6c23e']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
            });
        } else {
            destroyChart('genderChart');
            setChartOverlay('genderChart', true, 'No gender data yet.');
        }

        if (Array.isArray(data.batches) && data.batches.length > 0) {
            setChartOverlay('batchChart', false, '');
            renderChart('batchChart', {
                type: 'bar',
                data: {
                    labels: data.batches.map(d => d.batch_name),
                    datasets: [{
                        label: 'Trainees',
                        data: data.batches.map(d => Number(d.trainee_count || 0)),
                        backgroundColor: 'rgba(54, 185, 204, 0.8)',
                        borderRadius: 8
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        } else {
            destroyChart('batchChart');
            setChartOverlay('batchChart', true, 'No batch distribution data yet.');
        }
    } catch (error) {
        console.error('Error loading demographics:', error);
        destroyChart('genderChart');
        destroyChart('batchChart');
        setChartOverlay('genderChart', true, 'Unable to load gender data.');
        setChartOverlay('batchChart', true, 'Unable to load batch data.');
    }
}

// ===== REPORT CHART & TABLE =====
function updateReportChart(type, data) {
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

    // Update Report Summary
    updateReportSummary(type, data);
}

function updateReportTable(type, data) {
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

// ===== REPORT SUMMARY =====
function updateReportSummary(type, data) {
    const startDate = document.getElementById('startDate')?.value || '-';
    const endDate = document.getElementById('endDate')?.value || '-';
    
    // Total Records
    const totalRecords = Array.isArray(data) ? data.length : 0;
    const totalEl = document.getElementById('reportTotalRecords');
    if (totalEl) totalEl.textContent = formatNumber(totalRecords);
    
    // Date Range
    const dateRangeEl = document.getElementById('reportDateRange');
    if (dateRangeEl) {
        if (startDate && endDate) {
            dateRangeEl.textContent = `${startDate} to ${endDate}`;
        } else {
            dateRangeEl.textContent = '-';
        }
    }
    
    // Report Type
    const typeSelect = document.getElementById('reportType');
    const reportTypeEl = document.getElementById('reportTypeDisplay');
    if (reportTypeEl && typeSelect) {
        const selectedOption = typeSelect.options[typeSelect.selectedIndex];
        reportTypeEl.textContent = selectedOption.text;
    }
    
    // Last Generated
    const generatedEl = document.getElementById('reportLastGenerated');
    if (generatedEl) {
        const now = new Date();
        generatedEl.textContent = now.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}
