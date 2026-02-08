const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
let reportChart = null;

document.addEventListener('DOMContentLoaded', function() {
    // Set default dates (This Year)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), 0, 1);
    
    document.getElementById('startDate').valueAsDate = firstDay;
    document.getElementById('endDate').valueAsDate = today;

    // Initial Load
    generateReport();

    // Event Listeners
    document.getElementById('generateBtn').addEventListener('click', generateReport);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../../login.html';
    });

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
});

async function generateReport() {
    const type = document.getElementById('reportType').value;
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/reports.php`, {
            params: { type, start_date: start, end_date: end }
        });

        if (response.data.success) {
            updateChart(type, response.data.chart);
            updateTable(type, response.data.table);
        } else {
            alert('Error generating report: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate report');
    }
}

function updateChart(type, data) {
    const ctx = document.getElementById('reportChart');
    
    if (reportChart) {
        reportChart.destroy();
    }

    const labels = data.map(item => item.label);
    const values = data.map(item => item.value);
    
    let label = 'Count';
    let chartType = 'bar';

    if (type === 'financial') {
        label = 'Revenue (₱)';
        chartType = 'line';
    } else if (type === 'attendance' || type === 'performance') {
        label = 'Average (%)';
    }

    reportChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                fill: type === 'financial' // Fill area for line chart
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateTable(type, data) {
    const thead = document.querySelector('#reportTable thead');
    const tbody = document.querySelector('#reportTable tbody');
    
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No data found for this period</td></tr>';
        return;
    }

    // Set Headers based on type
    let headers = [];
    if (type === 'enrollment') {
        headers = ['Date', 'Trainee', 'Course', 'Batch', 'Status'];
    } else if (type === 'attendance') {
        headers = ['Date', 'Batch', 'Total Students', 'Present', 'Absent'];
    } else if (type === 'financial') {
        headers = ['Date', 'Trainee', 'Amount', 'Method', 'Reference'];
    } else if (type === 'performance') {
        headers = ['Trainee', 'Course', 'Grade', 'Remarks', 'Date Recorded'];
    }

    let headerRow = '<tr>';
    headers.forEach(h => headerRow += `<th>${h}</th>`);
    headerRow += '</tr>';
    thead.innerHTML = headerRow;

    // Populate Rows
    data.forEach(row => {
        let tr = '<tr>';
        if (type === 'enrollment') {
            tr += `<td>${row.enrollment_date}</td>
                   <td>${row.trainee}</td>
                   <td>${row.course_name}</td>
                   <td>${row.batch_name || '-'}</td>
                   <td><span class="badge bg-${row.status === 'approved' ? 'success' : 'warning'}">${row.status}</span></td>`;
        } else if (type === 'attendance') {
            tr += `<td>${row.date_recorded}</td>
                   <td>${row.batch_name}</td>
                   <td>${row.total_students}</td>
                   <td>${row.present_count}</td>
                   <td>${row.absent_count}</td>`;
        } else if (type === 'financial') {
            tr += `<td>${row.payment_date}</td>
                   <td>${row.trainee}</td>
                   <td>₱${parseFloat(row.amount).toLocaleString()}</td>
                   <td>${row.payment_method}</td>
                   <td>${row.reference_no || '-'}</td>`;
        } else if (type === 'performance') {
            tr += `<td>${row.trainee}</td>
                   <td>${row.course_name}</td>
                   <td>${row.total_grade}</td>
                   <td>${row.remarks}</td>
                   <td>${row.date_recorded}</td>`;
        }
        tr += '</tr>';
        tbody.innerHTML += tr;
    });
}