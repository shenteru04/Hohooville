// API Configuration
const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

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
            const trainer = response.data.data;
            if (trainer.first_name && trainer.last_name) {
                document.getElementById('trainerName').textContent = `${trainer.first_name} ${trainer.last_name}`;
            }
            loadDashboardData(trainer.trainer_id);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
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
            closeBtn.className = 'w3-bar-item w3-button w3-hide-large';
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
                { href: '/Hohoo-ville/frontend/html/trainer/pages/my_batches.html', icon: 'fas fa-users', text: 'My Batches' },
                { href: '/Hohoo-ville/frontend/html/trainer/pages/modules.html', icon: 'fas fa-book', text: 'Modules' },
                { href: '/Hohoo-ville/frontend/html/trainer/pages/progress_chart.html', icon: 'fas fa-chart-line', text: 'Progress Chart' },
                { href: '/Hohoo-ville/frontend/html/trainer/pages/achievement_chart.html', icon: 'fas fa-trophy', text: 'Achievement Chart' },
                { href: '/Hohoo-ville/frontend/html/trainer/pages/reports.html', icon: 'fas fa-file-alt', text: 'Reports' }
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

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../login.html';
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
    let data = [];
    try {
        const response = await apiClient.get(`/role/trainer/trainer_dashboard.php?action=module-performance&trainer_id=${trainerId}`);
        if (response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
            data = response.data.data;
        }
    } catch (error) {
        console.error('Module Performance Error:', error);
    }

    const labels = data.map(item => item.module_title);
    const scores = data.map(item => item.avg_score);

    // Module Progress Chart (Bar)
    renderChart('moduleProgressChart', 'bar', labels, scores, 'Average Score per Module', '#4e73df');
    
    // Average Grades Chart (Polar Area)
    renderChart('avgGradesChart', 'polarArea', labels, scores, 'Score Distribution', 
        ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b']);
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