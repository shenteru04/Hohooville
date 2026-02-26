document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

    // --- Global State ---
    let allCourses = [];
    let allBatches = [];
    let allScholarships = [];
    let isReturningTrainee = false;
    let phLocationData = {}; // Store PH location data

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

    // --- Section visibility + required handling ---
    function initRequiredMarkers(section) {
        if (!section) return;
        section.querySelectorAll('[required]').forEach(el => {
            el.dataset.wasRequired = '1';
        });
    }

    function setSectionVisibility(section, show) {
        if (!section) return;
        section.style.display = show ? 'block' : 'none';
        const fields = section.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            const wasRequired = field.dataset.wasRequired === '1';
            if (show) {
                field.disabled = false;
                if (wasRequired) field.setAttribute('required', '');
            } else {
                field.disabled = true;
                field.removeAttribute('required');
                if (field.type === 'file') field.value = '';
            }
        });
    }

    initRequiredMarkers(requirementsUploadSection);
    initRequiredMarkers(signatureSection);

    // --- Page Navigation (existing) ---
    window.nextPage = function() {
        const ageVal = parseInt(document.getElementById('age').value);
        if (isNaN(ageVal) || ageVal < 15) {
            const msg = 'Applicants must be at least 15 years old. Please select a valid birthdate.';
            typeof Swal !== 'undefined' ? Swal.fire('Invalid Birthdate', msg, 'error') : alert(msg);
            document.getElementById('birthdate').focus();
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
            
            if (age < 15) {
                const msg = 'Applicants must be at least 15 years old. Please select a valid birthdate.';
                typeof Swal !== 'undefined' ? Swal.fire('Invalid Birthdate', msg, 'error') : alert(msg);
                this.value = '';
                document.getElementById('age').value = '';
                return;
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
                
                // Clear previous timeout and hide error after 2 seconds
                clearTimeout(errorTimeout);
                errorTimeout = setTimeout(() => {
                    this.classList.remove('is-invalid');
                    errorMessage.style.display = 'none';
                }, 2000);
            }
        });
        
        phoneInput.addEventListener('input', function() {
            // Remove non-numeric characters in real-time (for paste)
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

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
            const schoolId = document.getElementById('check_school_id').value.trim();

            if (!schoolId) {
                Swal.fire('Required', 'Please fill in your Unique School ID.', 'warning');
                return;
            }

            continueBtn.disabled = true;
            preCheckSpinner.style.display = 'block';

            try {
                const response = await axios.get(`${API_BASE_URL}/public/submit_application.php`, {
                    params: {
                        action: 'check-trainee',
                        school_id: schoolId
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
                        Swal.fire('Not Found', 'ID not found. Please check your ID or proceed as a new applicant.', 'error');
                        preCheckSection.style.display = 'block';
                        applicationContainer.style.display = 'none';
                    }
                } else {
                    Swal.fire('Error', 'Error: ' + response.data.message, 'error');
                }
            } catch (error) {
                console.error('Failed to check trainee status:', error);
                Swal.fire('Error', 'An error occurred while checking your profile. Please try again.', 'error');
            } finally {
                continueBtn.disabled = false;
                preCheckSpinner.style.display = 'none';
            }
        });
    }

    const skipCheckBtn = document.getElementById('skipCheckBtn');
    if (skipCheckBtn) {
        skipCheckBtn.addEventListener('click', () => {
            preCheckSection.style.display = 'none';
            applicationContainer.style.display = 'block';
            isReturningTrainee = false;
            handleNewTrainee({});
        });
    }

    function handleNewTrainee(data) {
        if (data.lastName) document.querySelector('[name="last_name"]').value = data.lastName;
        if (data.firstName) document.querySelector('[name="first_name"]').value = data.firstName;
        if (data.email) document.querySelector('[name="email"]').value = data.email;
        
        setSectionVisibility(requirementsUploadSection, true);
        setSectionVisibility(signatureSection, true);
        
        populateCourses(allCourses);
        if (allCourses.length > 0) {
            populateBatches(allCourses[0].qualification_id);
        }
    }

    function handleReturningTrainee(traineeData) {
        welcomeBackMessage.style.display = 'block';
        setSectionVisibility(requirementsUploadSection, false);
        setSectionVisibility(signatureSection, false);

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
                if (key === 'birthplace_city') inputName = 'birthplace_city';
                if (key === 'birthplace_province') inputName = 'birthplace_province';
                if (key === 'birthplace_region') inputName = 'birthplace_region';
                if (key === 'city_municipality') inputName = 'city_municipality';
                if (key === 'barangay') inputName = 'barangay';
                if (key === 'birth_certificate_no') inputName = 'birth_certificate_no';

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

        // Helper to set dropdown value after options are loaded
        function setDropdownValue(selectElem, value, maxRetries = 10) {
            let retries = 0;
            function trySet() {
                if ([...selectElem.options].some(opt => opt.value === value)) {
                    selectElem.value = value;
                    selectElem.dispatchEvent(new Event('change'));
                } else if (retries < maxRetries) {
                    retries++;
                    setTimeout(trySet, 100);
                }
            }
            trySet();
        }

        // Special handling for dropdowns (Birthplace, Address)
        // Birthplace
        if (traineeData.birthplace_province) {
            const bpProvince = document.getElementById('birthplace_province');
            setDropdownValue(bpProvince, traineeData.birthplace_province);
        }
        if (traineeData.birthplace_city) {
            const bpCity = document.getElementById('birthplace_city');
            setDropdownValue(bpCity, traineeData.birthplace_city);
        }
        if (traineeData.birthplace_region) {
            const bpRegion = document.getElementById('birthplace_region');
            bpRegion.value = traineeData.birthplace_region;
        }
        // Address
        if (traineeData.province) {
            const addrProvince = document.getElementById('addr_province');
            setDropdownValue(addrProvince, traineeData.province);
        }
        if (traineeData.city_municipality) {
            const addrCity = document.getElementById('addr_city');
            setDropdownValue(addrCity, traineeData.city_municipality);
        }
        if (traineeData.barangay) {
            const addrBarangay = document.getElementById('addr_barangay');
            setDropdownValue(addrBarangay, traineeData.barangay);
        }
        if (traineeData.region) {
            const addrRegion = document.getElementById('addr_region');
            addrRegion.value = traineeData.region;
        }
        // Explicitly set district input value
        if (traineeData.district) {
            const addrDistrict = document.getElementById('addr_district');
            if (addrDistrict) addrDistrict.value = traineeData.district;
        }
        if (traineeData.birth_certificate_no) {
            const birthCert = document.querySelector('[name="birth_certificate_no"]');
            if (birthCert) birthCert.value = traineeData.birth_certificate_no;
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
                Swal.fire('Error', "Could not load application settings. Please try again later.", 'error');
            }
        } catch (error) {
            console.error("Error fetching form data:", error);
            Swal.fire('Network Error', "A network error occurred. Please check your connection and try again.", 'error');
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
        // No-op: Scholarship field is now a readonly input auto-populated by batch selection
    }

    function populateBatches(courseId) {
        const batchSelect = document.getElementById('batchSelect');
        batchSelect.innerHTML = '<option value="">Select a Batch</option>';
        const scholarshipInput = document.getElementById('scholarshipSelect');
        if (!courseId) {
            batchSelect.innerHTML = '<option value="">Select a course to see available batches</option>';
            if (scholarshipInput) scholarshipInput.value = '';
            return;
        }

        const relevantBatches = allBatches.filter(b => b.qualification_id == courseId);
        
        if (relevantBatches.length > 0) {
            relevantBatches.forEach(batch => {
                batchSelect.innerHTML += `<option value="${batch.batch_id}" data-scholarship="${batch.scholarship_type || ''}">${batch.batch_name}</option>`;
            });
        } else {
            batchSelect.innerHTML = '<option value="">No open batches for this qualification</option>';
        }

        // Reset and auto-populate scholarship based on selected batch
        if (scholarshipInput) scholarshipInput.value = '';
        function setScholarshipFromBatch() {
            if (!scholarshipInput) return;
            const selectedOption = batchSelect.options[batchSelect.selectedIndex];
            const scholarship = selectedOption && selectedOption.getAttribute('data-scholarship');
            if (scholarship && scholarship !== 'null' && scholarship !== '') {
                scholarshipInput.value = scholarship;
            } else {
                scholarshipInput.value = '';
            }
        }
        batchSelect.onchange = setScholarshipFromBatch;
        setScholarshipFromBatch();
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
                window.location.href = 'index.html?status=submitted';
            } else {
                Swal.fire('Submission Failed', response.data.message, 'error');
            }

        } catch (error) {
            console.error('Submission error:', error);
            let errorMessage = (error.response?.data?.message) || 'An unexpected error occurred.';
            Swal.fire('Submission Error', errorMessage, 'error');
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
                    Swal.fire('Missing Input', `Please make a selection for "${label.innerText.replace('*','').trim()}".`, 'warning');
                    input.focus();
                    return false;
                }
                
                // Mark this group as validated so we don't check it again
                validatedRadioGroups.add(groupName);
            } else if (!input.value) { // For text, select, date, etc.
                const label = input.closest('.mb-3, .col-md-3, .col-md-4, .col-md-6').querySelector('label');
                Swal.fire('Missing Input', `Please fill out the "${label.innerText.replace('*','').trim()}" field.`, 'warning');
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

    // --- NEW: Signature Method Toggle & Upload Logic ---
    const sigMethodDraw = document.getElementById('sigMethodDraw');
    const sigMethodUpload = document.getElementById('sigMethodUpload');
    const drawSection = document.getElementById('drawSignatureSection');
    const uploadSection = document.getElementById('uploadSignatureSection');
    const uploadInput = document.getElementById('signatureUploadInput');
    const uploadPreviewContainer = document.getElementById('uploadPreviewContainer');
    const uploadPreview = document.getElementById('uploadPreview');

    function resetSignatureState() {
        // Clear hidden input
        document.getElementById('digitalSignatureInput').value = '';
        
        // Clear Draw UI
        document.getElementById('signaturePreview').src = '';
        document.getElementById('signaturePreview').style.display = 'none';
        document.getElementById('signaturePlaceholder').style.display = 'block';
        document.getElementById('clearSignatureBtn').style.display = 'none';
        
        // Clear Upload UI
        if(uploadInput) uploadInput.value = '';
        if(uploadPreview) uploadPreview.src = '';
        if(uploadPreviewContainer) uploadPreviewContainer.style.display = 'none';

        // Update submit button state
        if(privacyConsent) privacyConsent.dispatchEvent(new Event('change'));
    }

    if (sigMethodDraw && sigMethodUpload) {
        sigMethodDraw.addEventListener('change', () => {
            if (sigMethodDraw.checked) {
                drawSection.style.display = 'block';
                uploadSection.style.display = 'none';
                resetSignatureState();
            }
        });
        sigMethodUpload.addEventListener('change', () => {
            if (sigMethodUpload.checked) {
                drawSection.style.display = 'none';
                uploadSection.style.display = 'block';
                resetSignatureState();
            }
        });
    }

    if (uploadInput) {
        uploadInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const res = evt.target.result;
                    document.getElementById('digitalSignatureInput').value = res;
                    uploadPreview.src = res;
                    uploadPreviewContainer.style.display = 'block';
                    
                    // Trigger validation check for submit button
                    if(privacyConsent) privacyConsent.dispatchEvent(new Event('change'));
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // --- NEW: PH Location Data Logic ---
    async function loadPhAddressData() {
        try {
            // Fetching data from a reliable GitHub source
            const response = await axios.get('https://raw.githubusercontent.com/flores-jacob/philippine-regions-provinces-cities-municipalities-barangays/master/philippine_provinces_cities_municipalities_and_barangays_2019v2.json');
            phLocationData = response.data;
            
            populateAddressDropdowns();
            populateBirthplaceDropdowns();
        } catch (error) {
            console.error('Error loading PH location data:', error);
        }
    }

    function populateAddressDropdowns() {
        const regionInput = document.getElementById('addr_region');
        const provinceSelect = document.getElementById('addr_province');
        const citySelect = document.getElementById('addr_city');
        const barangaySelect = document.getElementById('addr_barangay');
        const districtInput = document.getElementById('addr_district');

        // Flatten provinces
        const allProvinces = [];
        for (const rKey in phLocationData) {
            const regionName = phLocationData[rKey].region_name;
            const provinces = phLocationData[rKey].province_list;
            for (const pName in provinces) {
                allProvinces.push({ name: pName, region: regionName, regionKey: rKey });
            }
        }
        allProvinces.sort((a, b) => a.name.localeCompare(b.name));

        // Populate Province Select
        provinceSelect.innerHTML = '<option value="">Select Province</option>';
        allProvinces.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.text = p.name;
            opt.dataset.region = p.region;
            opt.dataset.regionKey = p.regionKey;
            provinceSelect.appendChild(opt);
        });

        // Province Change Listener
        provinceSelect.addEventListener('change', function() {
            citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
            barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
            regionInput.value = '';
            if (districtInput) districtInput.value = '';
            
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value) {
                // Auto-populate Region
                regionInput.value = selectedOption.dataset.region;

                // Populate Cities
                const rKey = selectedOption.dataset.regionKey;
                const pName = this.value;
                const municipalities = phLocationData[rKey].province_list[pName].municipality_list;
                const cityNames = Object.keys(municipalities).sort();
                
                cityNames.forEach(muniName => {
                    citySelect.innerHTML += `<option value="${muniName}">${muniName}</option>`;
                });
            }
        });

        // City Change Listener
        citySelect.addEventListener('change', function() {
            barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
            if (districtInput) districtInput.value = '';
            
            const selectedProvOption = provinceSelect.options[provinceSelect.selectedIndex];
            if (!selectedProvOption.value) return;

            const regionKey = selectedProvOption.dataset.regionKey;
            const provName = provinceSelect.value;
            const muniName = this.value;
            
            if (regionKey && provName && muniName) {
                const barangays = phLocationData[regionKey].province_list[provName].municipality_list[muniName].barangay_list;
                barangays.sort();
                barangays.forEach(brgy => {
                    barangaySelect.innerHTML += `<option value="${brgy}">${brgy}</option>`;
                });
            }
        });
    }

    function populateBirthplaceDropdowns() {
        const bpProvince = document.getElementById('birthplace_province');
        const bpCity = document.getElementById('birthplace_city');
        const bpRegion = document.getElementById('birthplace_region');

        // Flatten provinces for Birthplace (since user might not know region first)
        const allProvinces = [];
        for (const rKey in phLocationData) {
            const regionName = phLocationData[rKey].region_name;
            const provinces = phLocationData[rKey].province_list;
            for (const pName in provinces) {
                allProvinces.push({ name: pName, region: regionName, regionKey: rKey });
            }
        }
        
        // Sort and populate
        allProvinces.sort((a, b) => a.name.localeCompare(b.name));
        allProvinces.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.text = p.name;
            opt.dataset.region = p.region;
            opt.dataset.regionKey = p.regionKey;
            bpProvince.appendChild(opt);
        });

        // Birthplace Province Change
        bpProvince.addEventListener('change', function() {
            bpCity.innerHTML = '<option value="">Select City</option>';
            bpRegion.value = '';

            const selectedOpt = this.options[this.selectedIndex];
            if (selectedOpt.value) {
                // Auto-populate Region
                bpRegion.value = selectedOpt.dataset.region;

                // Populate Cities
                const rKey = selectedOpt.dataset.regionKey;
                const pName = this.value;
                const municipalities = phLocationData[rKey].province_list[pName].municipality_list;
                
                for (const mName in municipalities) {
                    bpCity.innerHTML += `<option value="${mName}">${mName}</option>`;
                }
            }
        });
    }

    // --- Initial Load ---
    loadInitialData();
    loadPhAddressData();
});
