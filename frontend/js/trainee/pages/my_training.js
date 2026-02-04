const API_BASE_URL = 'http://localhost/hohoo-ville/api';
const LESSON_UPLOADS_URL = 'http://localhost/hohoo-ville/uploads/lessons/';
let lessonItemsModal, lessonContentModal, quizModal, quizResultModal;
let trainingModules = []; // Store training data globally
let currentLessonId = null;
let currentTaskSheetId = null;


function setupUserNav(user) {
    if (user) {
        const traineeNameEl = document.getElementById('traineeName');
        if (traineeNameEl) {
            traineeNameEl.textContent = user.username || 'Trainee';
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.clear();
                window.location.href = '../../../../login.html';
            });
        }
    }
}
document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'trainee') {
        // window.location.href = '../../../../login.html';
        console.error("Not a trainee or not logged in.");
        // return;
    }

    setupUserNav(user);

    // For demo, using trainee_id from user object. In real app, this should be secure.
    const traineeId = user ? user.trainee_id : 5; // Default to 5 for demo

    const lessonItemsEl = document.getElementById('lessonItemsModal');
    if (lessonItemsEl) lessonItemsModal = new bootstrap.Modal(lessonItemsEl);
    const lessonContentEl = document.getElementById('lessonContentModal');
    if (lessonContentEl) lessonContentModal = new bootstrap.Modal(lessonContentEl);
    const quizEl = document.getElementById('quizModal');
    if (quizEl) quizModal = new bootstrap.Modal(quizEl);
    const quizResultEl = document.getElementById('quizResultModal');
    if (quizResultEl) quizResultModal = new bootstrap.Modal(quizResultEl);

    loadTrainingModules(traineeId);

    document.getElementById('submitQuizBtn').addEventListener('click', () => submitQuiz(traineeId));
    document.getElementById('unsubmitTaskSheetBtn').addEventListener('click', () => unsubmitTaskSheet(traineeId));
    document.getElementById('submitTaskSheetBtn').addEventListener('click', () => submitTaskSheet(traineeId));
});

