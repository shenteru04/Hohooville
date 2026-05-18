let currentFileToken = null;
const BULK_IMPORT_API = `${window.location.origin}/Hohoo-ville/api/role/admin/bulk_import.php`;

const TEMPLATE_SCHEMAS = {
    trainee: {
        title: 'Trainee Bulk Import',
        description: 'Matches the trainee header, detail, feature, and enrollment tables in the current SQL schema.',
        requiredFields: [
            'First Name',
            'Last Name',
            'Sex',
            'Birthdate',
            'Civil Status',
            'House No/Street',
            'Barangay',
            'City/Municipality',
            'Province',
            'Educational Attainment',
            'Employment Status',
            'Learner Classification',
            'Qualification'
        ],
        optionalFields: [
            'Middle Name',
            'Extension Name',
            'Email',
            'Phone Number',
            'Birth Certificate No',
            'Facebook Account',
            'Nationality',
            'District',
            'Region',
            'Birthplace City',
            'Birthplace Province',
            'Birthplace Region',
            'Employment Type',
            'Is PWD',
            'Disability Type',
            'Disability Cause',
            'Batch Name',
            'Scholarship Type',
            'Enrollment Status',
            'Enrollment Date',
            'Privacy Consent',
            'Trainee Status'
        ],
        notes: [
            'Qualification and batch names must already exist in the database.',
            'If the same qualification name exists in multiple NC levels, use the full label such as Cookery NC II.',
            'Trainee user accounts and document files are not created by CSV import.',
            'If Enrollment Status is blank, the importer uses approved when a batch is provided, otherwise pending.',
            'Birthdate accepts common formats such as YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, and DD-MM-YYYY.'
        ],
        headers: [
            'First Name',
            'Middle Name',
            'Last Name',
            'Extension Name',
            'Email',
            'Phone Number',
            'Sex',
            'Birthdate',
            'Civil Status',
            'Birth Certificate No',
            'Facebook Account',
            'Nationality',
            'House No/Street',
            'Barangay',
            'District',
            'City/Municipality',
            'Province',
            'Region',
            'Birthplace City',
            'Birthplace Province',
            'Birthplace Region',
            'Educational Attainment',
            'Employment Status',
            'Employment Type',
            'Learner Classification',
            'Is PWD',
            'Disability Type',
            'Disability Cause',
            'Qualification',
            'Batch Name',
            'Scholarship Type',
            'Enrollment Status',
            'Enrollment Date',
            'Privacy Consent',
            'Trainee Status'
        ],
        sample: [
            'Angela',
            'Gonzales',
            'Ramos',
            'Sr.',
            'angela.ramos@example.com',
            '09566296161',
            'Female',
            '1995-04-25',
            'Single',
            'BC123456789',
            'facebook_angela',
            'Filipino',
            '173 Road',
            'Barangay Camarin',
            '1st District',
            'Caloocan City',
            'Metro Manila',
            'NCR',
            'Quezon City',
            'Metro Manila',
            'NCR',
            'Senior High (K-12)',
            'Wage-Employed',
            'Regular',
            'Worker',
            'No',
            '',
            '',
            'Shielded Metal Arc Welding (SMAW) NC II',
            'Shielded Metal Arc Welding (SMAW) NC II - Batch 1',
            'TTSP',
            'approved',
            '2026-04-20 08:30:00',
            'Yes',
            'active'
        ]
    },
    trainer: {
        title: 'Trainer Bulk Import',
        description: 'Matches the trainer, trainer address, trainer qualifications, and trainer user-account structure from the current SQL schema.',
        requiredFields: [
            'First Name',
            'Last Name',
            'Qualifications'
        ],
        optionalFields: [
            'Email',
            'Phone Number',
            'Username',
            'Password',
            'NC Levels',
            'NTTC No',
            'House No/Street',
            'Barangay',
            'District',
            'City/Municipality',
            'Province',
            'Region',
            'Address',
            'Trainer Status'
        ],
        notes: [
            'Use the Qualifications column for one or more qualification names separated by |.',
            'When a qualification name exists in multiple NC levels, use the full label such as Cookery NC II.',
            'If NC Levels is provided for multiple qualifications, keep the same | order as the Qualifications column.',
            'Trainer CSV import creates a user account; Password defaults to password123 when left blank.',
            'Trainer document files such as NTTC, TM, NC, and experience files are not uploaded through CSV import.'
        ],
        headers: [
            'First Name',
            'Last Name',
            'Email',
            'Phone Number',
            'Username',
            'Password',
            'Qualifications',
            'NC Levels',
            'NTTC No',
            'House No/Street',
            'Barangay',
            'District',
            'City/Municipality',
            'Province',
            'Region',
            'Address',
            'Trainer Status'
        ],
        sample: [
            'Jane',
            'Smith',
            'jane.smith@example.com',
            '09987654321',
            'jane.smith',
            'ChangeMe123',
            'Cookery NC II|Driving 101 NC II',
            'NC II|NC II',
            'NTTC-2026-0001',
            '456 Trainer Ave',
            'Barangay 10',
            'District 2',
            'Cagayan de Oro City',
            'Misamis Oriental',
            'REGION X',
            '',
            'active'
        ]
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    await ensureSwal();
    initUserDropdown();
    initLogout();
    bindDropZoneEvents();
    updateTemplate();
});

