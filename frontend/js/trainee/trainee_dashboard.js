const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
let archivedQualificationsModal;
let openModalCount = 0;

class SimpleModal {
    constructor(element) {
        this.element = element;
        this.lastFocusedElement = null;

        if (this.element) {
            this.element.setAttribute('aria-hidden', 'true');
            if ('inert' in this.element) {
                this.element.inert = true;
            }
        }
    }

    show() {
        if (!this.element || !this.element.classList.contains('hidden')) return;
        this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.element.classList.remove('hidden');
        this.element.classList.add('flex');
        this.element.setAttribute('aria-hidden', 'false');
        if ('inert' in this.element) {
            this.element.inert = false;
        }
        openModalCount += 1;
        document.body.classList.add('overflow-hidden');

        const focusTarget = this.element.querySelector('[data-modal-hide]') || this.element.querySelector('button');
        if (focusTarget instanceof HTMLElement) {
            requestAnimationFrame(() => focusTarget.focus());
        }
    }

    hide() {
        if (!this.element || this.element.classList.contains('hidden')) return;
        if (document.activeElement instanceof HTMLElement && this.element.contains(document.activeElement)) {
            document.activeElement.blur();
        }
        this.element.classList.add('hidden');
        this.element.classList.remove('flex');
        this.element.setAttribute('aria-hidden', 'true');
        if ('inert' in this.element) {
            this.element.inert = true;
        }
        openModalCount = Math.max(0, openModalCount - 1);
        if (openModalCount === 0) {
            document.body.classList.remove('overflow-hidden');
        }

        if (this.lastFocusedElement instanceof HTMLElement) {
            requestAnimationFrame(() => this.lastFocusedElement.focus());
        }
    }
}

async function ensureSwal() {
    if (typeof window.Swal !== 'undefined') return;
    await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.trainee_id) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    initModals();
    loadUserProfileImage();

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

    document.getElementById('logoutBtn').addEventListener('click', async function() {
        await ensureSwal();
        
        Swal.fire({
            title: 'Logout Confirmation',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Logout',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/Hohoo-ville/frontend/login.html';
            }
        });
    });
});

function initModals() {
    archivedQualificationsModal = new SimpleModal(document.getElementById('archivedQualificationsModal'));

    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-hide');
            if (modalId === 'archivedQualificationsModal') {
                archivedQualificationsModal?.hide();
            }
        });
    });
}

