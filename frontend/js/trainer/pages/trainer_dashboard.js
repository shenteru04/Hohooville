const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

const TIMETABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMETABLE_PALETTE = [
    { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },
    { bg: '#dcfce7', border: '#86efac', text: '#166534' },
    { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
    { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
    { bg: '#ede9fe', border: '#c4b5fd', text: '#5b21b6' },
    { bg: '#cffafe', border: '#67e8f9', text: '#155e75' }
];
let latestScheduleItems = [];
let currentTimetableDayFilter = 'today';
let latestScheduleRequests = [];
let trainerScheduleRequestModal = null;
let currentScheduleRequest = null;
let currentTrainerId = null;
let pendingScheduleRequestId = null;
let expandedTrainerScheduleBatchKeys = new Set();
let expandedTrainerRequestBatchKeys = new Set();

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

document.addEventListener('DOMContentLoaded', async function () {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    initSidebar();
    initUserMenu();
    loadUserProfileImage();
    initTimetableDayFilter();
    trainerScheduleRequestModal = new SimpleModal(document.getElementById('trainerScheduleRequestModal'));
    initScheduleRequestModal();
    hydrateScheduleRequestIntent();

    document.getElementById('logoutBtn').addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        await ensureSwal();

        const userMenuButton = document.getElementById('userMenuButton');
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        const userMenuDropdown = document.getElementById('userMenuDropdown');
        if (userMenuDropdown) {
            userMenuDropdown.classList.add('hidden');
        }
        if (userMenuButton) {
            userMenuButton.setAttribute('aria-expanded', 'false');
        }

        document.body.setAttribute('tabindex', '-1');
        document.body.focus({ preventScroll: true });

        await new Promise((resolve) => requestAnimationFrame(resolve));

        const result = await Swal.fire({
            title: 'Logout Confirmation',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Logout',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.getConfirmButton()?.focus({ preventScroll: true });
            }
        });

        document.body.removeAttribute('tabindex');

        if (result.isConfirmed) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/Hohoo-ville/frontend/login.html';
            return;
        }

        userMenuButton?.focus({ preventScroll: true });
    });

    try {
        const response = await apiClient.get(`/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            const trainer = response.data.data;
            currentTrainerId = Number(trainer.trainer_id || 0) || null;
            if (trainer.first_name && trainer.last_name) {
                document.getElementById('trainerName').textContent = `${trainer.first_name} ${trainer.last_name}`;
            } else {
                document.getElementById('trainerName').textContent = user.username || 'Trainer';
            }
            loadDashboardData(trainer.trainer_id);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
    }
});

async function loadUserProfileImage() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.user_id) return;

        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get&user_id=${user.user_id}`);
        if (response.data.success && response.data.data) {
            const profileData = response.data.data;
            const profileImg = document.getElementById('userProfileImage');

            // Update profile image
            if (profileImg && profileData.profile_image) {
                profileImg.src = `/Hohoo-ville/uploads/profile_images/${encodeURIComponent(profileData.profile_image)}`;
            } else if (profileImg && profileData.first_name) {
                profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.first_name)}&background=random`;
            }
        }
    } catch (error) {
        console.log('Profile image load skipped (not critical)');
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
        document.body.classList.remove('overflow-hidden');
    }

    function toggleSidebar() {
        if (sidebar.classList.contains('-translate-x-full')) {
            openSidebar();
        } else {
            closeSidebar();
        }
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
        if (!event.target.closest('#userMenuButton') && !event.target.closest('#userMenuDropdown')) {
            userMenuDropdown.classList.add('hidden');
        }
    });
}

async function loadDashboardData(trainerId) {
    try {
        await Promise.all([
            loadStatistics(trainerId),
            loadModulePerformance(trainerId),
            loadSchedule(trainerId),
            loadScheduleRequests(trainerId)
        ]);
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadStatistics(trainerId) {
    try {
        const response = await apiClient.get(`/role/trainer/trainer_dashboard.php?action=statistics&trainer_id=${trainerId}`);
        if (response.data.success) {
            const stats = response.data.data;
            document.getElementById('activeBatches').textContent = stats.active_batches;
            document.getElementById('totalTrainees').textContent = stats.total_trainees;
            document.getElementById('competentCount').textContent = stats.competent;
            document.getElementById('nycCount').textContent = stats.nyc;
        }
    } catch (error) {
        console.error('Stats Error:', error);
    }
}

async function loadModulePerformance(trainerId) {
    let data = [];
    try {
        const response = await apiClient.get(`/role/trainer/trainer_dashboard.php?action=module-performance&trainer_id=${trainerId}`);
        if (response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
            data = response.data.data.map(item => ({
                module_title: item.module_title || 'Untitled Module',
                avg_score: clampScore(item.avg_score)
            }));
        }
    } catch (error) {
        console.error('Module Performance Error:', error);
    }

    const labels = data.map(item => item.module_title);
    const scores = data.map(item => item.avg_score);

    renderModuleProgressChart(labels, scores);
    renderAvgGradesChart(labels, scores);
}

async function loadSchedule(trainerId) {
    try {
        const response = await apiClient.get(`/role/trainer/trainer_dashboard.php?action=schedule&trainer_id=${trainerId}`);
        if (response.data.success) {
            const items = Array.isArray(response.data.data) ? response.data.data : [];
            latestScheduleItems = items;
            renderScheduleTable(items);
            renderScheduleTimetable(items);
        }
    } catch (error) {
        console.error('Schedule Error:', error);
    }
}

async function loadScheduleRequests(trainerId) {
    try {
        const response = await apiClient.get(`/role/trainer/trainer_dashboard.php?action=schedule-requests&trainer_id=${trainerId}`);
        if (response.data.success) {
            latestScheduleRequests = Array.isArray(response.data.data) ? response.data.data : [];
            renderScheduleRequests(latestScheduleRequests);
            maybeOpenPendingScheduleRequest();
        }
    } catch (error) {
        console.error('Schedule request load error:', error);
    }
}

function getTrainerBatchGroupKey(batchId) {
    return `batch:${String(batchId || '')}`;
}

function shouldGroupTrainerScheduleItem(item, countsByBatch) {
    const batchKey = getTrainerBatchGroupKey(item?.batch_id);
    return String(item?.trainer_assignment_mode || '').toLowerCase() === 'multiple' &&
        String(item?.scope_type || '') === 'module' &&
        (countsByBatch.get(batchKey) || 0) > 1;
}

function buildTrainerGroupedScheduleEntries(items) {
    const countsByBatch = new Map();
    items.forEach((item) => {
        if (String(item?.trainer_assignment_mode || '').toLowerCase() === 'multiple' && String(item?.scope_type || '') === 'module') {
            const batchKey = getTrainerBatchGroupKey(item.batch_id);
            countsByBatch.set(batchKey, (countsByBatch.get(batchKey) || 0) + 1);
        }
    });

    const groupedEntries = [];
    const handledBatchKeys = new Set();
    items.forEach((item) => {
        const batchKey = getTrainerBatchGroupKey(item.batch_id);
        if (!shouldGroupTrainerScheduleItem(item, countsByBatch)) {
            groupedEntries.push({ type: 'item', item });
            return;
        }

        if (handledBatchKeys.has(batchKey)) {
            return;
        }

        groupedEntries.push({
            type: 'group',
            batchKey,
            batch_id: item.batch_id,
            batch_name: item.batch_name,
            course_name: item.course_name,
            items: items.filter((candidate) => getTrainerBatchGroupKey(candidate.batch_id) === batchKey && shouldGroupTrainerScheduleItem(candidate, countsByBatch))
        });
        handledBatchKeys.add(batchKey);
    });

    return groupedEntries;
}

function shouldGroupTrainerRequestItem(item, countsByBatch) {
    const batchKey = getTrainerBatchGroupKey(item?.batch_id);
    return String(item?.trainer_assignment_mode || '').toLowerCase() === 'multiple' &&
        String(item?.scope_type || '') === 'module' &&
        (countsByBatch.get(batchKey) || 0) > 1;
}

function buildTrainerGroupedRequestEntries(items) {
    const countsByBatch = new Map();
    items.forEach((item) => {
        if (String(item?.trainer_assignment_mode || '').toLowerCase() === 'multiple' && String(item?.scope_type || '') === 'module') {
            const batchKey = getTrainerBatchGroupKey(item.batch_id);
            countsByBatch.set(batchKey, (countsByBatch.get(batchKey) || 0) + 1);
        }
    });

    const groupedEntries = [];
    const handledBatchKeys = new Set();
    items.forEach((item) => {
        const batchKey = getTrainerBatchGroupKey(item.batch_id);
        if (!shouldGroupTrainerRequestItem(item, countsByBatch)) {
            groupedEntries.push({ type: 'item', item });
            return;
        }

        if (handledBatchKeys.has(batchKey)) {
            return;
        }

        groupedEntries.push({
            type: 'group',
            batchKey,
            batch_id: item.batch_id,
            batch_name: item.batch_name,
            course_name: item.course_name,
            items: items.filter((candidate) => getTrainerBatchGroupKey(candidate.batch_id) === batchKey && shouldGroupTrainerRequestItem(candidate, countsByBatch))
        });
        handledBatchKeys.add(batchKey);
    });

    return groupedEntries;
}

function buildTrainerScheduleGroupSummary(items) {
    const scheduledItems = items.filter((item) => String(item.schedule || '').trim() !== '');
    const uniqueSchedules = [...new Set(scheduledItems.map((item) => String(item.schedule || '').trim()).filter(Boolean))];
    const roomNames = [...new Set(items.map((item) => formatRoomValue(item.room)).filter((room) => room && room !== 'TBA'))];

    let scheduleText = 'TBA';
    if (scheduledItems.length === items.length && uniqueSchedules.length === 1) {
        scheduleText = uniqueSchedules[0];
    } else if (scheduledItems.length > 0) {
        scheduleText = `${scheduledItems.length} of ${items.length} unit schedules set`;
    }

    const roomText = !roomNames.length
        ? 'TBA'
        : (roomNames.length === 1 ? roomNames[0] : `${roomNames[0]} + ${roomNames.length - 1} more`);

    return { scheduleText, roomText };
}

function buildTrainerRequestProposalText(request) {
    return [request.schedule || 'Not set', request.room || 'TBA', formatDateLabel(request.resolved_effective_date || '')].join(' | ');
}

function buildTrainerRequestGroupSummary(items) {
    const counts = {
        pending_trainer_response: 0,
        modification_requested: 0,
        pending_registrar_approval: 0,
        awaiting_schedule: 0,
        approved: 0,
        rejected: 0
    };

    items.forEach((item) => {
        const status = String(item.status || '');
        if (Object.prototype.hasOwnProperty.call(counts, status)) {
            counts[status] += 1;
        }
    });

    const latestItem = items.reduce((latest, item) => {
        const latestTime = Date.parse(latest?.updated_at || latest?.created_at || '') || 0;
        const itemTime = Date.parse(item?.updated_at || item?.created_at || '') || 0;
        return itemTime > latestTime ? item : latest;
    }, null);

    const proposalCount = items.filter((item) => String(item.schedule || '').trim() !== '').length;
    const summaryBits = [];
    if (counts.pending_trainer_response) summaryBits.push(`${counts.pending_trainer_response} pending trainer`);
    if (counts.modification_requested) summaryBits.push(`${counts.modification_requested} needs changes`);
    if (counts.pending_registrar_approval) summaryBits.push(`${counts.pending_registrar_approval} pending registrar`);
    if (counts.awaiting_schedule) summaryBits.push(`${counts.awaiting_schedule} awaiting schedule`);
    if (!summaryBits.length && counts.approved) summaryBits.push(`${counts.approved} approved`);
    if (!summaryBits.length && counts.rejected) summaryBits.push(`${counts.rejected} rejected`);

    const primaryStatus = ['pending_trainer_response', 'modification_requested', 'pending_registrar_approval', 'awaiting_schedule', 'approved', 'rejected']
        .find((status) => counts[status] > 0) || 'awaiting_schedule';

    return {
        primaryStatus,
        summaryText: summaryBits.join(' | ') || 'No request activity yet',
        proposalText: proposalCount > 0
            ? `${proposalCount} proposal${proposalCount === 1 ? '' : 's'} ready`
            : 'No registrar proposal yet',
        updatedAt: latestItem?.updated_at || latestItem?.created_at || ''
    };
}

function initTimetableDayFilter() {
    const filter = document.getElementById('trainerTimetableDayFilter');
    if (!filter) return;

    currentTimetableDayFilter = filter.value || 'today';
    updateTimetableFilterNote();

    filter.addEventListener('change', () => {
        currentTimetableDayFilter = filter.value || 'today';
        updateTimetableFilterNote();
        renderScheduleTimetable(latestScheduleItems);
    });
}

function renderScheduleTable(items) {
    const tbody = document.getElementById('scheduleTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No upcoming schedule</td></tr>';
        return;
    }

    const entries = buildTrainerGroupedScheduleEntries(items);
    entries.forEach((entry) => {
        if (entry.type === 'item') {
            const item = entry.item;
            const row = document.createElement('tr');
            const scopeMeta = item.scope_label && item.scope_label !== 'Full Batch'
                ? `<div class="text-xs text-slate-500">${escapeHtml(item.scope_label)}</div>`
                : '';
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-slate-700">
                    <div class="font-medium text-slate-900">${escapeHtml(item.batch_name || 'N/A')}</div>
                    ${scopeMeta}
                </td>
                <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(item.course_name || 'N/A')}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(item.schedule || 'TBA')}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(formatRoomValue(item.room))}</td>
                <td class="px-4 py-3 text-center text-xs text-slate-400">-</td>
            `;
            tbody.appendChild(row);
            return;
        }

        const expanded = expandedTrainerScheduleBatchKeys.has(entry.batchKey);
        const summary = buildTrainerScheduleGroupSummary(entry.items);
        const groupRow = document.createElement('tr');
        groupRow.className = 'bg-slate-50/60';
        groupRow.innerHTML = `
            <td class="px-4 py-3 text-sm text-slate-700">
                <div class="font-medium text-slate-900">${escapeHtml(entry.batch_name || 'N/A')}</div>
                <div class="text-xs text-slate-500">${entry.items.length} unit schedules in this batch</div>
            </td>
            <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(entry.course_name || 'N/A')}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(summary.scheduleText)}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(summary.roomText)}</td>
            <td class="px-4 py-3 text-center">
                <button type="button" class="trainer-schedule-group-toggle inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-batch-key="${escapeHtml(entry.batchKey)}">
                    <i class="fas fa-list-ul"></i> ${expanded ? 'Hide Details' : `View ${entry.items.length} Schedules`}
                </button>
            </td>
        `;
        tbody.appendChild(groupRow);

        const detailRow = document.createElement('tr');
        detailRow.className = expanded ? '' : 'hidden';
        detailRow.innerHTML = `
            <td colspan="5" class="bg-slate-50/40 px-4 py-4">
                <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Assignment</th>
                                <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Schedule</th>
                                <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Room</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${entry.items.map((item) => `
                                <tr>
                                    <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(item.scope_label || item.module_title || item.batch_name || 'Schedule')}</td>
                                    <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(item.schedule || 'TBA')}</td>
                                    <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(formatRoomValue(item.room))}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </td>
        `;
        tbody.appendChild(detailRow);
    });
}

function renderScheduleRequests(items) {
    const tbody = document.getElementById('trainerScheduleRequestsBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-slate-500">No schedule requests yet.</td></tr>';
        return;
    }

    const entries = buildTrainerGroupedRequestEntries(items);
    entries.forEach((entry) => {
        if (entry.type === 'item') {
            const request = entry.item;
            const actionLabel = ['pending_trainer_response', 'modification_requested', 'awaiting_schedule'].includes(String(request.status || '')) ? 'Respond' : 'View';
            const proposal = buildTrainerRequestProposalText(request);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-slate-700">
                    <div class="font-medium text-slate-900">${escapeHtml(request.batch_name || 'N/A')}</div>
                    <div class="text-xs text-slate-500">${escapeHtml(request.course_name || 'N/A')}</div>
                </td>
                <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(request.scope_label || 'Schedule')}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(proposal)}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${buildStatusBadgeHtml(request.status)}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(formatDateTimeLabel(request.updated_at))}</td>
                <td class="px-4 py-3 text-center">
                    <button type="button" class="trainer-request-open inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-request-key="${escapeHtml(String(request.scope_key || request.request_id || ''))}">
                        <i class="fas fa-eye"></i> ${escapeHtml(actionLabel)}
                    </button>
                </td>
            `;
            tbody.appendChild(row);
            return;
        }

        const expanded = expandedTrainerRequestBatchKeys.has(entry.batchKey);
        const summary = buildTrainerRequestGroupSummary(entry.items);
        const row = document.createElement('tr');
        row.className = 'bg-slate-50/60';
        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-slate-700">
                <div class="font-medium text-slate-900">${escapeHtml(entry.batch_name || 'N/A')}</div>
                <div class="text-xs text-slate-500">${escapeHtml(entry.course_name || 'N/A')}</div>
            </td>
            <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(`${entry.items.length} unit requests`)}</td>
            <td class="px-4 py-3 text-sm text-slate-700">
                <div>${escapeHtml(summary.proposalText)}</div>
                <div class="text-xs text-slate-500">${escapeHtml(summary.summaryText)}</div>
            </td>
            <td class="px-4 py-3 text-sm text-slate-700">${buildStatusBadgeHtml(summary.primaryStatus)}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(formatDateTimeLabel(summary.updatedAt))}</td>
            <td class="px-4 py-3 text-center">
                <button type="button" class="trainer-request-group-toggle inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-batch-key="${escapeHtml(entry.batchKey)}">
                    <i class="fas fa-layer-group"></i> ${expanded ? 'Hide Requests' : `View ${entry.items.length} Requests`}
                </button>
            </td>
        `;
        tbody.appendChild(row);

        const detailRow = document.createElement('tr');
        detailRow.className = expanded ? '' : 'hidden';
        detailRow.innerHTML = `
            <td colspan="6" class="bg-slate-50/40 px-4 py-4">
                <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Assignment</th>
                                <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Proposal</th>
                                <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                <th scope="col" class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Updated</th>
                                <th scope="col" class="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${entry.items.map((request) => {
                                const actionLabel = ['pending_trainer_response', 'modification_requested', 'awaiting_schedule'].includes(String(request.status || '')) ? 'Respond' : 'View';
                                return `
                                    <tr>
                                        <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(request.scope_label || 'Schedule')}</td>
                                        <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(buildTrainerRequestProposalText(request))}</td>
                                        <td class="px-4 py-3 text-sm text-slate-700">${buildStatusBadgeHtml(request.status)}</td>
                                        <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(formatDateTimeLabel(request.updated_at))}</td>
                                        <td class="px-4 py-3 text-center">
                                            <button type="button" class="trainer-request-open inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-request-key="${escapeHtml(String(request.scope_key || request.request_id || ''))}">
                                                <i class="fas fa-eye"></i> ${escapeHtml(actionLabel)}
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </td>
        `;
        tbody.appendChild(detailRow);
    });
}

