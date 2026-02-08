const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../../login.html';
        return;
    }

    if (user) {
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = user.username || 'Registrar';
    }

    loadDashboardData();

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
});

async function loadDashboardData() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/dashboard.php?action=dashboard-data`);
        if (response.data.success) {
            const data = response.data.data;
            updateStats(data.stats);
            renderCharts(data.charts);
            updateRecentEnrollments(data.recent_enrollments);
        } else {
            console.error('Failed to load dashboard data:', response.data.message);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateStats(stats) {
    document.getElementById('totalTrainees').textContent = stats.total_trainees || 0;
    document.getElementById('pendingEnrollments').textContent = stats.pending_enrollments || 0;
    document.getElementById('activeBatches').textContent = stats.active_batches || 0;
    document.getElementById('totalCourses').textContent = stats.total_courses || 0;
}

function renderCharts(chartsData) {
    // Enrollment by Course Chart
    const ctxEnrollment = document.getElementById('enrollmentChart');
    if (ctxEnrollment) {
        new Chart(ctxEnrollment, {
            type: 'bar',
            data: {
                labels: chartsData.by_course.labels,
                datasets: [{
                    label: 'Approved Enrollments',
                    data: chartsData.by_course.data,
                    backgroundColor: '#4e73df',
                    borderColor: '#4e73df',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }

    // Trend Chart
    const ctxTrend = document.getElementById('trendChart');
    if (ctxTrend) {
        new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: chartsData.trend.labels,
                datasets: [{
                    label: 'Enrollments',
                    data: chartsData.trend.data,
                    backgroundColor: 'rgba(28, 200, 138, 0.1)',
                    borderColor: '#1cc88a',
                    pointBackgroundColor: '#1cc88a',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#1cc88a',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }
}

function updateRecentEnrollments(enrollments) {
    const tbody = document.getElementById('recentEnrollmentsBody');
    tbody.innerHTML = '';

    enrollments.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.first_name} ${item.last_name}</td>
            <td>${item.course_name || 'N/A'}</td>
            <td>${item.batch_name || 'N/A'}</td>
            <td>${item.enrollment_date}</td>
            <td><span class="badge bg-${item.status === 'approved' ? 'success' : (item.status === 'pending' ? 'warning' : 'secondary')}">${item.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}