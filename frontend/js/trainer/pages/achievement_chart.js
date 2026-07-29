const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const SCHOOL_NAME = 'Hohoo Ville Technical School Inc.';
const SCHOOL_ADDRESS = 'Purok 6A, Poblacion, Lagonglong, Misamis Oriental';
const CHECK_MARK = '\u2713';
const ADMIN_TRAINERS_PAGE = '/Hohoo-ville/frontend/html/admin/pages/view_trainers.html';
const COMPETENCY_ORDER = ['core'];
const COMPETENCY_LABELS = {
    basic: 'Basic Competencies',
    common: 'Common Competencies',
    core: 'Core Competencies'
};

let selectedCell = null;
let currentTrainerId = null;
let currentLiveChartData = null;
const exportImageCache = new Map();

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

async function ensureExcelJs() {
    if (typeof window.ExcelJS !== 'undefined') return true;

    return new Promise((resolve) => {
        const existingScript = document.querySelector('script[data-exceljs-loader="true"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(typeof window.ExcelJS !== 'undefined'), { once: true });
            existingScript.addEventListener('error', () => resolve(false), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
        script.dataset.exceljsLoader = 'true';
        script.onload = () => resolve(typeof window.ExcelJS !== 'undefined');
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}

function readStoredPortalUser() {
    try {
        const raw = JSON.parse(localStorage.getItem('user') || 'null');
        if (raw && typeof raw === 'object' && raw.user && typeof raw.user === 'object') {
            return raw.user;
        }
        return raw;
    } catch (error) {
        console.debug('Could not parse stored user:', error);
        return null;
    }
}

function isAdminUser(user) {
    return String(user?.role || '').toLowerCase() === 'admin';
}

function isRegistrarUser(user) {
    return String(user?.role || '').toLowerCase() === 'registrar';
}

function getRequestedTrainerId() {
    const params = new URLSearchParams(window.location.search);
    const value = Number.parseInt(params.get('trainer_id') || '', 10);
    return Number.isInteger(value) && value > 0 ? value : null;
}

function getRequestedBatchId() {
    const params = new URLSearchParams(window.location.search);
    const value = Number.parseInt(params.get('batch_id') || '', 10);
    return Number.isInteger(value) && value > 0 ? value : null;
}

function getRequestedChartSource() {
    const source = String(new URLSearchParams(window.location.search).get('source') || '').toLowerCase();
    return ['admin', 'registrar'].includes(source) ? source : '';
}

function setHeaderUserLabel(label) {
    const nameEl = document.getElementById('trainerName');
    if (nameEl) nameEl.textContent = label;
}

function hideTrainerProfileLinkForAdmin() {
    const profileLink = document.querySelector('#userMenuDropdown a[href$="/trainer/pages/profile.html"]');
    if (profileLink) profileLink.classList.add('hidden');
}

function applyAdminChartLinks(trainerId) {
    const suffix = `?trainer_id=${encodeURIComponent(String(trainerId))}`;
    document.querySelectorAll('a[href$="progress_chart.html"]').forEach((link) => {
        link.href = `/Hohoo-ville/frontend/html/trainer/pages/progress_chart.html${suffix}`;
    });
    document.querySelectorAll('a[href$="achievement_chart.html"]').forEach((link) => {
        link.href = `/Hohoo-ville/frontend/html/trainer/pages/achievement_chart.html${suffix}`;
    });
}

function applyBatchChartLinks(batchId, source) {
    const params = new URLSearchParams({ batch_id: String(batchId) });
    if (source) params.set('source', source);
    const suffix = `?${params.toString()}`;

    document.querySelectorAll('a[href$="progress_chart.html"]').forEach((link) => {
        link.href = `/Hohoo-ville/frontend/html/trainer/pages/progress_chart.html${suffix}`;
    });
    document.querySelectorAll('a[href$="achievement_chart.html"]').forEach((link) => {
        link.href = `/Hohoo-ville/frontend/html/trainer/pages/achievement_chart.html${suffix}`;
    });
}

function showAdminAccessBanner(trainerName, hasSelection = true) {
    const banner = document.getElementById('adminAccessBanner');
    const accessLabel = document.getElementById('chartAccessLabel');
    const trainerNameEl = document.getElementById('adminAccessTrainerName');
    const noteEl = document.getElementById('adminAccessNote');
    const backLink = document.getElementById('adminAccessBackLink');
    const backLabel = document.getElementById('adminAccessBackLabel');

    if (!banner) return;
    if (accessLabel) accessLabel.textContent = 'Admin Access';
    if (trainerNameEl) trainerNameEl.textContent = trainerName || 'Selected trainer';
    if (noteEl) {
        noteEl.textContent = hasSelection
            ? 'Admin access mode. You can review and edit chart marks for export from here.'
            : 'Open this page from View Trainers to load a trainer chart.';
    }
    if (backLink) backLink.href = ADMIN_TRAINERS_PAGE;
    if (backLabel) backLabel.textContent = 'Back to Trainers';

    banner.classList.remove('hidden');
}

function showBatchAccessBanner(source) {
    const fromRegistrar = source === 'registrar';
    const banner = document.getElementById('adminAccessBanner');
    const accessLabel = document.getElementById('chartAccessLabel');
    const trainerNameEl = document.getElementById('adminAccessTrainerName');
    const noteEl = document.getElementById('adminAccessNote');
    const backLink = document.getElementById('adminAccessBackLink');
    const backLabel = document.getElementById('adminAccessBackLabel');

    if (!banner) return;
    if (accessLabel) accessLabel.textContent = fromRegistrar ? 'Registrar Access' : 'Admin Access';
    if (trainerNameEl) trainerNameEl.textContent = 'Selected archived batch';
    if (noteEl) noteEl.textContent = 'This chart is preloaded for the batch selected from the archive. Exporting uses the same trainer chart format.';
    if (backLink) {
        backLink.href = fromRegistrar
            ? '/Hohoo-ville/frontend/html/registrar/pages/manage_batches.html'
            : '/Hohoo-ville/frontend/html/admin/pages/view_batches.html';
    }
    if (backLabel) backLabel.textContent = 'Back to Batches';

    banner.classList.remove('hidden');
}

async function resolveTrainerContext(user) {
    const batchId = getRequestedBatchId();
    if (batchId) {
        const source = isRegistrarUser(user)
            ? 'registrar'
            : (isAdminUser(user) ? 'admin' : getRequestedChartSource());

        if (isAdminUser(user)) {
            setHeaderUserLabel('Admin');
            hideTrainerProfileLinkForAdmin();
            showBatchAccessBanner(source);
        } else if (isRegistrarUser(user)) {
            setHeaderUserLabel('Registrar');
            hideTrainerProfileLinkForAdmin();
            showBatchAccessBanner(source);
        }

        applyBatchChartLinks(batchId, source);
        return { batchId };
    }

    if (isAdminUser(user)) {
        const trainerId = getRequestedTrainerId();
        setHeaderUserLabel('Admin');
        hideTrainerProfileLinkForAdmin();

        if (!trainerId) {
            showAdminAccessBanner('No trainer selected', false);
            return null;
        }

        applyAdminChartLinks(trainerId);

        let trainerLabel = `Trainer #${trainerId}`;
        try {
            const response = await axios.get(`${API_BASE_URL}/role/admin/trainers.php?action=get&id=${trainerId}`);
            if (response.data?.success) {
                const trainer = response.data.data || {};
                trainerLabel = `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim() || trainerLabel;
            }
        } catch (error) {
            console.warn('Could not load admin trainer context:', error);
        }

        showAdminAccessBanner(trainerLabel, true);
        return { trainerId };
    }

    const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
    if (!response.data.success) {
        throw new Error(response.data.message || 'Trainer profile not found.');
    }

    const trainer = response.data.data || {};
    const displayName = `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim()
        || user.username
        || 'Trainer';
    setHeaderUserLabel(displayName);

    return { trainerId: trainer.trainer_id };
}

document.addEventListener('DOMContentLoaded', async function () {
    const user = readStoredPortalUser();
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    initSidebar();
    initUserMenu();
    initLogout();

    const generateLiveChartBtn = document.getElementById('generateLiveChartBtn');
    const exportChartBtn = document.getElementById('exportChartBtn');
    const insertCheckBtn = document.getElementById('insertCheckBtn');
    const insertIpBtn = document.getElementById('insertIpBtn');
    const insertNycBtn = document.getElementById('insertNycBtn');
    const clearCellBtn = document.getElementById('clearCellBtn');

    if (generateLiveChartBtn) generateLiveChartBtn.addEventListener('click', generateLiveChart);
    if (exportChartBtn) exportChartBtn.addEventListener('click', exportChart);
    if (insertCheckBtn) insertCheckBtn.addEventListener('click', () => insertSymbol(CHECK_MARK));
    if (insertIpBtn) insertIpBtn.addEventListener('click', () => insertSymbol('IP'));
    if (insertNycBtn) insertNycBtn.addEventListener('click', () => insertSymbol('NYC'));
    if (clearCellBtn) clearCellBtn.addEventListener('click', () => insertSymbol(''));

    document.addEventListener('click', function (event) {
        const cell = event.target.closest('.tesda-table td[contenteditable="true"]');
        if (!cell) return;

        if (selectedCell) selectedCell.classList.remove('selected-cell');
        selectedCell = cell;
        selectedCell.classList.add('selected-cell');
    });

    try {
        const context = await resolveTrainerContext(user);
        if (context?.batchId) {
            await loadRequestedBatchForChart(context.batchId);
        } else if (context?.trainerId) {
            currentTrainerId = context.trainerId;
            loadBatchesForChart(currentTrainerId);
        } else {
            const select = document.getElementById('batchSelectForChart');
            if (select) {
                select.innerHTML = '<option value="">Open this page from View Trainers to load a trainer chart...</option>';
            }
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
        notify('error', error.message || 'Could not load trainer chart access.');
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

async function loadBatchesForChart(trainerId) {
    if (!trainerId) return;
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_batches.php?trainer_id=${trainerId}`);
        const select = document.getElementById('batchSelectForChart');
        if (!select) return;

        if (response.data.success) {
            select.innerHTML = '<option value="">Select a batch to generate achievement chart...</option>';
            response.data.data.forEach((batch) => {
                select.innerHTML += `<option value="${batch.batch_id}">${escapeHtml(batch.batch_name)} - ${escapeHtml(batch.course_name)}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Could not load batches.</option>';
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

async function loadRequestedBatchForChart(batchId) {
    const select = document.getElementById('batchSelectForChart');
    if (!select) return;

    select.disabled = true;
    select.innerHTML = `<option value="${batchId}">Loading selected batch...</option>`;
    select.value = String(batchId);

    await generateLiveChart();

    const batchInfo = currentLiveChartData?.batch_info || {};
    if (currentLiveChartData && select.options.length) {
        const qualification = batchInfo.qualification_name || batchInfo.course_name || 'Qualification';
        select.options[0].textContent = `${batchInfo.batch_name || 'Selected batch'} - ${qualification}`;
    }
}

async function generateLiveChart() {
    const batchId = document.getElementById('batchSelectForChart')?.value;
    if (!batchId) {
        notify('warning', 'Please select a batch.');
        return;
    }

    const btn = document.getElementById('generateLiveChartBtn');
    const original = btn?.innerHTML || '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i> Generating';
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/progress_chart.php?action=get-batch-data&batch_id=${batchId}`);
        if (response.data.success) {
            currentLiveChartData = response.data.data;
            renderLiveChart(currentLiveChartData);
        } else {
            notify('error', `Error generating chart: ${response.data.message}`);
        }
    } catch (error) {
        console.error('Error generating chart:', error);
        notify('error', 'An error occurred while generating the chart.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }
}

function sortTraineesAlphabetically(trainees) {
    return [...trainees].sort((left, right) => {
        const leftName = String(left?.full_name || '').trim();
        const rightName = String(right?.full_name || '').trim();
        return leftName.localeCompare(rightName, undefined, {
            sensitivity: 'base',
            numeric: true
        });
    });
}

function renderLiveChart(data) {
    const container = document.getElementById('chartContainer');
    if (!container) return;

    if (!data || typeof data !== 'object') {
        container.innerHTML =
            '<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Invalid chart data received.</div>';
        return;
    }

    const trainees = sortTraineesAlphabetically(Array.isArray(data.trainees) ? data.trainees : []);
    const outcomes = Array.isArray(data.outcomes) ? data.outcomes : [];
    const completionStatus = Array.isArray(data.completion_status) ? data.completion_status : [];
    const batchInfo = data.batch_info || {};
    const coreOutcomes = outcomes.filter((outcome) => outcome.competency_type === 'core');

    if (!trainees.length || !coreOutcomes.length) {
        container.innerHTML =
            '<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">No core competencies were found for this batch.</div>';
        return;
    }

    const completionLookup = buildCompletionLookup(completionStatus);
    const modules = buildModuleGroups(coreOutcomes, COMPETENCY_LABELS.core);

    let html = `
        <div class="mb-4 text-center text-slate-900">
            <h3 class="text-lg font-bold">${escapeHtml(SCHOOL_NAME)}</h3>
            <p class="text-sm">${escapeHtml(SCHOOL_ADDRESS)}</p>
            <h4 class="mt-2 text-xl font-extrabold">ACHIEVEMENT CHART</h4>
            <h5 class="font-bold uppercase">${escapeHtml(batchInfo.qualification_name || 'Qualification')} (${escapeHtml(batchInfo.duration || 'N/A')})</h5>
            ${batchInfo.batch_name ? `<p class="mt-1 text-sm font-semibold text-slate-600">${escapeHtml(batchInfo.batch_name)}</p>` : ''}
        </div>
        <div class="overflow-x-auto">
            <table class="tesda-table">
                <thead>
                    <tr>
                        <th rowspan="2" style="width:40px;">NO</th>
                        <th rowspan="2" style="width:240px;">NAME OF TRAINEE</th>
    `;

    modules.forEach((module) => {
        html += `<th colspan="${module.outcomes.length}">${escapeHtml(module.title)}</th>`;
    });
    html += '</tr><tr>';

    modules.forEach((module) => {
        module.outcomes.forEach((outcome, outcomeIndex) => {
            html += `<th><div style="writing-mode:vertical-rl; transform:rotate(180deg); white-space:nowrap; margin:0 auto;">${escapeHtml(formatOutcomeLabel(outcome.outcome_title, outcomeIndex + 1))}</div></th>`;
        });
    });
    html += '</tr></thead><tbody>';

    const rowCount = Math.max(trainees.length, 25);
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const trainee = trainees[rowIndex] || null;
        html += `<tr><td>${rowIndex + 1}</td><td style="text-align:left; font-weight:bold;">${trainee ? escapeHtml(String(trainee.full_name || '').toUpperCase()) : ''}</td>`;
        modules.forEach((module) => {
            module.outcomes.forEach((outcome) => {
                if (trainee) {
                    const mark = completionLookup.get(`${trainee.trainee_id}:${outcome.outcome_id}`) || '';
                    html += `<td class="progress-mark" data-outcome-id="${outcome.outcome_id}" data-trainee-id="${trainee.trainee_id}">${escapeHtml(mark)}</td>`;
                } else {
                    html += '<td class="chart-static-cell" data-readonly="true"></td>';
                }
            });
        });
        html += '</tr>';
    }
    html += '</tbody></table></div>';

    html += `
        <div class="mt-4 space-y-2 text-sm text-slate-800">
            <p class="font-bold">LEGENDS:</p>
            <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div>Training Duration: <span class="font-bold">${escapeHtml(batchInfo.duration || '_______')}</span></div>
                <div>Date Started: <span class="font-bold">${escapeHtml(formatDisplayDate(batchInfo.start_date))}</span></div>
                <div class="font-bold inline-flex items-center gap-2"><i class="fas fa-check text-emerald-600" aria-hidden="true"></i> COMPETENT</div>
                <div>Trainer: <span class="font-bold underline">${escapeHtml(batchInfo.trainer_name || '____________________')}</span></div>
                <div>Date Finished: <span class="font-bold">${escapeHtml(formatDisplayDate(batchInfo.end_date))}</span></div>
                <div><span class="font-bold text-rose-600">NYC</span> - NOT YET COMPETENT</div>
                <div><span class="font-bold text-amber-600">IP</span> - IN PROGRESS</div>
            </div>
        </div>
    `;

    renderChart(html);
}

function renderChart(htmlContent) {
    const container = document.getElementById('chartContainer');
    if (!container) return;

    clearSelectedCell();
    container.innerHTML = htmlContent;

    const tables = container.querySelectorAll('table');
    tables.forEach((table) => {
        table.classList.add('tesda-table');

        const bodyCells = table.querySelectorAll('tbody td');
        bodyCells.forEach((cell) => {
            const isReadOnly = cell.dataset.readonly === 'true'
                || cell.classList.contains('chart-static-cell')
                || !cell.dataset.outcomeId
                || !cell.dataset.traineeId;

            if (isReadOnly) {
                cell.removeAttribute('contenteditable');
                return;
            }

            cell.setAttribute('contenteditable', 'true');
            cell.classList.add('progress-mark');
            updateAchievementCellAppearance(cell);
        });

        table.querySelectorAll('tfoot td').forEach((cell) => {
            cell.dataset.readonly = 'true';
            cell.removeAttribute('contenteditable');
        });
    });
}

function updateAchievementCellAppearance(cell) {
    if (!cell) return;

    const normalizedMark = normalizeMark(cell.innerText.trim());
    cell.innerText = normalizedMark;
    cell.classList.remove('text-emerald-600', 'text-amber-600', 'text-rose-600');

    if (normalizedMark === CHECK_MARK) {
        cell.classList.add('text-emerald-600');
    } else if (normalizedMark === 'IP') {
        cell.classList.add('text-amber-600');
    } else if (normalizedMark === 'NYC') {
        cell.classList.add('text-rose-600');
    }
}

function collectCurrentChartMarks() {
    const completionLookup = new Map();
    const editableCells = document.querySelectorAll('#chartContainer td[data-outcome-id][data-trainee-id]');
    editableCells.forEach((cell) => {
        const traineeId = cell.dataset.traineeId;
        const outcomeId = cell.dataset.outcomeId;
        if (!traineeId || !outcomeId) return;
        completionLookup.set(`${traineeId}:${outcomeId}`, normalizeMark(cell.innerText.trim()));
    });
    return completionLookup;
}

function insertSymbol(symbol) {
    if (!selectedCell) {
        notify('info', 'Please click an achievement cell in the table first.');
        return;
    }

    selectedCell.innerText = symbol;
    updateAchievementCellAppearance(selectedCell);
}

async function exportChart() {
    if (!currentLiveChartData) {
        notify('warning', 'Please generate an achievement chart first.');
        return;
    }

    const trainees = sortTraineesAlphabetically(Array.isArray(currentLiveChartData.trainees) ? currentLiveChartData.trainees : []);
    const coreOutcomes = Array.isArray(currentLiveChartData.outcomes)
        ? currentLiveChartData.outcomes.filter((outcome) => outcome.competency_type === 'core')
        : [];
    if (!trainees.length || !coreOutcomes.length) {
        notify('warning', 'There is no core competency chart data to export.');
        return;
    }

    const exportBtn = document.getElementById('exportChartBtn');
    const originalLabel = exportBtn?.innerHTML || '';
    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i> Exporting';
    }

    const exportTitle = buildDefaultExportTitle(currentLiveChartData.batch_info || {});
    const markOverrides = collectCurrentChartMarks();

    try {
        const excelJsReady = await ensureExcelJs();
        if (excelJsReady && typeof window.ExcelJS !== 'undefined') {
            const workbook = await buildExcelJsAchievementChart(currentLiveChartData, markOverrides, exportTitle);
            const workbookBuffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob(
                [workbookBuffer],
                { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
            );
            downloadBlob(blob, `${sanitizeFilename(exportTitle || 'tesda-achievement-chart')}.xlsx`);
            notify('success', 'Achievement chart exported successfully.');
            return;
        }

        notify('warning', 'Excel workbook support is unavailable right now, so a styled HTML file will be downloaded instead.');
    } catch (error) {
        console.error('Error exporting XLSX workbook:', error);
        notify('warning', 'Excel workbook export failed, so a styled HTML file will be downloaded instead.');
    } finally {
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = originalLabel;
        }
    }

    const htmlDocument = buildExportHtmlDocument(buildTesdaAchievementChartHtml(currentLiveChartData, markOverrides), exportTitle);
    const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `${sanitizeFilename(exportTitle || 'tesda-achievement-chart')}.html`);
    notify('success', 'Styled achievement chart exported successfully.');
}

async function buildExcelJsAchievementChart(data, markOverrides, exportTitle) {
    const trainees = sortTraineesAlphabetically(Array.isArray(data.trainees) ? data.trainees : []);
    const outcomes = Array.isArray(data.outcomes) ? data.outcomes : [];
    const completionStatus = Array.isArray(data.completion_status) ? data.completion_status : [];
    const batchInfo = data.batch_info || {};
    const groupedCompetencies = buildCompetencyGroups(outcomes);
    const completionLookup = markOverrides instanceof Map
        ? markOverrides
        : buildCompletionLookup(completionStatus);

    const totalOutcomeCount = groupedCompetencies.reduce((count, group) => (
        count + group.modules.reduce((moduleCount, module) => moduleCount + module.outcomes.length, 0)
    ), 0);
    const totalColumns = totalOutcomeCount + 2;
    const rowCount = Math.max(trainees.length, 25);

    const workbook = new window.ExcelJS.Workbook();
    workbook.creator = SCHOOL_NAME;
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet(
        getWorksheetName(exportTitle || batchInfo.qualification_name || 'Achievement Chart')
    );

    worksheet.properties.defaultRowHeight = 20;
    worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 10, topLeftCell: 'C11' }];
    worksheet.pageSetup = {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
            left: 0.5,
            right: 0.5,
            top: 0.5,
            bottom: 0.5,
            header: 0.2,
            footer: 0.2
        }
    };

    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 30;
    for (let index = 0; index < totalOutcomeCount; index += 1) {
        worksheet.getColumn(index + 3).width = 8;
    }

    function cloneStyleObject(value) {
        return value ? JSON.parse(JSON.stringify(value)) : undefined;
    }

    function applyStyle(cell, style) {
        if (!style) return;
        if (style.alignment) cell.alignment = cloneStyleObject(style.alignment);
        if (style.font) cell.font = cloneStyleObject(style.font);
        if (style.fill) cell.fill = cloneStyleObject(style.fill);
        if (style.border) cell.border = cloneStyleObject(style.border);
    }

    function styleRange(rowNumber, startColumn, endColumn, style) {
        for (let column = startColumn; column <= endColumn; column += 1) {
            applyStyle(worksheet.getCell(rowNumber, column), style);
        }
    }

    function mergeRowCells(rowNumber, startColumn, endColumn, value, style, height) {
        const row = worksheet.getRow(rowNumber);
        if (height) row.height = height;

        if (endColumn > startColumn) {
            worksheet.mergeCells(rowNumber, startColumn, rowNumber, endColumn);
        }

        styleRange(rowNumber, startColumn, endColumn, style);
        worksheet.getCell(rowNumber, startColumn).value = value;
    }

    const thinBorder = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'thin', color: { argb: 'FF0F172A' } }
    };

    const blankStyle = { border: thinBorder };
    const titleStyle = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        font: { name: 'Arial', size: 16, bold: true },
        border: thinBorder
    };
    const addressStyle = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        font: { name: 'Arial', size: 10 },
        border: thinBorder
    };
    const mainTitleStyle = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        font: { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F4E79' } },
        border: thinBorder
    };
    const qualificationStyle = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        font: { name: 'Arial', size: 14, bold: true, color: { argb: 'FFC00000' } },
        border: thinBorder
    };
    const durationStyle = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        font: { name: 'Arial', size: 12, bold: true, italic: true, color: { argb: 'FF1F4E79' } },
        border: thinBorder
    };
    const metaStyle = {
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        font: { name: 'Arial', size: 10, bold: true },
        border: thinBorder
    };

    const sectionStyles = {
        basic: {
            alignment: { horizontal: 'center', vertical: 'middle' },
            font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1D4ED8' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEBFA' } },
            border: thinBorder
        },
        common: {
            alignment: { horizontal: 'center', vertical: 'middle' },
            font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FF166534' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } },
            border: thinBorder
        },
        core: {
            alignment: { horizontal: 'center', vertical: 'middle' },
            font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FF92400E' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } },
            border: thinBorder
        }
    };

    const moduleStyle = {
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: false, shrinkToFit: true },
        font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF1C1C' } },
        border: thinBorder
    };

    const outcomeStyle = {
        alignment: { horizontal: 'center', vertical: 'bottom', textRotation: 45, wrapText: true },
        font: { name: 'Arial', size: 8, color: { argb: 'FF111827' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2A8' } },
        border: thinBorder
    };

    const noHeaderStyle = {
        alignment: { horizontal: 'center', vertical: 'bottom' },
        font: { name: 'Arial', size: 10, bold: true },
        border: thinBorder
    };

    const nameHeaderStyle = {
        alignment: { horizontal: 'center', vertical: 'bottom' },
        font: { name: 'Arial', size: 10, bold: true },
        border: thinBorder
    };

    const noDataStyle = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        font: { name: 'Arial', size: 10, bold: true },
        border: thinBorder
    };

    const nameDataStyle = {
        alignment: { horizontal: 'left', vertical: 'middle' },
        font: { name: 'Arial', size: 10, bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } },
        border: thinBorder
    };

    const markCellStyle = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        font: { name: 'Arial', size: 10 },
        border: thinBorder
    };

    const checkCellStyle = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        font: { name: 'Arial', size: 12, bold: true },
        border: thinBorder
    };

    const ipCellStyle = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB45309' } },
        border: thinBorder
    };

    const nycCellStyle = {
        alignment: { horizontal: 'center', vertical: 'middle' },
        font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFBE123C' } },
        border: thinBorder
    };

    const legendStyle = {
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
        font: { name: 'Arial', size: 10, bold: true },
        border: thinBorder
    };

    mergeRowCells(1, 1, totalColumns, String(SCHOOL_NAME).toUpperCase(), titleStyle, 34);
    mergeRowCells(2, 1, totalColumns, SCHOOL_ADDRESS, addressStyle, 24);
    mergeRowCells(3, 1, totalColumns, 'ACHIEVEMENT CHART', mainTitleStyle, 28);
    mergeRowCells(4, 1, totalColumns, String(batchInfo.qualification_name || exportTitle || 'Qualification').toUpperCase(), qualificationStyle, 28);
    mergeRowCells(5, 1, totalColumns, `TRAINING DURATION: ${String(batchInfo.duration || 'N/A').toUpperCase()}`, durationStyle, 24);
    mergeRowCells(
        6,
        1,
        totalColumns,
        `BATCH: ${batchInfo.batch_name || 'N/A'}     TRAINER: ${batchInfo.trainer_name || 'N/A'}     DATE STARTED: ${formatDisplayDate(batchInfo.start_date)}     DATE FINISHED: ${formatDisplayDate(batchInfo.end_date)}`,
        metaStyle,
        20
    );
    mergeRowCells(7, 1, totalColumns, '', blankStyle, 8);

    const schoolLogoId = await addWorkbookImageFromUrl(
        workbook,
        `${window.location.origin}/Hohoo-ville/Hoho-logo.png`
    );
    const tesdaLogoId = await addWorkbookImageFromUrl(
        workbook,
        `${window.location.origin}/Hohoo-ville/Tesda-Logo.png`
    );

    const headerCenterColumn = Math.max(8, Math.floor(totalColumns / 2));
    const leftLogoStartColumn = Math.max(3.25, headerCenterColumn - 7.4);
    const rightLogoStartColumn = Math.min(totalColumns - 4.1, headerCenterColumn + 4.9);

    if (schoolLogoId !== null && schoolLogoId !== undefined) {
        worksheet.addImage(schoolLogoId, {
            tl: { col: leftLogoStartColumn, row: 0.16 },
            ext: { width: 72, height: 72 },
            editAs: 'oneCell'
        });
    }

    if (tesdaLogoId !== null && tesdaLogoId !== undefined) {
        worksheet.addImage(tesdaLogoId, {
            tl: { col: rightLogoStartColumn, row: 0.16 },
            ext: { width: 72, height: 72 },
            editAs: 'oneCell'
        });
    }

    mergeRowCells(8, 1, 2, '', blankStyle, 22);
    let currentColumn = 3;
    groupedCompetencies.forEach((group) => {
        const groupEndColumn = currentColumn + group.columnSpan - 1;
        mergeRowCells(8, currentColumn, groupEndColumn, group.label.toUpperCase(), sectionStyles[group.type], 22);
        currentColumn = groupEndColumn + 1;
    });

    applyStyle(worksheet.getCell(9, 1), blankStyle);
    applyStyle(worksheet.getCell(9, 2), blankStyle);
    worksheet.getRow(9).height = 22;
    currentColumn = 3;
    groupedCompetencies.forEach((group) => {
        group.modules.forEach((module) => {
            const moduleEndColumn = currentColumn + module.outcomes.length - 1;
            mergeRowCells(9, currentColumn, moduleEndColumn, String(module.title || '').toUpperCase(), moduleStyle, 22);
            currentColumn = moduleEndColumn + 1;
        });
    });

    worksheet.getRow(10).height = 118;
    worksheet.getCell(10, 1).value = 'NO.';
    applyStyle(worksheet.getCell(10, 1), noHeaderStyle);
    worksheet.getCell(10, 2).value = 'Name of Trainee';
    applyStyle(worksheet.getCell(10, 2), nameHeaderStyle);

    currentColumn = 3;
    groupedCompetencies.forEach((group) => {
        group.modules.forEach((module) => {
            module.outcomes.forEach((outcome, outcomeIndex) => {
                const cell = worksheet.getCell(10, currentColumn);
                cell.value = formatOutcomeLabel(outcome.outcome_title, outcomeIndex + 1);
                applyStyle(cell, outcomeStyle);
                currentColumn += 1;
            });
        });
    });

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const worksheetRow = worksheet.getRow(11 + rowIndex);
        const trainee = trainees[rowIndex] || null;
        worksheetRow.height = 22;

        const noCell = worksheet.getCell(11 + rowIndex, 1);
        noCell.value = rowIndex + 1;
        applyStyle(noCell, noDataStyle);

        const nameCell = worksheet.getCell(11 + rowIndex, 2);
        nameCell.value = trainee ? trainee.full_name || '' : '';
        applyStyle(nameCell, nameDataStyle);

        currentColumn = 3;
        groupedCompetencies.forEach((group) => {
            group.modules.forEach((module) => {
                module.outcomes.forEach((outcome) => {
                    const mark = trainee
                        ? completionLookup.get(`${trainee.trainee_id}:${outcome.outcome_id}`) || ''
                        : '';
                    const normalizedMark = normalizeMark(mark);
                    const cell = worksheet.getCell(11 + rowIndex, currentColumn);
                    cell.value = formatExcelMark(normalizedMark);
                    if (normalizedMark === CHECK_MARK) {
                        applyStyle(cell, checkCellStyle);
                    } else if (normalizedMark === 'IP') {
                        applyStyle(cell, ipCellStyle);
                    } else if (normalizedMark === 'NYC') {
                        applyStyle(cell, nycCellStyle);
                    } else {
                        applyStyle(cell, markCellStyle);
                    }
                    currentColumn += 1;
                });
            });
        });
    }

    mergeRowCells(
        11 + rowCount,
        1,
        totalColumns,
        `Legend: ${CHECK_MARK} = Competent    NYC = Not Yet Competent    IP = In Progress`,
        legendStyle,
        22
    );

    return workbook;
}

function buildTesdaAchievementChartHtml(data, markOverrides = null) {
    const trainees = sortTraineesAlphabetically(Array.isArray(data.trainees) ? data.trainees : []);
    const outcomes = Array.isArray(data.outcomes) ? data.outcomes : [];
    const completionStatus = Array.isArray(data.completion_status) ? data.completion_status : [];
    const allOutcomesCompleted = new Set(Array.isArray(data.all_outcomes_completed) ? data.all_outcomes_completed.map(String) : []);
    const batchInfo = data.batch_info || {};

    const groupedCompetencies = buildCompetencyGroups(outcomes);
    const totalOutcomeCount = groupedCompetencies.reduce((count, group) => (
        count + group.modules.reduce((moduleCount, module) => moduleCount + module.outcomes.length, 0)
    ), 0);
    const totalColumns = totalOutcomeCount + 2;
    const completionLookup = markOverrides instanceof Map
        ? markOverrides
        : buildCompletionLookup(completionStatus);

    let html = `
        <div class="tesda-export-wrap">
            <table class="tesda-table tesda-export-table">
                <thead>
                    <tr class="tesda-title-row">
                        <th colspan="${totalColumns}">${escapeHtml(String(SCHOOL_NAME).toUpperCase())}</th>
                    </tr>
                    <tr class="tesda-address-row">
                        <th colspan="${totalColumns}">${escapeHtml(SCHOOL_ADDRESS)}</th>
                    </tr>
                    <tr class="tesda-main-title-row">
                        <th colspan="${totalColumns}">ACHIEVEMENT CHART</th>
                    </tr>
                    <tr class="tesda-export-qualification-row">
                        <th colspan="${totalColumns}">${escapeHtml(String(batchInfo.qualification_name || 'Qualification').toUpperCase())}</th>
                    </tr>
                    <tr class="tesda-export-duration-row">
                        <th colspan="${totalColumns}">TRAINING DURATION: ${escapeHtml(String(batchInfo.duration || 'N/A').toUpperCase())}</th>
                    </tr>
                    <tr class="tesda-meta-row">
                        <th colspan="${totalColumns}">
                            <div class="tesda-meta-grid">
                                <span><strong>Batch:</strong> ${escapeHtml(batchInfo.batch_name || 'N/A')}</span>
                                <span><strong>Trainer:</strong> ${escapeHtml(batchInfo.trainer_name || 'N/A')}</span>
                                <span><strong>Date Started:</strong> ${escapeHtml(formatDisplayDate(batchInfo.start_date))}</span>
                                <span><strong>Date Finished:</strong> ${escapeHtml(formatDisplayDate(batchInfo.end_date))}</span>
                            </div>
                        </th>
                    </tr>
                    <tr class="tesda-export-spacer-row">
                        <th colspan="${totalColumns}"></th>
                    </tr>
                    <tr class="tesda-export-section-row">
                        <th colspan="2" class="tesda-export-corner"></th>
    `;

    groupedCompetencies.forEach((group) => {
        html += `<th colspan="${group.columnSpan}" class="tesda-export-section tesda-export-section-${group.type}">${escapeHtml(group.label.toUpperCase())}</th>`;
    });

    html += '</tr><tr class="tesda-export-diagonal-row">';
    html += '<th class="tesda-export-no-heading">NO.</th><th class="tesda-export-name-heading">Name of Trainee</th>';

    groupedCompetencies.forEach((group) => {
        group.modules.forEach((module) => {
            module.outcomes.forEach((outcome, outcomeIndex) => {
                const isFullyCompleted = allOutcomesCompleted.has(String(outcome.outcome_id));
                const ribbonWidth = getModuleRibbonWidth(module.title, module.outcomes.length);
                const ribbonFontSize = getModuleRibbonFontSize(module.title);
                const ribbonHtml = outcomeIndex === 0
                    ? `<span class="tesda-export-module-ribbon tesda-export-module-ribbon-${group.type}" style="width:${ribbonWidth}px;font-size:${ribbonFontSize}px;">${escapeHtml(String(module.title || '').toUpperCase())}</span>`
                    : '';

                html += `
                    <th class="tesda-export-diag-cell tesda-export-diag-cell-${group.type}${isFullyCompleted ? ' tesda-export-diag-cell-complete' : ''}" title="${escapeHtml(outcome.outcome_title)}">
                        ${ribbonHtml}
                        <span class="tesda-export-diag-label">${escapeHtml(formatOutcomeLabel(outcome.outcome_title, outcomeIndex + 1))}</span>
                    </th>
                `;
            });
        });
    });
    html += '</tr></thead><tbody>';

    const rowCount = Math.max(trainees.length, 25);
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const trainee = trainees[rowIndex] || null;
        html += `
            <tr${trainee ? ` data-trainee-id="${trainee.trainee_id}"` : ''}>
                <td class="tesda-export-no-cell">${rowIndex + 1}</td>
                <td class="tesda-export-name-cell">${trainee ? escapeHtml(trainee.full_name || '') : ''}</td>
        `;

        groupedCompetencies.forEach((group) => {
            group.modules.forEach((module) => {
                module.outcomes.forEach((outcome) => {
                    const mark = trainee
                        ? completionLookup.get(`${trainee.trainee_id}:${outcome.outcome_id}`) || ''
                        : '';
                    html += `<td class="tesda-export-mark-cell">${renderExportMark(mark)}</td>`;
                });
            });
        });

        html += '</tr>';
    }

    html += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="${totalColumns}" class="tesda-export-legend-cell">
                            <div class="tesda-legend-grid">
                                <span><strong>Legend:</strong> &#10003; = Competent</span>
                                <span><strong>NYC</strong> = Not Yet Competent</span>
                                <span><strong>IP</strong> = In Progress</span>
                                <span><strong>Prepared By:</strong> ${escapeHtml(batchInfo.trainer_name || 'Trainer')}</span>
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    return html;
}

function buildCompetencyGroups(outcomes) {
    return COMPETENCY_ORDER.reduce((groups, type) => {
        const typeOutcomes = outcomes.filter((outcome) => outcome.competency_type === type);
        if (!typeOutcomes.length) return groups;
        const modules = buildModuleGroups(typeOutcomes, COMPETENCY_LABELS[type]);

        groups.push({
            type,
            label: COMPETENCY_LABELS[type],
            modules,
            columnSpan: modules.reduce((count, module) => count + module.outcomes.length, 0)
        });

        return groups;
    }, []);
}

function buildModuleGroups(outcomes, fallbackLabel) {
    const moduleMap = new Map();

    outcomes.forEach((outcome) => {
        const moduleTitle = getModuleTitle(outcome.module_title, fallbackLabel);
        if (!moduleMap.has(moduleTitle)) {
            moduleMap.set(moduleTitle, []);
        }
        moduleMap.get(moduleTitle).push(outcome);
    });

    return Array.from(moduleMap.entries()).map(([title, moduleOutcomes]) => ({
        title,
        outcomes: moduleOutcomes
    }));
}

function getModuleTitle(moduleTitle, fallbackLabel) {
    const normalizedTitle = String(moduleTitle || '').replace(/\s+/g, ' ').trim();
    if (normalizedTitle) return normalizedTitle;
    return `${fallbackLabel || 'Module'} Module`;
}

function buildCompletionLookup(completionStatus) {
    const completionLookup = new Map();
    completionStatus.forEach((status) => {
        completionLookup.set(`${status.trainee_id}:${status.outcome_id}`, normalizeMark(status.mark));
    });
    return completionLookup;
}

function normalizeMark(mark) {
    const raw = String(mark || '').toUpperCase().trim();
    if (!raw) return '';
    if (raw === 'IP' || raw === 'IN PROGRESS') return 'IP';
    if (raw === 'NYC' || raw === 'NC' || raw === 'NOT YET COMPETENT') return 'NYC';
    if (raw === 'C' || raw === 'CHECK' || raw === 'COMPETENT' || raw === CHECK_MARK || /[\u00E2\u00C3\u0153\u2713]/.test(raw)) return CHECK_MARK;
    return raw;
}

function formatAchievementMark(mark) {
    const normalizedMark = normalizeMark(mark);

    if (normalizedMark === CHECK_MARK) {
        return '<i class="fas fa-check text-emerald-600" aria-label="Competent"></i>';
    }
    if (normalizedMark === 'NYC') {
        return '<span class="font-bold text-rose-600">NYC</span>';
    }
    if (normalizedMark === 'IP') {
        return '<span class="font-bold text-amber-600">IP</span>';
    }

    return escapeHtml(normalizedMark);
}

function formatOutcomeLabel(outcomeTitle, fallbackNumber) {
    const trimmed = String(outcomeTitle || '').trim();
    if (!trimmed) return `LO ${fallbackNumber}`;
    if (/^learning outcome/i.test(trimmed) || /^lo\s*\d+/i.test(trimmed)) return trimmed;
    return `LO ${fallbackNumber}: ${trimmed}`;
}

function renderExportMark(mark) {
    const normalized = normalizeMark(mark);
    if (!normalized) return '';
    if (normalized === CHECK_MARK) return '&#10003;';
    return escapeHtml(normalized);
}

function formatExcelMark(mark) {
    const normalized = normalizeMark(mark);
    if (normalized === CHECK_MARK) return CHECK_MARK;
    return normalized;
}

function getModuleRibbonWidth(title, outcomeCount) {
    const cleanTitle = String(title || '').trim();
    const diagonalCellWidth = 62;
    const horizontalCoverage = (Math.max(Number(outcomeCount) || 1, 1) * diagonalCellWidth) + 28;
    const minimumBySpan = Math.round(horizontalCoverage * Math.SQRT2);
    const minimumByText = cleanTitle.length * 8 + 120;
    return Math.max(minimumBySpan, minimumByText, 180);
}

function getModuleRibbonFontSize(title) {
    const length = String(title || '').trim().length;
    if (length >= 60) return 9;
    if (length >= 42) return 10;
    return 12;
}

function buildDefaultExportTitle(batchInfo = {}) {
    const qualificationName = String(batchInfo.qualification_name || 'TESDA Achievement Chart').trim();
    const batchName = String(batchInfo.batch_name || '').trim();
    const parts = [qualificationName];
    if (batchName) parts.push(batchName);
    parts.push('Achievement Chart');
    return parts.join(' ');
}

function formatDisplayDate(value) {
    if (!value) return 'N/A';
    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getWorksheetName(value) {
    return String(value || 'Achievement Chart')
        .replace(/[\\/?*\[\]:]/g, ' ')
        .trim()
        .slice(0, 31) || 'Achievement Chart';
}

function buildExportHtmlDocument(tableHtml, title) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>
        @page { size: landscape; margin: 0.5in; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 24px;
            color: #0f172a;
            background: #ffffff;
        }
        .tesda-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            background: #ffffff;
        }
        .tesda-table th,
        .tesda-table td {
            border: 1px solid #0f172a;
            padding: 6px;
            text-align: center;
            vertical-align: middle;
            font-size: 11px;
            word-break: break-word;
        }
        .tesda-table .tesda-title-row th,
        .tesda-table .tesda-address-row th,
        .tesda-table .tesda-main-title-row th,
        .tesda-table .tesda-subtitle-row th,
        .tesda-table .tesda-meta-row th {
            background: #ffffff;
        }
        .tesda-table .tesda-title-row th { border-bottom: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.08em; }
        .tesda-table .tesda-address-row th { border-top: 0; border-bottom: 0; font-size: 12px; font-weight: 600; }
        .tesda-table .tesda-main-title-row th { border-top: 0; border-bottom: 0; font-size: 16px; font-weight: 800; letter-spacing: 0.22em; }
        .tesda-table .tesda-subtitle-row th { border-top: 0; font-size: 13px; font-weight: 700; text-transform: uppercase; }
        .tesda-table .tesda-meta-row th { padding: 10px 12px; }
        .tesda-table .tesda-section-basic { background: #dbeafe; color: #1d4ed8; font-weight: 800; text-transform: uppercase; }
        .tesda-table .tesda-section-common { background: #dcfce7; color: #166534; font-weight: 800; text-transform: uppercase; }
        .tesda-table .tesda-section-core { background: #fef3c7; color: #92400e; font-weight: 800; text-transform: uppercase; }
        .tesda-table .tesda-name-cell { text-align: left; font-weight: 700; text-transform: uppercase; }
        .tesda-table .tesda-legend-cell { text-align: left; padding: 10px 12px; background: #ffffff; }
        .tesda-meta-grid,
        .tesda-legend-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 12px 24px;
            justify-content: space-between;
        }
        .tesda-meta-grid span,
        .tesda-legend-grid span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .tesda-export-wrap {
            overflow-x: auto;
            padding: 8px 0;
        }
        .tesda-export-table {
            width: auto;
            min-width: 100%;
            table-layout: fixed;
        }
        .tesda-export-qualification-row th {
            font-size: 16px;
            font-weight: 800;
            color: #b91c1c;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        .tesda-export-duration-row th {
            font-size: 14px;
            font-weight: 800;
            color: #1d4ed8;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            padding-bottom: 12px;
        }
        .tesda-export-spacer-row th {
            height: 110px;
            padding: 0;
            background: #ffffff;
            border-top: 0;
            border-bottom: 1px solid #111827;
        }
        .tesda-export-section-row th,
        .tesda-export-diagonal-row th,
        .tesda-export-diagonal-row td {
            border-color: #111827;
        }
        .tesda-export-corner {
            background: #ffffff;
            min-width: 300px;
        }
        .tesda-export-section {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 7px 8px;
        }
        .tesda-export-section-basic { background: #dbeafe; color: #1d4ed8; }
        .tesda-export-section-common { background: #dcfce7; color: #166534; }
        .tesda-export-section-core { background: #fef3c7; color: #92400e; }
        .tesda-export-no-heading,
        .tesda-export-no-cell {
            width: 48px;
            min-width: 48px;
            font-weight: 700;
        }
        .tesda-export-name-heading,
        .tesda-export-name-cell {
            width: 260px;
            min-width: 260px;
            text-align: left;
            font-weight: 700;
            padding: 6px 8px;
        }
        .tesda-export-name-heading {
            background: #ffffff;
            vertical-align: bottom;
        }
        .tesda-export-name-cell {
            background: #92d050;
        }
        .tesda-export-diag-cell {
            position: relative;
            width: 62px;
            min-width: 62px;
            height: 220px;
            background: linear-gradient(135deg, #ffffff 0 28%, #ffef94 28% 100%);
            vertical-align: bottom;
            overflow: visible;
            padding: 0;
        }
        .tesda-export-diag-cell::before {
            content: "";
            position: absolute;
            left: -28px;
            bottom: 84px;
            width: 170px;
            height: 1px;
            background: #111827;
            transform: rotate(-55deg);
            transform-origin: left center;
        }
        .tesda-export-diag-cell-basic {
            background: linear-gradient(135deg, #ffffff 0 28%, #fff3a6 28% 100%);
        }
        .tesda-export-diag-cell-common {
            background: linear-gradient(135deg, #ffffff 0 28%, #fff3a6 28% 100%);
        }
        .tesda-export-diag-cell-core {
            background: linear-gradient(135deg, #ffffff 0 28%, #fff3a6 28% 100%);
        }
        .tesda-export-diag-cell-complete {
            background: linear-gradient(135deg, #ffffff 0 28%, #dcfce7 28% 100%);
        }
        .tesda-export-diag-label {
            position: absolute;
            left: 10px;
            bottom: 18px;
            width: 190px;
            transform: rotate(-55deg);
            transform-origin: left bottom;
            text-align: left;
            font-size: 11px;
            line-height: 1.18;
            font-weight: 600;
            color: #111827;
            z-index: 2;
        }
        .tesda-export-module-ribbon {
            position: absolute;
            left: -14px;
            top: 78px;
            height: 24px;
            line-height: 24px;
            transform: rotate(-45deg);
            transform-origin: left center;
            color: #ffffff;
            font-weight: 800;
            text-transform: uppercase;
            text-align: center;
            white-space: nowrap;
            z-index: 3;
            box-shadow: 0 0 0 1px #111827 inset;
        }
        .tesda-export-module-ribbon-basic,
        .tesda-export-module-ribbon-common,
        .tesda-export-module-ribbon-core {
            background: #ef1c1c;
        }
        .tesda-export-mark-cell {
            width: 62px;
            min-width: 62px;
            height: 28px;
            font-size: 18px;
            font-weight: 700;
            background: #ffffff;
        }
        .tesda-export-legend-cell {
            text-align: left;
            padding: 12px 14px;
            background: #ffffff;
            font-size: 12px;
        }
    </style>
</head>
<body>
    ${tableHtml}
</body>
</html>`;
}

async function addWorkbookImageFromUrl(workbook, imageUrl) {
    if (!workbook || !imageUrl) return null;

    const cached = exportImageCache.get(imageUrl);
    let imageData = cached;

    if (!imageData) {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
            const blob = await response.blob();
            const base64 = await normalizeImageToWorkbookDataUrl(blob);
            imageData = {
                base64,
                extension: 'png'
            };
            exportImageCache.set(imageUrl, imageData);
        } catch (error) {
            console.warn('Could not load export logo image:', imageUrl, error);
            return null;
        }
    }

    try {
        return workbook.addImage({
            base64: imageData.base64,
            extension: imageData.extension
        });
    } catch (error) {
        console.warn('Could not attach export logo image to workbook:', imageUrl, error);
        return null;
    }
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function normalizeImageToWorkbookDataUrl(blob) {
    const originalDataUrl = await blobToDataUrl(blob);

    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
            const maxSize = 256;
            const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext('2d');
            if (!context) {
                resolve(originalDataUrl);
                return;
            }

            context.clearRect(0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
        };
        image.onerror = () => resolve(originalDataUrl);
        image.src = originalDataUrl;
    });
}

function downloadBlob(blob, filename) {
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
}

function sanitizeFilename(value) {
    return String(value || 'tesda-achievement-chart')
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 120) || 'tesda-achievement-chart';
}

function clearSelectedCell() {
    if (selectedCell) {
        selectedCell.classList.remove('selected-cell');
        selectedCell = null;
    }
    document.querySelectorAll('.selected-cell').forEach((cell) => cell.classList.remove('selected-cell'));
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

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
