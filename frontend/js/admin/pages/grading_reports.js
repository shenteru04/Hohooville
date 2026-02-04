// API Configuration
const API_BASE_URL = 'http://localhost/hohoo-ville/api';

// Axios Instance Configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = loadGradingReports;
        document.head.appendChild(script);
    } else {
        loadGradingReports();
    }
});

async function loadGradingReports() {
    try {
        const response = await apiClient.get('/role/admin/admin_dashboard.php?action=grading-reports');
        if (response.data.success) {
            // Ensure data objects exist to prevent undefined errors
            const reportData = response.data.data || {};
            renderGradingChart(reportData.distribution || []);
            renderGradingTable(reportData.detailed || []);
        } else {
            alert('Error loading grading reports: ' + (response.data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading grading reports:', error);
        alert('Error loading grading reports');
    }
}

function renderGradingChart(data) {
    const ctx = document.getElementById('gradeDistributionChart');
    if (!ctx) return;

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    // Ensure data is an array
    if (!Array.isArray(data)) {
        data = [];
    }

    const labels = data.map(item => item.grade_range);
    const counts = data.map(item => item.count);

    // Destroy existing chart if it exists
    if (window.gradingChart instanceof Chart) {
        window.gradingChart.destroy();
    }

    window.gradingChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)', // Green
                    'rgba(54, 162, 235, 0.6)', // Blue
                    'rgba(255, 206, 86, 0.6)', // Yellow
                    'rgba(255, 99, 132, 0.6)'  // Red
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderGradingTable(data) {
    const tbody = document.getElementById('gradingTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Fix: Check if data is valid array before iterating
    if (!Array.isArray(data)) {
        console.warn('Grading data is not an array:', data);
        data = [];
    }
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No grading records found</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.trainee_name || 'N/A'}</td>
            <td>${item.qualification_title || 'N/A'}</td>
            <td>${item.batch_code || 'N/A'}</td>
            <td>${item.assessment_date ? new Date(item.assessment_date).toLocaleDateString() : 'N/A'}</td>
            <td>${item.grade || 'N/A'}</td>
            <td>${item.score || '0'}</td>
        `;
        tbody.appendChild(row);
    });
}