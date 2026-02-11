const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.trainee_id) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
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
            cursor: pointer;
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
            b.innerHTML = '<i class="fas fa-bars"></i>';
            c.insertBefore(b, c.firstChild);
            sc = b;
        }
    }
    if (sc) {
        sc.addEventListener('click', () => {
            if (sidebar) sidebar.style.display = 'block';
        });
    }

    document.getElementById('traineeName').textContent = user.username || user.full_name || 'Trainee';
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
        } else {
            // Handle case where API returns success: false
            document.getElementById('activeCourseName').textContent = 'No active enrollment';
            document.getElementById('attendanceRate').textContent = '-';
            document.getElementById('currentGrade').textContent = '-';
            document.getElementById('competencyStatus').textContent = 'Status: -';
            document.getElementById('nextClassTime').textContent = '-';
            document.getElementById('nextClassRoom').textContent = '-';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('activeCourseName').textContent = 'Error loading data';
        document.getElementById('attendanceRate').textContent = 'Error';
        document.getElementById('currentGrade').textContent = 'Error';
        document.getElementById('competencyStatus').textContent = 'Status: Error';
        document.getElementById('nextClassTime').textContent = '-';
        document.getElementById('nextClassRoom').textContent = '-';
    }
}