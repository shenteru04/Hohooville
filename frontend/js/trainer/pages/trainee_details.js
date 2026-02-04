const API_BASE_URL = 'http://localhost/hohoo-ville/api';
const UPLOADS_URL = 'http://localhost/hohoo-ville/uploads/trainees/';

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const traineeId = urlParams.get('id');

    if (traineeId) {
        loadTraineeDetails(traineeId);
    } else {
        document.getElementById('profile-content').innerHTML = '<div class="alert alert-danger">No trainee ID provided.</div>';
    }

    // Remove Attendance and Grading pages from sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        const links = sidebar.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href') || '';
            if (href.includes('attendance') || href.includes('grading') || href.includes('my_trainees.html')) {
                const parent = link.closest('li') || link;
                parent.remove();
            }
        });

        // Add Progress Chart link
        const ul = sidebar.querySelector('ul');
        if (ul && !ul.querySelector('a[href="progress_chart.html"]')) {
            const newLi = document.createElement('li');
            newLi.className = 'nav-item';
            newLi.innerHTML = `
                <a class="nav-link" href="progress_chart.html">
                    <i class="fas fa-chart-bar me-2"></i>
                    <span>Progress Chart</span>
                </a>
            `;
            ul.appendChild(newLi);
        }
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '../../../../login.html';
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