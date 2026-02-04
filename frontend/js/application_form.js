const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    loadFormData();

    // Age Calculation
    document.getElementById('birthdate').addEventListener('change', function() {
        const dob = new Date(this.value);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        document.getElementById('age').value = age;
    });

    // Employment Type Toggle
    document.getElementById('employmentStatus').addEventListener('change', function() {
        const typeSelect = document.getElementById('employmentType');
        typeSelect.disabled = this.value !== 'Wage-Employed';
        if (this.value !== 'Wage-Employed') typeSelect.value = '';
    });

    // PWD Toggle
    const pwdRadios = document.getElementsByName('is_pwd');
    pwdRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('disabilityDetails').style.display = this.value === 'yes' ? 'block' : 'none';
        });
    });

    // Privacy Consent Toggle
    document.getElementById('privacyConsent').addEventListener('change', function() {
        document.getElementById('submitBtn').disabled = !this.checked;
    });

    document.getElementById('applicationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        const formData = new FormData(this);

        try {
            const response = await axios.post(`${API_BASE_URL}/public/submit_application.php`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                alert('Application submitted successfully! Please wait for the registrar to contact you.');
                this.reset();
            } else {
                alert('Error: ' + response.data.message);
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('An error occurred while submitting your application.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Application';
        }
    });
});

async function loadFormData() {
    try {
        const response = await axios.get(`${API_BASE_URL}/public/submit_application.php?action=get-options`);
        if (response.data.success) {
            const { courses, batches } = response.data.data;
            
            const courseSelect = document.getElementById('courseSelect');
            courseSelect.innerHTML = '<option value="">Select Qualification</option>';
            courses.forEach(c => {
                courseSelect.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`;
            });

            const batchSelect = document.getElementById('batchSelect');
            batchSelect.innerHTML = '<option value="">Select Batch</option>';
            batches.forEach(b => {
                batchSelect.innerHTML += `<option value="${b.batch_id}">${b.batch_name}</option>`;
            });
        } else {
            console.error('API returned error:', response.data.message);
            document.getElementById('courseSelect').innerHTML = '<option value="">Error loading courses</option>';
            document.getElementById('batchSelect').innerHTML = '<option value="">Error loading batches</option>';
        }
    } catch (error) {
        console.error('Error loading options:', error);
        document.getElementById('courseSelect').innerHTML = '<option value="">Error loading courses</option>';
        document.getElementById('batchSelect').innerHTML = '<option value="">Error loading batches</option>';
    }
}

window.nextPage = function() {
    // Simple validation for Page 1
    const step1 = document.getElementById('step1');
    const inputs = step1.querySelectorAll('input[required], select[required]');
    let valid = true;
    inputs.forEach(input => {
        if (!input.value) {
            input.classList.add('is-invalid');
            valid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });

    if (valid) {
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';
        window.scrollTo(0, 0);
    } else {
        alert('Please fill in all required fields on this page.');
    }
}

window.prevPage = function() {
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step1').style.display = 'block';
    window.scrollTo(0, 0);
}
