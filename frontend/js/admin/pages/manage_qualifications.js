const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;
let currentQualifications = [];
let qualificationModal = null;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/Hohoo-ville/frontend/login.html';
        }
        return Promise.reject(error);
    }
);

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
    initQualificationActionMenus();
    initLogout();
    initModal();
    initializePage();
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

function initQualificationActionMenus() {
    document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-qualification-actions-wrapper]')) {
            closeQualificationActionMenus();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeQualificationActionMenus();
        }
    });
}

function closeQualificationActionMenus() {
    document.querySelectorAll('[data-qualification-actions-menu]').forEach((menu) => {
        menu.classList.add('hidden');
    });

    document.querySelectorAll('[data-qualification-actions-toggle]').forEach((button) => {
        button.setAttribute('aria-expanded', 'false');
    });
}

function toggleQualificationActionMenu(event, qualificationId) {
    event.preventDefault();
    event.stopPropagation();

    const menu = document.querySelector(`[data-qualification-actions-menu="${qualificationId}"]`);
    const button = document.querySelector(`[data-qualification-actions-toggle="${qualificationId}"]`);
    if (!menu || !button) return;

    const shouldOpen = menu.classList.contains('hidden');
    closeQualificationActionMenus();

    if (shouldOpen) {
        menu.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
    }
}

async function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async (event) => {
        event.preventDefault();
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
                if (typeof window.logout === 'function') {
                    window.logout();
                    return;
                }
                localStorage.clear();
                window.location.href = '/Hohoo-ville/frontend/login.html';
            }
        });
    });
}

function initModal() {
    const modalEl = document.getElementById('addQualificationModal');
    if (modalEl) qualificationModal = new SimpleModal(modalEl);

    document.querySelectorAll('[data-modal-hide="addQualificationModal"]').forEach((button) => {
        button.addEventListener('click', () => {
            if (qualificationModal) qualificationModal.hide();
        });
    });

    const openBtn = document.getElementById('openQualificationModalBtn');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            resetForm();
            if (qualificationModal) qualificationModal.show();
        });
    }
}

function initializePage() {
    loadQualifications();

    const form = document.getElementById('qualificationForm');
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const id = document.getElementById('qualificationId')?.value;
            if (id) updateQualification(id);
            else addQualification();
        });
    }

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            resetForm();
            if (qualificationModal) qualificationModal.hide();
        });
    }

    const tableBody = document.getElementById('qualificationsTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-action][data-id]');
            if (!actionEl) return;

            event.preventDefault();
            const action = actionEl.dataset.action;
            const id = actionEl.dataset.id;

            if (action === 'edit') editQualification(id);
            if (action === 'archive') archiveQualification(id);
        });
    }

    const viewArchivedBtn = document.getElementById('viewArchivedBtn');
    if (viewArchivedBtn) {
        viewArchivedBtn.addEventListener('click', showArchivedModal);
    }
}

async function loadQualifications() {
    try {
        const response = await apiClient.get('/role/admin/manage_qualifications.php?action=list');
        if (!response.data.success) {
            showAlert('Error', response.data.message || 'Error loading qualifications.', 'error');
            return;
        }
        renderTable(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
        console.error('Error loading qualifications:', error);
        showAlert('Error', 'Error loading qualifications.', 'error');
    }
}

function statusBadge(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'active') return '<span class="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>';
    if (normalized === 'pending') return '<span class="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Pending</span>';
    if (normalized === 'rejected') return '<span class="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Rejected</span>';
    return '<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Inactive</span>';
}

