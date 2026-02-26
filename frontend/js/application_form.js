document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost/hohoo-ville/api';
    let allBatches = [];
    let allCourses = []; // Store course data including CTPR and duration

    // --- Page Navigation ---
    window.nextPage = function() {
        const birthdateInput = document.getElementById('birthdate');
        const ageValue = parseInt(document.getElementById('age').value, 10);
        if (!birthdateInput.value || isNaN(ageValue) || ageValue < 15) {
            Swal && Swal.fire ? Swal.fire('Invalid Birthdate', 'Applicants must be at least 15 years old. Please select a valid birthdate.', 'error') : alert('Applicants must be at least 15 years old. Please select a valid birthdate.');
            birthdateInput.focus();
            return;
        }
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
            // Birthdate validation: minimum age 15
            if (isNaN(birthdate.getTime()) || age < 15) {
                document.getElementById('age').value = '';
                this.value = '';
                Swal && Swal.fire ? Swal.fire('Invalid Birthdate', 'Applicants must be at least 15 years old. Please select a valid birthdate.', 'error') : alert('Applicants must be at least 15 years old. Please select a valid birthdate.');
                this.focus();
                return;
            }
            document.getElementById('age').value = age >= 0 ? age : '';
            updateScholarshipEligibility(age);
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

    // Phone number validation - numbers only
    const phoneInput = document.getElementById('phoneInput');
    if (phoneInput) {
        // Create error message element
        const errorMessage = document.createElement('div');
        errorMessage.id = 'phoneError';
        errorMessage.style.display = 'none';
        errorMessage.style.color = '#dc3545';
        errorMessage.style.fontSize = '0.875rem';
        errorMessage.style.marginTop = '0.25rem';
        errorMessage.textContent = 'Numbers only';
        phoneInput.parentElement.appendChild(errorMessage);

        let errorTimeout;
        
        phoneInput.addEventListener('keypress', function(e) {
            // Prevent non-numeric key press
            const char = String.fromCharCode(e.which);
            if (!/[0-9]/.test(char)) {
                e.preventDefault();
                
                // Show error message
                this.classList.add('is-invalid');
                errorMessage.style.display = 'block';
                
                // Clear previous timeout
                clearTimeout(errorTimeout);
                
                // Hide error after 2 seconds
                errorTimeout = setTimeout(() => {
                    this.classList.remove('is-invalid');
                    errorMessage.style.display = 'none';
                }, 2000);
            }
        });
        
        phoneInput.addEventListener('input', function() {
            // Remove non-numeric characters in real-time
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }
    
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
                allCourses = courses; // Store all course data
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
            // alert("A network error occurred while loading application settings.");
        }
    }

    function populateCourses(courses) {
        const select = document.getElementById('courseSelect');
        select.innerHTML = '<option value="">Select a Qualification</option>';
        if(courses.length > 0) {
            courses.forEach(qualification => {
                select.innerHTML += `<option value="${qualification.qualification_id}">${qualification.qualification_name}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">No courses are currently offered</option>';
        }
    }

    function populateScholarships(scholarships) {
        // No-op: Scholarship field is now a readonly input auto-populated by batch selection
    }

    function populateBatches(qualificationId) {
        const batchSelect = document.getElementById('batchSelect');
        batchSelect.innerHTML = '<option value="">Select a Batch</option>';
        const scholarshipSelect = document.getElementById('scholarshipSelect');
        if (!qualificationId) {
            batchSelect.innerHTML = '<option value="">Please select a course first</option>';
            if (scholarshipSelect) {
                scholarshipSelect.disabled = false;
                scholarshipSelect.value = '';
            }
            return;
        }
        const relevantBatches = allBatches.filter(b => b.qualification_id == qualificationId);
        if (relevantBatches.length > 0) {
            relevantBatches.forEach(batch => {
                batchSelect.innerHTML += `<option value="${batch.batch_id}" data-scholarship="${batch.scholarship_type || ''}">${batch.batch_name}</option>`;
            });
        } else {
            batchSelect.innerHTML = '<option value="">No open batches for this course</option>';
        }
        // Reset scholarship field
        if (scholarshipSelect) {
            scholarshipSelect.disabled = false;
            scholarshipSelect.value = '';
        }
        // Helper to set scholarship based on batch
        function setScholarshipFromBatch() {
            const selectedOption = batchSelect.options[batchSelect.selectedIndex];
            const scholarship = selectedOption && selectedOption.getAttribute('data-scholarship');
            if (scholarship && scholarship !== 'null' && scholarship !== '') {
                scholarshipSelect.value = scholarship;
            } else {
                scholarshipSelect.value = '';
            }
        }
        batchSelect.onchange = setScholarshipFromBatch;
        setScholarshipFromBatch();
    }
    }



    document.getElementById('courseSelect').addEventListener('change', function() {
        populateBatches(this.value);
    });

    // --- Signature Pad Logic ---
    const canvas = document.getElementById('signatureCanvas');
    const signatureInput = document.getElementById('digitalSignatureInput');
    const signatureModal = new bootstrap.Modal(document.getElementById('signatureModal'));
    const signaturePreviewArea = document.getElementById('signaturePreviewArea');
    
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let isDrawing = false;

        // Resize canvas to match display size for correct coordinate mapping
        function resizeCanvas() {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#000';
        }
        window.addEventListener('resize', resizeCanvas);

        // Resize when modal is shown
        document.getElementById('signatureModal').addEventListener('shown.bs.modal', () => {
            // Clear any previous drawings and ensure it's ready
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            resizeCanvas();
            isDrawing = false; // Reset drawing state
        });

        signaturePreviewArea.addEventListener('click', () => signatureModal.show());

        function startDrawing(e) {
            isDrawing = true;
            draw(e);
        }

        function stopDrawing() {
            isDrawing = false;
            ctx.beginPath();
        }

        function draw(e) {
            if (!isDrawing) return;
            e.preventDefault(); // Prevent scrolling on touch

            const rect = canvas.getBoundingClientRect();
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        }

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseout', stopDrawing);

        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchmove', draw, { passive: false });

        document.getElementById('clearCanvasBtn').addEventListener('click', clearCanvas);

        function clearCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        document.getElementById('saveSignatureBtn').addEventListener('click', () => {
            const dataUrl = canvas.toDataURL('image/png');
            signatureInput.value = dataUrl;
            document.getElementById('signaturePreview').src = dataUrl;
            document.getElementById('signaturePreview').style.display = 'block';
            document.getElementById('signaturePlaceholder').style.display = 'none';
            document.getElementById('clearSignatureBtn').style.display = 'inline-block';
            signatureModal.hide();
        });

        document.getElementById('clearSignatureBtn').addEventListener('click', () => {
            signatureInput.value = '';
            document.getElementById('signaturePreview').style.display = 'none';
            document.getElementById('signaturePlaceholder').style.display = 'block';
            document.getElementById('clearSignatureBtn').style.display = 'none';
        });
    }

    // --- Form Submission ---
    document.getElementById('applicationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const birthdateInput = document.getElementById('birthdate');
        const ageValue = parseInt(document.getElementById('age').value, 10);
        if (!birthdateInput.value || isNaN(ageValue) || ageValue < 15) {
            Swal && Swal.fire ? Swal.fire('Invalid Birthdate', 'Applicants must be at least 15 years old. Please select a valid birthdate.', 'error') : alert('Applicants must be at least 15 years old. Please select a valid birthdate.');
            birthdateInput.focus();
            return;
        }
        if (!document.getElementById('digitalSignatureInput').value) {
            alert('Please sign the application form.');
            return;
        }
        const formData = new FormData(this);
        try {
            const response = await axios.post(`${API_BASE_URL}/public/submit_application.php`, formData);
            if (response.data.success) {
                alert('Application submitted successfully!');
                window.location.reload();
            } else {
                alert('Error: ' + response.data.message);
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('An error occurred while submitting the application.');
        }
    });

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

    // Initial load
    loadInitialData();
});