async function ensureSwal() {
    if (typeof window.Swal !== 'undefined') return;
    await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
    });
}

function initUserDropdown() {
    const button = document.getElementById('userDropdown');
    const menu = document.getElementById('userDropdownMenu');
    if (!button || !menu) return;

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#userDropdown') && !event.target.closest('#userDropdownMenu')) {
            menu.classList.add('hidden');
        }
    });
}

async function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        await ensureSwal();

        Swal.fire({
            title: 'Logout Confirmation',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Logout',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then((result) => {
            if (result.isConfirmed) {
                if (typeof window.logout === 'function') {
                    window.logout();
                    return;
                }
                localStorage.clear();
                window.location.href = '/Hohoo-ville/frontend/login.html';
            }
        });
    });
}

function bindDropZoneEvents() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('dragover');

        const file = event.dataTransfer?.files?.[0];
        if (!file) return;

        if (!isCsvFile(file)) {
            showAlert('Invalid File', 'Please upload a CSV file.', 'warning');
            return;
        }

        uploadFile(file);
    });
}

function getCurrentUserType() {
    return document.querySelector('input[name="userType"]:checked')?.value || 'trainee';
}

function getCurrentTemplateSchema() {
    return TEMPLATE_SCHEMAS[getCurrentUserType()] || TEMPLATE_SCHEMAS.trainee;
}

function updateTemplate() {
    const schema = getCurrentTemplateSchema();

    setTextContent('templateTitle', schema.title);
    setTextContent('templateDescription', schema.description);
    setTextContent('templateRequiredCount', `${schema.requiredFields.length} required columns`);
    renderFieldList('templateRequiredFields', schema.requiredFields, 'bg-sky-100 text-sky-800');
    renderFieldList('templateOptionalFields', schema.optionalFields, 'bg-slate-200 text-slate-700');
    renderNotes('templateNotes', schema.notes);
}

function renderFieldList(id, fields, className) {
    const container = document.getElementById(id);
    if (!container) return;

    container.innerHTML = fields.map((field) => `
        <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}">
            ${escapeHtml(field)}
        </span>
    `).join('');
}

function renderNotes(id, notes) {
    const container = document.getElementById(id);
    if (!container) return;

    container.innerHTML = notes.map((note) => `
        <li class="flex items-start gap-2">
            <span class="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            <span>${escapeHtml(note)}</span>
        </li>
    `).join('');
}

