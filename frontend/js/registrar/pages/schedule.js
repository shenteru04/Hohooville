const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
let scheduleModal;
let allTrainers = [];

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    scheduleModal = new bootstrap.Modal(document.getElementById('assignScheduleModal'));
    loadScheduleData();

    document.getElementById('assignScheduleForm').addEventListener('submit', saveSchedule);

    // Inject Sidebar CSS (W3.CSS Reference Style)
    const ms = document.createElement('style');
    ms.innerHTML = `
        #sidebar {
            width: 200px;
            position: fixed;
            z-index: 1050;
            top: 0;
            left: 0;
            height: 100vh;
            overflow-y: auto;
            background-color: #fff;
            box-shadow: 0 2px 5px 0 rgba(0,0,0,0.16), 0 2px 10px 0 rgba(0,0,0,0.12);
            display: block;
        }
        .main-content, #content, .content-wrapper {
            margin-left: 200px !important;
            transition: margin-left .4s;
        }
        #sidebarCloseBtn {
            display: none;
            width: 100%;
            text-align: left;
            padding: 8px 16px;
            background: none;
            border: none;
            font-size: 18px;
        }
        #sidebarCloseBtn:hover { background-color: #ccc; }
        
        @media (max-width: 991.98px) {
            #sidebar { display: none; }
            .main-content, #content, .content-wrapper { margin-left: 0 !important; }
            #sidebarCloseBtn { display: block; }
        }
        .table-responsive, table { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    `;
    document.head.appendChild(ms);

    // Sidebar Logic
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (!document.getElementById('sidebarCloseBtn')) {
            const closeBtn = document.createElement('button');
            closeBtn.id = 'sidebarCloseBtn';
            closeBtn.innerHTML = 'Close &times;';
            closeBtn.addEventListener('click', () => {
                sidebar.style.display = 'none';
            });
            sidebar.insertBefore(closeBtn, sidebar.firstChild);
        }
    }

    // Open Button Logic
    let sc = document.getElementById('sidebarCollapse');
    if (!sc) {
        const nb = document.querySelector('.navbar');
        if (nb) {
            const c = nb.querySelector('.container-fluid') || nb;
            const b = document.createElement('button');
            b.id = 'sidebarCollapse';
            b.className = 'btn btn-outline-primary me-2 d-lg-none';
            b.type = 'button';
            b.innerHTML = '&#9776;';
            c.insertBefore(b, c.firstChild);
            sc = b;
        }
    }
    if (sc) {
        const nb = sc.cloneNode(true);
        if(sc.parentNode) sc.parentNode.replaceChild(nb, sc);
        nb.addEventListener('click', () => {
            if (sidebar) sidebar.style.display = 'block';
        });
    }
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
                // Escape strings to prevent JS errors in onclick
                const safeName = (batch.batch_name || '').replace(/'/g, "\\'");
                const safeTrainer = (batch.trainer_id || '');
                const safeSchedule = (batch.schedule || '').replace(/'/g, "\\'");
                const safeRoom = (batch.room || '').replace(/'/g, "\\'");

                tbody.innerHTML += `
                    <tr>
                        <td>${batch.batch_name}</td>
                        <td>${batch.course_name || 'N/A'}</td>
                        <td>${batch.trainer_name || '<span class="text-muted">Not Assigned</span>'}</td>
                        <td>${batch.schedule || '<span class="text-muted">Not Set</span>'}</td>
                        <td>${batch.room || '<span class="text-muted">Not Set</span>'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="openAssignModal(${batch.batch_id}, '${safeName}', '${safeTrainer}', '${safeSchedule}', '${safeRoom}')">
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
            Swal.fire({
                title: 'Success',
                text: 'Schedule assigned successfully!',
                icon: 'success'
            });
            scheduleModal.hide();
            loadScheduleData();
        } else {
            Swal.fire({
                title: 'Error',
                text: response.data.message || 'An error occurred',
                icon: 'error'
            });
        }
    } catch (error) {
        console.error('Error saving schedule:', error);
        Swal.fire({
            title: 'Error',
            text: 'An error occurred while saving the schedule.',
            icon: 'error'
        });
    }
}

function showAlert(message, type) {
    const iconMap = {
        'success': 'success',
        'danger': 'error',
        'warning': 'warning',
        'info': 'info'
    };
    
    Swal.fire({
        title: type.charAt(0).toUpperCase() + type.slice(1),
        text: message,
        icon: iconMap[type] || 'info'
    });
}