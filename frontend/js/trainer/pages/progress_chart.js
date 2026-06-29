const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const SCHOOL_NAME = 'Hohoo Ville Technical School Inc.';
const SCHOOL_ADDRESS = 'Purok 6A, Poblacion, Lagonglong, Misamis Oriental';
const CHECK_MARK = '\u2713';
const ADMIN_TRAINERS_PAGE = '/Hohoo-ville/frontend/html/admin/pages/view_trainers.html';
const COMPETENCY_ORDER = ['basic', 'common', 'core'];
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

function getRequestedTrainerId() {
    const params = new URLSearchParams(window.location.search);
    const value = Number.parseInt(params.get('trainer_id') || '', 10);
    return Number.isInteger(value) && value > 0 ? value : null;
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

function showAdminAccessBanner(trainerName, hasSelection = true) {
    const banner = document.getElementById('adminAccessBanner');
    const trainerNameEl = document.getElementById('adminAccessTrainerName');
    const noteEl = document.getElementById('adminAccessNote');
    const backLink = document.getElementById('adminAccessBackLink');

    if (!banner) return;
    if (trainerNameEl) trainerNameEl.textContent = trainerName || 'Selected trainer';
    if (noteEl) {
        noteEl.textContent = hasSelection
            ? 'Admin access mode. You can review and edit chart marks for export from here.'
            : 'Open this page from View Trainers to load a trainer chart.';
    }
    if (backLink) backLink.href = ADMIN_TRAINERS_PAGE;

    banner.classList.remove('hidden');
}

async function resolveTrainerContext(user) {
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

    const excelInput = document.getElementById('excelInput');
    const generateLiveChartBtn = document.getElementById('generateLiveChartBtn');
    const generateTemplateBtn = document.getElementById('generateTemplateBtn');
    const exportChartBtn = document.getElementById('exportChartBtn');
    const insertCheckBtn = document.getElementById('insertCheckBtn');
    const insertIpBtn = document.getElementById('insertIpBtn');
    const clearCellBtn = document.getElementById('clearCellBtn');
    const chartTitleInput = document.getElementById('chartTitle');

    if (excelInput) excelInput.addEventListener('change', handleFileUpload);
    if (generateLiveChartBtn) generateLiveChartBtn.addEventListener('click', generateLiveChart);
    if (generateTemplateBtn) generateTemplateBtn.addEventListener('click', generateEIMTemplate);
    if (exportChartBtn) exportChartBtn.addEventListener('click', exportChart);
    if (insertCheckBtn) insertCheckBtn.addEventListener('click', () => insertSymbol(CHECK_MARK));
    if (insertIpBtn) insertIpBtn.addEventListener('click', () => insertSymbol('IP'));
    if (clearCellBtn) clearCellBtn.addEventListener('click', () => insertSymbol(''));
    if (chartTitleInput) chartTitleInput.addEventListener('input', syncRenderedChartTitle);

    document.addEventListener('click', function (event) {
        const cell = event.target.closest('.tesda-table td[contenteditable="true"]');
        if (!cell) return;

        if (selectedCell) selectedCell.classList.remove('selected-cell');
        selectedCell = cell;
        selectedCell.classList.add('selected-cell');
    });

    try {
        const context = await resolveTrainerContext(user);
        if (context?.trainerId) {
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
            select.innerHTML = '<option value="">Select a batch to generate live chart...</option>';
            response.data.data.forEach((batch) => {
                select.innerHTML += `<option value="${batch.batch_id}">${escapeHtml(batch.batch_name)} - ${escapeHtml(batch.course_name)}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Could not load batches.</option>';
        }
    } catch (error) {
        console.error('Error loading batches for chart:', error);
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
            seedDefaultChartTitle(currentLiveChartData?.batch_info || {});
            renderLiveChart(currentLiveChartData);
        } else {
            notify('error', `Error generating chart: ${response.data.message}`);
        }
    } catch (error) {
        console.error('Error generating live chart:', error);
        notify('error', 'An error occurred while generating the live chart.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') {
        notify('error', 'Excel parser library failed to load. Please refresh and try again.');
        return;
    }

    currentLiveChartData = null;
    clearSelectedCell();

    const reader = new FileReader();
    reader.onload = function (loadEvent) {
        const data = new Uint8Array(loadEvent.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const html = XLSX.utils.sheet_to_html(worksheet, { id: 'progressTable', editable: false });
        renderChart(html);
    };
    reader.readAsArrayBuffer(file);
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
            const isReadOnly = cell.dataset.readonly === 'true' || cell.classList.contains('chart-static-cell');
            if (isReadOnly) {
                cell.removeAttribute('contenteditable');
                return;
            }

            const normalizedMark = normalizeMark(cell.innerText.trim());
            if (normalizedMark) {
                cell.innerText = normalizedMark;
            }

            cell.setAttribute('contenteditable', 'true');
            if (cell.classList.contains('progress-mark') || cell.innerText.trim().length <= 3) {
                cell.classList.add('progress-mark');
            }
        });

        table.querySelectorAll('tfoot td').forEach((cell) => {
            cell.dataset.readonly = 'true';
            cell.removeAttribute('contenteditable');
        });
    });

    setupChartTabs();
    syncRenderedChartTitle();
}

function setupChartTabs() {
    const tabButtons = document.querySelectorAll('.chart-tab-btn');
    const panes = document.querySelectorAll('.chart-tab-pane');
    if (!tabButtons.length || !panes.length) return;

    tabButtons.forEach((button) => {
        button.addEventListener('click', function () {
            tabButtons.forEach((btn) => {
                btn.classList.remove('border-blue-500', 'text-blue-700', 'bg-blue-50');
                btn.classList.add('border-transparent', 'text-slate-500');
            });
            panes.forEach((pane) => pane.classList.add('hidden'));

            button.classList.remove('border-transparent', 'text-slate-500');
            button.classList.add('border-blue-500', 'text-blue-700', 'bg-blue-50');

            const target = document.getElementById(button.dataset.target);
            if (target) target.classList.remove('hidden');
        });
    });
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
    if (!data || typeof data !== 'object') {
        document.getElementById('chartContainer').innerHTML =
            '<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Invalid chart data received.</div>';
        return;
    }

    const trainees = sortTraineesAlphabetically(Array.isArray(data.trainees) ? data.trainees : []);
    const outcomes = Array.isArray(data.outcomes) ? data.outcomes : [];
    if (!trainees.length || !outcomes.length) {
        document.getElementById('chartContainer').innerHTML =
            '<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Not enough data to generate a chart.</div>';
        return;
    }

    renderChart(buildTabbedProgressChartHtml(data));
}

function buildTabbedProgressChartHtml(data) {
    const trainees = sortTraineesAlphabetically(Array.isArray(data.trainees) ? data.trainees : []);
    const outcomes = Array.isArray(data.outcomes) ? data.outcomes : [];
    const completionStatus = Array.isArray(data.completion_status) ? data.completion_status : [];
    const allOutcomesCompleted = Array.isArray(data.all_outcomes_completed) ? data.all_outcomes_completed : [];

    const tabs = [
        { type: 'core', label: 'Core Competencies', active: true, paneId: 'core-pane' },
        { type: 'common', label: 'Common Competencies', active: false, paneId: 'common-pane' },
        { type: 'basic', label: 'Basic Competencies', active: false, paneId: 'basic-pane' }
    ];

    const tabButtonsHtml = tabs.map((tab) => `
        <button
            type="button"
            class="chart-tab-btn rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold ${tab.active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-transparent text-slate-500'}"
            data-target="${tab.paneId}"
        >
            ${escapeHtml(tab.label)}
        </button>
    `).join('');

    const paneHtml = tabs.map((tab) => `
        <div id="${tab.paneId}" class="chart-tab-pane${tab.active ? '' : ' hidden'}">
            ${buildSingleCompetencyTableHtml(tab.type, trainees, outcomes, completionStatus, allOutcomesCompleted)}
        </div>
    `).join('');

    return `
        <div class="mb-4 border-b border-slate-200">
            <nav class="-mb-px flex flex-wrap gap-2">
                ${tabButtonsHtml}
            </nav>
        </div>
        ${paneHtml}
    `;
}

function buildSingleCompetencyTableHtml(type, trainees, outcomes, completionStatus, allOutcomesCompleted) {
    const typeOutcomes = outcomes.filter((outcome) => outcome.competency_type === type);
    if (!typeOutcomes.length) {
        return `<div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">No ${escapeHtml(type)} competencies found for this qualification.</div>`;
    }

    const completionLookup = new Map();
    completionStatus.forEach((status) => {
        completionLookup.set(`${status.trainee_id}:${status.outcome_id}`, normalizeMark(status.mark));
    });
    const allCompletedSet = new Set(allOutcomesCompleted.map(String));
    const modules = buildModuleGroups(typeOutcomes, COMPETENCY_LABELS[type]);
    let headerRow1 = '<tr><th rowspan="2" style="width: 52px; min-width: 52px;">NO.</th><th rowspan="2" style="width: 240px; min-width: 240px;">NAME OF TRAINEE</th>';
    modules.forEach((module) => {
        headerRow1 += `<th colspan="${module.outcomes.length}">${escapeHtml(module.title)}</th>`;
    });
    headerRow1 += '</tr>';

    let headerRow2 = '<tr>';
    modules.forEach((module) => {
        module.outcomes.forEach((outcome, outcomeIndex) => {
            const isCompleted = allCompletedSet.has(String(outcome.outcome_id));
            const highlightStyle = isCompleted ? 'background-color:#16a34a;color:#fff;' : '';
            headerRow2 += `<th style="min-width: 140px;${highlightStyle}" title="${escapeHtml(outcome.outcome_title || '')}">${escapeHtml(formatOutcomeLabel(outcome.outcome_title, outcomeIndex + 1))}</th>`;
        });
    });
    headerRow2 += '</tr>';

    let bodyRows = '';
    trainees.forEach((trainee, index) => {
        bodyRows += `<tr><td class="chart-static-cell" data-readonly="true">${index + 1}</td><td class="chart-static-cell" data-readonly="true" style="text-align:left;">${escapeHtml(trainee.full_name || '')}</td>`;
        modules.forEach((module) => {
            module.outcomes.forEach((outcome) => {
                const mark = completionLookup.get(`${trainee.trainee_id}:${outcome.outcome_id}`) || '';
                bodyRows += `<td class="progress-mark" data-outcome-id="${outcome.outcome_id}" data-trainee-id="${trainee.trainee_id}">${escapeHtml(mark)}</td>`;
            });
        });
        bodyRows += '</tr>';
    });

    return `<div class="overflow-x-auto"><table class="tesda-table"><thead>${headerRow1}${headerRow2}</thead><tbody>${bodyRows}</tbody></table></div>`;
}

function buildTesdaProgressChartHtml(data, markOverrides = null) {
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
            <table class="tesda-table tesda-export-table" id="progressTable">
                <thead>
                    <tr class="tesda-title-row">
                        <th colspan="${totalColumns}">${escapeHtml(String(SCHOOL_NAME).toUpperCase())}</th>
                    </tr>
                    <tr class="tesda-address-row">
                        <th colspan="${totalColumns}">${escapeHtml(SCHOOL_ADDRESS)}</th>
                    </tr>
                    <tr class="tesda-main-title-row">
                        <th colspan="${totalColumns}">PROGRESS CHART</th>
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
                <td class="tesda-export-no-cell" data-readonly="true">${rowIndex + 1}</td>
                <td class="tesda-export-name-cell" data-readonly="true">${trainee ? escapeHtml(trainee.full_name || '') : ''}</td>
        `;

        groupedCompetencies.forEach((group) => {
            group.modules.forEach((module) => {
                module.outcomes.forEach((outcome) => {
                    const mark = trainee
                        ? completionLookup.get(`${trainee.trainee_id}:${outcome.outcome_id}`) || ''
                        : '';
                    html += `
                        <td class="tesda-export-mark-cell" data-outcome-id="${outcome.outcome_id}"${trainee ? ` data-trainee-id="${trainee.trainee_id}"` : ''}>${renderExportMark(mark)}</td>
                    `;
                });
            });
        });

        html += '</tr>';
    }

    html += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="${totalColumns}" class="tesda-export-legend-cell" data-readonly="true">
                            <div class="tesda-legend-grid">
                                <span><strong>Legend:</strong> &#10003; = Completed</span>
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

function renderExportMark(mark) {
    const normalized = normalizeMark(mark);
    if (!normalized) return '';
    if (normalized === CHECK_MARK) return '&#10003;';
    return escapeHtml(normalized);
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

function formatOutcomeLabel(outcomeTitle, fallbackNumber) {
    const trimmed = String(outcomeTitle || '').trim();
    if (!trimmed) return `LO ${fallbackNumber}`;
    if (/^learning outcome/i.test(trimmed) || /^lo\s*\d+/i.test(trimmed)) return trimmed;
    return `LO ${fallbackNumber}: ${trimmed}`;
}

function seedDefaultChartTitle(batchInfo) {
    const chartTitleInput = document.getElementById('chartTitle');
    if (!chartTitleInput || chartTitleInput.value.trim()) return;
    chartTitleInput.value = buildDefaultDisplayTitle(batchInfo);
}

function getRenderedChartHeading(batchInfo = {}) {
    const customTitle = document.getElementById('chartTitle')?.value.trim();
    if (customTitle) return customTitle.toUpperCase();
    return buildDefaultDisplayTitle(batchInfo).toUpperCase();
}

function buildDefaultDisplayTitle(batchInfo = {}) {
    const qualificationName = String(batchInfo.qualification_name || 'Qualification').trim();
    const duration = String(batchInfo.duration || '').trim();
    const batchName = String(batchInfo.batch_name || '').trim();
    const headingParts = [`${qualificationName}${duration ? ` (${duration})` : ''}`];
    if (batchName) headingParts.push(batchName);
    return headingParts.join(' - ');
}

function buildDefaultExportTitle(batchInfo = {}) {
    const qualificationName = String(batchInfo.qualification_name || 'TESDA Progress Chart').trim();
    const batchName = String(batchInfo.batch_name || '').trim();
    const parts = [qualificationName];
    if (batchName) parts.push(batchName);
    parts.push('Progress Chart');
    return parts.join(' ');
}

function syncRenderedChartTitle() {
    const subtitleCell = document.querySelector('[data-chart-title-subtitle="true"]');
    if (!subtitleCell || !currentLiveChartData) return;
    subtitleCell.textContent = getRenderedChartHeading(currentLiveChartData.batch_info || {});
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

function normalizeMark(mark) {
    const raw = String(mark || '').toUpperCase();
    if (!raw) return '';
    if (raw.includes('IP')) return 'IP';
    if (raw === 'C' || raw === 'CHECK' || raw === CHECK_MARK || /[\u00E2\u00C3\u0153\u2713]/.test(raw)) return CHECK_MARK;
    return raw;
}

function generateEIMTemplate() {
    currentLiveChartData = {
        batch_info: {
            qualification_name: 'Electrical Installation and Maintenance NC II',
            batch_name: 'Sample Batch',
            duration: '196 Hours',
            trainer_name: document.getElementById('trainerName')?.textContent || 'Trainer',
            start_date: '',
            end_date: ''
        },
        trainees: [],
        outcomes: [
            { outcome_id: 'b1', outcome_title: 'Participate in workplace communication', module_title: 'Participate in Workplace Communication', competency_type: 'basic' },
            { outcome_id: 'b2', outcome_title: 'Work in team environment', module_title: 'Work in Team Environment', competency_type: 'basic' },
            { outcome_id: 'c1', outcome_title: 'Use hand tools', module_title: 'Use Hand Tools', competency_type: 'common' },
            { outcome_id: 'c2', outcome_title: 'Perform mensuration and calculation', module_title: 'Perform Mensuration and Calculation', competency_type: 'common' },
            { outcome_id: 'r1', outcome_title: 'Perform roughing-in activities', module_title: 'Perform Roughing-in Activities', competency_type: 'core' },
            { outcome_id: 'r2', outcome_title: 'Install electrical protective devices', module_title: 'Install Electrical Protective Devices', competency_type: 'core' },
            { outcome_id: 'r3', outcome_title: 'Install wiring devices', module_title: 'Install Wiring Devices', competency_type: 'core' }
        ],
        completion_status: [],
        all_outcomes_completed: []
    };

    seedDefaultChartTitle(currentLiveChartData.batch_info);
    renderChart(buildTabbedProgressChartHtml(currentLiveChartData));
}

function insertSymbol(symbol) {
    if (!selectedCell) {
        notify('info', 'Please click a progress cell in the table first.');
        return;
    }
    selectedCell.innerText = symbol;
}

async function exportChart() {
    const chartContainer = document.getElementById('chartContainer');
    const sourceTable = chartContainer?.querySelector('table');
    if (!sourceTable) {
        notify('warning', 'Please generate or import a chart first.');
        return;
    }

    const exportTitle = document.getElementById('chartTitle')?.value.trim()
        || buildDefaultExportTitle(currentLiveChartData?.batch_info || {});

    if (currentLiveChartData) {
        const excelJsReady = await ensureExcelJs();
        if (excelJsReady && typeof window.ExcelJS !== 'undefined') {
            try {
                const workbook = await buildExcelJsProgressChart(currentLiveChartData, collectCurrentChartMarks(), exportTitle);
                const workbookBuffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob(
                    [workbookBuffer],
                    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                );
                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `${sanitizeFilename(exportTitle || 'tesda-progress-chart')}.xlsx`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(downloadUrl);

                notify('success', 'Excel workbook exported successfully.');
                return;
            } catch (error) {
                console.error('Error exporting XLSX workbook:', error);
                notify('warning', 'Real XLSX export failed, so the chart will fall back to the legacy Excel XML format.');
            }
        } else {
            notify('warning', 'Excel workbook support is unavailable right now, so the chart will fall back to the legacy Excel XML format.');
        }

        const workbookXml = buildExcelXmlProgressChart(currentLiveChartData, collectCurrentChartMarks(), exportTitle);
        const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${sanitizeFilename(exportTitle || 'tesda-progress-chart')}.xml`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);

        notify('success', 'Legacy Excel XML chart exported successfully.');
        return;
    }

    let exportTableMarkup = sourceTable.outerHTML;
    const exportWrapper = document.createElement('div');
    exportWrapper.innerHTML = exportTableMarkup;
    const clonedTable = exportWrapper.querySelector('table');
    if (!clonedTable) {
        notify('error', 'Could not prepare the chart for export.');
        return;
    }

    clonedTable.querySelectorAll('[contenteditable]').forEach((cell) => cell.removeAttribute('contenteditable'));
    clonedTable.querySelectorAll('.selected-cell').forEach((cell) => cell.classList.remove('selected-cell'));
    const htmlDocument = buildExportHtmlDocument(clonedTable.outerHTML, exportTitle);

    const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${sanitizeFilename(exportTitle || 'tesda-progress-chart')}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);

    notify('success', 'Chart exported successfully.');
}

async function buildExcelJsProgressChart(data, markOverrides, exportTitle) {
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
        getWorksheetName(exportTitle || batchInfo.qualification_name || 'Progress Chart')
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

    const legendStyle = {
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
        font: { name: 'Arial', size: 10, bold: true },
        border: thinBorder
    };

    mergeRowCells(1, 1, totalColumns, String(SCHOOL_NAME).toUpperCase(), titleStyle, 34);
    mergeRowCells(2, 1, totalColumns, SCHOOL_ADDRESS, addressStyle, 24);
    mergeRowCells(3, 1, totalColumns, 'PROGRESS CHART', mainTitleStyle, 28);
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
        `Legend: ${CHECK_MARK} = Completed    IP = In Progress`,
        legendStyle,
        22
    );

    return workbook;
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

function buildExcelXmlProgressChart(data, markOverrides, exportTitle) {
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

    let xml = [
        '<?xml version="1.0"?>',
        '<?mso-application progid="Excel.Sheet"?>',
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
        ' xmlns:o="urn:schemas-microsoft-com:office:office"',
        ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
        ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
        ' xmlns:html="http://www.w3.org/TR/REC-html40">',
        buildExcelXmlStyles(),
        `<Worksheet ss:Name="${escapeXml(getWorksheetName(exportTitle || batchInfo.qualification_name || 'Progress Chart'))}">`,
        `<Table ss:ExpandedColumnCount="${totalColumns}" ss:ExpandedRowCount="${rowCount + 11}" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="20">`,
        '<Column ss:Width="28"/>',
        '<Column ss:Width="210"/>'
    ];

    for (let index = 0; index < totalOutcomeCount; index += 1) {
        xml.push('<Column ss:Width="56"/>');
    }

    xml.push(buildMergedTextRow(String(SCHOOL_NAME).toUpperCase(), totalColumns, 'TitleRow', 28));
    xml.push(buildMergedTextRow(SCHOOL_ADDRESS, totalColumns, 'AddressRow', 20));
    xml.push(buildMergedTextRow('PROGRESS CHART', totalColumns, 'MainTitleRow', 24));
    xml.push(buildMergedTextRow(String(batchInfo.qualification_name || exportTitle || 'Qualification').toUpperCase(), totalColumns, 'QualificationRow', 24));
    xml.push(buildMergedTextRow(`TRAINING DURATION: ${String(batchInfo.duration || 'N/A').toUpperCase()}`, totalColumns, 'DurationRow', 20));
    xml.push(buildMergedTextRow(`BATCH: ${batchInfo.batch_name || 'N/A'}     TRAINER: ${batchInfo.trainer_name || 'N/A'}     DATE STARTED: ${formatDisplayDate(batchInfo.start_date)}     DATE FINISHED: ${formatDisplayDate(batchInfo.end_date)}`, totalColumns, 'MetaTextRow', 20));
    xml.push('<Row ss:Height="8"><Cell ss:MergeAcross="' + (totalColumns - 1) + '" ss:StyleID="BlankCell"><Data ss:Type="String"></Data></Cell></Row>');

    xml.push('<Row ss:Height="22">');
    xml.push('<Cell ss:MergeAcross="1" ss:StyleID="BlankCell"><Data ss:Type="String"></Data></Cell>');
    groupedCompetencies.forEach((group) => {
        xml.push(`<Cell ss:MergeAcross="${group.columnSpan - 1}" ss:StyleID="${getExcelSectionStyle(group.type)}"><Data ss:Type="String">${escapeXml(group.label.toUpperCase())}</Data></Cell>`);
    });
    xml.push('</Row>');

    xml.push('<Row ss:Height="22">');
    xml.push('<Cell ss:StyleID="BlankCell"><Data ss:Type="String"></Data></Cell>');
    xml.push('<Cell ss:StyleID="BlankCell"><Data ss:Type="String"></Data></Cell>');
    groupedCompetencies.forEach((group) => {
        group.modules.forEach((module) => {
            xml.push(`<Cell ss:MergeAcross="${module.outcomes.length - 1}" ss:StyleID="${getExcelModuleStyle(group.type)}"><Data ss:Type="String">${escapeXml(String(module.title || '').toUpperCase())}</Data></Cell>`);
        });
    });
    xml.push('</Row>');

    xml.push('<Row ss:Height="118">');
    xml.push('<Cell ss:StyleID="NoHeaderCell"><Data ss:Type="String">NO.</Data></Cell>');
    xml.push('<Cell ss:StyleID="NameHeaderCell"><Data ss:Type="String">Name of Trainee</Data></Cell>');
    groupedCompetencies.forEach((group) => {
        group.modules.forEach((module) => {
            module.outcomes.forEach((outcome, outcomeIndex) => {
                const styleId = getExcelOutcomeStyle(group.type);
                xml.push(`<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(formatOutcomeLabel(outcome.outcome_title, outcomeIndex + 1))}</Data></Cell>`);
            });
        });
    });
    xml.push('</Row>');

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const trainee = trainees[rowIndex] || null;
        xml.push('<Row ss:Height="22">');
        xml.push(`<Cell ss:StyleID="NoDataCell"><Data ss:Type="Number">${rowIndex + 1}</Data></Cell>`);
        xml.push(`<Cell ss:StyleID="NameDataCell"><Data ss:Type="String">${escapeXml(trainee ? trainee.full_name || '' : '')}</Data></Cell>`);

        groupedCompetencies.forEach((group) => {
            group.modules.forEach((module) => {
                module.outcomes.forEach((outcome) => {
                    const mark = trainee
                        ? completionLookup.get(`${trainee.trainee_id}:${outcome.outcome_id}`) || ''
                        : '';
                    const styleId = getExcelMarkStyle(mark);
                    xml.push(`<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(formatExcelMark(mark))}</Data></Cell>`);
                });
            });
        });

        xml.push('</Row>');
    }

    xml.push(buildMergedTextRow(`Legend: ${CHECK_MARK} = Completed    IP = In Progress`, totalColumns, 'LegendRow', 22));
    xml.push('</Table>');
    xml.push('<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">');
    xml.push('<PageSetup><Layout x:Orientation="Landscape"/></PageSetup>');
    xml.push('<FitToPage/>');
    xml.push('<Print><ValidPrinterInfo/></Print>');
    xml.push('<Selected/>');
    xml.push('<Panes><Pane><Number>3</Number><ActiveRow>10</ActiveRow><ActiveCol>2</ActiveCol></Pane></Panes>');
    xml.push('<ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios>');
    xml.push('</WorksheetOptions>');
    xml.push('</Worksheet></Workbook>');

    return xml.join('');
}

