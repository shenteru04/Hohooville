const API_BASE_URL = 'http://localhost/hohoo-ville/api';
let currentTrainerId = null; // To store trainer ID

document.addEventListener('DOMContentLoaded', async function() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = '../../../../login.html';
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
            if (href.includes('attendance') || href.includes('grading')) {
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

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            currentTrainerId = response.data.data.trainer_id;
            loadBatches(currentTrainerId);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '../../../../login.html';
        });
    }
});

async function loadBatches(trainerId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_batches.php?trainer_id=${trainerId}`);
        if (response.data.success) {
            renderBatchesTable(response.data.data);
        } else {
            document.getElementById('batchesTableBody').innerHTML = '<tr><td colspan="5" class="text-center">No batches assigned.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading batches:', error);
        document.getElementById('batchesTableBody').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load batches.</td></tr>';
    }
}

function renderBatchesTable(data) {
    const tbody = document.getElementById('batchesTableBody');
    tbody.innerHTML = '';

    if (data && data.length > 0) {
        data.forEach(batch => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.dataset.batchId = batch.batch_id;
            row.innerHTML = `
                <td>${batch.batch_name}</td>
                <td>${batch.course_name}</td>
                <td>${batch.schedule || 'TBA'}</td>
                <td>${batch.room || 'TBA'}</td>
                <td><span class="badge bg-${batch.status === 'open' ? 'success' : 'secondary'}">${batch.status}</span></td>
            `;
            tbody.appendChild(row);

            row.addEventListener('click', function() {
                if (this.classList.contains('table-active')) {
                    // If already active, deactivate it and hide the trainee list
                    this.classList.remove('table-active');
                    document.getElementById('traineesContainer').classList.add('d-none');
                } else {
                    // Otherwise, activate it and load the trainees
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
                    this.classList.add('table-active');
                    loadTraineesForBatch(this.dataset.batchId);
                }
            });
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No batches assigned.</td></tr>';
    }
}

async function loadTraineesForBatch(batchId) {
    const traineesContainer = document.getElementById('traineesContainer');
    const traineesBody = document.getElementById('traineesTableBody');
    traineesContainer.classList.remove('d-none');
    traineesBody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm"></div> Loading trainees...</td></tr>';

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_trainees.php?action=list&trainer_id=${currentTrainerId}&batch_id=${batchId}`);
        if (response.data.success) {
            renderTraineesTable(response.data.data);
        } else {
            traineesBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${response.data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading trainees for batch:', error);
        traineesBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load trainees.</td></tr>';
    }
}

function renderTraineesTable(trainees) {
    const tbody = document.getElementById('traineesTableBody');
    tbody.innerHTML = '';
    if (trainees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No approved trainees found in this batch.</td></tr>';
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
                <a href="trainee_details.html?id=${trainee.trainee_id}" class="btn btn-sm btn-outline-primary" title="View Trainee Details">
                    <i class="fas fa-eye me-1"></i> View
                </a>
            </td>
        `;
        tbody.appendChild(row);
    });
}