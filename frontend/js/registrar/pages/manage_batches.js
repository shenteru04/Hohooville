const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const TRAINER_PROGRESS_CHART_URL = `${window.location.origin}/Hohoo-ville/frontend/html/trainer/pages/progress_chart.html`;
const TRAINER_ACHIEVEMENT_CHART_URL = `${window.location.origin}/Hohoo-ville/frontend/html/trainer/pages/achievement_chart.html`;
const UPLOADS_URL = window.location.origin + '/Hohoo-ville/uploads/trainees/';
let batchModal;
let viewBatchModal;
let viewTraineeModal;
let documentModal;
let allQualifications = [];
let allTrainers = [];
let allScholarships = [];
let batchesData = [];
let currentBatchId = null;
let currentBatchName = null;
let closedBatchesModal;
let documentZoom = 1;

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
    initRegistrarBatchActionMenus();
    initLogout();
    initModalDismissers();
    initTraineeTabs();
    hydrateHeaderUser();

    batchModal = new SimpleModal(document.getElementById('batchModal'));
    viewBatchModal = new SimpleModal(document.getElementById('viewBatchModal'));
    viewTraineeModal = new SimpleModal(document.getElementById('viewTraineeModal'));
    documentModal = new SimpleModal(document.getElementById('documentModal'));
    closedBatchesModal = new SimpleModal(document.getElementById('closedBatchesModal'));
    initDocumentZoomControls();

    loadInitialData();

    const addBatchForm = document.getElementById('addBatchForm');
    if (addBatchForm) addBatchForm.addEventListener('submit', saveBatch);

    const qualificationSelect = document.getElementById('qualificationSelect');
    if (qualificationSelect) qualificationSelect.addEventListener('change', handleQualificationChange);
    document.querySelectorAll('input[name="trainerAssignmentMode"]').forEach((input) => {
        input.addEventListener('change', () => applyTrainerAssignmentMode(input.value));
    });
    applyTrainerAssignmentMode(getSelectedTrainerAssignmentMode());

    const openClosedBtn = document.getElementById('openClosedBatches');
    if (openClosedBtn) {
        openClosedBtn.addEventListener('click', () => {
            if (closedBatchesModal) closedBatchesModal.show();
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

function formatQualificationOptionLabel(qualification) {
    const baseName = qualification?.qualification_name || qualification?.course_name || 'Unnamed Qualification';
    const ncLevel = qualification?.nc_level_code || qualification?.nc_level_name || '';
    return ncLevel ? `${baseName} (${ncLevel})` : baseName;
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
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/Hohoo-ville/frontend/login.html';
            }
        });
    });
}

function initModalDismissers() {
    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            hideModalById(button.getAttribute('data-modal-hide'));
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        document.querySelectorAll('.modal-root.flex:not(.hidden)').forEach((modal) => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        });
        document.body.classList.remove('overflow-hidden');
    });
}

function hideModalById(modalId) {
    if (!modalId) return;
    if (modalId === 'batchModal' && batchModal) return batchModal.hide();
    if (modalId === 'viewBatchModal' && viewBatchModal) return viewBatchModal.hide();
    if (modalId === 'viewTraineeModal' && viewTraineeModal) return viewTraineeModal.hide();
    if (modalId === 'documentModal' && documentModal) {
        resetDocumentPreview();
        return documentModal.hide();
    }
    if (modalId === 'closedBatchesModal' && closedBatchesModal) return closedBatchesModal.hide();

    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex');
    if (!document.querySelector('.modal-root.flex:not(.hidden)')) {
        document.body.classList.remove('overflow-hidden');
    }
}

function initTraineeTabs() {
    const tabButtons = Array.from(document.querySelectorAll('#viewTraineeTabs .tab-btn'));
    const panes = Array.from(document.querySelectorAll('#viewTraineeTabsContent .tab-pane'));
    if (!tabButtons.length || !panes.length) return;

    const setActiveTab = (targetId) => {
        tabButtons.forEach((btn) => {
            const isActive = btn.getAttribute('data-target') === targetId;
            btn.classList.toggle('bg-blue-600', isActive);
            btn.classList.toggle('text-white', isActive);
            btn.classList.toggle('border', !isActive);
            btn.classList.toggle('border-slate-300', !isActive);
            btn.classList.toggle('bg-white', !isActive);
            btn.classList.toggle('text-slate-600', !isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        panes.forEach((pane) => {
            pane.classList.toggle('hidden', pane.id !== targetId);
        });
    };

    tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => setActiveTab(btn.getAttribute('data-target')));
    });

    window.setActiveTraineeTab = setActiveTab;
    setActiveTab('detailPersonal');
}

async function loadInitialData() {
    await loadFormData();
    await loadBatches();
}