function initScheduleRequestModal() {
    document.querySelectorAll('[data-modal-hide="trainerScheduleRequestModal"]').forEach((button) => {
        button.addEventListener('click', () => {
            trainerScheduleRequestModal?.hide();
            clearScheduleRequestIntent();
        });
    });

    document.getElementById('trainerScheduleRequestsBody')?.addEventListener('click', (event) => {
        const groupButton = event.target.closest('.trainer-request-group-toggle');
        if (groupButton) {
            toggleTrainerRequestBatchDetails(groupButton.dataset.batchKey || '');
            return;
        }

        const button = event.target.closest('.trainer-request-open');
        if (!button) return;
        openTrainerScheduleRequestModal(button.dataset.requestKey || '');
    });

    document.getElementById('scheduleTableBody')?.addEventListener('click', (event) => {
        const button = event.target.closest('.trainer-schedule-group-toggle');
        if (!button) return;
        toggleTrainerScheduleBatchDetails(button.dataset.batchKey || '');
    });

    document.querySelectorAll('input[name="trainerScheduleType"]').forEach((radio) => {
        radio.addEventListener('change', toggleTrainerScheduleType);
    });

    document.getElementById('trainerRequestPresetSchedule')?.addEventListener('change', refreshTrainerRoomOptions);
    document.querySelectorAll('input[name="trainerCustomDays"]').forEach((checkbox) => {
        checkbox.addEventListener('change', refreshTrainerRoomOptions);
    });
    document.getElementById('trainerRequestCustomStartTime')?.addEventListener('input', refreshTrainerRoomOptions);
    document.getElementById('trainerRequestCustomEndTime')?.addEventListener('input', refreshTrainerRoomOptions);
    document.getElementById('trainerRequestEffectiveDate')?.addEventListener('change', refreshTrainerRoomOptions);
    document.getElementById('trainerSubmitProposalBtn')?.addEventListener('click', submitTrainerScheduleProposal);
    document.getElementById('trainerAcceptProposalBtn')?.addEventListener('click', acceptTrainerScheduleProposal);
}

