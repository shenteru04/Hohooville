const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/Hohoo-ville/uploads/trainers/';
let trainerModal;
let viewModal;
let phLocationData = {};
let currentAddressValue = '';
let pendingAddressValue = '';
let qualificationOptions = [];
let qualificationSectionCount = 0;

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

    trainerModal = new SimpleModal(document.getElementById('trainerModal'));
    viewModal = new SimpleModal(document.getElementById('viewTrainerModal'));

    loadTrainers();
    loadSpecializations();
    loadPhAddressData();

    const form = document.getElementById('trainerForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveTrainer();
        });
    }

    setupEmailValidation();
    setupPhoneValidation();

    const addQualificationBtn = document.getElementById('addQualificationBtn');
    if (addQualificationBtn) {
        addQualificationBtn.addEventListener('click', () => addQualificationSection());
    }

    const qualificationsContainer = document.getElementById('qualificationsContainer');
    if (qualificationsContainer) {
        qualificationsContainer.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-qualification');
            if (removeBtn) {
                const section = removeBtn.closest('.qualification-section');
                if (section) {
                    section.remove();
                    renumberQualificationSections();
                }
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
        if (!document.querySelector('.modal-root.flex:not(.hidden)')) {
            document.body.classList.remove('overflow-hidden');
        }
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', openSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
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
            if (modalId === 'trainerModal' && trainerModal) return trainerModal.hide();
            if (modalId === 'viewTrainerModal' && viewModal) return viewModal.hide();
        });
    });
}

function setupEmailValidation() {
    const emailInput = document.getElementById('email');
    if (!emailInput) return;

    emailInput.oninput = null;
    emailInput.onblur = null;
    emailInput.addEventListener('input', function() {
        const val = this.value.trim();
        const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (val.length === 0) {
            this.classList.remove('is-invalid');
            this.setCustomValidity('');
            return;
        }
        if (emailPattern.test(val)) {
            this.classList.remove('is-invalid');
            this.setCustomValidity('');
        } else {
            this.classList.add('is-invalid');
            this.setCustomValidity('Please enter a valid email address (e.g., name@example.com).');
        }
    });
    emailInput.addEventListener('blur', function() {
        const val = this.value.trim();
        const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (val.length === 0) return;
        if (!emailPattern.test(val)) {
            this.classList.add('is-invalid');
        }
    });
}

function setupPhoneValidation() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput) return;

    let errorMessage = phoneInput.parentElement.querySelector('.phone-error');
    if (!errorMessage) {
        errorMessage = document.createElement('div');
        errorMessage.className = 'phone-error mt-1 text-xs text-red-600';
        errorMessage.style.display = 'none';
        errorMessage.textContent = 'Numbers only';
        phoneInput.parentElement.appendChild(errorMessage);
    }

    let errorTimeout;
    phoneInput.addEventListener('keypress', function(event) {
        const char = String.fromCharCode(event.which);
        if (!/[0-9]/.test(char)) {
            event.preventDefault();
            this.classList.add('is-invalid');
            errorMessage.style.display = 'block';
            clearTimeout(errorTimeout);
            errorTimeout = setTimeout(() => {
                this.classList.remove('is-invalid');
                errorMessage.style.display = 'none';
            }, 2000);
        }
    });

    phoneInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
}

async function loadSpecializations() {
    try {
        // Use the registrar endpoint to ensure we get qualification_ids consistent with other pages
        const response = await axios.get(`${API_BASE_URL}/role/registrar/qualifications.php?action=list`);
        if (response.data.success) {
            qualificationOptions = response.data.data || [];
            refreshQualificationSelects();
        }
    } catch (error) {
        console.error('Error loading specializations:', error);
    }
}

