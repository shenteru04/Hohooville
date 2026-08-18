const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';

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

let currentTrainerId = null;
let currentBatches = [];
let currentUserId = null;
let currentSelectedBatchId = null;
let currentSelectedTrainees = [];
let currentAttendanceDate = new Date().toISOString().slice(0, 10);
let selectedSignatureTraineeId = null;
const ATTENDANCE_STORAGE_KEY = 'trainer_batch_attendance_records';
let signaturePadContext = null;
let isDrawingSignature = false;

document.addEventListener('DOMContentLoaded', async function () {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }
    currentUserId = user.user_id;

    initSidebar();
    initUserMenu();
    initLogout();
    initAttendanceModalHandlers();
    initSignaturePad();

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            const trainer = response.data.data;
            if (trainer.first_name && trainer.last_name) {
                document.getElementById('trainerName').textContent = `${trainer.first_name} ${trainer.last_name}`;
            } else {
                document.getElementById('trainerName').textContent = user.username || 'Trainer';
            }
            currentTrainerId = trainer.trainer_id;
            loadBatches(currentTrainerId);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
    }
});

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
        document.body.classList.remove('overflow-hidden');
    }

    function toggleSidebar() {
        if (sidebar.classList.contains('-translate-x-full')) openSidebar();
        else closeSidebar();
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', toggleSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            document.body.classList.remove('overflow-hidden');
            if (sidebarOverlay) {
                sidebarOverlay.classList.add('hidden', 'opacity-0');
            }
        }
    });
}

function initUserMenu() {
    const userMenuButton = document.getElementById('userMenuButton');
    const userMenuDropdown = document.getElementById('userMenuDropdown');
    if (!userMenuButton || !userMenuDropdown) return;

    userMenuButton.addEventListener('click', function (event) {
        event.stopPropagation();
        userMenuDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', function (event) {
        if (!event.target.closest('#userMenuDropdown')) {
            userMenuDropdown.classList.add('hidden');
        }
    });
}

async function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    
    logoutBtn.addEventListener('click', async function (event) {
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
                localStorage.clear();
                window.location.href = '/Hohoo-ville/frontend/login.html';
            }
        });
    });
}

async function loadBatches(trainerId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_batches.php?trainer_id=${trainerId}`);
        const tbody = document.getElementById('batchesTableBody');
        if (!tbody) return;

        if (response.data.success) {
            currentBatches = response.data.data;
            renderBatchesTable(response.data.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-red-600">${response.data.message || 'No batches assigned.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading batches:', error);
        const tbody = document.getElementById('batchesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-red-600">Failed to load batches.</td></tr>';
        }
    }
}

function renderBatchesTable(data) {
    const tbody = document.getElementById('batchesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No batches assigned.</td></tr>';
        return;
    }

    data.forEach(batch => {
        const row = document.createElement('tr');
        row.className = 'cursor-pointer hover:bg-slate-50 transition-colors';
        row.dataset.batchId = batch.batch_id;

        const statusClass = String(batch.status).toLowerCase() === 'open'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-700';

        const qualificationLabel = batch.qualification_name || batch.course_name || 'N/A';
        row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-slate-900">${batch.batch_name || 'N/A'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${qualificationLabel}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${batch.schedule || '<span class="text-slate-400">TBA</span>'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${formatRoomValue(batch.room)}</td>
            <td class="px-4 py-3 text-sm">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass}">${batch.status || 'N/A'}</span>
            </td>
        `;

        row.addEventListener('click', function () {
            const isActive = row.classList.contains('bg-blue-50');
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('bg-blue-50'));

            if (isActive) {
                document.getElementById('traineesContainer').classList.add('hidden');
            } else {
                row.classList.add('bg-blue-50');
                loadTraineesForBatch(batch.batch_id);
            }
        });

        tbody.appendChild(row);
    });
}

function formatRoomValue(room) {
    const value = String(room ?? '').trim();
    if (!value || value.toLowerCase() === 'null' || value === '0') {
        return '<span class="text-slate-400">TBA</span>';
    }
    return value;
}

