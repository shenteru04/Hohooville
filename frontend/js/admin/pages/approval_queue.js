// API Configuration
const API_BASE_URL = 'http://localhost/hohoo-ville/api';
const UPLOADS_URL = 'http://localhost/hohoo-ville/uploads/trainees/';

let reviewModal;
let currentQueueData = [];

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

// Handle 401 response errors
apiClient.interceptors.response.use(response => response, error => {
    if (error.response && error.response.status === 401) {
        window.location.href = '../../../login.html';
    }
    return Promise.reject(error);
});

document.addEventListener('DOMContentLoaded', function() {
    reviewModal = new bootstrap.Modal(document.getElementById('reviewModal'));
    loadApprovalQueue();

    document.getElementById('btnApprove').addEventListener('click', function() {
        const id = document.getElementById('reviewEnrollmentId').value;
        approveEnrollment(id);
    });

    document.getElementById('btnReject').addEventListener('click', function() {
        const id = document.getElementById('reviewEnrollmentId').value;
        rejectEnrollment(id);
    });

    // Event delegation for review buttons
    const tableBody = document.getElementById('approvalQueueBody');
    if (tableBody) {
        tableBody.addEventListener('click', function(e) {
            const reviewBtn = e.target.closest('.review-btn');
            if (reviewBtn) {
                const enrollmentId = reviewBtn.dataset.id;
                openReviewModal(enrollmentId);
            }
        });
    }
});

async function loadApprovalQueue() {
    try {
        const response = await apiClient.get('/role/admin/approval_queue.php?action=list');
        if (response.data.success) {
            currentQueueData = response.data.data;
            renderQueueTable(response.data.data);
        } else {
            showAlert('Error loading queue: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error loading approval queue:', error);
        showAlert('Failed to load approval queue. Please check console.', 'danger');
    }
}

function renderQueueTable(data) {
    const tbody = document.getElementById('approvalQueueBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No pending enrollments</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        const courseOrBatch = item.course_name || item.batch_name || 'N/A';
        const photoHtml = item.photo_file 
            ? `<img src="${UPLOADS_URL}${encodeURIComponent(item.photo_file)}" class="rounded-circle border" width="40" height="40" style="object-fit: cover;">` 
            : `<div class="rounded-circle bg-light text-secondary border d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;"><i class="fas fa-user"></i></div>`;
        
        row.innerHTML = `
            <td>${item.enrollment_id}</td>
            <td>${photoHtml}</td>
            <td>${item.first_name} ${item.last_name}</td>
            <td>${courseOrBatch}</td>
            <td>${item.enrollment_date}</td>
            <td><span class="badge bg-warning text-dark">${item.status}</span></td>
            <td>
                <button class="btn btn-primary btn-sm review-btn" data-id="${item.enrollment_id}">
                    <i class="fas fa-search"></i> Review
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openReviewModal(id) {
    const item = currentQueueData.find(i => i.enrollment_id == id);
    if (!item) return;

    document.getElementById('reviewEnrollmentId').value = id;

    // Personal Info
    document.getElementById('reviewName').textContent = `${item.first_name} ${item.middle_name || ''} ${item.last_name}`;
    document.getElementById('reviewSex').textContent = item.sex || 'N/A';
    document.getElementById('reviewCivilStatus').textContent = item.civil_status || 'N/A';
    document.getElementById('reviewBirthdate').textContent = item.birthdate || 'N/A';
    document.getElementById('reviewAge').textContent = item.age || 'N/A';
    document.getElementById('reviewBirthplace').textContent = `${item.birthplace_city || ''}, ${item.birthplace_province || ''}`;
    document.getElementById('reviewEmail').textContent = item.email || 'N/A';
    document.getElementById('reviewPhone').textContent = item.phone_number || 'N/A';
    document.getElementById('reviewAddress').textContent = item.address || 'N/A';

    // Background
    document.getElementById('reviewEducation').textContent = item.educational_attainment || 'N/A';
    document.getElementById('reviewEmploymentStatus').textContent = item.employment_status || 'N/A';
    document.getElementById('reviewClassification').textContent = item.learner_classification ? item.learner_classification.split(',').join(', ') : 'N/A';
    document.getElementById('reviewIsPwd').textContent = item.is_pwd == 1 ? 'Yes' : 'No';

    // Training
    document.getElementById('reviewCourse').textContent = item.course_name || 'N/A';
    document.getElementById('reviewBatch').textContent = item.batch_name || 'N/A';
    
    // Auto-assign scholarship from application
    const scholarshipSelect = document.getElementById('scholarshipSelect');
    // Map 'Not a Scholar' to empty string for the dropdown, otherwise use the value
    const scholarshipValue = (item.scholarship_type === 'Not a Scholar') ? '' : item.scholarship_type;
    scholarshipSelect.value = scholarshipValue || ''; 

    // Handle Photo
    const photoImg = document.getElementById('reviewPhoto');
    const noPhoto = document.getElementById('reviewNoPhoto');
    if (item.photo_file) {
        photoImg.src = UPLOADS_URL + encodeURIComponent(item.photo_file);
        photoImg.style.display = 'block';
        noPhoto.style.display = 'none';
    } else {
        photoImg.style.display = 'none';
        noPhoto.style.display = 'block';
    }

    // Handle Documents
    setupDocLink('linkValidId', item.valid_id_file);
    setupDocLink('linkBirthCert', item.birth_cert_file);

    reviewModal.show();
}

function setupDocLink(elementId, filename) {
    const el = document.getElementById(elementId);
    if (filename) {
        el.href = UPLOADS_URL + encodeURIComponent(filename);
        el.classList.remove('disabled', 'text-muted');
        el.innerHTML = el.innerHTML.replace('(Not Uploaded)', '(Click to View)');
    } else {
        el.href = '#';
        el.classList.add('disabled', 'text-muted');
        el.innerHTML = el.innerHTML.includes('(Not Uploaded)') ? el.innerHTML : el.innerHTML + ' (Not Uploaded)';
    }
}

async function approveEnrollment(id) {
    const scholarship = document.getElementById('scholarshipSelect').value;
    
    if (!confirm('Confirm approval for this trainee?')) return;
    
    try {
        const response = await apiClient.post('/role/admin/approval_queue.php?action=approve', { 
            enrollment_id: id,
            scholarship_type: scholarship
        });
        
        if (response.data.success) {
            showAlert('Enrollment approved successfully', 'success');
            reviewModal.hide();
            loadApprovalQueue();
        } else {
            showAlert('Error: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error approving enrollment:', error);
        showAlert('Error approving enrollment', 'danger');
    }
}

async function rejectEnrollment(id) {
    if (!confirm('Are you sure you want to reject this enrollment?')) return;
    
    try {
        const response = await apiClient.post('/role/admin/approval_queue.php?action=reject', { enrollment_id: id });
        if (response.data.success) {
            showAlert('Enrollment rejected successfully', 'info');
            reviewModal.hide();
            loadApprovalQueue();
        } else {
            showAlert('Error: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error rejecting enrollment:', error);
        showAlert('Error rejecting enrollment', 'danger');
    }
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
    alertDiv.style.zIndex = '1060'; // Higher than modal backdrop
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