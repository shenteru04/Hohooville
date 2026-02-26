const API_BASE = 'http://localhost/Hohoo-ville/api/role/admin';
const chartStore = {};

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.clear();
            window.location.href = '/hohoo-ville/frontend/login.html';
        });
    }

    const refreshBtn = document.getElementById('refreshAnalytics');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => refreshAnalytics(true));
    }

    refreshAnalytics(false);
});

async function refreshAnalytics(isManual) {
    const refreshBtn = document.getElementById('refreshAnalytics');
    const originalLabel = refreshBtn ? refreshBtn.innerHTML : '';
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1 fa-spin"></i> Refreshing';
    }

    await Promise.all([
        loadOverviewMetrics(),
        loadCompletionRates(),
        loadModulePerformance(),
        loadEnrollmentTrends(),
        loadDropoutAnalysis(),
        loadTrainerPerformance(),
        loadDemographics()
    ]);

    updateLastUpdated();

    if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalLabel;
    }

    if (isManual) {
        const header = document.querySelector('.page-header');
        if (header) header.classList.add('shadow-sm');
        setTimeout(() => {
            if (header) header.classList.remove('shadow-sm');
        }, 800);
    }
}

function updateLastUpdated() {
    const el = document.getElementById('lastUpdated');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function formatNumber(value) {
    if (value === null || value === undefined || value === '') return '-';
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return new Intl.NumberFormat('en-US').format(num);
}

function formatPercent(value, decimals = 1) {
    if (value === null || value === undefined || value === '') return '-';
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return `${num.toFixed(decimals)}%`;
}

function formatScore(value) {
    if (value === null || value === undefined || value === '') return 'N/A';
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return num.toFixed(1);
}

function formatMonthLabel(value) {
    if (!value) return value;
    const parts = String(value).split('-');
    if (parts.length < 2) return value;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthIndex < 0 || monthIndex > 11) return value;
    return `${months[monthIndex]} ${year}`;
}

function setChartOverlay(canvasId, show, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const overlay = container.querySelector('.chart-overlay');
    if (!overlay) return;
    overlay.textContent = message;
    overlay.style.display = show ? 'flex' : 'none';
}

function destroyChart(id) {
    if (chartStore[id]) {
        chartStore[id].destroy();
        delete chartStore[id];
    }
}

function renderChart(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    destroyChart(id);
    chartStore[id] = new Chart(ctx, config);
}

function setTableBody(tbodyId, rowsHtml, emptyMessage) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const table = tbody.closest('table');
    const colCount = table && table.tHead && table.tHead.rows[0] ? table.tHead.rows[0].cells.length : 1;
    if (!rowsHtml) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center text-muted">${emptyMessage}</td></tr>`;
        return;
    }
    tbody.innerHTML = rowsHtml;
}

async function loadOverviewMetrics() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=overview`);
        if (!response.data.success) return;
        const data = response.data.data || {};
        const total = formatNumber(data.total_trainees);
        const completed = formatNumber(data.completed_trainees);
        const passRate = formatPercent(data.average_pass_rate, 1);
        const active = formatNumber(data.active_batches);

        const totalEl = document.getElementById('totalTrainees');
        const completedEl = document.getElementById('completedTrainees');
        const passRateEl = document.getElementById('avgPassRate');
        const activeEl = document.getElementById('activeBatches');

        if (totalEl) totalEl.textContent = total;
        if (completedEl) completedEl.textContent = completed;
        if (passRateEl) passRateEl.textContent = passRate;
        if (activeEl) activeEl.textContent = active;
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

async function loadCompletionRates() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=completion-rates`);
        const data = response.data.success ? response.data.data : [];
        if (!Array.isArray(data) || data.length === 0) {
            destroyChart('completionChart');
            setChartOverlay('completionChart', true, 'No completion data yet.');
            return;
        }
        setChartOverlay('completionChart', false, '');
        const labels = data.map(d => d.qualification_name);
        const values = data.map(d => Number(d.completion_rate || 0));
        renderChart('completionChart', {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Completion Rate (%)',
                    data: values,
                    backgroundColor: 'rgba(78, 115, 223, 0.8)',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: value => `${value}%` } }
                }
            }
        });
    } catch (error) {
        console.error('Error loading completion rates:', error);
        destroyChart('completionChart');
        setChartOverlay('completionChart', true, 'Unable to load completion data.');
    }
}