function buildExcelXmlStyles() {
    return `
<Styles>
    <Style ss:ID="Default" ss:Name="Normal">
        <Alignment ss:Vertical="Center"/>
        <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
        </Borders>
        <Font ss:FontName="Arial" ss:Size="10"/>
    </Style>
    <Style ss:ID="BlankCell">
        <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
        </Borders>
    </Style>
    <Style ss:ID="TitleRow">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="16" ss:Bold="1"/>
    </Style>
    <Style ss:ID="AddressRow">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="10"/>
    </Style>
    <Style ss:ID="MainTitleRow">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="14" ss:Bold="1" ss:Color="#1F4E79"/>
    </Style>
    <Style ss:ID="QualificationRow">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="14" ss:Bold="1" ss:Color="#C00000"/>
    </Style>
    <Style ss:ID="DurationRow">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#1F4E79" ss:Italic="1"/>
    </Style>
    <Style ss:ID="MetaTextRow">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
        <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
    </Style>
    <Style ss:ID="SectionBasic">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#1D4ED8"/>
        <Interior ss:Color="#DCEBFA" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="SectionCommon">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#166534"/>
        <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="SectionCore">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#92400E"/>
        <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="ModuleRibbonBasic">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="0" ss:ShrinkToFit="1"/>
        <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
        </Borders>
        <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
        <Interior ss:Color="#EF1C1C" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="ModuleRibbonCommon">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="0" ss:ShrinkToFit="1"/>
        <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
        </Borders>
        <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
        <Interior ss:Color="#EF1C1C" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="ModuleRibbonCore">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="0" ss:ShrinkToFit="1"/>
        <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
        </Borders>
        <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
        <Interior ss:Color="#EF1C1C" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="OutcomeBasic">
        <Alignment ss:Horizontal="Center" ss:Vertical="Bottom" ss:Rotate="45" ss:WrapText="1"/>
        <Font ss:FontName="Arial" ss:Size="8" ss:Color="#111827"/>
        <Interior ss:Color="#FFF2A8" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="OutcomeCommon">
        <Alignment ss:Horizontal="Center" ss:Vertical="Bottom" ss:Rotate="45" ss:WrapText="1"/>
        <Font ss:FontName="Arial" ss:Size="8" ss:Color="#111827"/>
        <Interior ss:Color="#FFF2A8" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="OutcomeCore">
        <Alignment ss:Horizontal="Center" ss:Vertical="Bottom" ss:Rotate="45" ss:WrapText="1"/>
        <Font ss:FontName="Arial" ss:Size="8" ss:Color="#111827"/>
        <Interior ss:Color="#FFF2A8" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="NoHeaderCell">
        <Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>
        <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
    </Style>
    <Style ss:ID="NameHeaderCell">
        <Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>
        <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
    </Style>
    <Style ss:ID="NoDataCell">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
    </Style>
    <Style ss:ID="NameDataCell">
        <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
        <Interior ss:Color="#92D050" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="MarkCell">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="10"/>
    </Style>
    <Style ss:ID="CheckCell">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1"/>
    </Style>
    <Style ss:ID="IpCell">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#B45309"/>
    </Style>
    <Style ss:ID="LegendRow">
        <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
        <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
    </Style>
</Styles>`;
}

