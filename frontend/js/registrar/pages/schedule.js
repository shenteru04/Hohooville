const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
let scheduleModal;
let allTrainers = [];
let allBatches = [];
let allRooms = [];
let allQualifications = [];
let timetableData = {};
let currentViewMode = 'timetable'; // 'timetable' or 'table'

// Color palette for different qualifications
const qualColors = [
    'bg-blue-100 border-blue-300', 'bg-green-100 border-green-300', 'bg-purple-100 border-purple-300',
    'bg-pink-100 border-pink-300', 'bg-yellow-100 border-yellow-300', 'bg-indigo-100 border-indigo-300',
    'bg-rose-100 border-rose-300', 'bg-cyan-100 border-cyan-300'
];

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

    scheduleModal = new SimpleModal(document.getElementById('assignScheduleModal'));
    initViewModeButtons();
    initTimetableControls();
    loadScheduleData();

    const assignScheduleForm = document.getElementById('assignScheduleForm');
    if (assignScheduleForm) assignScheduleForm.addEventListener('submit', saveSchedule);

    const schedulesBody = document.getElementById('schedulesTableBody');
    if (schedulesBody) {
        schedulesBody.addEventListener('click', (event) => {
            const btn = event.target.closest('.assign-btn');
            if (!btn) return;
            const data = btn.dataset;
            openAssignModal(
                data.batchId,
                data.batchName,
                data.trainerId || '',
                data.schedule || '',
                data.room || '',
                data.qualificationId || ''
            );
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
            if (modalId === 'assignScheduleModal' && scheduleModal) scheduleModal.hide();
        });
    });
}

