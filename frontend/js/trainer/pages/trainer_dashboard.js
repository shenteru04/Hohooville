// API Configuration
const API_BASE_URL = 'http://localhost/hohoo-ville/api';

// Axios Instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Chart Instances
let moduleChart = null;
let gradesChart = null;

document.addEventListener('DOMContentLoaded', async function() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = '../../login.html';
        return;
    }

    try {
        const response = await apiClient.get(`/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            loadDashboardData(response.data.data.trainer_id);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
    }

    // Sidebar toggle
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('d-none');
        });
    }

    // Remove Attendance and Grading pages from sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        const links = sidebar.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href') || '';
            if (href.includes('attendance') || href.includes('grading') || href.includes('my_trainees.html')) {
                const parent = link.closest('li') || link;
                parent.remove();
            }
        });


    }

    // Logout
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

async function loadDashboardData(trainerId) {
    try {
        await Promise.all([
            loadStatistics(trainerId),
            loadModulePerformance(trainerId),
            loadSchedule(trainerId)
        ]);
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadStatistics(trainerId) {
    try {
        const response = await apiClient.get(`/role/trainer/trainer_dashboard.php?action=statistics&trainer_id=${trainerId}`);
        if (response.data.success) {
            const stats = response.data.data;
            document.getElementById('activeBatches').textContent = stats.active_batches;
            document.getElementById('totalTrainees').textContent = stats.total_trainees;
            document.getElementById('competentCount').textContent = stats.competent;
            document.getElementById('nycCount').textContent = stats.nyc;
        }
    } catch (error) {
        console.error('Stats Error:', error);
    }
}

async function loadModulePerformance(trainerId) {
    try {
        const response = await apiClient.get(`/role/trainer/trainer_dashboard.php?action=module-performance&trainer_id=${trainerId}`);
        if (response.data.success) {
            const data = response.data.data;
            
            const labels = data.map(item => item.module_title);
            const scores = data.map(item => item.avg_score);

            // Module Progress Chart (Bar)
            renderChart('moduleProgressChart', 'bar', labels, scores, 'Average Score per Module', '#4e73df');
            
            // Average Grades Chart (Doughnut - just for variety/summary)
            // Or maybe a line chart if we had time data. Let's stick to Bar for scores.
            // The HTML has 'avgGradesChart'. Let's use it for a distribution or similar.
            // Since the API returns avg per module, let's reuse that data but visualize differently or mock distribution.
            // For now, let's map the same data to a polar area chart for visual distinction.
            renderChart('avgGradesChart', 'polarArea', labels, scores, 'Score Distribution', 
                ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b']);
        }
    } catch (error) {
        console.error('Module Performance Error:', error);
    }
}

async function loadSchedule(trainerId) {
    try {
        const response = await apiClient.get(`/role/trainer/trainer_dashboard.php?action=schedule&trainer_id=${trainerId}`);
        if (response.data.success) {
            const tbody = document.getElementById('scheduleTableBody');
            tbody.innerHTML = '';
            
            if (response.data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No upcoming schedule</td></tr>';
                return;
            }

            response.data.data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.batch_name || 'N/A'}</td>
                    <td>${item.course_name}</td>
                    <td>${item.schedule || 'TBA'}</td>
                    <td>${item.room || 'TBA'}</td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Schedule Error:', error);
    }
}

function renderChart(canvasId, type, labels, data, label, colors) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Destroy existing chart if needed (simple check)
    const existingChart = Chart.getChart(canvasId);
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: type === 'bar' ? {
                y: { beginAtZero: true, max: 100 }
            } : {}
        }
    });
}