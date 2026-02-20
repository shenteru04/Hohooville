const API_BASE = 'http://localhost/Hohoo-ville/api/role/admin';

document.addEventListener('DOMContentLoaded', () => {
    loadOverviewMetrics();
    loadCompletionRates();
    loadModulePerformance();
    loadEnrollmentTrends();
    loadDropoutAnalysis();
    loadTrainerPerformance();
    loadDemographics();
});

async function loadOverviewMetrics() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=overview`);
        if (response.data.success) {
            const data = response.data.data;
            document.getElementById('totalTrainees').textContent = data.total_trainees;
            document.getElementById('completedTrainees').textContent = data.completed_trainees;
            document.getElementById('avgPassRate').textContent = data.average_pass_rate + '%';
            document.getElementById('activeBatches').textContent = data.active_batches;
        }
    } catch (error) { console.error('Error loading overview:', error); }
}

async function loadCompletionRates() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=completion-rates`);
        if (response.data.success && response.data.data.length > 0) {
            const labels = response.data.data.map(d => d.qualification_name);
            const data = response.data.data.map(d => d.completion_rate);
            createBarChart('completionChart', labels, data, 'Completion Rate (%)');
        }
    } catch (error) { console.error('Error loading completion rates:', error); }
}

async function loadModulePerformance() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=module-performance`);
        if (response.data.success && response.data.data.length > 0) {
            const labels = response.data.data.map(d => d.module_title);
            const data = response.data.data.map(d => d.competency_rate);
            createBarChart('moduleChart', labels, data, 'Competency Rate (%)');
        }
    } catch (error) { console.error('Error loading module performance:', error); }
}

async function loadEnrollmentTrends() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=enrollment-trends`);
        if (response.data.success && response.data.data.length > 0) {
            const labels = response.data.data.map(d => d.month);
            const approved = response.data.data.map(d => d.approved);
            const pending = response.data.data.map(d => d.pending);
            const completed = response.data.data.map(d => d.completed);
            
            const ctx = document.getElementById('trendChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Approved', data: approved, borderColor: '#28a745', tension: 0.1 },
                        { label: 'Pending', data: pending, borderColor: '#ffc107', tension: 0.1 },
                        { label: 'Completed', data: completed, borderColor: '#007bff', tension: 0.1 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    } catch (error) { console.error('Error loading enrollment trends:', error); }
}

async function loadDropoutAnalysis() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=dropout-analysis`);
        if (response.data.success) {
            document.getElementById('dropoutTable').innerHTML = response.data.data.map(d => `
                <tr><td>${d.month}</td><td>${d.enrolled}</td><td>${d.dropout_rate}%</td><td>${d.completed}</td></tr>
            `).join('');
        }
    } catch (error) { console.error('Error loading dropout analysis:', error); }
}

async function loadTrainerPerformance() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=trainer-performance`);
        if (response.data.success) {
            document.getElementById('trainerTable').innerHTML = response.data.data.slice(0, 5).map(d => `
                <tr><td>${d.trainer_name}</td><td>${d.total_trainees}</td><td>${d.avg_trainee_score || 'N/A'}</td><td>${d.competency_rate || 0}%</td></tr>
            `).join('');
        }
    } catch (error) { console.error('Error loading trainer performance:', error); }
}

async function loadDemographics() {
    try {
        const response = await axios.get(`${API_BASE}/analytics.php?action=demographic-analysis`);
        if (response.data.success) {
            const data = response.data.data;
            if (data.gender) {
                const ctx = document.getElementById('genderChart').getContext('2d');
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: data.gender.map(d => d.sex),
                        datasets: [{ data: data.gender.map(d => d.count), backgroundColor: ['#007bff', '#e83e8c'] }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
            if (data.batches) createBarChart('batchChart', data.batches.map(d => d.batch_name), data.batches.map(d => d.trainee_count), 'Trainees');
        }
    } catch (error) { console.error('Error loading demographics:', error); }
}

function createBarChart(id, labels, data, label) {
    const ctx = document.getElementById(id).getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label, data, backgroundColor: '#4e73df' }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}