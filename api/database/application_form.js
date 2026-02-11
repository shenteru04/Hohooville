document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

    // --- Global State ---
    let allCourses = [];
    let allBatches = [];
    let allScholarships = [];
    let isReturningTrainee = false;

    // --- Element Selectors ---
    const preCheckSection = document.getElementById('preCheckSection');
    const applicationContainer = document.getElementById('applicationContainer');
    const applicationForm = document.getElementById('applicationForm');
    const continueBtn = document.getElementById('continueBtn');
    const preCheckSpinner = document.getElementById('preCheckSpinner');

    const welcomeBackMessage = document.getElementById('welcomeBackMessage');
    const requirementsUploadSection = document.getElementById('requirementsUploadSection');
    const signatureSection = document.getElementById('signatureSection');
    const submitBtn = document.getElementById('submitBtn');

    // --- Page Navigation (existing) ---
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

    // --- Field Logic (existing) ---
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
        privacyConsent.addEventListener('change', () => {
            const sigInput = document.getElementById('digitalSignatureInput');
            const isSignatureProvided = isReturningTrainee || (sigInput && sigInput.value !== '');
            submitBtn.disabled = !privacyConsent.checked || !isSignatureProvided;
        });
    }

    // --- NEW: Pre-Check Logic ---
    if (continueBtn) {
        continueBtn.addEventListener('click', async () => {
            const lastName = document.getElementById('check_last_name').value.trim();
            const firstName = document.getElementById('check_first_name').value.trim();
            const email = document.getElementById('check_email').value.trim();

            if (!lastName || !firstName || !email) {
                alert('Please fill in your Last Name, First Name, and Email Address.');
                return;
            }

            continueBtn.disabled = true;
            preCheckSpinner.style.display = 'block';

            try {
                const response = await axios.get(`${API_BASE_URL}/public/submit_application.php`, {
                    params: {
                        action: 'check-trainee',
                        last_name: lastName,
                        first_name: firstName,
                        email: email
                    }
                });

                if (response.data.success) {
                    preCheckSection.style.display = 'none';
                    applicationContainer.style.display = 'block';

                    if (response.data.exists) {
                        isReturningTrainee = true;
                        handleReturningTrainee(response.data.data);
                    } else {
                        isReturningTrainee = false;
                        handleNewTrainee({ lastName, firstName, email });
                    }
                } else {
                    alert('Error: ' + response.data.message);
                }
            } catch (error) {
                console.error('Failed to check trainee status:', error);
                alert('An error occurred while checking your profile. Please try again.');
            } finally {
                continueBtn.disabled = false;
                preCheckSpinner.style.display = 'none';
            }
        });
    }

    function handleNewTrainee(data) {
        document.querySelector('[name="last_name"]').value = data.lastName;
        document.querySelector('[name="first_name"]').value = data.firstName;
        document.querySelector('[name="email"]').value = data.email;
        
        requirementsUploadSection.style.display = 'block';
        signatureSection.style.display = 'block';
        
        populateCourses(allCourses);
        if (allCourses.length > 0) {
            populateBatches(allCourses[0].qualification_id);
        }
    }

    function handleReturningTrainee(traineeData) {
        welcomeBackMessage.style.display = 'block';
        requirementsUploadSection.style.display = 'none';
        signatureSection.style.display = 'none';

        // Disable all inputs in step 1
        const step1Inputs = document.querySelectorAll('#step1 input, #step1 select, #step1 textarea');
        step1Inputs.forEach(input => input.disabled = true);

        // Populate form with trainee data
        for (const key in traineeData) {
            if (traineeData.hasOwnProperty(key)) {
                const value = traineeData[key];
                
                // Map database column names to HTML input names
                let inputName = key;
                if (key === 'phone_number') inputName = 'phone';

                const field = document.querySelector(`[name="${inputName}"]`);

                if (field) {
                    if (field.type === 'radio') {
                        const radioToSelect = document.querySelector(`[name="${inputName}"][value="${value}"]`);
                        if (radioToSelect) radioToSelect.checked = true;
                    } else {
                        field.value = value;
                    }
                } else if (key === 'learner_classification' && value) {
                    const classifications = value.split(',');
                    classifications.forEach(c => {
                        const checkbox = document.querySelector(`input[name="learner_classification[]"][value="${c.trim()}"]`);
                        if (checkbox) checkbox.checked = true;
                    });
                } else if (key === 'is_pwd') {
                     const pwdValue = value === '1' ? 'yes' : 'no';
                     const radioToSelect = document.querySelector(`[name="is_pwd"][value="${pwdValue}"]`);
                     if(radioToSelect) radioToSelect.checked = true;
                }
            }
        }
        
        // Re-enable key fields needed for backend lookup on submit
        document.querySelector('[name="last_name"]').disabled = false;
        document.querySelector('[name="first_name"]').disabled = false;
        document.querySelector('[name="email"]').disabled = false;
        
        // Manually trigger change events for dependent fields to update UI
        document.getElementById('birthdate').dispatchEvent(new Event('change'));
        document.getElementById('employmentStatus').dispatchEvent(new Event('change'));
        document.querySelector(`input[name="is_pwd"]:checked`).dispatchEvent(new Event('change'));

        // Filter out courses the trainee is already enrolled in or has completed
        const enrolledQualifications = traineeData.enrolled_qualifications || [];
        const availableCourses = allCourses.filter(course => 
            !enrolledQualifications.includes(String(course.qualification_id))
        );
        populateCourses(availableCourses);
        if (availableCourses.length > 0) {
            populateBatches(availableCourses[0].qualification_id);
        } else {
            populateBatches(null);
        }
    }

    // --- Data Loading (Modified) ---
    async function loadInitialData() {
        try {
            // Point to the correct action that provides all necessary form data
            const response = await axios.get(`${API_BASE_URL}/public/submit_application.php?action=get-options`);
            if (response.data.success) {
                const data = response.data.data;
                allCourses = data.courses || [];
                allScholarships = data.scholarships || [];
                allBatches = data.batches || [];
                
                populateScholarships(allScholarships);

                document.getElementById('courseSelect').innerHTML = '<option value="">Select a Qualification</option>';
                document.getElementById('batchSelect').innerHTML = '<option value="">Select a qualification first</option>';
            } else {
                console.error("Failed to load form data:", response.data.message);
                alert("Could not load application settings. Please try again later.");
            }
        } catch (error) {
            console.error("Error fetching form data:", error);
            alert("A network error occurred. Please check your connection and try again.");
        }
    }

    function populateCourses(courses) {
        const select = document.getElementById('courseSelect');
        select.innerHTML = '<option value="">Select a Qualification</option>';
        if(courses && courses.length > 0) {
            courses.forEach(qualification => {
                select.innerHTML += `<option value="${qualification.qualification_id}">${qualification.course_name}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">No new courses available for enrollment</option>';
        }
    }

    function populateScholarships(scholarships) {
        const select = document.getElementById('scholarshipSelect');
        select.innerHTML = '<option value="">Not a Scholar</option>';
        if (scholarships && scholarships.length > 0) {
            scholarships.forEach(s => {
                select.innerHTML += `<option value="${s.scholarship_name}">${s.scholarship_name}</option>`;
            });
        }
    }

    function populateBatches(courseId) {
        const batchSelect = document.getElementById('batchSelect');
        batchSelect.innerHTML = '<option value="">Select a Batch</option>';
        if (!courseId) {
            batchSelect.innerHTML = '<option value="">Select a course to see available batches</option>';
            return;
        }

        const relevantBatches = allBatches.filter(b => b.qualification_id == courseId);
        
        if (relevantBatches.length > 0) {
            relevantBatches.forEach(batch => {
                batchSelect.innerHTML += `<option value="${batch.batch_id}">${batch.batch_name}</option>`;
            });
        } else {
            batchSelect.innerHTML = '<option value="">No open batches for this qualification</option>';
        }
    }

    document.getElementById('courseSelect').addEventListener('change', function() {
        populateBatches(this.value);
    });

    // --- NEW: Form Submission Logic ---
    applicationForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (isReturningTrainee) {
            const step1Inputs = document.querySelectorAll('#step1 input, #step1 select, #step1 textarea');
            step1Inputs.forEach(input => input.disabled = false);
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';

        const formData = new FormData(this);

        if (isReturningTrainee) {
            formData.delete('valid_id');
            formData.delete('birth_cert');
            formData.delete('photo');
            formData.delete('additional_docs');
            formData.delete('digital_signature');
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/public/submit_application.php`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                alert('Application submitted successfully! You will be redirected.');
                window.location.href = 'application_form.html'; // Or a thank you page
            } else {
                alert('Submission Failed: ' + response.data.message);
            }

        } catch (error) {
            console.error('Submission error:', error);
            let errorMessage = (error.response?.data?.message) || 'An unexpected error occurred.';
            alert('Submission Error: ' + errorMessage);
        } finally {
            submitBtn.disabled = !privacyConsent.checked;
            submitBtn.innerHTML = 'Submit Application';
            if (isReturningTrainee) {
                const step1Inputs = document.querySelectorAll('#step1 input, #step1 select, #step1 textarea');
                step1Inputs.forEach(input => input.disabled = true);
                document.querySelector('[name="last_name"]').disabled = false;
                document.querySelector('[name="first_name"]').disabled = false;
                document.querySelector('[name="email"]').disabled = false;
            }
        }
    });

    // --- Validation (existing) ---
    function validateStep1() {
        const form = document.getElementById('applicationForm');
        const inputs = form.querySelectorAll('#step1 [required]');
        const validatedRadioGroups = new Set(); // To avoid re-validating radio groups

        for (const input of inputs) {
            if (input.type === 'radio') {
                const groupName = input.name;
                // If we've already checked this group, skip to the next input
                if (validatedRadioGroups.has(groupName)) {
                    continue;
                }

                // Check if any radio in the group is selected
                if (!form.querySelector(`input[name="${groupName}"]:checked`)) {
                    const label = input.closest('.mb-3').querySelector('label');
                    alert(`Please make a selection for "${label.innerText.replace('*','').trim()}".`);
                    input.focus();
                    return false;
                }
                
                // Mark this group as validated so we don't check it again
                validatedRadioGroups.add(groupName);
            } else if (!input.value) { // For text, select, date, etc.
                const label = input.closest('.mb-3, .col-md-3, .col-md-4, .col-md-6').querySelector('label');
                alert(`Please fill out the "${label.innerText.replace('*','').trim()}" field.`);
                input.focus();
                return false;
            }
        }
        return true;
    }

    // --- NEW: Signature Pad Logic ---
    const signatureModal = new bootstrap.Modal(document.getElementById('signatureModal'));
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    let drawing = false;

    const getPos = (canvasDom, event) => {
        const rect = canvasDom.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    const startDrawing = (e) => {
        drawing = true;
        const pos = getPos(canvas, e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!drawing) return;
        e.preventDefault();
        const pos = getPos(canvas, e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const stopDrawing = () => { drawing = false; };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    document.getElementById('clearCanvasBtn').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    document.getElementById('saveSignatureBtn').addEventListener('click', () => {
        const dataUrl = canvas.toDataURL('image/png');
        document.getElementById('digitalSignatureInput').value = dataUrl;
        document.getElementById('signaturePreview').src = dataUrl;
        document.getElementById('signaturePreview').style.display = 'block';
        document.getElementById('signaturePlaceholder').style.display = 'none';
        document.getElementById('clearSignatureBtn').style.display = 'inline-block';
        submitBtn.disabled = !privacyConsent.checked;
        signatureModal.hide();
    });

    document.getElementById('signaturePreviewArea').addEventListener('click', () => signatureModal.show());

    document.getElementById('clearSignatureBtn').addEventListener('click', () => {
        Object.assign(document.getElementById('signaturePreview'), { src: '', style: { display: 'none' } });
        document.getElementById('signaturePlaceholder').style.display = 'block';
        document.getElementById('clearSignatureBtn').style.display = 'none';
        document.getElementById('digitalSignatureInput').value = '';
        submitBtn.disabled = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // --- Initial Load ---
    loadInitialData();
});