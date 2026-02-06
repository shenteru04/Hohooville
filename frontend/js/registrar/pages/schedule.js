const API_BASE_URL = 'http://localhost/hohoo-ville/api';
let scheduleModal;
let allTrainers = [];

document.addEventListener('DOMContentLoaded', function() {
    scheduleModal = new bootstrap.Modal(document.getElementById('assignScheduleModal'));
    loadScheduleData();

    document.getElementById('assignScheduleForm').addEventListener('submit', saveSchedule);
});

async function loadScheduleData() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/schedule.php?action=get-data`);
        if (response.data.success) {
            const { trainers, batches } = response.data.data;
            allTrainers = trainers;
            
            const trainerSelect = document.getElementById('assignTrainerSelect');
            trainerSelect.innerHTML = '<option value="">Unassign</option>';
            allTrainers.forEach(t => {
                trainerSelect.innerHTML += `<option value="${t.trainer_id}">${t.first_name} ${t.last_name}</option>`;
            });

            const tbody = document.getElementById('schedulesTableBody');
            tbody.innerHTML = '';
            batches.forEach(batch => {
                tbody.innerHTML += `
                    <tr>
                        <td>${batch.batch_name}</td>
                        <td>${batch.course_name || 'N/A'}</td>
                        <td>${batch.trainer_name || '<span class="text-muted">Not Assigned</span>'}</td>
                        <td>${batch.schedule || '<span class="text-muted">Not Set</span>'}</td>
                        <td>${batch.room || '<span class="text-muted">Not Set</span>'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="openAssignModal(${batch.batch_id}, '${batch.batch_name}', '${batch.trainer_id || ''}', '${batch.schedule || ''}', '${batch.room || ''}')">
                                <i class="fas fa-edit"></i> Assign
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading schedule data:', error);
    }
}

window.openAssignModal = function(batchId, batchName, trainerId, schedule, room) {
    document.getElementById('assignBatchId').value = batchId;
    document.getElementById('assignBatchName').textContent = batchName;
    document.getElementById('assignTrainerSelect').value = trainerId;
    document.getElementById('assignScheduleSelect').value = schedule;
    document.getElementById('assignRoomInput').value = room;
    scheduleModal.show();
}

async function saveSchedule(e) {
    e.preventDefault();
    const payload = {
        batch_id: document.getElementById('assignBatchId').value,
        trainer_id: document.getElementById('assignTrainerSelect').value,
        schedule: document.getElementById('assignScheduleSelect').value,
        room: document.getElementById('assignRoomInput').value
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/registrar/schedule.php?action=assign`, payload);
        if (response.data.success) {
            alert('Schedule assigned successfully!');
            scheduleModal.hide();
            loadScheduleData();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error saving schedule:', error);
    }
}