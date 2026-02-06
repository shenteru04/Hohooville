const API_BASE_URL = 'http://localhost/hohoo-ville/api';
const UPLOADS_URL = 'http://localhost/hohoo-ville/uploads/trainees/';
let apiClient;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof axios !== 'undefined') {
        apiClient = axios.create({
            baseURL: API_BASE_URL,
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });
        initializePage();
    } else {
        console.error('Axios is not defined.');
    }
});

async function initializePage() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.user_id) {
        alert('You are not logged in. Redirecting to login page.');
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    // Remove unwanted sidebar links
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

    try {
        // First, get the trainer_id from the user_id
        const profileResponse = await apiClient.get(`/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        
        if (profileResponse.data.success) {
            const trainerId = profileResponse.data.data.trainer_id;
            // Now, load the trainees for this trainer
            loadTrainees(trainerId);
        } else {
            throw new Error(profileResponse.data.message || 'Could not find trainer profile.');
        }
    } catch (error) {
        console.error('Initialization Error:', error);
        const tbody = document.getElementById('traineesTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: Could not load trainee data. ${error.message}</td></tr>`;
        }
    }
}

async function loadTrainees(trainerId) {
    try {
        const response = await apiClient.get(`/role/trainer/my_trainees.php?action=list&trainer_id=${trainerId}`);
        if (response.data.success) {
            renderTraineesTable(response.data.data);
        } else {
            alert('Error loading trainees: ' + (response.data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading trainees:', error);
        alert('An error occurred while loading your trainees.');
    }
}

function renderTraineesTable(trainees) {
    const tbody = document.getElementById('traineesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (trainees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">You have no trainees assigned to your active batches.</td></tr>';
        return;
    }

    trainees.forEach(trainee => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>
                <div class="fw-bold">${trainee.full_name}</div>
                <div class="text-muted small">${trainee.email}</div>
            </td>
            <td>${trainee.batch_name}</td>
            <td>${trainee.course_name || '<span class="text-muted">N/A</span>'}</td>
            <td><span class="badge bg-success">${trainee.enrollment_status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewTraineeProgress(${trainee.trainee_id})">
                    <i class="fas fa-chart-line me-1"></i> Progress
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.viewTraineeProgress = function(traineeId) {
    // Placeholder for future functionality
    alert('Viewing progress for trainee ID: ' + traineeId);
    // Example: window.location.href = `trainee_progress.html?id=${traineeId}`;
}