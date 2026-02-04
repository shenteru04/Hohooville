const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    loadQualifications();

    const form = document.getElementById('createQualificationForm');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const data = {
                course_name: document.getElementById('courseName').value,
                ctpr_number: document.getElementById('ctprNumber').value,
                duration: document.getElementById('duration').value,
                training_cost: document.getElementById('trainingCost').value,
                description: document.getElementById('description').value
            };

            try {
                const response = await axios.post(`${API_BASE_URL}/role/registrar/qualifications.php?action=create`, data);
                if (response.data.success) {
                    alert('Qualification submitted for approval successfully!');
                    form.reset();
                } else {
                    alert('Error: ' + response.data.message);
                }
            } catch (error) {
                console.error('Error creating qualification:', error);
                alert('An error occurred while submitting the qualification.');
            }
        });
    }
});

async function loadQualifications() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/qualifications.php?action=list`);
        if (response.data.success) {
            const tbody = document.getElementById('qualificationsTableBody');
            tbody.innerHTML = '';
            
            if (response.data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No approved qualifications found</td></tr>';
                return;
            }

            response.data.data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.course_name}</td>
                    <td>${item.ctpr_number || 'N/A'}</td>
                    <td>${item.duration || 'N/A'}</td>
                    <td>${item.training_cost ? '₱' + item.training_cost : 'Free'}</td>
                    <td><span class="badge bg-success">Active</span></td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading qualifications:', error);
    }
}
