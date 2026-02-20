const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/Hohoo-ville/uploads/';
let lessonItemsModal, lessonContentModal, quizModal, quizResultModal;

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    document.getElementById('traineeName').textContent = user.username || 'Trainee';

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
    
    lessonItemsModal = new bootstrap.Modal(document.getElementById('lessonItemsModal'));
    lessonContentModal = new bootstrap.Modal(document.getElementById('lessonContentModal'));
    quizModal = new bootstrap.Modal(document.getElementById('quizModal'));
    quizResultModal = new bootstrap.Modal(document.getElementById('quizResultModal'));

    const idToLoad = user.trainee_id || user.user_id;
    if (idToLoad) {
        loadTrainingData(idToLoad);
    } else {
        document.getElementById('accordionCore').innerHTML = `<div class="alert alert-danger">User ID not found. Please log in again.</div>`;
    }

    document.getElementById('submitQuizBtn').addEventListener('click', submitQuiz);
    document.getElementById('submitTaskSheetBtn').addEventListener('click', submitTaskSheet);
    document.getElementById('unsubmitTaskSheetBtn').addEventListener('click', unsubmitTaskSheet);
    document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); window.location.href = '../../../login.html'; });
});

async function loadTrainingData(traineeId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainee/training.php?action=get-lessons&trainee_id=${traineeId}`);
        if (response.data.success) {
            renderModules(response.data.data);
        } else {
            document.getElementById('accordionCore').innerHTML = `<div class="alert alert-warning">${response.data.message}</div>`;
        }
    } catch (error) {
        console.error('Error loading training data:', error);
        document.getElementById('accordionCore').innerHTML = `<div class="alert alert-danger">Failed to load training modules.</div>`;
    }
}

function renderModules(modules) {
    const coreContainer = document.getElementById('accordionCore');
    const commonContainer = document.getElementById('accordionCommon');
    const basicContainer = document.getElementById('accordionBasic');

    coreContainer.innerHTML = '';
    commonContainer.innerHTML = '';
    basicContainer.innerHTML = '';

    if (modules.length === 0) {
        coreContainer.innerHTML = '<div class="alert alert-info">No training modules are available at this time.</div>';
        return;
    }

    modules.forEach(module => {
        let lessonsHtml = '';
        if (module.lessons && module.lessons.length > 0) {
            module.lessons.forEach(lesson => {
                const hasQuiz = lesson.has_quiz;
                const score = lesson.score;
                const totalQuestions = lesson.total_questions;
                const deadline = lesson.deadline;
                const isDeadlinePassed = deadline && new Date(deadline) < new Date();

                let quizButtonHtml = '';
                if (hasQuiz) {
                    if (score !== null) {
                        quizButtonHtml = `<button class="btn btn-sm btn-success disabled"><i class="fas fa-check-circle me-1"></i> Quiz Taken (${score}/${totalQuestions})</button>`;
                    } else if (isDeadlinePassed) {
                        quizButtonHtml = `<button class="btn btn-sm btn-danger disabled"><i class="fas fa-times-circle me-1"></i> Deadline Passed</button>`;
                    } else {
                        quizButtonHtml = `<button class="btn btn-sm btn-primary" onclick="startQuiz(${lesson.lesson_id})"><i class="fas fa-question-circle me-1"></i> Take Quiz</button>`;
                    }
                }

                lessonsHtml += `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <i class="fas fa-book-reader me-2 text-primary"></i>
                            <span>${lesson.lesson_title}</span>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-secondary me-2" onclick="viewLessonItems(${lesson.lesson_id}, '${lesson.lesson_title}')">
                                <i class="fas fa-folder-open me-1"></i> View Materials
                            </button>
                            ${quizButtonHtml}
                        </div>
                    </div>
                `;
            });
        } else {
            lessonsHtml = '<div class="list-group-item text-muted">No learning outcomes in this module yet.</div>';
        }

        const moduleHtml = `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading-${module.module_id}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${module.module_id}">
                        ${module.module_title}
                    </button>
                </h2>
                <div id="collapse-${module.module_id}" class="accordion-collapse collapse" data-bs-parent="#accordion${module.competency_type.charAt(0).toUpperCase() + module.competency_type.slice(1)}">
                    <div class="accordion-body p-0">
                        <div class="list-group list-group-flush">
                            ${lessonsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (module.competency_type === 'core') coreContainer.innerHTML += moduleHtml;
        else if (module.competency_type === 'common') commonContainer.innerHTML += moduleHtml;
        else if (module.competency_type === 'basic') basicContainer.innerHTML += moduleHtml;
    });
}

