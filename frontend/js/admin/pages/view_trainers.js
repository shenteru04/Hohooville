const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;
const TOO_MANY_QUALIFICATIONS = 2;

let accountModal;
let editModal;
let createTrainerModal;
let trainersData = [];
let filterTooManyOnly = false;
let availableQualifications = [];
let phAddressData = {};
let pendingCreateAddress = '';
let isCreateModalEditMode = false;

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
    initEvents();
    loadQualifications();
    loadQualificationsForCreate();
    loadPhAddressData();
    loadTrainers();
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
    accountModal = new SimpleModal(document.getElementById('accountModal'));
    editModal = new SimpleModal(document.getElementById('editModal'));
    createTrainerModal = new SimpleModal(document.getElementById('createTrainerModal'));

    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-hide');
            if (modalId === 'accountModal' && accountModal) accountModal.hide();
            if (modalId === 'editModal' && editModal) editModal.hide();
            if (modalId === 'createTrainerModal' && createTrainerModal) createTrainerModal.hide();
        });
    });
}

function initEvents() {
    const accountForm = document.getElementById('accountForm');
    const createTrainerForm = document.getElementById('createTrainerForm');
    const createTrainerBtn = document.getElementById('createTrainerBtn');
    const addNewQualBtn = document.getElementById('addNewQualificationBtn');
    const filterToggle = document.getElementById('filterTooManyQualifications');

    if (accountForm) accountForm.addEventListener('submit', handleCreateAccount);
    if (createTrainerForm) createTrainerForm.addEventListener('submit', handleCreateTrainer);
    if (createTrainerBtn) createTrainerBtn.addEventListener('click', openCreateTrainerModal);
    if (addNewQualBtn) addNewQualBtn.addEventListener('click', addQualificationRow);

    if (filterToggle) {
        filterTooManyOnly = Boolean(filterToggle.checked);
        filterToggle.addEventListener('change', () => {
            filterTooManyOnly = Boolean(filterToggle.checked);
            renderTable(trainersData);
        });
    }
}

async function loadQualifications() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainers.php?action=get-qualifications`);
        if (!response.data.success) return;
        availableQualifications = response.data.data || [];
    } catch (error) {
        console.error('Error loading qualifications:', error);
    }
}

function addQualificationRow(data = {}, options = {}) {
    const container = document.getElementById('newQualificationsContainer');
    if (!container) return;

    const index = container.children.length;
    const showRemove = options.allowRemove !== false && index > 0;
    const shouldRequireNc = options.requiredNcFile !== false ? true : !data.nc_file;
    const ncExistingLink = data.nc_file
        ? `<div class="mt-1 text-xs text-slate-500">Current: <a class="text-blue-600 underline" href="${window.location.origin}/Hohoo-ville/uploads/trainers/${encodeURIComponent(data.nc_file)}" target="_blank">${data.nc_file}</a></div>`
        : '';
    const expExistingLink = data.experience_file
        ? `<div class="mt-1 text-xs text-slate-500">Current: <a class="text-blue-600 underline" href="${window.location.origin}/Hohoo-ville/uploads/trainers/${encodeURIComponent(data.experience_file)}" target="_blank">${data.experience_file}</a></div>`
        : '';

    const row = document.createElement('div');
    row.className = 'qualification-row border-b border-slate-100 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0 bg-white p-3 rounded-lg shadow-sm';
    row.dataset.existingNc = data.nc_file ? '1' : '0';
    row.dataset.existingExp = data.experience_file ? '1' : '0';
    row.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <h6 class="text-xs font-bold text-slate-500 uppercase">Qualification ${index + 1}</h6>
            ${showRemove ? `<button type="button" class="text-rose-600 hover:text-rose-800 remove-qualification-btn"><i class="fas fa-trash"></i></button>` : ''}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Course/Qualification <span class="text-rose-600">*</span></label>
                <select name="qualification_ids[]" class="qualification-id w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" required>
                    <option value="">Select Qualification</option>
                    ${availableQualifications.map(q => `<option value="${q.qualification_id}">${q.qualification_name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">NC Level <span class="text-rose-600">*</span></label>
                <select name="nc_level_ids[]" class="nc-level-id w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" required>
                    <option value="">Select Level</option>
                    <option value="1">NC I</option>
                    <option value="2">NC II</option>
                    <option value="3">NC III</option>
                    <option value="4">NC IV</option>
                </select>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">NC Certificate File <span class="text-rose-600">*</span></label>
                <input type="file" name="nc_files[]" class="nc-file w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" accept=".pdf,.jpg,.png" ${shouldRequireNc ? 'required' : ''}>
                ${ncExistingLink}
            </div>
            <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Experience/Certificate <span class="text-slate-400">(Optional)</span></label>
                <input type="file" name="experience_files[]" class="experience-file w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" accept=".pdf,.jpg,.png">
                ${expExistingLink}
            </div>
        </div>
    `;

    const select = row.querySelector('.qualification-id');
    if (data.qualification_id) {
        select.value = String(data.qualification_id);
    }
    const ncLevel = row.querySelector('.nc-level-id');
    if (data.nc_level_id) {
        ncLevel.value = String(data.nc_level_id);
    }
    const removeBtn = row.querySelector('.remove-qualification-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            row.remove();
            renumberQualificationRows();
        });
    }

    container.appendChild(row);
    renumberQualificationRows();
}

function renumberQualificationRows() {
    const rows = document.querySelectorAll('#newQualificationsContainer .qualification-row');
    rows.forEach((row, idx) => {
        const label = row.querySelector('h6');
        if (label) label.textContent = `Qualification ${idx + 1}`;
    });
}

async function loadTrainers() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainers.php?action=list`);
        if (!response.data.success) return;

        trainersData = response.data.data || [];
        renderTable(trainersData);
    } catch (error) {
        console.error('Error loading trainers:', error);
    }
}

