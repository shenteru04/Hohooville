const API_BASE_URL = 'http://localhost/hohoo-ville/api';
const UPLOADS_URL = 'http://localhost/hohoo-ville/uploads/trainees/';

let accountModal;
let profileModal;
let traineesData = [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Modals
    accountModal = new bootstrap.Modal(document.getElementById('createAccountModal'));
    profileModal = new bootstrap.Modal(document.getElementById('viewProfileModal'));

    loadTrainees();

    // Search & Filter
    document.getElementById('searchBtn').addEventListener('click', loadTrainees);

    // Create Account Form Submission
    document.getElementById('createAccountForm').addEventListener('submit', handleCreateAccount);
});

async function loadTrainees() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainees.php?action=list`);
        if (response.data.success) {
            traineesData = response.data.data;
            renderTraineesTable(traineesData);
        } else {
            alert('Error loading trainees: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error loading trainees:', error);
    }
}

function renderTraineesTable(data) {
    const tbody = document.getElementById('traineesTableBody');
    tbody.innerHTML = '';

    const search = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    const filtered = data.filter(t => {
        const name = (t.first_name + ' ' + t.last_name).toLowerCase();
        const matchesSearch = name.includes(search) || t.email.toLowerCase().includes(search);
        const matchesStatus = statusFilter ? t.status === statusFilter : true;
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No trainees found</td></tr>';
        return;
    }
    
    filtered.forEach(trainee => {
        // Account Button Logic
        let accountBtn = '';
        if (!trainee.user_id) {
            accountBtn = `<button class="btn btn-sm btn-outline-primary me-1" onclick="openAccountModal(${trainee.trainee_id})" title="Create Account">
                            <i class="fas fa-key"></i>
                          </button>`;
        } else {
            accountBtn = `<span class="badge bg-success me-1" title="Account Active"><i class="fas fa-check"></i></span>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${trainee.trainee_id}</td>
            <td>${trainee.last_name}, ${trainee.first_name}</td>
            <td>${trainee.email}</td>
            <td>${trainee.phone_number || '-'}</td>
            <td>${trainee.batch_name || '<span class="text-muted">Not Enrolled</span>'}</td>
            <td><span class="badge bg-${trainee.status === 'active' ? 'success' : 'secondary'}">${trainee.status}</span></td>
            <td>
                ${accountBtn}
                <button class="btn btn-sm btn-info text-white me-1" onclick="viewProfile(${trainee.trainee_id})" title="View Profile">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteTrainee(${trainee.trainee_id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.openAccountModal = function(id) {
    document.getElementById('accountTraineeId').value = id;
    document.getElementById('createAccountForm').reset();
    accountModal.show();
};

async function handleCreateAccount(e) {
    e.preventDefault();
    const data = {
        trainee_id: document.getElementById('accountTraineeId').value,
        username: document.getElementById('accountUsername').value,
        password: document.getElementById('accountPassword').value
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/admin/trainees.php?action=create-account`, data);
        if (response.data.success) {
            alert('Account created successfully!');
            accountModal.hide();
            loadTrainees();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error creating account:', error);
        let errorMsg = 'Failed to create account';
        if (error.response && error.response.data && error.response.data.message) {
            errorMsg += ': ' + error.response.data.message;
        }
        alert(errorMsg);
    }
}

window.viewProfile = function(id) {
    const t = traineesData.find(item => item.trainee_id == id);
    if (!t) return;

    document.getElementById('viewName').textContent = `${t.first_name} ${t.last_name}`;
    document.getElementById('viewEmail').textContent = t.email;
    document.getElementById('viewPhone').textContent = t.phone_number || 'N/A';
    document.getElementById('viewAddress').textContent = t.address || 'N/A';
    document.getElementById('viewBatch').textContent = t.batch_name || 'Not Enrolled';
    
    const statusBadge = document.getElementById('viewStatus');
    statusBadge.textContent = t.status.toUpperCase();
    statusBadge.className = `badge bg-${t.status === 'active' ? 'success' : 'secondary'}`;

    // Handle Photo
    const photoImg = document.getElementById('viewPhoto');
    const noPhoto = document.getElementById('noPhoto');
    if (t.photo_file) {
        photoImg.src = UPLOADS_URL + encodeURIComponent(t.photo_file);
        photoImg.style.display = 'block';
        noPhoto.style.display = 'none';
    } else {
        photoImg.style.display = 'none';
        noPhoto.style.display = 'block';
    }

    // Handle Documents
    const validIdLink = document.getElementById('viewValidId');
    if (t.valid_id_file) {
        validIdLink.href = UPLOADS_URL + encodeURIComponent(t.valid_id_file);
        validIdLink.classList.remove('disabled');
        validIdLink.innerHTML = `<i class="fas fa-id-card me-2"></i> Valid ID (Click to View)`;
    } else {
        validIdLink.href = '#';
        validIdLink.classList.add('disabled');
        validIdLink.innerHTML = `<i class="fas fa-id-card me-2"></i> Valid ID (Not Uploaded)`;
    }

    const birthCertLink = document.getElementById('viewBirthCert');
    if (t.birth_cert_file) {
        birthCertLink.href = UPLOADS_URL + encodeURIComponent(t.birth_cert_file);
        birthCertLink.classList.remove('disabled');
        birthCertLink.innerHTML = `<i class="fas fa-file-alt me-2"></i> Birth Certificate (Click to View)`;
    } else {
        birthCertLink.href = '#';
        birthCertLink.classList.add('disabled');
        birthCertLink.innerHTML = `<i class="fas fa-file-alt me-2"></i> Birth Certificate (Not Uploaded)`;
    }

    profileModal.show();
};

window.deleteTrainee = async function(id) {
    if (!confirm('Are you sure you want to delete this trainee? This action cannot be undone.')) return;
    
    try {
        const response = await axios.delete(`${API_BASE_URL}/role/admin/trainees.php?action=delete&id=${id}`);
        if (response.data.success) {
            alert('Trainee deleted successfully');
            loadTrainees();
        } else {
            alert('Error deleting trainee');
        }
    } catch (error) {
        console.error('Error deleting trainee:', error);
        alert('Error deleting trainee');
    }
};