async function loadScheduleData() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/schedule.php?action=get-data`);
        if (!response.data.success) return;

        const { trainers, batches } = response.data.data;
        allTrainers = (trainers || []).map((t) => ({
            ...t,
            qualification_ids: parseIdList(t.qualification_ids)
        }));
        allBatches = batches || [];
        
        // Extract rooms and qualifications from batches
        const roomMap = {};
        const qualMap = {};
        
        allBatches.forEach(batch => {
            if (batch.room_id && batch.room) {
                roomMap[batch.room_id] = { room_id: parseInt(batch.room_id), room_name: batch.room };
            }
            if (batch.qualification_id && batch.course_name) {
                qualMap[batch.qualification_id] = { qualification_id: parseInt(batch.qualification_id), qualification_name: batch.course_name };
            }
        });
        
        allRooms = Object.values(roomMap);
        allQualifications = Object.values(qualMap);

        const tbody = document.getElementById('schedulesTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!allBatches.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-slate-500">No open batches found.</td></tr>';
            return;
        }

        allBatches.forEach((batch) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-50';
            const statusBadge = batch.batch_status === 'open' 
                ? '<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">Open</span>'
                : batch.batch_status === 'in-progress'
                ? '<span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">In Progress</span>'
                : '<span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">Closed</span>';
            
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-slate-800">${escapeHtml(batch.batch_name)}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${batch.course_name ? escapeHtml(batch.course_name) : '<span class="text-slate-400">N/A</span>'}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${batch.trainer_name ? escapeHtml(batch.trainer_name) : '<span class="text-slate-400">Not Assigned</span>'}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${batch.schedule ? escapeHtml(batch.schedule) : '<span class="text-slate-400">Not Set</span>'}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${batch.room ? escapeHtml(batch.room) : '<span class="text-slate-400">Not Set</span>'}</td>
                <td class="px-4 py-3 text-center">
                    <button class="assign-btn inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        data-batch-id="${batch.batch_id}"
                        data-batch-name="${escapeAttr(batch.batch_name)}"
                        data-trainer-id="${batch.trainer_id || ''}"
                        data-schedule="${escapeAttr(batch.schedule || '')}"
                        data-room="${escapeAttr(batch.room || '')}"
                        data-qualification-id="${batch.qualification_id || ''}">
                        <i class="fas fa-edit"></i> Assign
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Load timetable if in timetable view
        if (currentViewMode === 'timetable') {
            await loadTimetableData();
        }
    } catch (error) {
        console.error('Error loading schedule data:', error);
    }
}

window.openAssignModal = function(batchId, batchName, trainerId, schedule, room, qualificationId) {
    document.getElementById('assignBatchId').value = batchId;
    document.getElementById('assignBatchName').textContent = batchName;
    populateTrainerSelect(qualificationId, trainerId);
    
    // Reset schedule inputs
    document.getElementById('scheduleStartDate').value = '';
    document.getElementById('scheduleEndDate').value = '';
    document.getElementById('scheduleStartTime').value = '08:00';
    document.getElementById('scheduleEndTime').value = '17:00';
    document.querySelectorAll('.scheduleDayCheckbox').forEach(cb => cb.checked = false);
    
    // If a schedule was previously set, try to parse and fill it
    if (schedule) {
        parseAndFillSchedule(schedule);
    }
    
    window.populateRoomDropdown(room);
    initSchedulePreview();
    if (scheduleModal) scheduleModal.show();
};

function parseAndFillSchedule(schedule) {
    // Try to parse existing schedule format if it exists
    if (!schedule || schedule === 'Not Set' || !schedule.trim()) return;
    
    // This is a helper to restore old format if needed
    // For now, leave it empty since user will set new values
}

function initSchedulePreview() {
    const startDateInput = document.getElementById('scheduleStartDate');
    const endDateInput = document.getElementById('scheduleEndDate');
    const startTimeInput = document.getElementById('scheduleStartTime');
    const endTimeInput = document.getElementById('scheduleEndTime');
    const dayCheckboxes = document.querySelectorAll('.scheduleDayCheckbox');
    
    const updatePreview = () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        const selectedDays = Array.from(dayCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value)
            .join(', ');
        
        const preview = document.getElementById('schedulePreview');
        
        if (!startDate || !endDate || !selectedDays || !startTime || !endTime) {
            preview.innerHTML = '<span class="text-slate-500">Select dates, days, and times</span>';
            return;
        }
        
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const startDateStr = startDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const endDateStr = endDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const timeStr = `${startTime} - ${endTime}`;
        
        preview.innerHTML = `
            <div class="space-y-1">
                <p><strong>Days:</strong> ${selectedDays}</p>
                <p><strong>Time:</strong> ${timeStr}</p>
                <p><strong>Period:</strong> ${startDateStr} to ${endDateStr}</p>
            </div>
        `;
    };
    
    startDateInput.addEventListener('change', updatePreview);
    endDateInput.addEventListener('change', updatePreview);
    startTimeInput.addEventListener('change', updatePreview);
    endTimeInput.addEventListener('change', updatePreview);
    dayCheckboxes.forEach(cb => cb.addEventListener('change', updatePreview));
}

async function saveSchedule(event) {
    event.preventDefault();
    
    const startDate = document.getElementById('scheduleStartDate').value;
    const endDate = document.getElementById('scheduleEndDate').value;
    const startTime = document.getElementById('scheduleStartTime').value;
    const endTime = document.getElementById('scheduleEndTime').value;
    const selectedDays = Array.from(document.querySelectorAll('.scheduleDayCheckbox'))
        .filter(cb => cb.checked)
        .map(cb => cb.value)
        .join(', ');
    
    // Validate schedule
    if (!startDate || !endDate || !selectedDays || !startTime || !endTime) {
        Swal.fire({ title: 'Incomplete Schedule', text: 'Please fill in all schedule fields.', icon: 'warning' });
        return;
    }
    
    // Build schedule string
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const startDateStr = startDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endDateStr = endDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const scheduleString = `${selectedDays} ${startTime}-${endTime} (${startDateStr} to ${endDateStr})`;
    
    const payload = {
        batch_id: document.getElementById('assignBatchId').value,
        trainer_id: document.getElementById('assignTrainerSelect').value,
        schedule: scheduleString,
        room_id: document.getElementById('assignRoomSelect').value
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/registrar/schedule.php?action=assign`, payload);
        if (response.data.success) {
            Swal.fire({ title: 'Success', text: 'Schedule assigned successfully!', icon: 'success' });
            if (scheduleModal) scheduleModal.hide();
            loadScheduleData();
        } else {
            Swal.fire({ title: 'Error', text: response.data.message || 'An error occurred', icon: 'error' });
        }
    } catch (error) {
        console.error('Error saving schedule:', error);
        Swal.fire({ title: 'Error', text: 'An error occurred while saving the schedule.', icon: 'error' });
    }
}