function getQualificationCount(trainer) {
    const count = Number(trainer.qualification_count);
    if (!Number.isNaN(count) && count >= 0) return count;

    const names = trainer.qualification_names || trainer.qualification_name || '';
    if (!names) return 0;
    return names.split(',').map((name) => name.trim()).filter(Boolean).length;
}

function renderTable(data) {
    const tbody = document.getElementById('trainersTableBody');
    const tooManyCountEl = document.getElementById('tooManyQualificationsCount');
    if (!tbody) return;

    const tooManyTotal = data.filter((trainer) => getQualificationCount(trainer) >= TOO_MANY_QUALIFICATIONS).length;
    if (tooManyCountEl) tooManyCountEl.textContent = String(tooManyTotal);

    const filtered = filterTooManyOnly
        ? data.filter((trainer) => getQualificationCount(trainer) >= TOO_MANY_QUALIFICATIONS)
        : data;

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-slate-500">No trainers found</td></tr>';
        return;
    }

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

    tbody.innerHTML = sorted.map((trainer) => {
        const qualificationCount = getQualificationCount(trainer);
        const qualificationLabel = trainer.qualification_names || trainer.qualification_name || '-';
        const ncLevelLabel = trainer.nc_levels || trainer.nc_level_code || 'N/A';
        const countBadge = qualificationCount >= TOO_MANY_QUALIFICATIONS
            ? '<span class="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">2+</span>'
            : `<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">${qualificationCount}</span>`;
        const statusBadge = trainer.status === 'active'
            ? '<span class="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">active</span>'
            : '<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">inactive</span>';

        const accountAction = !trainer.user_id
            ? `<button type="button" class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100" onclick="openAccountModal(${trainer.trainer_id})"><i class="fas fa-key"></i> Create Account</button>`
            : '<span class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700"><i class="fas fa-check"></i> Account Active</span>';

        const statusToggleAction = trainer.status === 'active'
            ? `<button type="button" class="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100" onclick="toggleStatus(${trainer.trainer_id}, 'inactive')"><i class="fas fa-archive"></i> Archive</button>`
            : `<button type="button" class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100" onclick="toggleStatus(${trainer.trainer_id}, 'active')"><i class="fas fa-undo"></i> Activate</button>`;

        return `
            <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 text-sm text-slate-900">${escapeHtml(`${trainer.last_name || ''}, ${trainer.first_name || ''}`)}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(trainer.email || 'N/A')}</td>
                <td class="px-3 py-3 text-sm">
                    <div class="flex flex-wrap items-center gap-2">
                        ${countBadge}
                        <span class="text-slate-700">${escapeHtml(qualificationLabel)}</span>
                    </div>
                </td>
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(ncLevelLabel)}</td>
                <td class="px-3 py-3 text-sm">${statusBadge}</td>
                <td class="px-3 py-3 text-sm">
                    <div class="flex flex-wrap items-center gap-2">
                        ${accountAction}
                        <button type="button" class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100" onclick="openEditModal(${trainer.trainer_id})"><i class="fas fa-edit"></i> Edit</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openAccountModal(id) {
    const trainerIdInput = document.getElementById('accTrainerId');
    const accountForm = document.getElementById('accountForm');
    if (trainerIdInput) trainerIdInput.value = id;
    if (accountForm) accountForm.reset();
    if (accountModal) accountModal.show();
}

async function handleCreateAccount(event) {
    event.preventDefault();
    const payload = {
        trainer_id: document.getElementById('accTrainerId')?.value,
        username: document.getElementById('accUsername')?.value,
        password: document.getElementById('accPassword')?.value
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/admin/trainers.php?action=create-account`, payload);
        if (!response.data.success) {
            Swal.fire('Error', `Error: ${response.data.message || 'Unknown error'}`, 'error');
            return;
        }
        Swal.fire('Success', 'Account created successfully', 'success');
        if (accountModal) accountModal.hide();
        loadTrainers();
    } catch (error) {
        console.error('Error creating account:', error);
        Swal.fire('Error', 'Failed to create account.', 'error');
    }
}

