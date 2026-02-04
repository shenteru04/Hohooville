const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    loadData();

    document.getElementById('assignForm').addEventListener('submit', function(e) {
        e.preventDefault();
        assignSchedule();
    });
});

async function loadData() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/assign_schedule.php?action=get-data`);
        if (response.data.success) {
            const { trainers, batches } = response.data.data;

            // Populate Trainer Select
            const trainerSelect = document.getElementById('trainerSelect');
            trainerSelect.innerHTML = '<option value="">Select Trainer</option>';
            trainers.forEach(t => {
                trainerSelect.innerHTML += `<option value="${t.user_id}">${t.first_name} ${t.last_name}</option>`;
            });

            // Populate Batch Select
            const batchSelect = document.getElementById('batchSelect');
            batchSelect.innerHTML = '<option value="">Select Batch</option>';
            batches.forEach(b => {
                batchSelect.innerHTML += `<option value="${b.batch_id}">${b.batch_name} - ${b.course_name}</option>`;
            });

            // Populate Table
            const tbody = document.getElementById('scheduleTableBody');
            tbody.innerHTML = '';
            batches.forEach(b => {
                tbody.innerHTML += `
                    <tr>
                        <td>${b.batch_name}</td>
                        <td>${b.course_name || '<span class="text-muted">Not Assigned</span>'}</td>
                        <td>${b.trainer_name || '<span class="text-muted">Unassigned</span>'}</td>
                        <td>${b.schedule || '<span class="text-muted">Not Set</span>'}</td>
                        <td>${b.room || '<span class="text-muted">Not Set</span>'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="prefillForm(${b.batch_id}, '${b.trainer_id || ''}', '${b.schedule || ''}', '${b.room || ''}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </td>
                    </tr>
                `;
            });
        } else {
            console.error('Failed to load data:', response.data.message);
            alert('Failed to load data: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error loading data:', error);
        alert('An error occurred while loading data. Please check the console.');
    }
}

function prefillForm(batchId, trainerId, schedule, room) {
    document.getElementById('batchSelect').value = batchId;
    document.getElementById('trainerSelect').value = trainerId;
    document.getElementById('scheduleSelect').value = schedule;
    document.getElementById('roomInput').value = room;
}

async function assignSchedule() {
    const data = {
        batch_id: document.getElementById('batchSelect').value,
        trainer_id: document.getElementById('trainerSelect').value,
        schedule: document.getElementById('scheduleSelect').value,
        room: document.getElementById('roomInput').value
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/admin/assign_schedule.php?action=assign`, data);
        if (response.data.success) {
            alert('Schedule assigned successfully!');
            loadData(); // Refresh table
            document.getElementById('assignForm').reset();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error assigning schedule:', error);
        alert('Failed to assign schedule.');
    }
}