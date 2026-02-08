const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainees/';

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const traineeId = urlParams.get('id');

    if (traineeId) {
        loadTraineeDetails(traineeId);
    } else {
        document.getElementById('profile-content').innerHTML = '<div class="alert alert-danger">No trainee ID provided.</div>';
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

    // Remove Attendance and Grading pages from sidebar
    if (sidebar) {
        const ul = sidebar.querySelector('ul');
        if (ul) {
            ul.innerHTML = '';
            const menuItems = [
                { href: '/Hohoo-ville/frontend/html/trainer/trainer_dashboard.html', icon: 'fas fa-home', text: 'Dashboard' },
                { href: 'my_batches.html', icon: 'fas fa-users', text: 'My Batches' },
                { href: 'modules.html', icon: 'fas fa-book', text: 'Modules' },
                { href: 'progress_chart.html', icon: 'fas fa-chart-line', text: 'Progress Chart' },
                { href: 'achievement_chart.html', icon: 'fas fa-trophy', text: 'Achievement Chart' },
                { href: 'reports.html', icon: 'fas fa-file-alt', text: 'Reports' }
            ];
            const currentPage = window.location.pathname.split('/').pop();
            menuItems.forEach(item => {
                const li = document.createElement('li');
                li.className = 'nav-item mb-1';
                const isActive = currentPage === item.href ? 'active' : '';
                li.innerHTML = `<a class="nav-link ${isActive}" href="${item.href}"><i class="${item.icon} me-2"></i> ${item.text}</a>`;
                ul.appendChild(li);
            });
        }
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '../../../login.html';
        });
    }
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('trainerName').textContent = user.username || 'Trainer';
    }
});

async function loadTraineeDetails(traineeId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/trainees.php?action=get-details&id=${traineeId}`);
        if (response.data.success) {
            const trainee = response.data.data;
            populateTraineeData(trainee);
        } else {
            document.getElementById('profile-content').innerHTML = `<div class="alert alert-warning">${response.data.message}</div>`;
        }
    } catch (error) {
        console.error('Error loading trainee details:', error);
        document.getElementById('profile-content').innerHTML = '<div class="alert alert-danger">Failed to load trainee details.</div>';
    }
}

function populateTraineeData(t) {
    // Helper to safely set text content
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text || 'N/A';
    };

    // Header
    const fullName = `${t.first_name || ''} ${t.middle_name || ''} ${t.last_name || ''} ${t.extension_name || ''}`.replace(/\s+/g, ' ').trim();
    setText('headerTraineeName', fullName);
    setText('headerTraineeCourse', t.course_name);
    const photoEl = document.getElementById('headerTraineePhoto');
    if (photoEl) {
        if (t.photo_file) {
            photoEl.src = UPLOADS_URL + encodeURIComponent(t.photo_file);
        } else {
            photoEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;
        }
    }

    // Profile Tab
    setText('profileFullName', fullName);
    setText('profileEmail', t.email);
    setText('profilePhone', t.phone_number);
    setText('profileFacebook', t.facebook_account);
    setText('profileAddress', `${t.house_no_street || ''}, ${t.barangay || ''}, ${t.city_municipality || ''}, ${t.province || ''}`);
    
    setText('profileSex', t.sex);
    setText('profileCivilStatus', t.civil_status);
    setText('profileBirthdate', t.birthdate);
    setText('profileAge', t.age);
    setText('profileBirthplace', `${t.birthplace_city || ''}, ${t.birthplace_province || ''}`);
    setText('profileNationality', t.nationality);

    setText('profileEducation', t.educational_attainment);
    setText('profileEmployment', t.employment_status);
    
    // Training Info
    setText('profileBatch', t.batch_name);
    setText('profileScholarship', t.scholarship_type);
    setText('profileEnrollStatus', t.enrollment_status);
    
    // Document Links
    const linkId = document.getElementById('linkValidId');
    const linkCert = document.getElementById('linkBirthCert');
    if(linkId) {
        if (t.valid_id_file) {
            linkId.href = UPLOADS_URL + encodeURIComponent(t.valid_id_file);
            linkId.classList.remove('disabled');
        } else {
            linkId.classList.add('disabled');
        }
    }
    if(linkCert) {
        if (t.birth_cert_file) {
            linkCert.href = UPLOADS_URL + encodeURIComponent(t.birth_cert_file);
            linkCert.classList.remove('disabled');
        } else {
            linkCert.classList.add('disabled');
        }
    }

    // Attendance Tab
    if (t.attendance) {
        setText('attPresent', t.attendance.present);
        setText('attAbsent', t.attendance.absent);
        setText('attLate', t.attendance.late);
    }

    // Competency Tab
    if (t.competencies && t.competencies.length > 0) {
        const competencyTbody = document.getElementById('competencyTable');
        competencyTbody.innerHTML = '';
        t.competencies.forEach(c => {
            competencyTbody.innerHTML += `
                <tr>
                    <td>${c.module}</td>
                    <td>${c.lesson}</td>
                    <td>${c.score}</td>
                    <td><span class="badge bg-${c.remarks === 'Competent' ? 'success' : 'warning'}">${c.remarks}</span></td>
                </tr>
            `;
        });
    } else {
        document.getElementById('competencyTable').innerHTML = '<tr><td colspan="4" class="text-center">No competency records found.</td></tr>';
    }
}