function getUploadedFileUrl(filename, defaultFolder = 'trainees') {
    const raw = String(filename || '').trim();
    if (!raw) return '';
    if (/^(data:|https?:\/\/)/i.test(raw)) return raw;

    const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');
    if (/^hohoo-ville\/uploads\//i.test(normalized)) {
        return `${window.location.origin}/${normalized.replace(/\/+/g, '/')}`;
    }
    if (/^uploads\//i.test(normalized)) {
        return `${window.location.origin}/Hohoo-ville/${normalized.replace(/\/+/g, '/')}`;
    }
    if (normalized.includes('/')) {
        return `${window.location.origin}/Hohoo-ville/uploads/${normalized.replace(/\/+/g, '/')}`;
    }

    return `${window.location.origin}/Hohoo-ville/uploads/${defaultFolder}/${encodeURIComponent(normalized)}`;
}

function isLikelySignatureValue(value) {
    const raw = String(value || '').trim();
    if (!raw) return false;
    if (/^(data:image\/|https?:\/\/)/i.test(raw)) return true;
    if (/^sig_[^\s]+\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(raw)) return true;
    if (/^sig_[^\s]+$/i.test(raw)) return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(raw.split('?')[0]);
}

function resolveSignatureUrl(signatureValue) {
    const raw = String(signatureValue || '').trim();
    if (!raw || !isLikelySignatureValue(raw)) return '';
    if (/^(data:|https?:\/\/)/i.test(raw)) return raw;
    return getUploadedFileUrl(raw, 'trainees');
}