async function loadTrainingModules(traineeId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainee/training.php?action=get-lessons&trainee_id=${traineeId}`);
        
        const coreContainer = document.getElementById('accordionCore');
        const commonContainer = document.getElementById('accordionCommon');
        const basicContainer = document.getElementById('accordionBasic');

        [coreContainer, commonContainer, basicContainer].forEach(el => { if(el) el.innerHTML = ''; });

        if (response.data.success && response.data.data.length > 0) {
            trainingModules = response.data.data; // Store data
            trainingModules.forEach((module, moduleIndex) => {
                let lessonsHtml = '';
                module.lessons.forEach((lesson, lessonIndex) => {
                    let quizButtonHtml = '';
                    let contentButtonHtml = '';
                    let deadlineHtml = '';

                    if (lesson.deadline) {
                        const deadlineDate = new Date(lesson.deadline);
                        const isExpired = new Date() > deadlineDate;
                        const badgeClass = isExpired ? 'bg-danger' : 'bg-warning text-dark';
                        deadlineHtml = `<span class="badge ${badgeClass} me-2">Due: ${deadlineDate.toLocaleString()}</span>`;
                    }

                    if (lesson.has_quiz) {
                        if (lesson.score !== null && lesson.total_questions !== null) {
                            // Quiz taken, show score
                            const percentage = lesson.total_questions > 0 ? Math.round((lesson.score / lesson.total_questions) * 100) : 0;
                            quizButtonHtml = `<button class="btn btn-sm btn-info" onclick="viewQuizResult(${lesson.score}, ${lesson.total_questions}, ${percentage})">
                                                <i class="fas fa-poll-h"></i> View Score
                                              </button>`;
                        } else {
                            // Quiz not taken, show "Take Quiz" button
                            quizButtonHtml = `<button class="btn btn-sm btn-success" onclick="startQuiz(${lesson.lesson_id}, '${lesson.lesson_title}')"><i class="fas fa-pen"></i> Take Quiz</button>`;
                        }
                    }

                    if (lesson.lesson_contents.length > 0 || lesson.task_sheets.length > 0 || lesson.lesson_file_path) {
                        contentButtonHtml = `<button class="btn btn-sm btn-outline-primary" onclick="openLessonItemsModal(${moduleIndex}, ${lessonIndex})">
                                                <i class="fas fa-eye"></i> View Content
                                            </button>`;
                    }

                    lessonsHtml += `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-book me-2"></i> ${lesson.lesson_title} ${deadlineHtml}</span>
                            <div>${contentButtonHtml} ${quizButtonHtml}</div>
                        </div>
                    `;
                });

                let targetContainer = coreContainer;
                let parentId = 'accordionCore';

                if (module.competency_type === 'common') {
                    targetContainer = commonContainer;
                    parentId = 'accordionCommon';
                } else if (module.competency_type === 'basic') {
                    targetContainer = basicContainer;
                    parentId = 'accordionBasic';
                }

                const item = `
                    <div class="accordion-item">
                        <h2 class="accordion-header" id="heading_${module.module_id}">
                            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${module.module_id}">
                                ${module.module_title}
                            </button>
                        </h2>
                        <div id="collapse_${module.module_id}" class="accordion-collapse collapse show" data-bs-parent="#${parentId}">
                            <div class="list-group list-group-flush">${lessonsHtml}</div>
                        </div>
                    </div>
                `;
                
                if (targetContainer) targetContainer.innerHTML += item;
            });

            // Set empty messages for tabs with no content
            if (coreContainer.innerHTML === '') coreContainer.innerHTML = '<div class="alert alert-light text-center">No core competencies available.</div>';
            if (commonContainer.innerHTML === '') commonContainer.innerHTML = '<div class="alert alert-light text-center">No common competencies available.</div>';
            if (basicContainer.innerHTML === '') basicContainer.innerHTML = '<div class="alert alert-light text-center">No basic competencies available.</div>';
        } else {
            coreContainer.innerHTML = '<div class="alert alert-info">No training materials have been posted yet. Please check back later.</div>';
        }
    } catch (error) {
        console.error('Error loading training modules:', error);
        // document.getElementById('modulesAccordion').innerHTML = '<div class="alert alert-danger">Could not load training materials.</div>';
    }
}

window.openLessonItemsModal = function(moduleIndex, lessonIndex) {
    const lesson = trainingModules[moduleIndex].lessons[lessonIndex];
    const module = trainingModules[moduleIndex];
    document.getElementById('lessonItemsTitle').textContent = lesson.lesson_title;

    const contentsList = document.getElementById('lessonItemsContentsList');
    const contentsHeader = contentsList.previousElementSibling;

    contentsList.innerHTML = '';

    // Conditional rendering for Information Sheets based on competency type
    if (module.competency_type === 'core') {
        contentsHeader.style.display = 'block';
        if (lesson.lesson_contents && lesson.lesson_contents.length > 0) {
            lesson.lesson_contents.forEach(item => {
                contentsList.innerHTML += `
                    <a href="#" class="list-group-item list-group-item-action" onclick="event.preventDefault(); viewItemContent('content', ${item.content_id}, '${item.title}')">
                        <i class="fas fa-file-alt me-2"></i> ${item.title}
                    </a>
                `;
            });
        } else {
            contentsList.innerHTML = '<div class="list-group-item text-muted text-center">No information sheets available.</div>';
        }
    } else { // basic or common
        contentsHeader.style.display = 'block';
        if (lesson.lesson_file_path) {
            contentsList.innerHTML = `
                <a href="${LESSON_UPLOADS_URL}${lesson.lesson_file_path}" target="_blank" class="list-group-item list-group-item-action">
                    <i class="fas fa-download me-2"></i> Download: ${lesson.lesson_file_path.split('/').pop()}
                </a>
            `;
        } else {
            contentsList.innerHTML = '<div class="list-group-item text-muted text-center">No information sheet file available.</div>';
        }
    }

    const taskSheetsList = document.getElementById('lessonItemsTaskSheetsList');
    taskSheetsList.innerHTML = '';
    if (lesson.task_sheets && lesson.task_sheets.length > 0) {
        const status = lesson.task_sheet_status;
        let statusBadge = '';
        if (status === 'submitted') {
            statusBadge = '<span class="badge bg-info ms-2">Submitted</span>';
        } else if (status === 'recorded') {
            statusBadge = '<span class="badge bg-success ms-2">Graded</span>';
        }

        lesson.task_sheets.forEach(item => {
            taskSheetsList.innerHTML += `
                <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" onclick="event.preventDefault(); viewItemContent('task', ${item.task_sheet_id}, '${item.title}', '${status}')">
                    <span><i class="fas fa-tasks me-2"></i> ${item.title}</span>
                    ${statusBadge}
                </a>
            `;
        });
    } else {
        taskSheetsList.innerHTML = '<div class="list-group-item text-muted text-center">No task sheets available.</div>';
    }

    lessonItemsModal.show();
};

window.viewItemContent = async function(type, id, title, status = null) {
    const footer = document.getElementById('lessonContentFooter');
    const submitBtn = document.getElementById('submitTaskSheetBtn');
    const unsubmitBtn = document.getElementById('unsubmitTaskSheetBtn');
    footer.style.display = 'none';

    document.getElementById('lessonContentTitle').textContent = title;
    const body = document.getElementById('lessonContentBody');
    body.innerHTML = '<div class="text-center p-5"><div class="spinner-border"></div></div>';
    lessonContentModal.show();

    const action = type === 'content' ? 'get-lesson-content' : 'get-task-sheet';

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainee/training.php?action=${action}&id=${id}`);
        if (response.data.success) {
            const item = response.data.data;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.content || '<p class="text-muted text-center">No content available.</p>';

            // Sanitize for trainee view
            tempDiv.querySelectorAll('button, .btn').forEach(btn => btn.remove());
            tempDiv.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
            tempDiv.querySelectorAll('[onclick]').forEach(el => el.removeAttribute('onclick'));
            tempDiv.querySelectorAll('[style*="cursor: pointer"]').forEach(el => el.style.cursor = 'default');

            if (type === 'task') {
                currentTaskSheetId = id;
                currentLessonId = trainingModules.flatMap(m => m.lessons).find(l => l.task_sheets.some(ts => ts.task_sheet_id == id))?.lesson_id;

                if (status !== 'recorded') {
                    footer.style.display = 'flex';
                    if (status === 'submitted') {
                        submitBtn.textContent = 'Resubmit Task Sheet';
                        unsubmitBtn.style.display = 'inline-block';
                    } else {
                        submitBtn.textContent = 'Submit Task Sheet';
                        unsubmitBtn.style.display = 'none';
                    }
                }
            }

            body.innerHTML = tempDiv.innerHTML;
        } else {
            body.innerHTML = `<div class="alert alert-danger">${response.data.message}</div>`;
        }
    } catch (error) {
        console.error('Error fetching item content:', error);
        body.innerHTML = `<div class="alert alert-danger">Failed to load content.</div>`;
    }
};

