const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const SCHEDULE_WORKFLOW_ROLE = String(window.SCHEDULE_WORKFLOW_ROLE || 'registrar').trim().toLowerCase() === 'admin'
    ? 'admin'
    : 'registrar';
const SCHEDULE_ACTOR_LABEL = SCHEDULE_WORKFLOW_ROLE === 'admin' ? 'Admin' : 'Registrar';
const SCHEDULE_API_URL = `${API_BASE_URL}/role/${SCHEDULE_WORKFLOW_ROLE}/schedule.php`;
const SCHEDULE_BATCHES_API_URL = SCHEDULE_WORKFLOW_ROLE === 'admin'
    ? `${API_BASE_URL}/role/admin/schedule_batches.php`
    : `${API_BASE_URL}/role/registrar/batches.php`;
let scheduleModal;
let timetableDetailsModal;
let allTrainers = [];
let allScheduleRows = [];
let allScheduleTableRows = [];
let timetableDisplayRows = [];
let allBatches = [];
let allRooms = [];
let currentScheduleRow = null;
let currentUnitAssignmentBatchId = '';
let currentUnitAssignmentGroups = [];
let latestUnitAssignmentLoadToken = 0;
let currentUnitAssignmentFocusGroupKey = '';

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
    hydrateHeaderUser();
    initScheduleTabs();
    initUnitAssignmentTabs();

    scheduleModal = new SimpleModal(document.getElementById('assignScheduleModal'));
    timetableDetailsModal = new SimpleModal(document.getElementById('timetableScheduleDetailsModal'));
    initScheduleTypeToggle();
    buildTimetable();
    await loadScheduleData();
    await loadSchedulePresets();

    const assignScheduleForm = document.getElementById('assignScheduleForm');
    if (assignScheduleForm) {
        assignScheduleForm.addEventListener('submit', saveSchedule);
    }

    document.getElementById('removeAssignmentBtn')?.addEventListener('click', removeCurrentAssignment);
    document.getElementById('assignTrainerSelect')?.addEventListener('change', handleAssignTrainerSelectionChange);
    document.getElementById('applyBulkUnitTrainerBtn')?.addEventListener('click', applyBulkTrainerAssignmentForActiveTab);

    const schedulesBody = document.getElementById('schedulesTableBody');
    if (schedulesBody) {
        schedulesBody.addEventListener('click', (event) => {
            const btn = event.target.closest('.assign-btn');
            if (!btn) return;
            const rowId = btn.dataset.rowId;
            const row = allScheduleTableRows.find((item) => item.row_id === rowId);
            if (row) {
                openAssignModal(row);
            }
        });
    }



    const timetableBody = document.getElementById('timetableBody');
    if (timetableBody) {
        timetableBody.addEventListener('click', (event) => {
            const entry = event.target.closest('[data-timetable-row-index]');
            if (!entry) return;

            const rowIndex = Number(entry.dataset.timetableRowIndex);
            const row = timetableDisplayRows[rowIndex];
            if (row) openTimetableScheduleDetailsModal(row);
        });
    }

    document.getElementById('timetableTrainerFilter')?.addEventListener('change', (e) => {
        updateQualificationFilter(e.target.value);
        updateBatchFilter(e.target.value, document.getElementById('timetableQualificationFilter')?.value || '');
        rebuildTimetable();
    });
    document.getElementById('timetableQualificationFilter')?.addEventListener('change', (e) => {
        const trainerId = document.getElementById('timetableTrainerFilter')?.value || '';
        updateBatchFilter(trainerId, e.target.value);
        rebuildTimetable();
    });
    document.getElementById('timetableBatchFilter')?.addEventListener('change', rebuildTimetable);
    document.getElementById('assignScheduleSelect')?.addEventListener('change', refreshRoomDropdownForCurrentModal);
    document.querySelectorAll('input[name="customDays"]').forEach((checkbox) => {
        checkbox.addEventListener('change', refreshRoomDropdownForCurrentModal);
    });
    document.getElementById('customMorningStartTime')?.addEventListener('input', refreshRoomDropdownForCurrentModal);
    document.getElementById('customMorningEndTime')?.addEventListener('input', refreshRoomDropdownForCurrentModal);
    document.getElementById('customAfternoonStartTime')?.addEventListener('input', refreshRoomDropdownForCurrentModal);
    document.getElementById('customAfternoonEndTime')?.addEventListener('input', refreshRoomDropdownForCurrentModal);
    document.getElementById('assignEffectiveDate')?.addEventListener('change', refreshRoomDropdownForCurrentModal);
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
        const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.full_name || user.name || user.username || SCHEDULE_ACTOR_LABEL;
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
            if (modalId === 'assignScheduleModal' && scheduleModal) scheduleModal.hide();
            if (modalId === 'timetableScheduleDetailsModal' && timetableDetailsModal) {
                timetableDetailsModal.hide();
            }
        });
    });
}

function initScheduleTabs() {
    document.querySelectorAll('.schedule-tab-btn').forEach((button) => {
        button.addEventListener('click', () => {
            showScheduleTab(button.getAttribute('data-tab'));
        });
    });
}

function showScheduleTab(tabName = 'timetable') {
    const normalizedTab = ['timetable', 'batches'].includes(String(tabName)) ? String(tabName) : 'timetable';
    const tabButtons = document.querySelectorAll('.schedule-tab-btn');
    const tabContents = document.querySelectorAll('.schedule-tab-content');

    tabContents.forEach((tab) => tab.classList.add('hidden'));
    tabButtons.forEach((btn) => {
        btn.classList.remove('border-blue-600', 'bg-white', 'text-blue-700');
        btn.classList.add('border-transparent', 'text-slate-600');
    });

    document.getElementById(`${normalizedTab}-tab`)?.classList.remove('hidden');
    const activeButton = document.querySelector(`.schedule-tab-btn[data-tab="${normalizedTab}"]`);
    activeButton?.classList.remove('border-transparent', 'text-slate-600');
    activeButton?.classList.add('border-blue-600', 'bg-white', 'text-blue-700');
}

function initUnitAssignmentTabs() {
    document.querySelectorAll('.unit-assignment-tab-btn').forEach((button) => {
        button.addEventListener('click', () => {
            setUnitAssignmentTab(button.dataset.unitTab || 'core');
        });
    });

    setUnitAssignmentTab('core');
}

function setUnitAssignmentTab(tabName) {
    const normalizedTab = ['core', 'basic', 'common'].includes(String(tabName)) ? String(tabName) : 'core';
    document.querySelectorAll('.unit-assignment-tab-btn').forEach((button) => {
        const isActive = button.dataset.unitTab === normalizedTab;
        button.classList.toggle('bg-blue-600', isActive);
        button.classList.toggle('text-white', isActive);
        button.classList.toggle('border', !isActive);
        button.classList.toggle('border-slate-300', !isActive);
        button.classList.toggle('bg-white', !isActive);
        button.classList.toggle('text-slate-600', !isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.unit-assignment-tab-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `unitTrainerAssignments-${normalizedTab}`);
    });

    updateBulkUnitAssignBar(normalizedTab);
    syncSchedulingContextToActiveTab({ shouldSyncForm: true });
}

async function loadScheduleData() {
    try {
        const response = await axios.get(`${SCHEDULE_API_URL}?action=get-data`);
        if (!response.data.success) return;

        const { trainers, batches, schedule_rows: scheduleRows } = response.data.data;
        allTrainers = (trainers || []).map((trainer) => ({
            ...trainer,
            qualification_ids: parseIdList(trainer.qualification_ids)
        }));
        allBatches = Array.isArray(batches) ? batches : [];
        allScheduleRows = (scheduleRows || []).map(normalizeScheduleRow);
        allScheduleTableRows = getScheduleTableRows();
        // Schedule requests feature has been removed from the system

        populateTimeTableFilters();
        renderScheduleTable();
        rebuildTimetable();
    } catch (error) {
        console.error('Error loading schedule data:', error);
    }
}

function normalizeScheduleRow(row) {
    return {
        ...row,
        batch_id: Number(row.batch_id || 0),
        qualification_id: Number(row.qualification_id || 0),
        start_date: row.start_date ? String(row.start_date) : '',
        end_date: row.end_date ? String(row.end_date) : '',
        trainer_id: row.trainer_id ? Number(row.trainer_id) : null,
        module_id: row.module_id ? Number(row.module_id) : null,
        room_id: row.room_id ? Number(row.room_id) : null,
        module_group_key: row.module_group_key ? String(row.module_group_key) : '',
        module_options: Array.isArray(row.module_options)
            ? row.module_options.map((option) => ({
                ...option,
                module_id: Number(option.module_id || 0),
                trainer_id: Number(option.trainer_id || 0)
            }))
            : [],
        is_assigned: Boolean(row.is_assigned),
        assignable: row.assignable !== false && row.assignable !== 0
    };
}

function normalizeUnitAssignmentGroup(group) {
    return {
        ...group,
        group_key: String(group.group_key || ''),
        qualification_id: Number(group.qualification_id || 0),
        trainer_options: Array.isArray(group.trainer_options)
            ? group.trainer_options.map((option) => ({
                ...option,
                module_id: Number(option.module_id || 0),
                trainer_id: Number(option.trainer_id || 0)
            }))
            : [],
        selected_module_id: group.selected_module_id ? Number(group.selected_module_id) : null,
        selected_trainer_id: group.selected_trainer_id ? Number(group.selected_trainer_id) : null,
        selected_schedule: group.selected_schedule ? String(group.selected_schedule) : '',
        selected_room_id: group.selected_room_id ? Number(group.selected_room_id) : null,
        has_saved_assignment: Boolean(group.has_saved_assignment)
    };
}

function updateUnitAssignmentBatchMeta(batch) {
    const leadTrainer = document.getElementById('unitTrainerLeadDisplay');
    const qualification = document.getElementById('unitTrainerQualificationDisplay');

    if (leadTrainer) {
        leadTrainer.textContent = batch
            ? (batch.lead_trainer_name || batch.trainer_name || 'No lead trainer assigned')
            : 'Not selected';
    }

    if (qualification) {
        qualification.textContent = batch
            ? (batch.qualification_name || 'Unknown qualification')
            : 'Select a batch to view units';
    }
}

function resetUnitAssignmentState(message = 'Select a multiple-mode batch to load its units of competency.') {
    currentUnitAssignmentGroups = [];
    currentUnitAssignmentFocusGroupKey = '';
    const emptyState = document.getElementById('unitTrainerAssignmentEmptyState');
    const panels = document.getElementById('unitTrainerAssignmentPanels');
    const summary = document.getElementById('unitTrainerAssignmentSummary');
    const bulkBar = document.getElementById('unitTrainerBulkAssignBar');

    ['core', 'basic', 'common'].forEach((type) => {
        const panel = document.getElementById(`unitTrainerAssignments-${type}`);
        if (panel) panel.innerHTML = '';
    });

    if (emptyState) {
        emptyState.textContent = message;
        emptyState.classList.remove('hidden');
    }
    if (panels) panels.classList.add('hidden');
    if (summary) summary.textContent = '0 of 0 units assigned';
    if (bulkBar) bulkBar.classList.add('hidden');
    setUnitAssignmentTab('core');
    updateSchedulingSectionOverview();
}

