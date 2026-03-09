const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
let selectedCell = null;
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

    const excelInput = document.getElementById('excelInput');
    const generateLiveChartBtn = document.getElementById('generateLiveChartBtn');
    const loadChartBtn = document.getElementById('loadChartBtn');
    const generateTemplateBtn = document.getElementById('generateTemplateBtn');
    const saveChartBtn = document.getElementById('saveChartBtn');
    const insertCheckBtn = document.getElementById('insertCheckBtn');
    const insertIpBtn = document.getElementById('insertIpBtn');
    const clearCellBtn = document.getElementById('clearCellBtn');

    if (excelInput) excelInput.addEventListener('change', handleFileUpload);
    if (generateLiveChartBtn) generateLiveChartBtn.addEventListener('click', generateLiveChart);
    if (loadChartBtn) loadChartBtn.addEventListener('click', loadSelectedChart);
    if (generateTemplateBtn) generateTemplateBtn.addEventListener('click', generateEIMTemplate);
    if (saveChartBtn) saveChartBtn.addEventListener('click', saveChart);
    if (insertCheckBtn) insertCheckBtn.addEventListener('click', () => insertSymbol('C'));
    if (insertIpBtn) insertIpBtn.addEventListener('click', () => insertSymbol('IP'));
    if (clearCellBtn) clearCellBtn.addEventListener('click', () => insertSymbol(''));

    document.addEventListener('click', function (event) {
        const cell = event.target.closest('.tesda-table td');
        if (!cell) return;
        if (selectedCell) selectedCell.classList.remove('selected-cell');
        selectedCell = cell;
        selectedCell.classList.add('selected-cell');
    });

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
            loadSavedChartsList();
            loadBatchesForChart(currentTrainerId);
        } else {
            notify('error', response.data.message || 'Trainer profile not found.');
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
            select.innerHTML = '<option value="">Select a batch to generate live chart...</option>';
            response.data.data.forEach(batch => {
                select.innerHTML += `<option value="${batch.batch_id}">${batch.batch_name} - ${batch.course_name}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Could not load batches.</option>';
        }
    } catch (error) {
        console.error('Error loading batches for chart:', error);
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
        console.error('Error generating live chart:', error);
        notify('error', 'An error occurred while generating the live chart.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

async function loadSavedChartsList() {
    if (!currentTrainerId) return;
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/progress_chart.php?action=list&trainer_id=${currentTrainerId}`);
        const select = document.getElementById('savedChartsSelect');
        if (!select) return;
        select.innerHTML = '<option value="">Load a saved chart...</option>';

        if (response.data.success) {
            response.data.data.forEach(chart => {
                const option = document.createElement('option');
                option.value = chart.chart_id;
                const updatedDate = new Date(chart.updated_at).toLocaleDateString();
                option.textContent = `${chart.title} (Updated: ${updatedDate})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading saved charts list:', error);
    }
}

async function loadSelectedChart() {
    const select = document.getElementById('savedChartsSelect');
    const chartId = select.value;
    if (!chartId) return;

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/progress_chart.php?action=get&id=${chartId}&trainer_id=${currentTrainerId}`);
        if (response.data.success) {
            const chart = response.data.data;
            document.getElementById('chartTitle').value = chart.title || '';
            document.getElementById('currentChartId').value = chart.chart_id || '';
            renderChart(chart.chart_content || '');
            notify('success', `Chart "${chart.title}" loaded successfully.`);
        } else {
            notify('error', response.data.message || 'Could not load chart.');
        }
    } catch (error) {
        console.error('Error loading selected chart:', error);
        notify('error', 'Failed to load the selected chart.');
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') {
        notify('error', 'Excel parser library failed to load. Please refresh and try again.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
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
    container.innerHTML = htmlContent;

    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
        table.classList.add('tesda-table');
        const cells = table.querySelectorAll('td');
        cells.forEach(cell => {
            cell.setAttribute('contenteditable', 'true');
            if (cell.innerText.trim().length <= 3) {
                cell.classList.add('progress-mark');
            }
        });
    });

    setupChartTabs();
}

function setupChartTabs() {
    const tabButtons = document.querySelectorAll('.chart-tab-btn');
    const panes = document.querySelectorAll('.chart-tab-pane');
    if (!tabButtons.length || !panes.length) return;

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            tabButtons.forEach(btn => {
                btn.classList.remove('border-blue-500', 'text-blue-700', 'bg-blue-50');
                btn.classList.add('border-transparent', 'text-slate-500');
            });
            panes.forEach(pane => pane.classList.add('hidden'));

            button.classList.remove('border-transparent', 'text-slate-500');
            button.classList.add('border-blue-500', 'text-blue-700', 'bg-blue-50');

            const target = document.getElementById(button.dataset.target);
            if (target) target.classList.remove('hidden');
        });
    });
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
    const all_outcomes_completed = Array.isArray(data.all_outcomes_completed) ? data.all_outcomes_completed : [];
    if (!trainees || !outcomes || trainees.length === 0 || outcomes.length === 0) {
        document.getElementById('chartContainer').innerHTML =
            '<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Not enough data to generate a chart.</div>';
        return;
    }

    const tabsHtml = `
        <div class="mb-4 border-b border-slate-200">
            <nav class="-mb-px flex flex-wrap gap-2">
                <button type="button" class="chart-tab-btn rounded-t-lg border-b-2 border-blue-500 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700" data-target="core-pane">Core Competencies</button>
                <button type="button" class="chart-tab-btn rounded-t-lg border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-slate-500" data-target="common-pane">Common Competencies</button>
                <button type="button" class="chart-tab-btn rounded-t-lg border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-slate-500" data-target="basic-pane">Basic Competencies</button>
            </nav>
        </div>
        <div id="core-pane" class="chart-tab-pane">${generateTableHtml('core', trainees, outcomes, completion_status, all_outcomes_completed)}</div>
        <div id="common-pane" class="chart-tab-pane hidden">${generateTableHtml('common', trainees, outcomes, completion_status, all_outcomes_completed)}</div>
        <div id="basic-pane" class="chart-tab-pane hidden">${generateTableHtml('basic', trainees, outcomes, completion_status, all_outcomes_completed)}</div>
    `;

    renderChart(tabsHtml);
}

