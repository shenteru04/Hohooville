const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.trainee_id) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    document.getElementById('traineeName').textContent = user.username;
    loadDashboardData(user.trainee_id);

    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/Hohoo-ville/frontend/login.html';
    });
});

async function loadDashboardData(traineeId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainee/trainee_dashboard.php?trainee_id=${traineeId}`);
        
        if (response.data.success) {
            const data = response.data.data;
            const course = data.active_course || {};

            // Update Course Info
            document.getElementById('activeCourseName').textContent = course.course_name || 'Not Enrolled';
            document.getElementById('batchName').textContent = course.batch_name || '-';
            document.getElementById('startDate').textContent = course.start_date || '-';
            document.getElementById('endDate').textContent = course.end_date || '-';
            document.getElementById('schedule').textContent = course.schedule || '-';

            // Update Stats
            document.getElementById('attendanceRate').textContent = data.attendance_rate + '%';
            document.getElementById('currentGrade').textContent = data.current_grade || 'N/A';
            
            const statusEl = document.getElementById('competencyStatus');
            statusEl.textContent = 'Status: ' + data.competency_status;
            statusEl.className = data.competency_status === 'Competent' ? 'card-text text-white fw-bold' : 'card-text';

            // Update Schedule Card
            document.getElementById('nextClassTime').textContent = data.schedule.time;
            document.getElementById('nextClassRoom').textContent = data.schedule.room;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}