async function loadModulePerformance() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=module-performance`);
        const data = response.data.success ? response.data.data : [];
        if (!Array.isArray(data) || data.length === 0) {
            destroyChart('moduleChart');
            setChartOverlay('moduleChart', true, 'No module performance data yet.');
            return;
        }
        setChartOverlay('moduleChart', false, '');
        const labels = data.map(d => d.module_title);
        const values = data.map(d => Number(d.competency_rate || 0));
        renderChart('moduleChart', {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Competency Rate (%)',
                    data: values,
                    backgroundColor: 'rgba(28, 200, 138, 0.8)',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: value => `${value}%` } }
                }
            }
        });
    } catch (error) {
        console.error('Error loading module performance:', error);
        destroyChart('moduleChart');
        setChartOverlay('moduleChart', true, 'Unable to load module performance.');
    }
}

async function loadEnrollmentTrends() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=enrollment-trends`);
        const data = response.data.success ? response.data.data : [];
        if (!Array.isArray(data) || data.length === 0) {
            destroyChart('trendChart');
            setChartOverlay('trendChart', true, 'No enrollment trend data yet.');
            return;
        }
        setChartOverlay('trendChart', false, '');
        const labels = data.map(d => formatMonthLabel(d.month));
        const approved = data.map(d => Number(d.approved || 0));
        const pending = data.map(d => Number(d.pending || 0));
        const completed = data.map(d => Number(d.completed || 0));

        renderChart('trendChart', {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Approved',
                        data: approved,
                        borderColor: '#1cc88a',
                        backgroundColor: 'rgba(28, 200, 138, 0.15)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Pending',
                        data: pending,
                        borderColor: '#f6c23e',
                        backgroundColor: 'rgba(246, 194, 62, 0.12)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Completed',
                        data: completed,
                        borderColor: '#4e73df',
                        backgroundColor: 'rgba(78, 115, 223, 0.12)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true } }
            }
        });
    } catch (error) {
        console.error('Error loading enrollment trends:', error);
        destroyChart('trendChart');
        setChartOverlay('trendChart', true, 'Unable to load enrollment trends.');
    }
}

async function loadDropoutAnalysis() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=dropout-analysis`);
        const data = response.data.success ? response.data.data : [];
        if (!Array.isArray(data) || data.length === 0) {
            setTableBody('dropoutTable', '', 'No dropout data available.');
            return;
        }
        const rows = data.map(d => `
            <tr>
                <td>${formatMonthLabel(d.month)}</td>
                <td>${formatNumber(d.enrolled)}</td>
                <td>${formatPercent(d.dropout_rate, 1)}</td>
                <td>${formatNumber(d.completed)}</td>
            </tr>
        `).join('');
        setTableBody('dropoutTable', rows, 'No dropout data available.');
    } catch (error) {
        console.error('Error loading dropout analysis:', error);
        setTableBody('dropoutTable', '', 'Unable to load dropout data.');
    }
}

async function loadTrainerPerformance() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=trainer-performance`);
        const data = response.data.success ? response.data.data : [];
        if (!Array.isArray(data) || data.length === 0) {
            setTableBody('trainerTable', '', 'No trainer performance data available.');
            return;
        }
        const rows = data.map(d => `
            <tr>
                <td>${d.trainer_name || 'Unknown'}</td>
                <td>${formatNumber(d.total_trainees)}</td>
                <td>${formatScore(d.avg_trainee_score)}</td>
                <td>${formatPercent(d.competency_rate || 0, 1)}</td>
            </tr>
        `).join('');
        setTableBody('trainerTable', rows, 'No trainer performance data available.');
    } catch (error) {
        console.error('Error loading trainer performance:', error);
        setTableBody('trainerTable', '', 'Unable to load trainer performance.');
    }
}

async function loadDemographics() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=demographic-analysis`);
        const data = response.data.success ? response.data.data : null;
        if (!data) {
            destroyChart('genderChart');
            destroyChart('batchChart');
            setChartOverlay('genderChart', true, 'No gender data yet.');
            setChartOverlay('batchChart', true, 'No batch distribution data yet.');
            return;
        }

        if (Array.isArray(data.gender) && data.gender.length > 0) {
            setChartOverlay('genderChart', false, '');
            renderChart('genderChart', {
                type: 'doughnut',
                data: {
                    labels: data.gender.map(d => d.sex || 'Unknown'),
                    datasets: [{
                        data: data.gender.map(d => Number(d.count || 0)),
                        backgroundColor: ['#4e73df', '#e83e8c', '#36b9cc', '#f6c23e']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
            });
        } else {
            destroyChart('genderChart');
            setChartOverlay('genderChart', true, 'No gender data yet.');
        }

        if (Array.isArray(data.batches) && data.batches.length > 0) {
            setChartOverlay('batchChart', false, '');
            renderChart('batchChart', {
                type: 'bar',
                data: {
                    labels: data.batches.map(d => d.batch_name),
                    datasets: [{
                        label: 'Trainees',
                        data: data.batches.map(d => Number(d.trainee_count || 0)),
                        backgroundColor: 'rgba(54, 185, 204, 0.8)',
                        borderRadius: 8
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        } else {
            destroyChart('batchChart');
            setChartOverlay('batchChart', true, 'No batch distribution data yet.');
        }
    } catch (error) {
        console.error('Error loading demographics:', error);
        destroyChart('genderChart');
        destroyChart('batchChart');
        setChartOverlay('genderChart', true, 'Unable to load gender data.');
        setChartOverlay('batchChart', true, 'Unable to load batch data.');
    }
}