function buildMergedTextRow(text, totalColumns, styleId, height) {
    return `<Row ss:Height="${height}"><Cell ss:MergeAcross="${totalColumns - 1}" ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(text)}</Data></Cell></Row>`;
}

function getExcelSectionStyle(type) {
    if (type === 'basic') return 'SectionBasic';
    if (type === 'common') return 'SectionCommon';
    return 'SectionCore';
}

function getExcelModuleStyle(type) {
    if (type === 'basic') return 'ModuleRibbonBasic';
    if (type === 'common') return 'ModuleRibbonCommon';
    return 'ModuleRibbonCore';
}

function getExcelOutcomeStyle(type) {
    if (type === 'basic') return 'OutcomeBasic';
    if (type === 'common') return 'OutcomeCommon';
    return 'OutcomeCore';
}

function getExcelMarkStyle(mark) {
    const normalized = normalizeMark(mark);
    if (normalized === CHECK_MARK) return 'CheckCell';
    if (normalized === 'IP') return 'IpCell';
    return 'MarkCell';
}

function formatExcelMark(mark) {
    const normalized = normalizeMark(mark);
    if (normalized === CHECK_MARK) return CHECK_MARK;
    return normalized;
}

function getWorksheetName(value) {
    return String(value || 'Progress Chart')
        .replace(/[\\/?*\[\]:]/g, ' ')
        .trim()
        .slice(0, 31) || 'Progress Chart';
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
        .tesda-table .tesda-module-cell { background: #f8fafc; font-size: 10px; font-weight: 700; line-height: 1.3; }
        .tesda-table .tesda-outcome-cell { background: #f8fafc; font-size: 10px; line-height: 1.25; }
        .tesda-table .tesda-outcome-complete { background: #dcfce7; color: #166534; font-weight: 700; }
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

function sanitizeFilename(value) {
    return String(value || 'tesda-progress-chart')
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 120) || 'tesda-progress-chart';
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
