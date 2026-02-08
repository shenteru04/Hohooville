const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
let lastSummaryData = [];

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../../../login.html';
        return;
    }
    document.getElementById('trainerName').textContent = user.username;
    document.getElementById('attendanceDate').valueAsDate = new Date();

    loadBatches(user.user_id);

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

    // Remove unwanted sidebar links
    if (sidebar) {
        const ul = sidebar.querySelector('ul');
        if (ul) {
            ul.innerHTML = '';
            const menuItems = [
                { href: 'trainer_dashboard.html', icon: 'fas fa-home', text: 'Dashboard' },
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

    document.getElementById('loadTraineesBtn').addEventListener('click', loadTrainees);
    document.getElementById('saveAttendanceBtn').addEventListener('click', saveAttendance);
    document.getElementById('markAllPresentBtn').addEventListener('click', markAllPresent);
    document.getElementById('downloadSpreadsheetBtn').addEventListener('click', downloadSpreadsheet);

    document.getElementById('batchSelect').addEventListener('change', function() {
        const batchId = this.value;
        localStorage.setItem(`lastAttendanceBatchId_${user.user_id}`, batchId);
        
        // Hide trainee list when batch changes to prevent mismatch
        document.getElementById('traineeListCard').style.display = 'none';

        if (batchId) {
            loadAttendanceSummary(batchId);
        } else {
            document.getElementById('attendanceSummaryCard').style.display = 'none';
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../../../login.html';
    });
});

async function loadBatches(userId) {
    try {
        // Get trainer ID first
        const profileRes = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${userId}`);
        if (!profileRes.data.success) return;
        
        const trainerId = profileRes.data.data.trainer_id;

        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_batches.php?trainer_id=${trainerId}`);
        
        if (response.data.success) {
            const select = document.getElementById('batchSelect');
            select.innerHTML = '<option value="">Select Batch</option>';
            
            response.data.data.forEach(batch => {
                select.innerHTML += `<option value="${batch.batch_id}">${batch.batch_name} - ${batch.course_name}</option>`;
            });

            const lastBatchId = localStorage.getItem(`lastAttendanceBatchId_${userId}`);
            if (lastBatchId && select.querySelector(`option[value="${lastBatchId}"]`)) {
                select.value = lastBatchId;
                loadAttendanceSummary(lastBatchId);
            }
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

async function loadTrainees() {
    const batchId = document.getElementById('batchSelect').value;
    const date = document.getElementById('attendanceDate').value;

    if (!batchId || !date) {
        alert('Please select a batch and date');
        return;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/attendance.php?action=get-trainees&batch_id=${batchId}&date=${date}`);
        
        if (response.data.success) {
            document.getElementById('traineeListCard').style.display = 'block';
            const tbody = document.getElementById('traineeListBody');
            tbody.innerHTML = '';

            response.data.data.forEach(t => {
                const status = t.status || 'present';
                tbody.innerHTML += `
                    <tr data-id="${t.trainee_id}">
                        <td class="align-middle">${t.first_name} ${t.last_name}</td>
                        <td>
                            <div class="btn-group" role="group">
                                <input type="radio" class="btn-check" name="status_${t.trainee_id}" id="present_${t.trainee_id}" value="present" ${status === 'present' ? 'checked' : ''}>
                                <label class="btn btn-outline-success" for="present_${t.trainee_id}">Present</label>

                                <input type="radio" class="btn-check" name="status_${t.trainee_id}" id="late_${t.trainee_id}" value="late" ${status === 'late' ? 'checked' : ''}>
                                <label class="btn btn-outline-warning" for="late_${t.trainee_id}">Late</label>

                                <input type="radio" class="btn-check" name="status_${t.trainee_id}" id="absent_${t.trainee_id}" value="absent" ${status === 'absent' ? 'checked' : ''}>
                                <label class="btn btn-outline-danger" for="absent_${t.trainee_id}">Absent</label>
                            </div>
                        </td>
                    </tr>`;
            });
        }
    } catch (error) {
        console.error('Error loading trainees:', error);
    }
}

async function saveAttendance() {
    const batchId = document.getElementById('batchSelect').value;
    const date = document.getElementById('attendanceDate').value;
    const rows = document.querySelectorAll('#traineeListBody tr');
    
    const trainees = Array.from(rows).map(row => ({
        trainee_id: row.getAttribute('data-id'),
        status: row.querySelector('input[type="radio"]:checked').value
    }));

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainer/attendance.php?action=save`, {
            batch_id: batchId,
            date: date,
            trainees: trainees
        });
        
        if (response.data.success) {
            alert('Attendance saved successfully');
            loadAttendanceSummary(batchId);
        } else alert('Error: ' + response.data.message);
    } catch (error) {
        console.error('Error saving attendance:', error);
    }
}

function markAllPresent() {
    const presentRadios = document.querySelectorAll('input[value="present"]');
    presentRadios.forEach(radio => {
        radio.checked = true;
    });
}

async function loadAttendanceSummary(batchId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/reports.php?action=attendance_summary&batch_id=${batchId}`);
        
        if (response.data.success) {
            document.getElementById('attendanceSummaryCard').style.display = 'block';
            const tbody = document.getElementById('summaryTableBody');
            tbody.innerHTML = '';
            
            lastSummaryData = response.data.data;

            response.data.data.forEach(row => {
                const total = parseInt(row.present) + parseInt(row.absent) + parseInt(row.late);
                const rate = total > 0 ? Math.round((row.present / total) * 100) : 0;
                
                tbody.innerHTML += `
                    <tr>
                        <td>${row.trainee_name}</td>
                        <td>${row.present}</td>
                        <td>${row.absent}</td>
                        <td>${row.late}</td>
                        <td>${rate}%</td>
                    </tr>`;
            });
            
            document.getElementById('attendanceSummaryCard').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

function downloadSpreadsheet() {
    if (!lastSummaryData || lastSummaryData.length === 0) {
        alert('No data to download');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,Trainee Name,Present,Absent,Late,Attendance Rate\n";
    
    lastSummaryData.forEach(row => {
        const total = parseInt(row.present) + parseInt(row.absent) + parseInt(row.late);
        const rate = total > 0 ? Math.round((row.present / total) * 100) : 0;
        csvContent += `"${row.trainee_name}",${row.present},${row.absent},${row.late},${rate}%\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}