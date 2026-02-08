// API Configuration
const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainees/';

let viewModal;
let currentQueueData = [];
let unqualifiedData = [];

// Axios Instance Configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const modalEl = document.getElementById('viewApplicationModal');
    if (modalEl) viewModal = new bootstrap.Modal(modalEl);
    
    loadApprovalQueue();
    loadUnqualifiedQueue();

    // Refresh unqualified list when tab is clicked
    document.getElementById('unqualified-tab').addEventListener('click', loadUnqualifiedQueue);

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
            renderQueueTable(response.data.data, 'approvalQueueBody', true);
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
            alert('Error loading queue: ' + response.data.message);
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
            <td><span class="badge bg-${item.status === 'pending' ? 'warning' : 'danger'} text-dark">${item.status}</span></td>
            <td>
                <button class="btn btn-info btn-sm text-white" onclick="viewApplication(${item.enrollment_id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${showActions ? `
                <button class="btn btn-success btn-sm" onclick="qualifyApplication(${item.enrollment_id})" title="Mark as Qualified">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="unqualifyApplication(${item.enrollment_id})" title="Mark as Unqualified">
                    <i class="fas fa-times"></i>
                </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.viewApplication = function(id) {
    // Search in both lists
    const item = currentQueueData.find(i => i.enrollment_id == id) || unqualifiedData.find(i => i.enrollment_id == id);
    if (!item) return;

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

    viewModal.show();
}

window.qualifyApplication = async function(id) {
    if (!confirm('Mark this application as Qualified? It will be sent to the Admin for final approval.')) return;
    
    try {
        const response = await apiClient.post('/role/registrar/trainee_application.php?action=qualify', { 
            enrollment_id: id
        });
        
        if (response.data.success) {
            alert('Application marked as Qualified.');
            loadApprovalQueue();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Action failed');
    }
}

window.unqualifyApplication = async function(id) {
    if (!confirm('Mark this application as Unqualified?')) return;
    
    try {
        const response = await apiClient.post('/role/registrar/trainee_application.php?action=unqualify', { enrollment_id: id });
        if (response.data.success) {
            alert('Application marked as Unqualified.');
            loadApprovalQueue();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Action failed');
    }
}