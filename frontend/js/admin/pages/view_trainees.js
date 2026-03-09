const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;
const UPLOADS_URL = `${window.location.origin}/Hohoo-ville/uploads/trainees/`;

let accountModal;
let profileModal;
let sendingModal;
let traineesData = [];

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
        document.body.classList.remove('overflow-hidden');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await ensureSwal();
    initUserDropdown();
    initLogout();
    initModals();
    loadTrainees();

    const form = document.getElementById('createAccountForm');
    if (form) form.addEventListener('submit', handleCreateAccount);

    // Setup filter event listeners for status updates
    const searchInput = document.getElementById('searchInput');
    const batchFilter = document.getElementById('batchFilter');
    const qualificationFilter = document.getElementById('qualificationFilter');
    const statusFilter = document.getElementById('statusFilter');
    const clearBtn = document.getElementById('clearFiltersBtn');

    if (searchInput) {
        searchInput.addEventListener('input', updateFilterStatus);
    }
    if (batchFilter) {
        batchFilter.addEventListener('change', updateFilterStatus);
    }
    if (qualificationFilter) {
        qualificationFilter.addEventListener('change', updateFilterStatus);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', updateFilterStatus);
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
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
        if (typeof window.logout === 'function') {
            window.logout();
            return;
        }
        localStorage.clear();
        window.location.href = '/Hohoo-ville/frontend/login.html';
    });
}

function initModals() {
    accountModal = new SimpleModal(document.getElementById('createAccountModal'));
    profileModal = new SimpleModal(document.getElementById('viewProfileModal'));
    sendingModal = new SimpleModal(document.getElementById('sendingEmailModal'));

    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-hide');
            if (modalId === 'createAccountModal' && accountModal) accountModal.hide();
            if (modalId === 'viewProfileModal' && profileModal) profileModal.hide();
        });
    });
}

