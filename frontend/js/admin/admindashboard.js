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
            document.getElementById('totalEnrolled').textContent = stats.total_enrolled;
            document.getElementById('activeQualifications').textContent = stats.active_qualifications;
            document.getElementById('trainerCount').textContent = stats.trainer_count;
            document.getElementById('scheduledTrainings').textContent = stats.scheduled_trainings;
            document.getElementById('pendingEnrollments').textContent = stats.pending_enrollments;
            document.getElementById('completedThisYear').textContent = stats.completed_this_year;
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
            document.getElementById('totalCollected').textContent = '₱' + parseFloat(data.total_collected).toLocaleString();
            document.getElementById('totalPending').textContent = '₱' + parseFloat(data.total_pending).toLocaleString();

            // Scholarship Chart
            renderPieChart('scholarshipDistributionChart', scholarshipChart, 
                data.scholarship_distribution.map(i => i.scholarship_type),
                data.scholarship_distribution.map(i => i.count),
                'Scholarships'
            );

            // Revenue Chart
            renderLineChart('monthlyRevenueChart', revenueChart,
                data.monthly_revenue.map(i => i.month),
                data.monthly_revenue.map(i => i.revenue),
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
                data.by_qualification.map(i => i.title),
                data.by_qualification.map(i => i.count),
                'Enrolled Trainees'
            );

            // Trend Chart
            renderLineChart('enrollmentTrendChart', trendChart,
                data.monthly_trend.map(i => i.month),
                data.monthly_trend.map(i => i.count),
                'Enrollments'
            );

            // Batch Table
            const tbody = document.getElementById('batchTableBody');
            tbody.innerHTML = '';
            data.by_batch.forEach(batch => {
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
            const rate = parseFloat(data.overall.attendance_rate || 0).toFixed(1);
            document.getElementById('overallAttendanceRate').textContent = rate + '%';

            // Trend Chart
            renderLineChart('attendanceTrendChart', attendanceChart,
                data.daily_trend.map(i => i.date),
                data.daily_trend.map(i => i.rate),
                'Attendance Rate (%)',
                '#28a745'
            );

            // Batch Attendance Table
            const tbody = document.getElementById('batchAttendanceTableBody');
            tbody.innerHTML = '';
            data.by_batch.forEach(batch => {
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
                data.overview.labels,
                data.overview.scores,
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
            
            response.data.data.forEach(log => {
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