window.viewLessonItems = async function(lessonId, lessonTitle) {
    document.getElementById('lessonItemsTitle').textContent = lessonTitle;
    const contentsList = document.getElementById('lessonItemsContentsList');
    const taskSheetsList = document.getElementById('lessonItemsTaskSheetsList');
    
    contentsList.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div> Loading...</div>';
    taskSheetsList.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div> Loading...</div>';

    lessonItemsModal.show();

    try {

        const user = JSON.parse(localStorage.getItem('user'));
        const response = await axios.get(`${API_BASE_URL}/role/trainee/training.php?action=get-lessons&trainee_id=${user.trainee_id}`);
        
        if (response.data.success) {
            let lesson = null;
            for (const module of response.data.data) {
                const found = module.lessons.find(l => l.lesson_id == lessonId);
                if (found) {
                    lesson = found;
                    break;
                }
            }

            if (lesson) {
                renderLessonItems(lesson);
            } else {
                contentsList.innerHTML = '<div class="alert alert-warning">Lesson not found.</div>';
                taskSheetsList.innerHTML = '';
            }
        }
    } catch (error) {
        console.error('Error loading lesson items:', error);
        contentsList.innerHTML = '<div class="alert alert-danger">Error loading materials.</div>';
        taskSheetsList.innerHTML = '';
    }
}

function renderLessonItems(lesson) {
    const contentsList = document.getElementById('lessonItemsContentsList');
    const taskSheetsList = document.getElementById('lessonItemsTaskSheetsList');

    // Render Information Sheets
    contentsList.innerHTML = '';
    if (lesson.lesson_contents && lesson.lesson_contents.length > 0) {
        lesson.lesson_contents.forEach(item => {
            contentsList.innerHTML += `
                <button class="list-group-item list-group-item-action" onclick="viewContent('content', ${item.content_id}, '${item.title}')">
                    <i class="fas fa-file-alt me-2 text-primary"></i> ${item.title}
                </button>
            `;
        });
    } else {
        contentsList.innerHTML = '<div class="text-muted small">No information sheets available.</div>';
    }

    // Render Task Sheets
    taskSheetsList.innerHTML = '';
    if (lesson.task_sheets && lesson.task_sheets.length > 0) {
        lesson.task_sheets.forEach(item => {
            const isSubmitted = item.is_submitted ? true : false;
            const statusBadge = isSubmitted ? '<span class="badge bg-success float-end">Submitted</span>' : '';
            taskSheetsList.innerHTML += `
                <button class="list-group-item list-group-item-action" onclick="viewContent('task', ${item.task_sheet_id}, '${item.title}', ${lesson.lesson_id}, ${isSubmitted})">
                    <i class="fas fa-tasks me-2 ${isSubmitted ? 'text-success' : 'text-primary'}"></i> ${item.title} ${statusBadge}
                </button>
            `;
        });
    } else {
        taskSheetsList.innerHTML = '<div class="text-muted small">No task sheets available.</div>';
    }

    // Also show file download if available (for basic/common)
    if (lesson.lesson_file_path) {
        contentsList.innerHTML += `
            <a href="${UPLOADS_URL}lessons/${lesson.lesson_file_path}" target="_blank" class="list-group-item list-group-item-action">
                <i class="fas fa-download me-2 text-info"></i> Download Lesson File
            </a>
        `;
    }
}

