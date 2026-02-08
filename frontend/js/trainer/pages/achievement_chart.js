const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
let currentTrainerId = null;

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

    // Sidebar manipulation
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
            const trainer = response.data.data;
            if (trainer.first_name && trainer.last_name) {
                document.getElementById('trainerName').textContent = `${trainer.first_name} ${trainer.last_name}`;
            }
            currentTrainerId = trainer.trainer_id;
            loadBatchesForChart(currentTrainerId);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
    }

    document.getElementById('generateLiveChartBtn').addEventListener('click', generateLiveChart);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '../../../login.html';
        });
    }
});

async function loadBatchesForChart(trainerId) {
    if (!trainerId) return;
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_batches.php?trainer_id=${trainerId}`);
        const select = document.getElementById('batchSelectForChart');
        if (response.data.success) {
            select.innerHTML = '<option value="">Select a batch to generate achievement chart...</option>';
            response.data.data.forEach(batch => {
                select.innerHTML += `<option value="${batch.batch_id}">${batch.batch_name} - ${batch.course_name}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Could not load batches.</option>';
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

async function generateLiveChart() {
    const batchId = document.getElementById('batchSelectForChart').value;
    if (!batchId) {
        alert('Please select a batch.');
        return;
    }

    const btn = document.getElementById('generateLiveChartBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Generating...';

    try {
        // Reusing progress_chart.php logic but we might want to filter for "Achievement" specific data if backend supported it.
        // For now, we display the same data structure but titled Achievement Chart.
        const response = await axios.get(`${API_BASE_URL}/role/trainer/progress_chart.php?action=get-batch-data&batch_id=${batchId}`);
        if (response.data.success) {
            renderLiveChart(response.data.data);
        } else {
            alert('Error generating chart: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error generating chart:', error);
        alert('An error occurred while generating the chart.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Generate';
    }
}

function renderLiveChart(data) {
    const { trainees, outcomes, completion_status, batch_info } = data;

    if (!trainees || !outcomes || trainees.length === 0 || outcomes.length === 0) {
        document.getElementById('chartContainer').innerHTML = '<div class="alert alert-warning">Not enough data to generate a chart.</div>';
        return;
    }

    const modules = outcomes.reduce((acc, outcome) => {
        const moduleTitle = outcome.module_title || 'Uncategorized';
        acc[moduleTitle] = acc[moduleTitle] || [];
        acc[moduleTitle].push(outcome);
        return acc;
    }, {});
    const moduleNames = Object.keys(modules);

    // --- Header Section ---
    let html = `
        <div class="text-center mb-4" style="font-family: Arial, sans-serif; color: black;">
            <h5 class="mb-0 fw-bold">Hohoo Ville Technical School Inc.</h5>
            <p class="mb-2">Purok 6A, Poblacion, Lagonglong, Misamis Oriental</p>
            <h4 class="fw-bold mt-3">ACHIEVEMENT CHART</h4>
            <h5 class="fw-bold text-uppercase">${batch_info.qualification_name || 'QUALIFICATION'} (${batch_info.duration || 'N/A'})</h5>
        </div>
    `;

    html += `<div class="table-responsive"><table class="tesda-table" style="width:100%; border-collapse: collapse; border: 1px solid black; font-family: Arial, sans-serif; font-size: 11px;">`;

    // --- Table Header ---
    // Row 1: Module Titles
    html += `<thead><tr>`;
    html += `<th rowspan="2" style="width: 30px; border: 1px solid black; text-align: center; vertical-align: middle;">NO</th>`;
    html += `<th rowspan="2" style="width: 250px; border: 1px solid black; text-align: center; vertical-align: middle;">NAME OF TRAINEE</th>`;
    
    moduleNames.forEach(modName => {
        html += `<th colspan="${modules[modName].length}" style="border: 1px solid black; text-align: center; vertical-align: middle; padding: 5px;">${modName}</th>`;
    });
    html += `</tr>`;

    // Row 2: Learning Outcomes (Vertical Text)
    html += `<tr>`;
    moduleNames.forEach(modName => {
        modules[modName].forEach((outcome, idx) => {
            // Using writing-mode for vertical text to match typical achievement charts
            html += `<th style="border: 1px solid black; text-align: center; vertical-align: bottom; padding: 5px; height: 150px;"><div style="writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; margin: 0 auto;">${idx + 1}. ${outcome.outcome_title}</div></th>`;
        });
    });
    html += `</tr></thead>`;

    // --- Table Body (25 Rows) ---
    html += `<tbody>`;
    for (let i = 0; i < 25; i++) {
        const trainee = trainees[i];
        html += `<tr>`;
        html += `<td style="border: 1px solid black; text-align: center;">${i + 1}</td>`;
        html += `<td style="border: 1px solid black; padding-left: 5px; font-weight: bold;">${trainee ? trainee.full_name.toUpperCase() : ''}</td>`;
        
        moduleNames.forEach(modName => {
            modules[modName].forEach(outcome => {
                let mark = '';
                if (trainee) {
                    const status = completion_status.find(s => s.trainee_id == trainee.trainee_id && s.outcome_id == outcome.outcome_id);
                    if (status) mark = status.mark; // e.g., '✓'
                }
                html += `<td style="border: 1px solid black; text-align: center;">${mark}</td>`;
            });
        });
        html += `</tr>`;
    }
    html += `</tbody></table></div>`;

    // --- Footer Section ---
    const startDate = batch_info.start_date ? new Date(batch_info.start_date).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'}) : '____________________';
    const endDate = batch_info.end_date ? new Date(batch_info.end_date).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'}) : '____________________';
    const trainerName = batch_info.trainer_name ? batch_info.trainer_name.toUpperCase() : '____________________';

    html += `
        <div class="mt-4" style="font-family: Arial, sans-serif; font-size: 12px; color: black;">
            <div class="fw-bold mb-2">LEGENDS:</div>
            <div class="row">
                <div class="col-md-4 mb-1">Training Duration: <span class="fw-bold">${batch_info.duration || '_______'}</span></div>
                <div class="col-md-4 mb-1">Date Started: <span class="fw-bold">${startDate}</span></div>
                <div class="col-md-4 mb-1 fw-bold">C - COMPETENT</div>
            </div>
            <div class="row">
                <div class="col-md-4">Trainer: <span class="fw-bold text-decoration-underline">${trainerName}</span></div>
                <div class="col-md-4">Date Finished: <span class="fw-bold">${endDate}</span></div>
                <div class="col-md-4 fw-bold">NYC - NOT YET COMPETENT</div>
            </div>
        </div>
    `;

    document.getElementById('chartContainer').innerHTML = html;
}