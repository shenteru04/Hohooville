const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;
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
}

async function loadBatches() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainees.php?action=get-batches`);
        if (!response.data.success) {
            showError('Error loading batches: ' + (response.data.message || 'Unknown error'));
            return;
        }

        allBatches = response.data.data || [];
        const openBatches = allBatches.filter((batch) => normalizeStatus(batch.status) === 'open');
        const closedBatches = allBatches.filter((batch) => normalizeStatus(batch.status) !== 'open');

        renderBatchesTable(openBatches, 'batchesTableBody');
        renderBatchesTable(closedBatches, 'closedBatchesTableBody');
    } catch (error) {
        console.error('Error loading batches:', error);
        const tbody = document.getElementById('batchesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-rose-600">Failed to load batches.</td></tr>';
        }
    }
}

function renderBatchesTable(data, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No batches found</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((batch) => {
        const count = Number(batch.enrolled_count || 0);
        const statusValue = normalizeStatus(batch.status);
        const statusBadge = statusValue === 'open'
            ? '<span class="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">OPEN</span>'
            : '<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">CLOSED</span>';

        const countBadge = `<span class="inline-flex rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">${count} Trainees</span>`;
        const fullBadge = count >= 25
            ? '<span class="ml-1 inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">FULL</span>'
            : '';

        return `
            <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 text-sm text-slate-900">${escapeHtml(batch.batch_name || 'N/A')}</td>
                <td class="px-3 py-3 text-sm">${statusBadge}</td>
                <td class="px-3 py-3 text-sm">${countBadge}${fullBadge}</td>
                <td class="px-3 py-3 text-sm">
                    <button class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100" onclick="viewBatchTrainees(${batch.batch_id}, '${escapeAttribute(batch.batch_name || '')}')">
                        <i class="fas fa-users"></i> View Trainees
                    </button>
                </td>
                <td class="px-3 py-3 text-sm">
                    <div class="flex flex-wrap items-center justify-center gap-1">
                        <button class="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" type="button" onclick="editBatch(${batch.batch_id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function normalizeStatus(status) {
    return String(status || '').trim().toLowerCase();
}

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
        const status = String(trainee.status || '').toLowerCase();
        const statusBadge = status === 'active'
            ? '<span class="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>'
            : `<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">${escapeHtml(trainee.status || 'Unknown')}</span>`;

        return `
            <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 text-sm text-slate-700">${trainee.trainee_school_id ? escapeHtml(trainee.trainee_school_id) : '<span class="text-slate-400">N/A</span>'}</td>
                <td class="px-3 py-3 text-sm text-slate-900">
                    <div class="flex items-center gap-2">
                        <img src="${avatarUrl}" class="h-8 w-8 rounded-full border border-slate-200 object-cover" alt="Avatar">
                        <div class="font-semibold">${escapeHtml(`${trainee.last_name || ''}, ${trainee.first_name || ''}`.replace(/^,\s*/, ''))}</div>
                    </div>
                </td>
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(trainee.email || 'N/A')}</td>
                <td class="px-3 py-3 text-sm text-slate-600">${trainee.formatted_enrollment_date || trainee.enrollment_date || 'N/A'}</td>
                <td class="px-3 py-3 text-center text-sm">${statusBadge}</td>
            </tr>
        `;
    }).join('');
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

async function openCreateBatchModal() {
    const form = document.getElementById('createBatchForm');
    if (form) form.reset();
    
    // Load form data
    await loadCreateBatchFormData();
    
    if (createBatchModal) createBatchModal.show();
}

async function loadCreateBatchFormData() {
    try {
        // Fetch qualifications from admin endpoint
        let qualifications = [];
        try {
            const qualResponse = await axios.get(`${API_BASE_URL}/role/admin/trainers.php?action=get-qualifications`);
            if (qualResponse.data.success) {
                qualifications = qualResponse.data.data || [];
            }
        } catch (qualError) {
            console.error('Error loading qualifications:', qualError);
        }

        // Fetch trainers and scholarships from registrar endpoint
        const response = await axios.get(`${API_BASE_URL}/role/registrar/batches.php?action=get-form-data`);
        if (!response.data.success) return;

        const data = response.data.data || {};
        
        // Store all trainers for filtering later
        allTrainers = data.trainers || [];
        
        // Load qualifications
        const qualifSelect = document.getElementById('newBatchQualificationId');
        if (qualifSelect) {
            qualifSelect.innerHTML = '<option value="">Select Qualification</option>';
            if (qualifications.length > 0) {
                qualifications.forEach((q) => {
                    const option = document.createElement('option');
                    option.value = q.qualification_id;
                    option.textContent = q.qualification_name;
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
                    const qualName = selectedOption.textContent;
                    const qualId = selectedOption.value;
                    batchNameField.value = generateBatchName(qualName, parseInt(qualId));
                    // Filter trainers by selected qualification
                    filterTrainersByQualification(selectedOption.value);
                } else {
                    batchNameField.value = '';
                    // Show all trainers if no qualification selected
                    populateAllTrainers();
                }
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
    const status = document.getElementById('newBatchStatus')?.value || 'open';

    if (!batchName || !qualificationId || !trainerId || !startDate || !endDate) {
        showError('Please fill in all required fields');
        return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
        showError('End date must be after start date');
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
        max_trainees: maxTrainees ? parseInt(maxTrainees) : null
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
            document.getElementById('newBatchStatus').value = batch.status;
            
            const modalLabel = document.querySelector('#createBatchModal h3');
            const submitBtn = document.querySelector('#createBatchModal button[type="submit"]');
            if (modalLabel) modalLabel.textContent = 'Edit Batch';
            if (submitBtn) submitBtn.textContent = 'Save Changes';
            
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
