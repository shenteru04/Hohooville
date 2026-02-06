const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', async function() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    if (user) {
        document.getElementById('trainerName').textContent = user.username || 'Trainer';
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

        // Add Progress Chart link
        const ul = sidebar.querySelector('ul');
        if (ul && !ul.querySelector('a[href="progress_chart.html"]')) {
            const newLi = document.createElement('li');
            newLi.className = 'nav-item';
            newLi.innerHTML = `
                <a class="nav-link" href="progress_chart.html">
                    <i class="fas fa-chart-bar me-2"></i>
                    <span>Progress Chart</span>
                </a>
            `;
            ul.appendChild(newLi);
        }
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '/Hohoo-ville/frontend/login.html';
        });
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            loadTrainees(response.data.data.trainer_id);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
    }
});

async function loadTrainees(trainerId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/trainees.php?action=list&trainer_id=${trainerId}`);
        
        const tbody = document.getElementById('traineesTableBody');
        tbody.innerHTML = '';

        if (response.data.success && response.data.data.length > 0) {
            response.data.data.forEach(trainee => {
                const row = `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <div class="ms-2">
                                    <h6 class="mb-0">${trainee.first_name} ${trainee.last_name}</h6>
                                    <small class="text-muted">${trainee.email || ''}</small>
                                </div>
                            </div>
                        </td>
                        <td>${trainee.batch_name}</td>
                        <td>${trainee.course_name}</td>
                        <td><span class="badge bg-${trainee.status === 'approved' ? 'success' : 'warning'}">${trainee.status}</span></td>
                        <td>
                            <a href="trainee_details.html?id=${trainee.trainee_id}" class="btn btn-sm btn-primary"><i class="fas fa-eye"></i> View</a>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No trainees found.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading trainees:', error);
    }
}