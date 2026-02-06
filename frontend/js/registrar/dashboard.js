const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../../login.html';
        return;
    }

    if (user) {
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = user.username || 'Registrar';
    }

    loadDashboardData();
});

async function loadDashboardData() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/dashboard.php?action=dashboard-data`);
        if (response.data.success) {
            const data = response.data.data;
            updateStats(data.stats);
            renderCharts(data.charts);
            updateRecentEnrollments(data.recent_enrollments);
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
    // Enrollment by Course Chart
    const ctxEnrollment = document.getElementById('enrollmentChart');
    if (ctxEnrollment) {
        new Chart(ctxEnrollment, {
            type: 'bar',
            data: {
                labels: chartsData.by_course.labels,
                datasets: [{
                    label: 'Approved Enrollments',
                    data: chartsData.by_course.data,
                    backgroundColor: '#4e73df',
                    borderColor: '#4e73df',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }

    // Trend Chart
    const ctxTrend = document.getElementById('trendChart');
    if (ctxTrend) {
        new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: chartsData.trend.labels,
                datasets: [{
                    label: 'Enrollments',
                    data: chartsData.trend.data,
                    backgroundColor: 'rgba(28, 200, 138, 0.1)',
                    borderColor: '#1cc88a',
                    pointBackgroundColor: '#1cc88a',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#1cc88a',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }
}

function updateRecentEnrollments(enrollments) {
    const tbody = document.getElementById('recentEnrollmentsBody');
    tbody.innerHTML = '';

    enrollments.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.first_name} ${item.last_name}</td>
            <td>${item.course_name || 'N/A'}</td>
            <td>${item.batch_name || 'N/A'}</td>
            <td>${item.enrollment_date}</td>
            <td><span class="badge bg-${item.status === 'approved' ? 'success' : (item.status === 'pending' ? 'warning' : 'secondary')}">${item.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}