// API Configuration
const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    loadDropdownData();
    const form = document.getElementById('addTraineeForm');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Disable button to prevent double submit
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Adding...';

            const formData = new FormData();
            formData.append('first_name', document.getElementById('firstName').value);
            formData.append('last_name', document.getElementById('lastName').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('phone', document.getElementById('phone').value);
            formData.append('birth_certificate_no', document.getElementById('birthCertNo').value);
            formData.append('address', document.getElementById('address').value);
            
            // Enrollment Data
            formData.append('course_id', document.getElementById('courseSelect').value);
            formData.append('batch_id', document.getElementById('batchSelect').value);
            formData.append('scholarship', document.getElementById('scholarshipSelect').value);

            // Files
            if(document.getElementById('validId').files[0]) formData.append('valid_id', document.getElementById('validId').files[0]);
            if(document.getElementById('birthCert').files[0]) formData.append('birth_cert', document.getElementById('birthCert').files[0]);
            if(document.getElementById('photo').files[0]) formData.append('photo', document.getElementById('photo').files[0]);

            try {
                const response = await axios.post(`${API_BASE_URL}/role/admin/trainees.php?action=add`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                if (response.data.success) {
                    alert('Trainee registered and enrolled successfully!');
                    form.reset();
                } else {
                    alert('Error: ' + (response.data.message || 'Unknown error occurred'));
                }
            } catch (error) {
                console.error('Error adding trainee:', error);
                
                let errorMsg = error.message;
                if (error.response && error.response.data) {
                    // If server returns a message (JSON), use it. Otherwise log the raw response (HTML)
                    errorMsg = error.response.data.message || error.response.statusText;
                    if (!error.response.data.message) console.error('Server Response:', error.response.data);
                }
                alert('System Error: ' + errorMsg);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
});

async function loadDropdownData() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainees.php?action=get-form-data`);
        if (response.data.success) {
            const { courses, batches } = response.data.data;

            const courseSelect = document.getElementById('courseSelect');
            courses.forEach(c => {
                courseSelect.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`;
            });

            const batchSelect = document.getElementById('batchSelect');
            batches.forEach(b => {
                batchSelect.innerHTML += `<option value="${b.batch_id}">${b.batch_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading dropdowns:', error);
    }
}