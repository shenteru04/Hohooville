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
        const select = document.getElementById('scholarshipSelect');
        select.innerHTML = '<option value="">Not a Scholar</option>';
        scholarships.forEach(s => {
            select.innerHTML += `<option value="${s.scholarship_name}">${s.scholarship_name}</option>`;
        });
    }

    function populateBatches(qualificationId) {
        const batchSelect = document.getElementById('batchSelect');
        batchSelect.innerHTML = '<option value="">Select a Batch</option>';
        if (!qualificationId) {
            batchSelect.innerHTML = '<option value="">Please select a course first</option>';
            return;
        }

        const relevantBatches = allBatches.filter(b => b.qualification_id == qualificationId);
        
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