const API_BASE_URL = 'http://localhost/hohoo-ville/api';
let lessonModal, moduleModal;

document.addEventListener('DOMContentLoaded', function() {
    lessonModal = new bootstrap.Modal(document.getElementById('lessonModal'));
    moduleModal = new bootstrap.Modal(document.getElementById('moduleModal'));

    loadCourses();

    document.getElementById('courseSelect').addEventListener('change', function() {
        const courseId = this.value;
        document.getElementById('createModuleBtn').disabled = !courseId;
        if (courseId) {
            loadModules(courseId);
        } else {
            document.getElementById('modulesContainer').innerHTML = '<p class="text-muted text-center">Please select a course to view its modules.</p>';
        }
    });

    document.getElementById('saveModuleBtn').addEventListener('click', saveModule);
    document.getElementById('saveLessonBtn').addEventListener('click', saveLesson);
});

async function loadCourses() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/manage_modules.php?action=get-courses`);
        if (response.data.success) {
            const select = document.getElementById('courseSelect');
            select.innerHTML = '<option value="">-- Select a Course --</option>';
            response.data.data.forEach(course => {
                select.innerHTML += `<option value="${course.course_id}">${course.course_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

async function loadModules(courseId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/manage_modules.php?action=get-modules&course_id=${courseId}`);
        const container = document.getElementById('modulesContainer');
        container.innerHTML = '';

        if (response.data.success && response.data.data.length > 0) {
            response.data.data.forEach(module => {
                let lessonsHtml = '<ul class="list-group list-group-flush">';
                if (module.lessons.length > 0) {
                    module.lessons.forEach(lesson => {
                        const downloadBtn = lesson.file_path ? `<a href="${lesson.file_path}" target="_blank" class="btn btn-sm btn-outline-secondary"><i class="fas fa-download"></i></a>` : '';
                        lessonsHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">${lesson.lesson_title} ${downloadBtn}</li>`;
                    });
                } else {
                    lessonsHtml += '<li class="list-group-item text-muted">No lessons yet.</li>';
                }
                lessonsHtml += '</ul>';

                container.innerHTML += `
                    <div class="card mb-3">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">${module.module_title}</h5>
                            <button class="btn btn-sm btn-primary add-lesson-btn" data-module-id="${module.module_id}">
                                <i class="fas fa-plus"></i> Add Lesson
                            </button>
                        </div>
                        <div class="card-body p-0">${lessonsHtml}</div>
                    </div>
                `;
            });

            document.querySelectorAll('.add-lesson-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.getElementById('lessonModuleId').value = this.dataset.moduleId;
                    lessonModal.show();
                });
            });
        } else {
            container.innerHTML = '<p class="text-muted text-center">No modules found for this course. Click "Create New Module" to start.</p>';
        }
    } catch (error) {
        console.error('Error loading modules:', error);
    }
}

async function saveModule() {
    const courseId = document.getElementById('courseSelect').value;
    const title = document.getElementById('moduleTitle').value;
    const description = document.getElementById('moduleDescription').value;

    if (!title) {
        alert('Module title is required.');
        return;
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/role/admin/manage_modules.php?action=create-module`, {
            course_id: courseId,
            module_title: title,
            module_description: description
        });
        if (response.data.success) {
            alert('Module created successfully!');
            moduleModal.hide();
            document.getElementById('moduleForm').reset();
            loadModules(courseId);
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error saving module:', error);
    }
}

async function saveLesson() {
    const moduleId = document.getElementById('lessonModuleId').value;
    const title = document.getElementById('lessonTitle').value;
    const file = document.getElementById('lessonFile').files[0];

    if (!title) {
        alert('Lesson title is required.');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'create-lesson');
    formData.append('module_id', moduleId);
    formData.append('lesson_title', title);
    if (file) formData.append('lesson_file', file);

    try {
        const response = await axios.post(`${API_BASE_URL}/role/admin/manage_modules.php`, formData);
        if (response.data.success) {
            alert('Lesson created successfully!');
            lessonModal.hide();
            document.getElementById('lessonForm').reset();
            loadModules(document.getElementById('courseSelect').value);
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error saving lesson:', error);
    }
}