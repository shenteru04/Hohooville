let currentFileToken = null;
const BULK_IMPORT_API = `${window.location.origin}/Hohoo-ville/api/role/admin/bulk_import.php`;

document.addEventListener('DOMContentLoaded', async () => {
    await ensureSwal();
    initUserDropdown();
    initLogout();
    bindDropZoneEvents();
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

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (typeof window.logout === 'function') {
            window.logout();
            return;
        }
        localStorage.clear();
        window.location.href = '/Hohoo-ville/frontend/login.html';
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

function updateTemplate() {
}

function downloadTemplate() {
    const userType = document.querySelector('input[name="userType"]:checked')?.value || 'trainee';
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (userType === 'trainee') {
        csvContent += 'First Name,Middle Name,Last Name,Extension Name,Email,Phone,House No/Street,Barangay,City,Province,District,Region,Birthplace City,Birthplace Province,Birthplace Region,Sex,Birthdate,Civil Status,Education,Employment Status,Employment Type,Learner Classification,Is PWD,Disability Type,Disability Cause,Facebook Account,Birth Certificate No,CTPR No,Nominal Duration,Batch Name,Qualification,Scholarship\n';
        csvContent += 'Angela,Gonzales,Ramos,Sr.,angela.ramos_1@example.com,09566296161,173 Road,Barangay Camarin,Caloocan City,Metro Manila,1st District,NCR,Quezon City,Metro Manila,NCR,Female,25/04/1995,Single,Elementary Graduate,Wage-Employed,Regular,Worker,No,,,facebook_angela,BC123456789,CTPR123456,,Batch 5,Shielded Metal Arc Welding (SMAW) NC II,TTSP\n';
    } else {
        csvContent += 'First Name,Last Name,Email,Phone,Address\n';
        csvContent += 'Jane,Smith,jane@example.com,09987654321,456 Trainer Ave\n';
    }

    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `${userType}_import_template.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
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

    if (!uploadCard || !previewCard || !previewInfo || !tableHead || !tableBody) return;

    uploadCard.classList.add('hidden');
    previewCard.classList.remove('hidden');
    previewInfo.textContent = `Found ${data.total_rows || 0} rows.`;

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

    setDropZoneLoading(false);
    currentFileToken = null;
}

function confirmImport() {
    if (!currentFileToken) return;

    const userType = document.querySelector('input[name="userType"]:checked')?.value || 'trainee';
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
        const data = response.data || {};
        renderImportResults(data);
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
            html += `<div class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Skipped ${Number(data.skipped)} records.</div>`;
            if (Array.isArray(data.errors) && data.errors.length) {
                html += `
                    <ul class="mt-3 space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                        ${data.errors.map((errorText) => `<li class="rounded border border-rose-200 bg-white px-3 py-2 text-xs text-rose-700">${escapeHtml(errorText)}</li>`).join('')}
                    </ul>
                `;
            }
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

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