async function loadFormData() {
    try {
        // Fetch qualifications
        const qualResponse = await axios.get(`${API_BASE_URL}/role/registrar/qualifications.php?action=list`);
        if (qualResponse.data.success) {
            allQualifications = qualResponse.data.data;
            const qualSelect = document.getElementById('qualificationSelect');
            qualSelect.innerHTML = '<option value="">Select Qualification</option>';
            allQualifications.forEach(q => {
                const option = document.createElement('option');
                option.value = q.qualification_id;
                option.textContent = formatQualificationOptionLabel(q);
                qualSelect.appendChild(option);
            });
        }

        // Fetch trainers and scholarships
        const formDataResponse = await axios.get(`${API_BASE_URL}/role/registrar/batches.php?action=get-form-data`);
        if (formDataResponse.data.success) {
            allTrainers = (formDataResponse.data.data.trainers || []).map(t => {
                const ids = (t.qualification_ids || '')
                    .toString()
                    .split(',')
                    .map(v => v.trim())
                    .filter(Boolean);
                return {
                    ...t,
                    qualification_ids: ids
                };
            });
            allScholarships = formDataResponse.data.data.scholarships;

            const trainerSelect = document.getElementById('trainerSelect');
            trainerSelect.innerHTML = '<option value="">Select Trainer</option>';

            const scholarshipSelect = document.getElementById('scholarshipSelect');
            scholarshipSelect.innerHTML = '<option value="">None</option>';
            allScholarships.forEach(s => {
                scholarshipSelect.innerHTML += `<option value="${s.scholarship_type_id}">${s.scholarship_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading form data:', error);
    }
}

async function loadBatches() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/batches.php?action=list`);
        if (response.data.success) {
            batchesData = response.data.data || [];
            const currentBatches = batchesData.filter((batch) => !isBatchArchived(batch));
            const archivedBatches = batchesData.filter((batch) => isBatchArchived(batch));

            renderBatchesTable(currentBatches, 'batchesTableBody');
            renderBatchesTable(archivedBatches, 'closedBatchesTableBody', true);
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

function isBatchArchived(batch) {
    const status = String(batch?.status || '').trim().toLowerCase();
    if (['archived', 'completed', 'finished'].includes(status)) return true;

    const endDate = String(batch?.end_date || '').trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return false;

    const completionDate = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(completionDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return completionDate < today;
}

function renderBatchesTable(data, tbodyId, isArchive = false) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        const emptyMessage = isArchive ? 'No completed batches in the archive.' : 'No current batches found.';
        tbody.innerHTML = `<tr><td colspan="9" class="px-4 py-6 text-center text-sm text-slate-500">${emptyMessage}</td></tr>`;
        return;
    }

    data.forEach((batch, index) => {
        const statusClass = batch.status === 'open'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-200 text-slate-700';
        const mode = normalizeTrainerAssignmentMode(batch.trainer_assignment_mode);
        const modeLabel = mode === 'multiple' ? 'Multiple by unit' : 'Single trainer';
        const trainerSummary = batch.trainer_summary || batch.trainer_name || 'Not Assigned';
        const safeBatchName = escapeAttr(batch.batch_name || '');
        const menuPositionClasses = data.length > 3 && data.length - index <= 3
            ? 'bottom-full right-0 mb-2 origin-bottom-right'
            : 'top-full right-0 mt-2 origin-top-right';
        const menuItems = isArchive
            ? `
                <button
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                    type="button"
                    data-batch-name="${safeBatchName}"
                    onclick="closeRegistrarBatchActionMenus(); viewBatch(${batch.batch_id}, this.dataset.batchName)"
                >
                    <i class="fas fa-users w-4 text-center text-blue-500"></i>
                    <span>View Student List</span>
                </button>
                <button
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                    type="button"
                    onclick="closeRegistrarBatchActionMenus(); openBatchArchiveChart('progress', ${batch.batch_id})"
                >
                    <i class="fas fa-chart-line w-4 text-center text-emerald-500"></i>
                    <span>Progress Chart</span>
                </button>
                <button
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-fuchsia-700 transition hover:bg-fuchsia-50"
                    type="button"
                    onclick="closeRegistrarBatchActionMenus(); openBatchArchiveChart('achievement', ${batch.batch_id})"
                >
                    <i class="fas fa-trophy w-4 text-center text-fuchsia-500"></i>
                    <span>Achievement Chart</span>
                </button>
            `
            : `
                <button
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                    type="button"
                    data-batch-name="${safeBatchName}"
                    onclick="closeRegistrarBatchActionMenus(); viewBatch(${batch.batch_id}, this.dataset.batchName)"
                >
                    <i class="fas fa-eye w-4 text-center text-blue-500"></i>
                    <span>View Students</span>
                </button>
                <button
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    type="button"
                    onclick="closeRegistrarBatchActionMenus(); editBatch(${batch.batch_id})"
                >
                    <i class="fas fa-edit w-4 text-center text-slate-500"></i>
                    <span>Edit</span>
                </button>
            `;
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 text-sm text-slate-800">${escapeHtml(batch.batch_name || '')}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(batch.qualification_name || batch.course_name || 'N/A')}</td>
                <td class="px-4 py-3 text-sm text-slate-700">
                    <p class="font-medium text-slate-800">${escapeHtml(trainerSummary)}</p>
                    <p class="text-xs text-slate-500">${modeLabel}</p>
                </td>
                <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(batch.scholarship_type || 'None')}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(batch.start_date || '')}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(batch.end_date || '')}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(batch.max_trainees || '25')}</td>
                <td class="px-4 py-3">
                    <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}">${batch.status}</span>
                </td>
                <td class="px-4 py-3">
                    <div class="relative flex justify-center" data-registrar-batch-actions-wrapper>
                        <button
                            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            type="button"
                            data-registrar-batch-actions-toggle="${batch.batch_id}"
                            aria-haspopup="true"
                            aria-expanded="false"
                            aria-controls="registrarBatchActionsMenu-${batch.batch_id}"
                            aria-label="Open batch actions"
                            onclick="toggleRegistrarBatchActionMenu(event, ${batch.batch_id})"
                        >
                            <i class="fas fa-ellipsis-vertical"></i>
                        </button>
                        <div
                            id="registrarBatchActionsMenu-${batch.batch_id}"
                            class="absolute z-30 hidden w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80 ${menuPositionClasses}"
                            data-registrar-batch-actions-menu="${batch.batch_id}"
                        >
                            <div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Actions
                            </div>
                            ${menuItems}
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
}

window.openBatchArchiveChart = function(type, batchId) {
    const normalizedBatchId = Number.parseInt(batchId, 10);
    if (!Number.isInteger(normalizedBatchId) || normalizedBatchId <= 0) {
        Swal.fire('Error', 'The selected batch is invalid.', 'error');
        return;
    }

    const chartUrl = new URL(
        type === 'achievement' ? TRAINER_ACHIEVEMENT_CHART_URL : TRAINER_PROGRESS_CHART_URL,
        window.location.origin
    );
    chartUrl.searchParams.set('batch_id', String(normalizedBatchId));
    chartUrl.searchParams.set('source', 'registrar');
    window.open(chartUrl.toString(), '_blank', 'noopener');
};

window.openAddModal = function() {
    document.getElementById('addBatchForm').reset();
    document.getElementById('batchId').value = '';
    document.getElementById('batchModalLabel').textContent = 'Create New Batch';
    document.getElementById('submitBtn').textContent = 'Create Batch';
    document.getElementById('trainerSelect').innerHTML = '<option value="">Select Trainer</option>';
    document.getElementById('maxTrainees').value = '25';
    // training_cost removed from batch-level form; qualification cost used for projections
    document.getElementById('status').value = 'open';
    setTrainerAssignmentMode('single');
    batchModal.show();
}

window.editBatch = async function(id) {
    const response = await axios.get(`${API_BASE_URL}/role/registrar/batches.php?action=list`);
    const batch = response.data.data.find(b => b.batch_id == id);

    if (batch) {
        document.getElementById('batchId').value = batch.batch_id;
        document.getElementById('batchName').value = batch.batch_name;
        document.getElementById('qualificationSelect').value = batch.qualification_id;
        filterTrainers(batch.qualification_id);
        document.getElementById('trainerSelect').value = batch.trainer_id;
        setTrainerAssignmentMode(batch.trainer_assignment_mode || 'single');
        document.getElementById('scholarshipSelect').value = batch.scholarship_type_id;
        document.getElementById('startDate').value = batch.start_date;
        document.getElementById('endDate').value = batch.end_date;
        document.getElementById('maxTrainees').value = batch.max_trainees || 25;
        // training_cost removed from batch-level form; qualification cost used for projections
        document.getElementById('status').value = batch.status;
        
        document.getElementById('batchModalLabel').textContent = 'Edit Batch';
        document.getElementById('submitBtn').textContent = 'Save Changes';
        batchModal.show();
    }
}

function filterTrainers(qualId) {
    const trainerSelect = document.getElementById('trainerSelect');
    trainerSelect.innerHTML = '<option value="">Select Trainer</option>';
    
    if (!qualId) return;
    
    const qual = allQualifications.find(q => q.qualification_id == qualId);
    if (!qual) return;

    const filtered = allTrainers.filter(t => Array.isArray(t.qualification_ids) && t.qualification_ids.includes(String(qualId)));
    
    // Sort trainers alphabetically by last name, then first name
    const sorted = filtered.sort((a, b) => {
        const lastNameA = (a.last_name || '').toUpperCase();
        const lastNameB = (b.last_name || '').toUpperCase();
        
        if (lastNameA !== lastNameB) {
            return lastNameA.localeCompare(lastNameB);
        }
        
        const firstNameA = (a.first_name || '').toUpperCase();
        const firstNameB = (b.first_name || '').toUpperCase();
        return firstNameA.localeCompare(firstNameB);
    });
    
    if (sorted.length === 0) {
        trainerSelect.innerHTML += '<option value="" disabled>No trainers available</option>';
    } else {
        sorted.forEach(t => {
            trainerSelect.innerHTML += `<option value="${t.trainer_id}">${t.first_name} ${t.last_name}</option>`;
        });
    }
}

function handleQualificationChange() {
    const qualId = this.value;
    filterTrainers(qualId);
    
    if (!document.getElementById('batchId').value) {
        const qual = allQualifications.find(q => q.qualification_id == qualId);
        const count = batchesData.filter(b => b.qualification_id == qualId).length + 1;
        document.getElementById('batchName').value = qual ? `${qual.qualification_name || qual.course_name || 'Qualification'} - Batch ${count}` : '';
    }
}

async function saveBatch(e) {
    e.preventDefault();
    const id = document.getElementById('batchId').value;
    const maxTrainees = document.getElementById('maxTrainees').value;
    const assignmentMode = getSelectedTrainerAssignmentMode();

    if (!maxTrainees || Number(maxTrainees) <= 0) {
        Swal.fire('Error', 'Max trainees must be greater than zero.', 'error');
        return;
    }

    const payload = {
        batch_id: id,
        batch_name: document.getElementById('batchName').value,
        qualification_id: document.getElementById('qualificationSelect').value,
        trainer_id: document.getElementById('trainerSelect').value,
        trainer_assignment_mode: assignmentMode,
        scholarship_type_id: document.getElementById('scholarshipSelect').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        max_trainees: maxTrainees,
        status: document.getElementById('status').value
    };

    const action = id ? 'update' : 'add';

    try {
        const response = await axios.post(`${API_BASE_URL}/role/registrar/batches.php?action=${action}`, payload);
        if (response.data.success) {
            Swal.fire('Success', `Batch ${id ? 'updated' : 'added'} successfully!`, 'success');
            batchModal.hide();
            loadBatches();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error saving batch:', error);
    }
}

function getSelectedTrainerAssignmentMode() {
    return normalizeTrainerAssignmentMode(document.querySelector('input[name="trainerAssignmentMode"]:checked')?.value);
}

function setTrainerAssignmentMode(mode) {
    const normalizedMode = normalizeTrainerAssignmentMode(mode);
    const radio = document.querySelector(`input[name="trainerAssignmentMode"][value="${normalizedMode}"]`);
    if (radio) {
        radio.checked = true;
    }
    applyTrainerAssignmentMode(normalizedMode);
}

function applyTrainerAssignmentMode(mode) {
    const normalizedMode = normalizeTrainerAssignmentMode(mode);
    const label = document.getElementById('trainerSelectLabel');
    const help = document.getElementById('trainerSelectHelp');
    const hint = document.getElementById('trainerAssignmentHint');
    const cards = Array.from(document.querySelectorAll('input[name="trainerAssignmentMode"]')).map((input) => input.closest('label'));

    cards.forEach((card) => {
        if (!card) return;
        const isActive = card.querySelector('input')?.value === normalizedMode;
        card.classList.toggle('border-blue-200', isActive);
        card.classList.toggle('bg-blue-50/60', isActive);
        card.classList.toggle('border-slate-300', !isActive);
    });

    if (label) {
        label.textContent = normalizedMode === 'multiple' ? 'Lead Trainer (Optional)' : 'Assign Trainer';
    }
    if (help) {
        help.textContent = normalizedMode === 'multiple'
            ? 'Optional lead trainer can be scheduled immediately. Unit trainer assignment happens on the Schedule page.'
            : 'This trainer is used for the whole batch in single mode.';
    }
    if (hint) {
        hint.textContent = normalizedMode === 'multiple'
            ? 'Multiple mode uses an optional lead trainer here, then trainer assignment per unit happens on the Schedule page.'
            : 'Single mode keeps one trainer and one shared schedule for the whole batch.';
    }
}

function normalizeTrainerAssignmentMode(mode) {
    return String(mode || '').toLowerCase() === 'multiple' ? 'multiple' : 'single';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
    return escapeHtml(value);
}

function setText(elementId, value, fallback = 'N/A') {
    const element = document.getElementById(elementId);
    if (!element) return;

    const normalized = String(value ?? '').trim();
    element.textContent = normalized || fallback;
}

function setBadge(elementId, label, className) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = label;
    element.className = className;
}

function getFullName(trainee) {
    const firstName = String(trainee?.first_name || '').trim();
    const lastName = String(trainee?.last_name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'Unnamed Trainee';
}

function getInitials(name) {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (!parts.length) return 'NA';
    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

function joinLabelParts(parts, fallback = 'N/A') {
    const value = (parts || [])
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', ');
    return value || fallback;
}

function humanizeLabel(value, fallback = 'N/A') {
    const normalized = String(value || '')
        .replace(/_/g, ' ')
        .trim();

    if (!normalized) return fallback;

    return normalized
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function formatDateTimeValue(value, fallback = 'Not Available') {
    const raw = String(value || '').trim();
    if (!raw) return fallback;

    const parsed = new Date(raw.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) {
        return raw;
    }

    return parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function getEnrollmentLabel(trainee) {
    return formatDateTimeValue(trainee?.formatted_enrollment_date || trainee?.enrollment_date, 'Not Available');
}

function getProgramLabel(trainee) {
    return trainee?.qualification_name || trainee?.course_name || 'Not Assigned';
}

function getFacebookHref(value) {
    const account = String(value || '').trim();
    if (!account) return '';
    if (/^https?:\/\//i.test(account)) return account;
    if (/^www\./i.test(account)) return `https://${account}`;
    if (/facebook\.com/i.test(account)) return `https://${account.replace(/^https?:\/\//i, '')}`;
    return '';
}

function setContactLink(elementId, text, href, enabledClassName) {
    const link = document.getElementById(elementId);
    if (!link) return;

    const value = String(text || '').trim();
    const label = link.querySelector('span');
    if (label) {
        label.textContent = value || 'Not provided';
    } else {
        link.textContent = value || 'Not provided';
    }

    if (href) {
        link.href = href;
        link.target = href.startsWith('http') ? '_blank' : '';
        link.rel = href.startsWith('http') ? 'noopener noreferrer' : '';
        link.className = enabledClassName;
        return;
    }

    link.href = '#';
    link.target = '';
    link.rel = '';
    link.className = 'mt-2 block text-sm font-medium text-slate-500 pointer-events-none';
}

function encodePathSegments(path) {
    return String(path || '')
        .replace(/\\/g, '/')
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');
}

function getUploadedFileUrl(filename, defaultFolder = 'trainees') {
    const raw = String(filename || '').trim();
    if (!raw) return '';
    if (/^(data:|https?:\/\/)/i.test(raw)) return raw;

    const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');
    if (/^hohoo-ville\/uploads\//i.test(normalized)) {
        return `${window.location.origin}/${encodePathSegments(normalized)}`;
    }
    if (/^uploads\//i.test(normalized)) {
        return `${window.location.origin}/Hohoo-ville/${encodePathSegments(normalized)}`;
    }
    if (normalized.includes('/')) {
        return `${window.location.origin}/Hohoo-ville/uploads/${encodePathSegments(normalized)}`;
    }

    return `${window.location.origin}/Hohoo-ville/uploads/${defaultFolder}/${encodeURIComponent(normalized)}`;
}

function getTraineeImageUrl(trainee) {
    const imageFile = trainee?.profile_image || trainee?.photo_file;
    if (!imageFile) return '';

    const defaultFolder = String(imageFile).startsWith('photo_') ? 'trainees' : 'profile_images';
    return getUploadedFileUrl(imageFile, defaultFolder);
}

function isLikelyImageReference(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return false;
    if (/^data:image\//i.test(normalized)) return true;
    if (/^sig_[^.\s]+$/i.test(normalized)) return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(normalized.split('?')[0]);
}

function renderDetailSignature(signatureValue) {
    const sigImg = document.getElementById('detailSignatureImg');
    const sigFallback = document.getElementById('detailNoSignature');
    if (!sigImg || !sigFallback) return;

    const normalized = String(signatureValue || '').trim();

    sigImg.removeAttribute('src');
    sigImg.classList.add('hidden');
    sigImg.onerror = null;

    if (!normalized) {
        sigFallback.textContent = 'No signature on file';
        sigFallback.className = 'text-sm text-slate-500';
        sigFallback.classList.remove('hidden');
        return;
    }

    if (isLikelyImageReference(normalized)) {
        sigImg.src = getUploadedFileUrl(normalized);
        sigImg.classList.remove('hidden');
        sigFallback.textContent = 'No signature on file';
        sigFallback.className = 'text-sm text-slate-500 hidden';
        sigImg.onerror = () => {
            sigImg.removeAttribute('src');
            sigImg.classList.add('hidden');
            sigFallback.textContent = normalized;
            sigFallback.className = 'max-w-full break-words text-center text-2xl italic text-slate-700';
            sigFallback.classList.remove('hidden');
        };
        return;
    }

    sigFallback.textContent = normalized;
    sigFallback.className = 'max-w-full break-words text-center text-2xl italic text-slate-700';
    sigFallback.classList.remove('hidden');
}

function getStatusMeta(status) {
    const normalizedStatus = String(status || 'unknown').toLowerCase();

    if (normalizedStatus === 'active') {
        return {
            label: 'Active',
            className: 'inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-white'
        };
    }

    if (normalizedStatus === 'inactive') {
        return {
            label: 'Inactive',
            className: 'inline-flex rounded-full border border-white/20 bg-slate-900/20 px-3 py-1 text-xs font-semibold text-white'
        };
    }

    return {
        label: 'Unknown',
        className: 'inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white'
    };
}

function getAccountMeta(trainee) {
    if (trainee?.user_id) {
        return {
            badgeLabel: 'Account Ready',
            badgeClassName: 'inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-white',
            detail: 'A login account is already linked to this trainee profile.'
        };
    }

    return {
        badgeLabel: 'Setup Pending',
        badgeClassName: 'inline-flex rounded-full border border-amber-200/30 bg-amber-300/20 px-3 py-1 text-xs font-semibold text-white',
        detail: 'No login account has been created for this trainee yet.'
    };
}

function initDocumentZoomControls() {
    const zoomOutBtn = document.getElementById('docZoomOutBtn');
    const zoomInBtn = document.getElementById('docZoomInBtn');
    const zoomResetBtn = document.getElementById('docZoomResetBtn');

    if (!zoomOutBtn || zoomOutBtn.dataset.bound === 'true') return;

    zoomOutBtn.dataset.bound = 'true';
    zoomOutBtn.addEventListener('click', () => setDocumentZoom(documentZoom - 0.1));
    zoomInBtn?.addEventListener('click', () => setDocumentZoom(documentZoom + 0.1));
    zoomResetBtn?.addEventListener('click', () => setDocumentZoom(1));
}

function setDocumentZoom(value) {
    const zoomLayer = document.getElementById('documentZoomLayer');
    const zoomLabel = document.getElementById('docZoomLabel');
    if (!zoomLayer) return;

    documentZoom = Math.max(0.5, Math.min(3, Number(value.toFixed(2))));
    zoomLayer.style.transform = `scale(${documentZoom})`;
    if (zoomLabel) zoomLabel.textContent = `${Math.round(documentZoom * 100)}%`;
}

function resetDocumentPreview() {
    const imageEl = document.getElementById('documentPreviewImage');
    const frameEl = document.getElementById('documentPreviewFrame');
    const fallbackEl = document.getElementById('documentPreviewFallback');
    const downloadLink = document.getElementById('documentPreviewDownloadLink');
    const openBtn = document.getElementById('docOpenNewTabBtn');
    const viewport = document.getElementById('documentViewport');
    const modalTitle = document.getElementById('documentModalTitle');

    if (imageEl) {
        imageEl.classList.add('hidden');
        imageEl.removeAttribute('src');
        imageEl.onerror = null;
    }

    if (frameEl) {
        frameEl.classList.add('hidden');
        frameEl.removeAttribute('src');
        frameEl.onerror = null;
    }

    if (fallbackEl) fallbackEl.classList.add('hidden');
    if (downloadLink) downloadLink.href = '#';
    if (openBtn) openBtn.href = '#';
    if (modalTitle) modalTitle.textContent = 'Submitted Document';
    if (viewport) {
        viewport.scrollTop = 0;
        viewport.scrollLeft = 0;
    }

    setDocumentZoom(1);
}

function openDocumentModal(url, title) {
    if (!documentModal || !url) return;

    const modalTitle = document.getElementById('documentModalTitle');
    const openBtn = document.getElementById('docOpenNewTabBtn');
    const imageEl = document.getElementById('documentPreviewImage');
    const frameEl = document.getElementById('documentPreviewFrame');
    const fallbackEl = document.getElementById('documentPreviewFallback');
    const downloadLink = document.getElementById('documentPreviewDownloadLink');

    resetDocumentPreview();

    if (modalTitle) modalTitle.textContent = title || 'Submitted Document';
    if (openBtn) openBtn.href = url;
    if (downloadLink) downloadLink.href = url;

    const cleanUrl = url.split('?')[0].toLowerCase();
    const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg|avif)$/i.test(cleanUrl);
    const isPdf = /\.pdf$/i.test(cleanUrl);
    const unsupportedInline = /\.(doc|docx|ppt|pptx|xls|xlsx|csv)$/i.test(cleanUrl);

    if (isImage && imageEl) {
        imageEl.src = url;
        imageEl.classList.remove('hidden');
        imageEl.onerror = () => {
            imageEl.classList.add('hidden');
            fallbackEl?.classList.remove('hidden');
        };
    } else if (isPdf && frameEl) {
        frameEl.src = url;
        frameEl.classList.remove('hidden');
    } else if (unsupportedInline) {
        fallbackEl?.classList.remove('hidden');
    } else if (frameEl) {
        frameEl.src = url;
        frameEl.classList.remove('hidden');
        frameEl.onerror = () => {
            frameEl.classList.add('hidden');
            fallbackEl?.classList.remove('hidden');
        };
    } else {
        fallbackEl?.classList.remove('hidden');
    }

    documentModal.show();
}

function setupDetailDocLink(elementId, filename, title) {
    const link = document.getElementById(elementId);
    const status = document.getElementById(`${elementId}Status`);
    const action = document.getElementById(`${elementId}Action`);
    if (!link || !status || !action) return false;

    const fileUrl = getUploadedFileUrl(filename);
    if (fileUrl) {
        link.href = fileUrl;
        link.target = '';
        link.rel = '';
        link.onclick = (event) => {
            event.preventDefault();
            openDocumentModal(fileUrl, title);
        };
        link.className = 'group rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50';
        status.textContent = 'Click to preview this document in a modal.';
        action.textContent = 'Preview';
        action.className = 'inline-flex shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700';
        return true;
    }

    link.href = '#';
    link.target = '';
    link.rel = '';
    link.onclick = null;
    link.className = 'group rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 opacity-80 pointer-events-none';
    status.textContent = 'Not uploaded yet.';
    action.textContent = 'Missing';
    action.className = 'inline-flex shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600';
    return false;
}

window.viewBatch = async function(id, name) {
    currentBatchId = id;
    currentBatchName = name;
    document.getElementById('viewBatchTitle').textContent = name;
    const tbody = document.getElementById('batchTraineesBody');
    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">Loading...</td></tr>';
    viewBatchModal.show();

    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/batches.php?action=get-trainees&batch_id=${id}`);
        tbody.innerHTML = '';
        
        if (response.data.success) {
            const trainees = response.data.data;
            if (trainees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No trainees enrolled in this batch.</td></tr>';
            } else {
                trainees.forEach(t => {
                    const traineeStatusClass = t.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-700';
                    tbody.innerHTML += `
                        <tr class="hover:bg-slate-50">
                            <td class="px-4 py-3 text-sm text-slate-800">${t.last_name}, ${t.first_name}</td>
                            <td class="px-4 py-3 text-sm text-slate-700">${t.email}</td>
                            <td class="px-4 py-3 text-sm text-slate-700">${t.phone_number || 'N/A'}</td>
                            <td class="px-4 py-3">
                                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${traineeStatusClass}">${t.status}</span>
                            </td>
                            <td class="px-4 py-3">
                                <div class="flex flex-wrap gap-1">
                                    <button class="inline-flex items-center rounded-md bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="viewTraineeDetails(${t.trainee_id})" title="View">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="openPrint(${t.trainee_id})" title="Print">
                                        <i class="fas fa-print"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-red-600">${response.data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching batch trainees:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-red-600">Failed to load trainees.</td></tr>';
    }
}

window.viewTraineeDetails = async function(id) {
    try {
        const params = new URLSearchParams({
            action: 'get-trainee-details',
            trainee_id: String(id)
        });

        if (currentBatchId) {
            params.set('batch_id', String(currentBatchId));
        }

        const response = await axios.get(`${API_BASE_URL}/role/registrar/batches.php?${params.toString()}`);
        if (response.data.success) {
            const t = response.data.data || {};
            const fullName = getFullName(t);
            const schoolId = t.trainee_school_id || 'N/A';
            const statusMeta = getStatusMeta(t.status);
            const accountMeta = getAccountMeta(t);
            const photoUrl = getTraineeImageUrl(t);
            const address = joinLabelParts([
                t.house_no_street,
                t.barangay,
                t.district,
                t.city_municipality,
                t.province,
                t.region
            ]);
            const birthplace = joinLabelParts([
                t.birthplace_city,
                t.birthplace_province,
                t.birthplace_region
            ]);
            const classification = String(t.learner_classification || '')
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
                .join(', ');

            setText('detailName', fullName, 'Unnamed Trainee');
            setText('detailInitials', getInitials(fullName), 'NA');
            setText('detailProfileSchoolId', schoolId === 'N/A' ? 'School ID not available' : `School ID: ${schoolId}`, 'School ID not available');
            setText('detailSchoolId', schoolId);
            setText('detailAccountDetail', accountMeta.detail, 'Pending account setup');
            setBadge('detailStatus', statusMeta.label, statusMeta.className);
            setBadge('detailAccountStatus', accountMeta.badgeLabel, accountMeta.badgeClassName);

            setText('detailProgram', getProgramLabel(t), 'Not Assigned');
            setText('detailBatch', t.batch_name || currentBatchName || 'Not Enrolled', 'Not Enrolled');
            setText('detailEnrollmentDate', getEnrollmentLabel(t), 'Not Available');

            setText('detailSex', humanizeLabel(t.sex));
            setText('detailCivilStatus', humanizeLabel(t.civil_status));
            setText('detailBirthdate', t.birthdate || 'N/A');
            setText('detailAge', t.age || 'N/A');
            setText('detailNationality', t.nationality || 'N/A');
            setText('detailBirthplace', birthplace);
            setText('detailAddress', address);

            setContactLink('detailEmailLink', t.email, t.email ? `mailto:${t.email}` : '', 'mt-2 block break-all text-sm font-semibold text-blue-700 hover:text-blue-800');
            setContactLink('detailPhoneLink', t.phone_number, t.phone_number ? `tel:${String(t.phone_number).replace(/\s+/g, '')}` : '', 'mt-2 block text-sm font-semibold text-slate-900 hover:text-blue-700');
            setContactLink('detailFacebookLink', t.facebook_account, getFacebookHref(t.facebook_account), 'mt-2 block break-all text-sm font-semibold text-slate-900 hover:text-blue-700');

            setText('detailEducation', t.educational_attainment || 'N/A');
            setText('detailEmploymentStatus', humanizeLabel(t.employment_status));
            setText('detailEmploymentType', humanizeLabel(t.employment_type));
            setText('detailClassification', classification, 'N/A');
            setText('detailIsPwd', t.is_pwd == 1 ? 'Yes' : 'No');
            setText('detailDisabilityType', t.disability_type || 'N/A');
            setText('detailDisabilityCause', t.disability_cause || 'N/A');
            setText('detailDuration', t.nominal_duration || 'N/A');
            setText('detailScholarship', t.scholarship_type || 'No Scholarship');
            setText('detailEnrollmentStatus', humanizeLabel(t.enrollment_status));

            const photoImg = document.getElementById('detailPhoto');
            const noPhoto = document.getElementById('detailNoPhoto');
            if (photoImg && noPhoto) {
                photoImg.alt = `${fullName} profile photo`;
                if (photoUrl) {
                    photoImg.src = photoUrl;
                    photoImg.classList.remove('hidden');
                    noPhoto.classList.add('hidden');
                    photoImg.onerror = () => {
                        photoImg.removeAttribute('src');
                        photoImg.classList.add('hidden');
                        noPhoto.classList.remove('hidden');
                    };
                } else {
                    photoImg.removeAttribute('src');
                    photoImg.classList.add('hidden');
                    noPhoto.classList.remove('hidden');
                }
            }

            const uploadedDocs = [
                setupDetailDocLink('detailValidId', t.valid_id_file, 'Valid ID'),
                setupDetailDocLink('detailBirthCert', t.birth_cert_file, 'Birth Certificate')
            ].filter(Boolean).length;
            setText('detailDocumentSummary', `${uploadedDocs} of 2 documents uploaded`, '0 of 2 documents uploaded');

            const signatureValue = String(t.digital_signature || t.signature_file || t.signature || t.signature_image || '').trim();
            renderDetailSignature(signatureValue);

            viewTraineeModal.show();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error fetching trainee details:', error);
        Swal.fire('Error', 'Failed to load trainee details.', 'error');
    }
}

const TESDA_SEX_OPTIONS = [
    { label: 'Male', aliases: ['male'] },
    { label: 'Female', aliases: ['female'] }
];

const TESDA_CIVIL_STATUS_OPTIONS = [
    { label: 'Single', aliases: ['single'] },
    { label: 'Married', aliases: ['married'] },
    { label: 'Separated/Divorced/Annulled', aliases: ['separated', 'divorced', 'annulled', 'separateddivorcedannulled'] },
    { label: 'Widow/er', aliases: ['widow', 'widower', 'widowerer'] },
    { label: 'Common Law/Live-in', aliases: ['common law', 'commonlaw', 'live in', 'live-in', 'soloparent', 'solo parent'] }
];

const TESDA_EMPLOYMENT_STATUS_OPTIONS = [
    { label: 'Wage-employed', aliases: ['employed', 'wage employed', 'wage-employed'] },
    { label: 'Underemployed', aliases: ['underemployed'] },
    { label: 'Self-employed', aliases: ['self-employed', 'self employed'] },
    { label: 'Unemployed', aliases: ['unemployed'] }
];

const TESDA_EMPLOYMENT_TYPE_OPTIONS = [
    { label: 'None', aliases: ['none', ''] },
    { label: 'Regular', aliases: ['regular'] },
    { label: 'Casual', aliases: ['casual'] },
    { label: 'Job Order', aliases: ['job order', 'job-order', 'joborder'] },
    { label: 'Probationary', aliases: ['probationary'] },
    { label: 'Permanent', aliases: ['permanent'] },
    { label: 'Contractual', aliases: ['contractual'] },
    { label: 'Temporary', aliases: ['temporary'] }
];

const TESDA_EDUCATION_OPTIONS = [
    { label: 'No Grade Completed', aliases: ['no grade completed'] },
    { label: 'Elementary Undergraduate', aliases: ['elementary undergraduate', 'elementary/undergraduate'] },
    { label: 'Elementary Graduate', aliases: ['elementary graduate'] },
    { label: 'High School Undergraduate', aliases: ['high school undergraduate'] },
    { label: 'High School Graduate', aliases: ['high school graduate'] },
    { label: 'Junior High (K-12)', aliases: ['junior high graduate', 'junior high', 'junior high k12'] },
    { label: 'Senior High (K-12)', aliases: ['senior high graduate', 'senior high', 'senior high k12'] },
    { label: 'Post-Secondary Non-Tertiary/Technical Vocational Course Undergraduate', aliases: ['post secondary undergraduate', 'post-secondary undergraduate', 'technical vocational course undergraduate'] },
    { label: 'Post-Secondary Non-Tertiary/Technical Vocational Course Graduate', aliases: ['post secondary graduate', 'post-secondary graduate', 'technical vocational course graduate'] },
    { label: 'College Undergraduate', aliases: ['college undergraduate', 'college level'] },
    { label: 'College Graduate', aliases: ['college graduate', 'college graduate or higher'] },
    { label: 'Masteral', aliases: ['masteral'] },
    { label: 'Doctorate', aliases: ['doctorate'] }
];

const TESDA_CLASSIFICATION_OPTIONS = [
    { label: '4Ps Beneficiary', aliases: ['4ps beneficiary'] },
    { label: 'Agrarian Reform Beneficiary', aliases: ['agrarian reform beneficiary'] },
    { label: 'Balik Probinsya', aliases: ['balik probinsya'] },
    { label: 'Displaced Workers', aliases: ['displaced workers'] },
    { label: 'Drug Dependents', aliases: ['drug dependents'] },
    { label: 'Surrenderees/Surrenderers', aliases: ['surrenderees', 'surrenderers', 'surrendereessurrenderers'] },
    { label: 'Family Members of AFP and PNP Killed-in-Action', aliases: ['family members of afp and pnp killed-in-action', 'family members of afp and pnp killed in action'] },
    { label: 'Family Members of AFP and PNP Wounded in-Action', aliases: ['family members of afp and pnp wounded in-action', 'family members of afp and pnp wounded in action'] },
    { label: 'Farmers and Fishermen', aliases: ['farmers and fishermen'] },
    { label: 'Indigenous People & Cultural Communities', aliases: ['indigenous people', 'indigenous people & cultural communities', 'indigenous people cultural communities'] },
    { label: 'Industry Workers', aliases: ['industry workers'] },
    { label: 'Inmates and Detainees', aliases: ['inmates and detainees'] },
    { label: 'MILF Beneficiary', aliases: ['milf beneficiary'] },
    { label: 'Out-of-School-Youth', aliases: ['out of school youth', 'out-of-school-youth'] },
    { label: 'Overseas Filipino Workers (OFW) Dependent', aliases: ['overseas filipino workers ofw dependent', 'ofw dependent'] },
    { label: 'RCEF-RESP', aliases: ['rcef-resp', 'rcef resp'] },
    { label: 'Rebel Returnees/Decommissioned Combatants', aliases: ['rebel returnees', 'decommissioned combatants', 'rebel returnees/decommissioned combatants'] },
    { label: 'Returning/Repatriated Overseas Filipino Workers (OFW)', aliases: ['returning/repatriated overseas filipino workers ofw', 'returning repatriated overseas filipino workers ofw'] },
    { label: 'Student', aliases: ['student'] },
    { label: 'TESDA Alumni', aliases: ['tesda alumni'] },
    { label: 'TVET Trainers', aliases: ['tvet trainers'] },
    { label: 'Uniformed Personnel', aliases: ['uniformed personnel'] },
    { label: 'Victim of Natural Disasters and Calamities', aliases: ['victim of natural disasters and calamities'] },
    { label: 'Wounded-in-Action AFP & PNP Personnel', aliases: ['wounded-in-action afp pnp personnel', 'wounded in action afp pnp personnel'] }
];

const TESDA_DISABILITY_TYPES = [
    { label: 'Mental/Intellectual', aliases: ['mental/intellectual', 'mental intellectual'] },
    { label: 'Visual Disability', aliases: ['visual disability'] },
    { label: 'Orthopedic (Musculoskeletal) Disability', aliases: ['orthopedic musculoskeletal disability', 'orthopedic', 'musculoskeletal disability'] },
    { label: 'Hearing Disability', aliases: ['hearing disability'] },
    { label: 'Speech Impairment', aliases: ['speech impairment'] },
    { label: 'Multiple Disabilities', aliases: ['multiple disabilities'] },
    { label: 'Psychosocial Disability', aliases: ['psychosocial disability'] },
    { label: 'Disability Due to Chronic Illness', aliases: ['disability due to chronic illness', 'chronic illness'] },
    { label: 'Learning Disability', aliases: ['learning disability'] }
];

const TESDA_DISABILITY_CAUSES = [
    { label: 'Congenital/Inborn', aliases: ['congenital', 'congenital/inborn', 'inborn'] },
    { label: 'Illness', aliases: ['illness'] },
    { label: 'Injury', aliases: ['injury'] }
];

function sanitizeFilename(value, fallback = 'document') {
    const cleaned = String(value || fallback)
        .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned || fallback;
}

function normalizePrintableSrc(value, folder = 'trainees') {
    if (!value) return '';
    if (value.startsWith('data:') || value.startsWith('http')) return value;
    if (!/\.(png|jpe?g|gif|webp|jfif|bmp|svg|avif)$/i.test(value)) return '';
    return `${window.location.origin}/Hohoo-ville/uploads/${folder}/${encodeURIComponent(value)}`;
}

function formatPdfDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

function getPdfDateParts(value) {
    if (!value) return { month: '', day: '', year: '', formatted: '' };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { month: '', day: '', year: '', formatted: '' };
    const monthName = date.toLocaleString('en-US', { month: 'long' });
    return {
        month: monthName,
        day: String(date.getDate()).padStart(2, '0'),
        year: String(date.getFullYear()),
        formatted: formatPdfDate(value)
    };
}

function normalizeOptionToken(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '');
}

function optionMatches(value, aliases = []) {
    const token = normalizeOptionToken(value);
    return aliases.some((alias) => normalizeOptionToken(alias) === token);
}

function optionListContains(value, aliases = []) {
    const tokens = String(value || '')
        .split(',')
        .map((item) => normalizeOptionToken(item))
        .filter(Boolean);
    return aliases.some((alias) => tokens.includes(normalizeOptionToken(alias)));
}

function renderTesdaCellValue(value) {
    const text = String(value ?? '').trim();
    return text ? escapeHtml(text).replace(/\n/g, '<br>') : '&nbsp;';
}

function renderTesdaCheckbox(label, checked, extraClass = '') {
    return `
        <div class="tesda-check ${extraClass}">
            <span class="tesda-check-box">${checked ? '&#10003;' : '&nbsp;'}</span>
            <span>${escapeHtml(label)}</span>
        </div>
    `;
}

function renderTesdaLine(label, value, extraClass = '') {
    return `
        <div class="tesda-field ${extraClass}">
            <div class="tesda-label">${escapeHtml(label)}</div>
            <div class="tesda-line">${renderTesdaCellValue(value)}</div>
        </div>
    `;
}

function renderTesdaCheckboxGrid(options, resolver, columnsClass = 'tesda-grid-3') {
    return `
        <div class="tesda-option-grid ${columnsClass}">
            ${options.map((option) => renderTesdaCheckbox(option.label, resolver(option))).join('')}
        </div>
    `;
}

function renderTesdaCharacterBoxes(value, count = 18, extraClass = '') {
    const characters = String(value || '')
        .replace(/\s+/g, '')
        .slice(0, count)
        .split('');

    return `
        <div class="tesda-char-boxes ${extraClass}" style="grid-template-columns: repeat(${count}, minmax(0, 1fr));">
            ${Array.from({ length: count }, (_, index) => `<span class="tesda-char-box">${escapeHtml(characters[index] || '')}</span>`).join('')}
        </div>
    `;
}

function renderTesdaTableCell(label, value, extraClass = '') {
    return `
        <td class="tesda-table-cell ${extraClass}">
            <div class="tesda-cell-label">${escapeHtml(label)}</div>
            <div class="tesda-cell-value">${renderTesdaCellValue(value)}</div>
        </td>
    `;
}

function shouldRenderTesdaPhoto(value) {
    const token = String(value || '').toLowerCase();
    if (!token) return false;
    return !/(tesda|logo|avatar|default|placeholder)/.test(token);
}

function buildTesdaFormStyles() {
    return `
        <style>
            @page {
                size: A4 portrait;
                margin: 0;
            }
            .tesda-pdf-root {
                --tesda-border: 0.78px solid #111;
                background: #fff;
                color: #111;
                font-family: Arial, Helvetica, sans-serif;
            }
            .tesda-form {
                width: 210mm;
                margin: 0 auto;
                background: #fff;
                font-size: 9.15px;
                line-height: 1.16;
                color: #111;
            }
            .tesda-page {
                width: 210mm;
                height: 295.8mm;
                min-height: 295.8mm;
                box-sizing: border-box;
                padding: 3.7mm 4.05mm 3.8mm;
                overflow: hidden;
                break-inside: avoid-page;
                page-break-inside: avoid;
            }
            .tesda-page-break {
                break-after: page;
                page-break-after: always;
            }
            .tesda-sheet {
                border: var(--tesda-border);
                min-height: 288mm;
                padding: 1.7mm 1.95mm 2mm;
                box-sizing: border-box;
            }
            .tesda-header-shell {
                border: var(--tesda-border);
                margin-bottom: 2mm;
            }
            .tesda-header-grid {
                display: flex;
                align-items: stretch;
                border-bottom: var(--tesda-border);
            }
            .tesda-logo-cell {
                width: 26.8mm;
                min-width: 26.8mm;
                border-right: var(--tesda-border);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1.35mm;
                box-sizing: border-box;
            }
            .tesda-logo-cell img {
                max-width: 100%;
                max-height: 15.2mm;
                object-fit: contain;
            }
            .tesda-authority {
                flex: 1;
                text-align: center;
                padding: 1.32mm 3.1mm 1.12mm;
                box-sizing: border-box;
                font-family: "Times New Roman", Times, serif;
            }
            .tesda-authority h1,
            .tesda-authority h2,
            .tesda-authority p {
                margin: 0;
            }
            .tesda-authority h1 {
                font-size: 10.55px;
                font-weight: 700;
            }
            .tesda-authority h2 {
                font-size: 8.9px;
                font-weight: 700;
            }
            .tesda-registration-row {
                border-bottom: var(--tesda-border);
                text-align: center;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 19px;
                font-weight: 800;
                letter-spacing: 0.12px;
                padding: 1.18mm 2mm 1.34mm;
                line-height: 1.01;
            }
            .tesda-code-box {
                width: 20.8mm;
                min-width: 20.8mm;
                border-left: var(--tesda-border);
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                font-size: 8.05px;
                font-weight: 700;
                padding: 0.98mm 1.1mm;
                box-sizing: border-box;
            }
            .tesda-code-box span {
                font-size: 6.9px;
                font-weight: 400;
            }
            .tesda-profile-strip {
                display: flex;
                align-items: stretch;
            }
            .tesda-profile-title {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 11.5px;
                font-weight: 800;
                text-align: center;
                min-height: 35.6mm;
                padding: 2.1mm 2.9mm;
                letter-spacing: 1.18px;
            }
            .tesda-id-box {
                width: 42.8mm;
                min-width: 42.8mm;
                min-height: 35.6mm;
                border-left: var(--tesda-border);
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                font-size: 7.15px;
                overflow: hidden;
                padding: 1.55mm;
                background: #fff;
            }
            .tesda-id-box img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            .tesda-box-caption {
                font-size: 7.15px;
                line-height: 1.15;
            }
            .tesda-section-title {
                margin: 1.2mm 0 0.7mm;
                font-weight: 700;
                font-size: 8.62px;
            }
            .tesda-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                margin-bottom: 1.05mm;
            }
            .tesda-table td,
            .tesda-table th {
                border: var(--tesda-border);
                vertical-align: top;
                padding: 0.9mm 1.02mm;
                box-sizing: border-box;
            }
            .tesda-table-stub {
                width: 15%;
                font-size: 7.38px;
                font-weight: 700;
                text-align: center;
                vertical-align: middle !important;
            }
            .tesda-table-cell {
                vertical-align: top;
            }
            .tesda-cell-label {
                font-size: 6.95px;
                margin-bottom: 0.42mm;
            }
            .tesda-cell-value {
                min-height: 5.45mm;
                font-size: 7.98px;
                line-height: 1.08;
                word-break: break-word;
            }
            .tesda-field {
                width: 100%;
            }
            .tesda-label {
                font-size: 6.82px;
                margin-bottom: 0.42mm;
            }
            .tesda-line {
                min-height: 5.45mm;
                border: var(--tesda-border);
                padding: 0.82mm 0.98mm;
                box-sizing: border-box;
                font-size: 7.62px;
                line-height: 1.08;
                word-break: break-word;
                background: #fff;
            }
            .tesda-option-grid {
                display: grid;
                gap: 0.62mm 1.92mm;
            }
            .tesda-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .tesda-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .tesda-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .tesda-check {
                display: flex;
                align-items: flex-start;
                gap: 0.72mm;
                font-size: 7.12px;
                line-height: 1.04;
            }
            .tesda-check-box {
                width: 2.55mm;
                min-width: 2.55mm;
                height: 2.55mm;
                border: var(--tesda-border);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 5.95px;
                line-height: 1;
                margin-top: 0.1mm;
            }
            .tesda-three-panel {
                display: grid;
                grid-template-columns: 0.95fr 1fr 1.35fr;
                gap: 1.04mm;
                margin-bottom: 1.08mm;
            }
            .tesda-panel {
                border: var(--tesda-border);
                padding: 0.92mm 1mm 0.98mm;
                box-sizing: border-box;
                background: #fff;
            }
            .tesda-panel-title {
                font-size: 7.38px;
                font-weight: 700;
                margin-bottom: 0.52mm;
            }
            .tesda-panel-subtitle {
                font-size: 6.52px;
                font-weight: 700;
                margin: 0.55mm 0 0.2mm;
            }
            .tesda-note {
                font-size: 6.58px;
                line-height: 1.14;
                margin-bottom: 0.6mm;
            }
            .tesda-privacy-box {
                border: var(--tesda-border);
                background: #fff;
                padding: 1.05mm 1.16mm;
                box-sizing: border-box;
                font-size: 6.48px;
                line-height: 1.13;
                margin-bottom: 0.62mm;
            }
            .tesda-char-boxes {
                display: grid;
                gap: 0.36mm;
            }
            .tesda-char-box {
                border: var(--tesda-border);
                min-height: 5.75mm;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 7.48px;
                box-sizing: border-box;
            }
            .tesda-signature-layout {
                display: flex;
                gap: 2mm;
                align-items: stretch;
                margin-top: 1.1mm;
            }
            .tesda-signature-left {
                flex: 1;
            }
            .tesda-signature-top {
                display: flex;
                gap: 2mm;
                align-items: stretch;
            }
            .tesda-signature-block {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
            }
            .tesda-signature-preview {
                height: 16.5mm;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                margin-bottom: 0.7mm;
            }
            .tesda-signature-image {
                max-height: 14.2mm;
                max-width: 100%;
                display: block;
                object-fit: contain;
            }
            .tesda-line-centered {
                min-height: 4.55mm;
                border-top: var(--tesda-border);
                padding-top: 0.62mm;
                text-align: center;
                font-size: 7.22px;
            }
            .tesda-small {
                font-size: 6.28px;
            }
            .tesda-side-stack {
                width: 31.5mm;
                min-width: 31.5mm;
                display: flex;
                flex-direction: column;
                gap: 1.2mm;
            }
            .tesda-passport-box,
            .tesda-thumb-box {
                border: var(--tesda-border);
                box-sizing: border-box;
                text-align: center;
                padding: 0.9mm;
            }
            .tesda-passport-box {
                height: 26.5mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }
            .tesda-passport-box img {
                flex: 1;
                width: 100%;
                object-fit: contain;
                margin-bottom: 0.5mm;
                min-height: 0;
                background: #fff;
            }
            .tesda-thumb-box {
                height: 22.5mm;
                display: flex;
                align-items: flex-end;
                justify-content: center;
            }
            .tesda-noted-row {
                display: flex;
                gap: 2mm;
                margin-top: 1.1mm;
                align-items: flex-end;
            }
            .tesda-noted-label {
                font-size: 6.22px;
                margin-bottom: 0.88mm;
            }
            .tesda-noted-block {
                flex: 1;
            }
            .tesda-date-block {
                width: 33.5mm;
                min-width: 33.5mm;
            }
            .tesda-center {
                text-align: center;
            }
            .tesda-mt-1 {
                margin-top: 0.7mm;
            }
            .tesda-italic {
                font-style: italic;
            }
            .tesda-page-one .tesda-section-title:first-of-type {
                margin-top: 0.42mm;
            }
            .tesda-page-one .tesda-section-title {
                margin: 1.4mm 0 0.86mm;
                font-size: 8.82px;
            }
            .tesda-page-one .tesda-table {
                margin-bottom: 1.08mm;
            }
            .tesda-page-one .tesda-table td,
            .tesda-page-one .tesda-table th {
                padding: 0.76mm 0.94mm;
            }
            .tesda-page-one .tesda-table-stub {
                font-size: 7.48px;
            }
            .tesda-page-one .tesda-cell-label {
                font-size: 6.98px;
                margin-bottom: 0.36mm;
            }
            .tesda-page-one .tesda-panel {
                min-height: 34.2mm;
                padding: 0.82mm 0.92mm 0.9mm;
            }
            .tesda-page-one .tesda-panel-title {
                font-size: 7.5px;
                margin-bottom: 0.5mm;
            }
            .tesda-page-one .tesda-panel-subtitle {
                font-size: 6.58px;
                margin: 0.48mm 0 0.2mm;
            }
            .tesda-page-one .tesda-check {
                font-size: 7.16px;
                gap: 0.72mm;
            }
            .tesda-page-one .tesda-check-box {
                width: 2.55mm;
                min-width: 2.55mm;
                height: 2.55mm;
                font-size: 5.92px;
            }
            .tesda-page-one .tesda-cell-value {
                min-height: 7.05mm;
                font-size: 8.05px;
                line-height: 1.08;
            }
            .tesda-page-one .tesda-line {
                min-height: 7.1mm;
                padding: 0.78mm 0.94mm;
                font-size: 7.7px;
            }
            .tesda-page-one .tesda-char-box {
                min-height: 6.7mm;
                font-size: 7.6px;
            }
            .tesda-page-one .tesda-three-panel {
                gap: 0.92mm;
                margin-bottom: 1.12mm;
            }
            .tesda-page-one .tesda-panel:last-of-type {
                min-height: 27.4mm;
            }
            .tesda-page-one .tesda-table:last-of-type .tesda-cell-value {
                min-height: 8.6mm;
            }
            .tesda-page-two .tesda-section-title:first-of-type {
                margin-top: 0.12mm;
            }
            .tesda-page-two .tesda-sheet {
                display: block;
            }
            .tesda-page-two .tesda-section-title {
                margin: 0.98mm 0 0.54mm;
                font-size: 8.72px;
            }
            .tesda-page-two .tesda-option-grid {
                gap: 0.46mm 1.32mm;
            }
            .tesda-page-two .tesda-panel {
                padding: 0.9mm 0.96mm 0.94mm;
            }
            .tesda-page-two .tesda-check {
                font-size: 6.9px;
                gap: 0.58mm;
                line-height: 1.03;
            }
            .tesda-page-two .tesda-check-box {
                width: 2.46mm;
                min-width: 2.46mm;
                height: 2.46mm;
                font-size: 5.78px;
                margin-top: 0.08mm;
            }
            .tesda-page-two .tesda-note {
                font-size: 6.48px;
                line-height: 1.12;
                margin-bottom: 0.34mm;
            }
            .tesda-page-two .tesda-label {
                font-size: 6.72px;
            }
            .tesda-page-two .tesda-line {
                min-height: 5.55mm;
                padding: 0.76mm 0.92mm;
                font-size: 7.52px;
            }
            .tesda-page-two .tesda-privacy-box {
                font-size: 6.35px;
                line-height: 1.11;
                padding: 0.92mm 1.08mm;
                margin-bottom: 0.32mm;
            }
            .tesda-page-two .tesda-signature-layout {
                margin-top: 0.9mm;
                gap: 2.1mm;
            }
            .tesda-page-two .tesda-signature-top {
                gap: 2.1mm;
            }
            .tesda-page-two .tesda-signature-preview {
                height: 17.4mm;
                margin-bottom: 0.62mm;
            }
            .tesda-page-two .tesda-signature-image {
                max-height: 16.8mm;
            }
            .tesda-page-two .tesda-line-centered {
                min-height: 5.1mm;
                padding-top: 0.65mm;
                font-size: 7.22px;
            }
            .tesda-page-two .tesda-small {
                font-size: 6.26px;
                line-height: 1.02;
            }
            .tesda-page-two .tesda-side-stack {
                width: 31.8mm;
                min-width: 31.8mm;
                gap: 1.18mm;
            }
            .tesda-page-two .tesda-passport-box {
                height: 28.8mm;
                padding: 0.92mm;
            }
            .tesda-page-two .tesda-thumb-box {
                height: 25.8mm;
                padding: 0.92mm;
            }
            .tesda-page-two .tesda-noted-row {
                gap: 2.35mm;
                margin-top: 0.92mm;
            }
            .tesda-page-two .tesda-noted-label {
                font-size: 6.22px;
                margin-bottom: 0.88mm;
            }
            .tesda-page-two .tesda-date-block {
                width: 33.8mm;
                min-width: 33.8mm;
            }
            .tesda-page-two .tesda-classification-panel { min-height: 31.2mm; }
            .tesda-page-two .tesda-disability-panel { min-height: 18.9mm; }
            .tesda-page-two .tesda-disability-cause-panel { min-height: 8.2mm; }
            .tesda-page-two .tesda-signature-section { margin-top: 2.1mm; }
        </style>
    `;
}

function initRegistrarBatchActionMenus() {
    document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-registrar-batch-actions-wrapper]')) {
            closeRegistrarBatchActionMenus();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeRegistrarBatchActionMenus();
        }
    });
}