function toggleTrainerScheduleBatchDetails(batchKey) {
    if (!batchKey) {
        return;
    }

    if (expandedTrainerScheduleBatchKeys.has(batchKey)) {
        expandedTrainerScheduleBatchKeys.delete(batchKey);
    } else {
        expandedTrainerScheduleBatchKeys.add(batchKey);
    }

    renderScheduleTable(latestScheduleItems);
}

function toggleTrainerRequestBatchDetails(batchKey) {
    if (!batchKey) {
        return;
    }

    if (expandedTrainerRequestBatchKeys.has(batchKey)) {
        expandedTrainerRequestBatchKeys.delete(batchKey);
    } else {
        expandedTrainerRequestBatchKeys.add(batchKey);
    }

    renderScheduleRequests(latestScheduleRequests);
}

function hydrateScheduleRequestIntent() {
    const params = new URLSearchParams(window.location.search);
    const requestId = Number(params.get('schedule_request_id') || 0);
    pendingScheduleRequestId = requestId > 0 ? requestId : null;
}

function maybeOpenPendingScheduleRequest() {
    if (!pendingScheduleRequestId) {
        return;
    }

    openTrainerScheduleRequestModal(String(pendingScheduleRequestId));
}

function clearScheduleRequestIntent() {
    pendingScheduleRequestId = null;
    const url = new URL(window.location.href);
    url.searchParams.delete('schedule_request_id');
    url.searchParams.delete('schedule_action');
    window.history.replaceState({}, document.title, url.toString());
}

