const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;
const TRAINER_PROGRESS_CHART_URL = `${window.location.origin}/Hohoo-ville/frontend/html/trainer/pages/progress_chart.html`;
const TRAINER_ACHIEVEMENT_CHART_URL = `${window.location.origin}/Hohoo-ville/frontend/html/trainer/pages/achievement_chart.html`;
let traineesModal;
let closedBatchesModal;
let createBatchModal;
let currentBatchTrainees = [];
let allBatches = [];
let availableQualifications = [];
let allTrainers = [];

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
    initBatchActionMenus();
    initLogout();
    initModals();
    bindActions();
    loadBatches();
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

function initBatchActionMenus() {
    document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-batch-actions-wrapper]')) {
            closeBatchActionMenus();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeBatchActionMenus();
        }
    });
}

function closeBatchActionMenus() {
    document.querySelectorAll('[data-batch-actions-menu]').forEach((menu) => {
        menu.classList.add('hidden');
    });

    document.querySelectorAll('[data-batch-actions-toggle]').forEach((button) => {
        button.setAttribute('aria-expanded', 'false');
    });
}

function toggleBatchActionMenu(event, batchId) {
    event.preventDefault();
    event.stopPropagation();

    const menu = document.querySelector(`[data-batch-actions-menu="${batchId}"]`);
    const button = document.querySelector(`[data-batch-actions-toggle="${batchId}"]`);
    if (!menu || !button) return;

    const shouldOpen = menu.classList.contains('hidden');
    closeBatchActionMenus();

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

function initModals() {
    traineesModal = new SimpleModal(document.getElementById('viewTraineesModal'));
    closedBatchesModal = new SimpleModal(document.getElementById('closedBatchesModal'));
    createBatchModal = new SimpleModal(document.getElementById('createBatchModal'));

    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            const target = button.getAttribute('data-modal-hide');
            if (target === 'viewTraineesModal' && traineesModal) traineesModal.hide();
            if (target === 'closedBatchesModal' && closedBatchesModal) closedBatchesModal.hide();
            if (target === 'createBatchModal' && createBatchModal) createBatchModal.hide();
        });
    });
}

function bindActions() {
    const openClosedBtn = document.getElementById('openClosedBatches');
    const createBatchBtn = document.getElementById('createBatchBtn');
    if (openClosedBtn) {
        openClosedBtn.addEventListener('click', () => {
            if (closedBatchesModal) closedBatchesModal.show();
        });
    }
    if (createBatchBtn) {
        createBatchBtn.addEventListener('click', openCreateBatchModal);
    }

    document.getElementById('newBatchMaxTrainees')?.addEventListener('input', updateProjectedBatchValue);
    document.getElementById('newBatchTrainingCost')?.addEventListener('input', updateProjectedBatchValue);
}

