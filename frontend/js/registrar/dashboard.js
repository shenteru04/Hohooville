const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
let enrollmentChartInstance = null;
let trendChartInstance = null;

document.addEventListener('DOMContentLoaded', function () {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../../login.html';
        return;
    }

    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.full_name || user.name || user.username || 'Registrar';
        userNameEl.textContent = displayName;
    }

    initSidebar();
    initUserDropdown();
    initLogout();
    loadDashboardData();
});

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    if (!sidebar) return;

    function openSidebar() {
        sidebar.classList.remove('-translate-x-full');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('hidden');
            requestAnimationFrame(() => sidebarOverlay.classList.remove('opacity-0'));
        }
        document.body.classList.add('overflow-hidden');
    }

    function closeSidebar() {
        sidebar.classList.add('-translate-x-full');
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
        }
        document.body.classList.remove('overflow-hidden');
    }

    function toggleSidebar() {
        if (sidebar.classList.contains('-translate-x-full')) openSidebar();
        else closeSidebar();
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', toggleSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden', 'opacity-0');
            document.body.classList.remove('overflow-hidden');
        }
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
        if (!event.target.closest('#userDropdownMenu') && !event.target.closest('#userDropdown')) {
            menu.classList.add('hidden');
        }
    });
}

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../../login.html';
    });
}

async function loadDashboardData() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/dashboard.php?action=dashboard-data`);
        if (response.data.success) {
            const data = response.data.data;
            updateStats(data.stats || {});
            renderCharts(data.charts || { by_course: { labels: [], data: [] }, trend: { labels: [], data: [] } });
            updateRecentEnrollments(data.recent_enrollments || []);
        } else {
            console.error('Failed to load dashboard data:', response.data.message);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateStats(stats) {
    document.getElementById('totalTrainees').textContent = stats.total_trainees || 0;
    document.getElementById('pendingEnrollments').textContent = stats.pending_enrollments || 0;
    document.getElementById('activeBatches').textContent = stats.active_batches || 0;
    document.getElementById('totalCourses').textContent = stats.total_courses || 0;
}

function renderCharts(chartsData) {
    const byCourse = chartsData.by_course || { labels: [], data: [] };
    const trend = chartsData.trend || { labels: [], data: [] };

    const ctxEnrollment = document.getElementById('enrollmentChart');
    if (ctxEnrollment) {
        if (enrollmentChartInstance) enrollmentChartInstance.destroy();
        enrollmentChartInstance = new Chart(ctxEnrollment, {
            type: 'bar',
            data: {
                labels: (byCourse.abbreviations || byCourse.labels) || [],
                datasets: [{
                    label: 'Approved Enrollments',
                    data: byCourse.data || [],
                    backgroundColor: '#2563eb',
                    borderColor: '#2563eb',
                    borderWidth: 1,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#334155' } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0, color: '#475569' },
                        grid: { color: '#e2e8f0' }
                    },
                    x: {
                        ticks: { color: '#475569' },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    const ctxTrend = document.getElementById('trendChart');
    if (ctxTrend) {
        if (trendChartInstance) trendChartInstance.destroy();
        trendChartInstance = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: trend.labels || [],
                datasets: [{
                    label: 'Enrollments',
                    data: trend.data || [],
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    borderColor: '#2563eb',
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#2563eb',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#334155' } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0, color: '#475569' },
                        grid: { color: '#e2e8f0' }
                    },
                    x: {
                        ticks: { color: '#475569' },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

function updateRecentEnrollments(enrollments) {
    const tbody = document.getElementById('recentEnrollmentsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!Array.isArray(enrollments) || !enrollments.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No recent enrollments.</td></tr>';
        return;
    }

    enrollments.forEach(item => {
        const row = document.createElement('tr');
        const status = String(item.status || '').toLowerCase();
        let statusClass = 'bg-slate-100 text-slate-700';
        if (status === 'approved') statusClass = 'bg-emerald-100 text-emerald-700';
        else if (status === 'pending') statusClass = 'bg-amber-100 text-amber-700';
        else if (status === 'rejected') statusClass = 'bg-rose-100 text-rose-700';

        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-slate-800">${item.first_name || ''} ${item.last_name || ''}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${item.course_name || 'N/A'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${item.batch_name || 'N/A'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${item.enrollment_date || 'N/A'}</td>
            <td class="px-4 py-3 text-sm">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass}">${item.status || 'unknown'}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
}