function formatNCLevel(ncLevelCode) {
    return ncLevelCode && String(ncLevelCode).trim() !== '' ? escapeHtml(ncLevelCode) : 'N/A';
}
function renderTable(data) {
    currentQualifications = data;
    const tbody = document.getElementById('qualificationsTableBody');
    if (!tbody) return;

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-slate-500">No qualifications found</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((item, index) => {
        const menuPositionClasses = data.length > 3 && data.length - index <= 3
            ? 'bottom-full right-0 mb-2 origin-bottom-right'
            : 'top-full right-0 mt-2 origin-top-right';

        return `
            <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 text-sm text-slate-900">${escapeHtml(item.qualification_name || '')}</td>
                <td class="px-3 py-3 text-sm text-slate-700"><span class="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">${formatNCLevel(item.nc_level_code || item.nc_level_name)}</span></td>
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(item.ctpr_number || '-')}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(item.duration || 'N/A')}</td>
                <td class="px-3 py-3 text-sm">${statusBadge(item.status)}</td>
                <td class="px-3 py-3 text-sm">
                    <div class="relative flex justify-center" data-qualification-actions-wrapper>
                        <button
                            type="button"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            data-qualification-actions-toggle="${item.qualification_id}"
                            aria-haspopup="true"
                            aria-expanded="false"
                            aria-controls="qualificationActionsMenu-${item.qualification_id}"
                            aria-label="Open qualification actions"
                            onclick="toggleQualificationActionMenu(event, ${item.qualification_id})"
                        >
                            <i class="fas fa-ellipsis-vertical"></i>
                        </button>
                        <div
                            id="qualificationActionsMenu-${item.qualification_id}"
                            class="absolute z-30 hidden w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80 ${menuPositionClasses}"
                            data-qualification-actions-menu="${item.qualification_id}"
                        >
                            <div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Actions
                            </div>
                            <button
                                type="button"
                                class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                                data-action="edit"
                                data-id="${item.qualification_id}"
                                onclick="closeQualificationActionMenus()"
                            >
                                <i class="fas fa-edit w-4 text-center text-blue-500"></i>
                                <span>Edit</span>
                            </button>
                            <button
                                type="button"
                                class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                                data-action="archive"
                                data-id="${item.qualification_id}"
                                onclick="closeQualificationActionMenus()"
                            >
                                <i class="fas fa-box-archive w-4 text-center text-amber-500"></i>
                                <span>Archive</span>
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function addQualification() {
    const payload = {
        qualification_name: document.getElementById('qualificationName')?.value?.trim(),
        nc_level_id: document.getElementById('ncLevel')?.value?.trim(),
        ctpr_number: document.getElementById('ctprNumber')?.value?.trim() || '',
        duration: document.getElementById('duration')?.value?.trim(),
        description: document.getElementById('description')?.value?.trim() || '',
        status: document.getElementById('qualificationStatus')?.value || 'active'
    };

    try {
        const response = await apiClient.post('/role/admin/manage_qualifications.php?action=add', payload);
        if (!response.data.success) {
            showAlert('Error', response.data.message || 'Error adding qualification.', 'error');
            return;
        }
        showAlert('Success', 'Qualification created successfully.', 'success');
        resetForm();
        if (qualificationModal) qualificationModal.hide();
        loadQualifications();
    } catch (error) {
        console.error('Error adding qualification:', error);
        showAlert('Error', 'Error adding qualification.', 'error');
    }
}

async function updateQualification(id) {
    const existing = currentQualifications.find((item) => String(item.qualification_id) === String(id));
    const payload = {
        qualification_id: id,
        qualification_name: document.getElementById('qualificationName')?.value?.trim(),
        nc_level_id: document.getElementById('ncLevel')?.value?.trim(),
        ctpr_number: document.getElementById('ctprNumber')?.value?.trim() || '',
        duration: document.getElementById('duration')?.value?.trim(),
        description: document.getElementById('description')?.value?.trim() || '',
        status: document.getElementById('qualificationStatus')?.value || existing?.status || 'active'
    };

    try {
        const response = await apiClient.post('/role/admin/manage_qualifications.php?action=update', payload);
        if (!response.data.success) {
            showAlert('Error', response.data.message || 'Error updating qualification.', 'error');
            return;
        }
        showAlert('Success', 'Qualification updated successfully.', 'success');
        resetForm();
        if (qualificationModal) qualificationModal.hide();
        loadQualifications();
    } catch (error) {
        console.error('Error updating qualification:', error);
        showAlert('Error', 'Error updating qualification.', 'error');
    }
}

async function archiveQualification(id) {
    const result = await Swal.fire({
        title: 'Archive qualification?',
        text: "The qualification will be moved to archived. You can restore it later.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d97706',
        confirmButtonText: 'Yes, archive it'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await apiClient.get(`/role/admin/manage_qualifications.php?action=archive&id=${id}`);
        if (!response.data.success) {
            showAlert('Error', response.data.message || 'Error archiving qualification.', 'error');
            return;
        }
        showAlert('Success', 'Qualification archived successfully.', 'success');
        loadQualifications();
    } catch (error) {
        console.error('Error archiving qualification:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Error archiving qualification.';
        showAlert('Error', errorMessage, 'error');
    }
}

async function showArchivedModal() {
    let archivedQualifications = [];
    try {
        const response = await apiClient.get('/role/admin/manage_qualifications.php?action=list-archived');
        archivedQualifications = Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
        archivedQualifications = [];
    }

    const html = archivedQualifications.length
        ? archivedQualifications.map((qual) => `
            <div class="mb-2 flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div class="text-left">
                    <p class="font-semibold text-slate-800">${escapeHtml(qual.qualification_name || '')}</p>
                    <p class="text-xs text-slate-500">${escapeHtml(qual.ctpr_number || 'N/A')}</p>
                </div>
                <button class="restore-qual-btn inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700" data-qual-id="${qual.qualification_id}" data-qual-name="${escapeHtml(qual.qualification_name || '')}">
                    <i class="fas fa-undo"></i> Restore
                </button>
            </div>
        `).join('')
        : '<div class="py-3 text-sm text-slate-500">No archived qualifications found.</div>';

    Swal.fire({
        title: 'Archived Qualifications',
        html,
        showCloseButton: true,
        showConfirmButton: false,
        width: '52rem',
        didOpen: () => {
            const container = Swal.getHtmlContainer();
            if (!container) return;

            container.querySelectorAll('.restore-qual-btn').forEach((button) => {
                button.addEventListener('click', async () => {
                    const qualId = button.getAttribute('data-qual-id');
                    const qualName = button.getAttribute('data-qual-name') || 'this qualification';

                    const result = await Swal.fire({
                        title: 'Restore Qualification?',
                        text: `Restore "${qualName}" and make it active again?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#10b981',
                        confirmButtonText: 'Yes, restore it'
                    });

                    if (!result.isConfirmed) return;

                    try {
                        const response = await apiClient.get(`/role/admin/manage_qualifications.php?action=unarchive&id=${qualId}`);
                        if (!response.data.success) {
                            showAlert('Error', response.data.message || 'Error restoring qualification.', 'error');
                            return;
                        }
                        showAlert('Success', 'Qualification restored successfully.', 'success');
                        showArchivedModal();
                        loadQualifications();
                    } catch (error) {
                        console.error('Error restoring qualification:', error);
                        showAlert('Error', 'Error restoring qualification.', 'error');
                    }
                });
            });
        }
    });
}

function editQualification(id) {
    const item = currentQualifications.find((q) => String(q.qualification_id) === String(id));
    if (!item) return;

    setValue('qualificationId', item.qualification_id);
    setValue('qualificationName', item.qualification_name || '');
    setValue('ncLevel', item.nc_level_id || '');
    setValue('ctprNumber', item.ctpr_number || '');
    setValue('duration', item.duration || '');
    setValue('qualificationStatus', item.status || 'active');
    setValue('description', item.description || '');

    setText('submitBtn', 'Update Qualification');
    setText('addQualificationModalLabel', 'Edit Qualification');

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.classList.remove('hidden');

    if (qualificationModal) qualificationModal.show();
}

function resetForm() {
    const form = document.getElementById('qualificationForm');
    if (form) form.reset();

    setValue('qualificationId', '');
    setText('submitBtn', 'Add Qualification');
    setText('addQualificationModalLabel', 'Add New Qualification');

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function showAlert(title, text, icon) {
    if (window.Swal) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            timer: 2500,
            showConfirmButton: false,
            icon,
            title: `${title}: ${text}`
        });
        return;
    }
    alert(`${title}: ${text}`);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
