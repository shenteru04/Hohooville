const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
let scheduleModal;
let allTrainers = [];
let allBatches = [];

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

    scheduleModal = new SimpleModal(document.getElementById('assignScheduleModal'));
    loadScheduleData();
    initScheduleTypeToggle();
    buildTimetable();

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

    // Initialize filter event listeners
    document.getElementById('timetableTrainerFilter')?.addEventListener('change', (e) => {
        updateQualificationFilter(e.target.value);
        updateBatchFilter(e.target.value, '');
        rebuildTimetable();
    });
    document.getElementById('timetableQualificationFilter')?.addEventListener('change', (e) => {
        const trainerId = document.getElementById('timetableTrainerFilter')?.value || '';
        updateBatchFilter(trainerId, e.target.value);
        rebuildTimetable();
    });
    document.getElementById('timetableBatchFilter')?.addEventListener('change', rebuildTimetable);
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

function initScheduleTabs() {
    const tabButtons = document.querySelectorAll('.schedule-tab-btn');
    const tabContents = document.querySelectorAll('.schedule-tab-content');

    tabButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Hide all tabs
            tabContents.forEach((tab) => tab.classList.add('hidden'));

            // Remove active styles from all buttons
            tabButtons.forEach((btn) => {
                btn.classList.remove('border-blue-600', 'bg-white', 'text-blue-700');
                btn.classList.add('border-transparent', 'text-slate-600');
            });

            // Show selected tab
            document.getElementById(`${tabName}-tab`).classList.remove('hidden');

            // Add active styles to clicked button
            button.classList.remove('border-transparent', 'text-slate-600');
            button.classList.add('border-blue-600', 'bg-white', 'text-blue-700');
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

        // Populate filters
        populateTimeTableFilters();

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
    } catch (error) {
        console.error('Error loading schedule data:', error);
    }
}

function populateTimeTableFilters() {
    // Populate trainer filter
    const trainerSelect = document.getElementById('timetableTrainerFilter');
    if (trainerSelect) {
        const trainers = allBatches
            .filter(b => b.trainer_name && b.trainer_id)
            .reduce((acc, b) => {
                if (!acc.find(t => t.id === b.trainer_id)) {
                    acc.push({ id: b.trainer_id, name: b.trainer_name });
                }
                return acc;
            }, [])
            .sort((a, b) => a.name.localeCompare(b.name));

        trainerSelect.innerHTML = '<option value="">All Trainers</option>' +
            trainers.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    }

    // Populate qualification filter (initially all)
    updateQualificationFilter('');

    // Populate batch filter (initially all)
    updateBatchFilter('', '');
}