async function loadUserProfileImage() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.user_id) return;

        const response = await axios.get(`${API_BASE_URL}/role/trainee/profile.php?action=get&user_id=${user.user_id}`);
        if (response.data.success && response.data.data) {
            const profileData = response.data.data;
            const profileImg = document.getElementById('userProfileImage');
            const profileImageUrl = profileData.photo_url
                ? (profileData.photo_url.startsWith('http')
                    ? profileData.photo_url
                    : `${window.location.origin}${profileData.photo_url}`)
                : (profileData.profile_image
                    ? `/Hohoo-ville/uploads/profile_images/${encodeURIComponent(profileData.profile_image)}`
                    : (profileData.photo_file
                        ? `/Hohoo-ville/uploads/trainees/${encodeURIComponent(profileData.photo_file)}`
                        : null));

            // Update profile image
            if (profileImg && profileImageUrl) {
                profileImg.src = profileImageUrl;
            } else if (profileImg && profileData.first_name) {
                profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.first_name)}&background=random`;
            }
        }
    } catch (error) {
        console.log('Profile image load skipped (not critical)');
    }
}

function formatGrade(value) {
    if (value === null || value === undefined || value === '') {
        return 'N/A';
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
        return 'N/A';
    }

    return numericValue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

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
            const displayedCourseName = course.qualification_name || course.course_name || 'Not Enrolled';
            document.getElementById('activeCourseName').textContent = displayedCourseName;
            document.getElementById('batchName').textContent = course.batch_name || '-';
            document.getElementById('startDate').textContent = course.start_date || '-';
            document.getElementById('endDate').textContent = course.end_date || '-';
            document.getElementById('schedule').textContent = displaySchedule;

            // Update Stats
            const progressRate = (data.progress_rate ?? 0);
            document.getElementById('progressRate').textContent = progressRate + '%';
            document.getElementById('currentGrade').textContent = data.current_grade_display || formatGrade(data.current_grade);

            const statusEl = document.getElementById('competencyStatus');
            const competencyStatus = data.competency_status || 'Pending';
            statusEl.textContent = 'Status: ' + competencyStatus;
            if (competencyStatus === 'Competent') {
                statusEl.className = 'text-sm font-bold text-green-600 mt-1';
            } else if (competencyStatus === 'Not Yet Competent') {
                statusEl.className = 'text-sm font-semibold text-amber-600 mt-1';
            } else if (competencyStatus === 'In Progress') {
                statusEl.className = 'text-sm font-semibold text-blue-600 mt-1';
            } else {
                statusEl.className = 'text-sm text-gray-500 mt-1';
            }

            // Update Schedule Card
            document.getElementById('nextClassTime').textContent = displaySchedule !== '-' ? displaySchedule : 'TBA';
            document.getElementById('nextClassRoom').textContent = displayRoom !== '-' ? displayRoom : 'TBA';

            // Add Archive Button if course is active and competent
            const archiveContainer = document.getElementById('archiveButtonContainer') || createArchiveContainer();
            if ((course.qualification_name || course.course_name) && (course.qualification_name || course.course_name) !== 'Not Enrolled' && competencyStatus === 'Competent' && data.can_archive) {
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
        renderArchivedCoursesModal([], traineeId);
        return;
    }

    container.innerHTML = `
        <button
            type="button"
            id="openArchivedQualificationsBtn"
            class="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <i class="fas fa-archive"></i>
            </span>
            <span class="text-left">
                <span class="block text-base font-semibold text-slate-900">Archived Qualifications</span>
                <span class="block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">${archivedCourses.length} archived qualification${archivedCourses.length === 1 ? '' : 's'}</span>
            </span>
            <i class="fas fa-chevron-right text-slate-400"></i>
        </button>
    `;

    const triggerButton = document.getElementById('openArchivedQualificationsBtn');
    if (triggerButton) {
        triggerButton.addEventListener('click', () => {
            renderArchivedCoursesModal(archivedCourses, traineeId);
            archivedQualificationsModal?.show();
        });
    }

    renderArchivedCoursesModal(archivedCourses, traineeId);
}

function renderArchivedCoursesModal(archivedCourses, traineeId) {
    const body = document.getElementById('archivedQualificationsModalBody');
    if (!body) return;

    if (!archivedCourses || archivedCourses.length === 0) {
        body.innerHTML = `
            <div class="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/80 p-8 text-center">
                <div>
                    <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <i class="fas fa-archive text-xl"></i>
                    </div>
                    <h4 class="mt-4 text-lg font-semibold text-slate-900">No archived qualifications yet</h4>
                    <p class="mt-2 text-sm text-slate-500">Completed qualifications that you archive will appear here.</p>
                </div>
            </div>
        `;
        return;
    }

    const rows = archivedCourses.map((course) => {
        const finalScore = formatGrade(course.final_score);
        return `
            <tr class="border-b border-slate-100 last:border-b-0">
                <td class="px-4 py-4 align-top">
                    <p class="font-semibold text-slate-900">${escapeHtml(course.qualification_name || course.course_name || 'Unnamed Qualification')}</p>
                </td>
                <td class="px-4 py-4 align-top text-slate-700">${escapeHtml(course.batch_name || 'N/A')}</td>
                <td class="px-4 py-4 align-top text-slate-700">${escapeHtml(course.completion_date || 'N/A')}</td>
                <td class="px-4 py-4 align-top text-slate-700">${escapeHtml(finalScore)}</td>
                <td class="px-4 py-4 align-top">
                    <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                        onclick="unarchiveCourse(${course.enrollment_id}, ${traineeId})"
                    >
                        <i class="fas fa-undo"></i> Unarchive
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    body.innerHTML = `
        <div class="rounded-[24px] border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
            <div class="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h4 class="text-lg font-semibold text-slate-900">Archived Qualification List</h4>
                    <p class="text-sm text-slate-500">Open your past completed qualifications and restore them when needed.</p>
                </div>
                <span class="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    ${archivedCourses.length} archived
                </span>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-slate-200">
                    <thead class="bg-slate-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Qualification</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Batch</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Completion Date</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Final Score</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Action</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white">
                        ${rows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
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
            archivedQualificationsModal?.hide();
            loadDashboardData(traineeId);
        } else {
            alert('Error unarchiving qualification: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error unarchiving course:', error);
        alert('Error unarchiving qualification. Please try again.');
    }
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
