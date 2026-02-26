const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const REPORT_LABELS = {
    grading_summary: 'Class Grading Summary',
    attendance_summary: 'Attendance Report',
    competency_status: 'Competency Status (CTPR)'
};

document.addEventListener('DOMContentLoaded', async function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../../../login.html';
        return;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            const trainer = response.data.data;
            if (trainer.first_name && trainer.last_name) {
                const nameEl = document.getElementById('trainerName');
                if (nameEl) nameEl.textContent = `${trainer.first_name} ${trainer.last_name}`;
            }
            loadBatches(trainer.trainer_id);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
    }

    // Inject Sidebar CSS (W3.CSS Reference Style)
    const ms = document.createElement('style');
    ms.innerHTML = `
        #sidebar {
            width: 200px;
            position: fixed;
            z-index: 1050;
            top: 0;
            left: 0;
            height: 100vh;
            overflow-y: auto;
            background-color: #fff;
            box-shadow: 0 2px 5px 0 rgba(0,0,0,0.16), 0 2px 10px 0 rgba(0,0,0,0.12);
            display: block;
        }
        .main-content, #content, .content-wrapper {
            margin-left: 200px !important;
            transition: margin-left .4s;
        }
        #sidebarCloseBtn {
            display: none;
            width: 100%;
            text-align: left;
            padding: 8px 16px;
            background: none;
            border: none;
            font-size: 18px;
        }
        #sidebarCloseBtn:hover { background-color: #ccc; }
        
        @media (max-width: 991.98px) {
            #sidebar { display: none; }
            .main-content, #content, .content-wrapper { margin-left: 0 !important; }
            #sidebarCloseBtn { display: block; }
        }
        .table-responsive, table { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    `;
    document.head.appendChild(ms);

    // Sidebar Logic
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (!document.getElementById('sidebarCloseBtn')) {
            const closeBtn = document.createElement('button');
            closeBtn.id = 'sidebarCloseBtn';
            closeBtn.innerHTML = 'Close &times;';
            closeBtn.className = 'w3-bar-item w3-button w3-hide-large';
            closeBtn.addEventListener('click', () => {
                sidebar.style.display = 'none';
            });
            sidebar.insertBefore(closeBtn, sidebar.firstChild);
        }
    }

    // Open Button Logic
    let sc = document.getElementById('sidebarCollapse');
    if (!sc) {
        const nb = document.querySelector('.navbar');
        if (nb) {
            const c = nb.querySelector('.container-fluid') || nb;
            const b = document.createElement('button');
            b.id = 'sidebarCollapse';
            b.className = 'btn btn-outline-primary me-2 d-lg-none';
            b.type = 'button';
            b.innerHTML = '&#9776;';
            c.insertBefore(b, c.firstChild);
            sc = b;
        }
    }
    if (sc) {
        const nb = sc.cloneNode(true);
        if(sc.parentNode) sc.parentNode.replaceChild(nb, sc);
        nb.addEventListener('click', () => {
            if (sidebar) sidebar.style.display = 'block';
        });
    }

    // Remove Attendance and Grading pages from sidebar
    if (sidebar) {
        const ul = sidebar.querySelector('ul');
        if (ul) {
            ul.innerHTML = '';
            const menuItems = [
                { href: '/Hohoo-ville/frontend/html/trainer/trainer_dashboard.html', icon: 'fas fa-home', text: 'Dashboard' },
                { href: 'my_batches.html', icon: 'fas fa-users', text: 'My Batches' },
                { href: 'modules.html', icon: 'fas fa-book', text: 'Modules' },
                { href: 'progress_chart.html', icon: 'fas fa-chart-line', text: 'Progress Chart' },
                { href: 'achievement_chart.html', icon: 'fas fa-trophy', text: 'Achievement Chart' },
                { href: 'reports.html', icon: 'fas fa-file-alt', text: 'Reports' }
            ];
            const currentPage = window.location.pathname.split('/').pop();
            menuItems.forEach(item => {
                const li = document.createElement('li');
                li.className = 'nav-item mb-1';
                const isActive = currentPage === item.href ? 'active' : '';
                li.innerHTML = `<a class="nav-link ${isActive}" href="${item.href}"><i class="${item.icon} me-2"></i> ${item.text}</a>`;
                ul.appendChild(li);
            });
        }
    }

    document.getElementById('reportForm').addEventListener('submit', function(e) {
        e.preventDefault();
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
                alert('Export is not available.');
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '../../../login.html';
        });
    }
});