function downloadTemplate() {
    const userType = getCurrentUserType();
    const schema = getCurrentTemplateSchema();
    const lines = [
        schema.headers.map(csvEscape).join(','),
        schema.sample.map(csvEscape).join(',')
    ];

    const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${userType}_import_template.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isCsvFile(file)) {
        showAlert('Invalid File', 'Please upload a CSV file.', 'warning');
        resetImport();
        return;
    }

    uploadFile(file);
}

function isCsvFile(file) {
    const fileName = file.name?.toLowerCase() || '';
    return fileName.endsWith('.csv') || file.type === 'text/csv';
}

function setDropZoneLoading(isLoading) {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    if (isLoading) {
        dropZone.innerHTML = `
            <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></div>
            <p class="mt-3 text-sm font-semibold text-slate-700">Uploading and analyzing...</p>
        `;
        return;
    }

    dropZone.innerHTML = `
        <i class="fas fa-cloud-upload-alt mb-3 text-4xl text-blue-600"></i>
        <p class="mb-1 text-sm font-semibold text-slate-900">Drag & drop your CSV file here or click to browse</p>
        <p class="text-xs text-slate-500">Max file size: 10MB</p>
    `;
}

function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_type', getCurrentUserType());
    setDropZoneLoading(true);

    axios.post(`${BULK_IMPORT_API}?action=preview`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then((response) => {
        const data = response.data;
        if (!data.success) {
            throw new Error(data.message || 'Preview failed.');
        }
        currentFileToken = data.file_token;
        renderPreview(data);
        setDropZoneLoading(false);
    })
    .catch((error) => {
        console.error('Upload error:', error);
        setDropZoneLoading(false);
        showAlert('Error', error.response?.data?.message || error.message || 'An error occurred during upload.', 'error');
        resetImport();
    });
}

