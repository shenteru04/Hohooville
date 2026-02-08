const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }
    document.getElementById('traineeName').textContent = user.username;

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
            cursor: pointer;
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
    if (!document.getElementById('sidebarCollapse')) {
        const navbarContainer = document.querySelector('.navbar .container-fluid');
        if (navbarContainer) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'sidebarCollapse';
            toggleBtn.className = 'btn btn-primary me-2 d-lg-none';
            toggleBtn.type = 'button';
            toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
            
            // Insert as first child to ensure visibility
            navbarContainer.insertBefore(toggleBtn, navbarContainer.firstChild);
            
            toggleBtn.addEventListener('click', () => {
                if (sidebar) sidebar.style.display = 'block';
            });
        }
    }

    const idToLoad = user.trainee_id || user.user_id;
    if (idToLoad) {
        loadGrades(idToLoad);
    } else {
        document.getElementById('core').innerHTML = '<div class="alert alert-danger">User ID not found.</div>';
    }
});

async function loadGrades(traineeId) {
    try {
        // Use training endpoint to get granular lesson status (Quiz & Task Sheets)
        const response = await axios.get(`${API_BASE_URL}/role/trainee/training.php?action=get-lessons&trainee_id=${traineeId}`);
        
        if (response.data.success) {
            // Clear existing content in tabs
            ['core', 'common', 'basic'].forEach(type => {
                const container = document.getElementById(type);
                if (container) container.innerHTML = '';
            });

            response.data.data.forEach(module => {
                const type = (module.competency_type || 'core').toLowerCase();
                const container = document.getElementById(type);

                if (container) {
                    let lessonsHtml = '';
                    let moduleCompetent = true;
                    let hasLessons = false;

                    if (module.lessons && module.lessons.length > 0) {
                        hasLessons = true;
                        module.lessons.forEach(lesson => {
                        // Calculate progress based on Quiz and Task Sheet completion
                        let totalItems = 0;
                        let completedItems = 0;

                        // Check Quiz
                        let quizText = 'N/A';
                        if (lesson.has_quiz) {
                            totalItems++;
                            if (lesson.score !== null) {
                                completedItems++;
                                quizText = `Score: ${lesson.score}/${lesson.total_questions}`;
                            } else {
                                quizText = 'Pending';
                            }
                        }

                        // Check Task Sheet
                        let taskText = 'N/A';
                        if (lesson.task_sheets && lesson.task_sheets.length > 0) {
                            totalItems++;
                            if (lesson.task_sheet_status) {
                                completedItems++;
                                taskText = 'Submitted';
                            } else {
                                taskText = 'Pending';
                            }
                        }

                        // Calculate percentage
                        let progressVal = 0;
                        if (totalItems > 0) {
                            progressVal = (completedItems / totalItems) * 100;
                        } else {
                            progressVal = 0; // No requirements = Pending
                        }

                        const isCompetent = progressVal === 100 && totalItems > 0;
                        if (!isCompetent) moduleCompetent = false;
                        const badgeClass = isCompetent ? 'bg-success' : 'bg-warning text-dark';
                        const borderClass = isCompetent ? 'border-success' : 'border-warning';
                        const remarks = isCompetent ? 'Competent' : 'In Progress';

                        lessonsHtml += `
                            <div class="list-group-item p-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <h6 class="fw-bold mb-0 text-primary">${lesson.lesson_title}</h6>
                                    <span class="badge ${badgeClass}">${remarks}</span>
                                </div>
                                
                                <div class="row g-2 small text-muted mb-2">
                                    <div class="col-auto"><i class="fas fa-pen me-1"></i> Quiz: <span class="fw-bold">${quizText}</span></div>
                                    <div class="col-auto"><i class="fas fa-tasks me-1"></i> Task Sheet: <span class="fw-bold">${taskText}</span></div>
                                </div>

                                <div class="d-flex align-items-center">
                                    <div class="flex-grow-1 me-3">
                                        <div class="progress" style="height: 6px;">
                                            <div class="progress-bar ${isCompetent ? 'bg-success' : 'bg-warning'}" 
                                                 role="progressbar" 
                                                 style="width: ${progressVal}%" 
                                                 aria-valuenow="${progressVal}" aria-valuemin="0" aria-valuemax="100"></div>
                                        </div>
                                    </div>
                                    <span class="fw-bold small">${Math.round(progressVal)}%</span>
                                </div>
                            </div>`;
                        });
                    } else {
                        lessonsHtml = '<div class="p-3 text-muted small">No learning outcomes available.</div>';
                        moduleCompetent = false;
                    }

                    const moduleBadge = (hasLessons && moduleCompetent) 
                        ? '<span class="badge bg-success">Competent</span>' 
                        : '<span class="badge bg-warning text-dark">In Progress</span>';

                    container.innerHTML += `
                        <div class="accordion-item mb-3 border shadow-sm">
                            <h2 class="accordion-header" id="heading-grade-${module.module_id}">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-grade-${module.module_id}">
                                    <div class="d-flex w-100 align-items-center justify-content-between me-3">
                                        <span class="fw-bold text-start"><i class="fas fa-folder-open me-2 text-primary"></i>${module.module_title}</span>
                                        ${moduleBadge}
                                    </div>
                                </button>
                            </h2>
                            <div id="collapse-grade-${module.module_id}" class="accordion-collapse collapse" data-bs-parent="#${type}">
                                <div class="accordion-body p-0">
                                    <div class="list-group list-group-flush">
                                        ${lessonsHtml}
                                    </div>
                                </div>
                            </div>
                        </div>`;
                }
            });
            
            // Handle empty states for tabs
            ['core', 'common', 'basic'].forEach(type => {
                const container = document.getElementById(type);
                if (container && container.innerHTML === '') {
                    container.innerHTML = `<div class="alert alert-light text-center text-muted my-3">No ${type} competencies found.</div>`;
                }
            });
        }
    } catch (error) {
        console.error('Error loading grades:', error);
        const coreContainer = document.getElementById('core');
        if (coreContainer) coreContainer.innerHTML = '<div class="alert alert-danger">Failed to load progress data.</div>';
    }
}