// API Configuration
const API_BASE_URL = 'http://localhost/hohoo-ville/api';

// Axios Instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Chart Instances
let enrollmentChart = null;
let trendChart = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check auth (Simple check)
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../../../../login.html';
        return;
    }
    
    if (document.getElementById('userName')) {
        document.getElementById('userName').textContent = user.username || 'Registrar';
    }

    loadDashboardData();

    // Sidebar toggle
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('d-none');
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboardData);
    }

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/Hohoo-ville/frontend/login.html';
        });
    }
});

async function loadDashboardData() {
    try {
        const response = await apiClient.get('/role/registrar/dashboard.php?action=dashboard-data');
        if (response.data.success) {
            const data = response.data.data;
            updateStatistics(data.stats);
            renderCharts(data.charts);
            updateRecentEnrollments(data.recent_enrollments);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateStatistics(stats) {
    if (!stats) return;
    document.getElementById('totalTrainees').textContent = stats.total_trainees || 0;
    document.getElementById('pendingEnrollments').textContent = stats.pending_enrollments || 0;
    document.getElementById('activeBatches').textContent = stats.active_batches || 0;
    document.getElementById('totalCourses').textContent = stats.total_courses || 0;
}

function renderCharts(chartsData) {
    if (!chartsData) return;

    // Enrollment by Course (Bar Chart)
    const ctxEnrollment = document.getElementById('enrollmentChart');
    if (ctxEnrollment) {
        if (enrollmentChart) enrollmentChart.destroy();
        enrollmentChart = new Chart(ctxEnrollment, {
            type: 'bar',
            data: {
                labels: chartsData.by_course.labels,
                datasets: [{
                    label: 'Enrolled Trainees',
                    data: chartsData.by_course.data,
                    backgroundColor: '#0d6efd'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Monthly Trend (Line Chart)
    const ctxTrend = document.getElementById('trendChart');
    if (ctxTrend) {
        if (trendChart) trendChart.destroy();
        trendChart = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: chartsData.trend.labels,
                datasets: [{
                    label: 'New Enrollments',
                    data: chartsData.trend.data,
                    borderColor: '#198754',
                    tension: 0.1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

function updateRecentEnrollments(enrollments) {
    const tbody = document.getElementById('recentEnrollmentsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (!enrollments || enrollments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No recent enrollments</td></tr>';
        return;
    }

    enrollments.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.first_name} ${item.last_name}</td>
                <td>${item.course_name}</td>
                <td>${item.batch_name || 'N/A'}</td>
                <td>${item.enrollment_date}</td>
                <td><span class="badge bg-${item.status === 'approved' ? 'success' : (item.status === 'pending' ? 'warning' : 'secondary')}">${item.status}</span></td>
            </tr>
        `;
    });
}