async function loadTraineesForBatch(batchId) {
    const traineesContainer = document.getElementById('traineesContainer');
    const traineesBody = document.getElementById('traineesTableBody');
    if (!traineesContainer || !traineesBody) return;

    traineesContainer.classList.remove('hidden');
    traineesBody.innerHTML = `
        <tr>
            <td colspan="6" class="px-4 py-6 text-center text-sm text-slate-500">
                <i class="fas fa-circle-notch animate-spin mr-2"></i> Loading trainees...
            </td>
        </tr>
    `;

    const downloadBtn = document.getElementById('downloadAttendanceBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => generateAttendancePDF(batchId);
    }

    const recordAttendanceBtn = document.getElementById('recordAttendanceBtn');
    if (recordAttendanceBtn) {
        recordAttendanceBtn.onclick = () => openAttendanceModal(batchId);
    }

    currentSelectedBatchId = batchId;

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_trainees.php?action=list&trainer_id=${currentTrainerId}&batch_id=${batchId}`);
        if (response.data.success) {
            currentSelectedTrainees = response.data.data || [];
            renderTraineesTable(currentSelectedTrainees);
        } else {
            currentSelectedTrainees = [];
            traineesBody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-red-600">Error: ${response.data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading trainees for batch:', error);
        traineesBody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-red-600">Failed to load trainees.</td></tr>';
    }
}

function renderTraineesTable(trainees) {
    const tbody = document.getElementById('traineesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!trainees.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-slate-500">No approved trainees found in this batch.</td></tr>';
        return;
    }

    trainees.forEach(trainee => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3">
                <p class="text-sm font-semibold text-slate-900">${trainee.full_name || 'N/A'}</p>
                <p class="text-xs text-slate-500">${trainee.email || ''}</p>
            </td>
            <td class="px-4 py-3 text-sm text-slate-700">${trainee.batch_name || 'N/A'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${trainee.course_name || '<span class="text-slate-400">N/A</span>'}</td>
            <td class="px-4 py-3 text-sm text-slate-600">${trainee.formatted_enrollment_date || trainee.enrollment_date || 'N/A'}</td>
            <td class="px-4 py-3 text-sm">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">${trainee.enrollment_status || 'Approved'}</span>
            </td>
            <td class="px-4 py-3 text-sm">
                <a href="trainee_details.html?id=${trainee.trainee_id}" class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50" title="View Trainee Details">
                    <i class="fas fa-eye"></i> View
                </a>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openAttendanceModal(batchId) {
    if (!batchId || !currentSelectedTrainees.length) {
        Swal.fire({ title: 'Warning', text: 'Please select a batch first.', icon: 'warning' });
        return;
    }

    const modal = document.getElementById('attendanceModal');
    const list = document.getElementById('attendanceModalList');
    const dateInput = document.getElementById('attendanceModalDate');
    if (!modal || !list || !dateInput) return;

    currentAttendanceDate = dateInput.value || new Date().toISOString().slice(0, 10);
    dateInput.value = currentAttendanceDate;

    const attendanceMap = getAttendanceMapForDate(batchId, currentAttendanceDate);
    list.innerHTML = currentSelectedTrainees.map((trainee) => {
        const traineeId = String(trainee.trainee_id);
        const savedSignature = String(trainee.digital_signature || '').trim();
        const validSavedSignature = isLikelySignatureValue(savedSignature) ? savedSignature : '';
        const baseStatus = validSavedSignature ? 'present' : 'absent';
        const record = attendanceMap[traineeId] || { status: baseStatus, signature: validSavedSignature };
        const isPresent = record.status === 'present';
        const displayedSignature = isPresent ? (isLikelySignatureValue(record.signature) ? record.signature : validSavedSignature) : '';
        const resolvedSignature = resolveSignatureUrl(displayedSignature);
        const signaturePreview = resolvedSignature
            ? `<div class="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2"><img src="${resolvedSignature}" alt="Signature" class="max-h-16 w-auto mx-auto" /></div>`
            : '<div class="mt-2 text-xs text-slate-400">No signature on file for this attendance.</div>';

        return `
            <div class="attendance-row rounded-2xl border border-slate-200 bg-slate-50 p-3" data-trainee-id="${traineeId}">
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-slate-900">${trainee.full_name || 'N/A'}</p>
                        <p class="text-xs text-slate-500">${trainee.email || ''}</p>
                    </div>
                    <label class="inline-flex items-center gap-2 rounded-full border ${isPresent ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'} px-3 py-1.5 text-sm font-semibold">
                        <input type="checkbox" class="attendance-present-toggle h-4 w-4 accent-emerald-600" data-trainee-id="${traineeId}" data-saved-signature="${savedSignature}" ${isPresent ? 'checked' : ''}>
                        Present
                    </label>
                </div>

                <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex-1">${signaturePreview}</div>
                    <button type="button" class="attendance-signature-btn inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-trainee-id="${traineeId}">
                        <i class="fas fa-pen-nib"></i> ${resolvedSignature ? 'Update Signature' : 'Add Signature'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    modal.classList.remove('hidden');
}

function initAttendanceModalHandlers() {
    const modal = document.getElementById('attendanceModal');
    const closeBtn = document.getElementById('closeAttendanceModalBtn');
    const cancelBtn = document.getElementById('cancelAttendanceBtn');
    const saveBtn = document.getElementById('saveAttendanceModalBtn');
    const dateInput = document.getElementById('attendanceModalDate');

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    if (modal) modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.classList.add('hidden');
    });
    if (dateInput) dateInput.addEventListener('change', (event) => {
        currentAttendanceDate = event.target.value || new Date().toISOString().slice(0, 10);
        if (currentSelectedBatchId) openAttendanceModal(currentSelectedBatchId);
    });
    if (saveBtn) saveBtn.addEventListener('click', () => saveAttendanceModalData());

    document.addEventListener('click', (event) => {
        const target = event.target.closest('.attendance-signature-btn');
        if (!target) return;
        selectedSignatureTraineeId = target.dataset.traineeId;
        const name = currentSelectedTrainees.find((item) => String(item.trainee_id) === selectedSignatureTraineeId)?.full_name || 'Trainee';
        const title = document.getElementById('signatureModalTitle');
        if (title) title.textContent = `${name} Signature`;
        const signatureModal = document.getElementById('signatureCaptureModal');
        if (signatureModal) signatureModal.classList.remove('hidden');
        clearSignaturePad();
    });

    document.addEventListener('change', (event) => {
        const checkbox = event.target.closest('.attendance-present-toggle');
        if (!checkbox) return;
        const row = checkbox.closest('.attendance-row');
        if (!row) return;
        row.dataset.present = checkbox.checked ? 'present' : 'absent';
    });
}

