const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
let currentTrainerId = null; // To store trainer ID

document.addEventListener('DOMContentLoaded', async function() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = '../../../login.html';
        return;
    }

    // Inject Sidebar CSS (W3.CSS Reference Style)
    const ms = document.createElement('style');
    ms.innerHTML = `
        #sidebar {
            width: 200px;
            position: fixed;
            z-index: 1050;
            top: 0;
            left: 0;
            height: 100vh;
            overflow-y: auto;
            background-color: #fff;
            box-shadow: 0 2px 5px 0 rgba(0,0,0,0.16), 0 2px 10px 0 rgba(0,0,0,0.12);
            display: block;
        }
        .main-content, #content, .content-wrapper {
            margin-left: 200px !important;
            transition: margin-left .4s;
        }
        #sidebarCloseBtn {
            display: none;
            width: 100%;
            text-align: left;
            padding: 8px 16px;
            background: none;
            border: none;
            font-size: 18px;
        }
        #sidebarCloseBtn:hover { background-color: #ccc; }
        
        @media (max-width: 991.98px) {
            #sidebar { display: none; }
            .main-content, #content, .content-wrapper { margin-left: 0 !important; }
            #sidebarCloseBtn { display: block; }
        }
        .table-responsive, table { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    `;
    document.head.appendChild(ms);

    // Sidebar Logic
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (!document.getElementById('sidebarCloseBtn')) {
            const closeBtn = document.createElement('button');
            closeBtn.id = 'sidebarCloseBtn';
            closeBtn.innerHTML = 'Close &times;';
            closeBtn.addEventListener('click', () => {
                sidebar.style.display = 'none';
            });
            sidebar.insertBefore(closeBtn, sidebar.firstChild);
        }
    }

    // Open Button Logic
    let sc = document.getElementById('sidebarCollapse');
    if (!sc) {
        const nb = document.querySelector('.navbar');
        if (nb) {
            const c = nb.querySelector('.container-fluid') || nb;
            const b = document.createElement('button');
            b.id = 'sidebarCollapse';
            b.className = 'btn btn-outline-primary me-2 d-lg-none';
            b.type = 'button';
            b.innerHTML = '&#9776;';
            c.insertBefore(b, c.firstChild);
            sc = b;
        }
    }
    if (sc) {
        const nb = sc.cloneNode(true);
        if(sc.parentNode) sc.parentNode.replaceChild(nb, sc);
        nb.addEventListener('click', () => {
            if (sidebar) sidebar.style.display = 'block';
        });
    }

    // Remove Attendance and Grading pages from sidebar
    if (sidebar) {
        const ul = sidebar.querySelector('ul');
        if (ul) {
            ul.innerHTML = '';
            const menuItems = [
                { href: '/Hohoo-ville/frontend/html/trainer/trainer_dashboard.html', icon: 'fas fa-home', text: 'Dashboard' },
                { href: 'my_batches.html', icon: 'fas fa-users', text: 'My Batches' },
                { href: 'modules.html', icon: 'fas fa-book', text: 'Modules' },
                { href: 'progress_chart.html', icon: 'fas fa-chart-line', text: 'Progress Chart' },
                { href: 'achievement_chart.html', icon: 'fas fa-trophy', text: 'Achievement Chart' },
                { href: 'reports.html', icon: 'fas fa-file-alt', text: 'Reports' }
            ];
            const currentPage = window.location.pathname.split('/').pop();
            menuItems.forEach(item => {
                const li = document.createElement('li');
                li.className = 'nav-item mb-1';
                const isActive = currentPage === item.href ? 'active' : '';
                li.innerHTML = `<a class="nav-link ${isActive}" href="${item.href}"><i class="${item.icon} me-2"></i> ${item.text}</a>`;
                ul.appendChild(li);
            });
        }
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            const t = response.data.data;
            if (t.first_name && t.last_name) {
                document.getElementById('trainerName').textContent = `${t.first_name} ${t.last_name}`;
            }
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
            window.location.href = '../../../login.html';
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