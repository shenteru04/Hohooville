const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
let scholarshipModal;

document.addEventListener('DOMContentLoaded', function() {
    scholarshipModal = new bootstrap.Modal(document.getElementById('scholarshipModal'));
    
    loadScholarships();
    loadOfferedCourses();

    document.getElementById('scholarshipForm').addEventListener('submit', saveScholarship);

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

async function loadScholarships() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/application_settings.php?action=list-scholarships`);
        const tbody = document.getElementById('scholarshipTableBody');
        tbody.innerHTML = '';
        
        if (response.data.success) {
            response.data.data.forEach(s => {
                const isActive = s.status === 'active';
                tbody.innerHTML += `
                    <tr>
                        <td>${s.scholarship_name}</td>
                        <td>${s.description || ''}</td>
                        <td><span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">${s.status || 'active'}</span></td>
                        <td>
                            <button class="btn btn-sm ${isActive ? 'btn-outline-warning' : 'btn-outline-success'}" 
                                onclick="toggleScholarship(${s.scholarship_type_id}, '${isActive ? 'inactive' : 'active'}')">
                                ${isActive ? 'Hide' : 'Show'}
                            </button>
                            <button class="btn btn-sm btn-outline-primary" onclick="editScholarship(${s.scholarship_type_id}, '${s.scholarship_name}', '${s.description || ''}')"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteScholarship(${s.scholarship_type_id})"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading scholarships:', error);
    }
}

window.openScholarshipModal = function() {
    document.getElementById('scholarshipForm').reset();
    document.getElementById('scholarshipId').value = '';
    document.getElementById('scholarshipModalTitle').textContent = 'Add Scholarship';
    scholarshipModal.show();
}

window.editScholarship = function(id, name, desc) {
    document.getElementById('scholarshipId').value = id;
    document.getElementById('scholarshipName').value = name;
    document.getElementById('scholarshipDesc').value = desc;
    document.getElementById('scholarshipModalTitle').textContent = 'Edit Scholarship';
    scholarshipModal.show();
}

async function saveScholarship(e) {
    e.preventDefault();
    const id = document.getElementById('scholarshipId').value;
    const name = document.getElementById('scholarshipName').value;
    const desc = document.getElementById('scholarshipDesc').value;

    try {
        const response = await axios.post(`${API_BASE_URL}/role/registrar/application_settings.php?action=save-scholarship`, {
            id: id,
            name: name,
            description: desc
        });

        if (response.data.success) {
            scholarshipModal.hide();
            loadScholarships();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error saving scholarship:', error);
    }
}

window.deleteScholarship = async function(id) {
    if (!confirm('Are you sure you want to delete this scholarship type?')) return;
    try {
        const response = await axios.delete(`${API_BASE_URL}/role/registrar/application_settings.php?action=delete-scholarship&id=${id}`);
        if (response.data.success) loadScholarships();
        else alert('Error: ' + response.data.message);
    } catch (error) {
        console.error('Error deleting scholarship:', error);
    }
}

window.toggleScholarship = async function(id, status) {
    try {
        await axios.post(`${API_BASE_URL}/role/registrar/application_settings.php?action=toggle-scholarship-status`, { id: id, status: status });
        loadScholarships();
    } catch (error) {
        console.error('Error toggling scholarship:', error);
    }
}

async function loadOfferedCourses() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/application_settings.php?action=list-offered-courses`);
        const tbody = document.getElementById('offeredCoursesBody');
        tbody.innerHTML = '';

        if (response.data.success) {
            response.data.data.forEach(c => {
                const isActive = c.status === 'active';
                tbody.innerHTML += `
                    <tr>
                        <td>${c.course_name}</td>
                        <td><span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">${c.status}</span></td>
                        <td>
                            <button class="btn btn-sm ${isActive ? 'btn-outline-warning' : 'btn-outline-success'}" 
                                onclick="toggleCourse(${c.qualification_id}, '${isActive ? 'inactive' : 'active'}')">
                                ${isActive ? 'Hide' : 'Show'}
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

window.toggleCourse = async function(id, status) {
    try {
        await axios.post(`${API_BASE_URL}/role/registrar/application_settings.php?action=toggle-course-offer`, { qualification_id: id, status: status });
        loadOfferedCourses();
    } catch (error) {
        console.error('Error toggling course:', error);
    }
}