function getCurrentUnitAssignmentTab() {
    const activeButton = document.querySelector('.unit-assignment-tab-btn[aria-selected="true"]');
    return activeButton?.dataset.unitTab || 'core';
}

function capitalizeWord(value) {
    const normalized = String(value || '').trim();
    return normalized ? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}` : '';
}

function getCurrentUnitAssignmentBatch() {
    const batchId = currentUnitAssignmentBatchId || currentScheduleRow?.batch_id || '';
    return allBatches.find((item) => String(item.batch_id || '') === String(batchId)) || null;
}

function parseDateOnly(dateString) {
    const match = String(dateString || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(dateString) {
    const date = parseDateOnly(dateString);
    if (!date) return 'Not set yet';
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatHourValue(hours) {
    const normalized = Number(hours || 0);
    if (!Number.isFinite(normalized) || normalized <= 0) {
        return '0 hrs';
    }

    const rounded = Math.round(normalized * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} hrs`;
}

function calculateScheduleSessions(schedule, startDateString, endDateString) {
    const parsedSchedule = parseScheduleToDays(schedule);
    const startDate = parseDateOnly(startDateString);
    const endDate = parseDateOnly(endDateString);
    if (!parsedSchedule.days.length || !parsedSchedule.timeRanges.length || !startDate || !endDate || startDate > endDate) {
        return {
            sessions: 0,
            hoursPerSession: 0,
            totalHours: 0
        };
    }

    const totalMinutesPerSession = parsedSchedule.timeRanges.reduce((sum, range) => {
        const startMinutes = toTimeMinutes(range.startTime);
        const endMinutes = toTimeMinutes(range.endTime);
        if (startMinutes < 0 || endMinutes <= startMinutes) return sum;
        return sum + (endMinutes - startMinutes);
    }, 0);

    if (totalMinutesPerSession <= 0) {
        return {
            sessions: 0,
            hoursPerSession: 0,
            totalHours: 0
        };
    }

    const dayIndexMap = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6
    };
    const scheduledDays = new Set(
        parsedSchedule.days
            .map((day) => dayIndexMap[day])
            .filter((value) => typeof value === 'number')
    );
    if (!scheduledDays.size) {
        return {
            sessions: 0,
            hoursPerSession: 0,
            totalHours: 0
        };
    }

    let sessions = 0;
    const cursor = new Date(startDate.getTime());
    while (cursor <= endDate) {
        if (scheduledDays.has(cursor.getDay())) {
            sessions += 1;
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    const hoursPerSession = totalMinutesPerSession / 60;
    return {
        sessions,
        hoursPerSession,
        totalHours: sessions * hoursPerSession
    };
}

function getEffectiveScheduleForUnit(unit) {
    if (!unit) return '';

    const isFocused = String(unit.group_key || '') === String(currentUnitAssignmentFocusGroupKey || '');
    const modalIsActiveForUnit = currentScheduleRow &&
        currentScheduleRow.trainer_assignment_mode === 'multiple' &&
        currentScheduleRow.scope_type !== 'lead_batch' &&
        isFocused;

    if (modalIsActiveForUnit) {
        return getCurrentScheduleForRoomFilter() || unit.selected_schedule || '';
    }

    return unit.selected_schedule || '';
}

function getActiveSchedulingUnitForTab(tabName = getCurrentUnitAssignmentTab()) {
    const units = getUnitsForCompetencyType(tabName);
    if (!units.length) return null;

    const focused = getUnitAssignmentGroupByKey(currentUnitAssignmentFocusGroupKey);
    if (focused && String(focused.competency_type || '').toLowerCase() === String(tabName || '').toLowerCase()) {
        return focused;
    }

    return units.find((unit) => unit.selected_module_id) || units[0];
}

function syncSchedulingContextToActiveTab(options = {}) {
    const { shouldSyncForm = true } = options;
    const activeTab = getCurrentUnitAssignmentTab();
    const activeUnit = getActiveSchedulingUnitForTab(activeTab);

    if (!activeUnit) {
        updateSchedulingSectionOverview();
        return;
    }

    currentUnitAssignmentFocusGroupKey = String(activeUnit.group_key || '');
    if (
        shouldSyncForm &&
        currentScheduleRow &&
        currentScheduleRow.trainer_assignment_mode === 'multiple' &&
        currentScheduleRow.scope_type !== 'lead_batch'
    ) {
        syncFocusedUnitAssignmentToModal();
        return;
    }

    updateSchedulingSectionOverview();
}

function getUnitsForCompetencyType(type) {
    return currentUnitAssignmentGroups.filter((unit) => String(unit.competency_type || '').toLowerCase() === String(type || '').toLowerCase());
}

function getSharedTrainerOptionsForUnits(units) {
    if (!Array.isArray(units) || !units.length) {
        return [];
    }

    const trainerCounts = new Map();
    const trainerNames = new Map();

    units.forEach((unit) => {
        const seenTrainerIds = new Set();
        (unit.trainer_options || []).forEach((option) => {
            const trainerId = Number(option.trainer_id || 0);
            if (!trainerId || seenTrainerIds.has(trainerId)) {
                return;
            }
            seenTrainerIds.add(trainerId);
            trainerCounts.set(trainerId, (trainerCounts.get(trainerId) || 0) + 1);
            if (!trainerNames.has(trainerId)) {
                trainerNames.set(trainerId, option.trainer_name || 'Unnamed Trainer');
            }
        });
    });

    return Array.from(trainerCounts.entries())
        .filter(([, count]) => count === units.length)
        .map(([trainerId]) => ({
            trainer_id: trainerId,
            trainer_name: trainerNames.get(trainerId) || 'Unnamed Trainer'
        }))
        .sort((left, right) => left.trainer_name.localeCompare(right.trainer_name));
}

function updateBulkUnitAssignBar(activeTab = getCurrentUnitAssignmentTab()) {
    const bulkBar = document.getElementById('unitTrainerBulkAssignBar');
    const select = document.getElementById('bulkUnitTrainerSelect');
    const button = document.getElementById('applyBulkUnitTrainerBtn');
    const title = document.getElementById('unitTrainerBulkAssignTitle');
    const hint = document.getElementById('unitTrainerBulkAssignHint');

    if (!bulkBar || !select || !button || !title || !hint) {
        return;
    }

    const normalizedTab = ['basic', 'common'].includes(String(activeTab)) ? String(activeTab) : '';
    if (!normalizedTab) {
        bulkBar.classList.add('hidden');
        return;
    }

    const units = getUnitsForCompetencyType(normalizedTab);
    if (!units.length) {
        bulkBar.classList.add('hidden');
        return;
    }

    bulkBar.classList.remove('hidden');
    title.textContent = `Assign All ${normalizedTab.charAt(0).toUpperCase()}${normalizedTab.slice(1)} Units To One Trainer`;
    hint.textContent = `Choose one trainer who owns every ${normalizedTab} unit in this batch, then apply it to the whole tab.`;

    const sharedOptions = getSharedTrainerOptionsForUnits(units);
    select.innerHTML = '<option value="">Select Trainer</option>';
    sharedOptions.forEach((option) => {
        const optionEl = document.createElement('option');
        optionEl.value = String(option.trainer_id);
        optionEl.textContent = option.trainer_name;
        select.appendChild(optionEl);
    });

    const sharedSelectedTrainerId = units.length && units.every((unit) => String(unit.selected_trainer_id || '') === String(units[0].selected_trainer_id || ''))
        ? String(units[0].selected_trainer_id || '')
        : '';
    select.value = sharedSelectedTrainerId && sharedOptions.some((option) => String(option.trainer_id) === sharedSelectedTrainerId)
        ? sharedSelectedTrainerId
        : '';

    const hasSharedTrainerChoices = sharedOptions.length > 0;
    select.disabled = !hasSharedTrainerChoices;
    button.disabled = !hasSharedTrainerChoices;

    if (!hasSharedTrainerChoices) {
        hint.textContent = `No single trainer currently owns every ${normalizedTab} unit in this batch.`;
    }
}

async function applyBulkTrainerAssignmentForActiveTab() {
    const activeTab = getCurrentUnitAssignmentTab();
    if (!['basic', 'common'].includes(activeTab)) {
        return;
    }

    const trainerSelect = document.getElementById('bulkUnitTrainerSelect');
    const trainerId = trainerSelect?.value || '';
    if (!trainerId) {
        Swal.fire({ title: 'Select Trainer', text: 'Choose a trainer first for this competency tab.', icon: 'info' });
        return;
    }

    const units = getUnitsForCompetencyType(activeTab);
    units.forEach((unit) => {
        const selectedOption = (unit.trainer_options || []).find((option) => String(option.trainer_id) === String(trainerId));
        if (!selectedOption) {
            return;
        }
        unit.selected_module_id = Number(selectedOption.module_id || 0) || null;
        unit.selected_trainer_id = Number(selectedOption.trainer_id || 0) || null;
        unit.selected_trainer_name = selectedOption.trainer_name || 'Unnamed Trainer';
    });

    const currentFocusedUnit = getUnitAssignmentGroupByKey(currentUnitAssignmentFocusGroupKey);
    if (!currentFocusedUnit || String(currentFocusedUnit.competency_type || '').toLowerCase() !== activeTab) {
        currentUnitAssignmentFocusGroupKey = units[0] ? String(units[0].group_key || '') : '';
    }

    renderUnitAssignmentPanels();
    syncFocusedUnitAssignmentToModal();
}

async function loadUnitAssignmentGroupsForBatch(batchId) {
    const normalizedBatchId = String(batchId || '').trim();
    const batch = allBatches.find((item) => String(item.batch_id) === normalizedBatchId);
    const emptyState = document.getElementById('unitTrainerAssignmentEmptyState');
    const panels = document.getElementById('unitTrainerAssignmentPanels');

    if (!normalizedBatchId || !batch || String(batch.trainer_assignment_mode || '').toLowerCase() !== 'multiple') {
        updateUnitAssignmentBatchMeta(batch || null);
        resetUnitAssignmentState('Select a multiple-mode batch to load its units of competency.');
        return;
    }

    currentUnitAssignmentBatchId = normalizedBatchId;
    updateUnitAssignmentBatchMeta(batch);

    if (panels) panels.classList.add('hidden');
    if (emptyState) {
        emptyState.textContent = 'Loading units of competency...';
        emptyState.classList.remove('hidden');
    }

    const loadToken = ++latestUnitAssignmentLoadToken;

    try {
        const query = new URLSearchParams({
            action: 'get-qualification-units',
            qualification_id: String(batch.qualification_id || ''),
            batch_id: normalizedBatchId
        });
        const response = await axios.get(`${SCHEDULE_BATCHES_API_URL}?${query.toString()}`);
        if (loadToken !== latestUnitAssignmentLoadToken) {
            return;
        }

        if (!response.data.success) {
            throw new Error(response.data.message || 'Unable to load units of competency.');
        }

        currentUnitAssignmentGroups = Array.isArray(response.data.data?.units)
            ? response.data.data.units.map(normalizeUnitAssignmentGroup)
            : [];
        ensureFocusedUnitAssignmentGroupKey();
        renderUnitAssignmentPanels();
        if (currentScheduleRow && currentScheduleRow.trainer_assignment_mode === 'multiple' && currentScheduleRow.scope_type !== 'lead_batch') {
            syncFocusedUnitAssignmentToModal();
        }
    } catch (error) {
        console.error('Error loading unit assignment groups:', error);
        resetUnitAssignmentState(error?.message || 'Unable to load units of competency right now.');
    }
}

function getUnitAssignmentGroupByKey(groupKey) {
    return currentUnitAssignmentGroups.find((unit) => String(unit.group_key || '') === String(groupKey || '')) || null;
}

function ensureFocusedUnitAssignmentGroupKey() {
    if (currentUnitAssignmentFocusGroupKey && getUnitAssignmentGroupByKey(currentUnitAssignmentFocusGroupKey)) {
        return currentUnitAssignmentFocusGroupKey;
    }

    const defaultGroup = currentUnitAssignmentGroups.find((unit) => unit.selected_module_id) || currentUnitAssignmentGroups[0] || null;
    currentUnitAssignmentFocusGroupKey = defaultGroup ? String(defaultGroup.group_key || '') : '';
    return currentUnitAssignmentFocusGroupKey;
}

function updateUnitAssignmentGroupSelection(groupKey, moduleId) {
    const unit = getUnitAssignmentGroupByKey(groupKey);
    if (!unit) return;

    const normalizedModuleId = moduleId ? Number(moduleId) : null;
    const selectedOption = (unit.trainer_options || []).find((option) => Number(option.module_id || 0) === normalizedModuleId) || null;

    unit.selected_module_id = normalizedModuleId;
    unit.selected_trainer_id = selectedOption ? Number(selectedOption.trainer_id || 0) : null;
    unit.selected_trainer_name = selectedOption ? (selectedOption.trainer_name || 'Unnamed Trainer') : null;
}

function buildFocusedScheduleRowFromUnitGroup(unit) {
    return {
        ...currentScheduleRow,
        scope_type: 'module',
        scope_label: unit.scope_label || unit.module_title || 'Unit',
        module_group_key: String(unit.group_key || ''),
        module_id: unit.selected_module_id || null,
        trainer_id: unit.selected_trainer_id || null,
        trainer_name: unit.selected_trainer_name || 'Not assigned yet',
        schedule: unit.selected_schedule || '',
        room_id: unit.selected_room_id || null,
        room: unit.selected_room || null,
        is_assigned: Boolean(unit.has_saved_assignment)
    };
}

function updateSchedulingSectionFocusLabel(text) {
    const focusLabel = document.getElementById('scheduleSectionFocusLabel');
    if (!focusLabel) return;
    focusLabel.textContent = text || 'Choose the batch or unit you want to schedule.';
}

function updateSchedulingSectionOverview() {
    const typeLabel = document.getElementById('scheduleSectionTypeLabel');
    const heading = document.getElementById('scheduleSectionHeading');
    const typeHint = document.getElementById('scheduleSectionTypeHint');
    const selectedHoursLabel = document.getElementById('scheduleSectionSelectedHoursLabel');
    const selectedHours = document.getElementById('scheduleSectionSelectedHours');
    const selectedHoursHint = document.getElementById('scheduleSectionSelectedHoursHint');
    const tabHoursLabel = document.getElementById('scheduleSectionTabHoursLabel');
    const tabHours = document.getElementById('scheduleSectionTabHours');
    const tabHoursHint = document.getElementById('scheduleSectionTabHoursHint');

    const batch = getCurrentUnitAssignmentBatch();
    const batchStart = currentScheduleRow?.start_date || batch?.start_date || '';
    const batchEnd = currentScheduleRow?.end_date || batch?.end_date || '';

    if (!currentScheduleRow) {
        if (typeLabel) typeLabel.textContent = 'Scheduling';
        if (heading) heading.textContent = 'Set Day, Time, and Room';
        if (typeHint) typeHint.textContent = 'Hours update after you choose a session plan.';
        if (selectedHoursLabel) selectedHoursLabel.textContent = 'Selected Schedule Hours';
        if (selectedHours) selectedHours.textContent = '0 hrs';
        if (selectedHoursHint) selectedHoursHint.textContent = 'Choose a preset or custom session plan to update the hours.';
        if (tabHoursLabel) tabHoursLabel.textContent = 'Competency Total';
        if (tabHours) tabHours.textContent = '0 hrs total';
        if (tabHoursHint) tabHoursHint.textContent = '0 of 0 units scheduled';
        return;
    }

    if (currentScheduleRow.trainer_assignment_mode === 'multiple' && currentScheduleRow.scope_type !== 'lead_batch') {
        const activeTab = getCurrentUnitAssignmentTab();
        const activeLabel = capitalizeWord(activeTab) || 'Unit';
        const activeUnit = getActiveSchedulingUnitForTab(activeTab);
        const activeUnits = getUnitsForCompetencyType(activeTab);
        const totalHours = activeUnits.reduce((sum, unit) => {
            const details = calculateScheduleSessions(getEffectiveScheduleForUnit(unit), batchStart, batchEnd);
            return sum + details.totalHours;
        }, 0);
        const scheduledUnits = activeUnits.filter((unit) => getEffectiveScheduleForUnit(unit)).length;
        const activeScheduleDetails = calculateScheduleSessions(
            activeUnit ? getEffectiveScheduleForUnit(activeUnit) : '',
            batchStart,
            batchEnd
        );

        if (typeLabel) typeLabel.textContent = `${activeLabel} Scheduling`;
        if (heading) heading.textContent = `Set ${activeLabel.toLowerCase()} day, time, and room`;
        if (typeHint) typeHint.textContent = 'Hours update from the session plan you choose for this competency.';
        if (selectedHoursLabel) selectedHoursLabel.textContent = `${activeLabel} Unit Hours`;
        if (selectedHours) selectedHours.textContent = formatHourValue(activeScheduleDetails.totalHours);
        if (selectedHoursHint) {
            selectedHoursHint.textContent = activeScheduleDetails.sessions > 0
                ? `${activeScheduleDetails.sessions} session${activeScheduleDetails.sessions === 1 ? '' : 's'} x ${formatHourValue(activeScheduleDetails.hoursPerSession)} each`
                : 'Choose a preset or custom session plan to update the hours.';
        }
        if (tabHoursLabel) tabHoursLabel.textContent = `${activeLabel} Total`;
        if (tabHours) tabHours.textContent = `${formatHourValue(totalHours)} total`;
        if (tabHoursHint) tabHoursHint.textContent = `${scheduledUnits} of ${activeUnits.length} units have schedules`;
        return;
    }

    const currentSchedule = getCurrentScheduleForRoomFilter() || currentScheduleRow.schedule || '';
    const scheduleDetails = calculateScheduleSessions(currentSchedule, batchStart, batchEnd);
    const scopeLabel = currentScheduleRow.scope_type === 'lead_batch' ? 'Lead Trainer' : 'Batch';

    if (typeLabel) typeLabel.textContent = `${scopeLabel} Scheduling`;
    if (heading) heading.textContent = 'Set Day, Time, and Room';
    if (typeHint) typeHint.textContent = 'Hours update after you choose a session plan.';
    if (selectedHoursLabel) selectedHoursLabel.textContent = `${scopeLabel} Hours`;
    if (selectedHours) selectedHours.textContent = formatHourValue(scheduleDetails.totalHours);
    if (selectedHoursHint) {
        selectedHoursHint.textContent = scheduleDetails.sessions > 0
            ? `${scheduleDetails.sessions} session${scheduleDetails.sessions === 1 ? '' : 's'} x ${formatHourValue(scheduleDetails.hoursPerSession)} each`
            : 'Choose a preset or custom session plan to update the hours.';
    }
    if (tabHoursLabel) tabHoursLabel.textContent = `${scopeLabel} Total`;
    if (tabHours) tabHours.textContent = `${formatHourValue(scheduleDetails.totalHours)} total`;
    if (tabHoursHint) tabHoursHint.textContent = currentSchedule ? 'Current saved or previewed session plan.' : 'No schedule selected yet.';
}

function syncFocusedUnitAssignmentToModal() {
    if (!currentScheduleRow || currentScheduleRow.trainer_assignment_mode !== 'multiple') {
        return;
    }

    const focusedGroupKey = ensureFocusedUnitAssignmentGroupKey();
    const focusedUnit = getUnitAssignmentGroupByKey(focusedGroupKey);
    if (!focusedUnit) {
        return;
    }

    currentScheduleRow = buildFocusedScheduleRowFromUnitGroup(focusedUnit);
    document.getElementById('assignScopeType').value = 'module';
    document.getElementById('assignScopeName').textContent = currentScheduleRow.scope_label || 'Unit';
    document.getElementById('assignModeHint').textContent = 'Click a unit card below to choose what you are scheduling, then save its trainer, schedule, and room.';
    updateSchedulingSectionFocusLabel(`Scheduling for: ${currentScheduleRow.scope_label || 'Selected unit'}`);
    document.getElementById('assignModuleId').value = currentScheduleRow.module_id || '';
    document.getElementById('assignResolvedTrainerId').value = currentScheduleRow.trainer_id || '';
    document.getElementById('assignHasAssignment').value = currentScheduleRow.is_assigned ? '1' : '0';

    const removeAssignmentBtn = document.getElementById('removeAssignmentBtn');
    const submitButton = document.querySelector('#assignScheduleForm button[type="submit"]');
    if (removeAssignmentBtn) {
        removeAssignmentBtn.classList.toggle('hidden', !focusedUnit.has_saved_assignment);
    }
    if (submitButton) {
        submitButton.textContent = focusedUnit.has_saved_assignment ? 'Save Unit Schedule' : 'Assign Unit';
    }

    resetScheduleInputs();
    applyScheduleToInputs(focusedUnit.selected_schedule || '');
    populateRoomDropdown(focusedUnit.selected_room_id || '', currentScheduleRow);
    updateSchedulingSectionOverview();
}

function focusUnitAssignmentGroup(groupKey, options = {}) {
    const { shouldRender = true, shouldSyncForm = true } = options;
    const unit = getUnitAssignmentGroupByKey(groupKey);
    if (!unit) {
        return;
    }

    currentUnitAssignmentFocusGroupKey = String(unit.group_key || '');
    if (shouldRender) {
        renderUnitAssignmentPanels();
    }
    if (shouldSyncForm) {
        syncFocusedUnitAssignmentToModal();
    }
}

function renderUnitAssignmentPanels() {
    const emptyState = document.getElementById('unitTrainerAssignmentEmptyState');
    const panels = document.getElementById('unitTrainerAssignmentPanels');
    const grouped = {
        core: currentUnitAssignmentGroups.filter((unit) => String(unit.competency_type).toLowerCase() === 'core'),
        basic: currentUnitAssignmentGroups.filter((unit) => String(unit.competency_type).toLowerCase() === 'basic'),
        common: currentUnitAssignmentGroups.filter((unit) => String(unit.competency_type).toLowerCase() === 'common')
    };

    const types = ['core', 'basic', 'common'];
    let totalUnits = 0;
    let assignedUnits = 0;

    types.forEach((type) => {
        const panel = document.getElementById(`unitTrainerAssignments-${type}`);
        if (!panel) return;

        const units = grouped[type] || [];
        totalUnits += units.length;
        assignedUnits += units.filter((unit) => unit.selected_module_id).length;

        if (!units.length) {
            panel.innerHTML = `
                <div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                    No ${escapeHtml(type)} units available for this batch.
                </div>
            `;
            return;
        }

        panel.innerHTML = units.map((unit) => renderUnitAssignmentCard(unit)).join('');
    });

    const summary = document.getElementById('unitTrainerAssignmentSummary');
    if (summary) {
        summary.textContent = `${assignedUnits} of ${totalUnits} units assigned`;
    }

    if (totalUnits > 0) {
        if (emptyState) emptyState.classList.add('hidden');
        if (panels) panels.classList.remove('hidden');
    } else {
        if (panels) panels.classList.add('hidden');
        if (emptyState) {
            emptyState.textContent = 'No units/modules are available yet for this batch qualification.';
            emptyState.classList.remove('hidden');
        }
    }

    document.querySelectorAll('.unit-assignment-card').forEach((card) => {
        card.addEventListener('click', (event) => {
            if (event.target.closest('.unit-assignment-trainer-select')) {
                return;
            }
            focusUnitAssignmentGroup(card.dataset.groupKey || '');
        });
        card.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }
            event.preventDefault();
            focusUnitAssignmentGroup(card.dataset.groupKey || '');
        });
    });

    document.querySelectorAll('.unit-assignment-trainer-select').forEach((select) => {
        select.addEventListener('change', (event) => {
            const target = event.target;
            updateUnitAssignmentGroupSelection(target.dataset.groupKey || '', target.value || '');
            updateUnitAssignmentSummary();
            focusUnitAssignmentGroup(target.dataset.groupKey || '', { shouldRender: true, shouldSyncForm: true });
        });
    });

    const firstAvailableTab = ['core', 'basic', 'common'].find((type) => (grouped[type] || []).length > 0) || 'core';
    const activeButton = document.querySelector('.unit-assignment-tab-btn[aria-selected="true"]');
    const activeTab = activeButton?.dataset.unitTab || firstAvailableTab;
    setUnitAssignmentTab((grouped[activeTab] || []).length ? activeTab : firstAvailableTab);
}