function initSignaturePad() {
    const canvas = document.getElementById('attendanceSignatureCanvas');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    signaturePadContext = context;

    const resizeCanvas = () => {
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const displayWidth = Math.max(320, rect.width || 520);
        const displayHeight = Math.max(180, rect.height || 220);
        canvas.width = displayWidth * ratio;
        canvas.height = displayHeight * ratio;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.lineWidth = 2.2;
        context.lineCap = 'round';
        context.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const startDrawing = (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvas.width / rect.width) / (window.devicePixelRatio || 1);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height) / (window.devicePixelRatio || 1);
        isDrawingSignature = true;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x, y);
        context.stroke();
    };

    const moveDrawing = (event) => {
        if (!isDrawingSignature) return;
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvas.width / rect.width) / (window.devicePixelRatio || 1);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height) / (window.devicePixelRatio || 1);
        context.lineTo(x, y);
        context.stroke();
    };

    const stopDrawing = () => {
        isDrawingSignature = false;
        context.beginPath();
    };

    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', moveDrawing);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointerleave', stopDrawing);

    const closeSignatureModalBtn = document.getElementById('closeSignatureModalBtn');
    const cancelSignatureBtn = document.getElementById('cancelSignatureBtn');
    const clearSignaturePadBtn = document.getElementById('clearSignaturePadBtn');
    const saveSignatureBtn = document.getElementById('saveSignatureBtn');

    if (clearSignaturePadBtn) clearSignaturePadBtn.addEventListener('click', clearSignaturePad);
    if (closeSignatureModalBtn) closeSignatureModalBtn.addEventListener('click', () => document.getElementById('signatureCaptureModal').classList.add('hidden'));
    if (cancelSignatureBtn) cancelSignatureBtn.addEventListener('click', () => document.getElementById('signatureCaptureModal').classList.add('hidden'));
    if (saveSignatureBtn) saveSignatureBtn.addEventListener('click', saveSignaturePadToTrainee);
}

function clearSignaturePad() {
    const canvas = document.getElementById('attendanceSignatureCanvas');
    if (!canvas || !signaturePadContext) return;
    signaturePadContext.clearRect(0, 0, canvas.width, canvas.height);
    signaturePadContext.fillStyle = '#f8fafc';
    signaturePadContext.fillRect(0, 0, canvas.width, canvas.height);
    signaturePadContext.fillStyle = '#0f172a';
}

function saveSignaturePadToTrainee() {
    if (!selectedSignatureTraineeId) return;
    const canvas = document.getElementById('attendanceSignatureCanvas');
    const modal = document.getElementById('signatureCaptureModal');
    if (!canvas || !modal) return;

    const signatureData = canvas.toDataURL('image/png');
    const batchKey = String(currentSelectedBatchId || '');
    const dateKey = currentAttendanceDate || new Date().toISOString().slice(0, 10);
    const storage = JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY) || '{}');
    if (!storage[batchKey]) storage[batchKey] = {};
    if (!storage[batchKey][dateKey]) storage[batchKey][dateKey] = {};

    const traineeExists = storage[batchKey][dateKey][String(selectedSignatureTraineeId)] || {};
    storage[batchKey][dateKey][String(selectedSignatureTraineeId)] = {
        ...traineeExists,
        signature: signatureData,
        status: 'present'
    };
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(storage));

    modal.classList.add('hidden');
    if (currentSelectedBatchId) openAttendanceModal(currentSelectedBatchId);
    Swal.fire({ title: 'Saved', text: 'The updated signature has been saved for this attendance date.', icon: 'success' });
}

function saveAttendanceModalData() {
    if (!currentSelectedBatchId) return;

    const modal = document.getElementById('attendanceModal');
    const checkboxes = document.querySelectorAll('.attendance-present-toggle');
    const storage = JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY) || '{}');
    const batchKey = String(currentSelectedBatchId);
    const dateKey = currentAttendanceDate || new Date().toISOString().slice(0, 10);

    if (!storage[batchKey]) storage[batchKey] = {};
    if (!storage[batchKey][dateKey]) storage[batchKey][dateKey] = {};

    checkboxes.forEach((checkbox) => {
        const traineeId = String(checkbox.dataset.traineeId);
        const traineeRecord = storage[batchKey][dateKey][traineeId] || {};
        const savedSignature = String(checkbox.dataset.savedSignature || '').trim();
        const isPresent = checkbox.checked;
        storage[batchKey][dateKey][traineeId] = {
            ...traineeRecord,
            status: isPresent ? 'present' : 'absent',
            signature: isPresent ? (traineeRecord.signature || savedSignature || '') : ''
        };
    });

    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(storage));
    modal.classList.add('hidden');
    Swal.fire({ title: 'Saved', text: 'Attendance has been saved. The signatures will now reflect on the downloaded sheet.', icon: 'success' });
}

