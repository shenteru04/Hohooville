// Dynamically determine project root to handle casing issues (Hohoo-ville vs hohoo-ville)
const pathSegments = window.location.pathname.split('/');
const projectIndex = pathSegments.findIndex(segment => segment.toLowerCase() === 'hohoo-ville');
const projectRoot = projectIndex !== -1 ? '/' + pathSegments[projectIndex] : '/Hohoo-ville';
const API_BASE_URL = window.location.origin + projectRoot + '/api';

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
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
    if (!document.getElementById('sidebarCollapse')) {
        const navbarContainer = document.querySelector('.navbar .container-fluid');
        if (navbarContainer) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'sidebarCollapse';
            toggleBtn.className = 'btn btn-primary me-2 d-lg-none';
            toggleBtn.type = 'button';
            toggleBtn.style.zIndex = '1055'; // Ensure it's above other nav elements
            toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
            
            // Insert as first child to ensure visibility
            navbarContainer.insertBefore(toggleBtn, navbarContainer.firstChild);
            
            toggleBtn.addEventListener('click', () => {
                if (sidebar) sidebar.style.display = 'block';
            });
        }
    }

    document.getElementById('traineeName').textContent = user.username || user.full_name || 'Trainee';
    
    // Use trainee_id if available, otherwise fallback to user_id or handle error
    const idToLoad = user.trainee_id || user.user_id;
    if (idToLoad) {
        loadDashboardData(idToLoad);
    } else {
        document.getElementById('activeCourseName').textContent = 'Error: User ID not found.';
    }

    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/Hohoo-ville/frontend/login.html';
    });
});

async function loadDashboardData(traineeId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainee/trainee_dashboard.php?trainee_id=${traineeId}`, { timeout: 10000 });
        
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