window.viewQuizResult = function(score, total, percentage) {
    if (!quizResultModal) return;

    document.getElementById('quizResultScore').textContent = `${score} / ${total}`;
    document.getElementById('quizResultPercentage').textContent = `(${percentage}%)`;
    quizResultModal.show();
}

window.startQuiz = async function(lessonId, lessonTitle) {
    if (!quizModal) return;

    currentLessonId = lessonId;
    document.getElementById('quizTitle').textContent = `Quiz: ${lessonTitle}`;
    const container = document.getElementById('quizQuestionsContainer');
    container.innerHTML = '<div class="text-center"><div class="spinner-border"></div></div>';
    quizModal.show();

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainee/training.php?action=get-quiz&lesson_id=${lessonId}`);
        if (response.data.success) {
            container.innerHTML = '';
            response.data.data.forEach((q, index) => {
                let optionsHtml = '';
                q.options.forEach(opt => {
                    optionsHtml += `
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="question_${q.question_id}" id="option_${opt.option_id}" value="${opt.option_id}" required>
                            <label class="form-check-label" for="option_${opt.option_id}">${opt.option_text}</label>
                        </div>
                    `;
                });

                container.innerHTML += `
                    <div class="mb-4 p-3 border rounded">
                        <p class="fw-bold">${index + 1}. ${q.question_text}</p>
                        <div data-question-id="${q.question_id}">${optionsHtml}</div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = `<div class="alert alert-warning">${response.data.message}</div>`;
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        container.innerHTML = `<div class="alert alert-danger">Failed to load the quiz.</div>`;
    }
}