async function loadBatches() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/batches.php?action=list`);
        if (!response.data.success) {
            showError('Error loading batches: ' + (response.data.message || 'Unknown error'));
            return;
        }

        allBatches = response.data.data || [];
        const currentBatches = allBatches.filter((batch) => !isBatchArchived(batch));
        const archivedBatches = allBatches.filter((batch) => isBatchArchived(batch));

        renderBatchesTable(currentBatches, 'batchesTableBody');
        renderBatchesTable(archivedBatches, 'closedBatchesTableBody', true);
    } catch (error) {
        console.error('Error loading batches:', error);
        const tbody = document.getElementById('batchesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-rose-600">Failed to load batches.</td></tr>';
        }
    }
}

function isBatchArchived(batch) {
    const status = normalizeStatus(batch?.status);
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

    if (!data || data.length === 0) {
        const emptyMessage = isArchive ? 'No completed batches in the archive.' : 'No current batches found.';
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-slate-500">${emptyMessage}</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map((batch, index) => {
        const count = Number(batch.enrolled_count || 0);
        const maxTrainees = Number(batch.max_trainees || 25);
        const statusValue = normalizeStatus(batch.status);
        const statusBadge = statusValue === 'open'
            ? '<span class="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">OPEN</span>'
            : '<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">CLOSED</span>';

        const countBadge = `<span class="inline-flex rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">${count} Trainees</span>`;
        const fullBadge = count >= maxTrainees
            ? '<span class="ml-1 inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">FULL</span>'
            : '';
        const menuPositionClasses = data.length > 3 && data.length - index <= 3
            ? 'bottom-full right-0 mb-2 origin-bottom-right'
            : 'top-full right-0 mt-2 origin-top-right';
        const safeBatchName = escapeHtml(batch.batch_name || '');
        const menuItems = isArchive
            ? `
                <button
                    type="button"
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                    data-batch-name="${safeBatchName}"
                    onclick="closeBatchActionMenus(); viewBatchTrainees(${batch.batch_id}, this.dataset.batchName)"
                >
                    <i class="fas fa-users w-4 text-center text-blue-500"></i>
                    <span>View Student List</span>
                </button>
                <button
                    type="button"
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                    onclick="closeBatchActionMenus(); openBatchArchiveChart('progress', ${batch.batch_id})"
                >
                    <i class="fas fa-chart-line w-4 text-center text-emerald-500"></i>
                    <span>Progress Chart</span>
                </button>
                <button
                    type="button"
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-fuchsia-700 transition hover:bg-fuchsia-50"
                    onclick="closeBatchActionMenus(); openBatchArchiveChart('achievement', ${batch.batch_id})"
                >
                    <i class="fas fa-trophy w-4 text-center text-fuchsia-500"></i>
                    <span>Achievement Chart</span>
                </button>
            `
            : `
                <button
                    type="button"
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                    data-batch-name="${safeBatchName}"
                    onclick="closeBatchActionMenus(); viewBatchTrainees(${batch.batch_id}, this.dataset.batchName)"
                >
                    <i class="fas fa-users w-4 text-center text-blue-500"></i>
                    <span>View Students</span>
                </button>
                <button
                    type="button"
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    onclick="closeBatchActionMenus(); editBatch(${batch.batch_id})"
                >
                    <i class="fas fa-edit w-4 text-center text-slate-500"></i>
                    <span>Edit</span>
                </button>
            `;

        return `
            <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 text-sm text-slate-900">${escapeHtml(batch.batch_name || 'N/A')}</td>
                <td class="px-3 py-3 text-sm">${statusBadge}</td>
                <td class="px-3 py-3 text-sm">${countBadge}${fullBadge}</td>
                <td class="px-3 py-3 text-sm">
                    <div class="relative flex justify-center" data-batch-actions-wrapper>
                        <button
                            type="button"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            data-batch-actions-toggle="${batch.batch_id}"
                            aria-haspopup="true"
                            aria-expanded="false"
                            aria-controls="batchActionsMenu-${batch.batch_id}"
                            aria-label="Open batch actions"
                            onclick="toggleBatchActionMenu(event, ${batch.batch_id})"
                        >
                            <i class="fas fa-ellipsis-vertical"></i>
                        </button>
                        <div
                            id="batchActionsMenu-${batch.batch_id}"
                            class="absolute z-30 hidden w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80 ${menuPositionClasses}"
                            data-batch-actions-menu="${batch.batch_id}"
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
    }).join('');
}

function normalizeStatus(status) {
    return String(status || '').trim().toLowerCase();
}

window.openBatchArchiveChart = function(type, batchId) {
    const normalizedBatchId = Number.parseInt(batchId, 10);
    if (!Number.isInteger(normalizedBatchId) || normalizedBatchId <= 0) {
        showError('The selected batch is invalid.');
        return;
    }

    const chartUrl = new URL(
        type === 'achievement' ? TRAINER_ACHIEVEMENT_CHART_URL : TRAINER_PROGRESS_CHART_URL,
        window.location.origin
    );
    chartUrl.searchParams.set('batch_id', String(normalizedBatchId));
    chartUrl.searchParams.set('source', 'admin');
    window.open(chartUrl.toString(), '_blank', 'noopener');
};

async function viewBatchTrainees(batchId, batchName) {
    const modalBatchName = document.getElementById('modalBatchName');
    const modalCount = document.getElementById('modalTraineeCount');
    const modalSearch = document.getElementById('modalSearchInput');
    const tbody = document.getElementById('modalTraineesBody');

    if (modalBatchName) modalBatchName.textContent = batchName || 'N/A';
    if (modalCount) modalCount.textContent = '0';
    if (modalSearch) modalSearch.value = '';
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-slate-500">Loading...</td></tr>';

    if (traineesModal) traineesModal.show();

    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainees.php?action=get-batch-trainees&batch_id=${batchId}`);
        if (!response.data.success) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-rose-600">${escapeHtml(response.data.message || 'Failed to load data.')}</td></tr>`;
            return;
        }

        currentBatchTrainees = response.data.data || [];
        if (modalCount) modalCount.textContent = String(currentBatchTrainees.length);
        renderModalTrainees(currentBatchTrainees);
    } catch (error) {
        console.error('Error fetching batch trainees:', error);
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-rose-600">Error loading data.</td></tr>';
    }
}