window.populateRoomDropdown = async function(selectedRoom = '') {
    const roomSelect = document.getElementById('assignRoomSelect');
    roomSelect.innerHTML = '<option value="">Select Room</option>';
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/rooms.php?action=list`);
        if (response.data.success && response.data.data) {
            response.data.data.forEach((room) => {
                const option = document.createElement('option');
                option.value = room.room_id;
                option.textContent = room.room_name;
                if (String(room.room_id) === String(selectedRoom)) option.selected = true;
                roomSelect.appendChild(option);
            });
        }
    } catch (error) {
        roomSelect.innerHTML = '<option value="">Error loading rooms</option>';
    }
};

function parseIdList(value) {
    if (!value) return [];
    return value
        .toString()
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
}

function populateTrainerSelect(qualificationId, selectedTrainerId) {
    const trainerSelect = document.getElementById('assignTrainerSelect');
    trainerSelect.innerHTML = '<option value="">Unassign</option>';

    const qualIdStr = qualificationId ? String(qualificationId) : '';
    const filtered = qualIdStr
        ? allTrainers.filter((t) => t.qualification_ids.includes(qualIdStr))
        : allTrainers;

    // Sort trainers alphabetically by last name, then first name
    const sorted = filtered.sort((a, b) => {
        const lastNameA = (a.last_name || '').toUpperCase();
        const lastNameB = (b.last_name || '').toUpperCase();
        
        if (lastNameA !== lastNameB) {
            return lastNameA.localeCompare(lastNameB);
        }
        
        const firstNameA = (a.first_name || '').toUpperCase();
        const firstNameB = (b.first_name || '').toUpperCase();
        return firstNameA.localeCompare(firstNameB);
    });

    if (sorted.length === 0) {
        trainerSelect.innerHTML += '<option value="" disabled>No trainers available</option>';
    } else {
        sorted.forEach((t) => {
            trainerSelect.innerHTML += `<option value="${t.trainer_id}">${escapeHtml(t.first_name)} ${escapeHtml(t.last_name)}</option>`;
        });
    }

    if (selectedTrainerId) trainerSelect.value = String(selectedTrainerId);
}

function escapeHtml(value) {
    return (value ?? '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
    return escapeHtml(value);
}

function initViewModeButtons() {
    const tableBtn = document.getElementById('viewTableBtn');
    const scheduleBtn = document.getElementById('viewScheduleBtn');
    
    if (tableBtn) {
        tableBtn.addEventListener('click', () => {
            currentViewMode = 'table';
            updateViewModeButtons();
            switchViews();
        });
    }
    
    if (scheduleBtn) {
        scheduleBtn.addEventListener('click', () => {
            currentViewMode = 'timetable';
            updateViewModeButtons();
            switchViews();
            loadTimetableData();
        });
    }
}

function updateViewModeButtons() {
    const tableBtn = document.getElementById('viewTableBtn');
    const scheduleBtn = document.getElementById('viewScheduleBtn');
    
    if (currentViewMode === 'table') {
        tableBtn.className = 'inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100';
        scheduleBtn.className = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';
    } else {
        tableBtn.className = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';
        scheduleBtn.className = 'inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100';
    }
}

function switchViews() {
    const tableSection = document.getElementById('tableSection');
    const timetableSection = document.getElementById('timetableSection');
    
    if (currentViewMode === 'table') {
        tableSection.classList.remove('hidden');
        timetableSection.classList.add('hidden');
    } else {
        tableSection.classList.add('hidden');
        timetableSection.classList.remove('hidden');
    }
}

function initTimetableControls() {
    const weekSelect = document.getElementById('scheduleWeekSelect');
    const reloadBtn = document.getElementById('reloadScheduleBtn');
    const filterRoom = document.getElementById('filterRoom');
    const filterQual = document.getElementById('filterQual');
    
    // Set default date to today
    if (weekSelect) {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        weekSelect.valueAsDate = monday;
        weekSelect.addEventListener('change', loadTimetableData);
    }
    
    if (reloadBtn) {
        reloadBtn.addEventListener('click', loadTimetableData);
    }
    
    if (filterRoom) {
        filterRoom.addEventListener('change', () => {
            updateRoomFilterDisplay();
            loadTimetableData();
        });
    }
    
    if (filterQual) {
        filterQual.addEventListener('change', loadTimetableData);
    }
}

async function loadTimetableData() {
    try {
        const weekDate = document.getElementById('scheduleWeekSelect').value;
        const filterRoomId = document.getElementById('filterRoom').value;
        const filterQualId = document.getElementById('filterQual').value;
        
        // Get week boundaries
        const startDate = new Date(weekDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        
        // Build timetable from batch data
        buildTimetable(startDate, endDate, filterRoomId, filterQualId);
        await populateFilterDropdowns();
        updateRoomFilterDisplay();
    } catch (error) {
        console.error('Error loading timetable:', error);
    }
}

async function populateFilterDropdowns() {
    // Populate room filter - fetch all rooms from API, not just assigned ones
    const filterRoom = document.getElementById('filterRoom');
    if (filterRoom) {
        const currentValue = filterRoom.value;
        filterRoom.innerHTML = '<option value="">All Rooms</option>';
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/rooms.php?action=list`);
            if (response.data.success && response.data.data) {
                response.data.data.forEach((room) => {
                    filterRoom.innerHTML += `<option value="${room.room_id}">${escapeHtml(room.room_name)}</option>`;
                });
            }
        } catch (error) {
            console.error('Error loading rooms for filter:', error);
        }
        filterRoom.value = currentValue;
    }
    
    // Populate qualification filter
    const filterQual = document.getElementById('filterQual');
    if (filterQual && allQualifications.length > 0) {
        const currentValue = filterQual.value;
        filterQual.innerHTML = '<option value="">All Qualifications</option>';
        allQualifications.forEach(qual => {
            filterQual.innerHTML += `<option value="${qual.qualification_id}">${escapeHtml(qual.qualification_name)}</option>`;
        });
        filterQual.value = currentValue;
    }
}

