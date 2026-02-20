const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
let currentCourseId = null;

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.trainer_id) {
        Swal.fire({title: 'Error', text: 'Could not identify the trainer. Please log in again.', icon: 'error'});
        window.location.href = '../../../login.html';
        return;
    }
    const trainerId = user.trainer_id;
    loadBatches(trainerId);

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

    // Sidebar manipulation
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

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '../../../login.html';
        });
    }

    document.getElementById('loadGradesBtn').addEventListener('click', loadGrades);
    document.getElementById('saveGradesBtn').addEventListener('click', saveGrades);

    // Inject Lesson/Day Select Dropdown
    const batchSelect = document.getElementById('batchSelect');
    const batchContainer = batchSelect.closest('.col-md-4'); // Assuming Bootstrap structure
    if (batchContainer) {
        const lessonDiv = document.createElement('div');
        lessonDiv.className = 'col-md-4 mb-3';
        lessonDiv.innerHTML = `
            <label class="form-label">Select Day/Lesson</label>
            <select class="form-select" id="lessonSelect">
                <option value="">Summary View</option>
            </select>`;
        batchContainer.parentNode.insertBefore(lessonDiv, batchContainer.nextSibling);
    }

    batchSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const courseId = selectedOption.getAttribute('data-course-id');
        if (courseId) {
            loadLessons(courseId);
        }
    });
});

