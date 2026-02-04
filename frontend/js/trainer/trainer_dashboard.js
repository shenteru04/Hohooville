// API Configuration
const API_BASE_URL = 'http://localhost/hohoo-ville/api';

// Axios Instance Configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Check Auth
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role_id != 2) {
        window.location.href = '../../login.html';
        return;
    }

    document.getElementById('trainerName').textContent = user.username;
    loadDashboardData(user.user_id);

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../../login.html';
    });
});

async function loadDashboardData(userId) {
    try {
        const response = await apiClient.get(`/role/trainer/trainer_dashboard.php?action=dashboard&user_id=${userId}`);
        if (response.data.success) {
            const data = response.data.data;
            document.getElementById('activeBatches').textContent = data.active_batches;
            document.getElementById('totalTrainees').textContent = data.total_trainees;
            document.getElementById('pendingGrades').textContent = data.pending_grades;

            const tbody = document.getElementById('scheduleTableBody');
            tbody.innerHTML = '';
            
            if (data.schedule.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No active schedule</td></tr>';
                return;
            }

            data.schedule.forEach(item => {
                tbody.innerHTML += `
                    <tr>
                        <td>${item.batch_name || 'N/A'}</td>
                        <td>${item.course_name}</td>
                        <td>${item.schedule || 'TBA'}</td>
                        <td>${item.room || 'TBA'}</td>
                    </tr>
                `;
            });
        } else {
            console.error('Failed to load dashboard data:', response.data.message);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}