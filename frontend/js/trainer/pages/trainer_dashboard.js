const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

document.addEventListener('DOMContentLoaded', async function () {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    initSidebar();
    initUserMenu();
    initLogout();

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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/Hohoo-ville/frontend/login.html';
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
            const tbody = document.getElementById('scheduleTableBody');
            tbody.innerHTML = '';

            if (response.data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-slate-500">No upcoming schedule</td></tr>';
                return;
            }

            response.data.data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm text-slate-700">${item.batch_name || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${item.course_name || 'N/A'}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${item.schedule || 'TBA'}</td>
                    <td class="px-4 py-3 text-sm text-slate-700">${formatRoomValue(item.room)}</td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Schedule Error:', error);
    }
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
                barPercentage: 0.7,
                categoryPercentage: 0.7
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 4, right: 8 } },
            plugins: {
                legend: {
                    labels: { color: '#334155' }
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
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#475569',
                        callback: (value) => `${value}%`
                    },
                    grid: { color: '#e2e8f0' }
                },
                y: {
                    ticks: {
                        color: '#475569',
                        callback: (_value, index) => truncateLabel(chartLabels[index], 48)
                    },
                    grid: { display: false }
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
        return `
            <div class="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                <span class="mt-1 inline-block h-3 w-3 rounded-sm shrink-0" style="background:${colors[index]}"></span>
                <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-700 break-words">${label}</p>
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

function buildPalette(count) {
    const palette = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#1e40af', '#0284c7', '#0ea5e9'];
    return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
}

function formatRoomValue(room) {
    const value = String(room ?? '').trim();
    if (!value || value.toLowerCase() === 'null' || value === '0') {
        return 'TBA';
    }
    return value;
}