async function loadBatches(trainerId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_batches.php?trainer_id=${trainerId}`);
        const select = document.getElementById('batchSelect');
        select.innerHTML = '<option value="">Select Batch</option>';

        if (response.data.success) {
            response.data.data.forEach(batch => {
                select.innerHTML += `<option value="${batch.batch_id}" data-course-id="${batch.qualification_id}">${batch.batch_name} - ${batch.course_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

async function loadLessons(courseId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/grading.php?action=get-lessons&course_id=${courseId}`);
        const select = document.getElementById('lessonSelect');
        select.innerHTML = '<option value="">Summary View</option>';
        
        if (response.data.success) {
            response.data.data.forEach(lesson => {
                select.innerHTML += `<option value="${lesson.day_number}">Day ${lesson.day_number} - ${lesson.lesson_title || 'Lesson'}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading lessons:', error);
    }
}

async function loadGrades() {
    const batchSelect = document.getElementById('batchSelect');
    const batchId = batchSelect.value;
    const lessonDay = document.getElementById('lessonSelect') ? document.getElementById('lessonSelect').value : '';

    if (!batchId) {
        Swal.fire({title: 'Warning', text: 'Please select a batch', icon: 'warning'});
        return;
    }

    const selectedOption = batchSelect.options[batchSelect.selectedIndex];
    currentCourseId = selectedOption.getAttribute('data-course-id');

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/grading.php?action=get-grades&batch_id=${batchId}&course_id=${currentCourseId}&day=${lessonDay}`);
        
        if (response.data.success) {
            document.getElementById('gradesCard').style.display = 'block';
            const tbody = document.getElementById('gradesTableBody');
            
            // Update Table Headers dynamically to match new columns
            const table = document.querySelector('#gradesCard table');
            if (table) {
                const thead = table.querySelector('thead');
                if (thead) {
                    if (lessonDay) {
                        // Daily View
                        thead.innerHTML = `
                        <tr>
                            <th>Trainee Name</th>
                            <th>Quiz Score</th>
                            <th>Practical/Task Score</th>
                            <th>Remarks</th>
                        </tr>`;
                    } else {
                        // Summary View
                        thead.innerHTML = `
                        <tr>
                            <th>Trainee Name</th>
                            <th style="width: 100px;">Pre Test</th>
                            <th style="width: 100px;">Post Test</th>
                            <th style="width: 100px;">Activities</th>
                            <th style="width: 100px;">Quizzes</th>
                            <th style="width: 150px;">Task Sheets</th>
                            <th style="width: 100px;">Total</th>
                            <th>Remarks</th>
                        </tr>`;
                    }
                }
            }

            tbody.innerHTML = '';
            
            // Ensure course_id is set from the server response if available
            if (response.data.course_id) currentCourseId = response.data.course_id;

            if (response.data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3">No trainees found for this batch.</td></tr>';
                return;
            }

            let rowsHtml = '';
            response.data.data.forEach(t => {
                if (lessonDay) {
                    // Daily View Rows
                    rowsHtml += `
                    <tr data-id="${t.trainee_id}">
                        <td class="align-middle">${t.first_name} ${t.last_name}</td>
                        <td><input type="number" class="form-control grade-input daily-quiz" value="${t.quiz_score || ''}" min="0" max="100" placeholder="0-100"></td>
                        <td><input type="number" class="form-control grade-input daily-practical" value="${t.practical_score || ''}" min="0" max="100" placeholder="0-100"></td>
                        <td><input type="text" class="form-control remarks" value="${t.remarks || ''}" placeholder="Remarks"></td>
                    </tr>`;
                } else {
                    // Summary View Rows
                    rowsHtml += `
                    <tr data-id="${t.trainee_id}">
                        <td class="align-middle">${t.first_name} ${t.last_name}</td>
                        <td><input type="number" class="form-control form-control-sm grade-input pre-test" value="${t.pre_test || ''}" min="0" max="100" placeholder="0-100"></td>
                        <td><input type="number" class="form-control form-control-sm grade-input post-test" value="${t.post_test || ''}" min="0" max="100" placeholder="0-100"></td>
                        <td><input type="number" class="form-control form-control-sm grade-input activities" value="${t.activities || ''}" min="0" max="100" placeholder="0-100"></td>
                        <td><input type="number" class="form-control form-control-sm grade-input quizzes" value="${t.quizzes || ''}" min="0" max="100" placeholder="0-100"></td>
                        <td>
                            <div class="input-group input-group-sm">
                                <input type="number" class="form-control grade-input task-sheets" value="${t.task_sheets || ''}" min="0" max="100" placeholder="0-100">
                                <button class="btn btn-outline-secondary view-task-sheet" type="button" title="View Task Sheet">
                                    <i class="fas fa-file-image"></i>
                                </button>
                            </div>
                        </td>
                        <td>
                            <input type="number" class="form-control form-control-sm total-grade" value="${t.total_grade || ''}" readonly>
                        </td>
                        <td>
                            <input type="text" class="form-control form-control-sm remarks" value="${t.remarks || ''}" readonly>
                        </td>
                    </tr>`;
                }
            });
            tbody.innerHTML = rowsHtml;
            setupGradeInputs();
        } else {
            Swal.fire({title: 'Error', text: 'Failed to load grades: ' + (response.data.message || 'Unknown error'), icon: 'error'});
        }
    } catch (error) {
        console.error('Error loading grades:', error);
        Swal.fire({title: 'Error', text: 'An error occurred while loading grades. Please check the console for details.', icon: 'error'});
    }
}

function setupGradeInputs() {
    const rows = document.querySelectorAll('#gradesTableBody tr');
    const isDaily = document.getElementById('lessonSelect') && document.getElementById('lessonSelect').value;

    rows.forEach(row => {
        const inputs = row.querySelectorAll('.grade-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => calculateRowTotal(row));
        });

        const taskBtn = row.querySelector('.view-task-sheet');
        if (taskBtn) {
            taskBtn.addEventListener('click', () => {
                // Assuming the image is in the standard assets folder
                window.open(window.location.origin + '/hohoo-ville/frontend/assets/img/task_sheet.png', '_blank');
            });
        }

        if (isDaily) {
            // No auto-calculation for daily view rows yet, or add simple logic if needed
        }
    });
}

function calculateRowTotal(row) {
    const pre = parseFloat(row.querySelector('.pre-test').value) || 0;
    const post = parseFloat(row.querySelector('.post-test').value) || 0;
    const act = parseFloat(row.querySelector('.activities').value) || 0;
    const quiz = parseFloat(row.querySelector('.quizzes').value) || 0;
    const task = parseFloat(row.querySelector('.task-sheets').value) || 0;

    // Calculate average (You can adjust weights here if needed)
    const total = (pre + post + act + quiz + task) / 5;
    
    const totalInput = row.querySelector('.total-grade');
    const remarksInput = row.querySelector('.remarks');
    
    totalInput.value = total.toFixed(2);
    remarksInput.value = total >= 80 ? 'Competent' : 'NYC';
}

async function saveGrades() {
    const rows = document.querySelectorAll('#gradesTableBody tr');
    const lessonDay = document.getElementById('lessonSelect') ? document.getElementById('lessonSelect').value : '';

    const grades = Array.from(rows).map(row => {
        if (lessonDay) {
            return {
                trainee_id: row.getAttribute('data-id'),
                quiz_score: row.querySelector('.daily-quiz').value,
                practical_score: row.querySelector('.daily-practical').value,
                remarks: row.querySelector('.remarks').value
            };
        } else {
            return {
                trainee_id: row.getAttribute('data-id'),
                pre_test: row.querySelector('.pre-test').value,
                post_test: row.querySelector('.post-test').value,
                activities: row.querySelector('.activities').value,
                quizzes: row.querySelector('.quizzes').value,
                task_sheets: row.querySelector('.task-sheets').value,
                total_grade: row.querySelector('.total-grade').value,
                remarks: row.querySelector('.remarks').value
            };
        }
    });

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainer/grading.php?action=save`, {
            course_id: currentCourseId,
            day: lessonDay,
            grades: grades
        });
        
        if (response.data.success) Swal.fire({title: 'Success', text: 'Grades saved successfully', icon: 'success'});
        else Swal.fire({title: 'Error', text: 'Error: ' + (response.data.message || 'Unknown error occurred'), icon: 'error'});
    } catch (error) {
        console.error('Error saving grades:', error);
    }
}