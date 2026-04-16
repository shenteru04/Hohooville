const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Add a request interceptor to include the auth token
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

const charts = {
    enrollmentByQualificationChart: null,
    enrollmentTrendChart: null,
    scholarshipDistributionChart: null,
    monthlyRevenueChart: null,
    attendanceTrendChart: null,
    competencyChart: null
};

document.addEventListener('DOMContentLoaded', () => {
    setupHeaderControls();
    loadDashboardData();

    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboardData);
    }
});

function setupHeaderControls() {
    const dropdownBtn = document.getElementById('userDropdown');
    const dropdownMenu = document.getElementById('userDropdownMenu');
    const logoutBtn = document.getElementById('logoutBtn');

    if (dropdownBtn && dropdownMenu) {
        dropdownBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            dropdownMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('#userDropdown') && !event.target.closest('#userDropdownMenu')) {
                dropdownMenu.classList.add('hidden');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (typeof logout === 'function') {
                logout();
                return;
            }
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            window.location.href = '/Hohoo-ville/frontend/login.html';
        });
    }
}

async function loadDashboardData() {
    const results = await Promise.allSettled([
        loadStatistics(),
        loadFinancialSummary(),
        loadEnrollmentStats(),
        loadAttendanceOverview(),
        loadCompetencyResults(),
        loadRecentActivities()
    ]);

    const rejected = results.find((result) => result.status === 'rejected');
    if (rejected) {
        console.error('Error loading dashboard data:', rejected.reason);
        const message = rejected.reason?.message || 'Unable to refresh dashboard data.';
        showToast(message, 'danger');
    }
}

async function loadStatistics() {
    const response = await apiClient.get('/role/admin/admin_dashboard.php?action=statistics');
    if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load dashboard statistics.');
    }

    const stats = response.data.data || {};
    setText('totalEnrolled', stats.total_enrolled || 0);
    setText('activeQualifications', stats.active_qualifications || 0);
    setText('trainerCount', stats.trainer_count || 0);
    setText('scheduledTrainings', stats.scheduled_trainings || 0);
    setText('pendingEnrollments', stats.pending_enrollments || 0);
    setText('completedThisYear', stats.completed_this_year || 0);
}

async function loadFinancialSummary() {
    const response = await apiClient.get('/role/admin/admin_dashboard.php?action=financial-summary');
    if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load financial summary.');
    }

    const data = response.data.data || {};
    const totalCollected = Number(data.total_collected || 0);
    const totalPending = Number(data.total_pending || 0);

    setText('totalCollected', `PHP ${totalCollected.toLocaleString()}`);
    setText('totalPending', `PHP ${totalPending.toLocaleString()}`);

    renderPieChart(
        'scholarshipDistributionChart',
        (data.scholarship_distribution || []).map((item) => item.scholarship_type || 'Unknown'),
        (data.scholarship_distribution || []).map((item) => Number(item.count || 0)),
        'Scholarships'
    );

    renderLineChart(
        'monthlyRevenueChart',
        (data.monthly_revenue || []).map((item) => item.month || ''),
        (data.monthly_revenue || []).map((item) => Number(item.revenue || 0)),
        'Monthly Revenue (PHP)',
        '#2563eb'
    );
}

async function loadEnrollmentStats() {
    const response = await apiClient.get('/role/admin/admin_dashboard.php?action=enrollment-stats');
    if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load enrollment stats.');
    }

    const data = response.data.data || {};

    renderBarChart(
        'enrollmentByQualificationChart',
        (data.by_qualification || []).map((item) => item.abbreviated || item.title || 'Untitled'),
        (data.by_qualification || []).map((item) => Number(item.count || 0)),
        'Enrolled Trainees',
        '#2563eb'
    );

    renderLineChart(
        'enrollmentTrendChart',
        (data.monthly_trend || []).map((item) => item.month || ''),
        (data.monthly_trend || []).map((item) => Number(item.count || 0)),
        'Enrollments',
        '#0ea5e9'
    );

    const tbody = document.getElementById('batchTableBody');
    if (!tbody) return;

    const batches = data.by_batch || [];
    tbody.innerHTML = '';
    if (!batches.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-6 text-center text-sm text-slate-500">No batch data found.</td></tr>';
        return;
    }

    batches.forEach((batch) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        tr.innerHTML = `
            <td class="px-4 py-3 text-slate-700">${escapeHtml(batch.batch_name || '-')}</td>
            <td class="px-4 py-3 text-slate-700">${Number(batch.trainee_count || 0)}</td>
            <td class="px-4 py-3">
                <span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">${escapeHtml(batch.status || 'N/A')}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadAttendanceOverview() {
    const response = await apiClient.get('/role/admin/admin_dashboard.php?action=attendance-overview');
    if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load attendance overview.');
    }

    const data = response.data.data || {};
    const overallRate = Number(data.overall?.attendance_rate || 0);
    setText('overallAttendanceRate', `${overallRate.toFixed(1)}%`);

    renderLineChart(
        'attendanceTrendChart',
        (data.daily_trend || []).map((item) => item.date || ''),
        (data.daily_trend || []).map((item) => Number(item.rate || 0)),
        'Attendance Rate (%)',
        '#16a34a'
    );

    const tbody = document.getElementById('batchAttendanceTableBody');
    if (!tbody) return;

    const attendanceByBatch = data.by_batch || [];
    tbody.innerHTML = '';
    if (!attendanceByBatch.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-slate-500">No attendance data found.</td></tr>';
        return;
    }

    attendanceByBatch.forEach((batch) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        tr.innerHTML = `
            <td class="px-4 py-3 text-slate-700">${escapeHtml(batch.batch_code || '-')}</td>
            <td class="px-4 py-3 text-slate-700">${Number(batch.total_records || 0)}</td>
            <td class="px-4 py-3 text-slate-700">${Number(batch.present || 0)}</td>
            <td class="px-4 py-3 text-slate-700">${Number(batch.rate || 0).toFixed(1)}%</td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadCompetencyResults() {
    const response = await apiClient.get('/role/admin/admin_dashboard.php?action=competency-results');
    if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load competency results.');
    }

    const overview = response.data.data?.overview || {};
    renderBarChart(
        'competencyChart',
        overview.abbreviations || overview.labels || [],
        (overview.scores || []).map((score) => Number(score || 0)),
        'Avg Competency Score',
        '#06b6d4'
    );
}

