// API Configuration
const API_BASE_URL = 'http://localhost/hohoo-ville/api';

// Axios Instance Configuration
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

document.addEventListener('DOMContentLoaded', function() {
    loadAttendance();
    loadBatches();

    // Event listener for batch selection to load trainees
    const batchSelect = document.getElementById('batchSelect');
    if (batchSelect) {
        batchSelect.addEventListener('change', function() {
            const batchId = this.value;
            if (batchId) {
                loadTraineesForBatch(batchId);
            } else {
                document.getElementById('traineeList').innerHTML = '';
            }
        });
    }

    // Event listener for form submission
    const form = document.getElementById('attendanceForm');
    if (form) {
        form.addEventListener('submit', saveAttendance);
    }

    // Event listener for Mark Attendance button
    const markBtn = document.getElementById('markAttendanceBtn');
    if (markBtn) {
        markBtn.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('attendanceModal'));
            document.getElementById('attendanceDate').valueAsDate = new Date();
            modal.show();
        });
    }

    // Event listener for Filter button
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', loadAttendance);
    }
});

async function loadAttendance() {
    const batchId = document.getElementById('batchFilter')?.value || '';
    const date = document.getElementById('dateFilter')?.value || '';

    try {
        const response = await apiClient.get('/role/admin/attendance.php?action=list', {
            params: { batch_id: batchId, date: date }
        });
        if (response.data.success) {
            renderAttendanceTable(response.data.data);
        } else {
            alert('Error loading attendance');
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        alert('Error loading attendance');
    }
}

async function loadBatches() {
    try {
        const response = await apiClient.get('/role/admin/attendance.php?action=get-batches');
        if (response.data.success) {
            const batchSelect = document.getElementById('batchSelect');
            const batchFilter = document.getElementById('batchFilter');
            
            const options = response.data.data.map(batch => 
                `<option value="${batch.batch_id}">${batch.batch_name}</option>`
            ).join('');

            if (batchSelect) {
                batchSelect.innerHTML = '<option value="">Select Batch</option>' + options;
            }
            if (batchFilter) {
                batchFilter.innerHTML = '<option value="">All Batches</option>' + options;
            }
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

async function loadTraineesForBatch(batchId) {
    try {
        const response = await apiClient.get(`/role/admin/attendance.php?action=get-trainees&batch_id=${batchId}`);
        if (response.data.success) {
            const container = document.getElementById('traineeList');
            if (container) {
                container.innerHTML = '';
                if (response.data.data.length === 0) {
                    container.innerHTML = '<p class="text-muted">No trainees found in this batch.</p>';
                    return;
                }
                
                response.data.data.forEach(trainee => {
                    const div = document.createElement('div');
                    div.className = 'mb-2 d-flex align-items-center justify-content-between border-bottom pb-2';
                    div.innerHTML = `
                        <span>${trainee.first_name} ${trainee.last_name}</span>
                        <div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="status_${trainee.trainee_id}" value="present" checked>
                                <label class="form-check-label">Present</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="status_${trainee.trainee_id}" value="absent">
                                <label class="form-check-label">Absent</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="status_${trainee.trainee_id}" value="late">
                                <label class="form-check-label">Late</label>
                            </div>
                        </div>
                    `;
                    container.appendChild(div);
                });
            }
        }
    } catch (error) {
        console.error('Error loading trainees:', error);
        alert('Error loading trainees for batch');
    }
}

async function saveAttendance(e) {
    e.preventDefault();
    
    const batchId = document.getElementById('batchSelect').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!batchId || !date) {
        alert('Please select a batch and date');
        return;
    }

    const attendanceData = [];
    const traineeInputs = document.querySelectorAll('input[type="radio"]:checked');
    
    traineeInputs.forEach(input => {
        const traineeId = input.name.split('_')[1];
        attendanceData.push({
            trainee_id: traineeId,
            status: input.value
        });
    });

    if (attendanceData.length === 0) {
        alert('No attendance data to save');
        return;
    }

    try {
        const response = await apiClient.post('/role/admin/attendance.php?action=save', {
            batch_id: batchId,
            date: date,
            attendance: attendanceData
        });

        if (response.data.success) {
            alert('Attendance saved successfully');
            
            const modalEl = document.getElementById('attendanceModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            document.getElementById('attendanceForm').reset();
            document.getElementById('traineeList').innerHTML = '';
            loadAttendance();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        alert('Error saving attendance');
    }
}

function renderAttendanceTable(data) {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const row = document.createElement('tr');
        const statusBadge = {
            'present': 'success',
            'absent': 'danger',
            'late': 'warning'
        }[item.status] || 'secondary';

        row.innerHTML = `
            <td>${item.first_name} ${item.last_name}</td>
            <td>${item.batch_name}</td>
            <td>${new Date(item.date_recorded).toLocaleDateString()}</td>
            <td><span class="badge bg-${statusBadge}">${item.status}</span></td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteAttendance(${item.attendance_dtl_id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function deleteAttendance(id) {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    
    try {
        const response = await apiClient.delete(`/role/admin/attendance.php?action=delete&id=${id}`);
        if (response.data.success) {
            alert('Attendance record deleted successfully');
            loadAttendance();
        } else {
            alert('Error deleting attendance record');
        }
    } catch (error) {
        console.error('Error deleting attendance record:', error);
        alert('Error deleting attendance record');
    }
}

function editAttendance(id) {
    alert('Edit functionality not implemented yet');
}