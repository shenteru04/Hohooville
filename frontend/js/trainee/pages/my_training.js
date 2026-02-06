const API_BASE_URL = 'http://localhost/hohoo-ville/api';
const UPLOADS_URL = 'http://localhost/hohoo-ville/uploads/';
let lessonItemsModal, lessonContentModal, quizModal, quizResultModal;

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.trainee_id) {
        // Fallback to user_id if trainee_id is not directly in user object
        if (user && user.user_id) {
            // You might need an API to get trainee_id from user_id
            // For now, we'll assume trainee_id is needed.
            // This part might need adjustment based on your login response.
            console.error("Trainee ID not found in user object.");
            // A temporary solution could be to fetch it.
            // For now, we'll just show an error.
            document.getElementById('accordionCore').innerHTML = `<div class="alert alert-danger">Could not identify trainee. Please log in again.</div>`;
            return;
        } else {
            window.location.href = '../../../login.html';
            return;
        }
    }

    document.getElementById('traineeName').textContent = user.username || 'Trainee';
    
    lessonItemsModal = new bootstrap.Modal(document.getElementById('lessonItemsModal'));
    lessonContentModal = new bootstrap.Modal(document.getElementById('lessonContentModal'));
    quizModal = new bootstrap.Modal(document.getElementById('quizModal'));
    quizResultModal = new bootstrap.Modal(document.getElementById('quizResultModal'));

    loadTrainingData(user.trainee_id);

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

async function submitQuiz() {
    const user = JSON.parse(localStorage.getItem('user'));
    const lessonId = document.getElementById('quizForm').dataset.lessonId;
    const container = document.getElementById('quizQuestionsContainer');
    
    // Collect answers
    const answers = {};
    const questions = container.querySelectorAll('input[type="radio"]:checked');
    
    // Basic validation: check if all questions are answered? 
    // Or just submit what is selected. Let's submit what is selected.
    questions.forEach(input => {
        const questionId = input.name.replace('q_', '');
        answers[questionId] = input.value;
    });

    if (Object.keys(answers).length === 0) {
        if(!confirm("You haven't answered any questions. Are you sure you want to submit?")) return;
    }

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
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error submitting quiz:', error);
        alert('Failed to submit quiz.');
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
            alert('Task sheet submitted successfully!');
            lessonContentModal.hide();
            loadTrainingData(user.trainee_id); // Refresh data to update status
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error submitting task sheet:', error);
        alert('Failed to submit task sheet.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Task Sheet';
    }
}

async function unsubmitTaskSheet() {
    const btn = document.getElementById('unsubmitTaskSheetBtn');
    const lessonId = btn.dataset.lessonId;
    const taskSheetId = btn.dataset.taskSheetId;
    const user = JSON.parse(localStorage.getItem('user'));

    if (!confirm('Are you sure you want to unsubmit this task sheet? Your previous submission will be removed.')) {
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Unsubmitting...';

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainee/training.php?action=unsubmit-task-sheet`, {
            trainee_id: user.trainee_id,
            lesson_id: lessonId,
            task_sheet_id: taskSheetId
        });

        if (response.data.success) {
            alert('Task sheet unsubmitted successfully.');
            lessonContentModal.hide();
            loadTrainingData(user.trainee_id); // Refresh data to update status
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error unsubmitting:', error);
        alert('Failed to unsubmit.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Unsubmit';
    }
}