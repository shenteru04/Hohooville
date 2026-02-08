// API Configuration
const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

// Axios Instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Chart Instances
let enrollmentChart = null;
let trendChart = null;
let scholarshipChart = null;
let revenueChart = null;
let attendanceChart = null;
let competencyChart = null;

document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboardData);
    }

    // Inject Sidebar CSS (W3.CSS Reference Style)
    const ms = document.createElement('style');
    ms.innerHTML = `
        #sidebar {
            width: 200px;
            position: fixed;
            z-index: 1050;
            top: 0;
            left: 0;
            height: 100vh;
            overflow-y: auto;
            background-color: #fff;
            box-shadow: 0 2px 5px 0 rgba(0,0,0,0.16), 0 2px 10px 0 rgba(0,0,0,0.12);
            display: block;
        }
        .main-content, #content, .content-wrapper {
            margin-left: 200px !important;
            transition: margin-left .4s;
        }
        #sidebarCloseBtn {
            display: none;
            width: 100%;
            text-align: left;
            padding: 8px 16px;
            background: none;
            border: none;
            font-size: 18px;
        }
        #sidebarCloseBtn:hover { background-color: #ccc; }
        
        @media (max-width: 991.98px) {
            #sidebar { display: none; }
            .main-content, #content, .content-wrapper { margin-left: 0 !important; }
            #sidebarCloseBtn { display: block; }
        }
        .table-responsive, table { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    `;
    document.head.appendChild(ms);

    // Sidebar Logic
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (!document.getElementById('sidebarCloseBtn')) {
            const closeBtn = document.createElement('button');
            closeBtn.id = 'sidebarCloseBtn';
            closeBtn.innerHTML = 'Close &times;';
            closeBtn.addEventListener('click', () => {
                sidebar.style.display = 'none';
            });
            sidebar.insertBefore(closeBtn, sidebar.firstChild);
        }
    }

    // Open Button Logic
    let sc = document.getElementById('sidebarCollapse');
    if (!sc) {
        const nb = document.querySelector('.navbar');
        if (nb) {
            const c = nb.querySelector('.container-fluid') || nb;
            const b = document.createElement('button');
            b.id = 'sidebarCollapse';
            b.className = 'btn btn-outline-primary me-2 d-lg-none';
            b.type = 'button';
            b.innerHTML = '&#9776;';
            c.insertBefore(b, c.firstChild);
            sc = b;
        }
    }
    if (sc) {
        const nb = sc.cloneNode(true);
        if(sc.parentNode) sc.parentNode.replaceChild(nb, sc);
        nb.addEventListener('click', () => {
            if (sidebar) sidebar.style.display = 'block';
        });
    }
});

