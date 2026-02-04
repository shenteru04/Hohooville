const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('addTrainerForm');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('first_name', document.getElementById('firstName').value);
            formData.append('last_name', document.getElementById('lastName').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('phone', document.getElementById('phone').value);
            formData.append('specialization', document.getElementById('specialization').value);
            formData.append('address', document.getElementById('address').value);
            formData.append('nttc_no', document.getElementById('nttcNo').value);
            formData.append('nc_level', document.getElementById('ncLevel').value);

            if(document.getElementById('nttcFile').files[0]) formData.append('nttc_file', document.getElementById('nttcFile').files[0]);
            if(document.getElementById('tmFile').files[0]) formData.append('tm_file', document.getElementById('tmFile').files[0]);
            if(document.getElementById('ncFile').files[0]) formData.append('nc_file', document.getElementById('ncFile').files[0]);
            if(document.getElementById('expFile').files[0]) formData.append('experience_file', document.getElementById('expFile').files[0]);

            try {
                const response = await axios.post(`${API_BASE_URL}/role/admin/trainers.php?action=add`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (response.data.success) {
                    alert('Trainer added successfully!');
                    form.reset();
                } else {
                    alert('Error: ' + response.data.message);
                }
            } catch (error) {
                console.error('Error adding trainer:', error);
            }
        });
    }
});