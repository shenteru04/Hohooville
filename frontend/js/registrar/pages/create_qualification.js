const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';

document.addEventListener('DOMContentLoaded', async function() {
    await ensureSwal();
    initSidebar();
    initUserDropdown();
    initLogout();
    hydrateHeaderUser();

    loadQualifications();

    const createQualificationForm = document.getElementById('createQualificationForm');
    if (createQualificationForm) {
        createQualificationForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const payload = {
                qualification_name: document.getElementById('courseName').value,
                nc_level_id: document.getElementById('ncLevel').value,
                ctpr_number: document.getElementById('ctprNumber').value,
                duration: document.getElementById('duration').value,
                training_cost: document.getElementById('trainingCost').value,
                description: document.getElementById('description').value
            };

            try {
                const response = await axios.post(`${API_BASE_URL}/role/registrar/qualifications.php?action=create`, payload);
                if (response.data.success) {
                    Swal.fire('Success', 'Qualification Created Successfully', 'success');
                    this.reset();
                    loadQualifications();
                } else {
                    Swal.fire('Error', 'Error: ' + response.data.message, 'error');
                }
            } catch (error) {
                console.error('Error creating qualification:', error);
                Swal.fire('Error', 'An error occurred while creating the qualification.', 'error');
            }
        });
    }
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
        document.body.classList.remove('overflow-hidden');
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', openSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden', 'opacity-0');
            document.body.classList.remove('overflow-hidden');
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

async function loadQualifications() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/qualifications.php?action=list`);
        const tbody = document.getElementById('qualificationsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!response.data.success || !Array.isArray(response.data.data) || !response.data.data.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-slate-500">No qualifications found.</td></tr>';
            return;
        }

        response.data.data.forEach((q) => {
            const trainingCost = q.training_cost ? `PHP ${parseFloat(q.training_cost).toFixed(2)}` : 'N/A';
            const ncLevel = q.nc_level_code || 'N/A';
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50">
                    <td class="px-4 py-3 text-sm font-medium text-slate-800">${q.qualification_name || q.course_name}</td>
                    <td class="px-4 py-3 text-sm text-slate-700"><span class="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">${ncLevel}</span></td>
                    <td class="px-4 py-3 text-sm text-slate-700">${q.ctpr_number || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${q.duration || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${trainingCost}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">${q.status}</span>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading qualifications:', error);
    }
}