async function loadBatches(trainerId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/trainer_dashboard.php?action=schedule&trainer_id=${trainerId}`);
        if (response.data.success) {
            const select = document.getElementById('batchSelect');
            response.data.data.forEach(batch => {
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
        Swal.fire('Missing Input', 'Please select a batch', 'warning');
        return;
    }

    try {
        setLoading(true, 'Generating report...');
        const response = await axios.get(`${API_BASE_URL}/role/trainer/reports.php?action=${type}&batch_id=${batchId}`);
        
        if (response.data.success) {
            renderReport(type, response.data.data);
            setLoading(false, 'Report generated');
        } else {
            Swal.fire('No Data', 'No data found for this report.', 'info');
            renderEmpty();
            setLoading(false, 'No data found');
        }
    } catch (error) {
        console.error('Report Error:', error);
        Swal.fire('Error', 'Failed to generate report', 'error');
        renderEmpty();
        setLoading(false, 'Error generating report');
    }
}

function renderReport(type, data) {
    const container = document.getElementById('reportResult');
    const thead = document.getElementById('reportHead');
    const tbody = document.getElementById('reportBody');
    const reportTitle = document.getElementById('reportTitle');
    const reportTypeLabel = document.getElementById('reportTypeLabel');
    const reportDate = document.getElementById('reportDate');
    const reportBatchName = document.getElementById('reportBatchName');
    const emptyState = document.getElementById('reportEmpty');
    
    container.classList.remove('d-none');
    reportTitle.textContent = `${REPORT_LABELS[type] || 'Report'} Preview`;
    reportTypeLabel.textContent = REPORT_LABELS[type] || 'Report';
    reportDate.textContent = new Date().toLocaleString();
    reportBatchName.textContent = getSelectedBatchLabel();
    tbody.innerHTML = '';
    thead.innerHTML = '';
    if (emptyState) emptyState.classList.add('d-none');

    if (!data || data.length === 0) {
        renderEmpty();
        return;
    }

    if (type === 'grading_summary' || type === 'competency_status') {
        thead.innerHTML = `
            <tr>
                <th>Trainee Name</th>
                <th>Course</th>
                <th>Total Grade</th>
                <th>Status</th>
            </tr>
        `;
        data.forEach(row => {
            tbody.innerHTML += `
                <tr>
                    <td>${row.trainee_name}</td>
                    <td>${row.course_name}</td>
                    <td>${row.total_grade || 'N/A'}</td>
                    <td><span class="badge ${row.total_grade >= 80 ? 'bg-success' : 'bg-warning'}">${row.total_grade >= 80 ? 'Competent' : 'NYC'}</span></td>
                </tr>
            `;
        });
    } else if (type === 'attendance_summary') {
        thead.innerHTML = '<tr><th>Trainee Name</th><th>Present</th><th>Absent</th><th>Late</th><th>Attendance Rate</th></tr>';
        data.forEach(row => {
            const total = parseInt(row.present) + parseInt(row.absent) + parseInt(row.late);
            const rate = total > 0 ? Math.round((row.present / total) * 100) : 0;
            tbody.innerHTML += `
                <tr><td>${row.trainee_name}</td><td>${row.present}</td><td>${row.absent}</td><td>${row.late}</td><td>${rate}%</td></tr>
            `;
        });
    }

    renderSummary(type, data);
}

function renderSummary(type, data) {
    const summary = document.getElementById('reportSummary');
    if (!summary) return;
    summary.classList.remove('d-none');

    const totalEl = document.getElementById('summaryTotal');
    const competentEl = document.getElementById('summaryCompetent');
    const avgEl = document.getElementById('summaryAverage');
    const attendanceEl = document.getElementById('summaryAttendance');

    const total = data.length;
    totalEl.textContent = total;

    if (type === 'attendance_summary') {
        const rates = data.map(row => {
            const totalDays = parseInt(row.present) + parseInt(row.absent) + parseInt(row.late);
            return totalDays > 0 ? (parseInt(row.present) / totalDays) * 100 : 0;
        });
        const avgRate = rates.length ? (rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
        avgEl.textContent = 'N/A';
        competentEl.textContent = 'N/A';
        attendanceEl.textContent = `${avgRate.toFixed(1)}%`;
        return;
    }

    const numericGrades = data
        .map(row => parseFloat(row.total_grade))
        .filter(val => !Number.isNaN(val));
    const avg = numericGrades.length ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length) : 0;
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

    container.classList.remove('d-none');
    thead.innerHTML = '';
    tbody.innerHTML = '';
    if (summary) summary.classList.add('d-none');
    if (emptyState) emptyState.classList.remove('d-none');
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
        viewBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating';
    } else if (viewBtn.dataset.originalText) {
        viewBtn.innerHTML = viewBtn.dataset.originalText;
    }
}