function renderUnitAssignmentCard(unit) {
    const unitCode = unit.unit_code ? `<p class="text-xs font-medium uppercase tracking-wide text-blue-700">${escapeHtml(unit.unit_code)}</p>` : '';
    const trainerCount = Array.isArray(unit.trainer_options) ? unit.trainer_options.length : 0;
    const trainerSummary = trainerCount > 0
        ? `${trainerCount} trainer${trainerCount === 1 ? '' : 's'} available`
        : 'No trainer module owner available yet';
    const selectDisabled = trainerCount === 0 ? 'disabled' : '';
    const isFocused = currentUnitAssignmentFocusGroupKey && String(unit.group_key || '') === String(currentUnitAssignmentFocusGroupKey);
    const statusText = unit.selected_trainer_name
        ? `Assigned to ${unit.selected_trainer_name}${unit.selected_schedule ? ` - ${unit.selected_schedule}` : ''}`
        : trainerSummary;
    const batch = getCurrentUnitAssignmentBatch();
    const scheduleDetails = calculateScheduleSessions(
        getEffectiveScheduleForUnit(unit),
        batch?.start_date || currentScheduleRow?.start_date || '',
        batch?.end_date || currentScheduleRow?.end_date || ''
    );
    const scheduleMetaText = scheduleDetails.sessions > 0
        ? `${formatHourValue(scheduleDetails.totalHours)} across ${scheduleDetails.sessions} planned session${scheduleDetails.sessions === 1 ? '' : 's'}`
        : 'No session plan hours yet';
    const optionItems = [`<option value="">${trainerCount === 0 ? 'No trainer available yet' : 'Select Trainer'}</option>`];

    (unit.trainer_options || []).forEach((option) => {
        const isSelected = String(option.module_id) === String(unit.selected_module_id || '');
        optionItems.push(`
            <option value="${escapeAttr(option.module_id)}" ${isSelected ? 'selected' : ''}>
                ${escapeHtml(option.trainer_name || 'Unnamed Trainer')}
            </option>
        `);
    });

    return `
        <article
            class="unit-assignment-card cursor-pointer rounded-xl border ${isFocused ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'} bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow"
            data-group-key="${escapeAttr(unit.group_key)}"
            tabindex="0"
            role="button"
            aria-pressed="${isFocused ? 'true' : 'false'}"
        >
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div class="min-w-0">
                    ${unitCode}
                    <h6 class="text-sm font-semibold text-slate-900">${escapeHtml(unit.module_title || 'Untitled Unit')}</h6>
                    <p class="mt-1 text-xs ${isFocused ? 'font-semibold text-blue-700' : 'text-slate-500'}">${escapeHtml(isFocused ? 'This is the unit you are scheduling right now.' : statusText)}</p>
                    <p class="mt-1 text-[11px] text-slate-400">${escapeHtml(scheduleMetaText)}</p>
                </div>
                <div class="w-full lg:w-72">
                    <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Trainer</label>
                    <select
                        class="unit-assignment-trainer-select w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                        data-group-key="${escapeAttr(unit.group_key)}"
                        data-unit-code="${escapeAttr(unit.unit_code || '')}"
                        ${selectDisabled}
                    >
                        ${optionItems.join('')}
                    </select>
                </div>
            </div>
        </article>
    `;
}

