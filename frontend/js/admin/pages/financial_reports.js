const API_BASE_URL = 'http://localhost/hohoo-ville/api';
let revenueChart = null;
let paymentStatusChart = null;

document.addEventListener('DOMContentLoaded', function() {
    loadFinancialReports();
});

async function loadFinancialReports() {
    try {
        const today = new Date();
        const start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        const end = today.toISOString().split('T')[0];

        const response = await axios.get(`${API_BASE_URL}/role/admin/reports.php`, {
            params: { type: 'financial', start_date: start, end_date: end }
        });

        if (response.data.success) {
            renderRevenueChart(response.data.chart);
            renderPaymentMethodChart(response.data.method_distribution);
            renderFinancialTable(response.data.table);
        } else {
            alert('Error loading financial reports: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error loading financial reports:', error);
    }
}

function renderRevenueChart(data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    if (revenueChart) revenueChart.destroy();

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: 'Revenue (₱)',
                data: data.map(d => d.value),
                borderColor: '#4e73df',
                tension: 0.1,
                fill: true,
                backgroundColor: 'rgba(78, 115, 223, 0.1)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderPaymentMethodChart(data) {
    const ctx = document.getElementById('paymentStatusChart');
    if (!ctx) return;

    if (paymentStatusChart) paymentStatusChart.destroy();

    paymentStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                data: data.map(d => d.value),
                backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderFinancialTable(data) {
    const tbody = document.getElementById('financialTableBody');
    tbody.innerHTML = '';
    
    data.forEach(row => {
        tbody.innerHTML += `
            <tr>
                <td>${row.trainee}</td>
                <td>N/A</td> <!-- Qualification not in current query -->
                <td>N/A</td> <!-- Batch not in current query -->
                <td>${row.payment_date}</td>
                <td>₱${parseFloat(row.amount).toFixed(2)}</td>
                <td><span class="badge bg-success">Paid</span></td>
            </tr>
        `;
    });
}