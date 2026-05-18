const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;
const UPLOADS_URL = `${window.location.origin}/Hohoo-ville/uploads/trainees/`;

let reviewModal;
let reassignBatchModal;
let documentPreviewModal;
let currentQueueData = [];
let currentReservedData = [];
let allBatches = [];
let openModalCount = 0;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) window.location.href = '/Hohoo-ville/frontend/login.html';
        return Promise.reject(error);
    }
);

class SimpleModal {
    constructor(element) {
        this.element = element;
    }

    show() {
        if (!this.element || !this.element.classList.contains('hidden')) return;
        this.element.classList.remove('hidden');
        this.element.classList.add('flex');
        openModalCount += 1;
        document.body.classList.add('overflow-hidden');
    }

    hide() {
        if (!this.element || this.element.classList.contains('hidden')) return;
        this.element.classList.add('hidden');
        this.element.classList.remove('flex');
        openModalCount = Math.max(0, openModalCount - 1);
        if (openModalCount === 0) {
            document.body.classList.remove('overflow-hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await ensureSwal();
    initUserDropdown();
    initLogout();
    initTabs();
    initModals();

    loadApprovalQueue();
    loadReservedQueue();
    loadAllBatches();

    bindActions();
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
                if (typeof window.logout === 'function') {
                    window.logout();
                    return;
                }
                localStorage.clear();
                window.location.href = '/Hohoo-ville/frontend/login.html';
            }
        });
    });
}

function initTabs() {
    initTabGroup('main', '.tab-main-pane');
    initTabGroup('review', '.tab-review-pane');
}

function initTabGroup(groupName, paneSelector) {
    const buttons = Array.from(document.querySelectorAll(`[data-tab-group="${groupName}"]`));
    const panes = Array.from(document.querySelectorAll(paneSelector));
    if (!buttons.length || !panes.length) return;

    const activate = (button) => {
        buttons.forEach((btn) => setTabButtonState(btn, btn === button));
        const targetSelector = button.getAttribute('data-tab-target');
        panes.forEach((pane) => pane.classList.add('hidden'));
        const targetPane = targetSelector ? document.querySelector(targetSelector) : null;
        if (targetPane) targetPane.classList.remove('hidden');
    };

    buttons.forEach((button) => button.addEventListener('click', () => activate(button)));
    const initial = buttons.find((button) => button.classList.contains('active')) || buttons[0];
    activate(initial);
}

function setTabButtonState(button, isActive) {
    button.classList.toggle('active', isActive);
    button.classList.toggle('bg-blue-600', isActive);
    button.classList.toggle('text-white', isActive);

    button.classList.toggle('border', !isActive);
    button.classList.toggle('border-slate-300', !isActive);
    button.classList.toggle('bg-white', !isActive);
    button.classList.toggle('text-slate-700', !isActive);
    button.classList.toggle('hover:bg-slate-50', !isActive);
}

function initModals() {
    reviewModal = new SimpleModal(document.getElementById('reviewModal'));
    reassignBatchModal = new SimpleModal(document.getElementById('reassignBatchModal'));
    documentPreviewModal = new SimpleModal(document.getElementById('documentPreviewModal'));

    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-hide');
            if (modalId === 'reviewModal') reviewModal.hide();
            if (modalId === 'reassignBatchModal') reassignBatchModal.hide();
            if (modalId === 'documentPreviewModal') documentPreviewModal.hide();
        });
    });
}

function bindActions() {
    const approveBtn = document.getElementById('btnApprove');
    const reserveBtn = document.getElementById('btnReserve');
    const rejectBtn = document.getElementById('btnReject');
    const confirmReassignBtn = document.getElementById('btnConfirmReassignment');

    if (approveBtn) {
        approveBtn.addEventListener('click', () => {
            const id = document.getElementById('reviewEnrollmentId')?.value;
            if (id) approveEnrollment(id);
        });
    }

    if (reserveBtn) {
        reserveBtn.addEventListener('click', () => {
            const id = document.getElementById('reviewEnrollmentId')?.value;
            if (id) reserveEnrollment(id);
        });
    }

    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => {
            const id = document.getElementById('reviewEnrollmentId')?.value;
            if (id) rejectEnrollment(id);
        });
    }

    if (confirmReassignBtn) {
        confirmReassignBtn.addEventListener('click', () => {
            const enrollmentId = document.getElementById('reassignEnrollmentId')?.value;
            const newBatchId = document.getElementById('reassignBatchSelect')?.value;
            submitReassignment(enrollmentId, newBatchId);
        });
    }

    const pendingBody = document.getElementById('approvalQueueBody');
    if (pendingBody) {
        pendingBody.addEventListener('click', (event) => {
            const reviewBtn = event.target.closest('.review-btn');
            if (!reviewBtn) return;
            const enrollmentId = reviewBtn.getAttribute('data-id');
            if (enrollmentId) openReviewModal(enrollmentId);
        });
    }

    const reservedBody = document.getElementById('reservedQueueBody');
    if (reservedBody) {
        reservedBody.addEventListener('click', (event) => {
            const assignBtn = event.target.closest('.assign-batch-btn');
            if (!assignBtn) return;
            openReassignModal(
                assignBtn.getAttribute('data-enrollment-id'),
                assignBtn.getAttribute('data-qualification-id'),
                assignBtn.getAttribute('data-trainee-name'),
                assignBtn.getAttribute('data-course-name')
            );
        });
    }

    const reservedTab = document.getElementById('reserved-tab');
    if (reservedTab) reservedTab.addEventListener('click', loadReservedQueue);
}

