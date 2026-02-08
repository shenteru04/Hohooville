// API Configuration
const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

// Global variable to store data for editing
let currentQualifications = [];

// Axios Instance Configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
apiClient.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// Handle response errors
apiClient.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../../login.html';
        }
        return Promise.reject(error);
    }
);

document.addEventListener('DOMContentLoaded', function() {
    initializePage();

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

function initializePage() {
    loadQualifications();
    
    // Form Event Listener
    const form = document.getElementById('qualificationForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('qualificationId').value;
            if (id) {
                updateQualification(id);
            } else {
                addQualification();
            }
        });
    } else {
        console.error('Error: Element "qualificationForm" not found in DOM');
    }

    // Cancel Button Listener
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetForm);
    }

    // Table Action Event Listener
    const tableBody = document.getElementById('qualificationsTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const id = button.dataset.id;

            if (!action || !id) return;

            switch (action) {
                case 'approve':
                    approveQualification(id);
                    break;
                case 'reject':
                    rejectQualification(id);
                    break;
                case 'edit':
                    editQualification(id);
                    break;
                case 'delete':
                    deleteQualification(id);
                    break;
            }
        });
    }
}

async function loadQualifications() {
    try {
        const response = await apiClient.get('/role/admin/manage_qualifications.php?action=list');
        if (response.data.success) {
            renderTable(response.data.data);
        } else {
            showAlert('Error loading qualifications: ' + (response.data.message || 'Unknown error'), 'danger');
        }
    } catch (error) {
        console.error('Error loading qualifications:', error);
        showAlert('Error loading qualifications. Please check console.', 'danger');
    }
}

function renderTable(data) {
    currentQualifications = data;
    const tbody = document.getElementById('qualificationsTableBody');
    if (!tbody) {
        console.error('Error: Element "qualificationsTableBody" not found in DOM');
        return;
    }

    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No qualifications found</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        let statusBadge = '';
        if (item.status === 'active') statusBadge = '<span class="badge bg-success">Active</span>';
        else if (item.status === 'pending') statusBadge = '<span class="badge bg-warning text-dark">Pending Approval</span>';
        else if (item.status === 'rejected') statusBadge = '<span class="badge bg-danger">Rejected</span>';
        else statusBadge = '<span class="badge bg-secondary">Inactive</span>';

        let actionBtns = '';
        if (item.status === 'pending') {
            actionBtns = `
                <button class="btn btn-success btn-sm me-1" data-action="approve" data-id="${item.qualification_id}" title="Approve"><i class="fas fa-check"></i></button>
                <button class="btn btn-danger btn-sm me-1" data-action="reject" data-id="${item.qualification_id}" title="Reject"><i class="fas fa-times"></i></button>
            `;
        }
        actionBtns += `
            <button class="btn btn-warning btn-sm me-1" data-action="edit" data-id="${item.qualification_id}" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn btn-outline-danger btn-sm" data-action="delete" data-id="${item.qualification_id}" title="Delete"><i class="fas fa-trash"></i></button>
        `;
            
        row.innerHTML = `
            <td>${item.qualification_id}</td>
            <td>${item.qualification_name}</td>
            <td>${item.ctpr_number || '-'}</td>
            <td>${item.training_cost ? '₱' + item.training_cost : 'Free'}</td>
            <td>${item.duration || 'N/A'}</td>
            <td>${statusBadge}</td>
            <td>${actionBtns}</td>
        `;
        tbody.appendChild(row);
    });
}

async function approveQualification(id) {
    if (!confirm('Approve this qualification? It will become available for trainers.')) return;
    updateStatus(id, 'active');
}

async function rejectQualification(id) {
    if (!confirm('Reject this qualification?')) return;
    updateStatus(id, 'rejected');
}

async function updateStatus(id, status) {
    try {
        const response = await apiClient.post('/role/admin/manage_qualifications.php?action=update-status', {
            qualification_id: id,
            status: status
        });
        if (response.data.success) {
            showAlert(`Qualification ${status} successfully`, 'success');
            loadQualifications();
        } else {
            showAlert('Error: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showAlert('Error updating status', 'danger');
    }
}

async function addQualification() {
    const data = {
        qualification_name: document.getElementById('courseName').value,
        ctpr_number: document.getElementById('ctprNumber').value,
        training_cost: document.getElementById('trainingCost').value,
        duration: document.getElementById('duration').value,
        description: document.getElementById('description').value,
        status: document.getElementById('status').value
    };

    try {
        const response = await apiClient.post('/role/admin/manage_qualifications.php?action=add', data);
        if (response.data.success) {
            showAlert('Qualification added successfully', 'success');
            resetForm();
            loadQualifications();
        } else {
            showAlert('Error: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error adding qualification:', error);
        showAlert('Error adding qualification', 'danger');
    }
}

async function updateQualification(id) {
    const data = {
        qualification_id: id,
        qualification_name: document.getElementById('courseName').value,
        ctpr_number: document.getElementById('ctprNumber').value,
        training_cost: document.getElementById('trainingCost').value,
        duration: document.getElementById('duration').value,
        description: document.getElementById('description').value,
        status: document.getElementById('status').value
    };

    try {
        const response = await apiClient.post('/role/admin/manage_qualifications.php?action=update', data);
        if (response.data.success) {
            showAlert('Qualification updated successfully', 'success');
            resetForm();
            loadQualifications();
        } else {
            showAlert('Error: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error updating qualification:', error);
        showAlert('Error updating qualification', 'danger');
    }
}

async function deleteQualification(id) {
    if (!confirm('Are you sure you want to delete this qualification?')) return;
    
    try {
        const response = await apiClient.delete(`/role/admin/manage_qualifications.php?action=delete&id=${id}`);
        if (response.data.success) {
            showAlert('Qualification deleted successfully', 'success');
            loadQualifications();
        } else {
            showAlert('Error deleting qualification', 'danger');
        }
    } catch (error) {
        console.error('Error deleting qualification:', error);
        showAlert('Error deleting qualification', 'danger');
    }
}

function editQualification(id) {
    const item = currentQualifications.find(q => q.qualification_id == id);
    if (!item) return;

    document.getElementById('qualificationId').value = item.qualification_id;
    document.getElementById('courseName').value = item.qualification_name;
    document.getElementById('ctprNumber').value = item.ctpr_number || '';
    document.getElementById('trainingCost').value = item.training_cost || '';
    document.getElementById('duration').value = item.duration;
    document.getElementById('description').value = item.description;
    document.getElementById('status').value = item.status;
    
    document.getElementById('submitBtn').textContent = 'Update Qualification';
    document.getElementById('formTitle').textContent = 'Edit Qualification';
    document.getElementById('cancelBtn').style.display = 'inline-block';
}

function resetForm() {
    const form = document.getElementById('qualificationForm');
    if (form) form.reset();
    
    document.getElementById('qualificationId').value = '';
    document.getElementById('submitBtn').textContent = 'Add Qualification';
    document.getElementById('formTitle').textContent = 'Add New Qualification';
    document.getElementById('cancelBtn').style.display = 'none';
}

function showAlert(message, type) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-notification');
    existingAlerts.forEach(alert => alert.remove());

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-notification`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '80px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.style.maxWidth = '500px';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}