async function toggleStatus(id, status) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to set this trainer to ${status}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Yes, set to ${status}`
    });
    if (!result.isConfirmed) return;

    try {
        await axios.post(`${API_BASE_URL}/role/admin/trainers.php?action=toggle-status`, {
            trainer_id: id,
            status
        });
        loadTrainers();
    } catch (error) {
        console.error('Error updating status:', error);
        Swal.fire('Error', 'Failed to update trainer status.', 'error');
    }
}

function setCreateModalMode(isEdit) {
    isCreateModalEditMode = Boolean(isEdit);
    const title = document.getElementById('createTrainerModalTitle');
    const submitBtn = document.getElementById('createTrainerSubmitBtn');
    const tmInput = document.getElementById('newTmFile');
    if (title) title.textContent = isEdit ? 'Edit Trainer' : 'Create New Trainer';
    if (submitBtn) submitBtn.textContent = isEdit ? 'Update Trainer' : 'Create Trainer';
    if (tmInput) tmInput.required = !isEdit;
}

function setCurrentFileLink(containerId, fileName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!fileName) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = `Current: <a class="text-blue-600 underline" href="${window.location.origin}/Hohoo-ville/uploads/trainers/${encodeURIComponent(fileName)}" target="_blank">${escapeHtml(fileName)}</a>`;
}

function getCreateAddressValue() {
    const parts = [
        document.getElementById('newAddrHouse')?.value?.trim() || '',
        document.getElementById('newAddrBarangay')?.value?.trim() || '',
        document.getElementById('newAddrDistrict')?.value?.trim() || '',
        document.getElementById('newAddrCity')?.value?.trim() || '',
        document.getElementById('newAddrProvince')?.value?.trim() || '',
        document.getElementById('newAddrRegion')?.value?.trim() || ''
    ].filter(Boolean);
    return parts.join(', ');
}

function setAddressFromString(address) {
    if (!address) return;
    const provinceSelect = document.getElementById('newAddrProvince');
    const citySelect = document.getElementById('newAddrCity');
    const barangaySelect = document.getElementById('newAddrBarangay');
    const regionField = document.getElementById('newAddrRegion');
    const districtField = document.getElementById('newAddrDistrict');
    const houseField = document.getElementById('newAddrHouse');

    if (!provinceSelect || !citySelect || !barangaySelect || !regionField) return;
    if (!phAddressData || Object.keys(phAddressData).length === 0) {
        pendingCreateAddress = address;
        return;
    }

    const parts = String(address).split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length < 3) return;

    let region = '';
    const last = parts[parts.length - 1] || '';
    if (/^region\b/i.test(last)) {
        region = parts.pop();
    }

    let house = '';
    let barangay = '';
    let district = '';
    let city = '';
    let province = '';
    if (parts.length >= 5) {
        [house, barangay, district, city, province] = parts;
    } else if (parts.length === 4) {
        [house, barangay, city, province] = parts;
    } else {
        [barangay, city, province] = parts;
    }

    if (houseField) houseField.value = house || '';
    const resolvedDistrict = district || city || '';
    if (regionField) regionField.value = region || '';

    const setSelectValue = (select, value) => {
        if (!select || !value) return false;
        const needle = value.trim().toLowerCase();
        const found = Array.from(select.options).find((opt) => String(opt.value).trim().toLowerCase() === needle);
        if (!found) return false;
        select.value = found.value;
        return true;
    };

    if (province && setSelectValue(provinceSelect, province)) {
        provinceSelect.dispatchEvent(new Event('change'));
        setTimeout(() => {
            if (city && setSelectValue(citySelect, city)) {
                citySelect.dispatchEvent(new Event('change'));
                setTimeout(() => {
                    if (barangay) {
                        setSelectValue(barangaySelect, barangay);
                    }
                    if (districtField) {
                        districtField.value = resolvedDistrict;
                    }
                }, 0);
            } else if (districtField) {
                districtField.value = resolvedDistrict;
            }
        }, 0);
    } else if (districtField) {
        districtField.value = resolvedDistrict;
    }
}

async function openEditModal(id) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainers.php?action=get&id=${id}`);
        if (!response.data.success) {
            Swal.fire('Error', response.data.message || 'Failed to load trainer details', 'error');
            return;
        }

        const trainer = response.data.data || {};
        const form = document.getElementById('createTrainerForm');
        if (form) form.reset();
        setCreateModalMode(true);
        setValue('currentTrainerId', trainer.trainer_id || '');
        setValue('newTrainerFirstName', trainer.first_name || '');
        setValue('newTrainerLastName', trainer.last_name || '');
        setValue('newTrainerEmail', trainer.email || '');
        setValue('newTrainerPhone', trainer.phone_number || '');
        setValue('newNttcNo', trainer.nttc_no || '');

        const container = document.getElementById('newQualificationsContainer');
        if (container) {
            container.innerHTML = '';
            const qualifications = Array.isArray(trainer.qualifications) && trainer.qualifications.length
                ? trainer.qualifications
                : [{
                    qualification_id: trainer.qualification_id,
                    nc_level_id: trainer.trainer_nc_level_id,
                    nc_file: trainer.nc_file,
                    experience_file: trainer.experience_file
                }].filter((item) => item.qualification_id);
            if (!qualifications.length) {
                addQualificationRow({}, { allowRemove: false, requiredNcFile: true });
            } else {
                const allowRemove = qualifications.length > 1;
                qualifications.forEach((item) => addQualificationRow(item, { allowRemove, requiredNcFile: false }));
            }
        }

        setCurrentFileLink('newNttcFileCurrent', trainer.nttc_file);
        setCurrentFileLink('newTmFileCurrent', trainer.tm_file);
        pendingCreateAddress = '';
        setAddressFromString(trainer.address || '');

        if (createTrainerModal) createTrainerModal.show();
    } catch (error) {
        console.error('Error loading trainer for edit:', error);
        Swal.fire('Error', 'Failed to load trainer details', 'error');
    }
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