async function loadTrainees() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainees.php?action=list`);
        if (!response.data.success) {
            Swal.fire('Error', `Error loading trainees: ${response.data.message || 'Unknown error'}`, 'error');
            return;
        }
        traineesData = response.data.data || [];
        populateBatchFilter(traineesData);
        populateQualificationFilter(traineesData);
        renderTraineesTable(traineesData);
    } catch (error) {
        console.error('Error loading trainees:', error);
        Swal.fire('Error', 'Failed to load trainees.', 'error');
    }
}

function renderTraineesTable(data) {
    const tbody = document.getElementById('traineesTableBody');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-4 py-6 text-center text-sm text-slate-500">No trainees found</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((trainee) => {
        const statusBadge = trainee.status === 'active'
            ? '<span class="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">active</span>'
            : '<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">inactive</span>';

        const accountCell = !trainee.user_id
            ? `<button class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100" onclick="openAccountModal(${trainee.trainee_id})"><i class="fas fa-key"></i> Create Account</button>`
            : '<span class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700"><i class="fas fa-check"></i> Account Active</span>';

        const enrolledDate = trainee.formatted_enrollment_date 
            ? trainee.formatted_enrollment_date 
            : (trainee.enrollment_date || 'N/A');

        const qualification = trainee.course_name || '<span class="text-slate-400">Not Assigned</span>';

        return `
            <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(trainee.trainee_school_id || 'N/A')}</td>
                <td class="px-3 py-3 text-sm text-slate-900">${escapeHtml(`${trainee.last_name || ''}, ${trainee.first_name || ''}`)}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(trainee.email || 'N/A')}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(trainee.phone_number || '-')}</td>
                <td class="px-3 py-3 text-sm text-slate-700" data-filter-value="${escapeHtml(String(trainee.batch_id || ''))}">
                    ${trainee.batch_name ? escapeHtml(trainee.batch_name) : '<span class="text-slate-400">Not Enrolled</span>'}
                </td>
                <td class="px-3 py-3 text-sm text-slate-700" data-filter-value="${escapeHtml(String(trainee.course_name || ''))}">
                    ${qualification}
                </td>
                <td class="px-3 py-3 text-sm text-slate-600">${enrolledDate}</td>
                <td class="px-3 py-3 text-sm" data-filter-value="${escapeHtml(String(trainee.status || ''))}">
                    ${statusBadge}
                </td>
                <td class="px-3 py-3 text-sm">
                    <div class="flex flex-wrap items-center gap-2">
                        ${accountCell}
                        <button class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100" onclick="viewProfile(${trainee.trainee_id})"><i class="fas fa-eye"></i> View Profile</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    updateFilterStatus();
}

function populateBatchFilter(data) {
    const select = document.getElementById('batchFilter');
    if (!select) return;

    const currentValue = select.value;
    const batches = new Map();
    (data || []).forEach((item) => {
        if (!item.batch_id || !item.batch_name) return;
        if (!batches.has(item.batch_id)) {
            batches.set(item.batch_id, item.batch_name);
        }
    });

    select.innerHTML = '';
    select.insertAdjacentHTML('beforeend', '<option value="">All Batches</option>');

    Array.from(batches.entries())
        .sort((a, b) => String(a[1]).localeCompare(String(b[1]), undefined, { sensitivity: 'base' }))
        .forEach(([id, name]) => {
            const option = document.createElement('option');
            option.value = String(id);
            option.textContent = name;
            select.appendChild(option);
        });

    if (currentValue && Array.from(select.options).some((option) => option.value === currentValue)) {
        select.value = currentValue;
    }
}

function populateQualificationFilter(data) {
    const select = document.getElementById('qualificationFilter');
    if (!select) return;

    const currentValue = select.value;
    const qualifications = new Map();
    (data || []).forEach((item) => {
        if (!item.course_name) return;
        if (!qualifications.has(item.course_name)) {
            qualifications.set(item.course_name, item.course_name);
        }
    });

    select.innerHTML = '';
    select.insertAdjacentHTML('beforeend', '<option value="">All Programs</option>');

    Array.from(qualifications.values())
        .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }))
        .forEach((name) => {
            const option = document.createElement('option');
            option.value = String(name).toLowerCase();
            option.textContent = name;
            select.appendChild(option);
        });

    if (currentValue && Array.from(select.options).some((option) => option.value === currentValue)) {
        select.value = currentValue;
    }
}

function openAccountModal(id) {
    setValue('accountTraineeId', id);
    const form = document.getElementById('createAccountForm');
    if (form) form.reset();
    if (accountModal) accountModal.show();
}

async function handleCreateAccount(event) {
    event.preventDefault();
    const payload = {
        trainee_id: document.getElementById('accountTraineeId')?.value,
        username: document.getElementById('accountUsername')?.value,
        password: document.getElementById('accountPassword')?.value
    };

    try {
        if (sendingModal) sendingModal.show();
        const response = await axios.post(`${API_BASE_URL}/role/admin/trainees.php?action=create-account`, payload);
        if (sendingModal) sendingModal.hide();

        if (!response.data.success) {
            Swal.fire('Error', `Error: ${response.data.message || 'Unknown error'}`, 'error');
            return;
        }

        Swal.fire('Success', 'Account created successfully!', 'success');
        if (accountModal) accountModal.hide();
        loadTrainees();
    } catch (error) {
        if (sendingModal) sendingModal.hide();
        console.error('Error creating account:', error);
        const message = error.response?.data?.message ? `Failed to create account: ${error.response.data.message}` : 'Failed to create account';
        Swal.fire('Error', message, 'error');
    }
}

function viewProfile(id) {
    const trainee = traineesData.find((item) => String(item.trainee_id) === String(id));
    if (!trainee) return;

    setText('viewName', `${trainee.first_name || ''} ${trainee.last_name || ''}`.trim());
    setText('viewSchoolId', trainee.trainee_school_id || 'N/A');
    setText('viewEmail', trainee.email || 'N/A');
    setText('viewPhone', trainee.phone_number || 'N/A');
    setText('viewAddress', trainee.address || 'N/A');
    setText('viewBatch', trainee.batch_name || 'Not Enrolled');

    const statusBadge = document.getElementById('viewStatus');
    if (statusBadge) {
        statusBadge.textContent = String(trainee.status || 'unknown').toUpperCase();
        statusBadge.className = trainee.status === 'active'
            ? 'inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700'
            : 'inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700';
    }

    const photoImg = document.getElementById('viewPhoto');
    const noPhoto = document.getElementById('noPhoto');
    if (photoImg && noPhoto) {
        if (trainee.photo_file) {
            photoImg.src = `${UPLOADS_URL}${encodeURIComponent(trainee.photo_file)}`;
            photoImg.classList.remove('hidden');
            noPhoto.classList.add('hidden');
            photoImg.onerror = () => {
                photoImg.classList.add('hidden');
                noPhoto.classList.remove('hidden');
            };
        } else {
            photoImg.classList.add('hidden');
            noPhoto.classList.remove('hidden');
        }
    }

    setupDocLink('viewValidId', trainee.valid_id_file, 'Valid ID');
    setupDocLink('viewBirthCert', trainee.birth_cert_file, 'Birth Certificate');

    if (profileModal) profileModal.show();
}

function setupDocLink(elementId, filename, label) {
    const link = document.getElementById(elementId);
    if (!link) return;

    if (filename) {
        link.href = `${UPLOADS_URL}${encodeURIComponent(filename)}`;
        link.classList.remove('pointer-events-none', 'opacity-50');
        link.innerHTML = link.innerHTML.includes('id-card')
            ? `<i class="fas fa-id-card mr-2"></i> ${label} (Click to View)`
            : `<i class="fas fa-file-alt mr-2"></i> ${label} (Click to View)`;
        return;
    }

    link.href = '#';
    link.classList.add('pointer-events-none', 'opacity-50');
    link.innerHTML = link.innerHTML.includes('id-card')
        ? `<i class="fas fa-id-card mr-2"></i> ${label} (Not Uploaded)`
        : `<i class="fas fa-file-alt mr-2"></i> ${label} (Not Uploaded)`;
}

async function deleteTrainee(id) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await axios.delete(`${API_BASE_URL}/role/admin/trainees.php?action=delete&id=${id}`);
        if (!response.data.success) {
            Swal.fire('Error', response.data.message || 'Error deleting trainee', 'error');
            return;
        }
        Swal.fire('Deleted!', 'Trainee deleted successfully.', 'success');
        loadTrainees();
    } catch (error) {
        console.error('Error deleting trainee:', error);
        Swal.fire('Error', 'Error deleting trainee', 'error');
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function updateFilterStatus() {
    const statusEl = document.getElementById('filterStatus');
    if (!statusEl) return;

    const searchInput = document.getElementById('searchInput');
    const batchFilter = document.getElementById('batchFilter');
    const qualificationFilter = document.getElementById('qualificationFilter');
    const statusFilter = document.getElementById('statusFilter');
    const clearBtn = document.getElementById('clearFiltersBtn');

    const hasSearch = searchInput && searchInput.value.trim() !== '';
    const hasBatch = batchFilter && batchFilter.value !== '';
    const hasQual = qualificationFilter && qualificationFilter.value !== '';
    const hasStatus = statusFilter && statusFilter.value !== '';

    const activeFilters = [];
    if (hasSearch) activeFilters.push(`"${searchInput.value}"`);
    if (hasBatch) activeFilters.push(`Batch: ${batchFilter.options[batchFilter.selectedIndex].text}`);
    if (hasQual) activeFilters.push(`Program: ${qualificationFilter.options[qualificationFilter.selectedIndex].text}`);
    if (hasStatus) activeFilters.push(`Status: ${statusFilter.value}`);

    if (activeFilters.length > 0) {
        statusEl.innerHTML = `<i class="fas fa-filter text-blue-500 mr-1"></i>Filtering by: ${activeFilters.join(', ')}`;
        if (clearBtn) clearBtn.classList.remove('hidden');
    } else {
        statusEl.innerHTML = '';
        if (clearBtn) clearBtn.classList.add('hidden');
    }
}

function clearAllFilters() {
    const searchInput = document.getElementById('searchInput');
    const batchFilter = document.getElementById('batchFilter');
    const qualificationFilter = document.getElementById('qualificationFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) searchInput.value = '';
    if (batchFilter) batchFilter.value = '';
    if (qualificationFilter) qualificationFilter.value = '';
    if (statusFilter) statusFilter.value = '';

    updateFilterStatus();
    
    // Trigger table refresh if table manager exists
    const table = document.getElementById('traineesTable');
    if (table && window.tableManagers && window.tableManagers[0]) {
        window.tableManagers[0].apply();
    }
}

window.openAccountModal = openAccountModal;
window.viewProfile = viewProfile;
window.deleteTrainee = deleteTrainee;
window.clearAllFilters = clearAllFilters;