async function loadDashboardData() {
    try {
        await Promise.all([
            loadStatistics(),
            loadFinancialSummary(),
            loadEnrollmentStats(),
            loadAttendanceOverview(),
            loadCompetencyResults(),
            loadRecentActivities()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadStatistics() {
    try {
        const response = await apiClient.get('/role/admin/admin_dashboard.php?action=statistics');
        if (response.data.success) {
            const stats = response.data.data;
            document.getElementById('totalEnrolled').textContent = stats.total_enrolled || 0;
            document.getElementById('activeQualifications').textContent = stats.active_qualifications || 0;
            document.getElementById('trainerCount').textContent = stats.trainer_count || 0;
            document.getElementById('scheduledTrainings').textContent = stats.scheduled_trainings || 0;
            document.getElementById('pendingEnrollments').textContent = stats.pending_enrollments || 0;
            document.getElementById('completedThisYear').textContent = stats.completed_this_year || 0;
        }
    } catch (error) {
        console.error('Stats Error:', error);
    }
}

async function loadFinancialSummary() {
    try {
        const response = await apiClient.get('/role/admin/admin_dashboard.php?action=financial-summary');
        if (response.data.success) {
            const data = response.data.data;
            
            // Update Cards
            document.getElementById('totalCollected').textContent = '₱' + parseFloat(data.total_collected || 0).toLocaleString();
            document.getElementById('totalPending').textContent = '₱' + parseFloat(data.total_pending || 0).toLocaleString();

            // Scholarship Chart
            renderPieChart('scholarshipDistributionChart', scholarshipChart, 
                (data.scholarship_distribution || []).map(i => i.scholarship_type),
                (data.scholarship_distribution || []).map(i => i.count),
                'Scholarships'
            );

            // Revenue Chart
            renderLineChart('monthlyRevenueChart', revenueChart,
                (data.monthly_revenue || []).map(i => i.month),
                (data.monthly_revenue || []).map(i => i.revenue),
                'Monthly Revenue (₱)'
            );
        }
    } catch (error) {
        console.error('Financial Error:', error);
    }
}

async function loadEnrollmentStats() {
    try {
        const response = await apiClient.get('/role/admin/admin_dashboard.php?action=enrollment-stats');
        if (response.data.success) {
            const data = response.data.data;

            // By Qualification Chart
            renderBarChart('enrollmentByQualificationChart', enrollmentChart,
                (data.by_qualification || []).map(i => i.title),
                (data.by_qualification || []).map(i => i.count),
                'Enrolled Trainees'
            );

            // Trend Chart
            renderLineChart('enrollmentTrendChart', trendChart,
                (data.monthly_trend || []).map(i => i.month),
                (data.monthly_trend || []).map(i => i.count),
                'Enrollments'
            );

            // Batch Table
            const tbody = document.getElementById('batchTableBody');
            tbody.innerHTML = '';
            (data.by_batch || []).forEach(batch => {
                tbody.innerHTML += `
                    <tr>
                        <td>${batch.batch_name}</td>
                        <td>${batch.trainee_count}</td>
                        <td>${batch.status}</td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Enrollment Stats Error:', error);
    }
}

async function loadAttendanceOverview() {
    try {
        const response = await apiClient.get('/role/admin/admin_dashboard.php?action=attendance-overview');
        if (response.data.success) {
            const data = response.data.data;

            // Overall Rate
            const rate = parseFloat(data.overall?.attendance_rate || 0).toFixed(1);
            document.getElementById('overallAttendanceRate').textContent = rate + '%';

            // Trend Chart
            renderLineChart('attendanceTrendChart', attendanceChart,
                (data.daily_trend || []).map(i => i.date),
                (data.daily_trend || []).map(i => i.rate),
                'Attendance Rate (%)',
                '#28a745'
            );

            // Batch Attendance Table
            const tbody = document.getElementById('batchAttendanceTableBody');
            tbody.innerHTML = '';
            (data.by_batch || []).forEach(batch => {
                tbody.innerHTML += `
                    <tr>
                        <td>${batch.batch_code}</td>
                        <td>${batch.total_records}</td>
                        <td>${batch.present}</td>
                        <td>${parseFloat(batch.rate).toFixed(1)}%</td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Attendance Error:', error);
    }
}

async function loadCompetencyResults() {
    try {
        const response = await apiClient.get('/role/admin/admin_dashboard.php?action=competency-results');
        if (response.data.success) {
            const data = response.data.data;
            
            // Competency Overview Chart
            renderBarChart('competencyChart', competencyChart,
                data.overview?.labels || [],
                data.overview?.scores || [],
                'Avg Competency Score',
                '#17a2b8'
            );
        }
    } catch (error) {
        console.error('Competency Error:', error);
    }
}

async function loadRecentActivities() {
    try {
        const response = await apiClient.get('/role/admin/admin_dashboard.php?action=recent-activities');
        if (response.data.success) {
            const tbody = document.getElementById('recentActivitiesBody');
            tbody.innerHTML = '';
            
            const activities = response.data.data || [];
            if (activities.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No recent activities found.</td></tr>';
                return;
            }

            activities.forEach(log => {
                tbody.innerHTML += `
                    <tr>
                        <td>${log.first_name} ${log.last_name}</td>
                        <td><span class="badge bg-info text-dark">${log.action}</span></td>
                        <td>${new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Activities Error:', error);
    }
}

// --- Chart Helper Functions ---

function renderBarChart(canvasId, chartInstance, labels, data, label, color = '#007bff') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: color,
                borderWidth: 1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderLineChart(canvasId, chartInstance, labels, data, label, color = '#007bff') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: color,
                tension: 0.1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderPieChart(canvasId, chartInstance, labels, data, label) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: [
                    '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'
                ],
                hoverOffset: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}