function openCreateTrainerModal() {
    setCreateModalMode(false);
    const form = document.getElementById('createTrainerForm');
    if (form) form.reset();
    setValue('currentTrainerId', '');
    pendingCreateAddress = '';
    setCurrentFileLink('newNttcFileCurrent', null);
    setCurrentFileLink('newTmFileCurrent', null);

    const container = document.getElementById('newQualificationsContainer');
    if (container) {
        container.innerHTML = '';
        addQualificationRow({}, { allowRemove: false, requiredNcFile: true });
    }

    if (createTrainerModal) createTrainerModal.show();
}

async function handleCreateTrainer(event) {
    event.preventDefault();
    const form = document.getElementById('createTrainerForm');
    if (!form) return;
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const payload = new FormData();
    const trainerId = document.getElementById('currentTrainerId')?.value?.trim() || '';
    const isEdit = Boolean(trainerId) && isCreateModalEditMode;
    const rows = Array.from(document.querySelectorAll('#newQualificationsContainer .qualification-row'));
    if (!rows.length) {
        Swal.fire('Required', 'Please add at least one qualification.', 'warning');
        return;
    }

    try {
        const seen = new Set();
        rows.forEach((row, idx) => {
            const qualId = row.querySelector('.qualification-id')?.value?.trim() || '';
            const ncLevelId = row.querySelector('.nc-level-id')?.value?.trim() || '';
            const ncFileInput = row.querySelector('.nc-file');
            const expFileInput = row.querySelector('.experience-file');
            const hasExistingNc = row.dataset.existingNc === '1';

            if (!qualId || !ncLevelId) {
                throw new Error(`Please complete qualification row ${idx + 1}.`);
            }
            if (seen.has(qualId)) {
                throw new Error('Please select unique qualifications.');
            }
            if (!ncFileInput?.files?.[0] && !hasExistingNc) {
                throw new Error(`Please upload NC certificate for qualification row ${idx + 1}.`);
            }
            seen.add(qualId);

            payload.append(`qualification_ids[${idx}]`, qualId);
            payload.append(`nc_level_ids[${idx}]`, ncLevelId);
            if (ncFileInput?.files?.[0]) payload.append(`nc_files[${idx}]`, ncFileInput.files[0]);
            if (expFileInput?.files?.[0]) payload.append(`experience_files[${idx}]`, expFileInput.files[0]);
        });
    } catch (validationError) {
        Swal.fire('Required', validationError?.message || 'Please complete all required qualification fields.', 'warning');
        return;
    }

    const address = getCreateAddressValue();
    if (!address) {
        Swal.fire('Required', 'Please complete the address fields.', 'warning');
        return;
    }

    payload.append('first_name', document.getElementById('newTrainerFirstName')?.value?.trim() || '');
    payload.append('last_name', document.getElementById('newTrainerLastName')?.value?.trim() || '');
    payload.append('email', document.getElementById('newTrainerEmail')?.value?.trim() || '');
    payload.append('phone', document.getElementById('newTrainerPhone')?.value?.trim() || '');
    payload.append('address', address);
    payload.append('address_house', document.getElementById('newAddrHouse')?.value?.trim() || '');
    payload.append('address_barangay', document.getElementById('newAddrBarangay')?.value?.trim() || '');
    payload.append('address_district', document.getElementById('newAddrDistrict')?.value?.trim() || '');
    payload.append('address_city', document.getElementById('newAddrCity')?.value?.trim() || '');
    payload.append('address_province', document.getElementById('newAddrProvince')?.value?.trim() || '');
    payload.append('address_region', document.getElementById('newAddrRegion')?.value?.trim() || '');
    payload.append('nttc_no', document.getElementById('newNttcNo')?.value?.trim() || '');

    const nttcFile = document.getElementById('newNttcFile')?.files?.[0];
    if (nttcFile) payload.append('nttc_file', nttcFile);
    const tmFile = document.getElementById('newTmFile')?.files?.[0];
    if (tmFile) payload.append('tm_file', tmFile);
    if (isEdit) payload.append('trainer_id', trainerId);

    try {
        const action = isEdit ? 'update' : 'add';
        const response = await axios.post(`${API_BASE_URL}/role/admin/trainers.php?action=${action}`, payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (!response.data.success) {
            Swal.fire('Error', `Error: ${response.data.message || 'Unknown error'}`, 'error');
            return;
        }

        Swal.fire('Success', isEdit ? 'Trainer updated successfully' : 'Trainer created successfully', 'success');
        if (createTrainerModal) createTrainerModal.hide();
        setCreateModalMode(false);
        loadTrainers();
    } catch (error) {
        console.error('Error creating trainer:', error);
        Swal.fire('Error', isCreateModalEditMode ? 'Failed to update trainer' : 'Failed to create trainer', 'error');
    }
}
let qualificationOptionsForCreate = [];

async function loadQualificationsForCreate() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainers.php?action=get-qualifications`);
        if (!response.data.success) return;

        qualificationOptionsForCreate = response.data.data || [];
    } catch (error) {
        console.error('Error loading qualifications:', error);
    }
}

async function loadPhAddressData() {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/flores-jacob/philippine-regions-provinces-cities-municipalities-barangays/master/philippine_provinces_cities_municipalities_and_barangays_2019v2.json');
        phAddressData = response.data || {};
        const provinceSelect = document.getElementById('newAddrProvince');
        const citySelect = document.getElementById('newAddrCity');
        const barangaySelect = document.getElementById('newAddrBarangay');
        const regionField = document.getElementById('newAddrRegion');
        const districtField = document.getElementById('newAddrDistrict');
        if (provinceSelect) {
            const allProvinces = [];
            for (const regionKey in phAddressData) {
                const region = phAddressData[regionKey];
                const provinces = region.province_list || {};
                for (const provinceName in provinces) {
                    allProvinces.push({
                        name: provinceName,
                        regionName: region.region_name,
                        regionKey
                    });
                }
            }
            allProvinces.sort((a, b) => a.name.localeCompare(b.name));

            provinceSelect.innerHTML = '<option value="">Select Province</option>';
            allProvinces.forEach((prov) => {
                const option = document.createElement('option');
                option.value = prov.name;
                option.dataset.regionName = prov.regionName;
                option.dataset.regionKey = prov.regionKey;
                option.textContent = prov.name;
                provinceSelect.appendChild(option);
            });

            provinceSelect.addEventListener('change', () => {
                const selected = provinceSelect.options[provinceSelect.selectedIndex];
                if (regionField) {
                    regionField.value = selected?.dataset.regionName || '';
                }
                if (districtField) districtField.value = '';

                if (citySelect && selected?.value) {
                    citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
                    if (barangaySelect) barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

                    const regionKey = selected.dataset.regionKey;
                    const provinceName = selected.value;
                    const municipalities = (phAddressData[regionKey] && phAddressData[regionKey].province_list && phAddressData[regionKey].province_list[provinceName] && phAddressData[regionKey].province_list[provinceName].municipality_list) || {};
                    Object.keys(municipalities).sort().forEach((cityName) => {
                        const option = document.createElement('option');
                        option.value = cityName;
                        option.textContent = cityName;
                        citySelect.appendChild(option);
                    });
                }
            });

            citySelect?.addEventListener('change', () => {
                if (!barangaySelect) return;
                barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
                if (districtField) districtField.value = '';

                const selectedProv = provinceSelect.options[provinceSelect.selectedIndex];
                const regionKey = selectedProv?.dataset.regionKey;
                const provinceName = provinceSelect.value;
                const cityName = citySelect.value;
                const barangays = (phAddressData[regionKey] && phAddressData[regionKey].province_list && phAddressData[regionKey].province_list[provinceName] && phAddressData[regionKey].province_list[provinceName].municipality_list && phAddressData[regionKey].province_list[provinceName].municipality_list[cityName] && phAddressData[regionKey].province_list[provinceName].municipality_list[cityName].barangay_list) || [];
                barangays.forEach((barangay) => {
                    const option = document.createElement('option');
                    option.value = barangay;
                    option.textContent = barangay;
                    barangaySelect.appendChild(option);
                });
            });
        }
        if (pendingCreateAddress) {
            const value = pendingCreateAddress;
            pendingCreateAddress = '';
            setAddressFromString(value);
        }
    } catch (error) {
        console.error('Error loading address data:', error);
    }
}

function addQualificationRowDeprecated() {
    const container = document.getElementById('newQualificationsContainer');
    if (!container) return;

    const section = document.createElement('div');
    section.className = 'qualification-section mb-3 flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3';
    section.innerHTML = `
        <div class="flex-1">
            <select class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" name="qualifications[]" required>
                <option value="">Select Qualification</option>
                ${qualificationOptionsForCreate.map(q => `<option value="${q.qualification_id}">${q.qualification_name}</option>`).join('')}
            </select>
        </div>
        <button type="button" class="remove-qualification rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
            <i class="fas fa-trash"></i> Remove
        </button>
    `;

    section.querySelector('.remove-qualification').addEventListener('click', (e) => {
        e.preventDefault();
        section.remove();
    });

    container.appendChild(section);
}