function renderPreview(data) {
    const uploadCard = document.getElementById('dropZone')?.closest('article');
    const previewCard = document.getElementById('previewCard');
    const previewInfo = document.getElementById('previewInfo');
    const tableHead = document.querySelector('#previewTable thead');
    const tableBody = document.querySelector('#previewTable tbody');
    const confirmBtn = document.getElementById('confirmImportBtn');

    if (!uploadCard || !previewCard || !previewInfo || !tableHead || !tableBody || !confirmBtn) return;

    uploadCard.classList.add('hidden');
    previewCard.classList.remove('hidden');

    const totalRows = Number(data.total_rows || 0);
    const missingRequired = Array.isArray(data.missing_required) ? data.missing_required : [];
    const unknownHeaders = Array.isArray(data.unknown_headers) ? data.unknown_headers : [];
    const isImportReady = missingRequired.length === 0;

    const infoLines = [
        `Found <strong>${totalRows}</strong> row${totalRows === 1 ? '' : 's'} for <strong>${escapeHtml(getCurrentUserType())}</strong> import.`
    ];

    if (isImportReady) {
        infoLines.push('Header validation passed.');
    } else {
        infoLines.push(`Missing required columns: <strong>${missingRequired.map(escapeHtml).join(', ')}</strong>.`);
    }

    if (unknownHeaders.length) {
        infoLines.push(`Extra columns that will be ignored: ${unknownHeaders.map(escapeHtml).join(', ')}.`);
    }

    previewInfo.innerHTML = infoLines.join(' ');

    confirmBtn.disabled = !isImportReady;
    confirmBtn.classList.toggle('opacity-50', !isImportReady);
    confirmBtn.classList.toggle('cursor-not-allowed', !isImportReady);
    confirmBtn.classList.toggle('hover:bg-emerald-700', isImportReady);

    const headers = Array.isArray(data.header) ? data.header : [];
    const rows = Array.isArray(data.preview) ? data.preview : [];

    tableHead.innerHTML = `
        <tr>
            ${headers.map((column) => `<th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">${escapeHtml(column)}</th>`).join('')}
        </tr>
    `;

    tableBody.innerHTML = rows.map((row) => `
        <tr>
            ${headers.map((column) => `<td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(row[column] || '')}</td>`).join('')}
        </tr>
    `).join('');
}

function resetImport() {
    const fileInput = document.getElementById('fileInput');
    const uploadCard = document.getElementById('dropZone')?.closest('article');
    const previewCard = document.getElementById('previewCard');
    const progressCard = document.getElementById('progressCard');
    const progressBar = document.getElementById('progressBar');
    const importResults = document.getElementById('importResults');
    const confirmBtn = document.getElementById('confirmImportBtn');

    if (fileInput) fileInput.value = '';
    if (uploadCard) uploadCard.classList.remove('hidden');
    if (previewCard) previewCard.classList.add('hidden');
    if (progressCard) progressCard.classList.add('hidden');

    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.classList.remove('bg-emerald-600', 'bg-rose-600');
        progressBar.classList.add('bg-blue-600');
    }

    if (importResults) importResults.innerHTML = '';
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        confirmBtn.classList.add('hover:bg-emerald-700');
    }

    setDropZoneLoading(false);
    currentFileToken = null;
}

function confirmImport() {
    const confirmBtn = document.getElementById('confirmImportBtn');
    if (!currentFileToken || confirmBtn?.disabled) return;

    const userType = getCurrentUserType();
    const previewCard = document.getElementById('previewCard');
    const progressCard = document.getElementById('progressCard');
    const progressBar = document.getElementById('progressBar');

    if (previewCard) previewCard.classList.add('hidden');
    if (progressCard) progressCard.classList.remove('hidden');

    if (progressBar) {
        progressBar.style.width = '50%';
        progressBar.classList.remove('bg-emerald-600', 'bg-rose-600');
        progressBar.classList.add('bg-blue-600');
    }

    axios.post(`${BULK_IMPORT_API}?action=import`, {
        file_token: currentFileToken,
        user_type: userType
    })
    .then((response) => {
        renderImportResults(response.data || {});
    })
    .catch((error) => {
        console.error('Import error:', error);
        renderImportResults({
            success: false,
            message: error.response?.data?.message || 'An error occurred during import.'
        });
    });
}

function renderImportResults(data) {
    const progressBar = document.getElementById('progressBar');
    const importResults = document.getElementById('importResults');
    if (!progressBar || !importResults) return;

    progressBar.style.width = '100%';
    progressBar.classList.remove('bg-blue-600', 'bg-emerald-600', 'bg-rose-600');
    progressBar.classList.add(data.success ? 'bg-emerald-600' : 'bg-rose-600');

    let html = '';

    if (data.success) {
        html += `<div class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Successfully imported ${Number(data.imported || 0)} records.</div>`;

        if (Number(data.skipped || 0) > 0) {
            html += `<div class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Skipped ${Number(data.skipped)} record${Number(data.skipped) === 1 ? '' : 's'}.</div>`;
        }

        if (Array.isArray(data.errors) && data.errors.length) {
            html += `
                <ul class="mt-3 space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                    ${data.errors.map((errorText) => `<li class="rounded border border-rose-200 bg-white px-3 py-2 text-xs text-rose-700">${escapeHtml(errorText)}</li>`).join('')}
                </ul>
            `;
        }
    } else {
        html += `<div class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Import failed: ${escapeHtml(data.message || 'Unknown error')}</div>`;
    }

    html += `
        <button class="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" onclick="location.reload()">
            <i class="fas fa-rotate-right"></i> Import Another File
        </button>
    `;

    importResults.innerHTML = html;
}

function csvEscape(value) {
    const text = String(value ?? '');
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function setTextContent(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value || '';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showAlert(title, text, icon) {
    if (typeof window.Swal === 'undefined') {
        window.alert(`${title}\n\n${text}`);
        return;
    }

    Swal.fire({
        title,
        text,
        icon,
        confirmButtonColor: '#2563eb'
    });
}
