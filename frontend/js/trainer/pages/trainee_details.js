const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainees/';
let contentModal;

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const traineeId = urlParams.get('id');

    const contentModalEl = document.getElementById('contentModal');
    if (contentModalEl) {
        contentModal = new bootstrap.Modal(contentModalEl);
    }

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
        const response = await axios.get(`${API_BASE_URL}/role/trainer/trainee_details.php?trainee_id=${traineeId}`);
        if (response.data.success) {
            const details = response.data.data;
            populateTraineeData(details);
        } else {
            document.getElementById('profile-content').innerHTML = `<div class="alert alert-warning">${response.data.message}</div>`;
        }
    } catch (error) {
        console.error('Error loading trainee details:', error);
        document.getElementById('profile-content').innerHTML = '<div class="alert alert-danger">Failed to load trainee details.</div>';
    }
}

function populateTraineeData(details) {
    const t = details.profile;
    if (!t) {
        document.getElementById('profile-content').innerHTML = '<div class="alert alert-warning">Trainee profile data not found.</div>';
        return;
    }

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
    setText('profileAddress', [t.house_no_street, t.barangay, t.city_municipality, t.province].filter(Boolean).join(', '));
    
    setText('profileSex', t.sex);
    setText('profileCivilStatus', t.civil_status);
    setText('profileBirthdate', t.birthdate);
    setText('profileAge', t.age);
    setText('profileBirthplace', [t.birthplace_city, t.birthplace_province].filter(Boolean).join(', '));
    setText('profileNationality', t.nationality);

    setText('profileEducation', t.educational_attainment);
    setText('profileEmployment', t.employment_status);
    
    // Training Info
    setText('profileSchoolId', t.trainee_school_id);
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
    const attendance = details.attendance_summary;
    if (attendance) {
        setText('attPresent', attendance.present || 0);
        setText('attAbsent', attendance.absent || 0);
        setText('attLate', attendance.late || 0);
    }

    // Progress Tab
    const progressData = details.training_progress;
    const coreModules = progressData.filter(m => m.competency_type === 'core');
    const commonModules = progressData.filter(m => m.competency_type === 'common');
    const basicModules = progressData.filter(m => m.competency_type === 'basic');

    renderProgressAccordion('progressAccordionCore', coreModules, 'Core');
    renderProgressAccordion('progressAccordionCommon', commonModules, 'Common');
    renderProgressAccordion('progressAccordionBasic', basicModules, 'Basic');
}

function renderProgressAccordion(containerId, modules, competencyName) {
    const accordionContainer = document.getElementById(containerId);
    if (!accordionContainer) return;

    if (modules && modules.length > 0) {
        accordionContainer.innerHTML = '';
        modules.forEach(module => {
            let lessonsHtml = '';
            if (module.lessons && module.lessons.length > 0) {
                module.lessons.forEach(lesson => {
                    // --- Quiz Info ---
                    let quizHtml = '<span class="text-muted">Not taken</span>';
                    if (lesson.quiz) {
                        const score = lesson.quiz.score;
                        const maxScore = lesson.quiz.max_score || 'N/A';
                        const percentage = (maxScore > 0) ? (score / maxScore) * 100 : 0;
                        const badgeClass = percentage >= 75 ? 'bg-success' : 'bg-warning text-dark';
                        quizHtml = `Score: <span class="badge ${badgeClass}">${score}/${maxScore}</span> on ${new Date(lesson.quiz.date_recorded).toLocaleDateString()}`;
                    }

                    // --- Task Sheets Info ---
                    let tasksHtml = '<p class="mb-0 small text-muted">No task sheets submitted.</p>';
                    if (lesson.task_sheets && lesson.task_sheets.length > 0) {
                        tasksHtml = '<ul class="list-unstyled mb-0">';
                        lesson.task_sheets.forEach(task => {
                            const content = task.submitted_content ? btoa(unescape(encodeURIComponent(task.submitted_content))) : '';
                            
                            let statusBadge;
                            switch(task.status) {
                                case 'submitted': statusBadge = 'bg-primary'; break;
                                case 'approved': statusBadge = 'bg-success'; break;
                                case 'rejected': statusBadge = 'bg-danger'; break;
                                default: statusBadge = 'bg-secondary';
                            }
                            const grade = task.grade ? ` | Grade: <strong>${task.grade}</strong>` : '';

                            tasksHtml += `
                                <li class="mb-1">
                                    <a href="#" class="text-decoration-none" onclick="showTaskSheetContent(event, '${content}', '${task.title}')">
                                        <i class="fas fa-file-alt me-1 text-secondary"></i>${task.title}
                                    </a> 
                                    <span class="ms-2 small">
                                        <span class="badge ${statusBadge}">${task.status}</span>
                                        <span class="text-muted">${grade}</span>
                                    </span>
                                </li>`;
                        });
                        tasksHtml += '</ul>';
                    }

                    lessonsHtml += `
                        <div class="list-group-item">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${lesson.lesson_title}</h6>
                            </div>
                            <div class="mt-2 ps-3 border-start">
                                <!-- Quiz Info -->
                                <div class="d-flex align-items-center mb-2">
                                    <i class="fas fa-question-circle fa-fw me-2 text-primary"></i>
                                    <div class="flex-grow-1 small">
                                        <strong>Quiz:</strong> ${quizHtml}
                                    </div>
                                </div>
                                <!-- Task Sheets Info -->
                                <div class="d-flex align-items-start">
                                    <i class="fas fa-tasks fa-fw me-2 text-info"></i>
                                    <div class="flex-grow-1">
                                        ${tasksHtml}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                lessonsHtml = '<div class="list-group-item text-muted">No lessons in this module.</div>';
            }

            accordionContainer.innerHTML += `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="module-header-${module.module_id}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#module-collapse-${module.module_id}" data-bs-parent="#${containerId}">
                            ${module.module_title}
                        </button>
                    </h2>
                    <div id="module-collapse-${module.module_id}" class="accordion-collapse collapse">
                        <div class="accordion-body p-0">
                            <div class="list-group list-group-flush">
                                ${lessonsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        accordionContainer.innerHTML = `<div class="alert alert-light text-center border">No ${competencyName} competency progress found.</div>`;
    }
}

function showTaskSheetContent(event, contentBase64, title) {
    event.preventDefault();
    const modalTitle = document.getElementById('contentModalTitle');
    const modalBody = document.getElementById('contentModalBody');
    
    if (modalTitle && modalBody && contentModal) {
        modalTitle.textContent = title;
        try {
            if (contentBase64) {
                const decodedContent = decodeURIComponent(escape(atob(contentBase64)));
                modalBody.innerHTML = decodedContent;
            } else {
                modalBody.innerHTML = '<div class="alert alert-warning">No content submitted.</div>';
            }
        } catch (e) {
            console.error("Error decoding base64 content", e);
            modalBody.innerHTML = '<div class="alert alert-danger">Could not display content. It might be corrupted.</div>';
        }
        contentModal.show();
    }
}