function openTrainerScheduleRequestModal(requestKey) {
    const request = latestScheduleRequests.find((item) => {
        if (String(item.scope_key || '') === String(requestKey || '')) {
            return true;
        }
        return Number(item.request_id || 0) === Number(requestKey || 0);
    });
    if (!request) {
        return;
    }

    currentScheduleRequest = request;
    populateTrainerScheduleRequestModal(request);
    trainerScheduleRequestModal?.show();
}

function populateTrainerScheduleRequestModal(request) {
    const status = String(request.status || '');
    const canRespond = ['pending_trainer_response', 'modification_requested', 'awaiting_schedule'].includes(status);
    const canAccept = status === 'pending_trainer_response';
    const seedSchedule = getTrainerRequestSeedSchedule(request);
    const seedRoomId = getTrainerRequestSeedRoomId(request);
    const seedRoomName = getTrainerRequestSeedRoomName(request);
    const preferredScheduleType = resolveTrainerScheduleInputMode(seedSchedule);

    document.getElementById('trainerRequestModalSubtitle').textContent = status === 'awaiting_schedule'
        ? 'No registrar proposal exists yet for this assignment. You can submit your preferred schedule for approval.'
        : (canRespond
            ? 'Accept the proposal or send an updated schedule for registrar approval.'
            : 'This schedule request is shown for tracking and status visibility.');
    document.getElementById('trainerRequestBatchName').textContent = request.batch_name || 'N/A';
    document.getElementById('trainerRequestCourseName').textContent = request.course_name || 'N/A';
    document.getElementById('trainerRequestScopeName').textContent = request.scope_label || 'Schedule';
    document.getElementById('trainerRequestCurrentSchedule').textContent = `Current approved: ${request.current_schedule || 'Not set'} | ${request.current_room || 'TBA'}`;
    document.getElementById('trainerRequestProposedSchedule').textContent = seedSchedule || 'Not set';
    document.getElementById('trainerRequestProposedRoom').textContent = `Room: ${seedRoomName}`;
    document.getElementById('trainerRequestProposedDate').textContent = `Effective date: ${formatDateLabel(request.resolved_effective_date || '')}`;
    document.getElementById('trainerRequestRegistrarNote').textContent = request.registrar_note || (status === 'awaiting_schedule' ? 'No registrar proposal yet.' : 'No registrar note.');
    document.getElementById('trainerRequestTrainerNote').textContent = request.trainer_note || 'No trainer note.';

    const statusBadge = document.getElementById('trainerRequestStatusBadge');
    if (statusBadge) {
        statusBadge.textContent = formatRequestStatus(status);
        statusBadge.className = `inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClasses(status)}`;
    }

    document.getElementById('trainerResponseSection')?.classList.toggle('opacity-70', !canRespond);
    document.getElementById('trainerSubmitProposalBtn')?.classList.toggle('hidden', !canRespond);
    document.getElementById('trainerAcceptProposalBtn')?.classList.toggle('hidden', !canAccept);
    document.getElementById('trainerRequestNoteInput').value = request.trainer_note || '';
    resetTrainerScheduleRequestInputs(request, {
        seedSchedule,
        seedRoomId,
        seedRoomName
    });
    updateTrainerScheduleModeControls({
        preferredScheduleType,
        hasProposal: Boolean(seedSchedule)
    });
    setTrainerResponseInputsDisabled(!canRespond);
    refreshTrainerRoomOptions();
}

