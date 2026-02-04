const API_BASE_URL = 'http://localhost/hohoo-ville/api';
let accountModal, editModal;
let trainersData = [];

document.addEventListener('DOMContentLoaded', function() {
    accountModal = new bootstrap.Modal(document.getElementById('accountModal'));
    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    
    loadTrainers();

    document.getElementById('accountForm').addEventListener('submit', handleCreateAccount);
    document.getElementById('editForm').addEventListener('submit', handleUpdateTrainer);
});

async function loadTrainers() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainers.php?action=list`);
        if (response.data.success) {
            trainersData = response.data.data;
            renderTable(trainersData);
        }
    } catch (error) {
        console.error('Error loading trainers:', error);
    }
}

function renderTable(data) {
    const tbody = document.getElementById('trainersTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No trainers found</td></tr>';
        return;
    }

    data.forEach(t => {
        let accountBtn = '';
        if (!t.user_id) {
            accountBtn = `<button class="btn btn-sm btn-outline-primary me-1" onclick="openAccountModal(${t.trainer_id})" title="Create Account"><i class="fas fa-key"></i></button>`;
        } else {
            accountBtn = `<span class="badge bg-success me-1" title="Account Active"><i class="fas fa-check"></i></span>`;
        }

        const statusBtn = t.status === 'active' 
            ? `<button class="btn btn-sm btn-warning" onclick="toggleStatus(${t.trainer_id}, 'inactive')" title="Archive"><i class="fas fa-archive"></i></button>`
            : `<button class="btn btn-sm btn-success" onclick="toggleStatus(${t.trainer_id}, 'active')" title="Activate"><i class="fas fa-undo"></i></button>`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${t.trainer_id}</td>
            <td>${t.last_name}, ${t.first_name}</td>
            <td>${t.email}</td>
            <td>${t.specialization || '-'}</td>
            <td><span class="badge bg-${t.status === 'active' ? 'success' : 'secondary'}">${t.status}</span></td>
            <td>
                ${accountBtn}
                <button class="btn btn-sm btn-info text-white me-1" onclick="openEditModal(${t.trainer_id})" title="Edit"><i class="fas fa-edit"></i></button>
                ${statusBtn}
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.openAccountModal = function(id) {
    document.getElementById('accTrainerId').value = id;
    document.getElementById('accountForm').reset();
    accountModal.show();
};

async function handleCreateAccount(e) {
    e.preventDefault();
    const data = {
        trainer_id: document.getElementById('accTrainerId').value,
        username: document.getElementById('accUsername').value,
        password: document.getElementById('accPassword').value
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/admin/trainers.php?action=create-account`, data);
        if (response.data.success) {
            alert('Account created successfully');
            accountModal.hide();
            loadTrainers();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error creating account:', error);
    }
}

window.toggleStatus = async function(id, status) {
    if (!confirm(`Are you sure you want to set this trainer to ${status}?`)) return;
    try {
        await axios.post(`${API_BASE_URL}/role/admin/trainers.php?action=toggle-status`, { trainer_id: id, status: status });
        loadTrainers();
    } catch (error) {
        console.error('Error updating status:', error);
    }
};

window.openEditModal = function(id) {
    const t = trainersData.find(item => item.trainer_id == id);
    if (!t) return;

    document.getElementById('editTrainerId').value = t.trainer_id;
    document.getElementById('editFirstName').value = t.first_name;
    document.getElementById('editLastName').value = t.last_name;
    document.getElementById('editEmail').value = t.email;
    document.getElementById('editPhone').value = t.phone_number || '';
    document.getElementById('editSpecialization').value = t.specialization || '';
    editModal.show();
};

async function handleUpdateTrainer(e) {
    e.preventDefault();
    const data = {
        trainer_id: document.getElementById('editTrainerId').value,
        first_name: document.getElementById('editFirstName').value,
        last_name: document.getElementById('editLastName').value,
        email: document.getElementById('editEmail').value,
        phone: document.getElementById('editPhone').value,
        specialization: document.getElementById('editSpecialization').value
    };
    // Implementation for update API call would go here (similar to add/create account)
    try {
        const response = await axios.post(`${API_BASE_URL}/role/admin/trainers.php?action=update`, data);
        if (response.data.success) {
            alert('Trainer updated successfully');
            editModal.hide();
            loadTrainers();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error updating trainer:', error);
    }
}