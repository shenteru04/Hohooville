const API_BASE_URL = 'http://localhost/hohoo-ville/api';
let apiClient;
let currentData = {};
let assignModal;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof axios !== 'undefined') {
        apiClient = axios.create({
            baseURL: API_BASE_URL,
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });
        initializePage();
    } else {
        console.error('Axios is not defined.');
    }
});

function initializePage() {
    loadData();

    const modalEl = document.getElementById('assignScheduleModal');
    if (modalEl) {
        assignModal = new bootstrap.Modal(modalEl);
    }

    const form = document.getElementById('assignScheduleForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            assignSchedule();
        });
    }
}

async function loadData() {
    try {
        const response = await apiClient.get('/role/registrar/schedule.php?action=get-data');
        if (response.data.success) {
            currentData = response.data.data;
            renderTable(currentData.batches);
            populateTrainerSelect(currentData.trainers);
        } else {
            alert('Error loading data: ' + (response.data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading data:', error);
        alert('An error occurred while loading schedule data.');
    }
}

function renderTable(batches) {
    const tbody = document.getElementById('schedulesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (batches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No open batches found.</td></tr>';
        return;
    }

    batches.forEach(batch => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${batch.batch_name}</td>
            <td>${batch.course_name || 'N/A'}</td>
            <td>${batch.trainer_name || '<span class="text-muted">Unassigned</span>'}</td>
            <td>${batch.schedule || '<span class="text-muted">Not set</span>'}</td>
            <td>${batch.room || '<span class="text-muted">Not set</span>'}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="openAssignModal(${batch.batch_id})">
                    <i class="fas fa-calendar-alt me-1"></i> Assign
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function populateTrainerSelect(trainers) {
    const select = document.getElementById('assignTrainerSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Unassign</option>';
    trainers.forEach(trainer => {
        select.innerHTML += `<option value="${trainer.trainer_id}">${trainer.first_name} ${trainer.last_name}</option>`;
    });
}

window.openAssignModal = function(batchId) {
    const batch = currentData.batches.find(b => b.batch_id == batchId);
    if (!batch) return;

    document.getElementById('assignBatchId').value = batch.batch_id;
    document.getElementById('assignBatchName').textContent = batch.batch_name;
    document.getElementById('assignTrainerSelect').value = batch.trainer_id || '';
    document.getElementById('assignScheduleSelect').value = batch.schedule || '';
    document.getElementById('assignRoomInput').value = batch.room || '';

    assignModal.show();
}

async function assignSchedule() {
    const payload = {
        batch_id: document.getElementById('assignBatchId').value,
        trainer_id: document.getElementById('assignTrainerSelect').value,
        schedule: document.getElementById('assignScheduleSelect').value,
        room: document.getElementById('assignRoomInput').value
    };

    if (!payload.batch_id) {
        alert('Error: Batch ID is missing.');
        return;
    }

    try {
        const response = await apiClient.post('/role/registrar/schedule.php?action=assign', payload);
        if (response.data.success) {
            alert('Schedule assigned successfully!');
            assignModal.hide();
            loadData(); // Refresh the table
        } else {
            alert('Error: ' + (response.data.message || 'Failed to assign schedule.'));
        }
    } catch (error) {
        console.error('Error assigning schedule:', error);
        alert('An error occurred while saving the schedule.');
    }
}