function updateRoomFilterDisplay() {
    const filterRoom = document.getElementById('filterRoom');
    const roomFilterDisplay = document.getElementById('roomFilterDisplay');
    const roomFilterName = document.getElementById('roomFilterName');
    
    if (!filterRoom || !roomFilterDisplay || !roomFilterName) return;
    
    const selectedRoomId = filterRoom.value;
    const selectedRoomOption = filterRoom.options[filterRoom.selectedIndex];
    const selectedRoomName = selectedRoomOption.text;
    
    if (selectedRoomId) {
        // Room is selected - show the display
        roomFilterName.textContent = selectedRoomName;
        roomFilterDisplay.classList.remove('hidden');
    } else {
        // All rooms selected - hide the display
        roomFilterDisplay.classList.add('hidden');
    }
}

function buildTimetable(startDate, endDate, filterRoomId, filterQualId) {
    const timeSlots = generateTimeSlots();
    const tbody = document.getElementById('scheduleBody');
    
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Filter batches based on criteria
    const filteredBatches = allBatches.filter(batch => {
        if (filterRoomId) {
            const batchRoomId = batch.room_id ? parseInt(batch.room_id) : null;
            if (batchRoomId !== parseInt(filterRoomId)) return false;
        }
        if (filterQualId) {
            const batchQualId = batch.qualification_id ? parseInt(batch.qualification_id) : null;
            if (batchQualId !== parseInt(filterQualId)) return false;
        }
        return true;
    });
    
    // Build legend
    buildLegend(filteredBatches);
    
    // Generate rows for each time slot
    timeSlots.forEach(timeSlot => {
        const row = document.createElement('tr');
        row.className = 'border border-slate-300';
        
        // Time cell
        const timeCell = document.createElement('td');
        timeCell.className = 'border border-slate-300 bg-slate-100 font-semibold text-center px-2 py-2 text-xs sticky left-0 z-10';
        timeCell.textContent = timeSlot;
        row.appendChild(timeCell);
        
        // Days of week (Mon-Sat)
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        daysOfWeek.forEach(day => {
            const dayCell = document.createElement('td');
            dayCell.className = 'border border-slate-300 p-1 min-h-16 relative';
            
            // Find classes for this time slot and day
            const classesInSlot = filteredBatches.filter(batch => {
                if (!batch.schedule) return false;
                return isClassInTimeSlot(batch, day, timeSlot);
            });
            
            if (classesInSlot.length > 0) {
                const classesHtml = classesInSlot.map((batch, idx) => {
                    const colorClass = getColorForQual(batch.qualification_id);
                    const filterRoomId = document.getElementById('filterRoom').value;
                    
                    // If filtering by room, show qualification name instead of batch name
                    let displayText = '';
                    let subText = '';
                    
                    if (filterRoomId && batch.room_id) {
                        // Show qualification (course) name and batch name
                        displayText = batch.course_name ? batch.course_name.substring(0, 15) : batch.batch_name.substring(0, 10);
                        subText = batch.batch_name.substring(0, 12);
                    } else {
                        // Default: Show batch name and trainer
                        displayText = batch.batch_name.substring(0, 10);
                        subText = (batch.trainer_name || 'No Trainer').substring(0, 12);
                    }
                    
                    return `
                        <div class="text-[10px] ${colorClass} border rounded px-1 py-0.5 mb-0.5 cursor-pointer hover:shadow-md transition-shadow" 
                             title="${filterRoomId ? escapeHtml(batch.course_name || batch.batch_name) : escapeHtml(batch.batch_name)}" 
                             onclick="openAssignModal('${batch.batch_id}', '${escapeAttr(batch.batch_name)}', '${batch.trainer_id || ''}', '${escapeAttr(batch.schedule || '')}', '${batch.room_id || ''}', '${batch.qualification_id || ''}')">
                            <strong>${escapeHtml(displayText)}</strong><br>
                            <span class="text-[9px]">${escapeHtml(subText)}</span>
                        </div>
                    `;
                }).join('');
                dayCell.innerHTML = classesHtml;
            }
            
            row.appendChild(dayCell);
        });
        
        tbody.appendChild(row);
    });
}

