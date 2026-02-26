const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const LESSON_UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/lessons/';
let moduleModal, competencyModal, manageLessonModal, viewModuleModal, contentEditorModal;
let currentModules = [];
let currentCompetencyType = 'core'; // Default to core
let currentViewedModuleId = null;
let fieldCounter = 0; // Counter for unique field IDs

document.addEventListener('DOMContentLoaded', async function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
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

    const createModuleEl = document.getElementById('createModuleModal');
    if (createModuleEl) moduleModal = new bootstrap.Modal(createModuleEl);

    const createCompetencyEl = document.getElementById('createCompetencyModal');
    if (createCompetencyEl) competencyModal = new bootstrap.Modal(createCompetencyEl);

    const manageLessonEl = document.getElementById('manageLessonModal');
    if (manageLessonEl) manageLessonModal = new bootstrap.Modal(manageLessonEl);

    const viewModuleEl = document.getElementById('viewModuleModal');
    if (viewModuleEl) viewModuleModal = new bootstrap.Modal(viewModuleEl);

    const contentEditorEl = document.getElementById('contentEditorModal');
    if (contentEditorEl) contentEditorModal = new bootstrap.Modal(contentEditorEl);

    // --- Fix for stacked Bootstrap modals ---
    document.addEventListener('show.bs.modal', function (event) {
        const activeModals = document.querySelectorAll('.modal.show');
        if (activeModals.length > 0) {
            const highestZIndex = Array.from(activeModals)
                .map(modal => parseFloat(window.getComputedStyle(modal).zIndex))
                .reduce((max, z) => Math.max(max, z), 0);
            event.target.style.zIndex = highestZIndex + 10;
            setTimeout(() => {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                const newBackdrop = backdrops[backdrops.length - 1];
                if (newBackdrop) {
                    newBackdrop.style.zIndex = highestZIndex + 9;
                }
            }, 0);
        }
    });

    document.addEventListener('hidden.bs.modal', function () {
        if (document.querySelectorAll('.modal.show').length > 0) {
            document.body.classList.add('modal-open');
        }
    });
    // --- End of fix ---

    if (viewModuleEl) {
        viewModuleEl.addEventListener('hidden.bs.modal', () => {
            currentViewedModuleId = null;
        });
    }

    const user = JSON.parse(localStorage.getItem('user'));
    let trainerId = null;
    if (user) {
        try {
            const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
            if (response.data.success) {
                const trainer = response.data.data;
                trainerId = trainer.trainer_id;
                if (trainer.first_name && trainer.last_name) {
                    const nameEl = document.getElementById('trainerName');
                    if (nameEl) nameEl.textContent = `${trainer.first_name} ${trainer.last_name}`;
                }
                loadTrainerQualifications(trainer.trainer_id);
            }
        } catch (error) {
            console.error('Error fetching trainer ID:', error);
        }
    } else {
        window.location.href = '../../../login.html';
    }

    const qualificationSelect = document.getElementById('qualificationSelect');
    qualificationSelect.addEventListener('change', () => loadDataForTab(currentCompetencyType));

    document.getElementById('core-tab').addEventListener('click', () => {
        currentCompetencyType = 'core';
        loadDataForTab('core');
    });
    document.getElementById('common-tab').addEventListener('click', () => {
        currentCompetencyType = 'common';
        loadDataForTab('common');
    });
    document.getElementById('basic-tab').addEventListener('click', () => {
        currentCompetencyType = 'basic';
        loadDataForTab('basic');
    });

    function loadDataForTab(type) {
        const qualificationId = qualificationSelect.value;
        document.getElementById('modulesListCore').innerHTML = '';
        document.getElementById('modulesListCommon').innerHTML = '';
        document.getElementById('modulesListBasic').innerHTML = '';
        if (qualificationId && trainerId) loadModules(qualificationId, type, trainerId);
    }

    document.getElementById('saveModuleBtn').addEventListener('click', saveModule);
    document.getElementById('saveCompetencyBtn').addEventListener('click', saveCompetency);

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '../../../login.html';
        });
    }
});

