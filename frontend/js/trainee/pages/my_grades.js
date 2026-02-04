const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.trainee_id) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }
    document.getElementById('traineeName').textContent = user.username;
    loadGrades(user.trainee_id);
});

async function loadGrades(traineeId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainee/my_grades.php?trainee_id=${traineeId}`);
        
        if (response.data.success) {
            const tbody = document.getElementById('gradesTableBody');
            tbody.innerHTML = '';

            response.data.data.forEach(g => {
                tbody.innerHTML += `
                    <tr>
                        <td>${g.course_name}</td>
                        <td>${g.pre_test || '-'}</td>
                        <td>${g.post_test || '-'}</td>
                        <td>${g.activities || '-'}</td>
                        <td>${g.quizzes || '-'}</td>
                        <td>${g.task_sheets || '-'}</td>
                        <td class="fw-bold">${g.total_grade || '-'}</td>
                        <td><span class="badge ${g.remarks === 'Competent' ? 'bg-success' : 'bg-warning'}">${g.remarks || 'Pending'}</span></td>
                    </tr>`;
            });
        }
    } catch (error) {
        console.error('Error loading grades:', error);
    }
}