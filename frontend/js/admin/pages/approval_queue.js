const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;
const UPLOADS_URL = `${window.location.origin}/Hohoo-ville/uploads/trainees/`;

let reviewModal;
let reassignBatchModal;
let currentQueueData = [];
let currentReservedData = [];
let allBatches = [];

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
        if (error.response?.status === 401) window.location.href = '../../../login.html';
        return Promise.reject(error);
    }
);

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
        document.body.classList.remove('overflow-hidden');
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

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (typeof window.logout === 'function') {
            window.logout();
            return;
        }
        localStorage.clear();
        window.location.href = '/Hohoo-ville/frontend/login.html';
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

    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-hide');
            if (modalId === 'reviewModal') reviewModal.hide();
            if (modalId === 'reassignBatchModal') reassignBatchModal.hide();
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

function openReviewModal(id) {
    const item = currentQueueData.find((entry) => String(entry.enrollment_id) === String(id));
    if (!item) return;

    setValue('reviewEnrollmentId', id);

    setText('reviewName', `${item.first_name || ''} ${item.middle_name || ''} ${item.last_name || ''}`.replace(/\s+/g, ' ').trim());
    setText('reviewSex', item.sex || 'N/A');
    setText('reviewCivilStatus', item.civil_status || 'N/A');
    setText('reviewBirthdate', item.birthdate || 'N/A');
    setText('reviewAge', item.age || 'N/A');
    setText('reviewBirthplace', `${item.birthplace_city || ''}, ${item.birthplace_province || ''}`.replace(/^,\s*|,\s*$/g, '') || 'N/A');
    setText('reviewEmail', item.email || 'N/A');
    setText('reviewPhone', item.phone_number || 'N/A');
    setText('reviewAddress', item.address || 'N/A');

    setText('reviewEducation', item.educational_attainment || 'N/A');
    setText('reviewEmploymentStatus', item.employment_status || 'N/A');
    setText('reviewClassification', item.learner_classification ? item.learner_classification.split(',').join(', ') : 'N/A');
    setText('reviewIsPwd', Number(item.is_pwd) === 1 ? 'Yes' : 'No');

    setText('reviewCourse', item.course_name || 'N/A');
    setText('reviewBatch', item.batch_name || 'N/A');

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
        } else {
            photoImg.classList.add('hidden');
            noPhoto.classList.remove('hidden');
        }
    }

    setupDocLink('linkValidId', item.valid_id_file, 'Valid ID', 'fas fa-id-card');
    setupDocLink('linkBirthCert', item.birth_cert_file, 'Birth Certificate', 'fas fa-file-alt');

    reviewModal.show();
}

function setupDocLink(elementId, filename, label, iconClass) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (filename) {
        element.href = `${UPLOADS_URL}${encodeURIComponent(filename)}`;
        element.target = '_blank';
        element.classList.remove('pointer-events-none', 'opacity-50');
        element.innerHTML = `<i class="${iconClass} mr-2"></i> ${label} (Click to View)`;
        return;
    }

    element.href = '#';
    element.target = '';
    element.classList.add('pointer-events-none', 'opacity-50');
    element.innerHTML = `<i class="${iconClass} mr-2"></i> ${label} (Not Uploaded)`;
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
