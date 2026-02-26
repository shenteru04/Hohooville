// API Configuration
const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainees/';

let reviewModal;
let reassignBatchModal;
let currentQueueData = [];
let currentReservedData = [];
let allBatches = [];

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

// Helper function to clear focus from modals before opening Swal dialogs
// This prevents aria-hidden accessibility warnings when Swal appears over a modal
function clearModalFocus() {
    const reviewModalEl = document.getElementById('reviewModal');
    const reassignBatchModalEl = document.getElementById('reassignBatchModal');
    
    if (reviewModalEl && document.activeElement && reviewModalEl.contains(document.activeElement)) {
        document.activeElement.blur();
    }
    if (reassignBatchModalEl && document.activeElement && reassignBatchModalEl.contains(document.activeElement)) {
        document.activeElement.blur();
    }
}

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

    const reviewModalEl = document.getElementById('reviewModal');
    reviewModal = new bootstrap.Modal(reviewModalEl);

    // Add event listener to prevent focus trap accessibility warning.
    // This fires when the modal is about to be hidden.
    reviewModalEl.addEventListener('hide.bs.modal', () => {
        // When hiding the review modal (e.g., after a Swal action), if an element 
        // inside it still has focus, move focus to the body to prevent an accessibility 
        // warning where aria-hidden is true on an ancestor of the focused element.
        if (document.activeElement && reviewModalEl.contains(document.activeElement)) {
            // Move focus away from the modal to prevent aria-hidden conflict
            document.body.focus();
        }
    });

    const reassignBatchModalEl = document.getElementById('reassignBatchModal');
    reassignBatchModal = new bootstrap.Modal(reassignBatchModalEl);

    // Add same focus management for reassign batch modal
    reassignBatchModalEl.addEventListener('hide.bs.modal', () => {
        if (document.activeElement && reassignBatchModalEl.contains(document.activeElement)) {
            document.body.focus();
        }
    });

    loadApprovalQueue();
    loadReservedQueue();
    loadAllBatches();

    document.getElementById('btnApprove').addEventListener('click', function() {
        const id = document.getElementById('reviewEnrollmentId').value;
        approveEnrollment(id);
    });

    document.getElementById('btnReserve').addEventListener('click', function() {
        const id = document.getElementById('reviewEnrollmentId').value;
        reserveEnrollment(id);
    });

    document.getElementById('btnReject').addEventListener('click', function() {
        const id = document.getElementById('reviewEnrollmentId').value;
        rejectEnrollment(id);
    });

    document.getElementById('btnConfirmReassignment').addEventListener('click', function() {
        const enrollmentId = document.getElementById('reassignEnrollmentId').value;
        const newBatchId = document.getElementById('reassignBatchSelect').value;
        submitReassignment(enrollmentId, newBatchId);
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

    const reservedTab = document.getElementById('reserved-tab');
    if (reservedTab) {
        reservedTab.addEventListener('click', loadReservedQueue);
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

async function loadAllBatches() {
    try {
        const response = await axios.get(`${API_BASE_URL}/public/submit_application.php?action=get-options`);
        if (response.data.success) {
            allBatches = response.data.data.batches || [];
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

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

async function loadReservedQueue() {
    try {
        const response = await apiClient.get('/role/admin/approval_queue.php?action=list_reserved');
        if (response.data.success) {
            currentReservedData = response.data.data;
            renderReservedTable(currentReservedData);
        } else {
            showAlert('Error loading reserved queue: ' + response.data.message, 'danger');
        }
    } catch (error) {
        console.error('Error loading reserved queue:', error);
        showAlert('Failed to load reserved queue.', 'danger');
    }
}

function renderQueueTable(data) {
    const tbody = document.getElementById('approvalQueueBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No pending enrollments</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        const courseName = item.course_name || '';
        const batchName = item.batch_name || '';
        let courseOrBatch = 'N/A';
        if (courseName && batchName) {
            courseOrBatch = `${courseName} / ${batchName}`;
        } else if (courseName) {
            courseOrBatch = courseName;
        } else if (batchName) {
            courseOrBatch = batchName;
        }
        const photoHtml = item.photo_file 
            ? `<img src="${UPLOADS_URL}${encodeURIComponent(item.photo_file)}" class="rounded-circle border" width="40" height="40" style="object-fit: cover;">` 
            : `<div class="rounded-circle bg-light text-secondary border d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;"><i class="fas fa-user"></i></div>`;
        
        row.innerHTML = `
            <td>${photoHtml}</td>
            <td>${item.first_name} ${item.last_name}</td>
            <td>${courseOrBatch}</td>
            <td>${item.enrollment_date}</td>
            <td>
                <button class="btn btn-primary btn-sm review-btn" data-id="${item.enrollment_id}">
                    <i class="fas fa-search"></i> Review
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderReservedTable(data) {
    const tbody = document.getElementById('reservedQueueBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No reserved trainees</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        const courseName = item.course_name || '';
        const batchName = item.batch_name || '';
        let courseOrBatch = 'N/A';
        if (courseName && batchName) {
            courseOrBatch = `${courseName} / ${batchName}`;
        } else if (courseName) {
            courseOrBatch = courseName;
        } else if (batchName) {
            courseOrBatch = batchName;
        }
        const photoHtml = item.photo_file 
            ? `<img src="${UPLOADS_URL}${encodeURIComponent(item.photo_file)}" class="rounded-circle border" width="40" height="40" style="object-fit: cover;">` 
            : `<div class="rounded-circle bg-light text-secondary border d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;"><i class="fas fa-user"></i></div>`;
        
        row.innerHTML = `
            <td>${photoHtml}</td>
            <td>${item.first_name} ${item.last_name}</td>
            <td>${courseOrBatch}</td>
            <td>${item.enrollment_date}</td>
            <td>
                <button class="btn btn-success btn-sm" onclick="openReassignModal(${item.enrollment_id}, ${item.qualification_id}, '${item.first_name} ${item.last_name}', '${item.course_name}')">
                    <i class="fas fa-random"></i> Assign Batch
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
    // Clear focus from modal before opening Swal to prevent aria-hidden conflicts
    clearModalFocus();
    
    // Temporarily hide the modal to prevent aria-hidden from blocking Swal2
    const reviewModalEl = document.getElementById('reviewModal');
    const wasVisible = reviewModalEl.style.display !== 'none';
    if (wasVisible) {
        reviewModalEl.style.display = 'none';
    }
    
    const scholarship = document.getElementById('scholarshipSelect').value;
    
    const result = await Swal.fire({
        title: 'Approve Enrollment?',
        text: "Confirm approval for this trainee?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Approve',
        allowOutsideClick: false,
        allowEscapeKey: true,
        willClose: () => {
            if (wasVisible) {
                reviewModalEl.style.display = 'block';
            }
        }
    });

    // Restore modal if user canceled
    if (wasVisible && reviewModalEl.style.display === 'none') {
        reviewModalEl.style.display = 'block';
    }

    if (!result.isConfirmed) return;
    
    try {
        Swal.fire({
            title: 'Please wait',
            text: 'Sending email...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        const response = await apiClient.post('/role/admin/approval_queue.php?action=approve', { 
            enrollment_id: id,
            scholarship_type: scholarship
        });
        
        Swal.close();
        if (response.data.success) {
            Swal.fire('Approved!', 'Enrollment approved successfully', 'success');
            reviewModal.hide();
            loadApprovalQueue();
        } else {
            const errorMsg = response.data.message || 'An unknown error occurred';
            showAlert('Error: ' + errorMsg, 'danger');
        }
    } catch (error) {
        console.error('Error approving enrollment:', error);
        Swal.close();
        const errorMsg = error.response?.data?.message || error.message || 'Error approving enrollment';
        showAlert('Error: ' + errorMsg, 'danger');
    }
}

async function reserveEnrollment(id) {
    // Clear focus from modal before opening Swal to prevent aria-hidden conflicts
    clearModalFocus();
    
    // Temporarily hide the modal to prevent aria-hidden from blocking Swal2 input
    const reviewModalEl = document.getElementById('reviewModal');
    const wasVisible = reviewModalEl.style.display !== 'none';
    if (wasVisible) {
        reviewModalEl.style.display = 'none';
    }
    
    const { value: reason } = await Swal.fire({
        title: 'Reserve Application',
        input: 'text',
        inputLabel: 'Reason for reserving (e.g., current batch is full)',
        inputPlaceholder: 'Enter reason...',
        showCancelButton: true,
        confirmButtonText: 'Yes, Reserve',
        allowOutsideClick: false,
        allowEscapeKey: true,
        inputValidator: (value) => {
            if (!value) {
                return 'A reason is required to reserve an application!';
            }
        },
        didOpen: (popup) => {
            setTimeout(() => {
                const input = popup.querySelector('.swal2-input');
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 100);
        },
        willClose: () => {
            if (wasVisible) {
                reviewModalEl.style.display = 'block';
            }
        }
    });

    // Restore modal if user canceled
    if (wasVisible && reviewModalEl.style.display === 'none') {
        reviewModalEl.style.display = 'block';
    }

    if (!reason) return;

    try {
        Swal.fire({
            title: 'Please wait',
            text: 'Sending email...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        const response = await apiClient.post('/role/admin/approval_queue.php?action=reserve', { enrollment_id: id, rejection_reason: reason });
        Swal.close();
        if (response.data.success) {
            Swal.fire('Reserved', 'Application has been moved to the reserved list.', 'info');
            reviewModal.hide();
            loadApprovalQueue();
            loadReservedQueue();
        } else {
            showAlert('Error: ' + (response.data.message || 'An unknown error occurred'), 'danger');
        }
    } catch (error) {
        console.error('Error reserving enrollment:', error);
        Swal.close();
        showAlert('Error: ' + (error.response?.data?.message || 'Action failed'), 'danger');
    }
}

async function rejectEnrollment(id) {
    // Clear focus from modal before opening Swal to prevent aria-hidden conflicts
    clearModalFocus();
    
    // Temporarily hide the modal to prevent aria-hidden from blocking Swal2 input
    const reviewModalEl = document.getElementById('reviewModal');
    const wasVisible = reviewModalEl.style.display !== 'none';
    if (wasVisible) {
        reviewModalEl.style.display = 'none';
    }
    
    const { value: reason } = await Swal.fire({
        title: 'Reject Enrollment',
        input: 'text',
        inputLabel: 'Please enter the reason for rejection:',
        inputPlaceholder: 'Reason...',
        showCancelButton: true,
        allowOutsideClick: false,
        allowEscapeKey: true,
        inputValidator: (value) => {
            if (!value || value.trim() === '') {
                return 'A rejection reason is required!';
            }
        },
        didOpen: (popup) => {
            // Use a small timeout to ensure DOM is fully ready
            setTimeout(() => {
                const input = popup.querySelector('.swal2-input');
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 100);
        },
        willClose: () => {
            // Restore modal visibility
            if (wasVisible) {
                reviewModalEl.style.display = 'block';
            }
        }
    });

    // Restore modal if user canceled
    if (wasVisible && reviewModalEl.style.display === 'none') {
        reviewModalEl.style.display = 'block';
    }

    if (!reason) return;
    
    try {
        Swal.fire({
            title: 'Please wait',
            text: 'Sending email...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        const response = await apiClient.post('/role/admin/approval_queue.php?action=reject', { enrollment_id: id, rejection_reason: reason });
        Swal.close();
        if (response.data.success) {
            Swal.fire('Rejected', 'Enrollment rejected successfully', 'info');
            reviewModal.hide();
            loadApprovalQueue();
        } else {
            const errorMsg = response.data.message || 'An unknown error occurred';
            showAlert('Error: ' + errorMsg, 'danger');
        }
    } catch (error) {
        console.error('Error rejecting enrollment:', error);
        Swal.close();
        const errorMsg = error.response?.data?.message || error.message || 'Error rejecting enrollment';
        showAlert('Error: ' + errorMsg, 'danger');
    }
}

window.openReassignModal = function(enrollmentId, qualificationId, traineeName, courseName) {
    document.getElementById('reassignEnrollmentId').value = enrollmentId;
    document.getElementById('reassignQualificationId').value = qualificationId;
    document.getElementById('reassignTraineeName').textContent = traineeName;
    document.getElementById('reassignCourseName').textContent = courseName;

    const batchSelect = document.getElementById('reassignBatchSelect');
    batchSelect.innerHTML = '<option value="">Select a batch</option>';

    const relevantBatches = allBatches.filter(b => b.qualification_id == qualificationId);

    if (relevantBatches.length > 0) {
        relevantBatches.forEach(batch => {
            batchSelect.innerHTML += `<option value="${batch.batch_id}">${batch.batch_name}</option>`;
        });
    } else {
        batchSelect.innerHTML = '<option value="">No open batches for this course</option>';
    }

    reassignBatchModal.show();
}

async function submitReassignment(enrollmentId, newBatchId) {
    if (!newBatchId) {
        Swal.fire('Required', 'Please select a new batch.', 'warning');
        return;
    }

    // Clear focus from modal before opening Swal to prevent aria-hidden conflicts
    clearModalFocus();

    // Temporarily hide the modal to prevent aria-hidden from blocking Swal2
    const reassignBatchModalEl = document.getElementById('reassignBatchModal');
    const wasVisible = reassignBatchModalEl.style.display !== 'none';
    if (wasVisible) {
        reassignBatchModalEl.style.display = 'none';
    }

    const result = await Swal.fire({
        title: 'Confirm Reassignment',
        text: "This will approve the trainee and assign them to the selected batch. Continue?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Assign & Approve',
        allowOutsideClick: false,
        allowEscapeKey: true,
        willClose: () => {
            if (wasVisible) {
                reassignBatchModalEl.style.display = 'block';
            }
        }
    });

    // Restore modal if user canceled
    if (wasVisible && reassignBatchModalEl.style.display === 'none') {
        reassignBatchModalEl.style.display = 'block';
    }

    if (!result.isConfirmed) return;

    try {
        Swal.fire({
            title: 'Please wait',
            text: 'Sending email...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        const response = await apiClient.post('/role/admin/approval_queue.php?action=reassign', {
            enrollment_id: enrollmentId,
            new_batch_id: newBatchId
        });

        Swal.close();
        if (response.data.success) {
            Swal.fire('Success!', 'Trainee has been assigned and approved.', 'success');
            reassignBatchModal.hide();
            loadReservedQueue();
            loadApprovalQueue();
        } else {
            Swal.fire('Error', response.data.message || 'An unknown error occurred.', 'error');
        }
    } catch (error) {
        console.error('Error reassigning batch:', error);
        Swal.close();
        Swal.fire('Error', error.response?.data?.message || 'Failed to reassign batch.', 'error');
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