window.insertTrainerInput = async function(targetId = 'lessonContent') {
    const { value: label } = await Swal.fire({
        title: 'New Field',
        input: 'text',
        inputLabel: 'Enter a label for the new field:',
        inputValue: 'Custom Field',
        showCancelButton: true
    });

    if (!label || label.trim() === "") {
        return;
    }

    const editor = document.getElementById(targetId);
    const fieldId = `field_${fieldCounter++}`;
    
    // Remove placeholder text if it exists
    const placeholder = editor.querySelector('p.text-muted');
    if (placeholder) {
        placeholder.remove();
    }
    
    const fieldBlock = document.createElement('div');
    fieldBlock.className = 'custom-field-block mb-3 p-3 border rounded';
    fieldBlock.id = fieldId;
    fieldBlock.style.backgroundColor = '#f8f9fa';
    fieldBlock.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
        <strong class="field-label" contenteditable="true" style="cursor: text; padding: 2px 5px; border: 1px dashed #dee2e6; border-radius: 3px;">${label}</strong>
        <div>
            <button type="button" class="btn btn-sm btn-outline-success me-1" onclick="addInputFieldInside('${fieldId}')" title="Add Input Field">
                <i class="fas fa-plus-circle"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="editFieldContent('${fieldId}', true)" title="Edit Content">
                <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteField('${fieldId}')" title="Delete Field">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </div>
    <div class="field-content" contenteditable="true" style="min-height: 50px; padding: 10px; background-color: rgb(255, 255, 255); border: 2px solid rgb(13, 110, 253); border-radius: 4px; cursor: pointer;" onclick="editFieldContent('${fieldId}')"></div>
`;

    editor.appendChild(fieldBlock);

    // Focus the new field
    const contentDiv = fieldBlock.querySelector('.field-content');
    if (contentDiv) contentDiv.focus();
};

window.addInputFieldInside = function(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const contentDiv = field.querySelector('.field-content');
    
    // Remove placeholder if present
    const placeholder = contentDiv.querySelector('em');
    if (placeholder) {
        placeholder.remove();
    }
    
    // Create a new input field
    const inputId = `input_${Date.now()}`;
    const inputHtml = `
<div class="input-group mb-2" id="${inputId}" style="position: relative;" contenteditable="false">
    <span class="input-group-text" style="cursor: pointer;" title="Click to remove bullet" onclick="this.remove()">&bull;</span>
    <input type="text" class="form-control" placeholder="Enter value here...">
    <button class="btn btn-outline-danger btn-sm" type="button" onclick="document.getElementById('${inputId}').remove()" title="Remove Input">
        <i class="fas fa-times"></i>
    </button>
</div>
    `;
    
    contentDiv.insertAdjacentHTML('beforeend', inputHtml);
};

window.editFieldContent = function(fieldId, fromButton = false) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const contentDiv = field.querySelector('.field-content');
    const currentlyEditable = contentDiv.getAttribute('contenteditable') === 'true';
    
    if (currentlyEditable) {
        // If triggered by clicking inside the content, do nothing (keep editing)
        if (!fromButton) {
            return;
        }

        // Stop editing
        contentDiv.setAttribute('contenteditable', 'false');
        contentDiv.style.border = '1px solid #dee2e6';
        contentDiv.style.backgroundColor = 'white';
        
        // If content is empty, show placeholder
        if (contentDiv.innerHTML.trim() === '' || contentDiv.innerHTML.trim() === '<br>') {
            contentDiv.innerHTML = '<em style="color: #6c757d;">Click "Edit" or click here to add content...</em>';
        }
    } else {
        // Start editing
        // Remove placeholder if present
        if (contentDiv.querySelector('em')) {
            contentDiv.innerHTML = '';
        }
        
        contentDiv.setAttribute('contenteditable', 'true');
        contentDiv.style.border = '2px solid #0d6efd';
        contentDiv.style.backgroundColor = '#ffffff';
        contentDiv.focus();
        
        // Place cursor at the end
        const range = document.createRange();
        const sel = window.getSelection();
        if (contentDiv.childNodes.length > 0) {
            range.setStartAfter(contentDiv.childNodes[contentDiv.childNodes.length - 1]);
        } else {
            range.setStart(contentDiv, 0);
        }
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
};

window.deleteField = async function(fieldId) {
    const result = await Swal.fire({
        title: 'Delete Field?',
        text: "Are you sure you want to delete this field?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) {
        return;
    }
    
    const field = document.getElementById(fieldId);
    if (field) {
        field.remove();
    }
};

window.insertTable = function(targetId = 'lessonContent') {
    const editor = document.getElementById(targetId);
    // Remove placeholder text if it exists
    const placeholder = editor.querySelector('p.text-muted');
    if (placeholder) {
        placeholder.remove();
    }

    const tableId = `table_${Date.now()}`;
    const block = document.createElement('div');
    block.className = 'custom-field-block mb-3 p-3 border rounded bg-white';
    block.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <strong contenteditable="true" class="field-label" style="cursor: text; border: 1px dashed #dee2e6; padding: 0 5px;">Table Title</strong>
            <div>
                <button class="btn btn-sm btn-outline-primary" onclick="addTableRow('${tableId}')" title="Add Row"><i class="fas fa-plus"></i> Row</button>
                <button class="btn btn-sm btn-outline-primary" onclick="addTableCol('${tableId}')" title="Add Column"><i class="fas fa-plus"></i> Col</button>
                <button class="btn btn-sm btn-outline-info" onclick="addTableCheckboxCol('${tableId}')" title="Add Checkbox Column"><i class="fas fa-check-square"></i> Checkbox</button>
                <button class="btn btn-sm btn-outline-danger" onclick="this.closest('.custom-field-block').remove()" title="Delete Table"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div class="table-responsive">
            <table class="table table-bordered mb-0" id="${tableId}" style="background-color: white;">
                <thead>
                    <tr>
                        <th><span contenteditable="true">Header 1</span> <button contenteditable="false" class="btn btn-xs btn-outline-danger p-0 px-1 ms-2" onclick="deleteTableCol(this)" title="Delete Column">&times;</button></th>
                        <th><span contenteditable="true">Header 2</span> <button contenteditable="false" class="btn btn-xs btn-outline-danger p-0 px-1 ms-2" onclick="deleteTableCol(this)" title="Delete Column">&times;</button></th>
                        <th class="table-actions-header" style="width: 1%;" contenteditable="false">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td contenteditable="true"></td>
                        <td contenteditable="true"></td>
                        <td class="text-center" contenteditable="false"><button class="btn btn-sm btn-outline-danger" onclick="deleteTableRow(this)" title="Delete Row"><i class="fas fa-trash-alt"></i></button></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    editor.appendChild(block);
};

window.deleteTableRow = async function(btn) {
    const row = btn.closest('tr');
    const tbody = row.closest('tbody');

    if (tbody.rows.length <= 1) {
        Swal.fire('Cannot Delete', "Cannot delete the last row.", 'warning');
        return;
    }

    const result = await Swal.fire({
        title: 'Delete Row?',
        text: "Are you sure you want to delete this row?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;
    
    if (row) {
        row.remove();
    }
};

window.deleteTableCol = async function(btn) {
    const result = await Swal.fire({
        title: 'Delete Column?',
        text: "Are you sure you want to delete this column?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;

    const th = btn.closest('th');
    if (!th) return;
    
    const table = th.closest('table');
    const colIndex = Array.from(th.parentNode.children).indexOf(th);

    if (colIndex === -1) return;

    // Prevent deleting the last content column if it's the only one left before actions
    if (table.tHead.rows[0].cells.length <= 2) {
        Swal.fire('Cannot Delete', "Cannot delete the last column.", 'warning');
        return;
    }

    // Remove header cell and corresponding body cells
    table.querySelectorAll('tr').forEach(row => {
        if (row.cells[colIndex]) row.cells[colIndex].remove();
    });
};

window.addTableRow = function(tableId) {
    const table = document.getElementById(tableId);
    const headerRow = table.tHead.rows[0];
    const colCount = headerRow.cells.length - 1; // Subtract 1 for the actions column
    const tbody = table.tBodies[0];
    
    // Check existing first row to determine column types
    const referenceRow = tbody.rows.length > 0 ? tbody.rows[0] : null;
    
    const row = tbody.insertRow();
    for(let i=0; i<colCount; i++) {
        const cell = row.insertCell();
        if (referenceRow && referenceRow.cells[i].querySelector('input[type="checkbox"]')) {
            cell.contentEditable = "false";
            cell.style.textAlign = "center";
            cell.innerHTML = '<input type="checkbox" class="form-check-input" style="cursor: pointer;">';
        } else {
            cell.contentEditable = "true";
        }
    }
    // Add the actions cell
    const actionCell = row.insertCell();
    actionCell.className = 'text-center';
    actionCell.contentEditable = false;
    actionCell.innerHTML = '<button class="btn btn-sm btn-outline-danger" onclick="deleteTableRow(this)" title="Delete Row"><i class="fas fa-trash-alt"></i></button>';
};

window.addTableCheckboxCol = function(tableId) {
    const table = document.getElementById(tableId);
    const headerRow = table.tHead.rows[0];
    const actionsHeader = headerRow.querySelector('.table-actions-header');

    // Add to header
    const th = document.createElement('th');
    th.style.textAlign = "center";
    th.style.width = "50px";
    th.innerHTML = `<span contenteditable="true">Check</span> <button contenteditable="false" class="btn btn-xs btn-outline-danger p-0 px-1 ms-2" onclick="deleteTableCol(this)" title="Delete Column">&times;</button>`;
    
    if (actionsHeader) {
        headerRow.insertBefore(th, actionsHeader);
    } else {
        headerRow.appendChild(th);
    }

    // Add to body rows
    const colIndex = Array.from(headerRow.children).indexOf(th);
    for(let i=0; i<table.tBodies[0].rows.length; i++) {
        const row = table.tBodies[0].rows[i];
        const cell = row.insertCell(colIndex);
        cell.contentEditable = "false";
        cell.style.textAlign = "center";
        cell.innerHTML = '<input type="checkbox" class="form-check-input" style="cursor: pointer;">';
    }
};

window.addTableCol = function(tableId) {
    const table = document.getElementById(tableId);
    const headerRow = table.tHead.rows[0];
    const actionsHeader = headerRow.querySelector('.table-actions-header');

    // Add to header
    const th = document.createElement('th');
    const headerText = "Header " + (headerRow.cells.length);
    th.innerHTML = `<span contenteditable="true">${headerText}</span> <button contenteditable="false" class="btn btn-xs btn-outline-danger p-0 px-1 ms-2" onclick="deleteTableCol(this)" title="Delete Column">&times;</button>`;
    
    if (actionsHeader) {
        headerRow.insertBefore(th, actionsHeader);
    } else {
        headerRow.appendChild(th);
    }

    // Add to body rows
    const colIndex = Array.from(headerRow.children).indexOf(th);
    for(let i=0; i<table.tBodies[0].rows.length; i++) {
        const row = table.tBodies[0].rows[i];
        const cell = row.insertCell(colIndex);
        cell.contentEditable = "true";
    }
};

window.insertInteractiveQuestion = async function() {
    const { value: question } = await Swal.fire({
        title: 'Quick Check',
        input: 'text',
        inputLabel: 'Enter the question for the quick check:',
        showCancelButton: true
    });

    if (!question || question.trim() === "") {
        return;
    }

    const options = [];
    while (true) {
        const { value: optionText, isDismissed } = await Swal.fire({
            title: `Option ${options.length + 1}`,
            input: 'text',
            inputLabel: `Enter option ${options.length + 1} (or cancel to finish):`,
            showCancelButton: true,
            confirmButtonText: 'Add',
            cancelButtonText: 'Finish'
        });

        if (isDismissed || !optionText || optionText.trim() === "") {
            break;
        }
        options.push(optionText.trim());
    }

    if (options.length < 2) {
        Swal.fire('Not Enough Options', "Please add at least two options for the question.", 'warning');
        return;
    }

    const editor = document.getElementById('lessonContent');
    const uniqueId = 'interactive_q_' + Date.now();

    // Remove placeholder text if it exists
    const placeholder = editor.querySelector('p.text-muted');
    if (placeholder) {
        placeholder.remove();
    }

    let optionsHtml = '';
    options.forEach((opt, index) => {
        const optionId = `${uniqueId}_${index}`;
        optionsHtml += `
        <div class="form-check">
            <input class="form-check-input" type="radio" name="${uniqueId}" id="${optionId}">
            <label class="form-check-label" for="${optionId}">${opt}</label>
        </div>
        `;
    });

    const questionBlock = document.createElement('div');
    questionBlock.className = 'alert alert-info my-3';
    questionBlock.style.backgroundColor = '#e7f3ff';
    questionBlock.style.borderLeft = '4px solid #0d6efd';
    questionBlock.innerHTML = `
    <h6 class="fw-bold mb-2">📝 Quick Check: ${question}</h6>
    <div class="ms-3">
        ${optionsHtml}
    </div>
`;

    editor.appendChild(questionBlock);
};

window.insertCheckboxList = function(targetId = 'editorContent') {
    const editor = document.getElementById(targetId);
    if (!editor) return;

    // Remove placeholder
    const placeholder = editor.querySelector('p.text-muted');
    if (placeholder) placeholder.remove();

    const listId = `checklist_${Date.now()}`;
    const block = document.createElement('div');
    block.className = 'custom-field-block mb-3 p-3 border rounded bg-white';
    block.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <strong contenteditable="true" class="field-label" style="cursor: text; border: 1px dashed #dee2e6; padding: 0 5px;">Checklist</strong>
            <div>
                <button class="btn btn-sm btn-outline-primary" onclick="addChecklistItem('${listId}')" title="Add Item"><i class="fas fa-plus"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="this.closest('.custom-field-block').remove()" title="Delete List"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div id="${listId}">
            <div class="form-check mb-2">
                <input class="form-check-input" type="checkbox">
                <label class="form-check-label" contenteditable="true" style="width: 90%; cursor: text; border-bottom: 1px dashed #eee;">Task Item 1</label>
                <button class="btn btn-xs btn-outline-danger ms-2" onclick="this.closest('.form-check').remove()">&times;</button>
            </div>
        </div>
    `;
    editor.appendChild(block);
};

