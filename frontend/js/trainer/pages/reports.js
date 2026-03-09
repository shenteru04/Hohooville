const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const REPORT_LABELS = {
    grading_summary: 'Class Grading Summary',
    attendance_summary: 'Attendance Report',
    competency_status: 'Competency Status (CTPR)'
};

document.addEventListener('DOMContentLoaded', async function () {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    initSidebar();
    initUserMenu();
    initLogout();

    document.getElementById('reportForm').addEventListener('submit', function (event) {
        event.preventDefault();
        generateReport();
    });

    const exportBtn = document.getElementById('exportReportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const label = REPORT_LABELS[document.getElementById('reportType')?.value] || 'Report';
            const batchLabel = getSelectedBatchLabel().replace(/[^a-z0-9_-]+/gi, '_');
            const filename = `trainer_${label.replace(/[^a-z0-9_-]+/gi, '_')}_${batchLabel}`;
            if (typeof window.exportTableToExcel === 'function') {
                window.exportTableToExcel('reportTable', filename);
            } else {
                notify('info', 'Export is not available.');
            }
        });
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            const trainer = response.data.data;
            if (trainer.first_name && trainer.last_name) {
                const fullName = `${trainer.first_name} ${trainer.last_name}`;
                document.getElementById('trainerName').textContent = fullName;
            } else {
                document.getElementById('trainerName').textContent = user.username || 'Trainer';
            }
            loadBatches(trainer.trainer_id);
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
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden', 'opacity-0');
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

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.clear();
        window.location.href = '/Hohoo-ville/frontend/login.html';
    });
}