function generateTableHtml(type, trainees, outcomes, completionStatus, allOutcomesCompleted) {
    const typeOutcomes = outcomes.filter(outcome => outcome.competency_type === type);
    if (!typeOutcomes.length) {
        return `<div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">No ${type} competencies found for this qualification.</div>`;
    }

    const modules = typeOutcomes.reduce((acc, outcome) => {
        const moduleTitle = outcome.module_title || 'Uncategorized';
        if (!acc[moduleTitle]) acc[moduleTitle] = [];
        acc[moduleTitle].push(outcome);
        return acc;
    }, {});

    const moduleNames = Object.keys(modules);
    let headerRow1 = `<tr><th rowspan="2">NO.</th><th rowspan="2" style="min-width: 220px;">NAME OF TRAINEE</th>`;
    moduleNames.forEach(moduleName => {
        headerRow1 += `<th colspan="${modules[moduleName].length}">${escapeHtml(moduleName)}</th>`;
    });
    headerRow1 += '</tr>';

    let headerRow2 = '<tr>';
    typeOutcomes.forEach(outcome => {
        const highlight = allOutcomesCompleted.includes(outcome.outcome_id)
            ? 'style="background-color:#16a34a;color:#fff;"'
            : '';
        headerRow2 += `<th ${highlight}>${escapeHtml(outcome.outcome_title)}</th>`;
    });
    headerRow2 += '</tr>';

    let bodyRows = '';
    trainees.forEach((trainee, index) => {
        bodyRows += `<tr><td>${index + 1}</td><td style="text-align:left;">${escapeHtml(trainee.full_name || '')}</td>`;
        typeOutcomes.forEach(outcome => {
            const status = completionStatus.find(s => String(s.trainee_id) === String(trainee.trainee_id) && String(s.outcome_id) === String(outcome.outcome_id));
            const mark = normalizeMark(status ? status.mark : '');
            bodyRows += `<td class="progress-mark">${mark}</td>`;
        });
        bodyRows += '</tr>';
    });

    return `<div class="overflow-x-auto"><table class="tesda-table"><thead>${headerRow1}${headerRow2}</thead><tbody>${bodyRows}</tbody></table></div>`;
}

function normalizeMark(mark) {
    const raw = String(mark || '').toUpperCase();
    if (!raw) return '';
    if (raw.includes('IP')) return 'IP';
    if (raw === 'C' || raw === 'CHECK' || /[\u00E2\u00C3\u0153\u2713]/.test(raw)) return 'C';
    return raw;
}

function generateEIMTemplate() {
    const institution = 'HOHOO-VILLE TRAINING CENTER';
    const address = '123 Tech Street, Innovation City';
    const html = `
        <div class="tesda-header">
            <h3>${institution}</h3>
            <p>${address}</p>
            <h2>ACHIEVEMENT CHART</h2>
            <h3>Electrical Installation and Maintenance (EIM) NC II</h3>
        </div>
        <table class="tesda-table" id="progressTable">
            <thead>
                <tr>
                    <th rowspan="2" style="width: 40px;">NO.</th>
                    <th rowspan="2" style="width: 220px;">NAME OF TRAINEE</th>
                    <th colspan="8">CORE COMPETENCIES</th>
                </tr>
                <tr>
                    <th>Install PVC conduits</th>
                    <th>Install wire ways</th>
                    <th>Cable pulling</th>
                    <th>Wiring layout</th>
                    <th>Install breakers</th>
                    <th>Install fixtures</th>
                    <th>Testing</th>
                    <th>Final check</th>
                </tr>
            </thead>
            <tbody>${generateEmptyRows(12)}</tbody>
        </table>
    `;
    renderChart(html);
}

function generateEmptyRows(count) {
    let rows = '';
    for (let i = 1; i <= count; i++) {
        rows += `
            <tr>
                <td>${i}</td>
                <td style="text-align:left;"></td>
                <td class="progress-mark"></td>
                <td class="progress-mark"></td>
                <td class="progress-mark"></td>
                <td class="progress-mark"></td>
                <td class="progress-mark"></td>
                <td class="progress-mark"></td>
                <td class="progress-mark"></td>
                <td class="progress-mark"></td>
            </tr>
        `;
    }
    return rows;
}

function insertSymbol(symbol) {
    if (!selectedCell) {
        notify('info', 'Please click a cell in the table first.');
        return;
    }
    selectedCell.innerText = symbol;
}

async function saveChart() {
    const container = document.getElementById('chartContainer');
    const title = document.getElementById('chartTitle').value.trim();
    const chartId = document.getElementById('currentChartId').value;

    if (!title) {
        notify('warning', 'Please enter a chart title.');
        return;
    }

    const content = container.innerHTML;
    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainer/progress_chart.php?action=save`, {
            chart_id: chartId,
            title,
            content,
            trainer_id: currentTrainerId
        });

        if (response.data.success) {
            notify('success', 'Chart saved successfully.');
            loadSavedChartsList();
        } else {
            notify('error', response.data.message || 'Failed to save chart.');
        }
    } catch (error) {
        console.error('Error saving chart:', error);
        notify('error', 'Failed to save chart.');
    }
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



