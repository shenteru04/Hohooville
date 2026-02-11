const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainees/';
let batchModal;
let viewBatchModal;
let viewTraineeModal;
let allQualifications = [];
let allTrainers = [];
let allScholarships = [];

document.addEventListener('DOMContentLoaded', function() {
    batchModal = new bootstrap.Modal(document.getElementById('batchModal'));
    viewBatchModal = new bootstrap.Modal(document.getElementById('viewBatchModal'));
    viewTraineeModal = new bootstrap.Modal(document.getElementById('viewTraineeModal'));

    loadInitialData();

    document.getElementById('addBatchForm').addEventListener('submit', saveBatch);

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
            allTrainers = formDataResponse.data.data.trainers;
            allScholarships = formDataResponse.data.data.scholarships;

            const trainerSelect = document.getElementById('trainerSelect');
            trainerSelect.innerHTML = '<option value="">Select Trainer</option>';
            allTrainers.forEach(t => {
                trainerSelect.innerHTML += `<option value="${t.trainer_id}">${t.first_name} ${t.last_name}</option>`;
            });

            const scholarshipSelect = document.getElementById('scholarshipSelect');
            scholarshipSelect.innerHTML = '<option value="">None</option>';
            allScholarships.forEach(s => {
                scholarshipSelect.innerHTML += `<option value="${s}">${s}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading form data:', error);
    }
}

async function loadBatches() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/batches.php?action=list`);
        const tbody = document.getElementById('batchesTableBody');
        tbody.innerHTML = '';
        if (response.data.success) {
            response.data.data.forEach(batch => {
                const statusClass = batch.status === 'open' ? 'bg-success' : 'bg-secondary';
                tbody.innerHTML += `
                    <tr>
                        <td>${batch.batch_id}</td>
                        <td>${batch.batch_name}</td>
                        <td>${batch.course_name || 'N/A'}</td>
                        <td>${batch.trainer_name || 'N/A'}</td>
                        <td>${batch.scholarship_type || 'None'}</td>
                        <td>${batch.start_date}</td>
                        <td>${batch.end_date}</td>
                        <td><span class="badge ${statusClass}">${batch.status}</span></td>
                        <td class="text-center">
                            <div class="d-flex justify-content-center gap-1">
                                <button class="btn btn-sm btn-outline-info" onclick="viewBatch(${batch.batch_id}, '${batch.batch_name}')" title="View"><i class="fas fa-eye"></i></button>
                                <button class="btn btn-sm btn-outline-primary" onclick="editBatch(${batch.batch_id})" title="Edit"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteBatch(${batch.batch_id})" title="Delete"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

window.openAddModal = function() {
    document.getElementById('addBatchForm').reset();
    document.getElementById('batchId').value = '';
    document.getElementById('batchModalLabel').textContent = 'Create New Batch';
    document.getElementById('submitBtn').textContent = 'Create Batch';
    batchModal.show();
}

window.editBatch = async function(id) {
    const response = await axios.get(`${API_BASE_URL}/role/registrar/batches.php?action=list`);
    const batch = response.data.data.find(b => b.batch_id == id);

    if (batch) {
        document.getElementById('batchId').value = batch.batch_id;
        document.getElementById('batchName').value = batch.batch_name;
        document.getElementById('qualificationSelect').value = batch.qualification_id;
        document.getElementById('trainerSelect').value = batch.trainer_id;
        document.getElementById('scholarshipSelect').value = batch.scholarship_type;
        document.getElementById('startDate').value = batch.start_date;
        document.getElementById('endDate').value = batch.end_date;
        document.getElementById('status').value = batch.status;
        
        document.getElementById('batchModalLabel').textContent = 'Edit Batch';
        document.getElementById('submitBtn').textContent = 'Save Changes';
        batchModal.show();
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
        scholarship_type: document.getElementById('scholarshipSelect').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        status: document.getElementById('status').value
    };

    const action = id ? 'update' : 'add';

    try {
        const response = await axios.post(`${API_BASE_URL}/role/registrar/batches.php?action=${action}`, payload);
        if (response.data.success) {
            alert(`Batch ${id ? 'updated' : 'added'} successfully!`);
            batchModal.hide();
            loadBatches();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error saving batch:', error);
    }
}

window.deleteBatch = async function(id) {
    if (!confirm('Are you sure you want to delete this batch?')) return;

    try {
        const response = await axios.delete(`${API_BASE_URL}/role/registrar/batches.php?action=delete&id=${id}`);
        if (response.data.success) {
            alert('Batch deleted successfully.');
            loadBatches();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error deleting batch:', error);
    }
}

window.viewBatch = async function(id, name) {
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
                                <button class="btn btn-sm btn-info text-white" onclick="viewTraineeDetails(${t.trainee_id})">
                                    <i class="fas fa-eye"></i> View
                                </button>
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

            viewTraineeModal.show();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error fetching trainee details:', error);
        alert('Failed to load trainee details.');
    }
}