function setTrainerResponseInputsDisabled(disabled) {
    document.querySelectorAll('input[name="trainerScheduleType"]').forEach((input) => {
        input.disabled = disabled;
    });
    document.getElementById('trainerRequestPresetSchedule').disabled = disabled;
    document.getElementById('trainerRequestCustomStartTime').disabled = disabled;
    document.getElementById('trainerRequestCustomEndTime').disabled = disabled;
    document.getElementById('trainerRequestEffectiveDate').disabled = disabled;
    document.getElementById('trainerRequestRoomSelect').disabled = disabled;
    document.getElementById('trainerRequestNoteInput').disabled = disabled;
    updateTrainerCustomDayControls(disabled);
}

function resetTrainerScheduleRequestInputs(request, options = {}) {
    const {
        seedSchedule = '',
        seedRoomId = '',
        seedRoomName = 'TBA'
    } = options;
    document.querySelector('input[name="trainerScheduleType"][value="preset"]').checked = true;
    document.querySelector('input[name="trainerScheduleType"][value="custom"]').checked = false;
    document.getElementById('trainerRequestPresetSchedule').value = '';
    document.querySelectorAll('input[name="trainerCustomDays"]').forEach((checkbox) => {
        checkbox.checked = false;
    });
    document.getElementById('trainerRequestCustomStartTime').value = '';
    document.getElementById('trainerRequestCustomEndTime').value = '';
    document.getElementById('trainerRequestEffectiveDate').value = request.resolved_effective_date || request.start_date || '';
    const roomSelect = document.getElementById('trainerRequestRoomSelect');
    if (roomSelect) {
        if (seedRoomId) {
            roomSelect.innerHTML = `<option value="${escapeHtml(String(seedRoomId))}">${escapeHtml(seedRoomName)}</option>`;
            roomSelect.value = String(seedRoomId);
        } else {
            roomSelect.innerHTML = '<option value="">Select schedule first</option>';
        }
    }
    applyTrainerScheduleToInputs(seedSchedule);
    toggleTrainerScheduleType();
}

function toggleTrainerScheduleType() {
    const scheduleType = document.querySelector('input[name="trainerScheduleType"]:checked')?.value || 'preset';
    document.getElementById('trainerPresetScheduleContainer').classList.toggle('hidden', scheduleType !== 'preset');
    document.getElementById('trainerCustomScheduleContainer').classList.toggle('hidden', scheduleType !== 'custom');
    refreshTrainerRoomOptions();
}

function getTrainerRequestSeedSchedule(request = currentScheduleRequest) {
    if (!request) {
        return '';
    }

    return String(request.schedule || request.current_schedule || '').trim();
}

function getTrainerRequestSeedRoomId(request = currentScheduleRequest) {
    if (!request) {
        return '';
    }

    return String(request.room_id || request.current_room_id || '').trim();
}

function getTrainerRequestSeedRoomName(request = currentScheduleRequest) {
    if (!request) {
        return 'TBA';
    }

    return request.room || request.current_room || 'TBA';
}

function resolveTrainerScheduleInputMode(schedule = '') {
    const normalizedSchedule = String(schedule || '').trim();
    if (!normalizedSchedule) {
        return 'preset';
    }

    const presetSelect = document.getElementById('trainerRequestPresetSchedule');
    const presetOption = presetSelect
        ? Array.from(presetSelect.options).find((option) => option.value === normalizedSchedule)
        : null;

    return presetOption ? 'preset' : 'custom';
}

function updateTrainerScheduleModeControls(options = {}) {
    const {
        preferredScheduleType = 'preset',
        hasProposal = false
    } = options;
    const daysHint = document.getElementById('trainerCustomDaysHint');

    if (daysHint) {
        if (!hasProposal) {
            daysHint.textContent = 'Choose the training days for your preferred schedule.';
        } else if (preferredScheduleType === 'custom') {
            daysHint.textContent = 'The registrar custom schedule is loaded here. You can adjust the days, time, and room if needed.';
        } else {
            daysHint.textContent = 'The registrar preset schedule is loaded here. You can keep it or switch to a custom schedule if needed.';
        }
    }

    updateTrainerCustomDayControls(false);
    toggleTrainerScheduleType();
}

function updateTrainerCustomDayControls(forceDisabled = false) {
    const disableDays = Boolean(forceDisabled);
    document.querySelectorAll('input[name="trainerCustomDays"]').forEach((input) => {
        input.disabled = disableDays;
    });
}

function applyTrainerScheduleToInputs(schedule) {
    if (!schedule) {
        return;
    }

    const presetSelect = document.getElementById('trainerRequestPresetSchedule');
    const presetOption = Array.from(presetSelect.options).find((option) => option.value === schedule);
    if (presetOption) {
        presetSelect.value = schedule;
        document.querySelector('input[name="trainerScheduleType"][value="preset"]').checked = true;
        toggleTrainerScheduleType();
        return;
    }

    const parsed = parseScheduleToDays(schedule);
    if (!parsed.days.length || !parsed.startTime || !parsed.endTime) {
        return;
    }

    document.querySelector('input[name="trainerScheduleType"][value="custom"]').checked = true;
    toggleTrainerScheduleType();
    document.querySelectorAll('input[name="trainerCustomDays"]').forEach((checkbox) => {
        checkbox.checked = parsed.days.includes(checkbox.value);
    });
    document.getElementById('trainerRequestCustomStartTime').value = parsed.startTime;
    document.getElementById('trainerRequestCustomEndTime').value = parsed.endTime;
}

