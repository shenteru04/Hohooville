const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.trainee_id) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    // Sidebar Logic (Tailwind)
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

    function toggleSidebar() {
        const isClosed = sidebar.classList.contains('-translate-x-full');
        if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
            setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10);
        } else {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
        }
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', toggleSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // User Dropdown Logic
    const userMenuBtn = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
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
        
        // Check if response is valid JSON object
        if (typeof response.data !== 'object') {
            console.error('Invalid server response:', response.data);
            throw new Error('Invalid server response format');
        }

        if (response.data.success) {
            const data = response.data.data;
            const course = data.active_course || {};

            // Determine Schedule and Room with fallback
            let displaySchedule = course.schedule;
            let displayRoom = course.room_name;

            // Helper to check if value is effectively empty/placeholder
            const isPlaceholder = (val) => !val || val === '-' || val === 'N/A' || val === 'TBA' || val === 'Not Set' || val === 'null';

            // Fallback: If course.schedule is missing/placeholder, try to use data.schedule
            if (isPlaceholder(displaySchedule) && data.schedule) {
                if (data.schedule.time) {
                    displaySchedule = data.schedule.time;
                } else if (typeof data.schedule === 'string') {
                    displaySchedule = data.schedule;
                }
                // Prefer room_name from schedule object if available
                if (data.schedule.room) {
                    displayRoom = data.schedule.room;
                } else if (data.schedule.room_name) {
                    displayRoom = data.schedule.room_name;
                }
            }

            // Final defaults
            displaySchedule = displaySchedule || '-';
            displayRoom = displayRoom || '-';

            // Update Course Info
            document.getElementById('activeCourseName').textContent = course.course_name || 'Not Enrolled';
            document.getElementById('batchName').textContent = course.batch_name || '-';
            document.getElementById('startDate').textContent = course.start_date || '-';
            document.getElementById('endDate').textContent = course.end_date || '-';
            document.getElementById('schedule').textContent = displaySchedule;

            // Update Stats
            const progressRate = (data.progress_rate ?? 0);
            document.getElementById('progressRate').textContent = progressRate + '%';
            document.getElementById('currentGrade').textContent = data.current_grade || 'N/A';
            
            const statusEl = document.getElementById('competencyStatus');
            statusEl.textContent = 'Status: ' + data.competency_status;
            statusEl.className = data.competency_status === 'Competent' ? 'text-sm font-bold text-green-600 mt-1' : 'text-sm text-gray-500 mt-1';

            // Update Schedule Card
            document.getElementById('nextClassTime').textContent = displaySchedule !== '-' ? displaySchedule : 'TBA';
            document.getElementById('nextClassRoom').textContent = displayRoom !== '-' ? displayRoom : 'TBA';

            // Add Archive Button if course is active and competent
            const archiveContainer = document.getElementById('archiveButtonContainer') || createArchiveContainer();
            if (course.course_name && course.course_name !== 'Not Enrolled' && data.competency_status === 'Competent') {
                archiveContainer.innerHTML = `
                    <button class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500" onclick="archiveCourse(${course.enrollment_id}, ${traineeId})">
                        <i class="fas fa-archive mr-2"></i> Archive This Course
                    </button>
                `;
                archiveContainer.style.display = 'block';
            } else {
                archiveContainer.style.display = 'none';
            }

            // Display Archived Courses
            displayArchivedCourses(data.archived_courses || [], traineeId);
        } else {
            // Security Check: If API fails due to archive/inactive status, logout immediately
            if (response.data.message && (
                response.data.message.toLowerCase().includes('archived') || 
                response.data.message.toLowerCase().includes('inactive')
            )) {
                localStorage.clear();
                window.location.href = '/Hohoo-ville/frontend/login.html';
                return;
            }
            // Handle case where API returns success: false
            document.getElementById('activeCourseName').textContent = 'No active enrollment';
            document.getElementById('progressRate').textContent = '-';
            document.getElementById('currentGrade').textContent = '-';
            document.getElementById('competencyStatus').textContent = 'Status: -';
            document.getElementById('nextClassTime').textContent = '-';
            document.getElementById('nextClassRoom').textContent = '-';
            document.getElementById('archiveButtonContainer').style.display = 'none';
            document.getElementById('archivedCoursesContainer').innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('activeCourseName').textContent = 'Error loading data';
        document.getElementById('progressRate').textContent = 'Error';
        document.getElementById('currentGrade').textContent = 'Error';
        document.getElementById('competencyStatus').textContent = 'Status: Error';
        document.getElementById('nextClassTime').textContent = '-';
        document.getElementById('nextClassRoom').textContent = '-';
    }
}

function createArchiveContainer() {
    const container = document.createElement('div');
    container.id = 'archiveButtonContainer';
    // Appended in HTML structure now
    return container;
}

function displayArchivedCourses(archivedCourses, traineeId) {
    const container = document.getElementById('archivedCoursesContainer');
    if (!container) return;

    if (!archivedCourses || archivedCourses.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <div class="card mt-4 border-left-info">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-archive me-2"></i>Archived Qualifications</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>Qualification</th>
                                <th>Batch</th>
                                <th>Completion Date</th>
                                <th>Final Score</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

    archivedCourses.forEach(course => {
        const finalScore = course.final_score ? parseFloat(course.final_score).toFixed(2) : 'N/A';
        html += `
            <tr>
                <td><strong>${course.course_name}</strong></td>
                <td>${course.batch_name}</td>
                <td>${course.completion_date || 'N/A'}</td>
                <td>${finalScore}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="unarchiveCourse(${course.enrollment_id}, ${traineeId})">
                        <i class="fas fa-undo me-1"></i> Unarchive
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

async function archiveCourse(enrollmentId, traineeId) {
    if (!confirm('Are you sure you want to archive this qualification? You can unarchive it later.')) {
        return;
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainee/archive.php?action=archive-course`, {
            enrollment_id: enrollmentId,
            trainee_id: traineeId
        });

        if (response.data.success) {
            alert('Qualification archived successfully!');
            loadDashboardData(traineeId);
        } else {
            alert('Error archiving qualification: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error archiving course:', error);
        alert('Error archiving qualification. Please try again.');
    }
}

async function unarchiveCourse(enrollmentId, traineeId) {
    if (!confirm('Are you sure you want to unarchive this qualification? It will appear in your active courses again.')) {
        return;
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainee/archive.php?action=unarchive-course`, {
            enrollment_id: enrollmentId,
            trainee_id: traineeId
        });

        if (response.data.success) {
            alert('Qualification unarchived successfully!');
            loadDashboardData(traineeId);
        } else {
            alert('Error unarchiving qualification: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error unarchiving course:', error);
        alert('Error unarchiving qualification. Please try again.');
    }
}