function updateQualificationFilter(trainerId) {
    const qualSelect = document.getElementById('timetableQualificationFilter');
    if (!qualSelect) return;

    let quals;
    
    if (trainerId) {
        // Get qualifications only for the selected trainer
        const trainerBatches = allBatches.filter(b => String(b.trainer_id) === String(trainerId));
        quals = trainerBatches
            .filter(b => b.course_name && b.qualification_id)
            .reduce((acc, b) => {
                if (!acc.find(q => q.id === b.qualification_id)) {
                    acc.push({ id: b.qualification_id, name: b.course_name });
                }
                return acc;
            }, [])
            .sort((a, b) => a.name.localeCompare(b.name));
    } else {
        // Get all qualifications
        quals = allBatches
            .filter(b => b.course_name && b.qualification_id)
            .reduce((acc, b) => {
                if (!acc.find(q => q.id === b.qualification_id)) {
                    acc.push({ id: b.qualification_id, name: b.course_name });
                }
                return acc;
            }, [])
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    const currentValue = qualSelect.value;
    qualSelect.innerHTML = '<option value="">All Qualifications</option>' +
        quals.map(q => `<option value="${q.id}">${escapeHtml(q.name)}</option>`).join('');
    
    // Preserve selection if still valid, otherwise reset
    if (quals.find(q => String(q.id) === currentValue)) {
        qualSelect.value = currentValue;
    } else {
        qualSelect.value = '';
    }
}

function updateBatchFilter(trainerId, qualificationId) {
    const batchSelect = document.getElementById('timetableBatchFilter');
    if (!batchSelect) return;

    let batches;

    if (trainerId || qualificationId) {
        // Filter batches based on trainer and/or qualification
        batches = allBatches.filter(b => {
            if (trainerId && String(b.trainer_id) !== String(trainerId)) return false;
            if (qualificationId && String(b.qualification_id) !== String(qualificationId)) return false;
            return true;
        });
    } else {
        // All batches
        batches = allBatches;
    }

    const currentValue = batchSelect.value;
    batchSelect.innerHTML = '<option value="">All Batches</option>' +
        batches.map(b => `<option value="${b.batch_id}">${escapeHtml(b.batch_name)}</option>`).join('');
    
    // Preserve selection if still valid, otherwise reset
    if (batches.find(b => String(b.batch_id) === String(currentValue))) {
        batchSelect.value = currentValue;
    } else {
        batchSelect.value = '';
    }
}

function getFilteredBatches() {
    const trainerFilter = document.getElementById('timetableTrainerFilter')?.value || '';
    const qualFilter = document.getElementById('timetableQualificationFilter')?.value || '';
    const batchFilter = document.getElementById('timetableBatchFilter')?.value || '';

    return allBatches.filter(b => {
        if (trainerFilter && String(b.trainer_id) !== String(trainerFilter)) return false;
        if (qualFilter && String(b.qualification_id) !== String(qualFilter)) return false;
        if (batchFilter && String(b.batch_id) !== String(batchFilter)) return false;
        return true;
    });
}

function rebuildTimetable() {
    const timeSlots = [
        '8:00', '9:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
    ];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timetableBody = document.getElementById('timetableBody');

    if (!timetableBody) return;

    // Clear all batch info, keep structure
    timetableBody.querySelectorAll('td').forEach(cell => {
        if (!cell.classList.contains('bg-slate-50')) {
            cell.innerHTML = '';
        }
    });

    // Repopulate with filtered batches
    const filteredBatches = getFilteredBatches();
    const colors = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-orange-100', 'bg-pink-100', 'bg-yellow-100'];

    filteredBatches.forEach((batch, idx) => {
        if (!batch.schedule) return;

        const { days: scheduleDays, startTime, endTime } = parseScheduleToDays(batch.schedule);
        if (!scheduleDays.length || !startTime || !endTime) return;

        const color = colors[idx % colors.length];
        const batchInfo = `<strong class="text-xs">${escapeHtml(batch.batch_name)}</strong><br><small>${escapeHtml(batch.trainer_name || 'No Trainer')}</small>`;

        const rows = timetableBody.querySelectorAll('tr');
        
        timeSlots.forEach((timeSlot, timeIndex) => {
            if (!timeInRange(timeSlot, startTime, endTime)) return;

            const row = rows[timeIndex];
            if (!row) return;

            const cells = row.querySelectorAll('td');

            scheduleDays.forEach((day) => {
                const dayIndex = days.indexOf(day);
                if (dayIndex < 0) return;

                const cell = cells[dayIndex + 1];
                if (!cell) return;

                cell.innerHTML += `<div class="${color} p-1 rounded text-xs mb-0.5 leading-tight" title="${batch.schedule}">${batchInfo}</div>`;
            });
        });
    });
}

window.openAssignModal = function(batchId, batchName, trainerId, schedule, room, qualificationId) {
    document.getElementById('assignBatchId').value = batchId;
    document.getElementById('assignBatchName').textContent = batchName;
    populateTrainerSelect(qualificationId, trainerId);
    // Reset the schedule type toggle
    document.querySelector('input[name="scheduleType"][value="preset"]').checked = true;
    document.getElementById('presetScheduleContainer').classList.remove('hidden');
    document.getElementById('customScheduleContainer').classList.add('hidden');
    document.getElementById('assignScheduleSelect').value = schedule;
    window.populateRoomDropdown(room);
    if (scheduleModal) scheduleModal.show();
};

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

function initScheduleTypeToggle() {
    const scheduleTypeRadios = document.querySelectorAll('input[name="scheduleType"]');
    const presetContainer = document.getElementById('presetScheduleContainer');
    const customContainer = document.getElementById('customScheduleContainer');

    if (!scheduleTypeRadios.length) return;

    scheduleTypeRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'preset') {
                presetContainer.classList.remove('hidden');
                customContainer.classList.add('hidden');
            } else {
                presetContainer.classList.add('hidden');
                customContainer.classList.remove('hidden');
            }
        });
    });
}

function buildTimetable() {
    const timeSlots = [
        '8:00', '9:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
    ];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timetableBody = document.getElementById('timetableBody');

    if (!timetableBody) return;

    timetableBody.innerHTML = '';
    timeSlots.forEach((time) => {
        const row = document.createElement('tr');
        row.className = 'divide-x divide-slate-200';
        
        // Convert 24-hour format to 12-hour
        const [hour, min] = time.split(':');
        const hourNum = parseInt(hour);
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        const displayHour = hourNum % 12 || 12;
        const displayTime = `${displayHour}:${min} ${ampm}`;
        
        let html = `<td class="px-4 py-3 text-center font-medium text-xs text-slate-600 bg-slate-50 w-24">${displayTime}</td>`;
        days.forEach(() => {
            html += `<td class="px-4 py-3 text-center text-xs text-slate-500 h-16 align-top overflow-hidden"></td>`;
        });
        
        row.innerHTML = html;
        timetableBody.appendChild(row);
    });

    rebuildTimetable();
}