function getTrainerCustomScheduleString() {
    const selectedDays = Array.from(document.querySelectorAll('input[name="trainerCustomDays"]:checked')).map((checkbox) => checkbox.value);
    const startTime = document.getElementById('trainerRequestCustomStartTime').value;
    const endTime = document.getElementById('trainerRequestCustomEndTime').value;

    if (!selectedDays.length || !startTime || !endTime) {
        return '';
    }

    const dayShortcuts = {
        Monday: 'M',
        Tuesday: 'T',
        Wednesday: 'W',
        Thursday: 'Th',
        Friday: 'F',
        Saturday: 'S'
    };

    return `${selectedDays.map((day) => dayShortcuts[day] || day).join('')} (${formatTime(startTime)} - ${formatTime(endTime)})`;
}

function getCurrentTrainerRequestSchedule() {
    const scheduleType = document.querySelector('input[name="trainerScheduleType"]:checked')?.value || 'preset';
    if (scheduleType === 'preset') {
        return document.getElementById('trainerRequestPresetSchedule')?.value || '';
    }

    return getTrainerCustomScheduleString();
}

async function refreshTrainerRoomOptions() {
    const roomSelect = document.getElementById('trainerRequestRoomSelect');
    if (!roomSelect || !currentScheduleRequest) {
        return;
    }

    const fallbackRoomId = getTrainerRequestSeedRoomId(currentScheduleRequest);
    const fallbackRoomName = getTrainerRequestSeedRoomName(currentScheduleRequest);
    const preferredRoomId = String(roomSelect.value || fallbackRoomId || '');

    const canRespond = ['pending_trainer_response', 'modification_requested', 'awaiting_schedule'].includes(String(currentScheduleRequest.status || ''));
    if (!canRespond) {
        roomSelect.innerHTML = `<option value="${escapeHtml(fallbackRoomId)}">${escapeHtml(fallbackRoomName)}</option>`;
        roomSelect.disabled = true;
        return;
    }

    roomSelect.innerHTML = '<option value="">Select Room</option>';
    roomSelect.disabled = false;

    const schedule = getCurrentTrainerRequestSchedule();
    if (!schedule) {
        roomSelect.innerHTML = '<option value="">Select schedule first</option>';
        roomSelect.disabled = true;
        return;
    }

    try {
        const params = new URLSearchParams({
            batch_id: String(currentScheduleRequest.batch_id || ''),
            module_id: String(currentScheduleRequest.module_id || ''),
            trainer_id: String(currentScheduleRequest.trainer_id || ''),
            scope_type: String(currentScheduleRequest.scope_type || ''),
            trainer_assignment_mode: String(currentScheduleRequest.trainer_assignment_mode || 'single'),
            schedule,
            effective_date: document.getElementById('trainerRequestEffectiveDate')?.value || '',
            request_id: String(currentScheduleRequest.request_id || '')
        });
        const response = await axios.get(`${API_BASE_URL}/role/registrar/schedule.php?action=available-rooms&${params.toString()}`);
        const rooms = response.data?.success && Array.isArray(response.data.data) ? response.data.data : [];

        if (!rooms.length) {
            roomSelect.innerHTML = '<option value="">No available rooms for this schedule</option>';
            roomSelect.disabled = true;
            return;
        }

        rooms.forEach((room) => {
            const option = document.createElement('option');
            option.value = room.room_id;
            option.textContent = room.room_name;
            if (String(room.room_id) === preferredRoomId) {
                option.selected = true;
            }
            roomSelect.appendChild(option);
        });
    } catch (error) {
        if (fallbackRoomId) {
            roomSelect.innerHTML = `<option value="${escapeHtml(fallbackRoomId)}">${escapeHtml(fallbackRoomName)}</option>`;
            roomSelect.value = fallbackRoomId;
            roomSelect.disabled = false;
            return;
        }

        roomSelect.innerHTML = '<option value="">Unable to load rooms</option>';
        roomSelect.disabled = true;
    }
}

async function acceptTrainerScheduleProposal() {
    if (!currentScheduleRequest || !currentTrainerId) {
        return;
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainer/trainer_dashboard.php?action=respond-schedule-request`, {
            trainer_id: currentTrainerId,
            request_id: currentScheduleRequest.request_id,
            response_action: 'accept',
            trainer_note: document.getElementById('trainerRequestNoteInput')?.value?.trim() || '',
            user_id: getCurrentUserId()
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Unable to accept the schedule.');
        }

        Swal.fire({ title: 'Success', text: response.data.message || 'Schedule accepted successfully.', icon: 'success' });
        trainerScheduleRequestModal?.hide();
        clearScheduleRequestIntent();
        await loadDashboardData(currentTrainerId);
    } catch (error) {
        const message = error?.response?.data?.message || error.message || 'Unable to accept the schedule.';
        Swal.fire({ title: 'Error', text: message, icon: 'error' });
    }
}

async function submitTrainerScheduleProposal() {
    if (!currentScheduleRequest || !currentTrainerId) {
        return;
    }

    const schedule = getCurrentTrainerRequestSchedule();
    if (!schedule) {
        Swal.fire({ title: 'Error', text: 'Please choose a schedule before submitting your proposal.', icon: 'error' });
        return;
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainer/trainer_dashboard.php?action=respond-schedule-request`, {
            trainer_id: currentTrainerId,
            request_id: currentScheduleRequest.request_id || '',
            response_action: 'propose',
            batch_id: currentScheduleRequest.batch_id,
            module_id: currentScheduleRequest.module_id || '',
            scope_type: currentScheduleRequest.scope_type || '',
            trainer_assignment_mode: currentScheduleRequest.trainer_assignment_mode || 'single',
            schedule,
            room_id: document.getElementById('trainerRequestRoomSelect')?.value || getTrainerRequestSeedRoomId(currentScheduleRequest),
            effective_date: document.getElementById('trainerRequestEffectiveDate')?.value || '',
            trainer_note: document.getElementById('trainerRequestNoteInput')?.value?.trim() || '',
            user_id: getCurrentUserId()
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Unable to submit the schedule proposal.');
        }

        Swal.fire({ title: 'Success', text: response.data.message || 'Schedule proposal sent successfully.', icon: 'success' });
        trainerScheduleRequestModal?.hide();
        clearScheduleRequestIntent();
        await loadDashboardData(currentTrainerId);
    } catch (error) {
        const message = error?.response?.data?.message || error.message || 'Unable to submit the schedule proposal.';
        Swal.fire({ title: 'Error', text: message, icon: 'error' });
    }
}