async function loadAllBatches() {
    try {
        const response = await axios.get(`${API_BASE_URL}/public/submit_application.php?action=get-options`);
        if (response.data.success) allBatches = response.data.data?.batches || [];
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

async function loadApprovalQueue() {
    try {
        const response = await apiClient.get('/role/admin/approval_queue.php?action=list');
        if (!response.data.success) {
            showAlert(`Error loading queue: ${response.data.message || 'Unknown error'}`, 'danger');
            return;
        }
        currentQueueData = response.data.data || [];
        renderQueueTable(currentQueueData);
    } catch (error) {
        console.error('Error loading approval queue:', error);
        showAlert('Failed to load approval queue.', 'danger');
    }
}

async function loadReservedQueue() {
    try {
        const response = await apiClient.get('/role/admin/approval_queue.php?action=list_reserved');
        if (!response.data.success) {
            showAlert(`Error loading reserved queue: ${response.data.message || 'Unknown error'}`, 'danger');
            return;
        }
        currentReservedData = response.data.data || [];
        renderReservedTable(currentReservedData);
    } catch (error) {
        console.error('Error loading reserved queue:', error);
        showAlert('Failed to load reserved queue.', 'danger');
    }
}

function renderQueueTable(data) {
    const tbody = document.getElementById('approvalQueueBody');
    if (!tbody) return;

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No pending enrollments</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((item) => `
        <tr class="hover:bg-slate-50">
            <td class="px-3 py-3 text-sm">${renderPhoto(item.photo_file)}</td>
            <td class="px-3 py-3 text-sm text-slate-900">${escapeHtml(`${item.first_name || ''} ${item.last_name || ''}`.trim())}</td>
            <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(formatCourseBatch(item.course_name, item.batch_name))}</td>
            <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(item.enrollment_date || 'N/A')}</td>
            <td class="px-3 py-3 text-sm">
                <button class="review-btn inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100" data-id="${item.enrollment_id}">
                    <i class="fas fa-search"></i> Review
                </button>
            </td>
        </tr>
    `).join('');
}

function renderReservedTable(data) {
    const tbody = document.getElementById('reservedQueueBody');
    if (!tbody) return;

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No reserved trainees</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((item) => `
        <tr class="hover:bg-slate-50">
            <td class="px-3 py-3 text-sm">${renderPhoto(item.photo_file)}</td>
            <td class="px-3 py-3 text-sm text-slate-900">${escapeHtml(`${item.first_name || ''} ${item.last_name || ''}`.trim())}</td>
            <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(formatCourseBatch(item.course_name, item.batch_name))}</td>
            <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(item.enrollment_date || 'N/A')}</td>
            <td class="px-3 py-3 text-sm">
                <button class="assign-batch-btn inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    data-enrollment-id="${item.enrollment_id}"
                    data-qualification-id="${item.qualification_id}"
                    data-trainee-name="${escapeHtml(`${item.first_name || ''} ${item.last_name || ''}`.trim())}"
                    data-course-name="${escapeHtml(item.course_name || '')}">
                    <i class="fas fa-random"></i> Assign Batch
                </button>
            </td>
        </tr>
    `).join('');
}

function renderPhoto(photoFile) {
    if (photoFile) {
        return `<img src="${UPLOADS_URL}${encodeURIComponent(photoFile)}" class="h-10 w-10 rounded-full border border-slate-200 object-cover" alt="Trainee Photo">`;
    }
    return '<div class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500"><i class="fas fa-user"></i></div>';
}

function formatCourseBatch(courseName, batchName) {
    if (courseName && batchName) return `${courseName} / ${batchName}`;
    if (courseName) return courseName;
    if (batchName) return batchName;
    return 'N/A';
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

function setBadge(id, label, className) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = label;
    element.className = className;
}

function openReviewModal(id) {
    const item = currentQueueData.find((entry) => String(entry.enrollment_id) === String(id));
    if (!item) return;

    setValue('reviewEnrollmentId', id);
    const fullName = getFullName(item);
    const courseName = item.course_name || 'Not Assigned';
    const batchName = item.batch_name || 'Not Assigned';
    const scholarshipLabel = getScholarshipLabel(item.scholarship_type);

    setText('reviewName', fullName);
    setText('reviewInitials', getInitials(fullName));
    setText('reviewProfileSummary', item.course_name ? `${item.course_name} applicant` : 'Trainee applicant');
    setBadge('reviewQueueStatus', 'Pending Review', 'inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white');
    setBadge(
        'reviewScholarshipBadge',
        scholarshipLabel,
        scholarshipLabel === 'Private / Payee'
            ? 'inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white'
            : 'inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700'
    );
    setText('reviewCourseStat', courseName);
    setText('reviewBatchStat', batchName);
    setText('reviewAppliedAt', formatDateTime(item.enrollment_date));

    setText('reviewSex', item.sex || 'N/A');
    setText('reviewCivilStatus', item.civil_status || 'N/A');
    setText('reviewNationality', item.nationality || 'N/A');
    setText('reviewBirthdate', item.birthdate || 'N/A');
    setText('reviewAge', item.age || 'N/A');
    setText('reviewBirthplace', joinLabelParts([item.birthplace_city, item.birthplace_province, item.birthplace_region]));
    setText('reviewAddress', item.address || joinLabelParts([item.house_no_street, item.barangay, item.district, item.city_municipality, item.province, item.region]));

    setText('reviewEmail', item.email || 'Not provided');
    setText('reviewPhone', item.phone_number || 'Not provided');
    setText('reviewFacebook', item.facebook_account || 'Not provided');
    setContactLink('reviewEmailLink', item.email || 'Not provided', item.email ? `mailto:${item.email}` : '', 'mt-2 block break-all text-sm font-semibold text-blue-700 hover:text-blue-800');
    setContactLink('reviewPhoneLink', item.phone_number || 'Not provided', item.phone_number ? `tel:${String(item.phone_number).replace(/\s+/g, '')}` : '', 'mt-2 block text-sm font-semibold text-slate-900 hover:text-blue-700');
    setContactLink('reviewFacebookLink', item.facebook_account || 'Not provided', getFacebookHref(item.facebook_account), 'mt-2 block break-all text-sm font-semibold text-slate-900 hover:text-blue-700');

    setText('reviewEducation', item.educational_attainment || 'N/A');
    setText('reviewEmploymentStatus', item.employment_status || 'N/A');
    setText('reviewEmploymentType', item.employment_type || 'N/A');
    setText('reviewClassification', item.learner_classification ? item.learner_classification.split(',').join(', ') : 'N/A');
    setText('reviewIsPwd', Number(item.is_pwd) === 1 ? 'Yes' : 'No');
    setText('reviewDisabilityType', item.disability_type || 'N/A');
    setText('reviewDisabilityCause', item.disability_cause || 'N/A');

    setText('reviewCourse', courseName);
    setText('reviewBatch', batchName);
    setText('reviewScholarshipText', scholarshipLabel);

    const scholarshipSelect = document.getElementById('scholarshipSelect');
    if (scholarshipSelect) {
        scholarshipSelect.value = item.scholarship_type === 'Not a Scholar' ? '' : (item.scholarship_type || '');
    }

    const photoImg = document.getElementById('reviewPhoto');
    const noPhoto = document.getElementById('reviewNoPhoto');
    if (photoImg && noPhoto) {
        if (item.photo_file) {
            photoImg.src = `${UPLOADS_URL}${encodeURIComponent(item.photo_file)}`;
            photoImg.classList.remove('hidden');
            noPhoto.classList.add('hidden');
            photoImg.alt = `${fullName} profile photo`;
            photoImg.onerror = () => {
                photoImg.removeAttribute('src');
                photoImg.classList.add('hidden');
                noPhoto.classList.remove('hidden');
            };
        } else {
            photoImg.removeAttribute('src');
            photoImg.classList.add('hidden');
            noPhoto.classList.remove('hidden');
        }
    }

    setupDocLink('linkValidId', item.valid_id_file);
    setupDocLink('linkBirthCert', item.birth_cert_file);

    reviewModal.show();
}

function setupDocLink(elementId, filename) {
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

async function approveEnrollment(id) {
    const scholarship = document.getElementById('scholarshipSelect')?.value || '';

    const result = await Swal.fire({
        title: 'Approve Enrollment?',
        text: 'Confirm approval for this trainee?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Approve'
    });
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

        if (!response.data.success) {
            showAlert(`Error: ${response.data.message || 'Unknown error'}`, 'danger');
            return;
        }

        Swal.fire('Approved!', 'Enrollment approved successfully', 'success');
        reviewModal.hide();
        loadApprovalQueue();
    } catch (error) {
        console.error('Error approving enrollment:', error);
        Swal.close();
        showAlert(`Error: ${error.response?.data?.message || error.message || 'Error approving enrollment'}`, 'danger');
    }
}

async function reserveEnrollment(id) {
    const result = await Swal.fire({
        title: 'Reserve Application',
        input: 'text',
        inputLabel: 'Reason for reserving (e.g., current batch is full)',
        inputPlaceholder: 'Enter reason...',
        showCancelButton: true,
        confirmButtonText: 'Yes, Reserve',
        inputValidator: (value) => (!value ? 'A reason is required to reserve an application!' : undefined)
    });

    const reason = result.value;
    if (!reason) return;

    try {
        Swal.fire({
            title: 'Please wait',
            text: 'Sending email...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await apiClient.post('/role/admin/approval_queue.php?action=reserve', {
            enrollment_id: id,
            rejection_reason: reason
        });
        Swal.close();

        if (!response.data.success) {
            showAlert(`Error: ${response.data.message || 'Unknown error'}`, 'danger');
            return;
        }

        Swal.fire('Reserved', 'Application has been moved to the reserved list.', 'info');
        reviewModal.hide();
        loadApprovalQueue();
        loadReservedQueue();
    } catch (error) {
        console.error('Error reserving enrollment:', error);
        Swal.close();
        showAlert(`Error: ${error.response?.data?.message || 'Action failed'}`, 'danger');
    }
}

async function rejectEnrollment(id) {
    const result = await Swal.fire({
        title: 'Reject Enrollment',
        input: 'text',
        inputLabel: 'Please enter the reason for rejection:',
        inputPlaceholder: 'Reason...',
        showCancelButton: true,
        inputValidator: (value) => (!value || value.trim() === '' ? 'A rejection reason is required!' : undefined)
    });

    const reason = result.value;
    if (!reason) return;

    try {
        Swal.fire({
            title: 'Please wait',
            text: 'Sending email...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await apiClient.post('/role/admin/approval_queue.php?action=reject', {
            enrollment_id: id,
            rejection_reason: reason
        });
        Swal.close();

        if (!response.data.success) {
            showAlert(`Error: ${response.data.message || 'Unknown error'}`, 'danger');
            return;
        }

        Swal.fire('Rejected', 'Enrollment rejected successfully', 'info');
        reviewModal.hide();
        loadApprovalQueue();
    } catch (error) {
        console.error('Error rejecting enrollment:', error);
        Swal.close();
        showAlert(`Error: ${error.response?.data?.message || error.message || 'Error rejecting enrollment'}`, 'danger');
    }
}

function openReassignModal(enrollmentId, qualificationId, traineeName, courseName) {
    setValue('reassignEnrollmentId', enrollmentId);
    setValue('reassignQualificationId', qualificationId);
    setText('reassignTraineeName', traineeName || '');
    setText('reassignCourseName', courseName || '');

    const batchSelect = document.getElementById('reassignBatchSelect');
    if (!batchSelect) return;

    const relevantBatches = allBatches.filter((batch) => String(batch.qualification_id) === String(qualificationId));
    batchSelect.innerHTML = '<option value="">Select a batch</option>';

    if (relevantBatches.length) {
        relevantBatches.forEach((batch) => {
            batchSelect.insertAdjacentHTML('beforeend', `<option value="${batch.batch_id}">${escapeHtml(batch.batch_name || 'Unnamed Batch')}</option>`);
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

    const result = await Swal.fire({
        title: 'Confirm Reassignment',
        text: 'This will approve the trainee and assign them to the selected batch. Continue?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Assign & Approve'
    });
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

        if (!response.data.success) {
            Swal.fire('Error', response.data.message || 'An unknown error occurred.', 'error');
            return;
        }

        Swal.fire('Success!', 'Trainee has been assigned and approved.', 'success');
        reassignBatchModal.hide();
        loadReservedQueue();
        loadApprovalQueue();
    } catch (error) {
        console.error('Error reassigning batch:', error);
        Swal.close();
        Swal.fire('Error', error.response?.data?.message || 'Failed to reassign batch.', 'error');
    }
}

function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function showAlert(message, type) {
    const icon = type === 'danger' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info';
    if (window.Swal) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            timer: 3500,
            showConfirmButton: false,
            icon,
            title: message
        });
        return;
    }
    alert(message);
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

window.openReassignModal = openReassignModal;