async function loadTrainers() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/trainers.php?action=list`);
        if (response.data.success) {
            renderTrainersTable(response.data.data);
        } else {
            console.error("Failed to load trainers:", response.data.message);
        }
    } catch (error) {
        console.error('Error loading trainers:', error);
    }
}

async function loadPhAddressData() {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/flores-jacob/philippine-regions-provinces-cities-municipalities-barangays/master/philippine_provinces_cities_municipalities_and_barangays_2019v2.json');
        phLocationData = response.data || {};
        populateAddressDropdowns();
        if (pendingAddressValue) {
            const addressToApply = pendingAddressValue;
            pendingAddressValue = '';
            setAddressFromString(addressToApply);
        }
    } catch (error) {
        console.error('Error loading PH location data:', error);
    }
}

function populateAddressDropdowns() {
    const provinceSelect = document.getElementById('addrProvince');
    const citySelect = document.getElementById('addrCity');
    const barangaySelect = document.getElementById('addrBarangay');
    const regionInput = document.getElementById('addrRegion');
    const districtInput = document.getElementById('addrDistrict');

    if (!provinceSelect || !citySelect || !barangaySelect || !regionInput) return;

    const allProvinces = [];
    for (const rKey in phLocationData) {
        const regionName = phLocationData[rKey].region_name;
        const provinces = phLocationData[rKey].province_list;
        for (const pName in provinces) {
            allProvinces.push({ name: pName, region: regionName, regionKey: rKey });
        }
    }
    allProvinces.sort((a, b) => a.name.localeCompare(b.name));

    provinceSelect.innerHTML = '<option value="">Select Province</option>';
    allProvinces.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.text = p.name;
        opt.dataset.region = p.region;
        opt.dataset.regionKey = p.regionKey;
        provinceSelect.appendChild(opt);
    });

    provinceSelect.addEventListener('change', function() {
        citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
        regionInput.value = '';
        if (districtInput) districtInput.value = '';

        const selectedOption = this.options[this.selectedIndex];
        if (!selectedOption || !selectedOption.value) return;

        regionInput.value = selectedOption.dataset.region;
        const rKey = selectedOption.dataset.regionKey;
        const pName = this.value;
        const municipalities = phLocationData[rKey].province_list[pName].municipality_list;
        const cityNames = Object.keys(municipalities).sort();
        cityNames.forEach(muniName => {
            citySelect.innerHTML += `<option value="${muniName}">${muniName}</option>`;
        });
    });

    citySelect.addEventListener('change', function() {
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
        if (districtInput) districtInput.value = '';

        const selectedProvOption = provinceSelect.options[provinceSelect.selectedIndex];
        if (!selectedProvOption || !selectedProvOption.value) return;

        const regionKey = selectedProvOption.dataset.regionKey;
        const provName = provinceSelect.value;
        const muniName = this.value;

        if (regionKey && provName && muniName) {
            const barangays = phLocationData[regionKey].province_list[provName].municipality_list[muniName].barangay_list;
            barangays.sort();
            barangays.forEach(brgy => {
                barangaySelect.innerHTML += `<option value="${brgy}">${brgy}</option>`;
            });
        }
    });
}

function buildQualificationOptions() {
    const options = ['<option value="">Select Qualification</option>'];
    qualificationOptions.forEach(course => {
        const label = course.qualification_name || course.course_name;
        options.push(`<option value="${course.qualification_id}">${label}</option>`);
    });
    return options.join('');
}

function refreshQualificationSelects() {
    document.querySelectorAll('.qualification-select').forEach(select => {
        const current = select.value;
        select.innerHTML = buildQualificationOptions();
        if (current) select.value = current;
    });
}

function addQualificationSection(data = {}, opts = {}) {
    const container = document.getElementById('qualificationsContainer');
    if (!container) return;

    const section = document.createElement('div');
    section.className = 'qualification-section mb-3 rounded-lg border border-slate-200 p-3';
    section.dataset.index = qualificationSectionCount++;

    const ncRequired = opts.requiredNcFile !== false;
    const shouldRequireNc = ncRequired || !data.nc_file;
    const showRemove = opts.allowRemove !== false;

    const ncExistingLink = data.nc_file
        ? `<div class="existing-nc mt-1 text-xs text-slate-500">Current: <a class="text-blue-600 underline" href="${UPLOADS_URL}${encodeURIComponent(data.nc_file)}" target="_blank">${data.nc_file}</a></div>`
        : '';
    const expExistingLink = data.experience_file
        ? `<div class="existing-exp mt-1 text-xs text-slate-500">Current: <a class="text-blue-600 underline" href="${UPLOADS_URL}${encodeURIComponent(data.experience_file)}" target="_blank">${data.experience_file}</a></div>`
        : '';

    section.dataset.existingNc = data.nc_file ? '1' : '0';
    section.dataset.existingExp = data.experience_file ? '1' : '0';

    section.innerHTML = `
        <div class="mb-2 flex items-center justify-between">
            <strong class="qualification-title text-sm text-slate-900">Qualification</strong>
            ${showRemove ? '<button type="button" class="remove-qualification inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><i class="fas fa-trash"></i>Remove</button>' : ''}
        </div>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Qualification <span class="text-red-600">*</span></label>
                <select class="qualification-select w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" required></select>
            </div>
            <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">NC Level <span class="text-red-600">*</span></label>
                <select class="nc-level w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" required>
                    <option value="">Select NC Level</option>
                    <option value="1">NC I</option>
                    <option value="2">NC II</option>
                    <option value="3">NC III</option>
                    <option value="4">NC IV</option>
                </select>
            </div>
        </div>
        <div class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">NC Certificate <span class="text-red-600">*</span></label>
                <input type="file" class="nc-file w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" accept=".pdf,.jpg,.png" ${shouldRequireNc ? 'required' : ''}>
                ${ncExistingLink}
            </div>
            <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Work Experience Documents</label>
                <input type="file" class="exp-file w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" accept=".pdf,.jpg,.png">
                ${expExistingLink}
            </div>
        </div>
    `;

    container.appendChild(section);

    const select = section.querySelector('.qualification-select');
    select.innerHTML = buildQualificationOptions();
    if (data.qualification_id) select.value = String(data.qualification_id);
    if (data.nc_level_id) section.querySelector('.nc-level').value = String(data.nc_level_id);
    if (!shouldRequireNc) {
        section.querySelector('.nc-file').required = false;
    }

    renumberQualificationSections();
}

function renumberQualificationSections() {
    const sections = document.querySelectorAll('.qualification-section');
    sections.forEach((section, idx) => {
        const title = section.querySelector('.qualification-title');
        if (title) title.textContent = `Qualification ${idx + 1}`;
    });
}

function renderTrainersTable(trainers) {
    const tbody = document.getElementById('trainersTableBody');
    tbody.innerHTML = '';
    if (!trainers || trainers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No trainers found.</td></tr>';
        return;
    }

    trainers.forEach(trainer => {
        const row = document.createElement('tr');
        const qualificationLabel = trainer.qualification_names || trainer.qualification_name || 'N/A';
        const statusClass = trainer.status === 'active'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-200 text-slate-700';
        row.className = 'hover:bg-slate-50';
        row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-slate-800">${trainer.first_name} ${trainer.last_name}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${trainer.email}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${qualificationLabel}</td>
            <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}">${trainer.status}</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap items-center justify-center gap-1">
                <button class="inline-flex items-center rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" type="button" onclick="viewTrainerDetails(${trainer.trainer_id})" title="View">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" type="button" onclick="editTrainer(${trainer.trainer_id})" title="Edit">
                  <i class="fas fa-edit"></i>
                </button>
              </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.openAddModal = function() {
    document.getElementById('trainerForm').reset();
    document.getElementById('trainerId').value = '';
    currentAddressValue = '';
    pendingAddressValue = '';
    document.getElementById('trainerModalLabel').textContent = 'Add New Trainer';
    setRequiredState(true);
    clearQualificationSections();
    addQualificationSection({}, { allowRemove: false, requiredNcFile: true });
    setCurrentTrainerFileLinks({});
    trainerModal.show();
}

function renderCurrentFileLink(containerId, fileName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!fileName) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = `Current: <a class="text-blue-600 underline" href="${UPLOADS_URL}${encodeURIComponent(fileName)}" target="_blank">${fileName}</a>`;
}

function setCurrentTrainerFileLinks(trainer) {
    renderCurrentFileLink('nttcFileCurrent', trainer?.nttc_file);
    renderCurrentFileLink('tmFileCurrent', trainer?.tm_file);
}

async function saveTrainer() {
    const form = document.getElementById('trainerForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    const trainerId = document.getElementById('trainerId').value;
    const action = trainerId ? 'update' : 'add';
    const sections = Array.from(document.querySelectorAll('.qualification-section'));
    if (sections.length === 0) {
        Swal.fire('Required', 'Please add at least one qualification.', 'warning');
        return;
    }

    const seenQualifications = new Set();
    const qualificationPayload = [];
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const qualSelect = section.querySelector('.qualification-select');
        const ncLevelSelect = section.querySelector('.nc-level');
        const ncFileInput = section.querySelector('.nc-file');
        const expFileInput = section.querySelector('.exp-file');

        const qualificationId = qualSelect?.value?.trim();
        const ncLevelId = ncLevelSelect?.value?.trim();
        const hasExistingNc = section.dataset.existingNc === '1';

        if (!qualificationId) {
            Swal.fire('Required', `Please select a qualification for Qualification ${i + 1}.`, 'warning');
            qualSelect?.focus();
            return;
        }
        if (seenQualifications.has(qualificationId)) {
            Swal.fire('Duplicate', 'Please select unique qualifications.', 'warning');
            qualSelect?.focus();
            return;
        }
        seenQualifications.add(qualificationId);

        if (!ncLevelId) {
            Swal.fire('Required', `Please select an NC Level for Qualification ${i + 1}.`, 'warning');
            ncLevelSelect?.focus();
            return;
        }

        if (!ncFileInput?.files?.[0] && !hasExistingNc) {
            Swal.fire('Required', `Please upload the NC Certificate for Qualification ${i + 1}.`, 'warning');
            ncFileInput?.focus();
            return;
        }

        qualificationPayload.push({
            qualificationId,
            ncLevelId,
            ncFile: ncFileInput?.files?.[0] || null,
            expFile: expFileInput?.files?.[0] || null,
            hasExistingNc
        });
    }

    const addressValue = getAddressValue();
    if (!addressValue) {
        Swal.fire('Required', 'Please complete the address fields.', 'warning');
        return;
    }
    const addressInput = document.getElementById('address');
    if (addressInput) addressInput.value = addressValue;
    
    const formData = new FormData();
    formData.append('first_name', document.getElementById('firstName').value);
    formData.append('last_name', document.getElementById('lastName').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('phone', document.getElementById('phone').value);
    qualificationPayload.forEach((q, idx) => {
        formData.append(`qualification_ids[${idx}]`, q.qualificationId);
        formData.append(`nc_level_ids[${idx}]`, q.ncLevelId);
        if (q.ncFile) formData.append(`nc_files[${idx}]`, q.ncFile);
        if (q.expFile) formData.append(`experience_files[${idx}]`, q.expFile);
    });
    formData.append('address', addressValue);
    formData.append('address_house', document.getElementById('addrHouse')?.value?.trim() || '');
    formData.append('address_barangay', document.getElementById('addrBarangay')?.value?.trim() || '');
    formData.append('address_district', document.getElementById('addrDistrict')?.value?.trim() || '');
    formData.append('address_city', document.getElementById('addrCity')?.value?.trim() || '');
    formData.append('address_province', document.getElementById('addrProvince')?.value?.trim() || '');
    formData.append('address_region', document.getElementById('addrRegion')?.value?.trim() || '');
    formData.append('nttc_no', document.getElementById('nttcNo').value);
    
    if(document.getElementById('nttcFile').files[0]) formData.append('nttc_file', document.getElementById('nttcFile').files[0]);
    if(document.getElementById('tmFile').files[0]) formData.append('tm_file', document.getElementById('tmFile').files[0]);

    if (trainerId) {
        formData.append('trainer_id', trainerId);
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/role/registrar/trainers.php?action=${action}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (response.data.success) {
            Swal.fire('Success', `Trainer ${trainerId ? 'updated' : 'added'} successfully!${!trainerId ? ' Default password is their last name.' : ''}`, 'success');
            trainerModal.hide();
            loadTrainers();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error(`Error saving trainer:`, error);
        Swal.fire('Error', 'An error occurred while saving the trainer.', 'error');
    }
}

window.editTrainer = async function(id) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/trainers.php?action=get&id=${id}`);
        if (response.data.success) {
            const trainer = response.data.data;
            if (!qualificationOptions.length) {
                await loadSpecializations();
            }
            document.getElementById('trainerId').value = trainer.trainer_id;
            document.getElementById('firstName').value = trainer.first_name;
            document.getElementById('lastName').value = trainer.last_name;
            document.getElementById('email').value = trainer.email;
            document.getElementById('phone').value = trainer.phone_number;
            // Re-apply email validation listeners after setting value
            if (typeof setupEmailValidation === 'function') setupEmailValidation();
            currentAddressValue = trainer.address || '';
            setAddressFromString(currentAddressValue);
            document.getElementById('nttcNo').value = trainer.nttc_no;
            setCurrentTrainerFileLinks(trainer);

            clearQualificationSections();
            const qualifications = (trainer.qualifications && trainer.qualifications.length)
                ? trainer.qualifications
                : [{
                    qualification_id: trainer.qualification_id,
                    nc_level_id: trainer.trainer_nc_level_id,
                    nc_level_name: trainer.nc_level_name,
                    nc_file: trainer.nc_file,
                    experience_file: trainer.experience_file
                }].filter(q => q.qualification_id);

            const allowRemove = qualifications.length > 1;
            qualifications.forEach(q => {
                addQualificationSection(q, { allowRemove, requiredNcFile: false });
            });
            if (qualifications.length === 0) {
                addQualificationSection({}, { allowRemove: false, requiredNcFile: true });
            }

            document.getElementById('trainerModalLabel').textContent = 'Edit Trainer';
            setRequiredState(false);
            trainerModal.show();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error fetching trainer details:', error);
    }
}