async function submitQuiz(traineeId) {
    const form = document.getElementById('quizForm');
    if (!form.checkValidity()) {
        alert('Please answer all questions before submitting.');
        form.reportValidity();
        return;
    }

    const answers = {};
    form.querySelectorAll('div[data-question-id]').forEach(qDiv => {
        const questionId = qDiv.dataset.questionId;
        const selectedOption = qDiv.querySelector('input[type="radio"]:checked');
        if (selectedOption) {
            answers[questionId] = selectedOption.value;
        }
    });

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainee/training.php?action=submit-quiz`, {
            trainee_id: traineeId,
            lesson_id: currentLessonId,
            answers: answers
        });

        if (response.data.success) {
            const result = response.data.data;
            document.getElementById('quizResultScore').textContent = `${result.score} / ${result.total_questions}`;
            document.getElementById('quizResultPercentage').textContent = `(${result.percentage}%)`;
            quizModal.hide();
            quizResultModal.show();
            // Refresh the module list to update the button from "Take Quiz" to "View Score"
            const user = JSON.parse(localStorage.getItem('user'));
            const traineeId = user ? user.trainee_id : 5; // Re-get ID
            loadTrainingModules(traineeId);
        } else {
            alert('Error submitting quiz: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error submitting quiz:', error);
        alert('An error occurred while submitting your quiz.');
    }
}

async function submitTaskSheet(traineeId) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !currentLessonId) {
        alert('Could not identify user or lesson. Please try again.');
        return;
    }

    if (!confirm('Are you sure you want to submit this task sheet?')) {
        return;
    }

    const contentBody = document.getElementById('lessonContentBody');
    
    // Persist checkbox states before getting HTML
    contentBody.querySelectorAll('input[type="checkbox"]').forEach(input => {
        if (input.checked) {
            input.setAttribute('checked', 'checked');
        } else {
            input.removeAttribute('checked');
        }
    });

    const submittedContent = contentBody.innerHTML;

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainee/training.php?action=submit-task-sheet`, {
            trainee_id: user.trainee_id,
            lesson_id: currentLessonId, // Note: This is a limitation. See comment below.
            submitted_content: submittedContent
        });

        if (response.data.success) {
            alert('Task sheet submitted successfully!');
            lessonContentModal.hide();
            loadTrainingModules(user.trainee_id);
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error submitting task sheet:', error);
        alert('An error occurred while submitting the task sheet.');
    }
}

async function unsubmitTaskSheet(traineeId) {
    if (!currentLessonId) {
        alert('Could not identify the lesson. Please try again.');
        return;
    }

    if (!confirm('Are you sure you want to unsubmit? This will remove your previous submission.')) {
        return;
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainee/training.php?action=unsubmit-task-sheet`, {
            trainee_id: traineeId,
            lesson_id: currentLessonId,
        });

        if (response.data.success) {
            alert('Task sheet submission has been removed.');
            lessonContentModal.hide();
            loadTrainingModules(traineeId);
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error unsubmitting task sheet:', error);
        alert('An error occurred while unsubmitting the task sheet.');
    }
}