function closeRegistrarBatchActionMenus() {
    document.querySelectorAll('[data-registrar-batch-actions-menu]').forEach((menu) => {
        menu.classList.add('hidden');
    });

    document.querySelectorAll('[data-registrar-batch-actions-toggle]').forEach((button) => {
        button.setAttribute('aria-expanded', 'false');
    });
}

function toggleRegistrarBatchActionMenu(event, batchId) {
    event.preventDefault();
    event.stopPropagation();

    const menu = document.querySelector(`[data-registrar-batch-actions-menu="${batchId}"]`);
    const button = document.querySelector(`[data-registrar-batch-actions-toggle="${batchId}"]`);
    if (!menu || !button) return;

    const shouldOpen = menu.classList.contains('hidden');
    closeRegistrarBatchActionMenus();

    if (shouldOpen) {
        menu.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
    }
}

function buildTesdaLearnerProfileForm(profile, options = {}) {
    const p = profile || {};
    const dateParts = getPdfDateParts(p.enrollment_date || p.formatted_enrollment_date);
    const birthdateParts = getPdfDateParts(p.birthdate);
    const photoSrc = shouldRenderTesdaPhoto(p.photo_file) ? normalizePrintableSrc(p.photo_file || '', 'trainees') : '';
    const signatureSrc = normalizePrintableSrc(p.digital_signature || '', 'trainees');
    const printedName = [p.first_name, p.middle_name, p.last_name, p.extension_name].filter(Boolean).join(' ').trim();
    const tesdaLogoSrc = `${window.location.origin}/Hohoo-ville/img/tesda_logo_transparent.png`;
    const streetAddress = p.house_no_street || p.address || '';
    const knownClassificationAliases = TESDA_CLASSIFICATION_OPTIONS.flatMap((option) => option.aliases);
    const otherClassifications = String(p.learner_classification || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => !optionMatches(item, knownClassificationAliases))
        .join(', ');
    const otherDisabilityType = String(p.disability_type || '').trim() &&
        !TESDA_DISABILITY_TYPES.some((option) => optionMatches(p.disability_type, option.aliases))
            ? p.disability_type
            : '';
    const pageTwoClass = options.pageBreakAfter ? 'tesda-page tesda-page-break tesda-page-two' : 'tesda-page tesda-page-two';

    return `
        <section class="tesda-form">
            <div class="tesda-page tesda-page-break tesda-page-one">
                <div class="tesda-sheet">
                    <div class="tesda-header-shell">
                        <div class="tesda-header-grid">
                            <div class="tesda-logo-cell">
                                <img src="${escapeAttr(tesdaLogoSrc)}" alt="TESDA Logo" />
                            </div>
                            <div class="tesda-authority">
                                <h1>Technical Education and Skills Development Authority</h1>
                                <h2>Pangasiwaan sa Edukasyong Teknikal at Pagpapaunlad ng Kasanayan</h2>
                            </div>
                            <div class="tesda-code-box">MIS 03-01<br><span>(ver. 2021)</span></div>
                        </div>
                        <div class="tesda-registration-row">Registration Form</div>
                        <div class="tesda-profile-strip">
                            <div class="tesda-profile-title">LEARNERS PROFILE FORM</div>
                            <div class="tesda-id-box">
                                ${photoSrc
                                    ? `<img src="${escapeAttr(photoSrc)}" alt="I.D. Picture" />`
                                    : '<div class="tesda-box-caption">I.D. Picture</div>'}
                            </div>
                        </div>
                    </div>

                    <div class="tesda-section-title">1. T2MIS Auto Generated</div>
                    <table class="tesda-table">
                        <tr>
                            <td class="tesda-table-cell" style="width:74%;">
                                <div class="tesda-cell-label">1.1 Unique Learner Identifier (ULI) Number</div>
                                ${renderTesdaCharacterBoxes(p.uli_number || '', 19)}
                            </td>
                            <td class="tesda-table-cell" style="width:26%;">
                                <div class="tesda-cell-label">1.2 Entry Date</div>
                                <div class="tesda-line tesda-center">${renderTesdaCellValue(dateParts.formatted || 'mm/dd/yyyy')}</div>
                            </td>
                        </tr>
                    </table>

                    <div class="tesda-section-title">2. Learner/Manpower Profile</div>
                    <table class="tesda-table">
                        <tr>
                            <td class="tesda-table-stub">2.1 Name:</td>
                            <td class="tesda-table-cell" colspan="2">
                                <div class="tesda-cell-label">Last Name, Extension Name (Jr., Sr.)</div>
                                <div class="tesda-cell-value">${renderTesdaCellValue([p.last_name, p.extension_name].filter(Boolean).join(', '))}</div>
                            </td>
                            ${renderTesdaTableCell('First', p.first_name || '')}
                            ${renderTesdaTableCell('Middle', p.middle_name || '')}
                        </tr>
                        <tr>
                            <td class="tesda-table-stub" rowspan="3">2.2 Permanent<br>Mailing<br>Address:</td>
                            <td class="tesda-table-cell" colspan="2">
                                <div class="tesda-cell-label">Number, Street</div>
                                <div class="tesda-cell-value">${renderTesdaCellValue(streetAddress)}</div>
                            </td>
                            ${renderTesdaTableCell('Barangay', p.barangay || '')}
                            ${renderTesdaTableCell('District', p.district || '')}
                        </tr>
                        <tr>
                            <td class="tesda-table-cell" colspan="2">
                                <div class="tesda-cell-label">City/Municipality</div>
                                <div class="tesda-cell-value">${renderTesdaCellValue(p.city_municipality || '')}</div>
                            </td>
                            ${renderTesdaTableCell('Province', p.province || '')}
                            ${renderTesdaTableCell('Region', p.region || '')}
                        </tr>
                        <tr>
                            <td class="tesda-table-cell" colspan="2">
                                <div class="tesda-cell-label">Email Address/Facebook Account</div>
                                <div class="tesda-cell-value">${renderTesdaCellValue([p.email, p.facebook_account].filter(Boolean).join(' / '))}</div>
                            </td>
                            ${renderTesdaTableCell('Contact No.', p.phone_number || '')}
                            ${renderTesdaTableCell('Nationality', p.nationality || '')}
                        </tr>
                    </table>

                    <div class="tesda-section-title">3. Personal Information</div>
                    <div class="tesda-three-panel">
                        <div class="tesda-panel">
                            <div class="tesda-panel-title">3.1 Sex</div>
                            ${renderTesdaCheckboxGrid(TESDA_SEX_OPTIONS, (option) => optionMatches(p.sex, option.aliases), 'tesda-grid-2')}
                        </div>
                        <div class="tesda-panel">
                            <div class="tesda-panel-title">3.2 Civil Status</div>
                            ${renderTesdaCheckboxGrid(TESDA_CIVIL_STATUS_OPTIONS, (option) => optionMatches(p.civil_status, option.aliases), 'tesda-grid-2')}
                        </div>
                        <div class="tesda-panel">
                            <div class="tesda-panel-title">3.3 Employment (before the training)</div>
                            <div class="tesda-panel-subtitle">Employment Status</div>
                            ${renderTesdaCheckboxGrid(TESDA_EMPLOYMENT_STATUS_OPTIONS, (option) => optionMatches(p.employment_status, option.aliases), 'tesda-grid-2')}
                            <div class="tesda-panel-subtitle">Employment Type</div>
                            ${renderTesdaCheckboxGrid(TESDA_EMPLOYMENT_TYPE_OPTIONS.filter((option) => option.label !== 'None'), (option) => optionMatches(p.employment_type, option.aliases), 'tesda-grid-2')}
                        </div>
                    </div>

                    <table class="tesda-table">
                        <tr>
                            <td class="tesda-table-stub">3.4 Birthdate</td>
                            ${renderTesdaTableCell('Month of Birth', birthdateParts.month)}
                            ${renderTesdaTableCell('Day of Birth', birthdateParts.day)}
                            ${renderTesdaTableCell('Year of Birth', birthdateParts.year)}
                            ${renderTesdaTableCell('Age', p.age || '')}
                        </tr>
                        <tr>
                            <td class="tesda-table-stub">3.5 Birthplace</td>
                            <td class="tesda-table-cell" colspan="2">
                                <div class="tesda-cell-label">City/Municipality</div>
                                <div class="tesda-cell-value">${renderTesdaCellValue(p.birthplace_city || '')}</div>
                            </td>
                            ${renderTesdaTableCell('Province', p.birthplace_province || '')}
                            ${renderTesdaTableCell('Region', p.birthplace_region || '')}
                        </tr>
                    </table>

                    <div class="tesda-section-title">3.6 Educational Attainment Before the Training (Trainee)</div>
                    <div class="tesda-panel">
                        ${renderTesdaCheckboxGrid(TESDA_EDUCATION_OPTIONS, (option) => optionMatches(p.educational_attainment, option.aliases), 'tesda-grid-2')}
                    </div>

                    <table class="tesda-table tesda-mt-1">
                        <tr>
                            <td class="tesda-table-stub">3.7 Parent/Guardian</td>
                            ${renderTesdaTableCell('Name', p.parent_name || '')}
                            <td class="tesda-table-cell" colspan="2">
                                <div class="tesda-cell-label">Complete Permanent Mailing Address</div>
                                <div class="tesda-cell-value">${renderTesdaCellValue(p.parent_address || '')}</div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="${pageTwoClass}">
                <div class="tesda-sheet">
                    <div class="tesda-section-title">4. Learner/Trainee/Student (Clients) Classification</div>
                    <div class="tesda-panel tesda-classification-panel">
                        ${renderTesdaCheckboxGrid(TESDA_CLASSIFICATION_OPTIONS, (option) => optionListContains(p.learner_classification, option.aliases), 'tesda-grid-3')}
                        <div class="tesda-mt-1">
                            ${renderTesdaLine('Others (Please Specify)', otherClassifications)}
                        </div>
                    </div>

                    <div class="tesda-section-title">5. Type of Disability (for Persons with Disability Only)</div>
                    <div class="tesda-note tesda-italic">To be filled up by the TESDA personnel</div>
                    <div class="tesda-panel tesda-disability-panel">
                        ${renderTesdaCheckboxGrid(TESDA_DISABILITY_TYPES, (option) => optionMatches(p.disability_type, option.aliases), 'tesda-grid-3')}
                        <div class="tesda-mt-1">
                            ${renderTesdaLine('Specify (if Multiple Disabilities)', optionMatches(p.disability_type, ['multiple disabilities']) ? p.disability_type : otherDisabilityType)}
                        </div>
                    </div>

                    <div class="tesda-section-title">6. Causes of Disability (for Persons with Disability Only); To be filled up by the TESDA personnel</div>
                    <div class="tesda-panel tesda-disability-cause-panel">
                        ${renderTesdaCheckboxGrid(TESDA_DISABILITY_CAUSES, (option) => optionMatches(p.disability_cause, option.aliases), 'tesda-grid-3')}
                    </div>

                    <div class="tesda-section-title">7. Name of Course/Qualification</div>
                    ${renderTesdaLine('Name of Course/Qualification', p.qualification_name || p.course_name || '')}

                    <div class="tesda-section-title">8. If Scholar, What Type of Scholarship Package (TWSP, PESFA, STEP, others)?</div>
                    ${renderTesdaLine('Scholarship Package', p.scholarship_type || '')}

                    <div class="tesda-section-title">9. Privacy Consent and Disclaimer</div>
                    <div class="tesda-privacy-box">
                        I hereby attest that I have read and understood the Privacy Notice of TESDA through its website
                        (<strong>https://www.tesda.gov.ph</strong>) and thereby give my consent in the processing of my personal
                        information indicated in this Learners Profile. The processing includes scholarship, employment, survey,
                        and all other related TESDA program that may be beneficial to my qualifications.
                    </div>
                    <div class="tesda-option-grid tesda-grid-2">
                        ${renderTesdaCheckbox('Agree', Boolean(Number(p.privacy_consent || 0)))}
                        ${renderTesdaCheckbox('Disagree', !Boolean(Number(p.privacy_consent || 0)))}
                    </div>

                    <div class="tesda-signature-section">
                        <div class="tesda-section-title">10. Applicant&apos;s Signature</div>
                        <div class="tesda-note">This is to certify that the information stated above is true and correct.</div>
                        <div class="tesda-signature-layout">
                            <div class="tesda-signature-left">
                                <div class="tesda-signature-top">
                                    <div class="tesda-signature-block">
                                        <div class="tesda-signature-preview">
                                            ${signatureSrc ? `<img src="${escapeAttr(signatureSrc)}" alt="Applicant Signature" class="tesda-signature-image" />` : ''}
                                        </div>
                                        <div class="tesda-line-centered">${renderTesdaCellValue(printedName)}</div>
                                        <div class="tesda-small tesda-center">APPLICANT&apos;S SIGNATURE OVER PRINTED NAME</div>
                                    </div>
                                    <div class="tesda-signature-block" style="max-width:33mm;">
                                        <div class="tesda-signature-preview"></div>
                                        <div class="tesda-line-centered">${renderTesdaCellValue(dateParts.formatted)}</div>
                                        <div class="tesda-small tesda-center">DATE ACCOMPLISHED</div>
                                    </div>
                                </div>

                                <div class="tesda-noted-row">
                                    <div class="tesda-noted-block">
                                        <div class="tesda-noted-label">Noted by:</div>
                                        <div class="tesda-line-centered">&nbsp;</div>
                                        <div class="tesda-small tesda-center">REGISTRAR/SCHOOL ADMINISTRATOR</div>
                                        <div class="tesda-small tesda-center">(Signature Over Printed Name)</div>
                                    </div>
                                    <div class="tesda-date-block">
                                        <div class="tesda-noted-label">&nbsp;</div>
                                        <div class="tesda-line-centered">&nbsp;</div>
                                        <div class="tesda-small tesda-center">DATE RECEIVED</div>
                                    </div>
                                </div>
                            </div>

                            <div class="tesda-side-stack">
                                <div class="tesda-passport-box">
                                    ${photoSrc ? `<img src="${escapeAttr(photoSrc)}" alt="1x1 Picture" />` : '<div style="flex:1; display:flex; align-items:center; justify-content:center;">&nbsp;</div>'}
                                    <div class="tesda-small tesda-center">1x1 picture taken within the last 6 months</div>
                                </div>
                                <div class="tesda-thumb-box">
                                    <div class="tesda-small tesda-center">Right Thumbmark</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

async function ensureHtml2PdfLoaded() {
    if (typeof html2pdf !== 'undefined') return;
    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function fetchTraineePdfProfile(traineeId) {
    const response = await axios.get(`${API_BASE_URL}/role/trainer/trainee_details.php?trainee_id=${traineeId}`);
    if (!response.data.success || !response.data.data?.profile) {
        throw new Error(response.data.message || 'Failed to load trainee details.');
    }
    return response.data.data.profile;
}

function buildTesdaPdfContainer(profiles) {
    const container = document.createElement('div');
    container.className = 'tesda-pdf-root';
    container.innerHTML = `
        ${buildTesdaFormStyles()}
        ${profiles.map((profile, index) => buildTesdaLearnerProfileForm(profile, {
            pageBreakAfter: index < profiles.length - 1
        })).join('')}
    `;
    return container;
}

async function saveTesdaPdf(container, filename) {
    document.body.appendChild(container);
    try {
        await ensureHtml2PdfLoaded();
        await html2pdf().set({
            margin: 0,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2.3, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css'] }
        }).from(container).save();
    } finally {
        container.remove();
    }
}

window.openPrint = function(id) {
    (async function() {
        try {
            const profile = await fetchTraineePdfProfile(id);
            const printable = buildTesdaPdfContainer([profile]);
            const traineeName = [profile.last_name, profile.first_name].filter(Boolean).join('_') || `trainee_${id}`;
            await saveTesdaPdf(printable, `${sanitizeFilename(traineeName, `registration_${id}`)}_tesda_registration_form.pdf`);
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to generate PDF. ' + (err.message || 'See console for details.'), 'error');
        }
    })();
}

window.downloadAllApplications = function(evt) {
    if (!currentBatchId) {
        Swal.fire('Warning', 'No batch selected.', 'warning');
        return;
    }

    const trigger = evt && evt.target ? evt.target.closest('button') : null;
    const btn = trigger || document.querySelector('#viewBatchModal button[onclick*="downloadAllApplications"]');
    if (!btn) return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Generating...';

    (async function() {
        try {
            const response = await axios.get(`${API_BASE_URL}/role/registrar/batches.php?action=get-trainees&batch_id=${currentBatchId}`);
            if (!response.data.success || !Array.isArray(response.data.data)) {
                throw new Error(response.data.message || 'Failed to fetch trainees.');
            }

            const trainees = response.data.data;
            if (trainees.length === 0) {
                Swal.fire('Info', 'No trainees in this batch.', 'info');
                return;
            }

            const profiles = [];
            for (const trainee of trainees) {
                try {
                    profiles.push(await fetchTraineePdfProfile(trainee.trainee_id));
                } catch (error) {
                    console.warn(`Failed to fetch details for trainee ${trainee.trainee_id}`, error);
                }
            }

            if (profiles.length === 0) {
                throw new Error('Failed to generate any registration forms.');
            }

            const combinedContainer = buildTesdaPdfContainer(profiles);
            await saveTesdaPdf(
                combinedContainer,
                `${sanitizeFilename(currentBatchName || 'batch', 'batch')}_tesda_registration_forms.pdf`
            );

            Swal.fire('Success', `Successfully downloaded ${profiles.length} TESDA registration form(s).`, 'success');
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to generate PDF. ' + (err.message || 'See console for details.'), 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    })();
}
