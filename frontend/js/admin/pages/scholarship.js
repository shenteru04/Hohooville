const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    loadScholarships();
    document.getElementById('addScholarshipForm').addEventListener('submit', handleAddScholarship);
});

async function loadScholarships() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/scholarship.php?action=list`);
        if (response.data.success) {
            const tbody = document.getElementById('scholarshipsTableBody');
            tbody.innerHTML = '';
            response.data.data.forEach(s => {
                const traineeName = s.first_name ? `${s.last_name}, ${s.first_name}` : 'N/A';
                tbody.innerHTML += `
                    <tr>
                        <td>${s.scholarship_id}</td>
                        <td>${traineeName}</td>
                        <td>${s.scholarship_name}</td>
                        <td>₱${parseFloat(s.amount || 0).toFixed(2)}</td>
                        <td>${s.sponsor || '-'}</td>
                        <td>${s.date_granted}</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="deleteScholarship(${s.scholarship_id})">Delete</button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading scholarships:', error);
    }
}

async function handleAddScholarship(e) {
    e.preventDefault();
    const data = {
        trainee_id: document.getElementById('traineeId').value,
        scholarship_name: document.getElementById('scholarshipName').value,
        amount: document.getElementById('amount').value,
        sponsor: document.getElementById('sponsor').value
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/admin/scholarship.php?action=add`, data);
        if (response.data.success) {
            alert('Scholarship added successfully');
            document.getElementById('addScholarshipForm').reset();
            loadScholarships();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error adding scholarship:', error);
        alert('Failed to add scholarship');
    }
}

window.deleteScholarship = async function(id) {
    if (!confirm('Are you sure?')) return;
    try {
        await axios.delete(`${API_BASE_URL}/role/admin/scholarship.php?action=delete&id=${id}`);
        loadScholarships();
    } catch (error) {
        console.error('Error deleting scholarship:', error);
    }
};