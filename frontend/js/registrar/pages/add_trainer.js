const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainers/';
let trainerModal;
let viewModal;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    trainerModal = new bootstrap.Modal(document.getElementById('trainerModal'));
    viewModal = new bootstrap.Modal(document.getElementById('viewTrainerModal'));

    loadTrainers();
    loadSpecializations();
    
    const form = document.getElementById('trainerForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveTrainer();
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

async function loadSpecializations() {
    try {
        // Use the registrar endpoint to ensure we get qualification_ids consistent with other pages
        const response = await axios.get(`${API_BASE_URL}/role/registrar/qualifications.php?action=list`);
        if (response.data.success) {
            const select = document.getElementById('qualification_id');
            select.innerHTML = '<option value="">Select Qualification</option>';
            if (response.data.data) {
                response.data.data.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.qualification_id;
                    option.textContent = course.qualification_name || course.course_name;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading specializations:', error);
    }
}

async function loadTrainers() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/trainers.php?action=list`);
        if (response.data.success) {
            renderTrainersTable(response.data.data);
        } else {
            console.error("Failed to load trainers:", response.data.message);
        }
    } catch (error) {
        console.error('Error loading trainers:', error);
    }
}

function renderTrainersTable(trainers) {
    const tbody = document.getElementById('trainersTableBody');
    tbody.innerHTML = '';
    if (!trainers || trainers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No trainers found.</td></tr>';
        return;
    }

    trainers.forEach(trainer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${trainer.first_name} ${trainer.last_name}</td>
            <td>${trainer.email}</td>
            <td>${trainer.qualification_name || 'N/A'}</td>
            <td><span class="badge bg-${trainer.status === 'active' ? 'success' : 'secondary'}">${trainer.status}</span></td>
            <td>
                <button class="btn btn-sm btn-info text-white" onclick="viewTrainerDetails(${trainer.trainer_id})"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-warning" onclick="editTrainer(${trainer.trainer_id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteTrainer(${trainer.trainer_id})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.openAddModal = function() {
    document.getElementById('trainerForm').reset();
    document.getElementById('trainerId').value = '';
    document.getElementById('trainerModalLabel').textContent = 'Add New Trainer';
    trainerModal.show();
}

async function saveTrainer() {
    const form = document.getElementById('trainerForm');
    const trainerId = document.getElementById('trainerId').value;
    const action = trainerId ? 'update' : 'add';
    
    const formData = new FormData();
    formData.append('first_name', document.getElementById('firstName').value);
    formData.append('last_name', document.getElementById('lastName').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('phone', document.getElementById('phone').value);
    formData.append('qualification_id', document.getElementById('qualification_id').value);
    formData.append('address', document.getElementById('address').value);
    formData.append('nttc_no', document.getElementById('nttcNo').value);
    formData.append('nc_level', document.getElementById('ncLevel').value);
    
    if(document.getElementById('nttcFile').files[0]) formData.append('nttc_file', document.getElementById('nttcFile').files[0]);
    if(document.getElementById('tmFile').files[0]) formData.append('tm_file', document.getElementById('tmFile').files[0]);
    if(document.getElementById('ncFile').files[0]) formData.append('nc_file', document.getElementById('ncFile').files[0]);
    if(document.getElementById('expFile').files[0]) formData.append('experience_file', document.getElementById('expFile').files[0]);

    if (trainerId) {
        formData.append('trainer_id', trainerId);
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/role/registrar/trainers.php?action=${action}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (response.data.success) {
            Swal.fire('Success', `Trainer ${trainerId ? 'updated' : 'added'} successfully!${!trainerId ? ' Default password is their last name.' : ''}`, 'success');
            trainerModal.hide();
            loadTrainers();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error(`Error saving trainer:`, error);
        Swal.fire('Error', 'An error occurred while saving the trainer.', 'error');
    }
}

window.editTrainer = async function(id) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/trainers.php?action=get&id=${id}`);
        if (response.data.success) {
            const trainer = response.data.data;
            document.getElementById('trainerId').value = trainer.trainer_id;
            document.getElementById('firstName').value = trainer.first_name;
            document.getElementById('lastName').value = trainer.last_name;
            document.getElementById('email').value = trainer.email;
            document.getElementById('phone').value = trainer.phone_number;
            document.getElementById('qualification_id').value = trainer.qualification_id;
            document.getElementById('address').value = trainer.address;
            document.getElementById('nttcNo').value = trainer.nttc_no;
            document.getElementById('ncLevel').value = trainer.nc_level;

            document.getElementById('trainerModalLabel').textContent = 'Edit Trainer';
            trainerModal.show();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error fetching trainer details:', error);
    }
}

window.viewTrainerDetails = async function(id) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/trainers.php?action=get&id=${id}`);
        if (response.data.success) {
            const trainer = response.data.data;
            const body = document.getElementById('viewTrainerBody');
            
            const createFileLink = (file, label) => {
                if (!file) return `<p class="mb-1"><strong class="text-muted">${label}:</strong> N/A</p>`;
                return `<p class="mb-1"><strong class="text-muted">${label}:</strong> <a href="${UPLOADS_URL}${file}" target="_blank">${file}</a></p>`;
            };

            body.innerHTML = `
                <h5>${trainer.first_name} ${trainer.last_name}</h5>
                <p><strong>Email:</strong> ${trainer.email}</p>
                <p><strong>Phone:</strong> ${trainer.phone_number || 'N/A'}</p>
                <p><strong>Address:</strong> ${trainer.address || 'N/A'}</p>
                <p><strong>Qualification:</strong> ${trainer.qualification_name || 'N/A'}</p>
                <p><strong>Status:</strong> <span class="badge bg-${trainer.status === 'active' ? 'success' : 'secondary'}">${trainer.status}</span></p>
                <hr>
                <h6>Certifications</h6>
                <p><strong>NTTC No:</strong> ${trainer.nttc_no || 'N/A'}</p>
                <p><strong>NC Level:</strong> ${trainer.nc_level || 'N/A'}</p>
                ${createFileLink(trainer.nttc_file, 'NTTC Certificate')}
                ${createFileLink(trainer.tm_file, 'TM Certificate')}
                ${createFileLink(trainer.nc_file, 'NC Certificate')}
                ${createFileLink(trainer.experience_file, 'Experience Docs')}
            `;
            viewModal.show();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error fetching trainer details:', error);
    }
}

window.deleteTrainer = async function(id) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await axios.delete(`${API_BASE_URL}/role/registrar/trainers.php?action=delete&id=${id}`);
        if (response.data.success) {
            Swal.fire('Deleted!', 'Trainer deleted successfully!', 'success');
            loadTrainers();
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting trainer:', error);
    }
}