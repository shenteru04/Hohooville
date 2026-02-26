// API Configuration
const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainees/';

let viewModal;
let currentQueueData = [];
let unqualifiedData = [];
let currentViewItem = null;
let currentViewCanReview = false;

// Axios Instance Configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    const modalEl = document.getElementById('viewApplicationModal');
    if (modalEl) viewModal = new bootstrap.Modal(modalEl);
    
    loadApprovalQueue();
    loadUnqualifiedQueue();

    // Refresh unqualified list when tab is clicked
    document.getElementById('unqualified-tab').addEventListener('click', loadUnqualifiedQueue);

    const modalQualifyBtn = document.getElementById('modalQualifyBtn');
    const modalUnqualifyBtn = document.getElementById('modalUnqualifyBtn');
    if (modalQualifyBtn) {
        modalQualifyBtn.addEventListener('click', () => {
            if (currentViewItem) qualifyApplication(currentViewItem.enrollment_id);
        });
    }
    if (modalUnqualifyBtn) {
        modalUnqualifyBtn.addEventListener('click', () => {
            if (currentViewItem) unqualifyApplication(currentViewItem.enrollment_id);
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
        const response = await apiClient.get('/role/registrar/trainee_application.php?action=list');
        if (response.data.success) {
            currentQueueData = response.data.data;
            renderQueueTable(currentQueueData, 'approvalQueueBody', true);
        }
    } catch (error) {
        console.error('Error loading approval queue:', error);
    }
}

async function loadUnqualifiedQueue() {
    try {
        const response = await apiClient.get('/role/registrar/trainee_application.php?action=list_unqualified');
        if (response.data.success) {
            unqualifiedData = response.data.data;
            renderQueueTable(response.data.data, 'unqualifiedQueueBody', false);
        } else {
            Swal.fire({title: 'Error', text: 'Error loading queue: ' + response.data.message, icon: 'error'});
        }
    } catch (error) {
        console.error('Error loading approval queue:', error);
    }
}

function renderQueueTable(data, elementId, showActions) {
    const tbody = document.getElementById(elementId);
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
        const actionButtons = `
            <button class="btn btn-sm btn-outline-primary" type="button" onclick="viewApplication(${item.enrollment_id}, ${showActions ? 'true' : 'false'})" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
        `;
        const appliedAt = formatDateTime(item.enrollment_date);
        row.innerHTML = `
            <td>${photoHtml}</td>
            <td>${item.first_name} ${item.last_name}</td>
            <td>${courseOrBatch}</td>
            <td>${appliedAt}</td>
            <td>
                <div class="d-flex justify-content-center align-items-center flex-nowrap">
                    ${actionButtons}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function formatDateTime(value) {
    if (!value) return '-';
    const normalized = String(value).replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

window.viewApplication = function(id, canReview = false) {
    // Search in both lists
    const item = currentQueueData.find(i => i.enrollment_id == id) || unqualifiedData.find(i => i.enrollment_id == id);
    if (!item) return;
    currentViewItem = item;
    currentViewCanReview = !!canReview;

    // Personal Info
    document.getElementById('appName').textContent = `${item.first_name} ${item.middle_name || ''} ${item.last_name} ${item.extension_name || ''}`;
    document.getElementById('appSex').textContent = item.sex || 'N/A';
    document.getElementById('appCivilStatus').textContent = item.civil_status || 'N/A';
    document.getElementById('appBirthdate').textContent = item.birthdate || 'N/A';
    document.getElementById('appAge').textContent = item.age || 'N/A';
    document.getElementById('appNationality').textContent = item.nationality || 'N/A';
    document.getElementById('appBirthplace').textContent = `${item.birthplace_city || ''}, ${item.birthplace_province || ''}, ${item.birthplace_region || ''}`;

    // Contact & Address
    document.getElementById('appEmail').textContent = item.email;
    document.getElementById('appPhone').textContent = item.phone_number || 'N/A';
    document.getElementById('appFacebook').textContent = item.facebook_account || 'N/A';
    document.getElementById('appAddress').textContent = `${item.house_no_street || ''}, ${item.barangay || ''}, ${item.district || ''}, ${item.city_municipality || ''}, ${item.province || ''}, ${item.region || ''}`;

    // Background
    document.getElementById('appEducation').textContent = item.educational_attainment || 'N/A';
    document.getElementById('appEmploymentStatus').textContent = item.employment_status || 'N/A';
    document.getElementById('appEmploymentType').textContent = item.employment_type || 'N/A';
    document.getElementById('appClassification').textContent = item.learner_classification ? item.learner_classification.split(',').join(', ') : 'N/A';
    
    document.getElementById('appIsPwd').textContent = item.is_pwd == 1 ? 'Yes' : 'No';
    document.getElementById('appDisabilityType').textContent = item.disability_type || 'N/A';
    document.getElementById('appDisabilityCause').textContent = item.disability_cause || 'N/A';

    // Training
    document.getElementById('appCourse').textContent = item.course_name || 'N/A';
    document.getElementById('appBatch').textContent = item.batch_name || 'N/A';
    document.getElementById('appScholarship').textContent = item.scholarship_type || 'N/A';

    // Docs & Photo
    const linkValidId = document.getElementById('linkValidId');
    linkValidId.href = item.valid_id_file ? UPLOADS_URL + encodeURIComponent(item.valid_id_file) : '#';
    
    const linkBirthCert = document.getElementById('linkBirthCert');
    linkBirthCert.href = item.birth_cert_file ? UPLOADS_URL + encodeURIComponent(item.birth_cert_file) : '#';

    const photo = document.getElementById('appPhoto');
    const noPhoto = document.getElementById('appNoPhoto');
    photo.src = item.photo_file ? UPLOADS_URL + encodeURIComponent(item.photo_file) : '';
    photo.onerror = function() {
        this.style.display = 'none';
        noPhoto.style.display = 'block';
    };
    photo.style.display = item.photo_file ? 'block' : 'none';
    noPhoto.style.display = item.photo_file ? 'none' : 'block';

    const modalQualifyBtn = document.getElementById('modalQualifyBtn');
    const modalUnqualifyBtn = document.getElementById('modalUnqualifyBtn');
    if (modalQualifyBtn) modalQualifyBtn.style.display = currentViewCanReview ? 'inline-block' : 'none';
    if (modalUnqualifyBtn) modalUnqualifyBtn.style.display = currentViewCanReview ? 'inline-block' : 'none';

    viewModal.show();
}

window.qualifyApplication = async function(id) {
    const result = await Swal.fire({
        title: 'Qualify Application?',
        text: "It will be sent to the Admin for final approval.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, qualify it'
    });

    if (!result.isConfirmed) return;
    
    try {
        Swal.fire({
            title: 'Please wait',
            text: 'Sending email...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        const response = await apiClient.post('/role/registrar/trainee_application.php?action=qualify', { 
            enrollment_id: id
        });
        
        Swal.close();
        if (response.data.success) {
            Swal.fire({title: 'Success', text: 'Application marked as Qualified.', icon: 'success'});
            if (viewModal) viewModal.hide();
            loadApprovalQueue(); // Reload to refresh list and filters
        } else {
            Swal.fire({title: 'Error', text: 'Error: ' + response.data.message, icon: 'error'});
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.close();
        Swal.fire({title: 'Error', text: 'Action failed', icon: 'error'});
    }
}

window.unqualifyApplication = async function(id) {
    const result = await Swal.fire({
        title: 'Unqualify Application?',
        text: "Are you sure you want to mark this as unqualified?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, unqualify'
    });

    if (!result.isConfirmed) return;
    
    try {
        Swal.fire({
            title: 'Please wait',
            text: 'Sending email...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        const response = await apiClient.post('/role/registrar/trainee_application.php?action=unqualify', { enrollment_id: id });
        Swal.close();
        if (response.data.success) {
            Swal.fire({title: 'Info', text: 'Application marked as Unqualified.', icon: 'info'});
            if (viewModal) viewModal.hide();
            loadApprovalQueue(); // Reload to refresh list and filters
        } else {
            Swal.fire({title: 'Error', text: 'Error: ' + response.data.message, icon: 'error'});
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.close();
        Swal.fire({title: 'Error', text: 'Action failed', icon: 'error'});
    }
}