function getAttendanceMapForDate(batchId, dateKey) {
    if (!batchId || !dateKey) return {};
    try {
        const storage = JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY) || '{}');
        const batchData = storage[String(batchId)] || {};
        return batchData[String(dateKey)] || {};
    } catch (error) {
        return {};
    }
}

async function generateAttendancePDF(batchId) {
    const btn = document.getElementById('downloadAttendanceBtn');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Generating...';
    btn.disabled = true;

    let wrapper = null;
    let fixStyle = null;
    const originalScroll = window.scrollY || 0;

    try {
        await ensurePdfLibs();

        const batch = currentBatches.find(b => String(b.batch_id) === String(batchId));
        if (!batch) throw new Error('Batch details not found.');

        const trainerRes = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get&user_id=${currentUserId}`);
        const trainer = trainerRes.data.success ? trainerRes.data.data : {};
        const trainerFullName = `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim().toUpperCase();

        const traineesRes = await axios.get(`${API_BASE_URL}/role/trainer/my_trainees.php?action=list&trainer_id=${currentTrainerId}&batch_id=${batchId}`);
        const trainees = traineesRes.data.success ? traineesRes.data.data : [];

        const template = document.getElementById('attendanceSheetTemplate');
        if (!template) throw new Error('Attendance sheet template not found.');

        const rowsPerPage = 25;
        const totalPages = Math.max(1, Math.ceil(Math.max(trainees.length, 1) / rowsPerPage));
        const a4WidthPx = 794;
        const a4HeightPx = 1123;

        wrapper = document.createElement('div');
        wrapper.id = 'pdf-render-wrapper';
        wrapper.style.position = 'absolute';
        wrapper.style.left = '0';
        wrapper.style.top = '0';
        wrapper.style.width = `${a4WidthPx}px`;
        wrapper.style.background = '#fff';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.zIndex = '9999';
        wrapper.style.minHeight = `${totalPages * a4HeightPx}px`;

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            const page = template.cloneNode(true);
            page.removeAttribute('id');
            page.style.display = 'block';
            page.style.width = `${a4WidthPx}px`;
            page.style.boxSizing = 'border-box';
            page.style.pageBreakAfter = pageIndex === totalPages - 1 ? 'auto' : 'always';
            page.style.pageBreakInside = 'avoid';

            const setText = (selector, value) => {
                const el = page.querySelector(selector);
                if (el) el.textContent = value;
            };

            setText('#pdfProgramName', batch.course_name || batch.qualification_name || 'N/A');
            setText('#pdfDateStart', batch.start_date || 'TBA');
            setText('#pdfDateEnd', batch.end_date || 'TBA');
            setText('#pdfDuration', batch.duration || '');
            setText('#pdfTrainerName', trainerFullName || 'N/A');
            setText('#pdfNttcNumber', trainer.nttc_no || 'N/A');
            setText('#pdfValidityDate', '');
            setText('#pdfDate', new Date().toLocaleDateString());
            setText('#pdfFooterTrainer', trainerFullName || 'N/A');
            setText('#pdfFooterRegistrar', '');

            page.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('src');
                if (!src) return;
                if (src.startsWith('http') || src.startsWith('data:')) return;
                img.src = new URL(src, window.location.href).href;
            });

            const tbody = page.querySelector('#pdfTableBody');
            if (tbody) {
                tbody.innerHTML = '';
                const attendanceMap = getAttendanceMapForDate(batchId, currentAttendanceDate);
                const startIndex = pageIndex * rowsPerPage;
                const pageTrainees = trainees.slice(startIndex, startIndex + rowsPerPage);
                for (let i = 0; i < rowsPerPage; i++) {
                    const trainee = pageTrainees[i];
                    const rowNumber = startIndex + i + 1;
                    const traineeId = trainee ? String(trainee.trainee_id) : '';
                    const traineeRecord = traineeId ? (attendanceMap[traineeId] || { status: 'absent', signature: '' }) : { status: 'absent', signature: '' };
                    const isPresent = traineeRecord.status === 'present';
                    const signatureValue = isPresent ? (String(traineeRecord.signature || trainee?.digital_signature || '').trim()) : '';
                    const signatureSrc = signatureValue && isLikelySignatureValue(signatureValue) ? resolveSignatureUrl(signatureValue) : '';
                    const signatureCell = signatureSrc
                        ? `<img src="${signatureSrc}" alt="Signature" style="max-height:30px;max-width:80px;display:block;margin:0 auto;" />`
                        : '';

                    const row = document.createElement('tr');
                    row.style.height = '21px';
                    row.innerHTML = `
                        <td style="border:1px solid #000;text-align:center;font-size:10px;">${rowNumber}</td>
                        <td style="border:1px solid #000;padding:0 4px;font-size:10px;">${trainee ? String(trainee.full_name || '').toUpperCase() : ''}</td>
                        <td style="border:1px solid #000;text-align:center;font-size:10px;">${trainee ? (trainee.phone_number || '') : ''}</td>
                        <td style="border:1px solid #000;text-align:center;font-size:10px;">${trainee ? (trainee.email || '') : ''}</td>
                        <td style="border:1px solid #000;"></td>
                        <td style="border:1px solid #000;vertical-align:middle;text-align:center;padding:2px 4px;">${signatureCell}</td>
                        <td style="border:1px solid #000;"></td>
                        <td style="border:1px solid #000;vertical-align:middle;text-align:center;padding:2px 4px;">${isPresent ? signatureCell : ''}</td>
                    `;
                    tbody.appendChild(row);
                }
            }
            wrapper.appendChild(page);
        }

        document.body.appendChild(wrapper);

        fixStyle = document.createElement('style');
        fixStyle.id = 'pdf-fix-style';
        fixStyle.innerHTML = `
            #pdf-render-wrapper table { display: table !important; }
            #pdf-render-wrapper thead { display: table-header-group !important; }
            #pdf-render-wrapper tbody { display: table-row-group !important; }
            #pdf-render-wrapper tr { display: table-row !important; }
            #pdf-render-wrapper th, #pdf-render-wrapper td { display: table-cell !important; }
        `;
        document.head.appendChild(fixStyle);

        window.scrollTo(0, 0);
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await waitForImages(wrapper);
        await new Promise(resolve => setTimeout(resolve, 100));
        await new Promise(resolve => requestAnimationFrame(resolve));

        if (typeof html2canvas === 'undefined') throw new Error('html2canvas not available');
        const jsPDF = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null;
        if (!jsPDF) throw new Error('jsPDF not available');

        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pages = Array.from(wrapper.children);

        for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i], {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const maxWidth = pdfWidth - margin * 2;
            const maxHeight = pdfHeight - margin * 2;
            const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
            const renderWidth = canvas.width * ratio;
            const renderHeight = canvas.height * ratio;
            const x = (pdfWidth - renderWidth) / 2;
            const y = (pdfHeight - renderHeight) / 2;

            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', x, y, renderWidth, renderHeight);
        }

        const batchName = String(batch.batch_name || 'batch').replace(/\s+/g, '_');
        pdf.save(`Attendance_${batchName}.pdf`);
    } catch (error) {
        console.error('PDF Generation Error:', error);
        Swal.fire({ title: 'Error', text: 'Failed to generate PDF. Please try again.', icon: 'error' });
    } finally {
        if (wrapper && wrapper.parentElement) wrapper.parentElement.removeChild(wrapper);
        if (fixStyle && fixStyle.parentElement) fixStyle.parentElement.removeChild(fixStyle);
        window.scrollTo(0, originalScroll);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function waitForImages(container) {
    const images = Array.from(container.querySelectorAll('img'));
    if (!images.length) return;

    await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    }));
}

async function ensurePdfLibs() {
    const promises = [];
    if (typeof html2canvas === 'undefined') {
        promises.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'));
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
        promises.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'));
    }
    if (promises.length) await Promise.all(promises);
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = Array.from(document.scripts).find(script => script.src === src);
        if (existing) {
            if (existing.dataset.loaded === 'true') return resolve();
            existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener('error', reject, { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.loaded = 'false';
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}
