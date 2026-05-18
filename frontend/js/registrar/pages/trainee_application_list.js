const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/Hohoo-ville/uploads/trainees/';

let viewModal;
let documentPreviewModal;
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
    const documentPreviewEl = document.getElementById('documentPreviewModal');
    if (documentPreviewEl) documentPreviewModal = new SimpleModal(documentPreviewEl);

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

async function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        await ensureSwal();
        
        Swal.fire({
            title: 'Logout Confirmation',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Logout',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/Hohoo-ville/frontend/login.html';
            }
        });
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

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function getFullName(item) {
    return `${item.first_name || ''} ${item.middle_name || ''} ${item.last_name || ''} ${item.extension_name || ''}`
        .replace(/\s+/g, ' ')
        .trim() || 'Unnamed Applicant';
}

function getInitials(name) {
    return String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'NA';
}

function joinLabelParts(parts, fallback = 'N/A') {
    const value = parts
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', ');
    return value || fallback;
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getScholarshipLabel(value) {
    const scholarship = String(value || '').trim();
    return !scholarship || scholarship.toLowerCase() === 'not a scholar'
        ? 'Private / Payee'
        : scholarship;
}

function getFacebookHref(value) {
    const account = String(value || '').trim();
    if (!account) return '';
    if (/^https?:\/\//i.test(account)) return account;
    if (/^www\./i.test(account)) return `https://${account}`;
    if (/facebook\.com/i.test(account)) return `https://${account.replace(/^https?:\/\//i, '')}`;
    return '';
}

function setContactLink(elementId, text, href, enabledClassName) {
    const link = document.getElementById(elementId);
    if (!link) return;

    const value = String(text || '').trim();
    const label = link.querySelector('span');
    if (label) {
        label.textContent = value || 'Not provided';
    } else {
        link.textContent = value || 'Not provided';
    }
    if (href) {
        link.href = href;
        link.target = href.startsWith('http') ? '_blank' : '';
        link.rel = href.startsWith('http') ? 'noopener noreferrer' : '';
        link.className = enabledClassName;
        return;
    }

    link.href = '#';
    link.target = '';
    link.rel = '';
    link.className = 'mt-2 block text-sm font-medium text-slate-500 pointer-events-none';
}

function setBadge(elementId, label, className) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = label;
    element.className = className;
}

function setupApplicationDocumentCard(elementId, filename) {
    const link = document.getElementById(elementId);
    const status = document.getElementById(`${elementId}Status`);
    const action = document.getElementById(`${elementId}Action`);
    if (!link || !status || !action) return;

    const documentLabel = elementId === 'linkValidId' ? 'Valid ID' : 'Birth Certificate';

    if (filename) {
        link.href = '#';
        link.target = '';
        link.rel = '';
        link.className = 'group rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50';
        link.onclick = (event) => {
            event.preventDefault();
            openApplicationDocumentPreview(filename, documentLabel);
        };
        status.textContent = 'Preview submitted file in this window.';
        action.textContent = 'Preview';
        action.className = 'inline-flex shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700';
        return;
    }

    link.href = '#';
    link.target = '';
    link.rel = '';
    link.onclick = null;
    link.className = 'group rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 opacity-80 pointer-events-none';
    status.textContent = 'Not uploaded yet.';
    action.textContent = 'Missing';
    action.className = 'inline-flex shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600';
}

function getApplicationDocumentUrl(filename = '') {
    return `${UPLOADS_URL}${encodeURIComponent(String(filename || '').trim())}`;
}

function getApplicationDocumentExtension(filename = '') {
    const cleaned = String(filename || '').split('/').pop().split('\\').pop();
    const lastDot = cleaned.lastIndexOf('.');
    return lastDot >= 0 ? cleaned.slice(lastDot + 1).toLowerCase() : '';
}

function renderApplicationDocumentPreview(documentUrl, extension, label, filename) {
    const body = document.getElementById('documentPreviewBody');
    if (!body) return;

    const safeUrl = documentUrl;
    const safeLabel = escapeHtml(label || 'Document Preview');
    const safeFilename = escapeHtml(filename || 'Uploaded file');

    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'jfif'].includes(extension)) {
        body.innerHTML = `
            <div class="space-y-4">
                <div class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                    <img src="${safeUrl}" alt="${safeLabel}" class="mx-auto max-h-[68vh] w-auto max-w-full rounded-2xl object-contain">
                </div>
                <p class="text-center text-sm text-slate-500">${safeFilename}</p>
            </div>
        `;
        return;
    }

    if (extension === 'pdf') {
        body.innerHTML = `
            <div class="h-full min-h-[70vh] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <iframe src="${safeUrl}#view=FitH" title="${safeLabel}" class="h-[70vh] w-full border-0"></iframe>
            </div>
        `;
        return;
    }

    body.innerHTML = `
        <div class="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-[24px] border border-amber-200 bg-amber-50 px-6 py-10 text-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm">
                <i class="fas fa-file-circle-question text-2xl"></i>
            </div>
            <h4 class="mt-4 text-lg font-semibold text-slate-900">${safeLabel}</h4>
            <p class="mt-2 break-all text-sm text-slate-600">${safeFilename}</p>
            <p class="mt-3 text-sm text-slate-500">Inline preview is not available for this file type yet. You can still use the button below to open the original file.</p>
        </div>
    `;
}

