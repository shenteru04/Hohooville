// API Configuration
const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainees/';

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