function generateTimeSlots() {
    const slots = [];
    for (let hour = 8; hour <= 16; hour++) {
        const period = hour < 12 ? 'AM' : 'PM';
        const displayHour = hour <= 12 ? hour : hour - 12;
        slots.push(`${displayHour}:00 ${period}`);
    }
    return slots;
}

function isClassInTimeSlot(batch, dayName, timeSlot) {
    if (!batch.schedule) return false;
    
    const schedule = batch.schedule.toUpperCase();
    const dayAbbrev = dayName.substring(0, 1).toUpperCase();
    
    // Parse time from slot (e.g., "8:00 AM")
    const [time] = timeSlot.split(' ');
    const [hourStr] = time.split(':');
    const hour = parseInt(hourStr);
    
    // New format: "Mon, Wed, Fri 08:00-17:00 (Mar 10, 2026 to Jun 30, 2026)"
    // Old format: "MWF (8:00 AM - 12:00 PM)"
    
    // Check if schedule contains this day
    const dayMap = {
        'M': ['MON'],
        'T': ['TUE', 'THU'],
        'W': ['WED'],
        'F': ['FRI'],
        'S': ['SAT', 'SUN']
    };
    
    let hasDay = false;
    
    // Try new format first
    if (schedule.includes(dayName.substring(0, 3))) {
        hasDay = true;
    } else if (dayMap[dayAbbrev]) {
        // Check for abbreviated format (MWF, TTH, etc.)
        dayMap[dayAbbrev].forEach(dayStr => {
            if (schedule.includes(dayStr)) {
                hasDay = true;
            }
        });
    }
    
    // Check old format shortcuts
    if (schedule.includes('MWF') && ['M', 'W', 'F'].includes(dayAbbrev)) hasDay = true;
    if (schedule.includes('TTH') && dayAbbrev === 'T') hasDay = true;
    if (schedule.includes('WEEKDAY') && !['S'].includes(dayAbbrev)) hasDay = true;
    if (schedule.includes('SATURDAY') && dayName === 'Saturday') hasDay = true;
    
    if (!hasDay) return false;
    
    // Parse time range from schedule
    // Try new format: HH:MM-HH:MM
    const timeRangeMatch = schedule.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (timeRangeMatch) {
        const startHour = parseInt(timeRangeMatch[1]);
        const endHour = parseInt(timeRangeMatch[3]);
        return hour >= startHour && hour < endHour;
    }
    
    // Try old format: time ranges like "8:00 AM - 12:00 PM"
    if (schedule.includes('8:00 AM') || schedule.includes('8 AM')) {
        if (hour !== 8) return false;
    } else if (schedule.includes('1:00 PM') || schedule.includes('1 PM')) {
        if (hour !== 13) return false;
    } else if (schedule.includes('DAY SHIFT')) {
        if (hour < 8 || hour >= 17) return false;
    } else if (schedule.includes('NIGHT SHIFT')) {
        if (hour < 18 || hour >= 22) return false;
    }
    
    return true;
}

function getColorForQual(qualId) {
    if (!qualId) return qualColors[0];
    const index = (parseInt(qualId) % qualColors.length);
    return qualColors[index];
}

function buildLegend(filteredBatches) {
    const legendContainer = document.getElementById('legendContainer');
    if (!legendContainer) return;
    
    const qualMap = {};
    filteredBatches.forEach(batch => {
        if (batch.qualification_name && !qualMap[batch.qualification_id]) {
            qualMap[batch.qualification_id] = batch.qualification_name;
        }
    });
    
    legendContainer.innerHTML = '';
    Object.keys(qualMap).slice(0, 8).forEach((qualId, idx) => {
        const colorClass = getColorForQual(qualId);
        const legendItem = document.createElement('div');
        legendItem.className = 'flex items-center gap-2 text-xs';
        legendItem.innerHTML = `
            <div class="w-4 h-4 rounded border ${colorClass}"></div>
            <span>${escapeHtml(qualMap[qualId])}</span>
        `;
        legendContainer.appendChild(legendItem);
    });
}