function renderScheduleTimetable(items) {
    const tbody = document.getElementById('trainerTimetableBody');
    const headRow = document.getElementById('trainerTimetableHeadRow');
    if (!tbody || !headRow) return;

    const timeSlots = buildTimeSlots(8, 22);
    const visibleDays = resolveVisibleTimetableDays(currentTimetableDayFilter);
    headRow.innerHTML = `<th scope="col" class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 w-24">Time</th>` +
        visibleDays.map((day) => `<th scope="col" class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">${escapeHtml(day)}</th>`).join('');
    tbody.innerHTML = '';

    timeSlots.forEach((time) => {
        const row = document.createElement('tr');
        row.className = 'divide-x divide-slate-200';
        row.innerHTML = `<td class="px-4 py-3 text-center font-medium text-xs text-slate-600 bg-slate-50 w-24">${formatDisplayTime(time)}</td>` +
            visibleDays.map(() => '<td class="px-3 py-2 align-top text-xs text-slate-500 h-20"></td>').join('');
        tbody.appendChild(row);
    });

    if (!items.length) {
        return;
    }

    const rows = tbody.querySelectorAll('tr');
    items.forEach((item, index) => {
        const parsed = parseScheduleToDays(item.schedule || '');
        if (!parsed.days.length || !parsed.startTime || !parsed.endTime) {
            return;
        }

        const color = TIMETABLE_PALETTE[index % TIMETABLE_PALETTE.length];
        const titleSource = String(item.scope_type || '') === 'module'
            ? (item.scope_label || item.module_title || item.batch_name || 'Schedule')
            : (item.batch_name || 'Schedule');
        const title = truncateLabel(titleSource, 56);
        const room = formatRoomValue(item.room);
        const subtitleSource = room === 'TBA'
            ? (String(item.scope_type || '') === 'module'
                ? (item.batch_name || item.course_name || 'TBA')
                : (item.course_name || 'TBA'))
            : room;
        const subtitle = truncateLabel(subtitleSource, 32);

        timeSlots.forEach((timeSlot, timeIndex) => {
            if (!timeInRange(timeSlot, parsed.startTime, parsed.endTime)) {
                return;
            }

            const row = rows[timeIndex];
            if (!row) return;
            const cells = row.querySelectorAll('td');

            parsed.days.forEach((day) => {
                const dayIndex = visibleDays.indexOf(day);
                if (dayIndex < 0) return;

                const cell = cells[dayIndex + 1];
                if (!cell) return;

                cell.innerHTML += `
                    <div class="mb-1.5 rounded-lg border px-2 py-1.5 text-[11px] leading-4 shadow-sm"
                        style="background:${color.bg}; border-color:${color.border}; color:${color.text};">
                        <div class="font-semibold">${escapeHtml(title)}</div>
                        <div class="opacity-80">${escapeHtml(subtitle)}</div>
                    </div>
                `;
            });
        });
    });
}

function resolveVisibleTimetableDays(filterValue) {
    const value = String(filterValue || 'today');

    if (value === 'all') {
        return [...TIMETABLE_DAYS];
    }

    if (value === 'today') {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        return TIMETABLE_DAYS.includes(today) ? [today] : [...TIMETABLE_DAYS];
    }

    return TIMETABLE_DAYS.includes(value) ? [value] : [...TIMETABLE_DAYS];
}

function updateTimetableFilterNote() {
    const note = document.getElementById('trainerTimetableFilterNote');
    if (!note) return;

    const visibleDays = resolveVisibleTimetableDays(currentTimetableDayFilter);
    if (currentTimetableDayFilter === 'all') {
        note.textContent = 'Showing the full weekly schedule.';
        return;
    }

    if (currentTimetableDayFilter === 'today') {
        note.textContent = visibleDays.length === 1
            ? `Showing today's schedule for ${visibleDays[0]}.`
            : 'Showing the full weekly schedule.';
        return;
    }

    note.textContent = `Showing the schedule for ${visibleDays[0]}.`;
}

function formatDateLabel(value) {
    if (!value) {
        return 'Not set';
    }

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return 'Not set';
    }

    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTimeLabel(value) {
    if (!value) {
        return 'Not submitted yet';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Not submitted yet';
    }

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function formatRequestStatus(status) {
    const labels = {
        awaiting_schedule: 'Awaiting Schedule',
        pending_trainer_response: 'Pending Trainer Response',
        pending_registrar_approval: 'Pending Registrar Approval',
        approved: 'Approved',
        rejected: 'Rejected',
        modification_requested: 'Changes Requested'
    };

    return labels[String(status || '')] || 'Pending';
}

function getStatusBadgeClasses(status) {
    if (status === 'awaiting_schedule') return 'bg-violet-100 text-violet-700';
    if (status === 'approved') return 'bg-emerald-100 text-emerald-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    if (status === 'modification_requested') return 'bg-amber-100 text-amber-700';
    if (status === 'pending_registrar_approval') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-200 text-slate-700';
}

function buildStatusBadgeHtml(status) {
    return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClasses(String(status || ''))}">${escapeHtml(formatRequestStatus(status))}</span>`;
}

function getCurrentUserId() {
    try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        return Number(stored?.user_id || stored?.user?.user_id || 0) || null;
    } catch (error) {
        return null;
    }
}

