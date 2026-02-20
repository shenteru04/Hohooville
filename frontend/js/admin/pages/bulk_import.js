// Global variables
let currentFileToken = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }
    // Sidebar loading is handled by sidebar.js
});

function updateTemplate() {
    // Logic to update UI based on radio button if needed
    // Currently just used to determine download content
}

function downloadTemplate() {
    const userType = document.querySelector('input[name="userType"]:checked').value;
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (userType === 'trainee') {
        csvContent += "First Name,Middle Name,Last Name,Extension Name,Email,Phone,House No/Street,Barangay,City,Province,District,Region,Birthplace City,Birthplace Province,Birthplace Region,Sex,Birthdate,Civil Status,Education,Employment Status,Employment Type,Learner Classification,Is PWD,Disability Type,Disability Cause,Facebook Account,Birth Certificate No,CTPR No,Nominal Duration,Batch Name,Qualification,Scholarship\n";
        csvContent += "Angela,Gonzales,Ramos,Sr.,angela.ramos_1@example.com,09566296161,173 Road,Barangay Camarin,Caloocan City,Metro Manila,1st District,NCR,Quezon City,Metro Manila,NCR,Female,25/04/1995,Single,Elementary Graduate,Wage-Employed,Regular,Worker,No,,,facebook_angela,BC123456789,CTPR123456,,Batch 5,Shielded Metal Arc Welding (SMAW) NC II,TTSP\n";
    } else {
        csvContent += "First Name,Last Name,Email,Phone,Address\n";
        csvContent += "Jane,Smith,jane@example.com,09987654321,456 Trainer Ave\n";
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${userType}_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        uploadFile(file);
    }
}

// Drag and Drop support
const dropZone = document.getElementById('dropZone');
if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type === "text/csv") {
            uploadFile(file);
        } else {
            Swal.fire('Invalid File', 'Please upload a CSV file.', 'warning');
        }
    });
}

function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Show loading
    const originalContent = document.getElementById('dropZone').innerHTML;
    document.getElementById('dropZone').innerHTML = '<div class="spinner-border text-primary" role="status"></div><p class="mt-2">Uploading and analyzing...</p>';

    axios.post('../../../../api/role/admin/bulk_import.php?action=preview', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
    .then(response => {
        const data = response.data;
        if (data.success) {
            currentFileToken = data.file_token;
            renderPreview(data);
            // Reset dropzone content for next time
            document.getElementById('dropZone').innerHTML = originalContent;
        } else {
            Swal.fire('Error', 'Error: ' + data.message, 'error');
            resetImport();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        Swal.fire('Error', 'An error occurred during upload.', 'error');
        resetImport();
    });
}

function renderPreview(data) {
    document.getElementById('dropZone').parentElement.parentElement.style.display = 'none'; // Hide step 2
    document.getElementById('previewCard').style.display = 'block';
    
    document.getElementById('previewInfo').textContent = `Found ${data.total_rows} rows.`;
    
    const tableHead = document.querySelector('#previewTable thead');
    const tableBody = document.querySelector('#previewTable tbody');
    
    // Header
    let headerRow = '<tr>';
    data.header.forEach(col => {
        headerRow += `<th>${col}</th>`;
    });
    headerRow += '</tr>';
    tableHead.innerHTML = headerRow;
    
    // Body
    tableBody.innerHTML = '';
    let rowsHtml = '';
    data.preview.forEach(row => {
        let tr = '<tr>';
        data.header.forEach(col => {
            tr += `<td>${row[col] || ''}</td>`;
        });
        tr += '</tr>';
        rowsHtml += tr;
    });
    tableBody.innerHTML = rowsHtml;
}

function resetImport() {
    document.getElementById('fileInput').value = '';
    document.getElementById('dropZone').innerHTML = `
        <i class="fas fa-cloud-upload-alt fa-3x text-primary mb-3"></i>
        <p class="mb-0"><strong>Drag & drop your CSV file here or click to browse</strong></p>
        <small class="text-muted">Max file size: 10MB</small>
    `;
    document.getElementById('dropZone').parentElement.parentElement.style.display = 'block'; // Show step 2
    document.getElementById('previewCard').style.display = 'none';
    document.getElementById('progressCard').style.display = 'none';
    currentFileToken = null;
}

function confirmImport() {
    if (!currentFileToken) return;
    
    const userType = document.querySelector('input[name="userType"]:checked').value;
    
    document.getElementById('previewCard').style.display = 'none';
    document.getElementById('progressCard').style.display = 'block';
    
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = '50%';
    
    axios.post('../../../../api/role/admin/bulk_import.php?action=import', {
        file_token: currentFileToken,
        user_type: userType
    })
    .then(response => {
        const data = response.data;
        progressBar.style.width = '100%';
        progressBar.classList.remove('progress-bar-animated');
        
        let resultHtml = '';
        if (data.success) {
            progressBar.classList.add('bg-success');
            resultHtml += `<div class="alert alert-success">Successfully imported ${data.imported} records.</div>`;
            if (data.skipped > 0) {
                resultHtml += `<div class="alert alert-warning">Skipped ${data.skipped} records.</div>`;
                resultHtml += `<ul class="list-group mt-2">`;
                data.errors.forEach(err => {
                    resultHtml += `<li class="list-group-item list-group-item-danger small">${err}</li>`;
                });
                resultHtml += `</ul>`;
            }
        } else {
            progressBar.classList.add('bg-danger');
            resultHtml += `<div class="alert alert-danger">Import failed: ${data.message}</div>`;
        }
        
        resultHtml += `<button class="btn btn-primary mt-3" onclick="location.reload()">Import Another File</button>`;
        document.getElementById('importResults').innerHTML = resultHtml;
    })
    .catch(error => {
        console.error('Error:', error);
        progressBar.classList.add('bg-danger');
        document.getElementById('importResults').innerHTML = `<div class="alert alert-danger">An error occurred during import.</div>`;
    });
}