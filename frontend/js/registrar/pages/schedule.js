const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
let scheduleModal;
let allTrainers = [];
let allBatches = [];

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    scheduleModal = new bootstrap.Modal(document.getElementById('assignScheduleModal'));
    loadScheduleData();

    document.getElementById('assignScheduleForm').addEventListener('submit', saveSchedule);
    const schedulesBody = document.getElementById('schedulesTableBody');
    if (schedulesBody) {
        schedulesBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.assign-btn');
            if (!btn) return;
            const data = btn.dataset;
            openAssignModal(
                data.batchId,
                data.batchName,
                data.trainerId || '',
                data.schedule || '',
                data.room || '',
                data.qualificationId || ''
            );
        });
    }

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
            allTrainers = (trainers || []).map(t => ({
                ...t,
                qualification_ids: parseIdList(t.qualification_ids)
            }));
            allBatches = batches || [];

            const tbody = document.getElementById('schedulesTableBody');
            tbody.innerHTML = '';

            allBatches.forEach(batch => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${escapeHtml(batch.batch_name)}</td>
                    <td>${batch.course_name ? escapeHtml(batch.course_name) : '<span class="text-muted">N/A</span>'}</td>
                    <td>${batch.trainer_name ? escapeHtml(batch.trainer_name) : '<span class="text-muted">Not Assigned</span>'}</td>
                    <td>${batch.schedule ? escapeHtml(batch.schedule) : '<span class="text-muted">Not Set</span>'}</td>
                    <td>${batch.room ? escapeHtml(batch.room) : '<span class="text-muted">Not Set</span>'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary assign-btn"
                            data-batch-id="${batch.batch_id}"
                            data-batch-name="${escapeAttr(batch.batch_name)}"
                            data-trainer-id="${batch.trainer_id || ''}"
                            data-schedule="${escapeAttr(batch.schedule || '')}"
                            data-room="${escapeAttr(batch.room || '')}"
                            data-qualification-id="${batch.qualification_id || ''}">
                            <i class="fas fa-edit"></i> Assign
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading schedule data:', error);
    }
}

window.openAssignModal = function(batchId, batchName, trainerId, schedule, room, qualificationId) {
    document.getElementById('assignBatchId').value = batchId;
    document.getElementById('assignBatchName').textContent = batchName;
    populateTrainerSelect(qualificationId, trainerId);
    document.getElementById('assignScheduleSelect').value = schedule;
    window.populateRoomDropdown(room);
    scheduleModal.show();
}

async function saveSchedule(e) {
    e.preventDefault();
    const payload = {
        batch_id: document.getElementById('assignBatchId').value,
        trainer_id: document.getElementById('assignTrainerSelect').value,
        schedule: document.getElementById('assignScheduleSelect').value,
        room_id: document.getElementById('assignRoomSelect').value
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

window.populateRoomDropdown = async function(selectedRoom = '') {
    const roomSelect = document.getElementById('assignRoomSelect');
    roomSelect.innerHTML = '<option value="">Select Room</option>';
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/rooms.php?action=list`);
        if (response.data.success && response.data.data) {
            response.data.data.forEach(room => {
                const option = document.createElement('option');
                option.value = room.room_id;
                option.textContent = room.room_name;
                if (String(room.room_id) === String(selectedRoom)) option.selected = true;
                roomSelect.appendChild(option);
            });
        }
    } catch (error) {
        roomSelect.innerHTML = '<option value="">Error loading rooms</option>';
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

function parseIdList(value) {
    if (!value) return [];
    return value
        .toString()
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
}

function populateTrainerSelect(qualificationId, selectedTrainerId) {
    const trainerSelect = document.getElementById('assignTrainerSelect');
    trainerSelect.innerHTML = '<option value="">Unassign</option>';

    const qualIdStr = qualificationId ? String(qualificationId) : '';
    const filtered = qualIdStr
        ? allTrainers.filter(t => t.qualification_ids.includes(qualIdStr))
        : allTrainers;

    if (filtered.length === 0) {
        trainerSelect.innerHTML += '<option value="" disabled>No trainers available</option>';
    } else {
        filtered.forEach(t => {
            trainerSelect.innerHTML += `<option value="${t.trainer_id}">${escapeHtml(t.first_name)} ${escapeHtml(t.last_name)}</option>`;
        });
    }

    if (selectedTrainerId) {
        trainerSelect.value = String(selectedTrainerId);
    }
}

function escapeHtml(value) {
    return (value ?? '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
    return escapeHtml(value);
}