window.viewContent = async function(type, id, title, lessonId = null, isSubmitted = false) {
    const modalTitle = document.getElementById('lessonContentTitle');
    const modalBody = document.getElementById('lessonContentBody');
    const modalFooter = document.getElementById('lessonContentFooter');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = '<div class="text-center p-5"><div class="spinner-border"></div></div>';
    
    // Hide footer by default (only for task sheets)
    modalFooter.style.display = 'none';
    
    lessonItemsModal.hide();
    lessonContentModal.show();

    try {
        const action = type === 'content' ? 'get-lesson-content' : 'get-task-sheet';
        const response = await axios.get(`${API_BASE_URL}/role/trainee/training.php?action=${action}&id=${id}`);
        
        if (response.data.success) {
            modalBody.innerHTML = response.data.data.content;
            
            // Enable inputs for trainee interaction
            modalBody.querySelectorAll('input, textarea, select').forEach(el => {
                el.disabled = false;
            });
            
            if (type === 'task') {
                modalFooter.style.display = 'block';
                const submitBtn = document.getElementById('submitTaskSheetBtn');
                const unsubmitBtn = document.getElementById('unsubmitTaskSheetBtn');
                
                submitBtn.dataset.lessonId = lessonId;
                submitBtn.dataset.taskSheetId = id;
                unsubmitBtn.dataset.lessonId = lessonId;
                unsubmitBtn.dataset.taskSheetId = id;

                if (isSubmitted) {
                    submitBtn.style.display = 'none';
                    unsubmitBtn.style.display = 'inline-block';
                } else {
                    submitBtn.style.display = 'inline-block';
                    unsubmitBtn.style.display = 'none';
                }
            }
        } else {
            modalBody.innerHTML = `<div class="alert alert-warning">${response.data.message}</div>`;
        }
    } catch (error) {
        console.error('Error loading content:', error);
        modalBody.innerHTML = '<div class="alert alert-danger">Failed to load content.</div>';
    }
    
    // Handle back button behavior
    lessonContentModal._element.addEventListener('hidden.bs.modal', function () {
        // When content modal closes, re-open items modal if it wasn't closed explicitly
        // This is a bit tricky with Bootstrap modals. 
        // Better to just let user reopen items from main list.
    }, { once: true });
}

window.startQuiz = async function(lessonId) {
    const container = document.getElementById('quizQuestionsContainer');
    container.innerHTML = '<div class="text-center p-5"><div class="spinner-border"></div></div>';
    
    // Store lessonId for submission
    document.getElementById('quizForm').dataset.lessonId = lessonId;
    
    quizModal.show();

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainee/training.php?action=get-quiz&lesson_id=${lessonId}`);
        
        if (response.data.success) {
            const questions = response.data.data;
            container.innerHTML = '';
            
            if (questions.length === 0) {
                container.innerHTML = '<div class="alert alert-info">No questions found for this quiz.</div>';
                return;
            }

            questions.forEach((q, index) => {
                let optionsHtml = '';
                q.options.forEach(opt => {
                    optionsHtml += `
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="radio" name="q_${q.question_id}" id="opt_${opt.option_id}" value="${opt.option_id}">
                            <label class="form-check-label" for="opt_${opt.option_id}">${opt.option_text}</label>
                        </div>
                    `;
                });

                container.innerHTML += `
                    <div class="mb-4">
                        <h6 class="fw-bold">${index + 1}. ${q.question_text}</h6>
                        <div class="ms-3">${optionsHtml}</div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = `<div class="alert alert-warning">${response.data.message}</div>`;
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        container.innerHTML = '<div class="alert alert-danger">Failed to load quiz.</div>';
    }
}

function submitQuiz() {
    const user = JSON.parse(localStorage.getItem('user'));
    const lessonId = document.getElementById('quizForm').dataset.lessonId;
    const container = document.getElementById('quizQuestionsContainer');
    
    // Collect answers
    const answers = {};
    const questions = container.querySelectorAll('input[type="radio"]:checked');
    
    questions.forEach(input => {
        const questionId = input.name.replace('q_', '');
        answers[questionId] = input.value;
    });

    // If no answers, ask for confirmation
    if (Object.keys(answers).length === 0) {
        swal({
            title: 'No answers selected',
            text: "You haven't answered any questions. Are you sure you want to submit?",
            type: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, submit'
        }, function(willSubmit) {
            if (willSubmit) {
                performQuizSubmission(user, lessonId, answers);
            }
        });
    } else {
        performQuizSubmission(user, lessonId, answers);
    }
}

