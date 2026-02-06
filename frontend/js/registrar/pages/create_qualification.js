const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    loadQualifications();

    document.getElementById('createQualificationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const payload = {
            qualification_name: document.getElementById('courseName').value,
            ctpr_number: document.getElementById('ctprNumber').value,
            duration: document.getElementById('duration').value,
            training_cost: document.getElementById('trainingCost').value,
            description: document.getElementById('description').value
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/role/registrar/qualifications.php?action=create`, payload);
            if (response.data.success) {
                alert('Qualification submitted for approval successfully!');
                this.reset();
                loadQualifications();
            } else {
                alert('Error: ' + response.data.message);
            }
        } catch (error) {
            console.error('Error creating qualification:', error);
            alert('An error occurred while creating the qualification.');
        }
    });
});

async function loadQualifications() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/qualifications.php?action=list`);
        const tbody = document.getElementById('qualificationsTableBody');
        tbody.innerHTML = '';
        if (response.data.success) {
            response.data.data.forEach(q => {
                tbody.innerHTML += `
                    <tr>
                        <td>${q.course_name}</td>
                        <td>${q.ctpr_number || 'N/A'}</td>
                        <td>${q.duration || 'N/A'}</td>
                        <td>${q.training_cost ? '₱' + parseFloat(q.training_cost).toFixed(2) : 'N/A'}</td>
                        <td><span class="badge bg-success">${q.status}</span></td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading qualifications:', error);
    }
}