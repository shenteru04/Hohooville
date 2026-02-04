// API Configuration
const API_BASE_URL = 'http://localhost/hohoo-ville/api';
const UPLOADS_URL = 'http://localhost/hohoo-ville/uploads/trainees/';

// Global variable to store batches for editing
let currentBatches = [];
let batchModal;
let viewBatchModal;
let viewTraineeModal;

// Axios Instance Configuration
let apiClient;

function initApiClient() {
    apiClient = axios.create({
        baseURL: API_BASE_URL,
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

function initializePage() {
    initApiClient();
    loadFormData();
    loadQualifications();
    loadBatches();
    
    const addBatchForm = document.getElementById('addBatchForm');
    if (addBatchForm) {
        addBatchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const batchId = this.dataset.id;
            if (batchId) {
                updateBatch(batchId);
            } else {
                addBatch();
            }
        });
    }

    const batchModalEl = document.getElementById('viewBatchModal');
    if (batchModalEl) viewBatchModal = new bootstrap.Modal(batchModalEl);
    
    const traineeModalEl = document.getElementById('viewTraineeModal');
    if (traineeModalEl) viewTraineeModal = new bootstrap.Modal(traineeModalEl);

    const addBatchModalEl = document.getElementById('batchModal');
    if (addBatchModalEl) batchModal = new bootstrap.Modal(addBatchModalEl);
}

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

async function loadQualifications() {
    try {
        const response = await apiClient.get('/role/registrar/qualifications.php?action=list');
        if (response.data.success) {
            const qualificationSelect = document.getElementById('qualificationSelect');
            if (qualificationSelect) {
                qualificationSelect.innerHTML = '<option value="">Select Qualification</option>';
                // Only show active qualifications
                const activeQualifications = response.data.data.filter(q => q.status === 'active');
                activeQualifications.forEach(q => {
                    qualificationSelect.innerHTML += `<option value="${q.course_id}">${q.course_name}</option>`;
                });
            }
        } else {
            alert('Error loading qualifications: ' + (response.data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading qualifications:', error);
    }
}

async function loadFormData() {
    try {
        const response = await apiClient.get('/role/registrar/batches.php?action=get-form-data');
        if (response.data.success) {
            const { trainers, scholarships } = response.data.data;
            
            const trainerSelect = document.getElementById('trainerSelect');
            trainerSelect.innerHTML = '<option value="">Select Trainer</option>';
            trainers.forEach(t => {
                trainerSelect.innerHTML += `<option value="${t.trainer_id}">${t.first_name} ${t.last_name}</option>`;
            });

            const scholarshipSelect = document.getElementById('scholarshipSelect');
            scholarshipSelect.innerHTML = '<option value="">None</option>';
            scholarships.forEach(s => {
                scholarshipSelect.innerHTML += `<option value="${s}">${s}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading form data:', error);
    }
}

async function loadBatches() {
    try {
        const response = await apiClient.get('/role/registrar/batches.php?action=list');
        if (response.data.success) {
            renderBatchesTable(response.data.data);
        } else {
            alert('Error loading batches: ' + (response.data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

function renderBatchesTable(data) {
    console.log('Batches Data:', data); // Debug: Check if course_id and course_name are returned
    currentBatches = data; // Store data for edit functionality
    const tbody = document.getElementById('batchesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    data.forEach(batch => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${batch.batch_id}</td>
            <td>${batch.batch_name}</td>
            <td>${batch.course_name || 'N/A'}</td>
            <td>${batch.trainer_name || 'Unassigned'}</td>
            <td>${batch.scholarship_type || 'None'}</td>
            <td>${batch.start_date}</td>
            <td>${batch.end_date}</td>
            <td>${batch.status}</td>
            <td>
                <button class="btn btn-info btn-sm text-white" onclick="viewBatchTrainees(${batch.batch_id})" title="View Trainees"><i class="fas fa-eye"></i></button>
                <button class="btn btn-warning btn-sm" onclick="editBatch(${batch.batch_id})" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteBatch(${batch.batch_id})" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addBatch() {
    const data = {
        course_id: document.getElementById('qualificationSelect').value,
        batch_name: document.getElementById('batchName').value,
        trainer_id: document.getElementById('trainerSelect').value,
        scholarship_type: document.getElementById('scholarshipSelect').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        status: document.getElementById('status').value
    };

    if (!data.course_id) {
        alert('Please select a qualification.');
        return;
    }

    try {
        const response = await apiClient.post('/role/registrar/batches.php?action=add', data);
        if (response.data.success) {
            alert('Batch added successfully');
            batchModal.hide();
            resetForm();
            loadBatches();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error adding batch:', error);
        alert('Error adding batch');
    }
}

async function updateBatch(id) {
    const data = {
        batch_id: id,
        course_id: document.getElementById('qualificationSelect').value,
        batch_name: document.getElementById('batchName').value,
        trainer_id: document.getElementById('trainerSelect').value,
        scholarship_type: document.getElementById('scholarshipSelect').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        status: document.getElementById('status').value
    };

    if (!data.course_id) {
        alert('Please select a qualification.');
        return;
    }

    try {
        const response = await apiClient.post('/role/registrar/batches.php?action=update', data);
        if (response.data.success) {
            alert('Batch updated successfully');
            batchModal.hide();
            resetForm();
            loadBatches();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error updating batch:', error);
        alert('Error updating batch');
    }
}

async function deleteBatch(id) {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    
    try {
        const response = await apiClient.delete(`/role/registrar/batches.php?action=delete&id=${id}`);
        if (response.data.success) {
            alert('Batch deleted successfully');
            loadBatches();
        } else {
            alert('Error deleting batch');
        }
    } catch (error) {
        console.error('Error deleting batch:', error);
        alert('Error deleting batch');
    }
}

window.openAddModal = function() {
    resetForm();
    document.getElementById('batchModalLabel').textContent = 'Create New Batch';
    document.getElementById('submitBtn').textContent = 'Create Batch';
    batchModal.show();
}

window.editBatch = function(id) {
    const batch = currentBatches.find(b => b.batch_id == id);
    if (!batch) return;

    const form = document.getElementById('addBatchForm');
    if (!form) return;

    document.getElementById('qualificationSelect').value = batch.course_id || '';
    document.getElementById('batchName').value = batch.batch_name;
    document.getElementById('trainerSelect').value = batch.trainer_id || '';
    document.getElementById('scholarshipSelect').value = batch.scholarship_type || '';
    document.getElementById('startDate').value = batch.start_date;
    document.getElementById('endDate').value = batch.end_date;
    document.getElementById('status').value = batch.status;
    
    form.dataset.id = id;
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.textContent = 'Update Batch';
    
    document.getElementById('batchModalLabel').textContent = 'Edit Batch';
    batchModal.show();
}

window.resetForm = function() {
    const form = document.getElementById('addBatchForm');
    if (form) {
        form.reset();
        delete form.dataset.id;
    }
    
    document.getElementById('submitBtn').textContent = 'Create Batch';
    document.getElementById('batchModalLabel').textContent = 'Create New Batch';
}

window.viewBatchTrainees = async function(batchId) {
    try {
        const response = await apiClient.get(`/role/registrar/batches.php?action=get-trainees&batch_id=${batchId}`);
        if (response.data.success) {
            const tbody = document.getElementById('batchTraineesBody');
            tbody.innerHTML = '';
            
            if (response.data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No trainees found in this batch.</td></tr>';
            } else {
                response.data.data.forEach(t => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${t.first_name} ${t.last_name}</td>
                            <td>${t.email}</td>
                            <td>${t.phone_number || 'N/A'}</td>
                            <td><span class="badge bg-${t.enrollment_status === 'approved' ? 'success' : 'warning'}">${t.enrollment_status}</span></td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="viewTraineeDetails(${t.trainee_id})">
                                    <i class="fas fa-user"></i> Details
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            viewBatchModal.show();
        } else {
            alert('Error loading trainees: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load trainees');
    }
}

window.viewTraineeDetails = async function(traineeId) {
    try {
        const response = await apiClient.get(`/role/registrar/batches.php?action=get-trainee-details&trainee_id=${traineeId}`);
        if (response.data.success) {
            const t = response.data.data;
            
            // Personal Info
            document.getElementById('detailName').textContent = `${t.first_name} ${t.middle_name || ''} ${t.last_name} ${t.extension_name || ''}`;
            document.getElementById('detailSex').textContent = t.sex || 'N/A';
            document.getElementById('detailCivilStatus').textContent = t.civil_status || 'N/A';
            document.getElementById('detailBirthdate').textContent = t.birthdate || 'N/A';
            document.getElementById('detailAge').textContent = t.age || 'N/A';
            document.getElementById('detailNationality').textContent = t.nationality || 'N/A';
            document.getElementById('detailBirthplace').textContent = `${t.birthplace_city || ''}, ${t.birthplace_province || ''}, ${t.birthplace_region || ''}`;

            // Contact & Address
            document.getElementById('detailEmail').textContent = t.email;
            document.getElementById('detailPhone').textContent = t.phone_number || 'N/A';
            document.getElementById('detailFacebook').textContent = t.facebook_account || 'N/A';
            document.getElementById('detailAddress').textContent = `${t.house_no_street || ''}, ${t.barangay || ''}, ${t.district || ''}, ${t.city_municipality || ''}, ${t.province || ''}, ${t.region || ''}`;

            // Background
            document.getElementById('detailEducation').textContent = t.educational_attainment || 'N/A';
            document.getElementById('detailEmploymentStatus').textContent = t.employment_status || 'N/A';
            document.getElementById('detailEmploymentType').textContent = t.employment_type || 'N/A';
            document.getElementById('detailClassification').textContent = t.learner_classification ? t.learner_classification.split(',').join(', ') : 'N/A';
            
            document.getElementById('detailIsPwd').textContent = t.is_pwd == 1 ? 'Yes' : 'No';
            document.getElementById('detailDisabilityType').textContent = t.disability_type || 'N/A';
            document.getElementById('detailDisabilityCause').textContent = t.disability_cause || 'N/A';

            // Training & Docs
            document.getElementById('detailDuration').textContent = t.nominal_duration || 'N/A';
            document.getElementById('detailScholarship').textContent = t.scholarship_type || 'N/A';
            
            const linkValidId = document.getElementById('detailLinkValidId');
            linkValidId.href = t.valid_id_file ? UPLOADS_URL + encodeURIComponent(t.valid_id_file) : '#';
            
            const linkBirthCert = document.getElementById('detailLinkBirthCert');
            linkBirthCert.href = t.birth_cert_file ? UPLOADS_URL + encodeURIComponent(t.birth_cert_file) : '#';
            
            const photo = document.getElementById('detailPhoto');
            const noPhoto = document.getElementById('detailNoPhoto');
            
            if (t.photo_file) {
                photo.src = UPLOADS_URL + encodeURIComponent(t.photo_file);
                photo.style.display = 'block';
                noPhoto.style.display = 'none';
            } else {
                photo.style.display = 'none';
                noPhoto.style.display = 'block';
            }
            
            viewTraineeModal.show();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load details');
    }
}