window.viewTrainerDetails = async function(id) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/trainers.php?action=get&id=${id}`);
        if (response.data.success) {
            const trainer = response.data.data;
            const body = document.getElementById('viewTrainerBody');
            
            const createFileLink = (file, label) => {
                if (!file) return `<p class="mb-1 text-sm text-slate-700"><strong class="text-slate-500">${label}:</strong> N/A</p>`;
                return `<p class="mb-1 text-sm text-slate-700"><strong class="text-slate-500">${label}:</strong> <a class="text-blue-600 underline" href="${UPLOADS_URL}${encodeURIComponent(file)}" target="_blank">${file}</a></p>`;
            };

            const qualifications = (trainer.qualifications && trainer.qualifications.length)
                ? trainer.qualifications
                : [{
                    qualification_name: trainer.qualification_name || 'N/A',
                    nc_level_name: trainer.nc_level_name || 'N/A',
                    nc_file: trainer.nc_file || null,
                    experience_file: trainer.experience_file || null
                }];

            const qualificationsHtml = qualifications.map(q => `
                <div class="mb-3 rounded-lg border border-slate-200 p-3">
                    <p class="mb-1 text-sm font-semibold text-slate-900">${q.qualification_name || 'Qualification'}</p>
                    <p class="mb-1 text-sm text-slate-700"><strong class="text-slate-500">NC Level:</strong> ${q.nc_level_name || 'N/A'}</p>
                    ${createFileLink(q.nc_file, 'NC Certificate')}
                    ${createFileLink(q.experience_file, 'Experience Docs')}
                </div>
            `).join('');

            const statusClass = trainer.status === 'active'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-200 text-slate-700';
            body.innerHTML = `
                <h5 class="mb-2 text-lg font-semibold text-slate-900">${trainer.first_name} ${trainer.last_name}</h5>
                <p class="mb-1 text-sm text-slate-700"><strong class="text-slate-500">Email:</strong> ${trainer.email}</p>
                <p class="mb-1 text-sm text-slate-700"><strong class="text-slate-500">Phone:</strong> ${trainer.phone_number || 'N/A'}</p>
                <p class="mb-1 text-sm text-slate-700"><strong class="text-slate-500">Address:</strong> ${trainer.address || 'N/A'}</p>
                <p class="mb-1 text-sm text-slate-700"><strong class="text-slate-500">Qualification(s):</strong> ${trainer.qualification_names || trainer.qualification_name || 'N/A'}</p>
                <p class="mb-3 text-sm text-slate-700"><strong class="text-slate-500">Status:</strong> <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}">${trainer.status}</span></p>
                <hr class="my-4 border-slate-200">
                <h6 class="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700">Certifications</h6>
                <p class="mb-1 text-sm text-slate-700"><strong class="text-slate-500">NTTC No:</strong> ${trainer.nttc_no || 'N/A'}</p>
                ${createFileLink(trainer.nttc_file, 'NTTC Certificate')}
                ${createFileLink(trainer.tm_file, 'TM Certificate')}
                <hr class="my-4 border-slate-200">
                <h6 class="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700">Qualifications</h6>
                ${qualificationsHtml}
            `;
            viewModal.show();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error fetching trainer details:', error);
    }
}

function setRequiredState(isRequired) {
    const nttcFile = document.getElementById('nttcFile');
    if (nttcFile) nttcFile.required = false;

    const tmFile = document.getElementById('tmFile');
    if (tmFile) tmFile.required = isRequired;

    const addressIds = ['addrProvince', 'addrCity', 'addrRegion', 'addrBarangay', 'addrDistrict', 'addrHouse'];
    addressIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.required = true;
    });

    document.querySelectorAll('.qualification-select').forEach(el => {
        el.required = true;
    });
    document.querySelectorAll('.nc-level').forEach(el => {
        el.required = true;
    });
    document.querySelectorAll('.nc-file').forEach(el => {
        const hasExisting = el.closest('.qualification-section')?.dataset.existingNc === '1';
        el.required = isRequired || !hasExisting;
    });
}

function clearQualificationSections() {
    const container = document.getElementById('qualificationsContainer');
    if (container) {
        container.innerHTML = '';
    }
    qualificationSectionCount = 0;
}

function getAddressValue() {
    const house = document.getElementById('addrHouse')?.value?.trim() || '';
    const barangay = document.getElementById('addrBarangay')?.value?.trim() || '';
    const district = document.getElementById('addrDistrict')?.value?.trim() || '';
    const city = document.getElementById('addrCity')?.value?.trim() || '';
    const province = document.getElementById('addrProvince')?.value?.trim() || '';

    const hasSelection = house || barangay || district || city || province;
    if (!hasSelection && currentAddressValue) return currentAddressValue;

    const parts = [house, barangay, district, city, province].filter(Boolean);
    return parts.join(', ');
}

function setAddressFromString(address) {
    if (!address) return;
    const provinceSelect = document.getElementById('addrProvince');
    const citySelect = document.getElementById('addrCity');
    const barangaySelect = document.getElementById('addrBarangay');
    const regionInput = document.getElementById('addrRegion');
    const districtInput = document.getElementById('addrDistrict');
    const houseInput = document.getElementById('addrHouse');

    if (!provinceSelect || !citySelect || !barangaySelect) return;
    if (!phLocationData || Object.keys(phLocationData).length === 0) {
        pendingAddressValue = address;
        return;
    }

    const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) return;

    let region = '';
    const lastPart = parts[parts.length - 1] || '';
    if (/^region\b/i.test(lastPart)) {
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

    if (houseInput && house) houseInput.value = house;
    const resolvedDistrict = district || city || '';
    if (regionInput && region) regionInput.value = region;

    const setSelectValue = (select, value) => {
        if (!select || !value) return false;
        const needle = String(value).trim().toLowerCase();
        const match = Array.from(select.options).find((option) => option.value.trim().toLowerCase() === needle);
        if (!match) return false;
        select.value = match.value;
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
                    if (districtInput) {
                        districtInput.value = resolvedDistrict;
                    }
                }, 0);
            } else if (districtInput) {
                districtInput.value = resolvedDistrict;
            }
        }, 0);
    } else if (districtInput) {
        districtInput.value = resolvedDistrict;
    }
}
