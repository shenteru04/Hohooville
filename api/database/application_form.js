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
    let isPhLocationDataReady = false;
    let pendingReturningTraineeData = null;
    let pendingDraftFormValues = null;
    let hasRestoredSavedProgress = false;
    let isRestoringSavedProgress = false;
    let draftSaveTimer = null;
    const APPLICATION_DRAFT_STORAGE_KEY = 'hohooville_application_form_progress_v1';

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
    const phoneInput = document.getElementById('phoneInput');
    const emailInput = document.getElementById('emailInput');
    const phoneError = document.getElementById('phoneError');
    const emailError = document.getElementById('emailError');
    const checkSchoolIdInput = document.getElementById('check_school_id');

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

    function getCurrentStepNumber() {
        return document.getElementById('step2').style.display === 'block' ? 2 : 1;
    }

    function setCurrentStepNumber(stepNumber = 1) {
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        if (!step1 || !step2) return;

        if (Number(stepNumber) === 2) {
            step1.style.display = 'none';
            step2.style.display = 'block';
        } else {
            step2.style.display = 'none';
            step1.style.display = 'block';
        }
    }

    function getFieldElementsByName(name) {
        return Array.from(applicationForm?.elements || []).filter(field => field && field.name === name);
    }

    function serializeFormValues() {
        const values = {};
        const checkboxCollections = new Map();

        Array.from(applicationForm?.elements || []).forEach(field => {
            if (!field || !field.name || field.type === 'file') {
                return;
            }

            if (field.type === 'radio') {
                if (field.checked) {
                    values[field.name] = field.value;
                } else if (!(field.name in values)) {
                    values[field.name] = '';
                }
                return;
            }

            if (field.type === 'checkbox') {
                if (field.name.endsWith('[]')) {
                    if (!checkboxCollections.has(field.name)) {
                        checkboxCollections.set(field.name, []);
                    }
                    if (field.checked) {
                        checkboxCollections.get(field.name).push(field.value);
                    }
                } else {
                    values[field.name] = Boolean(field.checked);
                }
                return;
            }

            values[field.name] = field.value;
        });

        checkboxCollections.forEach((items, name) => {
            values[name] = items;
        });

        return values;
    }

    function restoreSimpleFormValues(values = {}) {
        const deferredFieldNames = new Set([
            'birthplace_province',
            'birthplace_city',
            'birthplace_region',
            'province',
            'city_municipality',
            'barangay',
            'region',
            'district',
            'qualification_id',
            'batch_id'
        ]);

        Object.entries(values).forEach(([name, value]) => {
            if (deferredFieldNames.has(name)) return;

            const fields = getFieldElementsByName(name);
            if (!fields.length) return;

            const [firstField] = fields;

            if (firstField.type === 'radio') {
                fields.forEach(field => {
                    field.checked = String(field.value) === String(value || '');
                });
                return;
            }

            if (firstField.type === 'checkbox') {
                if (name.endsWith('[]')) {
                    const selectedValues = Array.isArray(value) ? value.map(String) : [];
                    fields.forEach(field => {
                        field.checked = selectedValues.includes(String(field.value));
                    });
                } else {
                    firstField.checked = Boolean(value);
                }
                return;
            }

            firstField.value = value ?? '';
        });
    }

    function restoreSignaturePresentation(values = {}) {
        const savedSignatureMethod = values.signatureMethod === 'upload' ? 'upload' : 'draw';
        const savedSignatureData = String(values.digital_signature || '').trim();
        const signaturePreview = document.getElementById('signaturePreview');
        const signaturePlaceholder = document.getElementById('signaturePlaceholder');
        const clearSignatureBtn = document.getElementById('clearSignatureBtn');
        const digitalSignatureInput = document.getElementById('digitalSignatureInput');

        if (sigMethodDraw && sigMethodUpload && drawSection && uploadSection) {
            sigMethodDraw.checked = savedSignatureMethod !== 'upload';
            sigMethodUpload.checked = savedSignatureMethod === 'upload';
            drawSection.style.display = savedSignatureMethod === 'upload' ? 'none' : 'block';
            uploadSection.style.display = savedSignatureMethod === 'upload' ? 'block' : 'none';
        }

        if (digitalSignatureInput) {
            digitalSignatureInput.value = savedSignatureData;
        }

        if (!savedSignatureData) {
            if (signaturePreview) {
                signaturePreview.src = '';
                signaturePreview.style.display = 'none';
            }
            if (signaturePlaceholder) signaturePlaceholder.style.display = 'block';
            if (clearSignatureBtn) clearSignatureBtn.style.display = 'none';
            if (uploadPreview) uploadPreview.src = '';
            if (uploadPreviewContainer) uploadPreviewContainer.style.display = 'none';
            return;
        }

        if (savedSignatureMethod === 'upload') {
            if (uploadPreview) uploadPreview.src = savedSignatureData;
            if (uploadPreviewContainer) uploadPreviewContainer.style.display = 'block';
            if (signaturePreview) {
                signaturePreview.src = '';
                signaturePreview.style.display = 'none';
            }
            if (signaturePlaceholder) signaturePlaceholder.style.display = 'block';
            if (clearSignatureBtn) clearSignatureBtn.style.display = 'none';
        } else {
            if (signaturePreview) {
                signaturePreview.src = savedSignatureData;
                signaturePreview.style.display = 'block';
            }
            if (signaturePlaceholder) signaturePlaceholder.style.display = 'none';
            if (clearSignatureBtn) clearSignatureBtn.style.display = 'inline-block';
            if (uploadPreview) uploadPreview.src = '';
            if (uploadPreviewContainer) uploadPreviewContainer.style.display = 'none';
        }
    }

    function restoreCourseAndBatchSelection(values = {}) {
        const courseSelect = document.getElementById('courseSelect');
        const batchSelect = document.getElementById('batchSelect');
        if (!courseSelect || !batchSelect) return;

        const desiredCourseId = String(values.qualification_id || '').trim();
        if (desiredCourseId && Array.from(courseSelect.options).some(option => option.value === desiredCourseId)) {
            courseSelect.value = desiredCourseId;
        }

        updateCourseNcLevelHint(courseSelect.value);
        populateBatches(courseSelect.value);

        const desiredBatchId = String(values.batch_id || '').trim();
        if (desiredBatchId && Array.from(batchSelect.options).some(option => option.value === desiredBatchId)) {
            batchSelect.value = desiredBatchId;
            if (typeof batchSelect.onchange === 'function') {
                batchSelect.onchange();
            } else {
                batchSelect.dispatchEvent(new Event('change'));
            }
        }
    }

    function getApplicationFlowMode() {
        if (applicationContainer.style.display === 'none') {
            return 'precheck';
        }

        return isReturningTrainee ? 'returning' : 'new';
    }

    function clearSavedApplicationProgress() {
        window.sessionStorage.removeItem(APPLICATION_DRAFT_STORAGE_KEY);
    }

    function saveApplicationProgress() {
        if (isRestoringSavedProgress) return;

        const payload = {
            updatedAt: Date.now(),
            flowMode: getApplicationFlowMode(),
            currentStep: getCurrentStepNumber(),
            preCheckSchoolId: checkSchoolIdInput?.value?.trim() || '',
            isReturningTrainee: Boolean(isReturningTrainee),
            returningTraineeData: pendingReturningTraineeData || null,
            values: serializeFormValues()
        };

        window.sessionStorage.setItem(APPLICATION_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    }

    function queueApplicationProgressSave() {
        if (isRestoringSavedProgress) return;

        window.clearTimeout(draftSaveTimer);
        draftSaveTimer = window.setTimeout(() => {
            saveApplicationProgress();
        }, 120);
    }

    function restoreSavedApplicationProgress() {
        if (hasRestoredSavedProgress) return;
        hasRestoredSavedProgress = true;

        const rawState = window.sessionStorage.getItem(APPLICATION_DRAFT_STORAGE_KEY);
        if (!rawState) return;

        try {
            const state = JSON.parse(rawState);
            const values = state?.values && typeof state.values === 'object' ? state.values : {};

            pendingDraftFormValues = values;
            isRestoringSavedProgress = true;

            if (checkSchoolIdInput) {
                checkSchoolIdInput.value = state?.preCheckSchoolId || '';
            }

            const flowMode = state?.flowMode || 'precheck';
            if (flowMode === 'returning' && state?.returningTraineeData) {
                preCheckSection.style.display = 'none';
                applicationContainer.style.display = 'block';
                handleReturningTrainee(state.returningTraineeData);
            } else if (flowMode === 'new') {
                preCheckSection.style.display = 'none';
                applicationContainer.style.display = 'block';
                handleNewTrainee({});
            }

            restoreSimpleFormValues(values);
            syncReturningTraineeLocationFields(values);
            restoreCourseAndBatchSelection(values);
            restoreSignaturePresentation(values);
            setCurrentStepNumber(state?.currentStep || 1);

            document.getElementById('employmentStatus')?.dispatchEvent(new Event('change'));
            document.querySelector(`input[name="is_pwd"]:checked`)?.dispatchEvent(new Event('change'));
            if (privacyConsent) privacyConsent.dispatchEvent(new Event('change'));
        } catch (error) {
            console.error('Failed to restore saved application progress:', error);
            clearSavedApplicationProgress();
        } finally {
            isRestoringSavedProgress = false;
        }
    }

    initRequiredMarkers(requirementsUploadSection);
    initRequiredMarkers(signatureSection);

    function normalizeLocationLabel(value = '') {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function levenshteinDistance(a = '', b = '') {
        const source = String(a);
        const target = String(b);

        if (!source.length) return target.length;
        if (!target.length) return source.length;

        const previous = Array.from({ length: target.length + 1 }, (_, index) => index);
        const current = new Array(target.length + 1).fill(0);

        for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
            current[0] = sourceIndex;
            for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
                const substitutionCost = source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
                current[targetIndex] = Math.min(
                    current[targetIndex - 1] + 1,
                    previous[targetIndex] + 1,
                    previous[targetIndex - 1] + substitutionCost
                );
            }

            for (let targetIndex = 0; targetIndex < previous.length; targetIndex += 1) {
                previous[targetIndex] = current[targetIndex];
            }
        }

        return previous[target.length];
    }

    function findBestSelectOption(selectElem, targetValue) {
        if (!selectElem) return null;

        const rawTarget = String(targetValue || '').trim();
        if (!rawTarget) return null;

        const options = Array.from(selectElem.options || []).filter(option => String(option.value || '').trim() !== '');
        if (!options.length) return null;

        const exactMatch = options.find(option => String(option.value || '').trim() === rawTarget || String(option.text || '').trim() === rawTarget);
        if (exactMatch) return exactMatch;

        const normalizedTarget = normalizeLocationLabel(rawTarget);
        const normalizedMatch = options.find(option => {
            return normalizeLocationLabel(option.value) === normalizedTarget || normalizeLocationLabel(option.text) === normalizedTarget;
        });
        if (normalizedMatch) return normalizedMatch;

        let bestMatch = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        options.forEach(option => {
            const normalizedOption = normalizeLocationLabel(option.value || option.text);
            if (!normalizedOption) return;

            const distance = levenshteinDistance(normalizedTarget, normalizedOption);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = option;
            }
        });

        const distanceThreshold = normalizedTarget.length <= 6 ? 1 : normalizedTarget.length <= 14 ? 2 : 3;
        return bestDistance <= distanceThreshold ? bestMatch : null;
    }

    function appendAndSelectOption(selectElem, value) {
        if (!selectElem) return null;

        const rawValue = String(value || '').trim();
        if (!rawValue) return null;

        const existingOption = findBestSelectOption(selectElem, rawValue);
        if (existingOption) {
            selectElem.value = existingOption.value;
            return existingOption;
        }

        const option = document.createElement('option');
        option.value = rawValue;
        option.text = rawValue;
        option.dataset.injected = '1';
        selectElem.appendChild(option);
        selectElem.value = rawValue;
        return option;
    }

    function setSelectValueSafely(selectElem, value) {
        if (!selectElem) {
            return { matched: false, option: null };
        }

        const matchedOption = findBestSelectOption(selectElem, value);
        if (matchedOption) {
            selectElem.value = matchedOption.value;
            return { matched: true, option: matchedOption };
        }

        return { matched: false, option: appendAndSelectOption(selectElem, value) };
    }

    function syncReturningTraineeLocationFields(traineeData = pendingReturningTraineeData) {
        if (!traineeData) return;

        const bpProvince = document.getElementById('birthplace_province');
        const bpCity = document.getElementById('birthplace_city');
        const bpRegion = document.getElementById('birthplace_region');
        const addrProvince = document.getElementById('addr_province');
        const addrCity = document.getElementById('addr_city');
        const addrBarangay = document.getElementById('addr_barangay');
        const addrRegion = document.getElementById('addr_region');
        const addrDistrict = document.getElementById('addr_district');

        if (traineeData.birthplace_province && bpProvince) {
            const provinceResult = setSelectValueSafely(bpProvince, traineeData.birthplace_province);
            if (provinceResult.matched) {
                bpProvince.dispatchEvent(new Event('change'));
            } else if (bpCity && traineeData.birthplace_city) {
                appendAndSelectOption(bpCity, traineeData.birthplace_city);
            }
        }

        if (traineeData.birthplace_city && bpCity) {
            setSelectValueSafely(bpCity, traineeData.birthplace_city);
        }

        if (bpRegion) {
            bpRegion.value = traineeData.birthplace_region || bpRegion.value || '';
        }

        if (traineeData.province && addrProvince) {
            const provinceResult = setSelectValueSafely(addrProvince, traineeData.province);
            if (provinceResult.matched) {
                addrProvince.dispatchEvent(new Event('change'));
            } else if (addrCity && traineeData.city_municipality) {
                appendAndSelectOption(addrCity, traineeData.city_municipality);
            }
        }

        if (traineeData.city_municipality && addrCity) {
            const cityResult = setSelectValueSafely(addrCity, traineeData.city_municipality);
            if (cityResult.matched) {
                addrCity.dispatchEvent(new Event('change'));
            } else if (addrBarangay && traineeData.barangay) {
                appendAndSelectOption(addrBarangay, traineeData.barangay);
            }
        }

        if (traineeData.barangay && addrBarangay) {
            setSelectValueSafely(addrBarangay, traineeData.barangay);
        }

        if (addrRegion) {
            addrRegion.value = traineeData.region || addrRegion.value || '';
        }

        if (addrDistrict) {
            addrDistrict.value = traineeData.district || addrDistrict.value || '';
        }
    }

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
            queueApplicationProgressSave();
            window.scrollTo(0, 0);
        }
    }

    window.prevPage = function() {
        document.getElementById('step2').style.display = 'none';
        document.getElementById('step1').style.display = 'block';
        queueApplicationProgressSave();
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

    function showFieldError(input, errorEl, message) {
        if (!input) return;
        input.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    function clearFieldError(input, errorEl) {
        if (!input) return;
        input.classList.remove('is-invalid');
        input.removeAttribute('aria-invalid');
        input.setCustomValidity('');
        if (errorEl) errorEl.style.display = 'none';
    }

    function validatePhilippinePhone(showInline = true) {
        if (!phoneInput || phoneInput.disabled) return true;

        const normalizedPhone = phoneInput.value.replace(/\D/g, '').slice(0, 11);
        phoneInput.value = normalizedPhone;

        if (!normalizedPhone) {
            clearFieldError(phoneInput, phoneError);
            return true;
        }

        if (!/^09\d{9}$/.test(normalizedPhone)) {
            const message = 'Enter a valid Philippine mobile number in 11 digits, starting with 09.';
            phoneInput.setCustomValidity(message);
            if (showInline) showFieldError(phoneInput, phoneError, message);
            return false;
        }

        clearFieldError(phoneInput, phoneError);
        return true;
    }

    function validateEmailAddress(showInline = true) {
        if (!emailInput || emailInput.disabled) return true;

        const normalizedEmail = emailInput.value.trim();
        emailInput.value = normalizedEmail;

        if (!normalizedEmail) {
            clearFieldError(emailInput, emailError);
            return true;
        }

        const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailPattern.test(normalizedEmail)) {
            const message = 'Enter a valid email address.';
            emailInput.setCustomValidity(message);
            if (showInline) showFieldError(emailInput, emailError, message);
            return false;
        }

        clearFieldError(emailInput, emailError);
        return true;
    }

    if (phoneInput) {
        phoneInput.addEventListener('beforeinput', function(e) {
            if (e.data && /\D/.test(e.data)) {
                e.preventDefault();
            }
        });

        phoneInput.addEventListener('input', function() {
            validatePhilippinePhone(true);
        });

        phoneInput.addEventListener('blur', function() {
            validatePhilippinePhone(true);
        });
    }

    if (emailInput) {
        emailInput.addEventListener('input', function() {
            validateEmailAddress(true);
        });

        emailInput.addEventListener('blur', function() {
            validateEmailAddress(true);
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
                        queueApplicationProgressSave();
                    } else {
                        isReturningTrainee = false;
                        Swal.fire('Not Found', 'ID not found. Please check your ID or proceed as a new applicant.', 'error');
                        preCheckSection.style.display = 'block';
                        applicationContainer.style.display = 'none';
                        queueApplicationProgressSave();
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
            queueApplicationProgressSave();
        });
    }

    function handleNewTrainee(data) {
        pendingReturningTraineeData = null;
        if (data.lastName) document.querySelector('[name="last_name"]').value = data.lastName;
        if (data.firstName) document.querySelector('[name="first_name"]').value = data.firstName;
        if (data.email) document.querySelector('[name="email"]').value = data.email;
        
        setSectionVisibility(requirementsUploadSection, true);
        setSectionVisibility(signatureSection, true);
        
        populateCourses(allCourses);
        if (allCourses.length > 0) {
            populateBatches(allCourses[0].qualification_id);
        }
        queueApplicationProgressSave();
    }

    function handleReturningTrainee(traineeData) {
        pendingReturningTraineeData = traineeData;
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

        syncReturningTraineeLocationFields(traineeData);
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
        queueApplicationProgressSave();
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
                restoreSavedApplicationProgress();
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
                const option = document.createElement('option');
                option.value = qualification.qualification_id;
                option.textContent = formatCourseOptionLabel(qualification);
                option.dataset.ncLevel = qualification.nc_level || '';
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">No new courses available for enrollment</option>';
        }
        updateCourseNcLevelHint(select.value);
    }

    function formatCourseOptionLabel(course = {}) {
        const courseName = String(course.course_name || '').trim();
        const ncLevel = String(course.nc_level || '').trim();
        return ncLevel ? `${courseName} (${ncLevel})` : courseName;
    }

    function updateCourseNcLevelHint(courseId = '') {
        const hintEl = document.getElementById('courseNcLevelHint');
        if (!hintEl) return;

        const selectedCourse = allCourses.find(course => String(course.qualification_id) === String(courseId || ''));
        const ncLevel = String(selectedCourse?.nc_level || '').trim();

        hintEl.textContent = ncLevel
            ? `Selected NC Level: ${ncLevel}`
            : 'NC level will appear here after you choose a qualification.';
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
            queueApplicationProgressSave();
        }
        batchSelect.onchange = setScholarshipFromBatch;
        setScholarshipFromBatch();
    }

    document.getElementById('courseSelect').addEventListener('change', function() {
        populateBatches(this.value);
        updateCourseNcLevelHint(this.value);
        queueApplicationProgressSave();
    });

    // --- NEW: Form Submission Logic ---
    applicationForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const isPhoneValid = validatePhilippinePhone(true);
        const isEmailValid = validateEmailAddress(true);
        if (!isPhoneValid || !isEmailValid) {
            const invalidInput = !isPhoneValid ? phoneInput : emailInput;
            const invalidMessage = !isPhoneValid
                ? 'Please enter a valid Philippine mobile number with 11 digits starting with 09.'
                : 'Please enter a valid email address.';
            Swal.fire('Invalid Input', invalidMessage, 'warning');
            invalidInput?.focus();
            return;
        }

        if (isReturningTrainee) {
            const step1Inputs = document.querySelectorAll('#step1 input, #step1 select, #step1 textarea');
            step1Inputs.forEach(input => input.disabled = false);
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white align-[-2px]"></span> <span class="ml-2">Submitting...</span>';

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
                clearSavedApplicationProgress();
                window.location.href = 'index.html?status=submitted';
            } else {
                Swal.fire('Submission Failed', response.data.message, 'error');
            }

        } catch (error) {
            console.error('Submission error:', error);
            let errorMessage = (error.response?.data?.message) || 'An unexpected error occurred.';
            Swal.fire('Submission Error', errorMessage, 'error');
        } finally {
            const sigInput = document.getElementById('digitalSignatureInput');
            const isSignatureProvided = isReturningTrainee || (sigInput && sigInput.value !== '');
            submitBtn.disabled = !privacyConsent.checked || !isSignatureProvided;
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

        if (!validatePhilippinePhone(true)) {
            Swal.fire('Invalid Contact Number', 'Please enter a valid Philippine mobile number with 11 digits starting with 09.', 'warning');
            phoneInput?.focus();
            return false;
        }

        if (!validateEmailAddress(true)) {
            Swal.fire('Invalid Email Address', 'Please enter a valid email address.', 'warning');
            emailInput?.focus();
            return false;
        }

        return true;
    }

    // --- NEW: Signature Pad Logic ---
    const signatureModalElement = document.getElementById('signatureModal');
    const signatureModal = {
        show() {
            if (!signatureModalElement) return;
            signatureModalElement.style.display = 'flex';
            signatureModalElement.classList.add('show');
            signatureModalElement.setAttribute('aria-hidden', 'false');
            document.body.classList.add('overflow-hidden');
        },
        hide() {
            if (!signatureModalElement) return;
            signatureModalElement.classList.remove('show');
            signatureModalElement.style.display = 'none';
            signatureModalElement.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('overflow-hidden');
        }
    };

    signatureModalElement?.querySelectorAll('[data-modal-close="signatureModal"]').forEach((button) => {
        button.addEventListener('click', () => signatureModal.hide());
    });
    signatureModalElement?.addEventListener('click', (event) => {
        if (event.target === signatureModalElement) {
            signatureModal.hide();
        }
    });

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
        queueApplicationProgressSave();
    });

    document.getElementById('signaturePreviewArea').addEventListener('click', () => signatureModal.show());

    document.getElementById('clearSignatureBtn').addEventListener('click', () => {
        const signaturePreview = document.getElementById('signaturePreview');
        signaturePreview.src = '';
        signaturePreview.style.display = 'none';
        document.getElementById('signaturePlaceholder').style.display = 'block';
        document.getElementById('clearSignatureBtn').style.display = 'none';
        document.getElementById('digitalSignatureInput').value = '';
        submitBtn.disabled = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        queueApplicationProgressSave();
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
                queueApplicationProgressSave();
            }
        });
        sigMethodUpload.addEventListener('change', () => {
            if (sigMethodUpload.checked) {
                drawSection.style.display = 'none';
                uploadSection.style.display = 'block';
                resetSignatureState();
                queueApplicationProgressSave();
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
                    queueApplicationProgressSave();
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
            isPhLocationDataReady = true;
            if (pendingDraftFormValues) {
                syncReturningTraineeLocationFields(pendingDraftFormValues);
            }
            syncReturningTraineeLocationFields();
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
            queueApplicationProgressSave();
        });
    }

    if (checkSchoolIdInput) {
        checkSchoolIdInput.addEventListener('input', queueApplicationProgressSave);
        checkSchoolIdInput.addEventListener('change', queueApplicationProgressSave);
    }

    if (applicationForm) {
        applicationForm.addEventListener('input', (event) => {
            if (event.target?.type === 'file') return;
            queueApplicationProgressSave();
        });

        applicationForm.addEventListener('change', (event) => {
            if (event.target?.type === 'file') return;
            queueApplicationProgressSave();
        });
    }

    window.addEventListener('beforeunload', saveApplicationProgress);

    // --- Initial Load ---
    loadInitialData();
    loadPhAddressData();
});
