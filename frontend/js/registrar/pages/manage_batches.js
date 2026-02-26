const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainees/';
let batchModal;
let viewBatchModal;
let viewTraineeModal;
let allQualifications = [];
let allTrainers = [];
let allScholarships = [];
let batchesData = [];
let currentBatchId = null;
let currentBatchName = null;
let closedBatchesModal;

document.addEventListener('DOMContentLoaded', function() {
    // Fix: Dynamically load SweetAlert2 if it's missing
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    batchModal = new bootstrap.Modal(document.getElementById('batchModal'));
    viewBatchModal = new bootstrap.Modal(document.getElementById('viewBatchModal'));
    viewTraineeModal = new bootstrap.Modal(document.getElementById('viewTraineeModal'));
    closedBatchesModal = new bootstrap.Modal(document.getElementById('closedBatchesModal'));

    loadInitialData();

    document.getElementById('addBatchForm').addEventListener('submit', saveBatch);
    document.getElementById('qualificationSelect').addEventListener('change', handleQualificationChange);
    const openClosedBtn = document.getElementById('openClosedBatches');
    if (openClosedBtn) {
        openClosedBtn.addEventListener('click', () => {
            if (closedBatchesModal) closedBatchesModal.show();
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
                qualSelect.innerHTML += `<option value="${q.qualification_id}">${q.course_name}</option>`;
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
            batchesData = response.data.data;
            const openBatches = batchesData.filter(b => b.status === 'open');
            const closedBatches = batchesData.filter(b => b.status === 'closed');
            renderBatchesTable(openBatches, 'batchesTableBody');
            renderBatchesTable(closedBatches, 'closedBatchesTableBody');
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

function renderBatchesTable(data, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No batches found</td></tr>';
        return;
    }

    data.forEach(batch => {
        const statusClass = batch.status === 'open' ? 'bg-success' : 'bg-secondary';
        tbody.innerHTML += `
            <tr>
                <td>${batch.batch_name}</td>
                <td>${batch.course_name || 'N/A'}</td>
                <td>${batch.trainer_name || 'N/A'}</td>
                <td>${batch.scholarship_type || 'None'}</td>
                <td>${batch.start_date}</td>
                <td>${batch.end_date}</td>
                <td>${batch.max_trainees || '25'}</td>
                <td><span class="badge ${statusClass}">${batch.status}</span></td>
                <td class="text-center">
                    <div class="d-flex justify-content-center gap-1 flex-wrap">
                        <button class="btn btn-sm btn-outline-primary" type="button" onclick="viewBatch(${batch.batch_id}, '${batch.batch_name}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" type="button" onclick="editBatch(${batch.batch_id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteBatch(${batch.batch_id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

window.openAddModal = function() {
    document.getElementById('addBatchForm').reset();
    document.getElementById('batchId').value = '';
    document.getElementById('batchModalLabel').textContent = 'Create New Batch';
    document.getElementById('submitBtn').textContent = 'Create Batch';
    document.getElementById('trainerSelect').innerHTML = '<option value="">Select Trainer</option>';
    document.getElementById('maxTrainees').value = '25';
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
        document.getElementById('scholarshipSelect').value = batch.scholarship_type_id;
        document.getElementById('startDate').value = batch.start_date;
        document.getElementById('endDate').value = batch.end_date;
        document.getElementById('maxTrainees').value = batch.max_trainees || 25;
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
    
    if (filtered.length === 0) {
        trainerSelect.innerHTML += '<option value="" disabled>No trainers available</option>';
    } else {
        filtered.forEach(t => {
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
        document.getElementById('batchName').value = qual ? `${qual.course_name} - Batch ${count}` : '';
    }
}

async function saveBatch(e) {
    e.preventDefault();
    const id = document.getElementById('batchId').value;
    const payload = {
        batch_id: id,
        batch_name: document.getElementById('batchName').value,
        qualification_id: document.getElementById('qualificationSelect').value,
        trainer_id: document.getElementById('trainerSelect').value,
        scholarship_type_id: document.getElementById('scholarshipSelect').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        max_trainees: document.getElementById('maxTrainees').value,
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

window.deleteBatch = async function(id) {
    if (typeof Swal === 'undefined') {
        alert('System is still loading resources (SweetAlert2). Please try again in a moment.');
        return;
    }

    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            const response = await axios.delete(`${API_BASE_URL}/role/registrar/batches.php?action=delete&id=${id}`);
            if (response.data.success) {
                Swal.fire(
                    'Deleted!',
                    'Batch deleted successfully.',
                    'success'
                );
                loadBatches();
            } else {
                Swal.fire('Error', 'Error: ' + response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting batch:', error);
            Swal.fire('Error', 'An error occurred while deleting the batch.', 'error');
        }
    }
}

window.viewBatch = async function(id, name) {
    currentBatchId = id;
    currentBatchName = name;
    document.getElementById('viewBatchTitle').textContent = name;
    const tbody = document.getElementById('batchTraineesBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    viewBatchModal.show();

    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/batches.php?action=get-trainees&batch_id=${id}`);
        tbody.innerHTML = '';
        
        if (response.data.success) {
            const trainees = response.data.data;
            if (trainees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No trainees enrolled in this batch.</td></tr>';
            } else {
                trainees.forEach(t => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${t.last_name}, ${t.first_name}</td>
                            <td>${t.email}</td>
                            <td>${t.phone_number || 'N/A'}</td>
                            <td><span class="badge bg-${t.status === 'active' ? 'success' : 'secondary'}">${t.status}</span></td>
                            <td>
                                <div class="d-flex gap-1">
                                    <button class="btn btn-sm btn-info text-white" onclick="viewTraineeDetails(${t.trainee_id})" title="View">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-secondary" onclick="openPrint(${t.trainee_id})" title="Print">
                                        <i class="fas fa-print"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${response.data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching batch trainees:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load trainees.</td></tr>';
    }
}

window.viewTraineeDetails = async function(id) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/batches.php?action=get-trainee-details&trainee_id=${id}`);
        if (response.data.success) {
            const t = response.data.data;
            
            // Helper to set text
            const setText = (eid, val) => {
                const el = document.getElementById(eid);
                if(el) el.textContent = val || 'N/A';
            };

            // Personal
            setText('detailName', `${t.first_name} ${t.last_name}`);
            setText('detailSex', t.sex);
            setText('detailCivilStatus', t.civil_status);
            setText('detailBirthdate', t.birthdate);
            setText('detailAge', t.age);
            setText('detailNationality', t.nationality);
            setText('detailBirthplace', [t.birthplace_city, t.birthplace_province].filter(Boolean).join(', '));

            // Contact
            setText('detailEmail', t.email);
            setText('detailPhone', t.phone_number);
            setText('detailFacebook', t.facebook_account);
            setText('detailAddress', [t.house_no_street, t.barangay, t.city_municipality, t.province].filter(Boolean).join(', '));

            // Background
            setText('detailEducation', t.educational_attainment);
            setText('detailEmploymentStatus', t.employment_status);
            setText('detailEmploymentType', t.employment_type);
            setText('detailClassification', t.learner_classification);
            setText('detailIsPwd', t.is_pwd == 1 ? 'Yes' : 'No');
            setText('detailDisabilityType', t.disability_type);
            setText('detailDisabilityCause', t.disability_cause);

            // Training
            setText('detailDuration', t.nominal_duration);
            setText('detailScholarship', t.scholarship_type);

            // Photo
            const photoImg = document.getElementById('detailPhoto');
            const noPhoto = document.getElementById('detailNoPhoto');
            if (t.photo_file) {
                photoImg.src = UPLOADS_URL + t.photo_file;
                photoImg.style.display = 'block';
                noPhoto.style.display = 'none';
            } else {
                photoImg.style.display = 'none';
                noPhoto.style.display = 'block';
            }

            // Docs
            const linkId = document.getElementById('detailLinkValidId');
            if(t.valid_id_file) {
                linkId.href = UPLOADS_URL + t.valid_id_file;
                linkId.classList.remove('disabled');
            } else {
                linkId.classList.add('disabled');
            }

            const linkBirth = document.getElementById('detailLinkBirthCert');
            if(t.birth_cert_file) {
                linkBirth.href = UPLOADS_URL + t.birth_cert_file;
                linkBirth.classList.remove('disabled');
            } else {
                linkBirth.classList.add('disabled');
            }

            // Signature
            const sigImg = document.getElementById('detailSignatureImg');
            const sigNo = document.getElementById('detailNoSignature');
            let sig = t.digital_signature || t.signature_file || t.signature || t.signature_image || '';
            if (sig) {
                // If it's likely a filename, prepend uploads URL; if full data URL or http(s) use as-is
                if (!sig.startsWith('data:') && !sig.startsWith('http')) {
                    sig = UPLOADS_URL + sig;
                }
                sigImg.src = sig;
                sigImg.style.display = 'block';
                sigNo.style.display = 'none';
            } else {
                sigImg.style.display = 'none';
                sigNo.style.display = 'block';
            }

            viewTraineeModal.show();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error fetching trainee details:', error);
        Swal.fire('Error', 'Failed to load trainee details.', 'error');
    }
}

window.openPrint = function(id) {
        // Generate PDF of registration form client-side to preserve layout
        (async function() {
                try {
                        const res = await axios.get(`/Hohoo-ville/api/role/trainer/trainee_details.php?trainee_id=${id}`);
                        if (!res.data.success) {
                                Swal.fire('Error', 'Failed to load trainee details: ' + (res.data.message || ''), 'error');
                                return;
                        }
                        const p = res.data.data.profile;

                        // Normalize signature and photo
                        const normalizeSrc = (val, folder) => {
                                if (!val) return '';
                                if (val.startsWith('data:') || val.startsWith('http')) return val;
                                return window.location.origin + `/hohoo-ville/uploads/${folder}/` + encodeURIComponent(val);
                        };
                        const sigSrc = normalizeSrc(p.digital_signature || '', 'trainees');
                        const photoSrc = normalizeSrc(p.photo_file || '', 'trainees');

                        const formatDate = (d) => {
                                if (!d) return '';
                                return new Date(d).toLocaleDateString();
                        };

                        const printable = document.createElement('div');
                        printable.style.padding = '20px';
                        printable.style.background = '#fff';
                        printable.innerHTML = `
                                <div style="width:100%; font-family: Arial, Helvetica, sans-serif; color:#222;">
                                    <div style="display:flex; align-items:center; justify-content:space-between;">
                                        <div>
                                            <h3 style="margin:0">Hohoo-Ville Technical School</h3>
                                            <div>Application / Registration Form</div>
                                        </div>
                                        <div>${photoSrc ? `<img src="${photoSrc}" style="max-width:110px; border:1px solid #e9ecef; padding:4px; background:#fff;"/>` : ''}</div>
                                    </div>

                                    <hr />

                                    <h4 style="color:#0d6efd; margin-bottom:6px">1. Personal Information</h4>
                                    <div style="display:flex; gap:12px;">
                                        <div style="flex:1"><strong>Last Name</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.last_name || ''}</div></div>
                                        <div style="flex:1"><strong>First Name</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.first_name || ''}</div></div>
                                        <div style="flex:1"><strong>Middle Name</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.middle_name || ''}</div></div>
                                        <div style="width:80px"><strong>Ext</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.extension_name || ''}</div></div>
                                    </div>

                                    <div style="display:flex; gap:12px; margin-top:8px;">
                                        <div style="flex:1"><strong>Sex</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.sex || ''}</div></div>
                                        <div style="flex:1"><strong>Civil Status</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.civil_status || ''}</div></div>
                                        <div style="flex:1"><strong>Birthdate</strong><div style="border-bottom:1px solid #000; min-height:20px">${formatDate(p.birthdate)}</div></div>
                                        <div style="flex:1"><strong>Age</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.age || ''}</div></div>
                                    </div>

                                    <h4 style="color:#0d6efd; margin-top:14px; margin-bottom:6px">2. Contact & Address</h4>
                                    <div style="display:flex; gap:12px; margin-bottom:6px;">
                                        <div style="flex:2"><strong>House No./Street</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.house_no_street || ''}</div></div>
                                        <div style="flex:1"><strong>Barangay</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.barangay || ''}</div></div>
                                        <div style="flex:1"><strong>City/Municipality</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.city_municipality || ''}</div></div>
                                    </div>

                                    <div style="display:flex; gap:12px; margin-bottom:6px;">
                                        <div style="flex:1"><strong>Province</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.province || ''}</div></div>
                                        <div style="flex:1"><strong>Region</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.region || ''}</div></div>
                                        <div style="flex:1"><strong>Contact Number</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.phone_number || ''}</div></div>
                                    </div>

                                    <h4 style="color:#0d6efd; margin-top:14px; margin-bottom:6px">3. Course / Training Details</h4>
                                    <div style="display:flex; gap:12px; margin-bottom:6px;">
                                        <div style="flex:1"><strong>Qualification / Course</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.course_name || ''}</div></div>
                                        <div style="flex:1"><strong>Batch</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.batch_name || ''}</div></div>
                                        <div style="flex:1"><strong>Scholarship</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.scholarship_type || ''}</div></div>
                                    </div>

                                    <h4 style="color:#0d6efd; margin-top:14px; margin-bottom:6px">4. Education & Employment</h4>
                                    <div style="display:flex; gap:12px; margin-bottom:6px;">
                                        <div style="flex:1"><strong>Educational Attainment</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.educational_attainment || ''}</div></div>
                                        <div style="flex:1"><strong>Employment Status</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.employment_status || ''}</div></div>
                                        <div style="flex:1"><strong>Employment Type</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.employment_type || ''}</div></div>
                                    </div>

                                    <h4 style="color:#0d6efd; margin-top:14px; margin-bottom:6px">5. Requirements</h4>
                                    <div style="display:flex; gap:12px; margin-bottom:6px;">
                                        <div style="flex:1"><strong>Valid ID</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.valid_id_file ? 'Attached' : 'N/A'}</div></div>
                                        <div style="flex:1"><strong>Birth Certificate</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.birth_cert_file ? 'Attached' : 'N/A'}</div></div>
                                        <div style="flex:1"><strong>Photo</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.photo_file ? 'Attached' : 'N/A'}</div></div>
                                    </div>

                                    <h4 style="color:#0d6efd; margin-top:14px; margin-bottom:6px">6. Privacy Consent & Declaration</h4>
                                    <div style="margin-bottom:8px; border-bottom:1px solid #000; padding-bottom:6px">Privacy consent: ${p.privacy_consent ? 'Yes' : 'No'}</div>

                                    <h4 style="color:#0d6efd; margin-top:14px; margin-bottom:6px">7. Signature</h4>
                                    <div style="display:flex; gap:12px; align-items:flex-start;">
                                        <div style="flex:1">${sigSrc ? `<img src="${sigSrc}" style="max-width:150px; max-height:80px; border:1px solid #e9ecef; padding:4px; background:#fff;"/>` : '<div style="border-bottom:1px solid #000; min-height:40px; width:150px;"></div>'}</div>
                                        <div style="width:180px; text-align:left">
                                            <strong>Date Submitted</strong>
                                            <div style="border-bottom:1px solid #000; min-height:20px">${formatDate(p.enrollment_date)}</div>
                                        </div>
                                    </div>
                                </div>
                        `;

                        document.body.appendChild(printable);

                        // load html2pdf if not available
                        if (typeof html2pdf === 'undefined') {
                                await new Promise((resolve, reject) => {
                                        const s = document.createElement('script');
                                        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js';
                                        s.onload = resolve; s.onerror = reject;
                                        document.head.appendChild(s);
                                });
                        }

                        const opt = {
                                margin:       10,
                                filename:     `registration_${id}.pdf`,
                                image:        { type: 'jpeg', quality: 0.98 },
                                html2canvas:  { scale: 2, useCORS: true },
                                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                        };

                        await html2pdf().set(opt).from(printable).save();

                        // cleanup
                        printable.remove();
                } catch (err) {
                        console.error(err);
                        Swal.fire('Error', 'Failed to generate PDF. See console for details.', 'error');
                }
        })();
}

window.downloadAllApplications = function() {
        if (!currentBatchId) {
                Swal.fire('Warning', 'No batch selected.', 'warning');
                return;
        }

        // Show loading indicator
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Generating...';

        (async function() {
                try {
                        // Fetch all trainees in the batch
                        const res = await axios.get(`${API_BASE_URL}/role/registrar/batches.php?action=get-trainees&batch_id=${currentBatchId}`);
                        
                        if (!res.data.success || !res.data.data) {
                                Swal.fire('Error', 'Failed to fetch trainees: ' + (res.data.message || 'Unknown error'), 'error');
                                btn.disabled = false;
                                btn.innerHTML = originalText;
                                return;
                        }

                        const trainees = res.data.data;
                        if (trainees.length === 0) {
                                Swal.fire('Info', 'No trainees in this batch.', 'info');
                                btn.disabled = false;
                                btn.innerHTML = originalText;
                                return;
                        }

                        // Load html2pdf if not available
                        if (typeof html2pdf === 'undefined') {
                                await new Promise((resolve, reject) => {
                                        const s = document.createElement('script');
                                        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js';
                                        s.onload = resolve;
                                        s.onerror = reject;
                                        document.head.appendChild(s);
                                });
                        }

                        // Create combined container
                        const combinedContainer = document.createElement('div');

                        // Helper function to normalize image sources
                        const normalizeSrc = (val, folder) => {
                                if (!val) return '';
                                if (val.startsWith('data:') || val.startsWith('http')) return val;
                                return window.location.origin + `/hohoo-ville/uploads/${folder}/` + encodeURIComponent(val);
                        };

                        const formatDate = (d) => {
                                if (!d) return '';
                                return new Date(d).toLocaleDateString();
                        };

                        // Generate form for each trainee
                        let pageCount = 0;
                        for (let i = 0; i < trainees.length; i++) {
                                const t = trainees[i];
                                
                                // Fetch detailed trainee data
                                try {
                                        const detailRes = await axios.get(`/Hohoo-ville/api/role/trainer/trainee_details.php?trainee_id=${t.trainee_id}`);
                                        if (!detailRes.data.success) continue;
                                        
                                        const p = detailRes.data.data.profile;
                                        const sigSrc = normalizeSrc(p.digital_signature || '', 'trainees');
                                        const photoSrc = normalizeSrc(p.photo_file || '', 'trainees');

                                        const formDiv = document.createElement('div');
                                        formDiv.style.padding = '20px';
                                        formDiv.style.background = '#fff';
                                        formDiv.style.pageBreakAfter = 'always';
                                        formDiv.innerHTML = `
                                                <div style="width:100%; font-family: Arial, Helvetica, sans-serif; color:#222;">
                                                    <div style="display:flex; align-items:center; justify-content:space-between;">
                                                        <div>
                                                            <h3 style="margin:0">Hohoo-Ville Technical School</h3>
                                                            <div>Application / Registration Form</div>
                                                        </div>
                                                        <div>${photoSrc ? `<img src="${photoSrc}" style="max-width:110px; border:1px solid #e9ecef; padding:4px; background:#fff;"/>` : ''}</div>
                                                    </div>

                                                    <hr />

                                                    <h4 style="color:#0d6efd; margin-bottom:6px">1. Personal Information</h4>
                                                    <div style="display:flex; gap:12px;">
                                                        <div style="flex:1"><strong>Last Name</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.last_name || ''}</div></div>
                                                        <div style="flex:1"><strong>First Name</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.first_name || ''}</div></div>
                                                        <div style="flex:1"><strong>Middle Name</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.middle_name || ''}</div></div>
                                                        <div style="width:80px"><strong>Ext</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.extension_name || ''}</div></div>
                                                    </div>

                                                    <div style="display:flex; gap:12px; margin-top:8px;">
                                                        <div style="flex:1"><strong>Sex</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.sex || ''}</div></div>
                                                        <div style="flex:1"><strong>Civil Status</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.civil_status || ''}</div></div>
                                                        <div style="flex:1"><strong>Birthdate</strong><div style="border-bottom:1px solid #000; min-height:20px">${formatDate(p.birthdate)}</div></div>
                                                        <div style="flex:1"><strong>Age</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.age || ''}</div></div>
                                                    </div>

                                                    <h4 style="color:#0d6efd; margin-top:14px; margin-bottom:6px">2. Contact & Address</h4>
                                                    <div style="display:flex; gap:12px; margin-bottom:6px;">
                                                        <div style="flex:2"><strong>House No./Street</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.house_no_street || ''}</div></div>
                                                        <div style="flex:1"><strong>Barangay</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.barangay || ''}</div></div>
                                                        <div style="flex:1"><strong>City/Municipality</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.city_municipality || ''}</div></div>
                                                    </div>

                                                    <div style="display:flex; gap:12px; margin-bottom:6px;">
                                                        <div style="flex:1"><strong>Province</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.province || ''}</div></div>
                                                        <div style="flex:1"><strong>Region</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.region || ''}</div></div>
                                                        <div style="flex:1"><strong>Contact Number</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.phone_number || ''}</div></div>
                                                    </div>

                                                    <h4 style="color:#0d6efd; margin-top:14px; margin-bottom:6px">3. Course / Training Details</h4>
                                                    <div style="display:flex; gap:12px; margin-bottom:6px;">
                                                        <div style="flex:1"><strong>Qualification / Course</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.course_name || ''}</div></div>
                                                        <div style="flex:1"><strong>Batch</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.batch_name || ''}</div></div>
                                                        <div style="flex:1"><strong>Scholarship</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.scholarship_type || ''}</div></div>
                                                    </div>

                                                    <h4 style="color:#0d6efd; margin-top:14px; margin-bottom:6px">4. Education & Employment</h4>
                                                    <div style="display:flex; gap:12px; margin-bottom:6px;">
                                                        <div style="flex:1"><strong>Educational Attainment</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.educational_attainment || ''}</div></div>
                                                        <div style="flex:1"><strong>Employment Status</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.employment_status || ''}</div></div>
                                                        <div style="flex:1"><strong>Employment Type</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.employment_type || ''}</div></div>
                                                    </div>

                                                    <h4 style="color:#0d6efd; margin-top:14px; margin-bottom:6px">5. Requirements</h4>
                                                    <div style="display:flex; gap:12px; margin-bottom:6px;">
                                                        <div style="flex:1"><strong>Valid ID</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.valid_id_file ? 'Attached' : 'N/A'}</div></div>
                                                        <div style="flex:1"><strong>Birth Certificate</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.birth_cert_file ? 'Attached' : 'N/A'}</div></div>
                                                        <div style="flex:1"><strong>Photo</strong><div style="border-bottom:1px solid #000; min-height:20px">${p.photo_file ? 'Attached' : 'N/A'}</div></div>
                                                    </div>

                                                    <h4 style="color:#0d6efd; margin-top:14px; margin-bottom:6px">6. Privacy Consent & Declaration</h4>
                                                    <div style="margin-bottom:8px; border-bottom:1px solid #000; padding-bottom:6px">Privacy consent: ${p.privacy_consent ? 'Yes' : 'No'}</div>

                                                    <h4 style="color:#0d6efd; margin-top:14px; margin-bottom:6px">7. Signature</h4>
                                                    <div style="display:flex; gap:12px; align-items:flex-start;">
                                                        <div style="flex:1">${sigSrc ? `<img src="${sigSrc}" style="max-width:150px; max-height:80px; border:1px solid #e9ecef; padding:4px; background:#fff;"/>` : '<div style="border-bottom:1px solid #000; min-height:40px; width:150px;"></div>'}</div>
                                                        <div style="width:180px; text-align:left">
                                                            <strong>Date Submitted</strong>
                                                            <div style="border-bottom:1px solid #000; min-height:20px">${formatDate(p.enrollment_date)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                        `;
                                        combinedContainer.appendChild(formDiv);
                                        pageCount++;
                                } catch (err) {
                                        console.warn(`Failed to fetch details for trainee ${t.trainee_id}`, err);
                                }
                        }

                        if (pageCount === 0) {
                                Swal.fire('Error', 'Failed to generate any application forms.', 'error');
                                btn.disabled = false;
                                btn.innerHTML = originalText;
                                return;
                        }

                        document.body.appendChild(combinedContainer);

                        const opt = {
                                margin:       10,
                                filename:     `${currentBatchName}_all_applications.pdf`,
                                image:        { type: 'jpeg', quality: 0.98 },
                                html2canvas:  { scale: 2, useCORS: true },
                                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                        };

                        await html2pdf().set(opt).from(combinedContainer).save();

                        // cleanup
                        combinedContainer.remove();
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                        Swal.fire('Success', `Successfully downloaded ${pageCount} application forms!`, 'success');
                } catch (err) {
                        console.error(err);
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                        Swal.fire('Error', 'Failed to generate PDF. See console for details.', 'error');
                }
        })();
}
