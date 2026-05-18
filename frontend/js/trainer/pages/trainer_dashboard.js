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

    document.getElementById('logoutBtn').addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
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

    try {
        const response = await apiClient.get(`/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            const trainer = response.data.data;
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
            loadSchedule(trainerId)
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
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-slate-500">No upcoming schedule</td></tr>';
        return;
    }

    items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(item.batch_name || 'N/A')}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(item.course_name || 'N/A')}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(item.schedule || 'TBA')}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${escapeHtml(formatRoomValue(item.room))}</td>
        `;
        tbody.appendChild(row);
    });
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
        const title = truncateLabel(item.batch_name || 'Schedule', 56);
        const room = formatRoomValue(item.room);
        const subtitle = truncateLabel(room === 'TBA' ? (item.course_name || 'TBA') : room, 32);

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
