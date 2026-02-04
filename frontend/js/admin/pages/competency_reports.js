const API_BASE_URL = 'http://localhost/hohoo-ville/api';

// Axios Instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
});

document.addEventListener('DOMContentLoaded', function() {
    loadCompetencyReports();
});

async function loadCompetencyReports() {
    try {
        const response = await apiClient.get('/role/admin/admin_dashboard.php?action=competency-results');
        if (response.data.success) {
            renderCompetencyTable(response.data.data.results);
            renderCompetencyChart(response.data.data.overview);
        } else {
            alert('Error loading competency reports: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error loading competency reports:', error);
        alert('Error loading competency reports');
    }
}

function renderCompetencyTable(data) {
    const tbody = document.getElementById('competencyTableBody');
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.trainee_name}</td>
            <td>${item.qualification_title}</td>
            <td>${item.batch_code}</td>
            <td>${new Date(item.assessment_date).toLocaleDateString()}</td>
            <td>${item.score}%</td>
            <td><span class="badge badge-${getCompetencyColor(item.score)}">${getCompetencyStatus(item.score)}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function renderCompetencyChart(data) {
    const ctx = document.getElementById('competencyOverviewChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Average Score',
                data: data.scores,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function getCompetencyColor(score) {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
}

function getCompetencyStatus(score) {
    if (score >= 80) return 'Competent';
    if (score >= 60) return 'Needs Improvement';
    return 'Not Competent';
}