function buildTimeSlots(startHour, endHour) {
    const slots = [];
    for (let hour = startHour; hour <= endHour; hour += 1) {
        slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
}

function formatDisplayTime(time24) {
    const [hourText, minute] = String(time24).split(':');
    const hour = Number(hourText);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute} ${suffix}`;
}

function formatTime(time24) {
    return formatDisplayTime(time24);
}

function parseScheduleToDays(scheduleText) {
    if (!scheduleText) {
        return { days: [], startTime: '', endTime: '' };
    }

    const rawText = String(scheduleText).trim();
    const text = rawText.toLowerCase();
    let startTime = '';
    let endTime = '';

    const timeMatch24 = text.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
    const timeMatch12 = text.match(/(\d+):(\d+)\s*(am|pm)\s*-\s*(\d+):(\d+)\s*(am|pm)/i);

    if (timeMatch24) {
        startTime = `${timeMatch24[1]}:${timeMatch24[2]}`;
        endTime = `${timeMatch24[3]}:${timeMatch24[4]}`;
    } else if (timeMatch12) {
        startTime = convertTo24Hour(timeMatch12[1], timeMatch12[2], timeMatch12[3]);
        endTime = convertTo24Hour(timeMatch12[4], timeMatch12[5], timeMatch12[6]);
    }

    const explicitDays = new Set();
    const dayPatterns = [
        { pattern: /monday|mon\b/gi, day: 'Monday' },
        { pattern: /tuesday|tue\b/gi, day: 'Tuesday' },
        { pattern: /wednesday|wed\b/gi, day: 'Wednesday' },
        { pattern: /thursday|thu\b|thur\b/gi, day: 'Thursday' },
        { pattern: /friday|fri\b/gi, day: 'Friday' },
        { pattern: /saturday|sat\b/gi, day: 'Saturday' }
    ];

    dayPatterns.forEach(({ pattern, day }) => {
        if (pattern.test(text)) {
            explicitDays.add(day);
        }
    });

    if (text.includes('weekdays') || text.includes('day shift') || text.includes('night shift')) {
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach((day) => explicitDays.add(day));
    }

    if (text.includes('mwf')) {
        ['Monday', 'Wednesday', 'Friday'].forEach((day) => explicitDays.add(day));
    }

    if (text.includes('tth')) {
        ['Tuesday', 'Thursday'].forEach((day) => explicitDays.add(day));
    }

    const compactPrefix = rawText.split('(')[0].replace(/[^A-Za-z]/g, '');
    if (compactPrefix && /^(m|t|w|th|f|s)+$/i.test(compactPrefix)) {
        extractCompactDayCodes(compactPrefix).forEach((day) => explicitDays.add(day));
    }

    return {
        days: TIMETABLE_DAYS.filter((day) => explicitDays.has(day)),
        startTime,
        endTime
    };
}

function extractCompactDayCodes(compactText) {
    const days = [];
    const text = String(compactText || '').toLowerCase();
    let index = 0;

    while (index < text.length) {
        const pair = text.slice(index, index + 2);
        if (pair === 'th') {
            days.push('Thursday');
            index += 2;
            continue;
        }

        const token = text[index];
        if (token === 'm') days.push('Monday');
        if (token === 't') days.push('Tuesday');
        if (token === 'w') days.push('Wednesday');
        if (token === 'f') days.push('Friday');
        if (token === 's') days.push('Saturday');
        index += 1;
    }

    return days;
}

function convertTo24Hour(hour, minute, meridiem) {
    let value = Number(hour);
    const suffix = String(meridiem).toLowerCase();

    if (suffix === 'pm' && value !== 12) value += 12;
    if (suffix === 'am' && value === 12) value = 0;

    return `${String(value).padStart(2, '0')}:${minute}`;
}

function timeInRange(timeSlot, startTime, endTime) {
    return timeSlot >= startTime && timeSlot < endTime;
}

function renderModuleProgressChart(labels, scores) {
    const ctx = document.getElementById('moduleProgressChart');
    if (!ctx) return;

    const existing = Chart.getChart('moduleProgressChart');
    if (existing) existing.destroy();

    const hasData = labels.length > 0;
    const chartLabels = hasData ? labels : ['No data yet'];
    const chartData = hasData ? scores : [0];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Average Score per Module',
                data: chartData,
                backgroundColor: '#2563eb',
                borderRadius: 8,
                barPercentage: 0.62,
                categoryPercentage: 0.7,
                maxBarThickness: 56
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 4, right: 8, bottom: 8 } },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: (items) => items?.[0]?.label || '',
                        label: (context) => `${context.raw}%`
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#475569',
                        font: { size: 10 },
                        padding: 10,
                        maxRotation: 0,
                        minRotation: 0,
                        autoSkip: chartLabels.length > 8,
                        callback: (_value, index) => wrapLabel(chartLabels[index], 12, 3)
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#475569',
                        callback: (value) => `${value}%`
                    },
                    grid: { color: '#e2e8f0' }
                }
            }
        }
    });
}

function renderAvgGradesChart(labels, scores) {
    const ctx = document.getElementById('avgGradesChart');
    const legendEl = document.getElementById('avgGradesLegend');
    if (!ctx || !legendEl) return;

    const existing = Chart.getChart('avgGradesChart');
    if (existing) existing.destroy();

    if (!labels.length) {
        legendEl.innerHTML = '<p class="text-sm text-slate-500">No grade data yet.</p>';
        new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['No data'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
        return;
    }

    const colors = buildPalette(labels.length);
    const total = scores.reduce((sum, val) => sum + Number(val || 0), 0);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: scores,
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '46%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items) => items?.[0]?.label || '',
                        label: (context) => {
                            const value = Number(context.raw || 0);
                            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                            return `${value.toFixed(1)} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });

    legendEl.innerHTML = labels.map((label, index) => {
        const value = Number(scores[index] || 0);
        const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
        const safeLabel = escapeHtml(label);
        return `
            <div class="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                <span class="mt-1 inline-block h-3 w-3 rounded-sm shrink-0" style="background:${colors[index]}"></span>
                <div class="min-w-0">
                    <p class="text-xs font-semibold leading-5 text-slate-700" title="${safeLabel}" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${safeLabel}</p>
                    <p class="text-xs text-slate-500">${value.toFixed(1)} pts - ${percent}%</p>
                </div>
            </div>
        `;
    }).join('');
}

function clampScore(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n < 0) return 0;
    if (n > 100) return 100;
    return Number(n.toFixed(2));
}

function truncateLabel(label, maxLen = 40) {
    const text = String(label || '');
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen - 3)}...`;
}

function wrapLabel(label, maxCharsPerLine = 18, maxLines = 2) {
    const text = String(label || '').trim();
    if (!text) return '';

    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
        const safeWord = word.length > maxCharsPerLine ? truncateLabel(word, maxCharsPerLine) : word;
        const nextLine = currentLine ? `${currentLine} ${safeWord}` : safeWord;

        if (nextLine.length <= maxCharsPerLine || !currentLine) {
            currentLine = nextLine;
            return;
        }

        lines.push(currentLine);
        currentLine = safeWord;
    });

    if (currentLine) {
        lines.push(currentLine);
    }

    if (lines.length <= maxLines) {
        return lines;
    }

    const limitedLines = lines.slice(0, maxLines);
    limitedLines[maxLines - 1] = truncateLabel(limitedLines[maxLines - 1], maxCharsPerLine);
    return limitedLines;
}

function buildPalette(count) {
    const palette = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#1e40af', '#0284c7', '#0ea5e9'];
    return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatRoomValue(room) {
    const value = String(room ?? '').trim();
    if (!value || value.toLowerCase() === 'null' || value === '0') {
        return 'TBA';
    }
    return value;
}