function updateUnitAssignmentSummary() {
    const totalUnits = currentUnitAssignmentGroups.length;
    const assignedUnits = currentUnitAssignmentGroups.filter((unit) => unit.selected_module_id).length;
    const summary = document.getElementById('unitTrainerAssignmentSummary');
    if (summary) {
        summary.textContent = `${assignedUnits} of ${totalUnits} units assigned`;
    }
}

function collectUnitAssignments() {
    return currentUnitAssignmentGroups
        .map((unit) => ({
            group_key: unit.group_key || '',
            module_id: unit.selected_module_id || ''
        }))
        .filter((assignment) => assignment.group_key && assignment.module_id);
}

function getFocusedUnitAssignmentSelection() {
    const focusedGroup = getUnitAssignmentGroupByKey(currentUnitAssignmentFocusGroupKey);
    if (!focusedGroup) return null;
    return {
        group_key: focusedGroup.group_key || '',
        module_id: focusedGroup.selected_module_id || ''
    };
}

async function saveUnitAssignmentsForSelectedBatch(options = {}) {
    const {
        batchId = currentUnitAssignmentBatchId,
        showSuccess = true,
        reloadScheduleData = true
    } = options;

    if (!batchId) {
        throw new Error('Please select a multiple-mode batch first.');
    }

    const response = await axios.post(`${SCHEDULE_BATCHES_API_URL}?action=save-unit-assignments`, {
        batch_id: batchId,
        unit_assignments: collectUnitAssignments()
    });

    if (!response.data.success) {
        throw new Error(response.data.message || 'Unable to save unit trainer assignments.');
    }

    if (reloadScheduleData) {
        await loadScheduleData();
    }

    if (showSuccess) {
        Swal.fire({ title: 'Success', text: 'Unit trainer assignments saved successfully.', icon: 'success' });
    }

    return response.data;
}

function buildMultipleModeBatchTableRow(representativeRow) {
    const batchRows = allScheduleRows.filter((row) =>
        row.batch_id === representativeRow.batch_id &&
        row.trainer_assignment_mode === 'multiple' &&
        row.scope_type !== 'lead_batch'
    );
    const trainerNames = Array.from(new Set(
        batchRows
            .filter((row) => row.trainer_id && row.trainer_name)
            .map((row) => row.trainer_name)
    ));
    const scheduleValues = Array.from(new Set(
        batchRows
            .map((row) => String(row.schedule || '').trim())
            .filter(Boolean)
    ));
    const roomValues = Array.from(new Set(
        batchRows
            .map((row) => String(row.room || '').trim())
            .filter(Boolean)
    ));

    let trainerLabel = 'Not assigned yet';
    if (trainerNames.length === 1) {
        trainerLabel = trainerNames[0];
    } else if (trainerNames.length > 1) {
        trainerLabel = `${trainerNames.length} trainers assigned`;
    } else if (!batchRows.some((row) => row.assignable)) {
        trainerLabel = 'No trainer available yet';
    }

    const scheduledUnitCount = batchRows.filter((row) => String(row.schedule || '').trim() !== '').length;
    const scheduleLabel = scheduleValues.length === 1
        ? scheduleValues[0]
        : (scheduleValues.length > 1 ? `${scheduledUnitCount} unit schedules` : null);
    const roomLabel = roomValues.length === 1
        ? roomValues[0]
        : (roomValues.length > 1 ? 'Multiple rooms' : null);

    return {
        ...representativeRow,
        row_id: `batch-${representativeRow.batch_id}-multiple-summary`,
        scope_type: 'module_summary',
        trainer_name: trainerLabel,
        schedule: scheduleLabel,
        room: roomLabel,
        room_id: null,
        is_assigned: batchRows.some((row) => row.is_assigned || row.trainer_id || row.schedule || row.room_id),
        assignable: batchRows.some((row) => row.assignable)
    };
}

function getScheduleTableRows() {
    const rows = [];
    const seenMultipleBatchIds = new Set();

    allScheduleRows.forEach((row) => {
        if (row.trainer_assignment_mode === 'multiple' && row.scope_type !== 'lead_batch') {
            if (seenMultipleBatchIds.has(row.batch_id)) {
                return;
            }
            seenMultipleBatchIds.add(row.batch_id);
            rows.push(buildMultipleModeBatchTableRow(row));
            return;
        }

        rows.push(row);
    });

    return rows;
}

