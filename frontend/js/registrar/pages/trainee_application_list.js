const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/Hohoo-ville/uploads/trainees/';

let viewModal;
let currentQueueData = [];
let unqualifiedData = [];
let currentViewItem = null;
let currentViewCanReview = false;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

class SimpleModal {
    constructor(element) {
        this.element = element;
    }

    show() {
        if (!this.element) return;
        this.element.classList.remove('hidden');
        this.element.classList.add('flex');
        document.body.classList.add('overflow-hidden');
    }

    hide() {
        if (!this.element) return;
        this.element.classList.add('hidden');
        this.element.classList.remove('flex');
        if (!document.querySelector('.modal-root.flex:not(.hidden)')) {
            document.body.classList.remove('overflow-hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    await ensureSwal();
    initSidebar();
    initUserDropdown();
    initLogout();
    initModalDismissers();
    initMainTabs();
    initViewModalTabs();
    hydrateHeaderUser();

    const modalEl = document.getElementById('viewApplicationModal');
    if (modalEl) viewModal = new SimpleModal(modalEl);

    loadApprovalQueue();
    loadUnqualifiedQueue();

    const unqualifiedTab = document.getElementById('unqualified-tab');
    if (unqualifiedTab) unqualifiedTab.addEventListener('click', loadUnqualifiedQueue);

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
});

async function ensureSwal() {
    if (typeof window.Swal !== 'undefined') return;
    await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
    });
}

function hydrateHeaderUser() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userName = document.getElementById('userName');
        if (!userName) return;
        const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.full_name || user.name || user.username || 'Registrar';
        userName.textContent = displayName;
    } catch (error) {
        console.warn('Unable to parse user in localStorage:', error);
    }
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    if (!sidebar) return;

    function openSidebar() {
        sidebar.classList.remove('-translate-x-full');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('hidden');
            requestAnimationFrame(() => sidebarOverlay.classList.remove('opacity-0'));
        }
        document.body.classList.add('overflow-hidden');
    }

    function closeSidebar() {
        sidebar.classList.add('-translate-x-full');
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
        }
        if (!document.querySelector('.modal-root.flex:not(.hidden)')) {
            document.body.classList.remove('overflow-hidden');
        }
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', openSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden', 'opacity-0');
            if (!document.querySelector('.modal-root.flex:not(.hidden)')) {
                document.body.classList.remove('overflow-hidden');
            }
        }
    });
}

function initUserDropdown() {
    const button = document.getElementById('userDropdown');
    const menu = document.getElementById('userDropdownMenu');
    if (!button || !menu) return;

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#userDropdown') && !event.target.closest('#userDropdownMenu')) {
            menu.classList.add('hidden');
        }
    });
}

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../../../login.html';
    });
}

function initModalDismissers() {
    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-hide');
            if (modalId === 'viewApplicationModal' && viewModal) {
                viewModal.hide();
                return;
            }
            const el = document.getElementById(modalId);
            if (!el) return;
            el.classList.add('hidden');
            el.classList.remove('flex');
            if (!document.querySelector('.modal-root.flex:not(.hidden)')) {
                document.body.classList.remove('overflow-hidden');
            }
        });
    });
}

function initMainTabs() {
    const tabButtons = Array.from(document.querySelectorAll('#applicationTabs .tab-btn'));
    const panes = Array.from(document.querySelectorAll('#applicationTabsContent .tab-panel'));
    if (!tabButtons.length || !panes.length) return;

    const setTab = (targetId) => {
        tabButtons.forEach((btn) => {
            const active = btn.getAttribute('data-target') === targetId;
            btn.classList.toggle('bg-blue-600', active);
            btn.classList.toggle('text-white', active);
            btn.classList.toggle('border', !active);
            btn.classList.toggle('border-slate-300', !active);
            btn.classList.toggle('bg-white', !active);
            btn.classList.toggle('text-slate-600', !active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        panes.forEach((pane) => pane.classList.toggle('hidden', pane.id !== targetId));
    };

    tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => setTab(btn.getAttribute('data-target')));
    });

    setTab('pending');
}

function initViewModalTabs() {
    const tabButtons = Array.from(document.querySelectorAll('#viewAppTabs .tab-btn'));
    const panes = Array.from(document.querySelectorAll('#viewAppTabsContent .tab-panel'));
    if (!tabButtons.length || !panes.length) return;

    const setTab = (targetId) => {
        tabButtons.forEach((btn) => {
            const active = btn.getAttribute('data-target') === targetId;
            btn.classList.toggle('bg-blue-600', active);
            btn.classList.toggle('text-white', active);
            btn.classList.toggle('border', !active);
            btn.classList.toggle('border-slate-300', !active);
            btn.classList.toggle('bg-white', !active);
            btn.classList.toggle('text-slate-600', !active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        panes.forEach((pane) => pane.classList.toggle('hidden', pane.id !== targetId));
    };

    tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => setTab(btn.getAttribute('data-target')));
    });

    window.setActiveViewApplicationTab = setTab;
    setTab('viewPersonal');
}

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
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No pending enrollments</td></tr>';
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
            ? `<img src="${UPLOADS_URL}${encodeURIComponent(item.photo_file)}" class="h-10 w-10 rounded-full border border-slate-200 object-cover" alt="Photo">`
            : `<div class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500"><i class="fas fa-user"></i></div>`;
        const actionButtons = `
            <button class="inline-flex items-center rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" type="button" onclick="viewApplication(${item.enrollment_id}, ${showActions ? 'true' : 'false'})" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
        `;
        const appliedAt = formatDateTime(item.enrollment_date);
        row.innerHTML = `
            <td class="px-4 py-3 text-sm">${photoHtml}</td>
            <td class="px-4 py-3 text-sm font-medium text-slate-800">${item.first_name} ${item.last_name}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${courseOrBatch}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${appliedAt}</td>
            <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center">
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
    linkValidId.classList.toggle('pointer-events-none', !item.valid_id_file);
    linkValidId.classList.toggle('opacity-50', !item.valid_id_file);
    
    const linkBirthCert = document.getElementById('linkBirthCert');
    linkBirthCert.href = item.birth_cert_file ? UPLOADS_URL + encodeURIComponent(item.birth_cert_file) : '#';
    linkBirthCert.classList.toggle('pointer-events-none', !item.birth_cert_file);
    linkBirthCert.classList.toggle('opacity-50', !item.birth_cert_file);

    const photo = document.getElementById('appPhoto');
    const noPhoto = document.getElementById('appNoPhoto');
    photo.src = item.photo_file ? UPLOADS_URL + encodeURIComponent(item.photo_file) : '';
    photo.onerror = function() {
        this.classList.add('hidden');
        noPhoto.classList.remove('hidden');
    };
    photo.classList.toggle('hidden', !item.photo_file);
    noPhoto.classList.toggle('hidden', !!item.photo_file);

    const modalQualifyBtn = document.getElementById('modalQualifyBtn');
    const modalUnqualifyBtn = document.getElementById('modalUnqualifyBtn');
    if (modalQualifyBtn) modalQualifyBtn.classList.toggle('hidden', !currentViewCanReview);
    if (modalUnqualifyBtn) modalUnqualifyBtn.classList.toggle('hidden', !currentViewCanReview);

    if (typeof window.setActiveViewApplicationTab === 'function') {
        window.setActiveViewApplicationTab('viewPersonal');
    }
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
