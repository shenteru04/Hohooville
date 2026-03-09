const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
let scholarshipModal;

class SimpleModal {
    constructor(element) {
        this.element = element;
    }

    show() {
        if (!this.element) return;
        this.element.classList.remove('hidden');
        this.element.classList.add('flex');
        document.body.classList.add('overflow-hidden');
    }

    hide() {
        if (!this.element) return;
        this.element.classList.add('hidden');
        this.element.classList.remove('flex');
        if (!document.querySelector('.modal-root.flex:not(.hidden)')) {
            document.body.classList.remove('overflow-hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    await ensureSwal();
    initSidebar();
    initUserDropdown();
    initLogout();
    initModalDismissers();
    hydrateHeaderUser();

    scholarshipModal = new SimpleModal(document.getElementById('scholarshipModal'));

    loadScholarships();
    loadOfferedCourses();

    const scholarshipForm = document.getElementById('scholarshipForm');
    if (scholarshipForm) scholarshipForm.addEventListener('submit', saveScholarship);
});

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

function hydrateHeaderUser() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userName = document.getElementById('userName');
        if (!userName) return;
        const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.full_name || user.name || user.username || 'Registrar';
        userName.textContent = displayName;
    } catch (error) {
        console.warn('Unable to parse user in localStorage:', error);
    }
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    if (!sidebar) return;

    function openSidebar() {
        sidebar.classList.remove('-translate-x-full');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('hidden');
            requestAnimationFrame(() => sidebarOverlay.classList.remove('opacity-0'));
        }
        document.body.classList.add('overflow-hidden');
    }

    function closeSidebar() {
        sidebar.classList.add('-translate-x-full');
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
        }
        if (!document.querySelector('.modal-root.flex:not(.hidden)')) {
            document.body.classList.remove('overflow-hidden');
        }
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', openSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden', 'opacity-0');
            if (!document.querySelector('.modal-root.flex:not(.hidden)')) {
                document.body.classList.remove('overflow-hidden');
            }
        }
    });
}

function initUserDropdown() {
    const button = document.getElementById('userDropdown');
    const menu = document.getElementById('userDropdownMenu');
    if (!button || !menu) return;

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#userDropdown') && !event.target.closest('#userDropdownMenu')) {
            menu.classList.add('hidden');
        }
    });
}

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../../../login.html';
    });
}

function initModalDismissers() {
    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-hide');
            if (modalId === 'scholarshipModal' && scholarshipModal) {
                scholarshipModal.hide();
                return;
            }

            const el = document.getElementById(modalId);
            if (!el) return;
            el.classList.add('hidden');
            el.classList.remove('flex');
            if (!document.querySelector('.modal-root.flex:not(.hidden)')) {
                document.body.classList.remove('overflow-hidden');
            }
        });
    });
}

function escapeJsValue(value) {
    return String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, ' ');
}

async function loadScholarships() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/application_settings.php?action=list-scholarships`);
        const tbody = document.getElementById('scholarshipTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!response.data.success || !Array.isArray(response.data.data) || !response.data.data.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-slate-500">No scholarship types found.</td></tr>';
            return;
        }

        response.data.data.forEach((s) => {
            const isActive = s.status === 'active';
            const statusClass = isActive
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-200 text-slate-700';
            const toggleClass = isActive
                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50';
            const safeName = escapeJsValue(s.scholarship_name);
            const safeDesc = escapeJsValue(s.description);

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50">
                    <td class="px-4 py-3 text-sm font-medium text-slate-800">${s.scholarship_name}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${s.description || ''}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}">${s.status || 'active'}</span>
                    </td>
                    <td class="px-4 py-3">
                        <div class="flex flex-wrap items-center gap-1">
                            <button class="inline-flex items-center rounded-md border bg-white px-2.5 py-1.5 text-xs font-semibold ${toggleClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="toggleScholarship(${s.scholarship_type_id}, '${isActive ? 'inactive' : 'active'}')">
                                ${isActive ? 'Hide' : 'Show'}
                            </button>
                            <button class="inline-flex items-center rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="editScholarship(${s.scholarship_type_id}, '${safeName}', '${safeDesc}')">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading scholarships:', error);
    }
}

window.openScholarshipModal = function() {
    const form = document.getElementById('scholarshipForm');
    if (form) form.reset();
    document.getElementById('scholarshipId').value = '';
    document.getElementById('scholarshipModalTitle').textContent = 'Add Scholarship';
    if (scholarshipModal) scholarshipModal.show();
};

window.editScholarship = function(id, name, desc) {
    document.getElementById('scholarshipId').value = id;
    document.getElementById('scholarshipName').value = name;
    document.getElementById('scholarshipDesc').value = desc;
    document.getElementById('scholarshipModalTitle').textContent = 'Edit Scholarship';
    if (scholarshipModal) scholarshipModal.show();
};

async function saveScholarship(event) {
    event.preventDefault();
    const id = document.getElementById('scholarshipId').value;
    const name = document.getElementById('scholarshipName').value;
    const desc = document.getElementById('scholarshipDesc').value;

    try {
        const response = await axios.post(`${API_BASE_URL}/role/registrar/application_settings.php?action=save-scholarship`, {
            id: id,
            name: name,
            description: desc
        });

        if (response.data.success) {
            if (scholarshipModal) scholarshipModal.hide();
            loadScholarships();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error saving scholarship:', error);
    }
}

window.toggleScholarship = async function(id, status) {
    try {
        await axios.post(`${API_BASE_URL}/role/registrar/application_settings.php?action=toggle-scholarship-status`, { id: id, status: status });
        loadScholarships();
    } catch (error) {
        console.error('Error toggling scholarship:', error);
    }
};

async function loadOfferedCourses() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/application_settings.php?action=list-offered-courses`);
        const tbody = document.getElementById('offeredCoursesBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!response.data.success || !Array.isArray(response.data.data) || !response.data.data.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-6 text-center text-sm text-slate-500">No qualifications found.</td></tr>';
            return;
        }

        response.data.data.forEach((c) => {
            const isActive = c.status === 'active';
            const statusClass = isActive
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-200 text-slate-700';
            const toggleClass = isActive
                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50';

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50">
                    <td class="px-4 py-3 text-sm font-medium text-slate-800">${c.course_name}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}">${c.status}</span>
                    </td>
                    <td class="px-4 py-3">
                        <button class="inline-flex items-center rounded-md border bg-white px-2.5 py-1.5 text-xs font-semibold ${toggleClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="toggleCourse(${c.qualification_id}, '${isActive ? 'inactive' : 'active'}')">
                            ${isActive ? 'Hide' : 'Show'}
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

window.toggleCourse = async function(id, status) {
    try {
        await axios.post(`${API_BASE_URL}/role/registrar/application_settings.php?action=toggle-course-offer`, { qualification_id: id, status: status });
        loadOfferedCourses();
    } catch (error) {
        console.error('Error toggling course:', error);
    }
};