function renderScheduleTable() {
    const tbody = document.getElementById('schedulesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    allScheduleTableRows = getScheduleTableRows();
    if (!allScheduleTableRows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-6 text-center text-sm text-slate-500">No schedule rows available.</td></tr>';
        return;
    }

    allScheduleTableRows.forEach((row) => {
        const assignmentText = row.scope_label || 'Not Set';
        const trainerText = row.trainer_name || 'Not Assigned';
        const scheduleText = row.schedule ? escapeHtml(row.schedule) : '<span class="text-slate-400">Not Set</span>';
        const roomText = row.room ? escapeHtml(row.room) : '<span class="text-slate-400">Not Set</span>';
        const modeText = row.trainer_assignment_mode === 'multiple' ? 'Multiple mode' : 'Single mode';
        let actionLabel = row.trainer_assignment_mode === 'multiple'
            ? (row.scope_type === 'lead_batch'
                ? (row.is_assigned ? 'Update Batch' : 'Assign Batch')
                : (row.is_assigned ? 'Update Unit' : 'Assign Unit'))
            : 'Assign Batch';
        const disabled = !row.assignable;
        if (disabled && row.trainer_assignment_mode === 'multiple') {
            actionLabel = row.scope_type === 'lead_batch' ? 'Assign Lead Trainer First' : 'No Trainer Available';
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm text-slate-800">
                <p class="font-medium text-slate-900">${escapeHtml(row.batch_name)}</p>
                <p class="text-xs text-slate-500">${escapeHtml(modeText)}</p>
            </td>
            <td class="px-4 py-3 text-sm text-slate-700">${row.qualification_name ? escapeHtml(row.qualification_name) : '<span class="text-slate-400">N/A</span>'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(assignmentText)}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(trainerText)}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${scheduleText}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${roomText}</td>
            <td class="px-4 py-3 text-center">
                <button
                    class="assign-btn inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${disabled ? 'cursor-not-allowed opacity-50' : ''}"
                    data-row-id="${escapeAttr(row.row_id)}"
                    ${disabled ? 'disabled' : ''}
                >
                    <i class="fas fa-edit"></i> ${escapeHtml(actionLabel)}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}





function formatDateTimeLabel(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
        return 'Just now';
    }

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function getCurrentUserId() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return Number(user?.user_id || user?.user?.user_id || 0) || null;
    } catch (error) {
        return null;
    }
}

function populateTimeTableFilters() {
    const trainerSelect = document.getElementById('timetableTrainerFilter');
    if (trainerSelect) {
        const trainers = allScheduleRows
            .filter((row) => row.trainer_name && row.trainer_id)
            .reduce((acc, row) => {
                if (!acc.find((item) => item.id === row.trainer_id)) {
                    acc.push({ id: row.trainer_id, name: row.trainer_name });
                }
                return acc;
            }, [])
            .sort((a, b) => a.name.localeCompare(b.name));

        trainerSelect.innerHTML = '<option value="">All Trainers</option>' +
            trainers.map((trainer) => `<option value="${trainer.id}">${escapeHtml(trainer.name)}</option>`).join('');
    }

    updateQualificationFilter(document.getElementById('timetableTrainerFilter')?.value || '');
    updateBatchFilter(
        document.getElementById('timetableTrainerFilter')?.value || '',
        document.getElementById('timetableQualificationFilter')?.value || ''
    );
}

function updateQualificationFilter(trainerId) {
    const qualSelect = document.getElementById('timetableQualificationFilter');
    if (!qualSelect) return;

    const sourceRows = trainerId
        ? allScheduleRows.filter((row) => String(row.trainer_id) === String(trainerId))
        : allScheduleRows;

    const quals = sourceRows
        .filter((row) => row.qualification_name && row.qualification_id)
        .reduce((acc, row) => {
            if (!acc.find((item) => item.id === row.qualification_id)) {
                acc.push({ id: row.qualification_id, name: row.qualification_name });
            }
            return acc;
        }, [])
        .sort((a, b) => a.name.localeCompare(b.name));

    const currentValue = qualSelect.value;
    qualSelect.innerHTML = '<option value="">All Qualifications</option>' +
        quals.map((qual) => `<option value="${qual.id}">${escapeHtml(qual.name)}</option>`).join('');
    qualSelect.value = quals.find((qual) => String(qual.id) === currentValue) ? currentValue : '';
}

function updateBatchFilter(trainerId, qualificationId) {
    const batchSelect = document.getElementById('timetableBatchFilter');
    if (!batchSelect) return;

    const filteredRows = allScheduleRows.filter((row) => {
        if (trainerId && String(row.trainer_id) !== String(trainerId)) return false;
        if (qualificationId && String(row.qualification_id) !== String(qualificationId)) return false;
        return true;
    });

    const batches = filteredRows.reduce((acc, row) => {
        if (!acc.find((item) => item.id === row.batch_id)) {
            acc.push({ id: row.batch_id, name: row.batch_name });
        }
        return acc;
    }, []).sort((a, b) => a.name.localeCompare(b.name));

    const currentValue = batchSelect.value;
    batchSelect.innerHTML = '<option value="">All Batches</option>' +
        batches.map((batch) => `<option value="${batch.id}">${escapeHtml(batch.name)}</option>`).join('');
    batchSelect.value = batches.find((batch) => String(batch.id) === String(currentValue)) ? currentValue : '';
}

function getFilteredScheduleRows() {
    const trainerFilter = document.getElementById('timetableTrainerFilter')?.value || '';
    const qualFilter = document.getElementById('timetableQualificationFilter')?.value || '';
    const batchFilter = document.getElementById('timetableBatchFilter')?.value || '';

    return allScheduleRows.filter((row) => {
        if (trainerFilter && String(row.trainer_id) !== String(trainerFilter)) return false;
        if (qualFilter && String(row.qualification_id) !== String(qualFilter)) return false;
        if (batchFilter && String(row.batch_id) !== String(batchFilter)) return false;
        return true;
    });
}

function buildTimetableDisplayRows(rows) {
    const groupedRows = [];
    const groupedMap = new Map();

    rows.forEach((row) => {
        if (!row.schedule) {
            return;
        }

        if (row.trainer_assignment_mode === 'multiple' && row.scope_type === 'module') {
            const groupKey = [
                'multiple',
                row.batch_id || '',
                row.trainer_id || '',
                row.schedule || '',
                row.room_id || row.room || ''
            ].join('|');

            if (!groupedMap.has(groupKey)) {
                const groupedRow = {
                    ...row,
                    row_id: `timetable-${groupKey}`,
                    scope_type: 'module_group',
                    scope_labels: [],
                    unit_count: 0
                };
                groupedMap.set(groupKey, groupedRow);
                groupedRows.push(groupedRow);
            }

            const groupedRow = groupedMap.get(groupKey);
            groupedRow.scope_labels.push(row.scope_label || row.module_title || 'Unit');
            groupedRow.unit_count += 1;
            return;
        }

        groupedRows.push({
            ...row,
            scope_labels: row.scope_label ? [row.scope_label] : [],
            unit_count: row.scope_type === 'module' ? 1 : 0
        });
    });

    return groupedRows;
}

function getTimetableDescriptor(row) {
    if (row.scope_type === 'module_group') {
        return row.unit_count > 1
            ? `${row.batch_name} - ${row.unit_count} units`
            : `${row.batch_name} - ${row.scope_labels[0] || row.scope_label || 'Unit'}`;
    }

    if (row.scope_type === 'module') {
        return `${row.batch_name} - ${row.scope_label || 'Unit'}`;
    }

    return row.batch_name || 'Batch';
}

function getTimetableUnitSummary(row) {
    if (row.scope_type === 'module_group') {
        const labels = Array.from(new Set((row.scope_labels || []).filter(Boolean)));
        if (!labels.length) return '';
        if (labels.length === 1) return labels[0];
        if (labels.length === 2) return labels.join(' | ');
        return `${labels[0]} | +${labels.length - 1} more`;
    }

    if (row.scope_type === 'module') {
        return row.scope_label || row.module_title || '';
    }

    return '';
}

function formatTimetableTimeRange(parsedSchedule) {
    if (!parsedSchedule?.timeRanges?.length) {
        return '';
    }

    return parsedSchedule.timeRanges
        .map((range) => `${formatTime(range.startTime)} - ${formatTime(range.endTime)}`)
        .join(' / ');
}

function getTimetableTrainerChipClass(row, fallbackIndex) {
    const colorClasses = [
        'bg-blue-100 text-blue-700 hover:bg-blue-200 focus-visible:ring-blue-500',
        'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 focus-visible:ring-emerald-500',
        'bg-pink-100 text-pink-700 hover:bg-pink-200 focus-visible:ring-pink-500',
        'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 focus-visible:ring-cyan-500',
        'bg-amber-100 text-amber-700 hover:bg-amber-200 focus-visible:ring-amber-500',
        'bg-violet-100 text-violet-700 hover:bg-violet-200 focus-visible:ring-violet-500'
    ];
    const identity = String(row?.trainer_id || row?.trainer_name || fallbackIndex || 0);
    const hash = Array.from(identity).reduce((total, character) => total + character.charCodeAt(0), 0);
    return colorClasses[hash % colorClasses.length];
}

function getTimetableEntryTitle(row, descriptor, unitSummary, timeRange) {
    return [
        row?.trainer_name || 'No trainer assigned',
        descriptor,
        unitSummary,
        timeRange,
        row?.room ? `Room: ${row.room}` : ''
    ].filter(Boolean).join('\n');
}

function setTimetableCellDisplayMode(isCompactView) {
    document.querySelectorAll('#timetableBody td:not(.bg-slate-50)').forEach((cell) => {
        cell.classList.toggle('h-16', !isCompactView);
        cell.classList.toggle('h-auto', isCompactView);
        cell.classList.toggle('overflow-hidden', !isCompactView);
        cell.classList.toggle('overflow-visible', isCompactView);
        cell.classList.toggle('px-4', !isCompactView);
        cell.classList.toggle('py-3', !isCompactView);
        cell.classList.toggle('p-1', isCompactView);
    });
}

function setTimetableDetailText(elementId, value, fallback = 'Not set') {
    const element = document.getElementById(elementId);
    if (element) element.textContent = value || fallback;
}

function openTimetableScheduleDetailsModal(row) {
    if (!row) return;

    const parsedSchedule = parseScheduleToDays(row.schedule || '');
    const assignment = getTimetableUnitSummary(row) || row.scope_label || 'Full Batch';
    const timeRange = formatTimetableTimeRange(parsedSchedule);
    const daysAndTime = [parsedSchedule.days.join(', '), timeRange].filter(Boolean).join(' | ');

    setTimetableDetailText('timetableDetailTrainerName', row.trainer_name || 'No trainer assigned');
    setTimetableDetailText('timetableDetailBatchName', row.batch_name || 'Not set');
    setTimetableDetailText('timetableDetailQualification', row.qualification_name || 'Not set');
    setTimetableDetailText('timetableDetailAssignment', assignment);
    setTimetableDetailText('timetableDetailRoom', row.room || 'Room not assigned');
    setTimetableDetailText('timetableDetailSchedule', row.schedule || 'Not set');
    setTimetableDetailText('timetableDetailDaysAndTime', daysAndTime);
    setTimetableDetailText(
        'timetableDetailTrainingPeriod',
        `${formatDateLabel(row.start_date || '')} to ${formatDateLabel(row.end_date || '')}`
    );

    timetableDetailsModal?.show();
}

function toTimeMinutes(timeValue) {
    if (!timeValue) return -1;
    const [hours, minutes] = String(timeValue).split(':').map((value) => parseInt(value, 10));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return -1;
    return (hours * 60) + minutes;
}

function rebuildTimetable() {
    const timeSlots = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timetableBody = document.getElementById('timetableBody');

    if (!timetableBody) return;

    // Every filter state uses the same compact, clickable trainer cards.
    setTimetableCellDisplayMode(true);

    timetableBody.querySelectorAll('td').forEach((cell) => {
        if (!cell.classList.contains('bg-slate-50')) {
            cell.innerHTML = '';
        }
    });

    const filteredRows = buildTimetableDisplayRows(getFilteredScheduleRows());
    timetableDisplayRows = filteredRows;
    filteredRows.forEach((row, index) => {
        if (!row.schedule) return;

        const parsedSchedule = parseScheduleToDays(row.schedule);
        const { days: scheduleDays, timeRanges } = parsedSchedule;
        if (!scheduleDays.length || !timeRanges.length) return;

        const descriptor = getTimetableDescriptor(row);
        const unitSummary = getTimetableUnitSummary(row);
        const timeRange = formatTimetableTimeRange(parsedSchedule);
        const bodyRows = timetableBody.querySelectorAll('tr');
        const scheduleTitle = getTimetableEntryTitle(row, descriptor, unitSummary, timeRange);
        const trainerChipClass = getTimetableTrainerChipClass(row, index);
        const startTimes = timeRanges.map((range) => range.startTime);

        timeSlots.forEach((timeSlot, timeIndex) => {
            if (!scheduleHasTimeSlot(parsedSchedule, timeSlot)) return;
            const bodyRow = bodyRows[timeIndex];
            if (!bodyRow) return;

            const cells = bodyRow.querySelectorAll('td');
            scheduleDays.forEach((day) => {
                const dayIndex = days.indexOf(day);
                if (dayIndex < 0) return;
                const cell = cells[dayIndex + 1];
                if (!cell) return;
                const isStartSlot = startTimes.some((startTime) => toTimeMinutes(timeSlot) === toTimeMinutes(startTime));

                if (!isStartSlot) return;
                cell.innerHTML += `
                    <button
                        type="button"
                        class="mb-1 block w-full truncate rounded px-2 py-1 text-center text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 ${trainerChipClass}"
                        data-timetable-row-index="${index}"
                        aria-label="View schedule details for ${escapeAttr(row.trainer_name || 'the selected trainer')}"
                        title="${escapeAttr(scheduleTitle)}"
                    >
                        ${escapeHtml(row.trainer_name || 'Unassigned trainer')}
                    </button>
                `;
            });
        });
    });
}

async function openAssignModal(row) {
    currentScheduleRow = { ...row };
    currentUnitAssignmentBatchId = String(row.batch_id || '');
    currentUnitAssignmentFocusGroupKey = row.trainer_assignment_mode === 'multiple' && row.scope_type !== 'lead_batch'
        ? String(row.module_group_key || '')
        : '';
    document.getElementById('assignBatchId').value = row.batch_id;
    document.getElementById('assignModuleId').value = row.module_id || '';
    document.getElementById('assignTrainerAssignmentMode').value = row.trainer_assignment_mode || 'single';
    document.getElementById('assignScopeType').value = row.scope_type || '';
    document.getElementById('assignResolvedTrainerId').value = row.trainer_id || '';
    document.getElementById('assignHasAssignment').value = row.is_assigned ? '1' : '0';
    document.getElementById('assignBatchName').textContent = row.batch_name || '';
    document.getElementById('assignScopeName').textContent = row.trainer_assignment_mode === 'multiple' && row.scope_type !== 'lead_batch'
        ? 'Select a unit below'
        : (row.scope_label || 'Full Batch');
    document.getElementById('assignModeHint').textContent = row.trainer_assignment_mode === 'multiple'
        ? (row.scope_type === 'lead_batch'
            ? 'This lead trainer can be scheduled now. Unit/module schedules can be added later once modules are uploaded.'
            : 'Click a unit card below to choose what you are scheduling, then save its trainer, schedule, and room.')
        : 'This batch is using one shared trainer and one shared schedule.';
    updateSchedulingSectionFocusLabel(
        row.trainer_assignment_mode === 'multiple' && row.scope_type !== 'lead_batch'
            ? 'Choose a unit card above, then set its schedule here.'
            : `Scheduling for: ${row.scope_label || row.batch_name || 'Selected batch'}`
    );

    const trainerSelectField = document.getElementById('assignTrainerSelectField');
    const trainerDisplayField = document.getElementById('assignTrainerDisplayField');
    const trainerDisplay = document.getElementById('assignTrainerDisplay');
    const modalUnitAssignmentSection = document.getElementById('modalUnitAssignmentSection');
    const removeAssignmentBtn = document.getElementById('removeAssignmentBtn');
    const submitButton = document.querySelector('#assignScheduleForm button[type="submit"]');

    if (row.trainer_assignment_mode === 'multiple') {
        if (modalUnitAssignmentSection) modalUnitAssignmentSection.classList.remove('hidden');
        if (row.scope_type === 'lead_batch') {
            if (trainerSelectField) trainerSelectField.classList.add('hidden');
            if (trainerDisplayField) trainerDisplayField.classList.remove('hidden');
            if (trainerDisplay) trainerDisplay.textContent = row.trainer_name || 'No trainer assigned';
            if (removeAssignmentBtn) removeAssignmentBtn.classList.add('hidden');
            if (submitButton) {
                submitButton.textContent = 'Save Batch Schedule';
            }
        } else {
            if (trainerSelectField) trainerSelectField.classList.add('hidden');
            if (trainerDisplayField) trainerDisplayField.classList.add('hidden');
            if (removeAssignmentBtn) removeAssignmentBtn.classList.toggle('hidden', !row.is_assigned);
            if (submitButton) {
                submitButton.textContent = row.is_assigned ? 'Save Unit Schedule' : 'Assign Unit';
            }
        }
    } else {
        if (modalUnitAssignmentSection) modalUnitAssignmentSection.classList.add('hidden');
        if (trainerSelectField) trainerSelectField.classList.remove('hidden');
        if (trainerDisplayField) trainerDisplayField.classList.add('hidden');
        populateTrainerSelect(row.qualification_id, row.trainer_id || '');
        if (removeAssignmentBtn) removeAssignmentBtn.classList.add('hidden');
        if (submitButton) submitButton.textContent = 'Save Schedule';
    }

    resetScheduleInputs();
    if (row.trainer_assignment_mode === 'multiple') {
        if (row.scope_type === 'lead_batch') {
            applyScheduleToInputs(row.schedule || '');
            populateRoomDropdown(row.room_id || '', row);
        }
        await loadUnitAssignmentGroupsForBatch(row.batch_id);
    } else {
        applyScheduleToInputs(row.schedule || '');
        populateRoomDropdown(row.room_id || '', row);
        resetUnitAssignmentState();
    }
    updateSchedulingSectionOverview();
    if (scheduleModal) scheduleModal.show();
}

function handleAssignTrainerSelectionChange() {
    if (!currentScheduleRow) return;
    if (currentScheduleRow.trainer_assignment_mode !== 'multiple' || currentScheduleRow.scope_type === 'lead_batch') {
        return;
    }

    syncSelectedModuleOptionToModal();
}

async function ensureRoomsLoaded(forceReload = false) {
    if (!forceReload && allRooms.length) {
        return allRooms;
    }

    const response = await axios.get(`${API_BASE_URL}/admin/rooms.php?action=list`);
    allRooms = response.data.success && Array.isArray(response.data.data) ? response.data.data : [];
    return allRooms;
}

async function populateRoomDropdown(selectedRoomId = '', referenceRow = currentScheduleRow) {
    const roomSelect = document.getElementById('assignRoomSelect');
    if (!roomSelect) return;

    roomSelect.innerHTML = '<option value="">Select Room</option>';
    roomSelect.disabled = false;
    try {
        const selectedSchedule = getCurrentScheduleForRoomFilter();
        if (!selectedSchedule) {
            roomSelect.innerHTML = '<option value="">Select schedule first</option>';
            roomSelect.disabled = true;
            return;
        }

        const params = new URLSearchParams({
            batch_id: String(referenceRow?.batch_id || document.getElementById('assignBatchId')?.value || ''),
            scope_type: String(document.getElementById('assignScopeType')?.value || referenceRow?.scope_type || ''),
            trainer_assignment_mode: String(document.getElementById('assignTrainerAssignmentMode')?.value || referenceRow?.trainer_assignment_mode || 'single'),
            module_id: String(document.getElementById('assignModuleId')?.value || referenceRow?.module_id || ''),
            trainer_id: String(document.getElementById('assignResolvedTrainerId')?.value || document.getElementById('assignTrainerSelect')?.value || referenceRow?.trainer_id || ''),
            schedule: selectedSchedule,
            effective_date: getCurrentEffectiveDate(),
            request_id: ''
        });
        const response = await axios.get(`${SCHEDULE_API_URL}?action=available-rooms&${params.toString()}`);
        const availableRooms = response.data?.success && Array.isArray(response.data.data) ? response.data.data : [];

        if (!availableRooms.length) {
            roomSelect.innerHTML = '<option value="">No available rooms for this schedule</option>';
            roomSelect.disabled = true;
            return;
        }

        availableRooms.forEach((room) => {
            const option = document.createElement('option');
            option.value = room.room_id;
            option.textContent = room.room_name;
            if (String(room.room_id) === String(selectedRoomId)) option.selected = true;
            roomSelect.appendChild(option);
        });

        if (selectedRoomId && !availableRooms.some((room) => String(room.room_id) === String(selectedRoomId))) {
            roomSelect.value = '';
        }
    } catch (error) {
        roomSelect.innerHTML = '<option value="">Error loading rooms</option>';
        roomSelect.disabled = true;
    }
}

function refreshRoomDropdownForCurrentModal() {
    if (!currentScheduleRow) return;
    updateSchedulingSectionOverview();
    const currentRoomId = document.getElementById('assignRoomSelect')?.value || '';
    populateRoomDropdown(currentRoomId, currentScheduleRow);
}

function getCurrentEffectiveDate() {
    return document.getElementById('assignEffectiveDate')?.value || currentScheduleRow?.start_date || '';
}

function resetScheduleInputs() {
    const presetRadio = document.querySelector('input[name="scheduleType"][value="preset"]');
    if (presetRadio) presetRadio.checked = true;

    document.getElementById('assignScheduleSelect').value = '';
    document.querySelectorAll('input[name="customDays"]').forEach((checkbox) => {
        checkbox.checked = false;
    });
    document.getElementById('customMorningStartTime').value = '';
    document.getElementById('customMorningEndTime').value = '';
    document.getElementById('customAfternoonStartTime').value = '';
    document.getElementById('customAfternoonEndTime').value = '';
    const customStartDate = document.getElementById('customStartDate');
    if (customStartDate) customStartDate.value = '';
    const effectiveDateInput = document.getElementById('assignEffectiveDate');
    if (effectiveDateInput) effectiveDateInput.value = currentScheduleRow?.start_date || '';
    const registrarNoteInput = document.getElementById('assignRegistrarNote');
    if (registrarNoteInput) registrarNoteInput.value = '';
    document.getElementById('presetScheduleContainer').classList.remove('hidden');
    document.getElementById('customScheduleContainer').classList.add('hidden');
    const roomSelect = document.getElementById('assignRoomSelect');
    if (roomSelect) {
        roomSelect.innerHTML = '<option value="">Select schedule first</option>';
        roomSelect.disabled = true;
    }
}

function applyScheduleToInputs(schedule) {
    if (!schedule) return;

    const presetSelect = document.getElementById('assignScheduleSelect');
    const presetRadio = document.querySelector('input[name="scheduleType"][value="preset"]');
    const customRadio = document.querySelector('input[name="scheduleType"][value="custom"]');
    const presetOption = Array.from(presetSelect.options).find((option) => option.value === schedule);

    if (presetOption) {
        presetSelect.value = schedule;
        if (presetRadio) presetRadio.checked = true;
        document.getElementById('presetScheduleContainer').classList.remove('hidden');
        document.getElementById('customScheduleContainer').classList.add('hidden');
        return;
    }

    const parsed = parseScheduleToDays(schedule);
    if (!parsed.days.length || !parsed.timeRanges.length) {
        return;
    }

    if (customRadio) customRadio.checked = true;
    document.getElementById('presetScheduleContainer').classList.add('hidden');
    document.getElementById('customScheduleContainer').classList.remove('hidden');
    document.querySelectorAll('input[name="customDays"]').forEach((checkbox) => {
        checkbox.checked = parsed.days.includes(checkbox.value);
    });

    const morningRange = parsed.timeRanges[0] || { startTime: '', endTime: '' };
    const afternoonRange = parsed.timeRanges[1] || { startTime: '', endTime: '' };
    document.getElementById('customMorningStartTime').value = morningRange.startTime;
    document.getElementById('customMorningEndTime').value = morningRange.endTime;
    document.getElementById('customAfternoonStartTime').value = afternoonRange.startTime;
    document.getElementById('customAfternoonEndTime').value = afternoonRange.endTime;
}

function parseIdList(value) {
    if (!value) return [];
    return value.toString().split(',').map((item) => item.trim()).filter(Boolean);
}

function populateTrainerSelect(qualificationId, selectedTrainerId) {
    const trainerSelect = document.getElementById('assignTrainerSelect');
    if (!trainerSelect) return;

    trainerSelect.innerHTML = '<option value="">Unassign</option>';
    const qualificationIdString = qualificationId ? String(qualificationId) : '';
    const filtered = qualificationIdString
        ? allTrainers.filter((trainer) => trainer.qualification_ids.includes(qualificationIdString))
        : allTrainers;

    const sorted = filtered.sort((a, b) => {
        const lastNameCompare = (a.last_name || '').localeCompare(b.last_name || '', undefined, { sensitivity: 'base' });
        if (lastNameCompare !== 0) return lastNameCompare;
        return (a.first_name || '').localeCompare(b.first_name || '', undefined, { sensitivity: 'base' });
    });

    if (!sorted.length) {
        trainerSelect.innerHTML += '<option value="" disabled>No trainers available</option>';
    } else {
        sorted.forEach((trainer) => {
            trainerSelect.innerHTML += `<option value="${trainer.trainer_id}">${escapeHtml(trainer.first_name)} ${escapeHtml(trainer.last_name)}</option>`;
        });
    }

    if (selectedTrainerId) {
        trainerSelect.value = String(selectedTrainerId);
    }
}

function populateUnitTrainerSelect(moduleOptions, selectedModuleId) {
    const trainerSelect = document.getElementById('assignTrainerSelect');
    if (!trainerSelect) return;

    trainerSelect.innerHTML = '<option value="">Select Trainer</option>';

    if (!Array.isArray(moduleOptions) || !moduleOptions.length) {
        trainerSelect.innerHTML += '<option value="" disabled>No trainers available</option>';
        document.getElementById('assignModuleId').value = '';
        document.getElementById('assignResolvedTrainerId').value = '';
        return;
    }

    moduleOptions.forEach((option) => {
        const optionEl = document.createElement('option');
        optionEl.value = String(option.module_id || '');
        optionEl.dataset.moduleId = String(option.module_id || '');
        optionEl.dataset.trainerId = String(option.trainer_id || '');
        optionEl.textContent = option.trainer_name || 'Unnamed Trainer';
        if (String(option.module_id || '') === String(selectedModuleId || '')) {
            optionEl.selected = true;
        }
        trainerSelect.appendChild(optionEl);
    });

    syncSelectedModuleOptionToModal();
}

function syncSelectedModuleOptionToModal() {
    const trainerSelect = document.getElementById('assignTrainerSelect');
    if (!trainerSelect) return;

    const selectedOption = trainerSelect.options[trainerSelect.selectedIndex];
    const moduleId = selectedOption?.dataset?.moduleId || '';
    const trainerId = selectedOption?.dataset?.trainerId || '';

    document.getElementById('assignModuleId').value = moduleId;
    document.getElementById('assignResolvedTrainerId').value = trainerId;
}

function initScheduleTypeToggle() {
    const scheduleTypeRadios = document.querySelectorAll('input[name="scheduleType"]');
    const presetContainer = document.getElementById('presetScheduleContainer');
    const customContainer = document.getElementById('customScheduleContainer');
    if (!scheduleTypeRadios.length) return;

    scheduleTypeRadios.forEach((radio) => {
        radio.addEventListener('change', (event) => {
            if (event.target.value === 'preset') {
                presetContainer.classList.remove('hidden');
                customContainer.classList.add('hidden');
            } else {
                presetContainer.classList.add('hidden');
                customContainer.classList.remove('hidden');
            }
            refreshRoomDropdownForCurrentModal();
        });
    });
}

function buildTimetable() {
    const timeSlots = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timetableBody = document.getElementById('timetableBody');
    if (!timetableBody) return;

    timetableBody.innerHTML = '';
    timeSlots.forEach((time) => {
        const [hour, minute] = time.split(':');
        const numericHour = parseInt(hour, 10);
        const suffix = numericHour >= 12 ? 'PM' : 'AM';
        const displayHour = numericHour % 12 || 12;
        const row = document.createElement('tr');
        row.className = 'divide-x divide-slate-200';
        row.innerHTML = `<td class="w-24 bg-slate-50 px-4 py-3 text-center text-xs font-medium text-slate-600">${displayHour}:${minute} ${suffix}</td>` +
            days.map(() => '<td class="h-16 overflow-hidden px-4 py-3 text-center align-top text-xs text-slate-500"></td>').join('');
        timetableBody.appendChild(row);
    });

    rebuildTimetable();
}

function parseScheduleToDays(scheduleText) {
    if (!scheduleText) return { days: [], timeRanges: [] };

    const text = scheduleText.toLowerCase();
    let days = [];
    const timeRanges = [];

    const rangeMatches = [...text.matchAll(/(\d{1,2}:\d{2}\s*(?:am|pm)|\d{2}:\d{2})\s*-\s*(\d{1,2}:\d{2}\s*(?:am|pm)|\d{2}:\d{2})/gi)];
    rangeMatches.forEach((match) => {
        const rawStart = match[1].trim();
        const rawEnd = match[2].trim();
        let startTime = '';
        let endTime = '';

        const start12Match = rawStart.match(/(\d+):(\d+)\s*(am|pm)/i);
        const end12Match = rawEnd.match(/(\d+):(\d+)\s*(am|pm)/i);
        if (start12Match && end12Match) {
            startTime = convertTo24Hour(start12Match[1], start12Match[2], start12Match[3]);
            endTime = convertTo24Hour(end12Match[1], end12Match[2], end12Match[3]);
        } else if (/^\d{2}:\d{2}$/.test(rawStart) && /^\d{2}:\d{2}$/.test(rawEnd)) {
            startTime = rawStart;
            endTime = rawEnd;
        }

        if (startTime && endTime) {
            timeRanges.push({ startTime, endTime });
        }
    });

    const shorthandMap = {
        weekday: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        weekends: ['Saturday', 'Sunday'],
        weekend: ['Saturday', 'Sunday'],
        mwf: ['Monday', 'Wednesday', 'Friday'],
        tth: ['Tuesday', 'Thursday'],
        mon: ['Monday'],
        tue: ['Tuesday'],
        wed: ['Wednesday'],
        thu: ['Thursday'],
        fri: ['Friday'],
        sat: ['Saturday'],
        sun: ['Sunday']
    };
    const compactPrefixDays = parseCompactScheduleDays(scheduleText);
    if (compactPrefixDays.length) {
        days = Array.from(new Set([...days, ...compactPrefixDays]));
    }

    Object.entries(shorthandMap).forEach(([token, tokenDays]) => {
        if (text.includes(token)) {
            days = Array.from(new Set([...days, ...tokenDays]));
        }
    });

    if (!days.length) {
        const patterns = [
            { pattern: /mon(?:day)?/gi, day: 'Monday' },
            { pattern: /tue(?:sday)?/gi, day: 'Tuesday' },
            { pattern: /wed(?:nesday)?/gi, day: 'Wednesday' },
            { pattern: /thu(?:rsday)?/gi, day: 'Thursday' },
            { pattern: /fri(?:day)?/gi, day: 'Friday' },
            { pattern: /sat(?:urday)?/gi, day: 'Saturday' },
            { pattern: /sun(?:day)?/gi, day: 'Sunday' }
        ];
        patterns.forEach(({ pattern, day }) => {
            if (pattern.test(text)) days.push(day);
        });
    }

    if (!days.length && (text.includes('shift') || text.includes('day') || text.includes('night'))) {
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }

    return { days, timeRanges };
}

function parseCompactScheduleDays(scheduleText) {
    const prefix = String(scheduleText || '').split('(')[0].trim();
    const compactCode = prefix.replace(/[^A-Za-z]/g, '').toLowerCase();
    if (!compactCode || !/^(?:m|t|w|th|f|s|su)+$/.test(compactCode)) {
        return [];
    }

    const dayMap = {
        m: 'Monday',
        t: 'Tuesday',
        w: 'Wednesday',
        th: 'Thursday',
        f: 'Friday',
        s: 'Saturday',
        su: 'Sunday'
    };
    const parsedDays = [];
    let index = 0;

    while (index < compactCode.length) {
        if (compactCode.slice(index, index + 2) === 'su') {
            parsedDays.push(dayMap.su);
            index += 2;
            continue;
        }

        if (compactCode.slice(index, index + 2) === 'th') {
            parsedDays.push(dayMap.th);
            index += 2;
            continue;
        }

        const token = compactCode[index];
        if (dayMap[token]) {
            parsedDays.push(dayMap[token]);
        }
        index += 1;
    }

    return Array.from(new Set(parsedDays));
}

function convertTo24Hour(hour, minute, meridiem) {
    let numericHour = parseInt(hour, 10);
    const suffix = String(meridiem).toLowerCase();
    if (suffix === 'pm' && numericHour !== 12) numericHour += 12;
    if (suffix === 'am' && numericHour === 12) numericHour = 0;
    return `${String(numericHour).padStart(2, '0')}:${minute}`;
}

function timeInRange(timeSlot, startTime, endTime) {
    const slotMinutes = toTimeMinutes(timeSlot);
    const startMinutes = toTimeMinutes(startTime);
    const endMinutes = toTimeMinutes(endTime);

    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
}

function scheduleHasTimeSlot(parsedSchedule, timeSlot) {
    return Array.isArray(parsedSchedule.timeRanges) && parsedSchedule.timeRanges.some((range) => {
        return timeInRange(timeSlot, range.startTime, range.endTime);
    });
}

function timeRangesOverlap(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
}

function schedulesOverlap(leftSchedule, rightSchedule) {
    const left = parseScheduleToDays(leftSchedule);
    const right = parseScheduleToDays(rightSchedule);
    if (!left.days.length || !right.days.length || !left.timeRanges.length || !right.timeRanges.length) {
        return false;
    }

    const sharedDays = left.days.filter((day) => right.days.includes(day));
    if (!sharedDays.length) return false;

    return left.timeRanges.some((leftRange) => right.timeRanges.some((rightRange) => {
        return timeRangesOverlap(leftRange.startTime, leftRange.endTime, rightRange.startTime, rightRange.endTime);
    }));
}

function getCurrentScheduleForRoomFilter() {
    const scheduleType = document.querySelector('input[name="scheduleType"]:checked')?.value || 'preset';
    if (scheduleType === 'preset') {
        return document.getElementById('assignScheduleSelect')?.value || '';
    }
    return getCustomScheduleString();
}

function isSameScheduleRow(leftRow, rightRow) {
    if (!leftRow || !rightRow) return false;
    if (
        String(leftRow.batch_id || '') === String(rightRow.batch_id || '') &&
        leftRow.module_group_key &&
        rightRow.module_group_key &&
        String(leftRow.module_group_key) === String(rightRow.module_group_key)
    ) {
        return true;
    }

    return String(leftRow.batch_id || '') === String(rightRow.batch_id || '') &&
        String(leftRow.module_id || '') === String(rightRow.module_id || '') &&
        String(leftRow.scope_type || '') === String(rightRow.scope_type || '');
}

function isRoomOccupiedForSchedule(roomId, targetSchedule, referenceRow) {
    return allScheduleRows.some((row) => {
        if (!row.room_id || Number(row.room_id) !== Number(roomId)) return false;
        if (!row.schedule) return false;
        if (String(row.batch_status || '').toLowerCase() === 'closed') return false;
        if (referenceRow && isSameScheduleRow(row, referenceRow)) return false;
        return schedulesOverlap(targetSchedule, row.schedule);
    });
}

function getCustomScheduleString() {
    const selectedDays = Array.from(document.querySelectorAll('input[name="customDays"]:checked')).map((checkbox) => checkbox.value);
    const morningStartTime = document.getElementById('customMorningStartTime').value;
    const morningEndTime = document.getElementById('customMorningEndTime').value;
    const afternoonStartTime = document.getElementById('customAfternoonStartTime').value;
    const afternoonEndTime = document.getElementById('customAfternoonEndTime').value;

    if (!selectedDays.length) {
        return '';
    }

    const segments = [];
    if (morningStartTime || morningEndTime) {
        if (!morningStartTime || !morningEndTime) {
            return '';
        }
        segments.push(`${formatTime(morningStartTime)} - ${formatTime(morningEndTime)}`);
    }

    if (afternoonStartTime || afternoonEndTime) {
        if (!afternoonStartTime || !afternoonEndTime) {
            return '';
        }
        segments.push(`${formatTime(afternoonStartTime)} - ${formatTime(afternoonEndTime)}`);
    }

    if (!segments.length) {
        return '';
    }

    const dayShortcuts = {
        Monday: 'M',
        Tuesday: 'T',
        Wednesday: 'W',
        Thursday: 'Th',
        Friday: 'F',
        Saturday: 'S',
        Sunday: 'Su'
    };

    const dayCode = selectedDays.map((day) => dayShortcuts[day] || day).join('');
    return `${dayCode} (${segments.join(' / ')})`;
}

function formatTime(time24) {
    const [hour, minute] = time24.split(':');
    const numericHour = parseInt(hour, 10);
    const suffix = numericHour >= 12 ? 'PM' : 'AM';
    const displayHour = numericHour % 12 || 12;
    return `${displayHour}:${minute} ${suffix}`;
}

async function loadSchedulePresets() {
    try {
        const response = await axios.get(`${SCHEDULE_API_URL}?action=get-presets`);
        if (!response.data.success) {
            return;
        }

        const presets = Array.isArray(response.data.data) ? response.data.data : [];
        populateRegistrarPresetSelect(presets);
    } catch (error) {
        console.error('Error loading schedule presets:', error);
    }
}

function populateRegistrarPresetSelect(presets) {
    const presetSelect = document.getElementById('assignScheduleSelect');
    if (!presetSelect) {
        return;
    }

    presetSelect.innerHTML = '<option value="">Not Set</option>';
    presets.forEach((preset) => {
        const presetSchedule = String(preset.schedule || '').trim();
        if (!presetSchedule) {
            return;
        }

        const option = document.createElement('option');
        option.value = presetSchedule;
        option.dataset.presetId = Number(preset.preset_id || 0) || '';
        option.textContent = String(preset.preset_name || presetSchedule);
        presetSelect.appendChild(option);
    });
}

async function saveSchedule(event) {
    event.preventDefault();

    const scheduleType = document.querySelector('input[name="scheduleType"]:checked')?.value || 'preset';
    let schedule = '';
    const requestPayload = {
        preset_id: null
    };

    if (scheduleType === 'preset') {
        const presetSelect = document.getElementById('assignScheduleSelect');
        schedule = presetSelect.value;
        requestPayload.preset_id = Number(presetSelect.selectedOptions[0]?.dataset?.presetId || 0) || null;
    } else {
        schedule = getCustomScheduleString();
        if (!schedule) {
            Swal.fire({ title: 'Error', text: 'Please select days and times for the custom schedule.', icon: 'error' });
            return;
        }
    }

    const mode = document.getElementById('assignTrainerAssignmentMode').value || 'single';
    const scopeType = document.getElementById('assignScopeType').value || '';

    try {
        let selectedUnitModuleId = document.getElementById('assignModuleId').value;
        let selectedUnitTrainerId = document.getElementById('assignResolvedTrainerId').value;

        if (mode === 'multiple') {
            await saveUnitAssignmentsForSelectedBatch({
                batchId: document.getElementById('assignBatchId').value,
                showSuccess: false,
                reloadScheduleData: false
            });

            if (scopeType !== 'lead_batch') {
                const focusedSelection = getFocusedUnitAssignmentSelection();
                if (!focusedSelection?.module_id) {
                    Swal.fire({ title: 'Error', text: 'Please select a trainer for this unit first.', icon: 'error' });
                    return;
                }

                selectedUnitModuleId = focusedSelection.module_id;
                const focusedGroup = currentUnitAssignmentGroups.find((group) => String(group.group_key) === String(focusedSelection.group_key));
                const selectedOption = (focusedGroup?.trainer_options || []).find((option) => String(option.module_id) === String(focusedSelection.module_id));
                selectedUnitTrainerId = selectedOption?.trainer_id ? String(selectedOption.trainer_id) : '';
            }
        }

        Object.assign(requestPayload, {
            batch_id: document.getElementById('assignBatchId').value,
            module_id: selectedUnitModuleId,
            trainer_assignment_mode: mode,
            scope_type: scopeType,
            trainer_id: mode === 'single'
                ? document.getElementById('assignTrainerSelect').value
                : selectedUnitTrainerId,
            schedule,
            room_id: document.getElementById('assignRoomSelect').value,
            effective_date: getCurrentEffectiveDate(),
            registrar_note: document.getElementById('assignRegistrarNote')?.value?.trim() || '',
            user_id: getCurrentUserId()
        });

        const response = await axios.post(`${SCHEDULE_API_URL}?action=assign`, requestPayload);
        if (response.data.success) {
            Swal.fire({ title: 'Success', text: response.data.message || 'Schedule proposal sent successfully.', icon: 'success' });
            if (scheduleModal) scheduleModal.hide();
            await loadScheduleData();
        } else {
            Swal.fire({ title: 'Error', text: response.data.message || 'An error occurred.', icon: 'error' });
        }
    } catch (error) {
        console.error('Error saving schedule:', error);
        const errorMessage = error?.response?.data?.message || 'An error occurred while saving the schedule.';
        Swal.fire({ title: 'Error', text: errorMessage, icon: 'error' });
    }
}

async function removeCurrentAssignment() {
    const batchId = document.getElementById('assignBatchId').value;
    const moduleId = document.getElementById('assignModuleId').value;
    if (!batchId || !moduleId) return;

    const result = await Swal.fire({
        title: 'Unassign Unit',
        text: 'This will remove the unit/module from the batch schedule.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Unassign',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc2626'
    });

    if (!result.isConfirmed) {
        return;
    }

    try {
        const response = await axios.post(`${SCHEDULE_API_URL}?action=assign`, {
            batch_id: batchId,
            module_id: moduleId,
            trainer_assignment_mode: 'multiple',
            remove_assignment: true
        });

        if (response.data.success) {
            Swal.fire({ title: 'Removed', text: 'The unit was unassigned from this batch.', icon: 'success' });
            if (scheduleModal) scheduleModal.hide();
            await loadScheduleData();
        } else {
            Swal.fire({ title: 'Error', text: response.data.message || 'Unable to remove the unit.', icon: 'error' });
        }
    } catch (error) {
        console.error('Error removing assignment:', error);
        Swal.fire({ title: 'Error', text: 'Unable to remove the unit assignment.', icon: 'error' });
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
    return escapeHtml(value);
}