window.addChecklistItem = function(listId) {
    const list = document.getElementById(listId);
    if (!list) return;
    
    const div = document.createElement('div');
    div.className = 'form-check mb-2';
    div.innerHTML = `
        <input class="form-check-input" type="checkbox">
        <label class="form-check-label" contenteditable="true" style="width: 90%; cursor: text; border-bottom: 1px dashed #eee;">New Item</label>
        <button class="btn btn-xs btn-outline-danger ms-2" onclick="this.closest('.form-check').remove()">&times;</button>
    `;
    list.appendChild(div);
};

async function loadTrainerQualifications(trainerId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_batches.php?trainer_id=${trainerId}`);
        if (response.data.success) {
            const batches = response.data.data;
            const uniqueQuals = [];
            const seen = new Set();
            
            batches.forEach(b => {
                if (!seen.has(b.qualification_id)) {
                    seen.add(b.qualification_id);
                    uniqueQuals.push({ id: b.qualification_id, name: b.course_name });
                }
            });

            const select = document.getElementById('qualificationSelect');
            select.innerHTML = '<option value="">Select Qualification</option>';
            uniqueQuals.forEach(q => {
                select.innerHTML += `<option value="${q.id}">${q.name}</option>`;
            });

            if (uniqueQuals.length === 1) {
                select.value = uniqueQuals[0].id;
                select.style.display = 'none';
                
                let label = document.getElementById('autoQualLabel');
                if (!label) {
                    label = document.createElement('h4');
                    label.id = 'autoQualLabel';
                    label.className = 'mb-3 text-primary fw-bold';
                    select.parentNode.insertBefore(label, select);
                }
                label.textContent = uniqueQuals[0].name;
                label.style.display = 'block';
                
                select.dispatchEvent(new Event('change'));
            } else {
                select.style.display = 'block';
                const label = document.getElementById('autoQualLabel');
                if (label) label.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading trainer qualifications:', error);
    }
}

async function loadModules(qualificationId, competencyType = 'core') {
    let containerId;
    if (competencyType === 'core') containerId = 'modulesListCore';
    else if (competencyType === 'common') containerId = 'modulesListCommon';
    else containerId = 'modulesListBasic';

    const container = document.getElementById(containerId);
    container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border"></div></div>';

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/modules.php?action=list`, { params: { qualification_id: qualificationId, type: competencyType, trainer_id: arguments[2] } });
        container.innerHTML = '';

        if (response.data.success && response.data.data.length > 0) {
            currentModules = response.data.data;
            const spineColors = ['#34495e', '#2980b9', '#27ae60', '#8e44ad', '#c0392b', '#d35400'];

            response.data.data.forEach((module, index) => {
                const color = spineColors[index % spineColors.length];

                container.innerHTML += `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="card h-100 border-0 shadow-sm" style="border-radius: 4px 12px 12px 4px;">
                        <div class="d-flex h-100">
                            <!-- Book Spine -->
                            <div style="width: 24px; background-color: ${color}; border-radius: 4px 0 0 4px; position: relative; flex-shrink: 0; box-shadow: inset -2px 0 5px rgba(0,0,0,0.2);">
                                <div style="position: absolute; top: 15px; bottom: 15px; left: 6px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                                <div style="position: absolute; top: 15px; bottom: 15px; left: 10px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                            </div>
                            
                            <!-- Book Cover Content -->
                            <div class="flex-grow-1 d-flex flex-column bg-white p-0" style="border: 1px solid #dee2e6; border-left: none; border-radius: 0 12px 12px 0;">
                                <div class="card-body pb-2">
                                    <h5 class="card-title fw-bold text-dark" style="font-family: 'Times New Roman', serif; letter-spacing: 0.5px;">${module.module_title}</h5>
                                    <div class="mb-2" style="height: 3px; width: 30px; background-color: ${color};"></div>
                                    <p class="card-text text-muted small" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; min-height: 3em;">
                                        ${module.module_description || 'No description available.'}
                                    </p>
                                    <div class="mt-2">
                                        <span class="badge bg-light text-secondary border">
                                            <i class="fas fa-bookmark me-1"></i> ${module.lessons ? module.lessons.length : 0} Outcomes
                                        </span>
                                    </div>
                                </div>
                                <div class="card-footer bg-light border-top-0 d-flex justify-content-between align-items-center py-2" style="border-radius: 0 0 12px 0;">
                                    <button class="btn btn-sm btn-outline-dark" onclick="openViewModuleModal(${module.module_id})" title="Read">
                                        <i class="fas fa-book-open me-1"></i> Open
                                    </button>
                                    <div class="btn-group">
                                        <button class="btn btn-sm btn-outline-primary" onclick="editModule(${module.module_id})" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" onclick="deleteModule(${module.module_id})" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            });
        } else {
            container.innerHTML = `<div class="col-12"><div class="alert alert-info">No ${competencyType} competency modules found. Create one to get started.</div></div>`;
        }

        if (currentViewedModuleId) {
            openViewModuleModal(currentViewedModuleId);
        }
    } catch (error) {
        console.error('Error loading modules:', error);
        container.innerHTML = '<div class="col-12"><div class="alert alert-danger">Error loading modules.</div></div>';
    }
}

async function saveModule() {
    const id = document.getElementById('moduleId').value;
    const qualificationId = document.getElementById('qualificationSelect').value;
    const title = document.getElementById('moduleTitle').value;
    const description = document.getElementById('moduleDescription').value;

    if (!qualificationId) {
        Swal.fire('Missing Input', 'Please select a qualification first.', 'warning');
        return;
    }

    if (!title) {
        Swal.fire('Missing Input', 'Module title is required.', 'warning');
        return;
    }

    const action = id ? 'update-module' : 'add-module';
    const payload = {
        qualification_id: qualificationId,
        competency_type: currentCompetencyType,
        module_title: title, 
        module_description: description,
        trainer_id: trainerId
    };

    if (id) payload.module_id = id;

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainer/modules.php?action=${action}`, payload);
        if (response.data.success) {
            Swal.fire('Success', `Module ${id ? 'updated' : 'created'} successfully`, 'success');
            moduleModal.hide();
            document.getElementById('createModuleForm').reset();
            loadModules(qualificationId, currentCompetencyType, trainerId);
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error saving module:', error);
        Swal.fire('Error', 'Failed to save module', 'error');
    }
}

async function saveCompetency() {
    const id = document.getElementById('competencyId').value;
    const moduleId = document.getElementById('competencyModuleId').value;
    const title = document.getElementById('competencyTitle').value;
    const description = document.getElementById('competencyDescription').value;

    if (!title) {
        Swal.fire('Missing Input', 'Learning Outcome title is required.', 'warning');
        return;
    }

    const action = id ? 'update-competency' : 'add-competency';
    const payload = {
        module_id: moduleId,
        lesson_title: title,
        lesson_description: description
    };

    if (id) payload.lesson_id = id;

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainer/modules.php?action=${action}`, payload);
        if (response.data.success) {
            Swal.fire('Success', `Learning Outcome ${id ? 'updated' : 'added'} successfully`, 'success');
            competencyModal.hide();
            document.getElementById('createCompetencyForm').reset();
            loadModules(document.getElementById('qualificationSelect').value, currentCompetencyType);
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error saving learning outcome:', error);
        Swal.fire('Error', 'Failed to save learning outcome', 'error');
    }
}

async function deleteModule(id) {
    const result = await Swal.fire({
        title: 'Delete Module?',
        text: "Are you sure you want to delete this module? All competencies inside it will also be deleted.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await axios.delete(`${API_BASE_URL}/role/trainer/modules.php?action=delete-module&id=${id}`);
        if (response.data.success) {
            Swal.fire('Deleted!', 'Module deleted successfully', 'success');
            loadModules(document.getElementById('qualificationSelect').value, currentCompetencyType);
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting module:', error);
        Swal.fire('Error', 'Error deleting module', 'error');
    }
}

async function deleteCompetency(id) {
    const result = await Swal.fire({
        title: 'Delete Learning Outcome?',
        text: "Are you sure you want to delete this learning outcome?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await axios.delete(`${API_BASE_URL}/role/trainer/modules.php?action=delete-competency&id=${id}`);
        if (response.data.success) {
            Swal.fire('Deleted!', 'Learning Outcome deleted successfully', 'success');
            loadModules(document.getElementById('qualificationSelect').value, currentCompetencyType);
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting learning outcome:', error);
        Swal.fire('Error', 'Error deleting learning outcome', 'error');
    }
}

window.openCreateModuleModal = function(type = 'core') {
    if (!moduleModal) return;
    document.getElementById('createModuleForm').reset();
    document.getElementById('moduleId').value = '';
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    document.getElementById('moduleModalTitle').textContent = `Create ${typeName} Competency Module`;
    moduleModal.show();
}

window.editModule = function(id) {
    if (!moduleModal) return;
    const module = currentModules.find(m => m.module_id == id);
    if (!module) return;

    document.getElementById('moduleId').value = module.module_id;
    document.getElementById('moduleTitle').value = module.module_title;
    document.getElementById('moduleDescription').value = module.module_description || '';
    document.getElementById('moduleModalTitle').textContent = 'Edit Core Competency Module';
    moduleModal.show();
}

window.openCreateCompetencyModal = function(moduleId) {
    if (!competencyModal) return;
    document.getElementById('createCompetencyForm').reset();
    document.getElementById('competencyModuleId').value = moduleId;
    document.getElementById('competencyId').value = '';
    document.getElementById('competencyModalTitle').textContent = 'Add Learning Outcome';
    competencyModal.show();
}

window.editCompetency = function(id, moduleId) {
    if (!competencyModal) return;
    const module = currentModules.find(m => m.module_id == moduleId);
    if (!module) return;

    const comp = module.lessons.find(l => l.lesson_id == id);
    if (!comp) return;

    document.getElementById('competencyModuleId').value = moduleId;
    document.getElementById('competencyId').value = comp.lesson_id;
    document.getElementById('competencyTitle').value = comp.lesson_title;
    document.getElementById('competencyDescription').value = comp.lesson_description || '';
    document.getElementById('competencyModalTitle').textContent = 'Edit Learning Outcome';
    competencyModal.show();
}

window.openManageLessonModal = async function(lessonId) {
    if (!manageLessonModal) return;
    document.getElementById('manageLessonId').value = lessonId;
    
    // Reset all panes
    document.getElementById('lessonContentsList').innerHTML = '';
    document.getElementById('taskSheetsList').innerHTML = '';
    document.getElementById('questionsContainer').innerHTML = '';
    document.getElementById('lessonFileUpload').value = '';
    document.getElementById('postingDate').value = '';
    const deadlineInput = document.getElementById('quizDeadline');
    if (deadlineInput) deadlineInput.value = '';

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/modules.php?action=get-lesson-details&lesson_id=${lessonId}`);
        if (response.data.success) {
            const data = response.data.data;
            const competencyType = data.competency_type;
            document.getElementById('manageLessonModal').dataset.competencyType = competencyType;

            const coreManager = document.getElementById('coreContentManager');
            const fileManager = document.getElementById('fileContentManager');

            if (competencyType === 'core') {
                coreManager.classList.remove('d-none');
                fileManager.classList.add('d-none');
                renderLessonContentsList(data.contents || []);
            } else { // basic or common
                coreManager.classList.add('d-none');
                fileManager.classList.remove('d-none');
                const fileContainer = document.getElementById('currentLessonFileContainer');
                const fileLink = document.getElementById('currentLessonFileLink');
                if (data.lesson_file_path) {
                    fileLink.href = LESSON_UPLOADS_URL + data.lesson_file_path;
                    fileLink.textContent = data.lesson_file_path;
                    fileContainer.classList.remove('d-none');
                } else {
                    fileContainer.classList.add('d-none');
                }
            }

            renderTaskSheetsList(data.task_sheets || []);
            document.getElementById('postingDate').value = data.posting_date || '';
            if (deadlineInput && data.deadline) deadlineInput.value = data.deadline;

            if (data.quiz && data.quiz.length > 0) {
                data.quiz.forEach(q => addQuestion(q));
            }
        } else {
            // Still show the modal but with empty lists on failure
            renderLessonContentsList([]);
            document.getElementById('fileContentManager').classList.add('d-none');
            renderTaskSheetsList([]);
            Swal.fire('Error', 'Could not load lesson details: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error loading lesson details:', error);
        Swal.fire('Error', 'Failed to load lesson details', 'error');
    }

    manageLessonModal.show();
}