async function performQuizSubmission(user, lessonId, answers) {
    const btn = document.getElementById('submitQuizBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainee/training.php?action=submit-quiz`, {
            trainee_id: user.trainee_id,
            lesson_id: lessonId,
            answers: answers
        });

        if (response.data.success) {
            quizModal.hide();
            
            // Show result modal
            const result = response.data.data;
            document.getElementById('quizResultScore').textContent = `${result.score} / ${result.total_questions}`;
            
            const percentageEl = document.getElementById('quizResultPercentage');
            percentageEl.textContent = `${result.percentage}%`;
            
            if (result.percentage >= 80) {
                percentageEl.className = 'lead text-success fw-bold';
                percentageEl.innerHTML += ' <br><span class="badge bg-success">Passed</span>';
            } else {
                percentageEl.className = 'lead text-danger fw-bold';
                percentageEl.innerHTML += ' <br><span class="badge bg-danger">Failed</span>';
            }
            
            quizResultModal.show();
            
            // Refresh the main list to update status
            loadTrainingData(user.trainee_id);
        } else {
            swal('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error submitting quiz:', error);
        swal('Error', 'Failed to submit quiz.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Quiz';
    }
}

async function submitTaskSheet() {
    const btn = document.getElementById('submitTaskSheetBtn');
    const lessonId = btn.dataset.lessonId;
    const taskSheetId = btn.dataset.taskSheetId;
    const user = JSON.parse(localStorage.getItem('user'));

    // Capture the state of the task sheet
    const contentContainer = document.getElementById('lessonContentBody');
    
    // Sync checkbox state to attribute for serialization
    contentContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb.checked) {
            cb.setAttribute('checked', 'checked');
        } else {
            cb.removeAttribute('checked');
        }
    });

    // Sync text input state
    contentContainer.querySelectorAll('input[type="text"], textarea').forEach(input => {
        input.setAttribute('value', input.value);
        if (input.tagName === 'TEXTAREA') {
            input.innerHTML = input.value;
        }
    });

    const content = contentContainer.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainee/training.php?action=submit-task-sheet`, {
            trainee_id: user.trainee_id,
            lesson_id: lessonId,
            task_sheet_id: taskSheetId,
            submitted_content: content
        });

        if (response.data.success) {
            swal('Success', 'Task sheet submitted successfully!', 'success');
            lessonContentModal.hide();
            loadTrainingData(user.trainee_id); // Refresh data to update status
        } else {
            swal('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error submitting task sheet:', error);
        swal('Error', 'Failed to submit task sheet.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Task Sheet';
    }
}

function unsubmitTaskSheet() {
    const btn = document.getElementById('unsubmitTaskSheetBtn');
    const lessonId = btn.dataset.lessonId;
    const taskSheetId = btn.dataset.taskSheetId;
    const user = JSON.parse(localStorage.getItem('user'));

    console.log('Unsubmit params:', {lessonId, taskSheetId, trainee_id: user.trainee_id});

    swal({
        title: 'Unsubmit Task Sheet?',
        text: "Your previous submission will be removed.",
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, unsubmit'
    }, function(willDelete) {
        if (!willDelete) {
            console.log('Unsubmit cancelled');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Unsubmitting...';

        try {
            const payload = {
                trainee_id: parseInt(user.trainee_id),
                lesson_id: parseInt(lessonId),
                task_sheet_id: parseInt(taskSheetId)
            };
            console.log('Sending payload:', payload);

            axios.post(`${API_BASE_URL}/role/trainee/training.php?action=unsubmit-task-sheet`, payload)
                .then(response => {
                    console.log('Response:', response.data);

                    if (response.data.success) {
                        swal('Success', 'Task sheet unsubmitted successfully.', 'success');
                        lessonContentModal.hide();
                        loadTrainingData(user.trainee_id); // Refresh data to update status
                    } else {
                        swal('Error', 'Error: ' + response.data.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error unsubmitting:', error.response?.data || error.message);
                    swal('Error', 'Failed to unsubmit: ' + (error.response?.data?.message || error.message), 'error');
                })
                .finally(() => {
                    btn.disabled = false;
                    btn.textContent = 'Unsubmit';
                });
        } catch (error) {
            console.error('Error in unsubmit:', error);
            swal('Error', 'An error occurred: ' + error.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Unsubmit';
        }
    });
}