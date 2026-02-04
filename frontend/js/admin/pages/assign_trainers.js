
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Axios if not already initialized
    if (typeof axios !== 'undefined' && !window.apiClient) {
        window.apiClient = axios.create({
            baseURL: 'http://localhost/hohoo-ville/api',
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    loadAssignments();
    loadTrainers();
});

let trainers = [];

async function loadAssignments() {
    try {
        const response = await axios.get('../../../../api/role/admin/assign_trainers.php?action=list');
        if (response.data.success) {
            renderAssignmentTable(response.data.data);
        } else {
            alert('Error loading assignments');
        }
    } catch (error) {
        console.error('Error loading assignments:', error);
        alert('Error loading assignments');
    }
}

async function loadTrainers() {
    try {
        const response = await axios.get('../../../../api/role/admin/assign_trainers.php?action=trainers-list');
        if (response.data.success) {
            trainers = response.data.data;
        } else {
            alert('Error loading trainers');
        }
    } catch (error) {
        console.error('Error loading trainers:', error);
    }
}

function renderAssignmentTable(data) {
    const tbody = document.getElementById('assignmentTableBody');
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const row = document.createElement('tr');
        const trainerName = item.first_name ? `${item.first_name} ${item.last_name}` : 'Not Assigned';
        const batchName = item.batch_name || 'N/A';
        
        row.innerHTML = `
            <td>${batchName}</td>
            <td>${item.qualification_title}</td>
            <td>${trainerName}</td>
            <td>
                <select class="form-select" id="trainerSelect-${item.offered_id}">
                    <option value="">Select Trainer</option>
                    ${trainers.map(trainer => `<option value="${trainer.trainer_id}" ${trainer.trainer_id == item.trainer_id ? 'selected' : ''}>${trainer.first_name} ${trainer.last_name}</option>`).join('')}
                </select>
            </td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="assignTrainer(${item.offered_id})">Assign</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function assignTrainer(offeredId) {
    const select = document.getElementById(`trainerSelect-${offeredId}`);
    const trainerId = select.value;
    
    if (!trainerId) {
        alert('Please select a trainer');
        return;
    }
    
    try {
        const response = await axios.post('../../../../api/role/admin/assign_trainers.php?action=assign-trainer', {
            offered_id: offeredId,
            trainer_id: trainerId
        });
        if (response.data.success) {
            alert('Trainer assigned successfully');
            loadAssignments();
        } else {
            alert('Error assigning trainer');
        }
    } catch (error) {
        console.error('Error assigning trainer:', error);
        alert('Error assigning trainer');
    }
}