function renderModalTrainees(data) {
    const tbody = document.getElementById('modalTraineesBody');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No trainees found.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((trainee) => {
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(`${trainee.first_name || ''} ${trainee.last_name || ''}`)}&background=random&size=32`;
        const displayName = `${trainee.last_name || ''}, ${trainee.first_name || ''}`.replace(/^,\s*/, '');
        const enrolledDate = formatEnrollmentDate(trainee.formatted_enrollment_date || trainee.enrollment_date);
        const status = String(trainee.status || '').toLowerCase();
        const statusBadge = status === 'active'
            ? '<span class="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>'
            : `<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">${escapeHtml(trainee.status || 'Unknown')}</span>`;

        return `
            <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 text-sm text-slate-700">${trainee.trainee_school_id ? escapeHtml(trainee.trainee_school_id) : '<span class="text-slate-400">N/A</span>'}</td>
                <td class="px-3 py-3 text-sm text-slate-900">
                    <div class="flex items-center gap-2">
                        <img src="${avatarUrl}" class="h-8 w-8 rounded-full border border-slate-200 object-cover" alt="" onerror="this.style.display='none'">
                        <div class="font-semibold">${escapeHtml(displayName)}</div>
                    </div>
                </td>
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(trainee.email || 'N/A')}</td>
                <td class="px-3 py-3 text-sm text-slate-600">${escapeHtml(enrolledDate)}</td>
                <td class="px-3 py-3 text-center text-sm">${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

function formatEnrollmentDate(value) {
    if (!value) return 'N/A';

    const text = String(value).trim();
    if (!text) return 'N/A';

    if (/^[A-Za-z]+\s+\d{1,2},\s+\d{4}$/.test(text)) {
        return text;
    }

    const parsed = new Date(text.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) {
        return text;
    }

    return parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showError(message) {
    if (window.Swal) {
        Swal.fire('Error', message, 'error');
        return;
    }
    alert(message);
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\r?\n/g, ' ');
}

function formatQualificationOptionLabel(qualification) {
    const baseName = qualification?.course_name || qualification?.qualification_name || 'Unnamed Qualification';
    const ncLevel = qualification?.nc_level_code || qualification?.nc_level_name || '';
    return ncLevel ? `${baseName} (${ncLevel})` : baseName;
}

async function openCreateBatchModal() {
    const form = document.getElementById('createBatchForm');
    if (form) form.reset();
    setText('newBatchProjectedTotal', 'PHP 0.00');
    setValueIfPresent('newBatchId', '');
    setValueIfPresent('newBatchStatus', 'open');
    setValueIfPresent('newBatchMaxTrainees', '25');
    setBatchModalMode(false);
    
    // Load form data
    await loadCreateBatchFormData();
    updateProjectedBatchValue();
    
    if (createBatchModal) createBatchModal.show();
}

async function loadCreateBatchFormData() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/batches.php?action=get-form-data`);
        if (!response.data.success) return;

        const data = response.data.data || {};
        availableQualifications = data.qualifications || [];
        
        // Store all trainers for filtering later
        allTrainers = data.trainers || [];
        
        // Load qualifications
        const qualifSelect = document.getElementById('newBatchQualificationId');
        if (qualifSelect) {
            qualifSelect.innerHTML = '<option value="">Select Qualification</option>';
            if (availableQualifications.length > 0) {
                availableQualifications.forEach((q) => {
                    const option = document.createElement('option');
                    option.value = q.qualification_id;
                    option.textContent = formatQualificationOptionLabel(q);
                    option.dataset.qualificationName = q.course_name || q.qualification_name || '';
                    qualifSelect.appendChild(option);
                });
            }

            // Remove existing listener and add new one
            const newQualifSelect = qualifSelect.cloneNode(true);
            qualifSelect.parentNode.replaceChild(newQualifSelect, qualifSelect);
            const updatedSelect = document.getElementById('newBatchQualificationId');
            
            updatedSelect.addEventListener('change', () => {
                const selectedOption = updatedSelect.options[updatedSelect.selectedIndex];
                const batchNameField = document.getElementById('newBatchName');
                if (selectedOption && selectedOption.value) {
                    const qualId = selectedOption.value;
                    batchNameField.value = generateBatchName(selectedOption.dataset.qualificationName || selectedOption.textContent, parseInt(qualId, 10));
                    // Filter trainers by selected qualification
                    filterTrainersByQualification(selectedOption.value);
                    populateTrainingCostFromQualification(selectedOption.value);
                } else {
                    batchNameField.value = '';
                    // Show all trainers if no qualification selected
                    populateAllTrainers();
                    populateTrainingCostFromQualification('');
                }
                updateProjectedBatchValue();
            });
        }

        // Load trainers - show all initially
        populateAllTrainers();

        // Load scholarship types
        const scholarshipSelect = document.getElementById('newBatchScholarshipType');
        if (scholarshipSelect && data.scholarships) {
            scholarshipSelect.innerHTML = '<option value="">None</option>';
            data.scholarships.forEach((s) => {
                const option = document.createElement('option');
                option.value = s.scholarship_type_id;
                option.textContent = s.scholarship_name;
                scholarshipSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading form data:', error);
        showError('Failed to load form data');
    }
}

function populateAllTrainers() {
    const trainerSelect = document.getElementById('newBatchTrainerId');
    if (!trainerSelect) return;
    
    trainerSelect.innerHTML = '<option value="">Select Trainer</option>';
    
    // Sort trainers alphabetically by last name, then first name
    const sorted = [...allTrainers].sort((a, b) => {
        const lastNameA = (a.last_name || '').toUpperCase();
        const lastNameB = (b.last_name || '').toUpperCase();
        
        if (lastNameA !== lastNameB) {
            return lastNameA.localeCompare(lastNameB);
        }
        
        const firstNameA = (a.first_name || '').toUpperCase();
        const firstNameB = (b.first_name || '').toUpperCase();
        return firstNameA.localeCompare(firstNameB);
    });
    
    sorted.forEach((t) => {
        const option = document.createElement('option');
        option.value = t.trainer_id;
        option.textContent = `${t.first_name} ${t.last_name}`;
        trainerSelect.appendChild(option);
    });
}

function filterTrainersByQualification(qualificationId) {
    const trainerSelect = document.getElementById('newBatchTrainerId');
    if (!trainerSelect) return;
    
    // Filter trainers that have this qualification
    const filteredTrainers = allTrainers.filter((trainer) => {
        const qualIds = String(trainer.qualification_ids || '').split(',').map(id => id.trim());
        return qualIds.includes(String(qualificationId));
    });
    
    // Sort trainers alphabetically by last name, then first name
    const sorted = filteredTrainers.sort((a, b) => {
        const lastNameA = (a.last_name || '').toUpperCase();
        const lastNameB = (b.last_name || '').toUpperCase();
        
        if (lastNameA !== lastNameB) {
            return lastNameA.localeCompare(lastNameB);
        }
        
        const firstNameA = (a.first_name || '').toUpperCase();
        const firstNameB = (b.first_name || '').toUpperCase();
        return firstNameA.localeCompare(firstNameB);
    });
    
    // Clear and repopulate trainer select
    trainerSelect.innerHTML = '<option value="">Select Trainer</option>';
    sorted.forEach((t) => {
        const option = document.createElement('option');
        option.value = t.trainer_id;
        option.textContent = `${t.first_name} ${t.last_name}`;
        trainerSelect.appendChild(option);
    });
}

function generateBatchName(qualificationName, qualificationId) {
    // Count existing batches for this qualification
    const existingBatches = allBatches.filter(b => b.qualification_id == qualificationId);
    const batchNumber = existingBatches.length + 1;
    return `${qualificationName} - Batch ${batchNumber}`;
}

async function handleCreateBatch(event) {
    event.preventDefault();
    
    const batchId = document.getElementById('newBatchId')?.value;
    const batchName = document.getElementById('newBatchName')?.value;
    const qualificationId = document.getElementById('newBatchQualificationId')?.value;
    const trainerId = document.getElementById('newBatchTrainerId')?.value;
    const scholarshipTypeId = document.getElementById('newBatchScholarshipType')?.value;
    const startDate = document.getElementById('newBatchStartDate')?.value;
    const endDate = document.getElementById('newBatchEndDate')?.value;
    const maxTrainees = document.getElementById('newBatchMaxTrainees')?.value;
    const trainingCost = document.getElementById('newBatchTrainingCost')?.value;
    const status = document.getElementById('newBatchStatus')?.value || 'open';

    if (!batchName || !qualificationId || !trainerId || !startDate || !endDate || !maxTrainees || trainingCost === '') {
        showError('Please fill in all required fields');
        return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
        showError('End date must be after start date');
        return;
    }

    if (Number(maxTrainees) <= 0) {
        showError('Max trainees must be greater than zero');
        return;
    }

    if (Number(trainingCost) < 0) {
        showError('Training cost cannot be negative');
        return;
    }

    const payload = {
        batch_name: batchName,
        qualification_id: parseInt(qualificationId),
        trainer_id: parseInt(trainerId),
        scholarship_type_id: scholarshipTypeId ? parseInt(scholarshipTypeId) : null,
        start_date: startDate,
        end_date: endDate,
        status: status,
        max_trainees: maxTrainees ? parseInt(maxTrainees) : null,
        training_cost: Number(trainingCost)
    };

    if (batchId) {
        payload.batch_id = parseInt(batchId);
    }

    try {
        const action = batchId ? 'update' : 'add';
        const response = await axios.post(`${API_BASE_URL}/role/admin/batches.php?action=${action}`, payload);
        if (!response.data.success) {
            showError(`Error: ${response.data.message || 'Unknown error'}`);
            return;
        }

        if (window.Swal) {
            Swal.fire('Success', `Batch ${batchId ? 'updated' : 'created'} successfully`, 'success');
        } else {
            alert(`Batch ${batchId ? 'updated' : 'created'} successfully`);
        }
        
        if (createBatchModal) createBatchModal.hide();
        loadBatches();
    } catch (error) {
        console.error('Error saving batch:', error);
        showError('Failed to save batch');
    }
}

window.editBatch = async function(id) {
    try {
        // Load form data first to populate dropdowns
        await loadCreateBatchFormData();
        
        const response = await axios.get(`${API_BASE_URL}/role/admin/batches.php?action=list`);
        const batch = response.data.data.find(b => b.batch_id == id);

        if (batch) {
            document.getElementById('newBatchId').value = batch.batch_id;
            document.getElementById('newBatchName').value = batch.batch_name;
            document.getElementById('newBatchQualificationId').value = batch.qualification_id;
            filterTrainersByQualification(batch.qualification_id);
            document.getElementById('newBatchTrainerId').value = batch.trainer_id;
            document.getElementById('newBatchScholarshipType').value = batch.scholarship_type_id || '';
            document.getElementById('newBatchStartDate').value = batch.start_date;
            document.getElementById('newBatchEndDate').value = batch.end_date;
            document.getElementById('newBatchMaxTrainees').value = batch.max_trainees || 25;
            document.getElementById('newBatchTrainingCost').value = batch.training_cost || '';
            document.getElementById('newBatchStatus').value = batch.status;

            setBatchModalMode(true);
            updateProjectedBatchValue();
            
            if (createBatchModal) createBatchModal.show();
        }
    } catch (error) {
        console.error('Error loading batch:', error);
        showError('Failed to load batch details');
    }
}

// Bind form submission
document.addEventListener('DOMContentLoaded', () => {
    const createBatchForm = document.getElementById('createBatchForm');
    if (createBatchForm) {
        createBatchForm.addEventListener('submit', handleCreateBatch);
    }
});

function populateTrainingCostFromQualification(qualificationId) {
    const trainingCostField = document.getElementById('newBatchTrainingCost');
    if (!trainingCostField) return;

    if (!qualificationId) {
        trainingCostField.value = '';
        return;
    }

    const qualification = availableQualifications.find((item) => String(item.qualification_id) === String(qualificationId));
    if (!qualification) return;

    trainingCostField.value = qualification.training_cost !== undefined && qualification.training_cost !== null
        ? String(qualification.training_cost)
        : '';
}

function updateProjectedBatchValue() {
    const maxTrainees = Number(document.getElementById('newBatchMaxTrainees')?.value || 0);
    const trainingCost = Number(document.getElementById('newBatchTrainingCost')?.value || 0);
    const projectedValue = maxTrainees > 0 && trainingCost >= 0 ? maxTrainees * trainingCost : 0;
    setText('newBatchProjectedTotal', `PHP ${projectedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}

function setBatchModalMode(isEditing) {
    const modalLabel = document.querySelector('#createBatchModal h3');
    const submitBtn = document.querySelector('#createBatchModal button[type="submit"]');
    if (modalLabel) modalLabel.textContent = isEditing ? 'Edit Batch' : 'Create New Batch';
    if (submitBtn) submitBtn.textContent = isEditing ? 'Save Changes' : 'Create Batch';
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function setValueIfPresent(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value;
    }
}
