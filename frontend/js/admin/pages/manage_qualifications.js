// API Configuration
const API_BASE_URL = 'http://localhost/hohoo-ville/api';

// Global variable to store data for editing
let currentQualifications = [];

// Axios Instance Configuration
let apiClient;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Axios
    if (typeof axios !== 'undefined') {
        apiClient = axios.create({
            baseURL: API_BASE_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        initializePage();
    } else {
        console.error('Axios is not defined. Please check your HTML includes.');
        alert('System Error: Axios library is missing.');
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
}

async function loadQualifications() {
    try {
        const response = await apiClient.get('/role/admin/manage_qualifications.php?action=list');
        if (response.data.success) {
            renderTable(response.data.data);
        } else {
            alert('Error loading qualifications: ' + (response.data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading qualifications:', error);
        alert('Error loading qualifications. Please check console.');
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
                <button class="btn btn-success btn-sm me-1" onclick="approveQualification(${item.course_id})" title="Approve"><i class="fas fa-check"></i></button>
                <button class="btn btn-danger btn-sm me-1" onclick="rejectQualification(${item.course_id})" title="Reject"><i class="fas fa-times"></i></button>
            `;
        }
        actionBtns += `
            <button class="btn btn-warning btn-sm me-1" onclick="editQualification(${item.course_id})" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteQualification(${item.course_id})" title="Delete"><i class="fas fa-trash"></i></button>
        `;
            
        row.innerHTML = `
            <td>${item.course_id}</td>
            <td>${item.course_name}</td>
            <td>${item.ctpr_number || '-'}</td>
            <td>${item.training_cost ? '₱' + item.training_cost : 'Free'}</td>
            <td>${item.duration || 'N/A'}</td>
            <td>${statusBadge}</td>
            <td>${actionBtns}</td>
        `;
        tbody.appendChild(row);
    });
}

window.approveQualification = async function(id) {
    if (!confirm('Approve this qualification? It will become available for trainers.')) return;
    updateStatus(id, 'active');
};

window.rejectQualification = async function(id) {
    if (!confirm('Reject this qualification?')) return;
    updateStatus(id, 'rejected');
};

async function updateStatus(id, status) {
    try {
        const response = await apiClient.post('/role/admin/manage_qualifications.php?action=update-status', {
            course_id: id,
            status: status
        });
        if (response.data.success) {
            alert(`Qualification ${status} successfully`);
            loadQualifications();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status');
    }
}

async function addQualification() {
    const data = {
        course_name: document.getElementById('courseName').value,
        ctpr_number: document.getElementById('ctprNumber').value,
        training_cost: document.getElementById('trainingCost').value,
        duration: document.getElementById('duration').value,
        description: document.getElementById('description').value,
        status: document.getElementById('status').value
    };

    try {
        const response = await apiClient.post('/role/admin/manage_qualifications.php?action=add', data);
        if (response.data.success) {
            alert('Qualification added successfully');
            resetForm();
            loadQualifications();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error adding qualification:', error);
        alert('Error adding qualification');
    }
}

async function updateQualification(id) {
    const data = {
        course_id: id,
        course_name: document.getElementById('courseName').value,
        ctpr_number: document.getElementById('ctprNumber').value,
        training_cost: document.getElementById('trainingCost').value,
        duration: document.getElementById('duration').value,
        description: document.getElementById('description').value,
        status: document.getElementById('status').value
    };

    try {
        const response = await apiClient.post('/role/admin/manage_qualifications.php?action=update', data);
        if (response.data.success) {
            alert('Qualification updated successfully');
            resetForm();
            loadQualifications();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error updating qualification:', error);
        alert('Error updating qualification');
    }
}

async function deleteQualification(id) {
    if (!confirm('Are you sure you want to delete this qualification?')) return;
    
    try {
        const response = await apiClient.delete(`/role/admin/manage_qualifications.php?action=delete&id=${id}`);
        if (response.data.success) {
            alert('Qualification deleted successfully');
            loadQualifications();
        } else {
            alert('Error deleting qualification');
        }
    } catch (error) {
        console.error('Error deleting qualification:', error);
        alert('Error deleting qualification');
    }
}

function editQualification(id) {
    const item = currentQualifications.find(q => q.course_id == id);
    if (!item) return;

    document.getElementById('qualificationId').value = item.course_id;
    document.getElementById('courseName').value = item.course_name;
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