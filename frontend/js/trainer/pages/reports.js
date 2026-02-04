const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', async function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../../../../login.html';
        return;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            loadBatches(response.data.data.trainer_id);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
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

    document.getElementById('reportForm').addEventListener('submit', function(e) {
        e.preventDefault();
        generateReport();
    });
});

async function loadBatches(trainerId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/trainer_dashboard.php?action=schedule&trainer_id=${trainerId}`);
        if (response.data.success) {
            const select = document.getElementById('batchSelect');
            response.data.data.forEach(batch => {
                select.innerHTML += `<option value="${batch.batch_id || 1}">${batch.batch_name} - ${batch.course_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

async function generateReport() {
    const type = document.getElementById('reportType').value;
    const batchId = document.getElementById('batchSelect').value;

    if (!batchId) {
        alert('Please select a batch');
        return;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/reports.php?action=${type}&batch_id=${batchId}`);
        
        if (response.data.success) {
            renderReport(type, response.data.data);
        } else {
            alert('No data found for this report.');
        }
    } catch (error) {
        console.error('Report Error:', error);
        alert('Failed to generate report');
    }
}

function renderReport(type, data) {
    const container = document.getElementById('reportResult');
    const thead = document.getElementById('reportHead');
    const tbody = document.getElementById('reportBody');
    
    container.classList.remove('d-none');
    document.getElementById('reportDate').textContent = new Date().toLocaleDateString();
    tbody.innerHTML = '';
    thead.innerHTML = '';

    if (type === 'grading_summary' || type === 'competency_status') {
        thead.innerHTML = `
            <tr>
                <th>Trainee Name</th>
                <th>Course</th>
                <th>Total Grade</th>
                <th>Status</th>
            </tr>
        `;
        data.forEach(row => {
            tbody.innerHTML += `
                <tr>
                    <td>${row.trainee_name}</td>
                    <td>${row.course_name}</td>
                    <td>${row.total_grade || 'N/A'}</td>
                    <td><span class="badge ${row.total_grade >= 80 ? 'bg-success' : 'bg-warning'}">${row.total_grade >= 80 ? 'Competent' : 'NYC'}</span></td>
                </tr>
            `;
        });
    } else if (type === 'attendance_summary') {
        thead.innerHTML = '<tr><th>Trainee Name</th><th>Present</th><th>Absent</th><th>Late</th><th>Attendance Rate</th></tr>';
        data.forEach(row => {
            const total = parseInt(row.present) + parseInt(row.absent) + parseInt(row.late);
            const rate = total > 0 ? Math.round((row.present / total) * 100) : 0;
            tbody.innerHTML += `
                <tr><td>${row.trainee_name}</td><td>${row.present}</td><td>${row.absent}</td><td>${row.late}</td><td>${rate}%</td></tr>
            `;
        });
    }
}