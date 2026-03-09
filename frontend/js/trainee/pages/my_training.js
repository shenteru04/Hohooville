const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/Hohoo-ville/uploads/';
let lessonItemsModal, lessonContentModal, quizModal, quizResultModal;

// Simple Modal replacement for Tailwind (toggles hidden/flex classes)
class SimpleModal {
    constructor(element) {
        this.element = element;
        this.backdrop = null;
    }
    show() {
        if(!this.element) return;
        this.element.classList.remove('hidden');
        this.element.classList.add('flex');
        // Add backdrop
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 z-40 transition-opacity';
        document.body.appendChild(this.backdrop);
        document.body.classList.add('overflow-hidden');
    }
    hide() {
        if(!this.element) return;
        this.element.classList.add('hidden');
        this.element.classList.remove('flex');
        if(this.backdrop) this.backdrop.remove();
        document.body.classList.remove('overflow-hidden');
        this.element.dispatchEvent(new Event('hidden.bs.modal'));
    }
}

function sanitizeLessonMaterialContent(rawHtml, options = {}) {
    const { allowTaskCheckboxes = false } = options;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = rawHtml || '';

    // Remove active/unsafe nodes that are not needed in trainee view.
    wrapper.querySelectorAll('script, iframe, object, embed, template').forEach(node => node.remove());

    // Remove trainer action buttons and any inline event handlers.
    wrapper.querySelectorAll('button').forEach(btn => btn.remove());
    wrapper.querySelectorAll('*').forEach(el => {
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.toLowerCase().startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        });

        // Materials should be view-only (except allowed task-sheet checkboxes).
        if (el.hasAttribute('contenteditable')) {
            el.setAttribute('contenteditable', 'false');
        }
    });

    // Remove table "Actions" column if present.
    wrapper.querySelectorAll('table').forEach(table => {
        const headers = Array.from(table.querySelectorAll('thead tr:first-child th'));
        let actionIndex = -1;
        headers.forEach((th, idx) => {
            const text = (th.textContent || '').trim().toLowerCase();
            if (text === 'actions' || th.classList.contains('table-actions-header')) {
                actionIndex = idx;
            }
        });

        if (actionIndex >= 0) {
            table.querySelectorAll('tr').forEach(row => {
                const cells = row.children;
                if (cells[actionIndex]) cells[actionIndex].remove();
            });
        }
    });

    // Disable all form controls except task-sheet checkboxes (when allowed).
    wrapper.querySelectorAll('input, textarea, select').forEach(control => {
        const tag = control.tagName.toLowerCase();
        const type = (control.getAttribute('type') || '').toLowerCase();
        const isCheckbox = tag === 'input' && type === 'checkbox';

        if (isCheckbox && allowTaskCheckboxes) {
            control.disabled = false;
            control.classList.add('h-4', 'w-4', 'accent-blue-600', 'cursor-pointer');
        } else {
            control.disabled = true;
            if (tag === 'input' || tag === 'textarea') {
                control.readOnly = true;
            }
            control.classList.add('cursor-not-allowed', 'opacity-90');
        }
    });

    return wrapper.innerHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    document.getElementById('traineeName').textContent = user.username || 'Trainee';

    // Sidebar Logic (Tailwind)
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

    function toggleSidebar() {
        const isClosed = sidebar.classList.contains('-translate-x-full');
        if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
            setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10);
        } else {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
        }
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', toggleSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);
    
    // User Dropdown Logic
    const userMenuBtn = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }

    lessonItemsModal = new SimpleModal(document.getElementById('lessonItemsModal'));
    lessonContentModal = new SimpleModal(document.getElementById('lessonContentModal'));
    quizModal = new SimpleModal(document.getElementById('quizModal'));
    quizResultModal = new SimpleModal(document.getElementById('quizResultModal'));

    const idToLoad = user.trainee_id || user.user_id;
    if (idToLoad) {
        loadTrainingData(idToLoad);
    } else {
        document.getElementById('accordionCore').innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">User ID not found. Please log in again.</div>`;
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
            document.getElementById('accordionCore').innerHTML = `<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">${response.data.message}</div>`;
        }
    } catch (error) {
        console.error('Error loading training data:', error);
        document.getElementById('accordionCore').innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">Failed to load training modules.</div>`;
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
        coreContainer.innerHTML = '<div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative">No training modules are available at this time.</div>';
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
                        quizButtonHtml = `<button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 cursor-not-allowed opacity-75"><i class="fas fa-check-circle mr-1"></i> Quiz Taken (${score}/${totalQuestions})</button>`;
                    } else if (isDeadlinePassed) {
                        quizButtonHtml = `<button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 cursor-not-allowed opacity-75"><i class="fas fa-times-circle mr-1"></i> Deadline Passed</button>`;
                    } else {
                        quizButtonHtml = `<button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition" onclick="startQuiz(${lesson.lesson_id})"><i class="fas fa-question-circle mr-1"></i> Take Quiz</button>`;
                    }
                }

                lessonsHtml += `
                    <div class="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div class="flex items-center">
                            <i class="fas fa-book-reader mr-3 text-blue-500"></i>
                            <span class="text-gray-700 font-medium">${lesson.lesson_title}</span>
                        </div>
                        <div class="flex items-center gap-2 w-96">
                            <button class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition flex-1" onclick="viewLessonItems(${lesson.lesson_id}, '${lesson.lesson_title}')">
                                <i class="fas fa-folder-open mr-1"></i> View Materials
                            </button>
                            <div class="flex-1">
                                ${quizButtonHtml}
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            lessonsHtml = '<div class="p-4 text-gray-500 text-sm italic">No learning outcomes in this module yet.</div>';
        }

        const moduleHtml = `
            <details class="group mb-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <summary class="flex items-center justify-between w-full p-4 text-left cursor-pointer list-none bg-white hover:bg-gray-50 transition-colors focus:outline-none">
                    <span class="font-bold text-gray-800">${module.module_title}</span>
                    <i class="fas fa-chevron-down text-gray-400 transition-transform group-open:rotate-180"></i>
                </summary>
                <div class="border-t border-gray-100 bg-white">
                    ${lessonsHtml}
                </div>
            </details>
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
    
    contentsList.innerHTML = '<div class="text-center py-4"><div class="animate-spin inline-block w-4 h-4 border-2 border-blue-500 rounded-full border-t-transparent"></div> Loading...</div>';
    taskSheetsList.innerHTML = '<div class="text-center py-4"><div class="animate-spin inline-block w-4 h-4 border-2 border-blue-500 rounded-full border-t-transparent"></div> Loading...</div>';

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
                contentsList.innerHTML = '<div class="bg-yellow-100 text-yellow-700 p-3 rounded">Lesson not found.</div>';
                taskSheetsList.innerHTML = '';
            }
        }
    } catch (error) {
        console.error('Error loading lesson items:', error);
        contentsList.innerHTML = '<div class="bg-red-100 text-red-700 p-3 rounded">Error loading materials.</div>';
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
                <button class="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center" onclick="viewContent('content', ${item.content_id}, '${item.title}')">
                    <i class="fas fa-file-alt mr-3 text-blue-500"></i> <span class="text-gray-700">${item.title}</span>
                </button>
            `;
        });
    } else {
        contentsList.innerHTML = '<div class="text-gray-500 text-sm p-3 italic">No information sheets available.</div>';
    }

    // Render Task Sheets
    taskSheetsList.innerHTML = '';
    if (lesson.task_sheets && lesson.task_sheets.length > 0) {
        lesson.task_sheets.forEach(item => {
            const isSubmitted = item.is_submitted ? true : false;
            const statusBadge = isSubmitted ? '<span class="ml-auto inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Submitted</span>' : '';
            taskSheetsList.innerHTML += `
                <button class="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center" onclick="viewContent('task', ${item.task_sheet_id}, '${item.title}', ${lesson.lesson_id}, ${isSubmitted})">
                    <i class="fas fa-tasks mr-3 ${isSubmitted ? 'text-green-500' : 'text-blue-500'}"></i> <span class="text-gray-700">${item.title}</span> ${statusBadge}
                </button>
            `;
        });
    } else {
        taskSheetsList.innerHTML = '<div class="text-gray-500 text-sm p-3 italic">No task sheets available.</div>';
    }

    // Also show file download if available (for basic/common)
    if (lesson.lesson_file_path) {
        contentsList.innerHTML += `
            <a href="${UPLOADS_URL}lessons/${lesson.lesson_file_path}" target="_blank" class="block w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center">
                <i class="fas fa-download mr-3 text-blue-400"></i> <span class="text-blue-600 hover:underline">Download Lesson File</span>
            </a>
        `;
    }
}

window.viewContent = async function(type, id, title, lessonId = null, isSubmitted = false) {
    const modalTitle = document.getElementById('lessonContentTitle');
    const modalBody = document.getElementById('lessonContentBody');
    const modalFooter = document.getElementById('lessonContentFooter');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = '<div class="text-center p-10"><div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>';
    
    // Hide footer by default (only for task sheets)
    modalFooter.style.display = 'none';
    
    lessonItemsModal.hide();
    lessonContentModal.show();

    try {
        const action = type === 'content' ? 'get-lesson-content' : 'get-task-sheet';
        const response = await axios.get(`${API_BASE_URL}/role/trainee/training.php?action=${action}&id=${id}`);
        
        if (response.data.success) {
            const allowTaskCheckboxes = type === 'task' && !isSubmitted;
            modalBody.innerHTML = sanitizeLessonMaterialContent(response.data.data.content, { allowTaskCheckboxes });
            
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
            modalBody.innerHTML = `<div class="bg-yellow-100 text-yellow-700 p-4 rounded">${response.data.message}</div>`;
        }
    } catch (error) {
        console.error('Error loading content:', error);
        modalBody.innerHTML = '<div class="bg-red-100 text-red-700 p-4 rounded">Failed to load content.</div>';
    }
    
    // Handle back button behavior
    lessonContentModal.element.addEventListener('hidden.bs.modal', function () {
        // When content modal closes, re-open items modal if it wasn't closed explicitly
        // This is a bit tricky with Bootstrap modals. 
        // Better to just let user reopen items from main list.
    }, { once: true });
}

window.startQuiz = async function(lessonId) {
    const container = document.getElementById('quizQuestionsContainer');
    container.innerHTML = '<div class="text-center p-10"><div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>';
    
    // Store lessonId for submission
    document.getElementById('quizForm').dataset.lessonId = lessonId;
    
    quizModal.show();

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainee/training.php?action=get-quiz&lesson_id=${lessonId}`);
        
        if (response.data.success) {
            const questions = response.data.data;
            container.innerHTML = '';
            
            if (questions.length === 0) {
                container.innerHTML = '<div class="bg-blue-100 text-blue-700 p-4 rounded">No questions found for this quiz.</div>';
                return;
            }

            questions.forEach((q, index) => {
                let optionsHtml = '';
                q.options.forEach(opt => {
                    optionsHtml += `
                        <div class="flex items-center mb-2">
                            <input class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500" type="radio" name="q_${q.question_id}" id="opt_${opt.option_id}" value="${opt.option_id}">
                            <label class="ml-2 text-sm font-medium text-gray-900" for="opt_${opt.option_id}">${opt.option_text}</label>
                        </div>
                    `;
                });

                container.innerHTML += `
                    <div class="mb-4">
                        <h6 class="font-bold text-gray-800 mb-2">${index + 1}. ${q.question_text}</h6>
                        <div class="ml-4">${optionsHtml}</div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = `<div class="bg-yellow-100 text-yellow-700 p-4 rounded">${response.data.message}</div>`;
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        container.innerHTML = '<div class="bg-red-100 text-red-700 p-4 rounded">Failed to load quiz.</div>';
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
    btn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white rounded-full border-t-transparent mr-2"></span> Submitting...';

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
                percentageEl.className = 'text-xl text-green-600 font-bold';
                percentageEl.innerHTML += ' <br><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Passed</span>';
            } else {
                percentageEl.className = 'text-xl text-red-600 font-bold';
                percentageEl.innerHTML += ' <br><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Failed</span>';
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
    btn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white rounded-full border-t-transparent mr-2"></span> Submitting...';

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
        btn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white rounded-full border-t-transparent mr-2"></span> Unsubmitting...';

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