async function loadBatches(trainerId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/trainer_dashboard.php?action=schedule&trainer_id=${trainerId}`);
        if (response.data.success) {
            const select = document.getElementById('batchSelect');
            if (!select) return;

            select.innerHTML = '<option value="">Select Batch</option>';
            const unique = new Set();
            response.data.data.forEach(batch => {
                const key = `${batch.batch_id}-${batch.batch_name}-${batch.course_name}`;
                if (unique.has(key)) return;
                unique.add(key);
                select.innerHTML += `<option value="${batch.batch_id}">${batch.batch_name} - ${batch.course_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

async function generateReport() {
    const type = document.getElementById('reportType').value;
    const batchId = document.getElementById('batchSelect').value;

    if (!batchId) {
        notify('warning', 'Please select a batch.');
        return;
    }

    try {
        setLoading(true, 'Generating report...');
        const response = await axios.get(`${API_BASE_URL}/role/trainer/reports.php?action=${type}&batch_id=${batchId}`);
        if (response.data.success) {
            renderReport(type, response.data.data || []);
            setLoading(false, 'Report generated');
        } else {
            renderEmpty();
            setLoading(false, 'No data found');
            notify('info', 'No data found for this report.');
        }
    } catch (error) {
        console.error('Report Error:', error);
        renderEmpty();
        setLoading(false, 'Error generating report');
        notify('error', 'Failed to generate report.');
    }
}

function renderReport(type, data) {
    const container = document.getElementById('reportResult');
    const thead = document.getElementById('reportHead');
    const tbody = document.getElementById('reportBody');
    const emptyState = document.getElementById('reportEmpty');
    const reportTitle = document.getElementById('reportTitle');
    const reportTypeLabel = document.getElementById('reportTypeLabel');
    const reportDate = document.getElementById('reportDate');
    const reportBatchName = document.getElementById('reportBatchName');

    container.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    reportTitle.textContent = `${REPORT_LABELS[type] || 'Report'} Preview`;
    reportTypeLabel.textContent = REPORT_LABELS[type] || 'Report';
    reportDate.textContent = new Date().toLocaleString();
    reportBatchName.textContent = getSelectedBatchLabel();

    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        renderEmpty();
        return;
    }

    if (type === 'grading_summary' || type === 'competency_status') {
        thead.innerHTML = `
            <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Trainee Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Course</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Total Grade</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
            </tr>
        `;
        data.forEach(row => {
            const grade = parseFloat(row.total_grade);
            const competent = !Number.isNaN(grade) && grade >= 80;
            const badgeClass = competent
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700';
            const statusText = competent ? 'Competent' : 'NYC';

            tbody.innerHTML += `
                <tr>
                    <td class="px-4 py-3 text-sm text-slate-700">${row.trainee_name || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${row.course_name || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${row.total_grade || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm">
                        <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}">${statusText}</span>
                    </td>
                </tr>
            `;
        });
    } else if (type === 'attendance_summary') {
        thead.innerHTML = `
            <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Trainee Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Present</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Absent</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Late</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Attendance Rate</th>
            </tr>
        `;
        data.forEach(row => {
            const present = parseInt(row.present, 10) || 0;
            const absent = parseInt(row.absent, 10) || 0;
            const late = parseInt(row.late, 10) || 0;
            const total = present + absent + late;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;
            tbody.innerHTML += `
                <tr>
                    <td class="px-4 py-3 text-sm text-slate-700">${row.trainee_name || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${present}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${absent}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${late}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${rate}%</td>
                </tr>
            `;
        });
    }

    renderSummary(type, data);
}

function renderSummary(type, data) {
    const summary = document.getElementById('reportSummary');
    if (!summary) return;
    summary.classList.remove('hidden');

    const totalEl = document.getElementById('summaryTotal');
    const competentEl = document.getElementById('summaryCompetent');
    const avgEl = document.getElementById('summaryAverage');
    const attendanceEl = document.getElementById('summaryAttendance');

    const total = data.length;
    totalEl.textContent = total;

    if (type === 'attendance_summary') {
        const rates = data.map(row => {
            const present = parseInt(row.present, 10) || 0;
            const absent = parseInt(row.absent, 10) || 0;
            const late = parseInt(row.late, 10) || 0;
            const totalDays = present + absent + late;
            return totalDays > 0 ? (present / totalDays) * 100 : 0;
        });
        const avgRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
        competentEl.textContent = 'N/A';
        avgEl.textContent = 'N/A';
        attendanceEl.textContent = `${avgRate.toFixed(1)}%`;
        return;
    }

    const numericGrades = data
        .map(row => parseFloat(row.total_grade))
        .filter(val => !Number.isNaN(val));

    const avg = numericGrades.length ? numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length : 0;
    const competent = data.filter(row => parseFloat(row.total_grade) >= 80).length;

    competentEl.textContent = competent;
    avgEl.textContent = numericGrades.length ? `${avg.toFixed(1)}%` : 'N/A';
    attendanceEl.textContent = 'N/A';
}

function renderEmpty() {
    const container = document.getElementById('reportResult');
    const thead = document.getElementById('reportHead');
    const tbody = document.getElementById('reportBody');
    const summary = document.getElementById('reportSummary');
    const emptyState = document.getElementById('reportEmpty');

    container.classList.remove('hidden');
    thead.innerHTML = '';
    tbody.innerHTML = '';
    if (summary) summary.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
}

function getSelectedBatchLabel() {
    const select = document.getElementById('batchSelect');
    if (!select) return '-';
    const option = select.options[select.selectedIndex];
    return option ? option.textContent : '-';
}

function setLoading(isLoading, statusText) {
    const viewBtn = document.getElementById('viewReportBtn');
    const exportBtn = document.getElementById('exportReportBtn');
    const status = document.getElementById('reportStatus');

    if (status) status.textContent = statusText || '';
    if (!viewBtn) return;

    viewBtn.disabled = isLoading;
    if (exportBtn) exportBtn.disabled = isLoading;

    if (isLoading) {
        viewBtn.dataset.originalText = viewBtn.innerHTML;
        viewBtn.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i> Generating';
    } else if (viewBtn.dataset.originalText) {
        viewBtn.innerHTML = viewBtn.dataset.originalText;
    }
}

function notify(type, message) {
    if (window.Swal) {
        const icon = type === 'warning' || type === 'error' || type === 'info' || type === 'success' ? type : 'info';
        Swal.fire({ icon, text: message });
    } else {
        alert(message);
    }
}