function openApplicationDocumentPreview(filename, label) {
    const cleanedFilename = String(filename || '').trim();
    if (!cleanedFilename) return;

    const documentUrl = getApplicationDocumentUrl(cleanedFilename);
    const extension = getApplicationDocumentExtension(cleanedFilename);
    const titleEl = document.getElementById('documentPreviewTitle');
    const subtitleEl = document.getElementById('documentPreviewSubtitle');
    const openLinkEl = document.getElementById('documentPreviewOpenLink');

    if (titleEl) titleEl.textContent = label || 'Document Preview';
    if (subtitleEl) subtitleEl.textContent = cleanedFilename;
    if (openLinkEl) openLinkEl.href = documentUrl;

    renderApplicationDocumentPreview(documentUrl, extension, label, cleanedFilename);
    documentPreviewModal?.show();
}

window.viewApplication = function(id, canReview = false) {
    const item = currentQueueData.find(i => i.enrollment_id == id) || unqualifiedData.find(i => i.enrollment_id == id);
    if (!item) return;
    currentViewItem = item;
    currentViewCanReview = !!canReview;

    const fullName = getFullName(item);
    const courseName = item.course_name || 'Not Assigned';
    const batchName = item.batch_name || 'Not Assigned';
    const scholarshipLabel = getScholarshipLabel(item.scholarship_type);
    const applicationStatus = currentViewCanReview
        ? {
            label: 'Pending Qualification',
            className: 'inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white'
        }
        : {
            label: 'Unqualified',
            className: 'inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700'
        };
    const scholarshipBadgeClass = scholarshipLabel === 'Private / Payee'
        ? 'inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white'
        : 'inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700';

    setText('appName', fullName);
    setText('appInitials', getInitials(fullName));
    setText('appProfileSummary', item.course_name ? `${item.course_name} applicant` : 'Trainee applicant');
    setBadge('appApplicationStatus', applicationStatus.label, applicationStatus.className);
    setBadge('appScholarshipBadge', scholarshipLabel, scholarshipBadgeClass);
    setText('appCourseStat', courseName);
    setText('appBatchStat', batchName);
    setText('appAppliedAt', formatDateTime(item.enrollment_date));

    setText('appSex', item.sex || 'N/A');
    setText('appCivilStatus', item.civil_status || 'N/A');
    setText('appBirthdate', item.birthdate || 'N/A');
    setText('appAge', item.age || 'N/A');
    setText('appNationality', item.nationality || 'N/A');
    setText('appBirthplace', joinLabelParts([item.birthplace_city, item.birthplace_province, item.birthplace_region]));
    setText('appAddress', joinLabelParts([item.house_no_street, item.barangay, item.district, item.city_municipality, item.province, item.region]));

    setText('appEmail', item.email || 'Not provided');
    setText('appPhone', item.phone_number || 'Not provided');
    setText('appFacebook', item.facebook_account || 'Not provided');
    setContactLink('appEmailLink', item.email || 'Not provided', item.email ? `mailto:${item.email}` : '', 'mt-2 block break-all text-sm font-semibold text-blue-700 hover:text-blue-800');
    setContactLink('appPhoneLink', item.phone_number || 'Not provided', item.phone_number ? `tel:${String(item.phone_number).replace(/\s+/g, '')}` : '', 'mt-2 block text-sm font-semibold text-slate-900 hover:text-blue-700');
    setContactLink('appFacebookLink', item.facebook_account || 'Not provided', getFacebookHref(item.facebook_account), 'mt-2 block break-all text-sm font-semibold text-slate-900 hover:text-blue-700');

    setText('appEducation', item.educational_attainment || 'N/A');
    setText('appEmploymentStatus', item.employment_status || 'N/A');
    setText('appEmploymentType', item.employment_type || 'N/A');
    setText('appClassification', item.learner_classification ? item.learner_classification.split(',').join(', ') : 'N/A');
    setText('appIsPwd', item.is_pwd == 1 ? 'Yes' : 'No');
    setText('appDisabilityType', item.disability_type || 'N/A');
    setText('appDisabilityCause', item.disability_cause || 'N/A');

    setText('appCourse', courseName);
    setText('appBatch', batchName);
    setText('appScholarship', scholarshipLabel);

    setupApplicationDocumentCard('linkValidId', item.valid_id_file);
    setupApplicationDocumentCard('linkBirthCert', item.birth_cert_file);

    const photo = document.getElementById('appPhoto');
    const noPhoto = document.getElementById('appNoPhoto');
    if (photo && noPhoto) {
        photo.alt = `${fullName} profile photo`;
        if (item.photo_file) {
            photo.src = `${UPLOADS_URL}${encodeURIComponent(item.photo_file)}`;
            photo.classList.remove('hidden');
            noPhoto.classList.add('hidden');
            photo.onerror = function() {
                this.removeAttribute('src');
                this.classList.add('hidden');
                noPhoto.classList.remove('hidden');
            };
        } else {
            photo.removeAttribute('src');
            photo.classList.add('hidden');
            noPhoto.classList.remove('hidden');
        }
    }

    const modalQualifyBtn = document.getElementById('modalQualifyBtn');
    const modalUnqualifyBtn = document.getElementById('modalUnqualifyBtn');
    if (modalQualifyBtn) modalQualifyBtn.classList.toggle('hidden', !currentViewCanReview);
    if (modalUnqualifyBtn) modalUnqualifyBtn.classList.toggle('hidden', !currentViewCanReview);
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
