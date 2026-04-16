const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
let currentTrainerId = null;

document.addEventListener('DOMContentLoaded', async function () {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    initSidebar();
    initUserMenu();
    initLogout();

    const generateLiveChartBtn = document.getElementById('generateLiveChartBtn');
    if (generateLiveChartBtn) generateLiveChartBtn.addEventListener('click', generateLiveChart);

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
            loadBatchesForChart(currentTrainerId);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
    }
});

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainShell = document.getElementById('mainShell');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    if (!sidebar) return;

    function syncDesktopShellOffset() {
        if (!mainShell) return;
        if (window.innerWidth >= 1024) {
            mainShell.style.marginLeft = `${sidebar.getBoundingClientRect().width}px`;
        } else {
            mainShell.style.marginLeft = '';
        }
    }

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

    syncDesktopShellOffset();
    window.addEventListener('resize', () => {
        syncDesktopShellOffset();
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

async function loadBatchesForChart(trainerId) {
    if (!trainerId) return;
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_batches.php?trainer_id=${trainerId}`);
        const select = document.getElementById('batchSelectForChart');
        if (!select) return;

        if (response.data.success) {
            select.innerHTML = '<option value="">Select a batch to generate achievement chart...</option>';
            response.data.data.forEach(batch => {
                select.innerHTML += `<option value="${batch.batch_id}">${batch.batch_name} - ${batch.course_name}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Could not load batches.</option>';
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

async function generateLiveChart() {
    const batchId = document.getElementById('batchSelectForChart').value;
    if (!batchId) {
        notify('warning', 'Please select a batch.');
        return;
    }

    const btn = document.getElementById('generateLiveChartBtn');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i> Generating';

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/progress_chart.php?action=get-batch-data&batch_id=${batchId}`);
        if (response.data.success) {
            renderLiveChart(response.data.data);
        } else {
            notify('error', `Error generating chart: ${response.data.message}`);
        }
    } catch (error) {
        console.error('Error generating chart:', error);
        notify('error', 'An error occurred while generating the chart.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

function renderLiveChart(data) {
    if (!data || typeof data !== 'object') {
        document.getElementById('chartContainer').innerHTML =
            '<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Invalid chart data received.</div>';
        return;
    }
    const trainees = Array.isArray(data.trainees) ? data.trainees : [];
    const outcomes = Array.isArray(data.outcomes) ? data.outcomes : [];
    const completion_status = Array.isArray(data.completion_status) ? data.completion_status : [];
    const batch_info = data.batch_info || {};

    if (!trainees || !outcomes || trainees.length === 0 || outcomes.length === 0) {
        document.getElementById('chartContainer').innerHTML =
            '<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Not enough data to generate a chart.</div>';
        return;
    }

    const modules = outcomes.reduce((acc, outcome) => {
        const moduleTitle = outcome.module_title || 'Uncategorized';
        if (!acc[moduleTitle]) acc[moduleTitle] = [];
        acc[moduleTitle].push(outcome);
        return acc;
    }, {});
    const moduleNames = Object.keys(modules);

    let html = `
        <div class="mb-4 text-center text-slate-900">
            <h3 class="text-lg font-bold">Hohoo Ville Technical School Inc.</h3>
            <p class="text-sm">Purok 6A, Poblacion, Lagonglong, Misamis Oriental</p>
            <h4 class="mt-2 text-xl font-extrabold">ACHIEVEMENT CHART</h4>
            <h5 class="font-bold uppercase">${escapeHtml(batch_info?.qualification_name || 'Qualification')} (${escapeHtml(batch_info?.duration || 'N/A')})</h5>
        </div>
        <div class="overflow-x-auto">
            <table class="tesda-table">
                <thead>
                    <tr>
                        <th rowspan="2" style="width:40px;">NO</th>
                        <th rowspan="2" style="width:240px;">NAME OF TRAINEE</th>
    `;

    moduleNames.forEach(modName => {
        html += `<th colspan="${modules[modName].length}">${escapeHtml(modName)}</th>`;
    });
    html += '</tr><tr>';

    moduleNames.forEach(modName => {
        modules[modName].forEach((outcome, idx) => {
            html += `<th><div style="writing-mode:vertical-rl; transform:rotate(180deg); white-space:nowrap; margin:0 auto;">${idx + 1}. ${escapeHtml(outcome.outcome_title)}</div></th>`;
        });
    });
    html += '</tr></thead><tbody>';

    for (let i = 0; i < 25; i++) {
        const trainee = trainees[i];
        html += `<tr><td>${i + 1}</td><td style="text-align:left; font-weight:bold;">${trainee ? escapeHtml(String(trainee.full_name).toUpperCase()) : ''}</td>`;
        moduleNames.forEach(modName => {
            modules[modName].forEach(outcome => {
                let mark = '';
                if (trainee) {
                    const status = completion_status.find(s =>
                        String(s.trainee_id) === String(trainee.trainee_id) &&
                        String(s.outcome_id) === String(outcome.outcome_id)
                    );
                    mark = normalizeMark(status ? status.mark : '');
                }
                html += `<td>${mark}</td>`;
            });
        });
        html += '</tr>';
    }
    html += '</tbody></table></div>';

    const startDate = batch_info?.start_date
        ? new Date(batch_info.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '____________________';
    const endDate = batch_info?.end_date
        ? new Date(batch_info.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '____________________';
    const trainerName = batch_info?.trainer_name ? String(batch_info.trainer_name).toUpperCase() : '____________________';

    html += `
        <div class="mt-4 space-y-2 text-sm text-slate-800">
            <p class="font-bold">LEGENDS:</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>Training Duration: <span class="font-bold">${escapeHtml(batch_info?.duration || '_______')}</span></div>
                <div>Date Started: <span class="font-bold">${escapeHtml(startDate)}</span></div>
                <div class="font-bold">C - COMPETENT</div>
                <div>Trainer: <span class="font-bold underline">${escapeHtml(trainerName)}</span></div>
                <div>Date Finished: <span class="font-bold">${escapeHtml(endDate)}</span></div>
                <div class="font-bold">NYC - NOT YET COMPETENT</div>
            </div>
        </div>
    `;

    document.getElementById('chartContainer').innerHTML = html;
}

function normalizeMark(mark) {
    const raw = String(mark || '').toUpperCase();
    if (!raw) return '';
    if (raw.includes('IP')) return 'IP';
    if (raw === 'C' || raw === 'CHECK' || /[\u00E2\u00C3\u0153\u2713]/.test(raw)) return 'C';
    return raw;
}

function notify(type, message) {
    if (window.Swal) {
        Swal.fire({ icon: type, text: message });
    } else {
        alert(message);
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