function parseScheduleToDays(scheduleText) {
    if (!scheduleText) return { days: [], startTime: '', endTime: '' };

    // Parse formats like:
    // "Mon, Tue, Wed, Thu, Fri, Sat 08:00-17:00 (Mar 1, 2026 to Mar 27, 2026)"
    // "MWF (8:00 AM - 12:00 PM)"
    // "Day Shift (8:00 AM - 5:00 PM)"
    
    const fullDayMap = {
        'monday': 'Monday', 'mon': 'Monday', 'm': 'Monday',
        'tuesday': 'Tuesday', 'tue': 'Tuesday', 't': 'Tuesday',
        'wednesday': 'Wednesday', 'wed': 'Wednesday', 'w': 'Wednesday',
        'thursday': 'Thursday', 'thu': 'Thursday', 'th': 'Thursday',
        'friday': 'Friday', 'fri': 'Friday', 'f': 'Friday',
        'saturday': 'Saturday', 'sat': 'Saturday', 's': 'Saturday',
        'sunday': 'Sunday', 'sun': 'Sunday'
    };

    let days = [];
    let startTime = '';
    let endTime = '';

    const text = scheduleText.toLowerCase();

    // Extract time range - try 24-hour format first, then 12-hour
    const timeMatch24 = text.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
    const timeMatch12 = text.match(/(\d+):(\d+)\s*(am|pm)\s*-\s*(\d+):(\d+)\s*(am|pm)/i);

    if (timeMatch24) {
        startTime = timeMatch24[1] + ':' + timeMatch24[2];
        endTime = timeMatch24[3] + ':' + timeMatch24[4];
    } else if (timeMatch12) {
        const sh = parseInt(timeMatch12[1]);
        const sm = timeMatch12[2];
        const sap = timeMatch12[3].toLowerCase();
        const eh = parseInt(timeMatch12[4]);
        const em = timeMatch12[5];
        const eap = timeMatch12[6].toLowerCase();
        
        startTime = convertTo24Hour(sh, sm, sap);
        endTime = convertTo24Hour(eh, em, eap);
    }

    // Extract day names from schedule text
    const dayPatterns = [
        { pattern: /mon(?:day)?/gi, day: 'Monday' },
        { pattern: /tue(?:sday)?/gi, day: 'Tuesday' },
        { pattern: /wed(?:nesday)?/gi, day: 'Wednesday' },
        { pattern: /thu(?:rsday)?/gi, day: 'Thursday' },
        { pattern: /fri(?:day)?/gi, day: 'Friday' },
        { pattern: /sat(?:urday)?/gi, day: 'Saturday' },
        { pattern: /sun(?:day)?/gi, day: 'Sunday' }
    ];

    dayPatterns.forEach(({ pattern, day }) => {
        if (pattern.test(text)) {
            days.push(day);
        }
    });

    // Handle special schedule names
    if (text.includes('weekday')) {
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    } else if (text.includes('shift') || text.includes('day') || text.includes('night')) {
        // Default to weekdays if shift is mentioned
        if (!days.length) {
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        }
    }

    return { days, startTime, endTime };
}

function convertTo24Hour(hour, min, ampm) {
    let h = parseInt(hour);
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
}

function timeInRange(timeSlot, startTime, endTime) {
    // timeSlot is in format "08:00"
    // check if it's within the range
    return timeSlot >= startTime && timeSlot < endTime;
}

function getCustomScheduleString() {
    const selectedDays = Array.from(document.querySelectorAll('input[name="customDays"]:checked')).map(cb => cb.value);
    const startTime = document.getElementById('customStartTime').value;
    const endTime = document.getElementById('customEndTime').value;

    if (!selectedDays.length || !startTime || !endTime) {
        return '';
    }

    const dayShortcuts = {
        'Monday': 'M',
        'Tuesday': 'T',
        'Wednesday': 'W',
        'Thursday': 'Th',
        'Friday': 'F',
        'Saturday': 'S'
    };

    const dayCode = selectedDays.map(d => dayShortcuts[d]).join('');
    const formatTime = (time24) => {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    return `${dayCode} (${formatTime(startTime)} - ${formatTime(endTime)})`;
}

async function saveSchedule(event) {
    event.preventDefault();
    
    const scheduleType = document.querySelector('input[name="scheduleType"]:checked').value;
    let schedule = '';

    if (scheduleType === 'preset') {
        schedule = document.getElementById('assignScheduleSelect').value;
    } else {
        schedule = getCustomScheduleString();
        if (!schedule) {
            Swal.fire({ title: 'Error', text: 'Please select days and times for custom schedule', icon: 'error' });
            return;
        }
    }

    const payload = {
        batch_id: document.getElementById('assignBatchId').value,
        trainer_id: document.getElementById('assignTrainerSelect').value,
        schedule: schedule,
        room_id: document.getElementById('assignRoomSelect').value
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/registrar/schedule.php?action=assign`, payload);
        if (response.data.success) {
            Swal.fire({ title: 'Success', text: 'Schedule assigned successfully!', icon: 'success' });
            if (scheduleModal) scheduleModal.hide();
            loadScheduleData();
            buildTimetable();
        } else {
            Swal.fire({ title: 'Error', text: response.data.message || 'An error occurred', icon: 'error' });
        }
    } catch (error) {
        console.error('Error saving schedule:', error);
        Swal.fire({ title: 'Error', text: 'An error occurred while saving the schedule.', icon: 'error' });
    }
}
