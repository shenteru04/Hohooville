document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost/hohoo-ville/api';
    let allBatches = [];

    // --- Page Navigation ---
    window.nextPage = function() {
        if (validateStep1()) {
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
            window.scrollTo(0, 0);
        }
    }

    window.prevPage = function() {
        document.getElementById('step2').style.display = 'none';
        document.getElementById('step1').style.display = 'block';
        window.scrollTo(0, 0);
    }

    // --- Field Logic ---
    // Age calculation
    const birthdateInput = document.getElementById('birthdate');
    if (birthdateInput) {
        birthdateInput.addEventListener('change', function() {
            const birthdate = new Date(this.value);
            const today = new Date();
            let age = today.getFullYear() - birthdate.getFullYear();
            const m = today.getMonth() - birthdate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
                age--;
            }
            document.getElementById('age').value = age >= 0 ? age : '';
        });
    }

    // Employment status dependency
    const employmentStatus = document.getElementById('employmentStatus');
    if (employmentStatus) {
        employmentStatus.addEventListener('change', function() {
            const employmentType = document.getElementById('employmentType');
            employmentType.disabled = this.value !== 'Wage-Employed';
            if (employmentType.disabled) {
                employmentType.value = '';
            }
        });
    }

    // PWD details dependency
    document.querySelectorAll('input[name="is_pwd"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('disabilityDetails').style.display = this.value === 'yes' ? 'block' : 'none';
        });
    });
    
    // Enable submit button on consent
    const privacyConsent = document.getElementById('privacyConsent');
    if(privacyConsent){
        privacyConsent.addEventListener('change', function() {
            document.getElementById('submitBtn').disabled = !this.checked;
        });
    }

    // --- Data Loading ---
    async function loadInitialData() {
        try {
            const response = await axios.get(`${API_BASE_URL}/public/application_data.php?action=get-form-data`);
            if (response.data.success) {
                const { courses, scholarships, batches } = response.data.data;
                populateCourses(courses);
                populateScholarships(scholarships);
                allBatches = batches;
                // Initially populate batches for the first course if available
                if (courses.length > 0) {
                    populateBatches(document.getElementById('courseSelect').value);
                } else {
                     populateBatches(null); // Show no batches
                }
            } else {
                console.error("Failed to load form data:", response.data.message);
                alert("Could not load application settings. Please try again later.");
            }
        } catch (error) {
            console.error("Error fetching form data:", error);
            alert("A network error occurred while loading application settings.");
        }
    }

    function populateCourses(courses) {
        const select = document.getElementById('courseSelect');
        select.innerHTML = '<option value="">Select a Qualification</option>';
        if(courses.length > 0) {
            courses.forEach(course => {
                select.innerHTML += `<option value="${course.course_id}">${course.course_name}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">No courses are currently offered</option>';
        }
    }

    function populateScholarships(scholarships) {
        const select = document.getElementById('scholarshipSelect');
        select.innerHTML = '<option value="">Not a Scholar</option>';
        scholarships.forEach(s => {
            select.innerHTML += `<option value="${s.scholarship_name}">${s.scholarship_name}</option>`;
        });
    }

    function populateBatches(courseId) {
        const batchSelect = document.getElementById('batchSelect');
        batchSelect.innerHTML = '<option value="">Select a Batch</option>';
        if (!courseId) {
            batchSelect.innerHTML = '<option value="">Please select a course first</option>';
            return;
        }

        const relevantBatches = allBatches.filter(b => b.course_id == courseId);
        
        if (relevantBatches.length > 0) {
            relevantBatches.forEach(batch => {
                batchSelect.innerHTML += `<option value="${batch.batch_id}">${batch.batch_name}</option>`;
            });
        } else {
            batchSelect.innerHTML = '<option value="">No open batches for this course</option>';
        }
    }

    document.getElementById('courseSelect').addEventListener('change', function() {
        populateBatches(this.value);
    });

    // --- Form Submission ---
    document.getElementById('applicationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        // Full form validation can be added here
        alert("Form submission logic not yet implemented in this example.");
        // The next step would be to create `api/public/submit_application.php`
        // and post the FormData to it, similar to other forms in the system.
    });

    function validateStep1() {
        const form = document.getElementById('applicationForm');
        const inputs = form.querySelectorAll('#step1 [required]');
        for (const input of inputs) {
            if (input.type === 'radio' || input.type === 'checkbox') {
                const groupName = input.name;
                if (!form.querySelector(`input[name="${groupName}"]:checked`)) {
                    alert(`Please make a selection for "${input.closest('.mb-3').querySelector('label').innerText.replace('*','').trim()}".`);
                    input.focus();
                    return false;
                }
            } else if (!input.value) {
                input.focus();
                alert(`Please fill out the "${input.closest('.mb-3, .col-md-3, .col-md-4').querySelector('label').innerText.replace('*','').trim()}" field.`);
                return false;
            }
        }
        return true;
    }

    // Initial load
    loadInitialData();
});