const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;
const UPLOADS_URL = `${window.location.origin}/Hohoo-ville/uploads/trainees/`;

let accountModal;
let profileModal;
let documentModal;
let sendingModal;
let traineesData = [];
let documentZoom = 1;

function refreshBodyScrollLock() {
    const hasOpenModal = Array.from(document.querySelectorAll('[id$="Modal"]')).some((element) => {
        return element.classList.contains('flex') && !element.classList.contains('hidden');
    });

    document.body.classList.toggle('overflow-hidden', hasOpenModal);
}

class SimpleModal {
    constructor(element) {
        this.element = element;
    }

    show() {
        if (!this.element) return;
        this.element.classList.remove('hidden');
        this.element.classList.add('flex');
        this.element.setAttribute('aria-hidden', 'false');
        refreshBodyScrollLock();
    }

    hide() {
        if (!this.element) return;
        this.element.classList.add('hidden');
        this.element.classList.remove('flex');
        this.element.setAttribute('aria-hidden', 'true');
        if (this.element.id === 'documentModal') {
            resetDocumentPreview();
        }
        refreshBodyScrollLock();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await ensureSwal();
    initUserDropdown();
    initTraineeActionMenus();
    initLogout();
    initModals();
    initDocumentZoomControls();
    initFilterStatusHandlers();
    loadTrainees();

    const form = document.getElementById('createAccountForm');
    if (form) form.addEventListener('submit', handleCreateAccount);
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

function initModals() {
    accountModal = new SimpleModal(document.getElementById('createAccountModal'));
    profileModal = new SimpleModal(document.getElementById('viewProfileModal'));
    documentModal = new SimpleModal(document.getElementById('documentModal'));
    sendingModal = new SimpleModal(document.getElementById('sendingEmailModal'));

    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-hide');
            if (modalId === 'createAccountModal' && accountModal) accountModal.hide();
            if (modalId === 'viewProfileModal' && profileModal) profileModal.hide();
            if (modalId === 'documentModal' && documentModal) documentModal.hide();
        });
    });
}

function initTraineeActionMenus() {
    document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-trainee-actions-wrapper]')) {
            closeTraineeActionMenus();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeTraineeActionMenus();
        }
    });
}

function closeTraineeActionMenus() {
    document.querySelectorAll('[data-trainee-actions-menu]').forEach((menu) => {
        menu.classList.add('hidden');
    });

    document.querySelectorAll('[data-trainee-actions-toggle]').forEach((button) => {
        button.setAttribute('aria-expanded', 'false');
    });
}

function toggleTraineeActionMenu(event, traineeId) {
    event.preventDefault();
    event.stopPropagation();

    const menu = document.querySelector(`[data-trainee-actions-menu="${traineeId}"]`);
    const button = document.querySelector(`[data-trainee-actions-toggle="${traineeId}"]`);
    if (!menu || !button) return;

    const shouldOpen = menu.classList.contains('hidden');
    closeTraineeActionMenus();

    if (shouldOpen) {
        menu.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
    }
}

function initDocumentZoomControls() {
    const zoomInBtn = document.getElementById('docZoomInBtn');
    const zoomOutBtn = document.getElementById('docZoomOutBtn');
    const zoomResetBtn = document.getElementById('docZoomResetBtn');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => setDocumentZoom(documentZoom + 0.1));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => setDocumentZoom(documentZoom - 0.1));
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => setDocumentZoom(1));
}

function initFilterStatusHandlers() {
    ['searchInput', 'batchFilter', 'qualificationFilter', 'statusFilter'].forEach((id) => {
        const element = document.getElementById(id);
        if (!element) return;
        const eventName = element.tagName === 'SELECT' ? 'change' : 'input';
        element.addEventListener(eventName, updateFilterStatus);
    });

    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', updateFilterStatus);
}

