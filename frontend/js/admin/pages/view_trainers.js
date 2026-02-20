const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
let accountModal, editModal;
let trainersData = [];

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    accountModal = new bootstrap.Modal(document.getElementById('accountModal'));
    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    
    loadTrainers();
    loadQualifications();

    document.getElementById('accountForm').addEventListener('submit', handleCreateAccount);
    document.getElementById('editForm').addEventListener('submit', handleUpdateTrainer);

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

async function loadQualifications() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainers.php?action=get-qualifications`);
        if (response.data.success) {
            const select = document.getElementById('editQualificationId');
            response.data.data.forEach(q => {
                const option = document.createElement('option');
                option.value = q.qualification_id;
                option.textContent = q.qualification_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading qualifications:', error);
    }
}

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
            <td>${t.last_name}, ${t.first_name}</td>
            <td>${t.email}</td>
            <td>${t.qualification_name || '-'}</td>
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
            Swal.fire('Success', 'Account created successfully', 'success');
            accountModal.hide();
            loadTrainers();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error creating account:', error);
    }
}

window.toggleStatus = async function(id, status) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to set this trainer to ${status}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Yes, set to ${status}`
    });

    if (!result.isConfirmed) return;
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
    document.getElementById('editQualificationId').value = t.qualification_id || '';
    // Set status dropdown
    const statusSelect = document.getElementById('editStatus');
    if (statusSelect) {
        statusSelect.value = t.status || 'active';
    }
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
        qualification_id: document.getElementById('editQualificationId').value
    };
    // Implementation for update API call would go here (similar to add/create account)
    try {
        const response = await axios.post(`${API_BASE_URL}/role/admin/trainers.php?action=update`, data);
        if (response.data.success) {
            Swal.fire('Success', 'Trainer updated successfully', 'success');
            editModal.hide();
            loadTrainers();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error updating trainer:', error);
    }
}