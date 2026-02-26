const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainers/';
let trainerModal;
let viewModal;
let phLocationData = {};
let currentAddressValue = '';
let qualificationOptions = [];
let qualificationSectionCount = 0;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    trainerModal = new bootstrap.Modal(document.getElementById('trainerModal'));
    viewModal = new bootstrap.Modal(document.getElementById('viewTrainerModal'));

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
    function setupEmailValidation() {
        const emailInput = document.getElementById('email');
        if (emailInput) {
            // Remove previous listeners to avoid duplicates
            emailInput.oninput = null;
            emailInput.onblur = null;
            emailInput.addEventListener('input', function() {
                const val = this.value.trim();
                // Use a more robust regex for email validation
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
    }
    setupEmailValidation();
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        const errorMessage = document.createElement('div');
        errorMessage.style.display = 'none';
        errorMessage.style.color = '#dc3545';
        errorMessage.style.fontSize = '0.875rem';
        errorMessage.style.marginTop = '0.25rem';
        errorMessage.textContent = 'Numbers only';
        phoneInput.parentElement.appendChild(errorMessage);

        let errorTimeout;
        phoneInput.addEventListener('keypress', function(e) {
            const char = String.fromCharCode(e.which);
            if (!/[0-9]/.test(char)) {
                e.preventDefault();
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

    // Inject Sidebar CSS (W3.CSS Reference Style)
    const ms = document.createElement('style');
    ms.innerHTML = `
        #sidebar {
            width: 200px;
            position: fixed;
            z-index: 1050;
            top: 0;
            left: 0;
            height: 100vh;
            overflow-y: auto;
            background-color: #fff;
            box-shadow: 0 2px 5px 0 rgba(0,0,0,0.16), 0 2px 10px 0 rgba(0,0,0,0.12);
            display: block;
        }
        .main-content, #content, .content-wrapper {
            margin-left: 200px !important;
            transition: margin-left .4s;
        }
        #sidebarCloseBtn {
            display: none;
            width: 100%;
            text-align: left;
            padding: 8px 16px;
            background: none;
            border: none;
            font-size: 18px;
        }
        #sidebarCloseBtn:hover { background-color: #ccc; }
        
        @media (max-width: 991.98px) {
            #sidebar { display: none; }
            .main-content, #content, .content-wrapper { margin-left: 0 !important; }
            #sidebarCloseBtn { display: block; }
        }
        .table-responsive, table { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    `;
    document.head.appendChild(ms);

    // Sidebar Logic
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (!document.getElementById('sidebarCloseBtn')) {
            const closeBtn = document.createElement('button');
            closeBtn.id = 'sidebarCloseBtn';
            closeBtn.innerHTML = 'Close &times;';
            closeBtn.addEventListener('click', () => {
                sidebar.style.display = 'none';
            });
            sidebar.insertBefore(closeBtn, sidebar.firstChild);
        }
    }

    // Open Button Logic
    let sc = document.getElementById('sidebarCollapse');
    if (!sc) {
        const nb = document.querySelector('.navbar');
        if (nb) {
            const c = nb.querySelector('.container-fluid') || nb;
            const b = document.createElement('button');
            b.id = 'sidebarCollapse';
            b.className = 'btn btn-outline-primary me-2 d-lg-none';
            b.type = 'button';
            b.innerHTML = '&#9776;';
            c.insertBefore(b, c.firstChild);
            sc = b;
        }
    }
    if (sc) {
        const nb = sc.cloneNode(true);
        if(sc.parentNode) sc.parentNode.replaceChild(nb, sc);
        nb.addEventListener('click', () => {
            if (sidebar) sidebar.style.display = 'block';
        });
    }
});

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
    section.className = 'qualification-section border rounded p-3 mb-3';
    section.dataset.index = qualificationSectionCount++;

    const ncRequired = opts.requiredNcFile !== false;
    const shouldRequireNc = ncRequired || !data.nc_file;
    const showRemove = opts.allowRemove !== false;

    const ncExistingLink = data.nc_file
        ? `<div class="form-text existing-nc">Current: <a href="${UPLOADS_URL}${encodeURIComponent(data.nc_file)}" target="_blank">${data.nc_file}</a></div>`
        : '';
    const expExistingLink = data.experience_file
        ? `<div class="form-text existing-exp">Current: <a href="${UPLOADS_URL}${encodeURIComponent(data.experience_file)}" target="_blank">${data.experience_file}</a></div>`
        : '';

    section.dataset.existingNc = data.nc_file ? '1' : '0';
    section.dataset.existingExp = data.experience_file ? '1' : '0';

    section.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <strong class="qualification-title">Qualification</strong>
            ${showRemove ? '<button type="button" class="btn btn-outline-danger btn-sm remove-qualification"><i class="fas fa-trash me-1"></i>Remove</button>' : ''}
        </div>
        <div class="row g-2">
            <div class="col-md-6">
                <label class="form-label">Qualification <span class="text-danger">*</span></label>
                <select class="form-select qualification-select" required></select>
            </div>
            <div class="col-md-6">
                <label class="form-label">NC Level <span class="text-danger">*</span></label>
                <select class="form-select nc-level" required>
                    <option value="">Select NC Level</option>
                    <option value="NC I">NC I</option>
                    <option value="NC II">NC II</option>
                </select>
            </div>
        </div>
        <div class="row g-2 mt-1">
            <div class="col-md-6">
                <label class="form-label">NC Certificate <span class="text-danger">*</span></label>
                <input type="file" class="form-control nc-file" accept=".pdf,.jpg,.png" ${shouldRequireNc ? 'required' : ''}>
                ${ncExistingLink}
            </div>
            <div class="col-md-6">
                <label class="form-label">Work Experience Documents</label>
                <input type="file" class="form-control exp-file" accept=".pdf,.jpg,.png">
                ${expExistingLink}
            </div>
        </div>
    `;

    container.appendChild(section);

    const select = section.querySelector('.qualification-select');
    select.innerHTML = buildQualificationOptions();
    if (data.qualification_id) select.value = String(data.qualification_id);
    if (data.nc_level) section.querySelector('.nc-level').value = data.nc_level;
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
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No trainers found.</td></tr>';
        return;
    }

    trainers.forEach(trainer => {
        const row = document.createElement('tr');
        const qualificationLabel = trainer.qualification_names || trainer.qualification_name || 'N/A';
        row.innerHTML = `
            <td>${trainer.first_name} ${trainer.last_name}</td>
            <td>${trainer.email}</td>
            <td>${qualificationLabel}</td>
            <td><span class="badge bg-${trainer.status === 'active' ? 'success' : 'secondary'}">${trainer.status}</span></td>
            <td>
                <div class="dropdown d-flex justify-content-center">
                  <button class="btn btn-sm px-2 py-1" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Actions">
                    <i class="fas fa-ellipsis-v"></i>
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="#" onclick="viewTrainerDetails(${trainer.trainer_id})"><i class="fas fa-eye me-2"></i>View</a></li>
                    <li><a class="dropdown-item" href="#" onclick="editTrainer(${trainer.trainer_id})"><i class="fas fa-edit me-2"></i>Edit</a></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteTrainer(${trainer.trainer_id})"><i class="fas fa-trash me-2"></i>Delete</a></li>
                  </ul>
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
    document.getElementById('trainerModalLabel').textContent = 'Add New Trainer';
    setRequiredState(true);
    clearQualificationSections();
    addQualificationSection({}, { allowRemove: false, requiredNcFile: true });
    trainerModal.show();
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
        const ncLevel = ncLevelSelect?.value?.trim();
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

        if (!ncLevel) {
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
            ncLevel,
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
        formData.append(`nc_levels[${idx}]`, q.ncLevel);
        if (q.ncFile) formData.append(`nc_files[${idx}]`, q.ncFile);
        if (q.expFile) formData.append(`experience_files[${idx}]`, q.expFile);
    });
    formData.append('address', addressValue);
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

            clearQualificationSections();
            const qualifications = (trainer.qualifications && trainer.qualifications.length)
                ? trainer.qualifications
                : [{
                    qualification_id: trainer.qualification_id,
                    nc_level: trainer.nc_level,
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
                if (!file) return `<p class="mb-1"><strong class="text-muted">${label}:</strong> N/A</p>`;
                return `<p class="mb-1"><strong class="text-muted">${label}:</strong> <a href="${UPLOADS_URL}${encodeURIComponent(file)}" target="_blank">${file}</a></p>`;
            };

            const qualifications = (trainer.qualifications && trainer.qualifications.length)
                ? trainer.qualifications
                : [{
                    qualification_name: trainer.qualification_name || 'N/A',
                    nc_level: trainer.nc_level || 'N/A',
                    nc_file: trainer.nc_file || null,
                    experience_file: trainer.experience_file || null
                }];

            const qualificationsHtml = qualifications.map(q => `
                <div class="mb-3">
                    <p class="mb-1"><strong>${q.qualification_name || 'Qualification'}</strong></p>
                    <p class="mb-1"><strong class="text-muted">NC Level:</strong> ${q.nc_level || 'N/A'}</p>
                    ${createFileLink(q.nc_file, 'NC Certificate')}
                    ${createFileLink(q.experience_file, 'Experience Docs')}
                </div>
            `).join('');

            body.innerHTML = `
                <h5>${trainer.first_name} ${trainer.last_name}</h5>
                <p><strong>Email:</strong> ${trainer.email}</p>
                <p><strong>Phone:</strong> ${trainer.phone_number || 'N/A'}</p>
                <p><strong>Address:</strong> ${trainer.address || 'N/A'}</p>
                <p><strong>Qualification(s):</strong> ${trainer.qualification_names || trainer.qualification_name || 'N/A'}</p>
                <p><strong>Status:</strong> <span class="badge bg-${trainer.status === 'active' ? 'success' : 'secondary'}">${trainer.status}</span></p>
                <hr>
                <h6>Certifications</h6>
                <p><strong>NTTC No:</strong> ${trainer.nttc_no || 'N/A'}</p>
                ${createFileLink(trainer.nttc_file, 'NTTC Certificate')}
                ${createFileLink(trainer.tm_file, 'TM Certificate')}
                <hr>
                <h6>Qualifications</h6>
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

window.deleteTrainer = async function(id) {
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
        const response = await axios.delete(`${API_BASE_URL}/role/registrar/trainers.php?action=delete&id=${id}`);
        if (response.data.success) {
            Swal.fire('Deleted!', 'Trainer deleted successfully!', 'success');
            loadTrainers();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting trainer:', error);
    }
}

function setRequiredState(isRequired) {
    const fileIds = ['nttcFile', 'tmFile'];
    fileIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.required = isRequired;
    });

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
    const districtInput = document.getElementById('addrDistrict');
    const houseInput = document.getElementById('addrHouse');

    if (!provinceSelect || !citySelect || !barangaySelect) return;
    if (!phLocationData || Object.keys(phLocationData).length === 0) return;

    const parts = address.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length < 3) return;

    let house = '';
    let barangay = '';
    let district = '';
    let city = '';
    let province = '';

    if (parts.length >= 5) {
        [house, barangay, district, city, province] = parts;
    } else {
        [house, barangay, city, province] = parts;
    }

    if (houseInput && house) houseInput.value = house;
    if (districtInput && district) districtInput.value = district;

    if (province) {
        provinceSelect.value = province;
        provinceSelect.dispatchEvent(new Event('change'));
        setTimeout(() => {
            if (city) {
                citySelect.value = city;
                citySelect.dispatchEvent(new Event('change'));
                setTimeout(() => {
                    if (barangay) {
                        barangaySelect.value = barangay;
                    }
                }, 0);
            }
        }, 0);
    }
}