async function loadRecentActivities() {
    const response = await apiClient.get('/role/admin/admin_dashboard.php?action=recent-activities');
    if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load recent activities.');
    }

    const tbody = document.getElementById('recentActivitiesBody');
    if (!tbody) return;

    const activities = response.data.data || [];
    tbody.innerHTML = '';
    if (!activities.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-6 text-center text-sm text-slate-500">No recent activities found.</td></tr>';
        return;
    }

    activities.forEach((log) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        const fullName = `${log.first_name || ''} ${log.last_name || ''}`.trim() || 'System';
        tr.innerHTML = `
            <td class="px-4 py-3 text-slate-700">${escapeHtml(fullName)}</td>
            <td class="px-4 py-3">
                <span class="inline-flex items-center rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700">${escapeHtml(log.action || 'Activity')}</span>
            </td>
            <td class="px-4 py-3 text-slate-700">${formatDateTime(log.created_at)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderBarChart(canvasId, labels, data, datasetLabel, color = '#2563eb') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    destroyChart(canvasId);
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: datasetLabel,
                data,
                backgroundColor: color,
                borderRadius: 8,
                maxBarThickness: 44
            }]
        },
        options: commonChartOptions()
    });
}

function renderLineChart(canvasId, labels, data, datasetLabel, color = '#2563eb') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    destroyChart(canvasId);
    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: datasetLabel,
                data,
                borderColor: color,
                backgroundColor: withOpacity(color, 0.15),
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 4
            }]
        },
        options: commonChartOptions()
    });
}

function renderPieChart(canvasId, labels, data, datasetLabel) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    destroyChart(canvasId);
    charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                label: datasetLabel,
                data,
                borderWidth: 1,
                backgroundColor: ['#2563eb', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6']
            }]
        },
        options: {
            ...commonChartOptions(),
            plugins: {
                ...commonChartOptions().plugins,
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { boxWidth: 14, color: '#334155' }
                }
            }
        }
    });
}

function commonChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#334155' }
            }
        },
        scales: {
            x: {
                ticks: { color: '#64748b' },
                grid: { color: 'rgba(148, 163, 184, 0.16)' }
            },
            y: {
                beginAtZero: true,
                ticks: { color: '#64748b' },
                grid: { color: 'rgba(148, 163, 184, 0.16)' }
            }
        }
    };
}

function destroyChart(canvasId) {
    if (charts[canvasId]) {
        charts[canvasId].destroy();
        charts[canvasId] = null;
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function formatDateTime(value) {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function withOpacity(hex, opacity) {
    const sanitized = hex.replace('#', '');
    const bigint = Number.parseInt(sanitized, 16);
    if (Number.isNaN(bigint)) return 'rgba(37, 99, 235, 0.15)';
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function showToast(message, type = 'info') {
    const containerId = 'adminDashboardToastContainer';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'fixed right-4 top-20 z-[9999] flex w-[min(92vw,28rem)] flex-col gap-2';
        document.body.appendChild(container);
    }

    const typeClasses = {
        info: 'border-blue-200 bg-blue-50 text-blue-800',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        danger: 'border-rose-200 bg-rose-50 text-rose-800'
    };

    const toast = document.createElement('div');
    toast.className = `rounded-lg border px-4 py-3 text-sm shadow-sm transition-all ${typeClasses[type] || typeClasses.info}`;
    toast.innerHTML = `
        <div class="flex items-start justify-between gap-3">
            <p>${escapeHtml(message)}</p>
            <button type="button" class="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
                <i class="fas fa-times text-xs"></i>
            </button>
        </div>
    `;

    const removeToast = () => {
        toast.classList.add('opacity-0', 'translate-x-2');
        setTimeout(() => toast.remove(), 180);
    };

    toast.querySelector('button')?.addEventListener('click', removeToast);
    container.appendChild(toast);
    setTimeout(removeToast, 4500);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