function renderLessonContentsList(contents) {
    const container = document.getElementById('lessonContentsList');
    container.innerHTML = '';
    if (contents.length === 0) {
        container.innerHTML = '<div class="list-group-item text-center text-muted">No information sheets added yet.</div>';
        return;
    }
    contents.forEach(item => {
        container.innerHTML += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <span><i class="fas fa-file-alt me-2"></i>${item.title}</span>
                <div>
                    <button class="btn btn-sm btn-outline-primary" onclick="openContentEditor('content', ${item.content_id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteContentItem('content', ${item.content_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
}

function renderTaskSheetsList(taskSheets) {
    const container = document.getElementById('taskSheetsList');
    container.innerHTML = '';
    if (taskSheets.length === 0) {
        container.innerHTML = '<div class="list-group-item text-center text-muted">No task sheets added yet.</div>';
        return;
    }
    taskSheets.forEach(item => {
        container.innerHTML += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <span><i class="fas fa-tasks me-2"></i>${item.title}</span>
                <div>
                    <button class="btn btn-sm btn-outline-primary" onclick="openContentEditor('task', ${item.task_sheet_id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteContentItem('task', ${item.task_sheet_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
}

window.openContentEditor = async function(type, itemId = null) {
    document.getElementById('editorItemType').value = type;
    document.getElementById('editorItemId').value = itemId || '';
    document.getElementById('editorItemTitle').value = '';
    document.getElementById('editorContent').innerHTML = '';
    document.getElementById('contentEditorModalLabel').textContent = `${itemId ? 'Edit' : 'Add'} ${type === 'content' ? 'Information Sheet' : 'Task Sheet'}`;

    if (itemId) {
        // Fetch existing content to edit
        const response = await axios.get(`${API_BASE_URL}/role/trainer/modules.php?action=get-${type}&id=${itemId}`);
        if (response.data.success) {
            const item = response.data.data;
            document.getElementById('editorItemTitle').value = item.title;
            document.getElementById('editorContent').innerHTML = item.content || '';
        } else {
            Swal.fire('Error', 'Error fetching content: ' + response.data.message, 'error');
            return;
        }
    }

    contentEditorModal.show();
}

window.addQuestion = function(data = null) {
    const container = document.getElementById('questionsContainer');
    const qIndex = container.children.length;

    const questionText = data ? data.question_text : '';
    const questionType = data ? data.question_type : 'multiple_choice';

    let optionsHtml = '';
    if (data && data.options) {
        data.options.forEach((opt, oIndex) => {
            optionsHtml += createOptionHtml(qIndex, oIndex, opt.option_text, opt.is_correct == 1);
        });
    } else {
        optionsHtml += createOptionHtml(qIndex, 0, '', false);
        optionsHtml += createOptionHtml(qIndex, 1, '', false);
    }

    const qDiv = document.createElement('div');
    qDiv.className = 'card mb-3 question-item';
    qDiv.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <strong>Question ${qIndex + 1}</strong>
            <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.question-item').remove()">Remove</button>
        </div>
        <div class="card-body">
            <input type="text" class="form-control mb-2 question-text" placeholder="Enter question" value="${questionText}">
            <select class="form-select mb-2 question-type" onchange="toggleOptions(this)">
                <option value="multiple_choice" ${questionType === 'multiple_choice' ? 'selected' : ''}>Multiple Choice</option>
                <option value="true_false" ${questionType === 'true_false' ? 'selected' : ''}>True/False</option>
            </select>
            <div class="options-list">
                ${optionsHtml}
            </div>
            <button type="button" class="btn btn-sm btn-secondary mt-2 add-option-btn" onclick="addOption(this, ${qIndex})" style="${questionType === 'true_false' ? 'display:none;' : ''}">+ Add Option</button>
        </div>
    `;

    container.appendChild(qDiv);
}

window.createOptionHtml = function(qIndex, oIndex, text, isCorrect) {
    return `
        <div class="input-group mb-2 option-item">
            <button class="btn btn-outline-danger btn-sm" type="button" onclick="this.closest('.option-item').remove()">X</button>
            <input type="text" class="form-control option-text" placeholder="Option text" value="${text}">
            <div class="input-group-text" title="Mark as correct answer">
                <input class="form-check-input mt-0" type="radio" name="correct_answer_${qIndex}" ${isCorrect ? 'checked' : ''}>
            </div>
        </div>
    `;
}

window.addOption = function(btn, qIndex) {
    const optionsList = btn.previousElementSibling;
    const oIndex = optionsList.children.length;
    const div = document.createElement('div');
    div.innerHTML = createOptionHtml(qIndex, oIndex, '', false);
    optionsList.appendChild(div.firstElementChild);
}

window.toggleOptions = function(select) {
    const cardBody = select.closest('.card-body');
    const addBtn = cardBody.querySelector('.add-option-btn');
    const optionsList = cardBody.querySelector('.options-list');

    if (select.value === 'true_false') {
        addBtn.style.display = 'none';
        optionsList.innerHTML = `
            ${createOptionHtml(0, 0, 'True', false)}
            ${createOptionHtml(0, 1, 'False', false)}
        `;

        const qIndex = Array.from(document.getElementById('questionsContainer').children).indexOf(select.closest('.question-item'));
        optionsList.querySelectorAll('input[type="radio"]').forEach(r => r.name = `correct_answer_${qIndex}`);
    } else {
        addBtn.style.display = 'inline-block';
    }
}

window.saveContent = async function() {
    const lessonId = document.getElementById('manageLessonId').value;
    const itemId = document.getElementById('editorItemId').value;
    const itemType = document.getElementById('editorItemType').value;
    const title = document.getElementById('editorItemTitle').value;

    if (!title) {
        Swal.fire('Missing Input', 'Title is required.', 'warning');
        return;
    }

    const editor = document.getElementById('editorContent');
    editor.querySelectorAll('input[type="text"]').forEach(input => input.setAttribute('value', input.value));
    editor.querySelectorAll('input[type="checkbox"]').forEach(input => {
        if (input.checked) input.setAttribute('checked', 'checked');
        else input.removeAttribute('checked');
    });
    const content = editor.innerHTML;

    const action = `save-${itemType}`;
    const payload = {
        lesson_id: lessonId,
        title: title,
        content: content
    };
    if (itemId) payload.id = itemId;

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainer/modules.php?action=${action}`, payload);
        if (response.data.success) {
            Swal.fire('Success', 'Content saved successfully!', 'success');
            contentEditorModal.hide();
            // Refresh the list in the manage lesson modal
            openManageLessonModal(lessonId);
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error saving content:', error);
        Swal.fire('Error', 'An error occurred while saving content.', 'error');
    }
}

window.saveLessonSettingsAndQuiz = async function() {
    if (!manageLessonModal) return;
    const lessonId = document.getElementById('manageLessonId').value;
    
    const postingDate = document.getElementById('postingDate').value;
    const deadline = document.getElementById('quizDeadline') ? document.getElementById('quizDeadline').value : null;
    const competencyType = document.getElementById('manageLessonModal').dataset.competencyType;
    
    const questions = [];
    document.querySelectorAll('.question-item').forEach((qDiv, qIndex) => {
        const qText = qDiv.querySelector('.question-text').value;
        const qType = qDiv.querySelector('.question-type').value;

        const options = [];
        qDiv.querySelectorAll('.option-item').forEach((oDiv, oIndex) => {
            options.push({
                text: oDiv.querySelector('.option-text').value,
                is_correct: oDiv.querySelector('input[type="radio"]').checked
            });
        });

        questions.push({
            text: qText,
            type: qType,
            options: options
        });
    });

    try {
        const formData = new FormData();
        formData.append('lesson_id', lessonId);
        formData.append('posting_date', postingDate);
        formData.append('deadline', deadline);
        formData.append('quiz', JSON.stringify(questions)); // Send quiz as JSON string

        if (competencyType !== 'core') {
            const fileInput = document.getElementById('lessonFileUpload');
            if (fileInput.files.length > 0) {
                formData.append('lesson_file', fileInput.files[0]);
            }
        }

        const response = await axios.post(`${API_BASE_URL}/role/trainer/modules.php?action=save-lesson-settings`, formData);
        if (response.data.success) {
            Swal.fire('Success', 'Lesson settings and quiz saved successfully!', 'success');
        }
    } catch (error) {
        console.error('Error saving:', error);
        Swal.fire('Error', 'Failed to save details', 'error');
    }
}

window.deleteContentItem = async function(type, id) {
    const result = await Swal.fire({
        title: 'Delete Item?',
        text: `Are you sure you want to delete this ${type === 'content' ? 'information sheet' : 'task sheet'}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;

    const lessonId = document.getElementById('manageLessonId').value;
    const action = `delete-${type}`;
    try {
        const response = await axios.delete(`${API_BASE_URL}/role/trainer/modules.php?action=${action}&id=${id}`);
        if (response.data.success) {
            Swal.fire('Deleted!', 'Item deleted successfully.', 'success');
            openManageLessonModal(lessonId); // Refresh the list
        } else {
            Swal.fire('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        Swal.fire('Error', 'Error deleting item', 'error');
    }
}

window.openViewModuleModal = function(moduleId) {
    if (!viewModuleModal) return;
    const module = currentModules.find(m => m.module_id == moduleId);
    if (!module) return;

    currentViewedModuleId = moduleId;

    document.getElementById('viewModuleTitle').textContent = module.module_title;
    document.getElementById('viewModuleDescription').textContent = module.module_description || 'No description available.';

    const btnAdd = document.getElementById('btnAddOutcomeInModal');
    btnAdd.onclick = function() {
        openCreateCompetencyModal(moduleId);
    };

    const list = document.getElementById('viewModuleOutcomes');
    list.innerHTML = '';

    if (module.lessons && module.lessons.length > 0) {
        module.lessons.forEach(comp => {
            list.innerHTML += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${comp.lesson_title}</h6>
                            <p class="mb-1 text-muted small">${comp.lesson_description || ''}</p>
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="openManageLessonModal(${comp.lesson_id})">
                                <i class="fas fa-cog"></i> Manage
                            </button>
                            <button class="btn btn-outline-secondary" onclick="editCompetency(${comp.lesson_id}, ${moduleId})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteCompetency(${comp.lesson_id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        list.innerHTML = '<div class="list-group-item text-muted">No learning outcomes added yet.</div>';
    }

    viewModuleModal.show();
}