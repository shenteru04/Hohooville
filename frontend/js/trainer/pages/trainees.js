const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';

document.addEventListener('DOMContentLoaded', async function () {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    initSidebar();
    initUserMenu();
    initLogout();

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            const trainer = response.data.data;
            if (trainer.first_name && trainer.last_name) {
                document.getElementById('trainerName').textContent = `${trainer.first_name} ${trainer.last_name}`;
            } else {
                document.getElementById('trainerName').textContent = user.username || 'Trainer';
            }
            loadTrainees(trainer.trainer_id);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
    }
});

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
        document.body.classList.remove('overflow-hidden');
    }

    function toggleSidebar() {
        if (sidebar.classList.contains('-translate-x-full')) openSidebar();
        else closeSidebar();
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', toggleSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            document.body.classList.remove('overflow-hidden');
            if (sidebarOverlay) {
                sidebarOverlay.classList.add('hidden', 'opacity-0');
            }
        }
    });
}

function initUserMenu() {
    const userMenuButton = document.getElementById('userMenuButton');
    const userMenuDropdown = document.getElementById('userMenuDropdown');
    if (!userMenuButton || !userMenuDropdown) return;

    userMenuButton.addEventListener('click', function (event) {
        event.stopPropagation();
        userMenuDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', function (event) {
        if (!event.target.closest('#userMenuDropdown')) {
            userMenuDropdown.classList.add('hidden');
        }
    });
}

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.clear();
        window.location.href = '/Hohoo-ville/frontend/login.html';
    });
}

async function loadTrainees(trainerId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/trainees.php?action=list&trainer_id=${trainerId}`);
        const tbody = document.getElementById('traineesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (response.data.success && response.data.data.length > 0) {
            response.data.data.forEach(trainee => {
                const status = String(trainee.status || '').toLowerCase();
                const statusClass = status === 'approved'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-slate-700">${trainee.trainee_school_id || 'N/A'}</td>
                    <td class="px-4 py-3">
                        <p class="text-sm font-semibold text-slate-900">${trainee.first_name || ''} ${trainee.last_name || ''}</p>
                        <p class="text-xs text-slate-500">${trainee.email || ''}</p>
                    </td>
                    <td class="px-4 py-3 text-sm text-slate-700">${trainee.batch_name || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${trainee.course_name || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm text-slate-600">${trainee.formatted_enrollment_date || trainee.enrollment_date || 'N/A'}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass}">${trainee.status || 'N/A'}</span>
                    </td>
                    <td class="px-4 py-3">
                        <a href="trainee_details.html?id=${trainee.trainee_id}" class="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                            <i class="fas fa-eye"></i> View
                        </a>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-6 text-center text-sm text-slate-500">No trainees found.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading trainees:', error);
        const tbody = document.getElementById('traineesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-6 text-center text-sm text-red-600">Failed to load trainees.</td></tr>';
        }
    }
}
