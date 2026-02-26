const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
let accountModal, editModal;
let trainersData = [];
const TOO_MANY_QUALIFICATIONS = 2;
let filterTooManyOnly = false;

document.addEventListener('DOMContentLoaded', function() {
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.clear();
                window.location.href = '/hohoo-ville/frontend/login.html';
            });
        }
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

    // Add robust email validation for edit trainer modal
    const editEmailInput = document.getElementById('editEmail');
    if (editEmailInput) {
        editEmailInput.addEventListener('input', function() {
            const val = this.value.trim();
            if (val.length === 0) {
                this.classList.remove('is-invalid');
                this.setCustomValidity('');
                return;
            }
            if (this.checkValidity()) {
                this.classList.remove('is-invalid');
                this.setCustomValidity('');
            } else {
                this.classList.add('is-invalid');
                this.setCustomValidity('Please enter a valid email address (e.g., name@example.com).');
            }
        });
        editEmailInput.addEventListener('blur', function() {
            const val = this.value.trim();
            if (val.length === 0) return;
            if (!this.checkValidity()) {
                this.classList.add('is-invalid');
            }
        });
    }

    const filterToggle = document.getElementById('filterTooManyQualifications');
    if (filterToggle) {
        filterTooManyOnly = filterToggle.checked;
        filterToggle.addEventListener('change', () => {
            filterTooManyOnly = filterToggle.checked;
            renderTable(trainersData);
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

function getQualificationCount(trainer) {
    const count = Number(trainer.qualification_count);
    if (!Number.isNaN(count) && count >= 0) return count;

    const names = trainer.qualification_names || trainer.qualification_name || '';
    if (!names) return 0;
    return names.split(',').map(s => s.trim()).filter(Boolean).length;
}

function renderTable(data) {
    const tbody = document.getElementById('trainersTableBody');
    tbody.innerHTML = '';

    const tooManyTotal = data.filter(t => getQualificationCount(t) >= TOO_MANY_QUALIFICATIONS).length;
    const tooManyCountEl = document.getElementById('tooManyQualificationsCount');
    if (tooManyCountEl) {
        tooManyCountEl.textContent = String(tooManyTotal);
    }

    const filtered = filterTooManyOnly
        ? data.filter(t => getQualificationCount(t) >= TOO_MANY_QUALIFICATIONS)
        : data;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No trainers found</td></tr>';
        return;
    }

    filtered.forEach(t => {
        let menuItems = '';
        if (!t.user_id) {
            menuItems += `<li><a class='dropdown-item' href='#' onclick='openAccountModal(${t.trainer_id})'><i class='fas fa-key me-2'></i>Create Account</a></li>`;
        } else {
            menuItems += `<li><span class='dropdown-item text-success'><i class='fas fa-check me-2'></i>Account Active</span></li>`;
        }
        menuItems += `<li><a class='dropdown-item' href='#' onclick='openEditModal(${t.trainer_id})'><i class='fas fa-edit me-2'></i>Edit</a></li>`;
        if (t.status === 'active') {
            menuItems += `<li><a class='dropdown-item text-warning' href='#' onclick='toggleStatus(${t.trainer_id}, "inactive")'><i class='fas fa-archive me-2'></i>Archive</a></li>`;
        } else {
            menuItems += `<li><a class='dropdown-item text-success' href='#' onclick='toggleStatus(${t.trainer_id}, "active")'><i class='fas fa-undo me-2'></i>Activate</a></li>`;
        }

        const qualificationCount = getQualificationCount(t);
        const qualificationLabel = t.qualification_names || t.qualification_name || '-';
        const countBadgeClass = qualificationCount >= TOO_MANY_QUALIFICATIONS ? 'bg-danger' : 'bg-secondary';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${t.last_name}, ${t.first_name}</td>
            <td>${t.email}</td>
            <td>
                <div class="d-flex flex-wrap align-items-center gap-2">
                    <span class="badge ${countBadgeClass}">${qualificationCount}</span>
                    <span>${qualificationLabel}</span>
                </div>
            </td>
            <td><span class="badge bg-${t.status === 'active' ? 'success' : 'secondary'}">${t.status}</span></td>
            <td>
                <div class="dropdown d-flex justify-content-center">
                  <button class="btn btn-sm px-2 py-1" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Actions">
                    <i class="fas fa-ellipsis-v"></i>
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    ${menuItems}
                  </ul>
                </div>
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