async function loadTrainees() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainees.php?action=list`);
        if (!response.data.success) {
            Swal.fire('Error', `Error loading trainees: ${response.data.message || 'Unknown error'}`, 'error');
            return;
        }
        traineesData = response.data.data || [];
        populateBatchFilter(traineesData);
        populateQualificationFilter(traineesData);
        renderTraineesTable(traineesData);
    } catch (error) {
        console.error('Error loading trainees:', error);
        Swal.fire('Error', `Failed to load trainees: ${error.message}`, 'error');
    }
}

function getFullName(trainee) {
    const firstName = String(trainee?.first_name || '').trim();
    const lastName = String(trainee?.last_name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'Unnamed Trainee';
}

function getInitials(name) {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (parts.length === 0) return 'NA';
    return parts.map((part) => part.charAt(0)).join('').toUpperCase();
}

function getEnrollmentLabel(trainee) {
    return trainee?.formatted_enrollment_date || trainee?.enrollment_date || 'Not Available';
}

function getProgramLabel(trainee) {
    return trainee?.course_name || 'Not Assigned';
}

function getTraineeImageUrl(trainee) {
    const imageFile = trainee?.profile_image || trainee?.photo_file;
    if (!imageFile) return '';

    const imagePath = String(imageFile).startsWith('photo_') ? 'trainees' : 'profile_images';
    return `${window.location.origin}/Hohoo-ville/uploads/${imagePath}/${encodeURIComponent(imageFile)}`;
}

function getStatusMeta(status) {
    const normalizedStatus = String(status || 'unknown').toLowerCase();

    if (normalizedStatus === 'active') {
        return {
            label: 'Active',
            className: 'inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-white'
        };
    }

    if (normalizedStatus === 'inactive') {
        return {
            label: 'Inactive',
            className: 'inline-flex rounded-full border border-white/20 bg-slate-900/20 px-3 py-1 text-xs font-semibold text-white'
        };
    }

    return {
        label: 'Unknown',
        className: 'inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white'
    };
}

function getAccountMeta(trainee) {
    if (trainee?.user_id) {
        return {
            badgeLabel: 'Account Ready',
            badgeClassName: 'inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-white',
            detail: 'A login account is already linked to this trainee profile.'
        };
    }

    return {
        badgeLabel: 'Setup Pending',
        badgeClassName: 'inline-flex rounded-full border border-amber-200/30 bg-amber-300/20 px-3 py-1 text-xs font-semibold text-white',
        detail: 'No login account has been created for this trainee yet.'
    };
}

function setContactLink(elementId, text, href, enabledClassName) {
    const link = document.getElementById(elementId);
    if (!link) return;

    if (text && href) {
        link.href = href;
        link.className = enabledClassName;
        return;
    }

    link.href = '#';
    link.className = 'mt-2 block cursor-default text-sm font-semibold text-slate-400 pointer-events-none';
}

function setDocumentZoom(value) {
    const zoomLayer = document.getElementById('documentZoomLayer');
    const zoomLabel = document.getElementById('docZoomLabel');
    if (!zoomLayer) return;

    documentZoom = Math.max(0.5, Math.min(3, Number(value.toFixed(2))));
    zoomLayer.style.transform = `scale(${documentZoom})`;
    if (zoomLabel) zoomLabel.textContent = `${Math.round(documentZoom * 100)}%`;
}

function resetDocumentPreview() {
    const imageEl = document.getElementById('documentPreviewImage');
    const frameEl = document.getElementById('documentPreviewFrame');
    const fallbackEl = document.getElementById('documentPreviewFallback');
    const downloadLink = document.getElementById('documentPreviewDownloadLink');
    const openBtn = document.getElementById('docOpenNewTabBtn');

    if (imageEl) {
        imageEl.classList.add('hidden');
        imageEl.removeAttribute('src');
        imageEl.onerror = null;
    }

    if (frameEl) {
        frameEl.classList.add('hidden');
        frameEl.removeAttribute('src');
        frameEl.onerror = null;
    }

    if (fallbackEl) fallbackEl.classList.add('hidden');
    if (downloadLink) downloadLink.setAttribute('href', '#');
    if (openBtn) openBtn.setAttribute('href', '#');

    setDocumentZoom(1);
}

function openDocumentModal(url, title) {
    if (!documentModal || !url) return;

    const modalTitle = document.getElementById('documentModalTitle');
    const openBtn = document.getElementById('docOpenNewTabBtn');
    const imageEl = document.getElementById('documentPreviewImage');
    const frameEl = document.getElementById('documentPreviewFrame');
    const fallbackEl = document.getElementById('documentPreviewFallback');
    const downloadLink = document.getElementById('documentPreviewDownloadLink');

    resetDocumentPreview();

    if (modalTitle) modalTitle.textContent = title || 'Submitted Document';
    if (openBtn) openBtn.href = url;
    if (downloadLink) downloadLink.href = url;

    const cleanUrl = url.split('?')[0].toLowerCase();
    const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg|avif)$/i.test(cleanUrl);
    const isPdf = /\.pdf$/i.test(cleanUrl);
    const likelyUnsupportedInline = /\.(doc|docx|ppt|pptx|xls|xlsx|csv)$/i.test(cleanUrl);

    if (isImage && imageEl) {
        imageEl.src = url;
        imageEl.classList.remove('hidden');
        imageEl.onerror = () => {
            imageEl.classList.add('hidden');
            if (fallbackEl) fallbackEl.classList.remove('hidden');
        };
    } else if (isPdf && frameEl) {
        frameEl.src = url;
        frameEl.classList.remove('hidden');
    } else if (likelyUnsupportedInline) {
        if (fallbackEl) fallbackEl.classList.remove('hidden');
    } else if (frameEl) {
        frameEl.src = url;
        frameEl.classList.remove('hidden');
        frameEl.onerror = () => {
            frameEl.classList.add('hidden');
            if (fallbackEl) fallbackEl.classList.remove('hidden');
        };
    } else if (fallbackEl) {
        fallbackEl.classList.remove('hidden');
    }

    documentModal.show();
}

function renderTraineesTable(data) {
    const tbody = document.getElementById('traineesTableBody');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="px-4 py-6 text-center text-sm text-slate-500">No trainees found</td></tr>';
        return;
    }

    const html = data.map((trainee, index) => {
        const statusBadge = trainee.status === 'active'
            ? '<span class="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">active</span>'
            : '<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">inactive</span>';

        const enrolledDate = trainee.formatted_enrollment_date 
            ? trainee.formatted_enrollment_date 
            : (trainee.enrollment_date || 'N/A');

        const qualification = trainee.course_name || '<span class="text-slate-400">Not Assigned</span>';

        // Profile image with fallback to avatar
        let profileImageHtml = '';
        let imageFile = trainee.profile_image || trainee.photo_file;
        if (imageFile) {
            const isPhotoFile = imageFile.startsWith('photo_');
            const imagePath = isPhotoFile ? 'trainees' : 'profile_images';
            const avatarUrl = `${window.location.origin}/hohoo-ville/uploads/${imagePath}/${imageFile}`;
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(trainee.first_name || 'User')}&background=2563eb&color=ffffff&size=32`;
            profileImageHtml = `<img src="${avatarUrl}" alt="Profile" class="h-8 w-8 rounded-full border border-slate-200 object-cover" onerror="this.src='${fallbackAvatar}'" />`;
        } else if (trainee.first_name) {
            profileImageHtml = `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(trainee.first_name)}&background=2563eb&color=ffffff&size=32" alt="Avatar" class="h-8 w-8 rounded-full border border-slate-200 object-cover" />`;
        } else {
            profileImageHtml = `<div class="h-8 w-8 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center"><i class="fas fa-user text-slate-400 text-xs"></i></div>`;
        }

        const accountMenuItem = trainee.user_id
            ? `
                <div class="px-3 py-3">
                    <span class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <i class="fas fa-check"></i> Account Active
                    </span>
                </div>
            `
            : `
                <button
                    type="button"
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                    onclick="closeTraineeActionMenus(); openAccountModal(${trainee.trainee_id})"
                >
                    <i class="fas fa-key w-4 text-center text-blue-500"></i>
                    <span>Create Account</span>
                </button>
            `;
        const menuPositionClasses = data.length > 3 && data.length - index <= 3
            ? 'bottom-full right-0 mb-2 origin-bottom-right'
            : 'top-full right-0 mt-2 origin-top-right';

        return `
            <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(trainee.trainee_school_id || 'N/A')}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${profileImageHtml}</td>
                <td class="px-3 py-3 text-sm text-slate-900">${escapeHtml(`${trainee.last_name || ''}, ${trainee.first_name || ''}`)}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(trainee.email || 'N/A')}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(trainee.phone_number || '-')}</td>
                <td class="px-3 py-3 text-sm text-slate-700" data-filter-value="${escapeHtml(String(trainee.batch_id || ''))}">
                    ${trainee.batch_name ? escapeHtml(trainee.batch_name) : '<span class="text-slate-400">Not Enrolled</span>'}
                </td>
                <td class="px-3 py-3 text-sm text-slate-700" data-filter-value="${escapeHtml(String(trainee.course_name || ''))}">
                    ${qualification}
                </td>
                <td class="px-3 py-3 text-sm text-slate-600">${enrolledDate}</td>
                <td class="px-3 py-3 text-sm" data-filter-value="${escapeHtml(String(trainee.status || ''))}">
                    ${statusBadge}
                </td>
                <td class="px-3 py-3 text-sm">
                    <div class="relative flex justify-center" data-trainee-actions-wrapper>
                        <button
                            type="button"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            data-trainee-actions-toggle="${trainee.trainee_id}"
                            aria-haspopup="true"
                            aria-expanded="false"
                            aria-controls="traineeActionsMenu-${trainee.trainee_id}"
                            aria-label="Open trainee actions"
                            onclick="toggleTraineeActionMenu(event, ${trainee.trainee_id})"
                        >
                            <i class="fas fa-ellipsis-vertical"></i>
                        </button>
                        <div
                            id="traineeActionsMenu-${trainee.trainee_id}"
                            class="absolute z-30 hidden w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80 ${menuPositionClasses}"
                            data-trainee-actions-menu="${trainee.trainee_id}"
                        >
                            <div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Actions
                            </div>
                            ${accountMenuItem}
                            <div class="border-t border-slate-100"></div>
                            <button
                                type="button"
                                class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                                onclick="closeTraineeActionMenus(); viewProfile(${trainee.trainee_id})"
                            >
                                <i class="fas fa-eye w-4 text-center text-blue-500"></i>
                                <span>View Profile</span>
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = html;
    
    updateFilterStatus();
}

function populateBatchFilter(data) {
    const select = document.getElementById('batchFilter');
    if (!select) return;

    const currentValue = select.value;
    const batches = new Map();
    (data || []).forEach((item) => {
        if (!item.batch_id || !item.batch_name) return;
        if (!batches.has(item.batch_id)) {
            batches.set(item.batch_id, item.batch_name);
        }
    });

    select.innerHTML = '';
    select.insertAdjacentHTML('beforeend', '<option value="">All Batches</option>');

    Array.from(batches.entries())
        .sort((a, b) => String(a[1]).localeCompare(String(b[1]), undefined, { sensitivity: 'base' }))
        .forEach(([id, name]) => {
            const option = document.createElement('option');
            option.value = String(id);
            option.textContent = name;
            select.appendChild(option);
        });

    if (currentValue && Array.from(select.options).some((option) => option.value === currentValue)) {
        select.value = currentValue;
    }
}

function populateQualificationFilter(data) {
    const select = document.getElementById('qualificationFilter');
    if (!select) return;

    const currentValue = select.value;
    const qualifications = new Map();
    (data || []).forEach((item) => {
        if (!item.course_name) return;
        if (!qualifications.has(item.course_name)) {
            qualifications.set(item.course_name, item.course_name);
        }
    });

    select.innerHTML = '';
    select.insertAdjacentHTML('beforeend', '<option value="">All Programs</option>');

    Array.from(qualifications.values())
        .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }))
        .forEach((name) => {
            const option = document.createElement('option');
            option.value = String(name).toLowerCase();
            option.textContent = name;
            select.appendChild(option);
        });

    if (currentValue && Array.from(select.options).some((option) => option.value === currentValue)) {
        select.value = currentValue;
    }
}

function openAccountModal(id) {
    setValue('accountTraineeId', id);
    const form = document.getElementById('createAccountForm');
    if (form) form.reset();
    if (accountModal) accountModal.show();
}

async function handleCreateAccount(event) {
    event.preventDefault();
    const username = String(document.getElementById('accountUsername')?.value || '').trim();
    const password = String(document.getElementById('accountPassword')?.value || '');

    if (!/^[A-Za-z0-9_]+$/.test(username)) {
        Swal.fire('Invalid Username', 'Use letters, numbers, and underscores only.', 'warning');
        return;
    }

    const payload = {
        trainee_id: document.getElementById('accountTraineeId')?.value,
        username,
        password
    };

    try {
        if (sendingModal) sendingModal.show();
        const response = await axios.post(`${API_BASE_URL}/role/admin/trainees.php?action=create-account`, payload);
        if (sendingModal) sendingModal.hide();

        if (!response.data.success) {
            Swal.fire('Error', `Error: ${response.data.message || 'Unknown error'}`, 'error');
            return;
        }

        Swal.fire('Success', 'Account created successfully!', 'success');
        if (accountModal) accountModal.hide();
        loadTrainees();
    } catch (error) {
        if (sendingModal) sendingModal.hide();
        console.error('Error creating account:', error);
        const message = error.response?.data?.message ? `Failed to create account: ${error.response.data.message}` : 'Failed to create account';
        Swal.fire('Error', message, 'error');
    }
}

function viewProfile(id) {
    const trainee = traineesData.find((item) => String(item.trainee_id) === String(id));
    if (!trainee) return;

    const fullName = getFullName(trainee);
    const schoolId = trainee.trainee_school_id || 'N/A';
    const email = trainee.email || '';
    const phoneNumber = trainee.phone_number || '';
    const batchName = trainee.batch_name || 'Not Enrolled';
    const address = trainee.address || 'No address provided';
    const program = getProgramLabel(trainee);
    const enrollmentDate = getEnrollmentLabel(trainee);
    const statusMeta = getStatusMeta(trainee.status);
    const accountMeta = getAccountMeta(trainee);

    setText('viewName', fullName);
    setText('viewInitials', getInitials(fullName));
    setText('viewSchoolId', schoolId);
    setText('viewProfileSchoolId', schoolId === 'N/A' ? 'School ID not available' : `School ID: ${schoolId}`);
    setText('viewEmail', email || 'No email address provided');
    setText('viewPhone', phoneNumber || 'No phone number provided');
    setText('viewAddress', address);
    setText('viewBatch', batchName);
    setText('viewProgram', program);
    setText('viewEnrollmentDate', enrollmentDate);
    setText('viewAccountDetail', accountMeta.detail);

    setContactLink('viewEmailLink', email, email ? `mailto:${email}` : '', 'mt-2 block break-all text-sm font-semibold text-blue-700 hover:text-blue-800');
    setContactLink('viewPhoneLink', phoneNumber, phoneNumber ? `tel:${String(phoneNumber).replace(/\s+/g, '')}` : '', 'mt-2 block text-sm font-semibold text-slate-900 hover:text-blue-700');

    const statusBadge = document.getElementById('viewStatus');
    if (statusBadge) {
        statusBadge.textContent = statusMeta.label;
        statusBadge.className = statusMeta.className;
    }

    const accountBadge = document.getElementById('viewAccountStatus');
    if (accountBadge) {
        accountBadge.textContent = accountMeta.badgeLabel;
        accountBadge.className = accountMeta.badgeClassName;
    }

    const photoImg = document.getElementById('viewPhoto');
    const noPhoto = document.getElementById('noPhoto');
    const photoUrl = getTraineeImageUrl(trainee);
    if (photoImg && noPhoto) {
        photoImg.alt = `${fullName} profile photo`;

        if (photoUrl) {
            photoImg.src = photoUrl;
            photoImg.classList.remove('hidden');
            noPhoto.classList.add('hidden');
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

    const uploadedDocs = [
        setupDocLink('viewValidId', trainee.valid_id_file, 'Valid ID'),
        setupDocLink('viewBirthCert', trainee.birth_cert_file, 'Birth Certificate')
    ].filter(Boolean).length;

    setText('viewDocumentSummary', `${uploadedDocs} of 2 documents uploaded`);

    if (profileModal) profileModal.show();
}

function setupDocLink(elementId, filename, title) {
    const link = document.getElementById(elementId);
    const status = document.getElementById(`${elementId}Status`);
    const action = document.getElementById(`${elementId}Action`);
    if (!link || !status || !action) return false;

    if (filename) {
        const fileUrl = `${UPLOADS_URL}${encodeURIComponent(filename)}`;
        link.href = fileUrl;
        link.onclick = (event) => {
            event.preventDefault();
            openDocumentModal(fileUrl, title);
        };
        link.className = 'group rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50';
        status.textContent = 'Click to preview this document in a modal.';
        action.textContent = 'Preview';
        action.className = 'inline-flex shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700';
        return true;
    }

    link.href = '#';
    link.onclick = null;
    link.className = 'group rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 opacity-80 pointer-events-none';
    status.textContent = 'Not uploaded yet.';
    action.textContent = 'Missing';
    action.className = 'inline-flex shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600';
    return false;
}

async function deleteTrainee(id) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await axios.delete(`${API_BASE_URL}/role/admin/trainees.php?action=delete&id=${id}`);
        if (!response.data.success) {
            Swal.fire('Error', response.data.message || 'Error deleting trainee', 'error');
            return;
        }
        Swal.fire('Deleted!', 'Trainee deleted successfully.', 'success');
        loadTrainees();
    } catch (error) {
        console.error('Error deleting trainee:', error);
        Swal.fire('Error', 'Error deleting trainee', 'error');
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function updateFilterStatus() {
    const statusEl = document.getElementById('filterStatus');
    if (!statusEl) return;

    const searchInput = document.getElementById('searchInput');
    const batchFilter = document.getElementById('batchFilter');
    const qualificationFilter = document.getElementById('qualificationFilter');
    const statusFilter = document.getElementById('statusFilter');
    const clearBtn = document.getElementById('clearFiltersBtn');

    const hasSearch = searchInput && searchInput.value.trim() !== '';
    const hasBatch = batchFilter && batchFilter.value !== '';
    const hasQual = qualificationFilter && qualificationFilter.value !== '';
    const hasStatus = statusFilter && statusFilter.value !== '';

    const activeFilters = [];
    if (hasSearch) activeFilters.push(`"${searchInput.value}"`);
    if (hasBatch) activeFilters.push(`Batch: ${batchFilter.options[batchFilter.selectedIndex].text}`);
    if (hasQual) activeFilters.push(`Program: ${qualificationFilter.options[qualificationFilter.selectedIndex].text}`);
    if (hasStatus) activeFilters.push(`Status: ${statusFilter.value}`);

    if (activeFilters.length > 0) {
        statusEl.innerHTML = `<i class="fas fa-filter text-blue-500 mr-1"></i>Filtering by: ${activeFilters.join(', ')}`;
        if (clearBtn) clearBtn.classList.remove('hidden');
    } else {
        statusEl.innerHTML = '';
        if (clearBtn) clearBtn.classList.add('hidden');
    }
}

function clearAllFilters() {
    const searchInput = document.getElementById('searchInput');
    const batchFilter = document.getElementById('batchFilter');
    const qualificationFilter = document.getElementById('qualificationFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) searchInput.value = '';
    if (batchFilter) batchFilter.value = '';
    if (qualificationFilter) qualificationFilter.value = '';
    if (statusFilter) statusFilter.value = '';

    updateFilterStatus();
    
    // Trigger table refresh if table manager exists
    const table = document.getElementById('traineesTable');
    if (table && window.tableManagers && window.tableManagers[0]) {
        window.tableManagers[0].apply();
    }
}

window.openAccountModal = openAccountModal;
window.viewProfile = viewProfile;
window.deleteTrainee = deleteTrainee;
window.clearAllFilters = clearAllFilters;
