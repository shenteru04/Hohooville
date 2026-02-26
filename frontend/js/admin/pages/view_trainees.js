const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainees/';

let accountModal;
let profileModal;
let sendingModal;
let traineesData = [];

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

    // Initialize Modals
    accountModal = new bootstrap.Modal(document.getElementById('createAccountModal'));
    profileModal = new bootstrap.Modal(document.getElementById('viewProfileModal'));
    const sendingEl = document.getElementById('sendingEmailModal');
    if (sendingEl) {
        sendingModal = new bootstrap.Modal(sendingEl, { backdrop: 'static', keyboard: false });
    }

    loadTrainees();

    // Create Account Form Submission
    document.getElementById('createAccountForm').addEventListener('submit', handleCreateAccount);

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

async function loadTrainees() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainees.php?action=list`);
        if (response.data.success) {
            traineesData = response.data.data;
            populateBatchFilter(traineesData);
            renderTraineesTable(traineesData);
        } else {
            Swal.fire('Error', 'Error loading trainees: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error loading trainees:', error);
    }
}

function renderTraineesTable(data) {
    const tbody = document.getElementById('traineesTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No trainees found</td></tr>';
        return;
    }
    
    data.forEach(trainee => {
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
            <td>${trainee.trainee_school_id || 'N/A'}</td>
            <td>${trainee.last_name}, ${trainee.first_name}</td>
            <td>${trainee.email}</td>
            <td>${trainee.phone_number || '-'}</td>
            <td data-filter-value="${trainee.batch_id || ''}">${trainee.batch_name || '<span class="text-muted">Not Enrolled</span>'}</td>
            <td><span class="badge bg-${trainee.status === 'active' ? 'success' : 'secondary'}">${trainee.status}</span></td>
            <td>
                <div class="dropdown d-flex justify-content-center">
                                      <button class="btn btn-sm px-2 py-1" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Actions">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    ${!trainee.user_id ? `<li><a class="dropdown-item" href="#" onclick="openAccountModal(${trainee.trainee_id})"><i class='fas fa-key me-2'></i>Create Account</a></li>` : `<li><span class='dropdown-item text-success'><i class='fas fa-check me-2'></i>Account Active</span></li>`}
                    <li><a class="dropdown-item" href="#" onclick="viewProfile(${trainee.trainee_id})"><i class='fas fa-eye me-2'></i>View Profile</a></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteTrainee(${trainee.trainee_id})"><i class='fas fa-trash me-2'></i>Delete</a></li>
                  </ul>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function populateBatchFilter(data) {
    const select = document.getElementById('batchFilter');
    if (!select) return;

    const current = select.value;
    const batches = new Map();
    (data || []).forEach(item => {
        if (!item.batch_id || !item.batch_name) return;
        if (!batches.has(item.batch_id)) {
            batches.set(item.batch_id, item.batch_name);
        }
    });

    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All Batches';
    select.appendChild(allOption);

    Array.from(batches.entries())
        .sort((a, b) => String(a[1]).localeCompare(String(b[1]), undefined, { sensitivity: 'base' }))
        .forEach(([id, name]) => {
            const option = document.createElement('option');
            option.value = String(id);
            option.textContent = name;
            select.appendChild(option);
        });

    if (current) {
        const hasOption = Array.from(select.options).some(opt => opt.value === current);
        if (hasOption) {
            select.value = current;
        }
    }
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
        if (sendingModal) sendingModal.show();
        const response = await axios.post(`${API_BASE_URL}/role/admin/trainees.php?action=create-account`, data);
        if (sendingModal) sendingModal.hide();
        if (response.data.success) {
            Swal.fire('Success', 'Account created successfully!', 'success');
            accountModal.hide();
            loadTrainees();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        if (sendingModal) sendingModal.hide();
        console.error('Error creating account:', error);
        let errorMsg = 'Failed to create account';
        if (error.response && error.response.data && error.response.data.message) {
            errorMsg += ': ' + error.response.data.message;
        }
        Swal.fire('Error', errorMsg, 'error');
    }
}

window.viewProfile = function(id) {
    const t = traineesData.find(item => item.trainee_id == id);
    if (!t) return;

    document.getElementById('viewName').textContent = `${t.first_name} ${t.last_name}`;
    document.getElementById('viewSchoolId').textContent = t.trainee_school_id || 'N/A';
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
        photoImg.onerror = function() {
            this.style.display = 'none';
            noPhoto.style.display = 'block';
        };
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
        const response = await axios.delete(`${API_BASE_URL}/role/admin/trainees.php?action=delete&id=${id}`);
        if (response.data.success) {
            Swal.fire('Deleted!', 'Trainee deleted successfully.', 'success');
            loadTrainees();
        } else {
            Swal.fire('Error', 'Error deleting trainee', 'error');
        }
    } catch (error) {
        console.error('Error deleting trainee:', error);
        Swal.fire('Error', 'Error deleting trainee', 'error');
    }
};
