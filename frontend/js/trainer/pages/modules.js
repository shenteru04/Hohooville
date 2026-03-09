const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const LESSON_UPLOADS_URL = window.location.origin + '/Hohoo-ville/uploads/lessons/';
let moduleModal, competencyModal, manageLessonModal, viewModuleModal, contentEditorModal;
let currentModules = [];
let currentCompetencyType = 'core';
let currentViewedModuleId = null;
let fieldCounter = 0;
let trainerId = null;
const modalStack = [];

class SimpleModal {
    constructor(element, options = {}) {
        this.element = element;
        this.backdrop = element.querySelector('[data-modal-backdrop]');
        this.onHide = options.onHide || null;
        this.bindEvents();
    }

    bindEvents() {
        if (this.backdrop) {
            this.backdrop.addEventListener('click', () => this.hide());
        }

        this.element.querySelectorAll('[data-modal-close]').forEach(btn => {
            btn.addEventListener('click', () => this.hide());
        });

        this.element.addEventListener('click', (event) => {
            if (event.target === this.element) this.hide();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            if (modalStack[modalStack.length - 1] === this && !this.element.classList.contains('hidden')) {
                this.hide();
            }
        });
    }

    show() {
        if (!this.element.classList.contains('hidden')) return;
        const zIndex = 50 + (modalStack.length * 10);
        this.element.style.zIndex = String(zIndex);
        this.element.classList.remove('hidden');
        this.element.classList.add('flex');
        modalStack.push(this);
        document.body.classList.add('overflow-hidden');
    }

    hide() {
        if (this.element.classList.contains('hidden')) return;
        this.element.classList.add('hidden');
        this.element.classList.remove('flex');
        const index = modalStack.lastIndexOf(this);
        if (index !== -1) modalStack.splice(index, 1);
        if (!modalStack.length) document.body.classList.remove('overflow-hidden');
        if (typeof this.onHide === 'function') this.onHide();
    }
}

function removeEditorPlaceholder(editor) {
    if (!editor) return;
    const placeholder = editor.querySelector('[data-editor-placeholder]');
    if (placeholder) placeholder.remove();
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    if (!sidebar) return;

    function openSidebar() {
        sidebar.classList.remove('-translate-x-full');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('hidden');
            requestAnimationFrame(() => sidebarOverlay.classList.remove('opacity-0'));
        }
        document.body.classList.add('overflow-hidden');
    }

    function closeSidebar() {
        sidebar.classList.add('-translate-x-full');
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
        }
        if (!modalStack.length) document.body.classList.remove('overflow-hidden');
    }

    function toggleSidebar() {
        if (sidebar.classList.contains('-translate-x-full')) openSidebar();
        else closeSidebar();
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', toggleSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden', 'opacity-0');
            if (!modalStack.length) document.body.classList.remove('overflow-hidden');
        }
    });
}

function initUserMenu() {
    const userMenuButton = document.getElementById('userMenuButton');
    const userMenuDropdown = document.getElementById('userMenuDropdown');
    if (!userMenuButton || !userMenuDropdown) return;

    userMenuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        userMenuDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#userMenuDropdown')) {
            userMenuDropdown.classList.add('hidden');
        }
    });
}

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.clear();
        window.location.href = '/Hohoo-ville/frontend/login.html';
    });
}

function initModuleTabs() {
    ['core', 'common', 'basic'].forEach(type => {
        const tabBtn = document.getElementById(`${type}-tab`);
        if (!tabBtn) return;
        tabBtn.addEventListener('click', () => {
            setActiveModuleTab(type);
            loadDataForTab(type);
        });
    });
    setActiveModuleTab('core');
}

function setActiveModuleTab(type) {
    const target = type === 'common' || type === 'basic' ? type : 'core';
    currentCompetencyType = target;

    document.querySelectorAll('.module-tab-btn').forEach(button => {
        const active = button.dataset.moduleTab === target;
        if (active) {
            button.classList.add('border-blue-200', 'bg-white', 'text-blue-700', 'font-semibold');
            button.classList.remove('border-transparent', 'bg-transparent', 'text-slate-600', 'font-medium');
            button.setAttribute('aria-selected', 'true');
        } else {
            button.classList.remove('border-blue-200', 'bg-white', 'text-blue-700', 'font-semibold');
            button.classList.add('border-transparent', 'bg-transparent', 'text-slate-600', 'font-medium');
            button.setAttribute('aria-selected', 'false');
        }
    });

    document.querySelectorAll('.module-pane').forEach(pane => {
        const active = pane.dataset.modulePane === target;
        pane.classList.toggle('hidden', !active);
        pane.classList.toggle('block', active);
    });
}

function initLessonTabs() {
    const lessonTabs = document.querySelectorAll('.lesson-tab-btn');
    lessonTabs.forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
            setActiveLessonTab(tabBtn.dataset.lessonTab || 'content');
        });
    });
    setActiveLessonTab('content');
}

function setActiveLessonTab(type) {
    const allowed = ['content', 'quiz', 'task-sheet'];
    const target = allowed.includes(type) ? type : 'content';

    document.querySelectorAll('.lesson-tab-btn').forEach(button => {
        const active = button.dataset.lessonTab === target;
        if (active) {
            button.classList.add('border-blue-200', 'bg-white', 'text-blue-700', 'font-semibold');
            button.classList.remove('border-transparent', 'bg-transparent', 'text-slate-600', 'font-medium');
            button.setAttribute('aria-selected', 'true');
        } else {
            button.classList.remove('border-blue-200', 'bg-white', 'text-blue-700', 'font-semibold');
            button.classList.add('border-transparent', 'bg-transparent', 'text-slate-600', 'font-medium');
            button.setAttribute('aria-selected', 'false');
        }
    });

    document.querySelectorAll('.lesson-tab-pane').forEach(pane => {
        const active = pane.dataset.lessonPane === target;
        pane.classList.toggle('hidden', !active);
        pane.classList.toggle('block', active);
    });
}

function loadDataForTab(type) {
    const qualificationSelect = document.getElementById('qualificationSelect');
    const qualificationId = qualificationSelect ? qualificationSelect.value : '';
    document.getElementById('modulesListCore').innerHTML = '';
    document.getElementById('modulesListCommon').innerHTML = '';
    document.getElementById('modulesListBasic').innerHTML = '';
    if (qualificationId && trainerId) {
        loadModules(qualificationId, type, trainerId);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    initSidebar();
    initUserMenu();
    initLogout();
    initModuleTabs();
    initLessonTabs();

    const createModuleEl = document.getElementById('createModuleModal');
    if (createModuleEl) moduleModal = new SimpleModal(createModuleEl);

    const createCompetencyEl = document.getElementById('createCompetencyModal');
    if (createCompetencyEl) competencyModal = new SimpleModal(createCompetencyEl);

    const manageLessonEl = document.getElementById('manageLessonModal');
    if (manageLessonEl) manageLessonModal = new SimpleModal(manageLessonEl);

    const viewModuleEl = document.getElementById('viewModuleModal');
    if (viewModuleEl) {
        viewModuleModal = new SimpleModal(viewModuleEl, {
            onHide: () => { currentViewedModuleId = null; }
        });
    }

    const contentEditorEl = document.getElementById('contentEditorModal');
    if (contentEditorEl) {
        contentEditorModal = new SimpleModal(contentEditorEl, {
            onHide: () => {
                document.getElementById('editorItemId').value = '';
                document.getElementById('editorItemType').value = '';
            }
        });
    }

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            const trainer = response.data.data;
            trainerId = trainer.trainer_id;
            const nameEl = document.getElementById('trainerName');
            if (nameEl) {
                if (trainer.first_name && trainer.last_name) nameEl.textContent = `${trainer.first_name} ${trainer.last_name}`;
                else nameEl.textContent = user.username || 'Trainer';
            }
            loadTrainerQualifications(trainer.trainer_id);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
    }

    const qualificationSelect = document.getElementById('qualificationSelect');
    if (qualificationSelect) {
        qualificationSelect.addEventListener('change', () => {
            loadDataForTab(currentCompetencyType);
        });
    }

    const saveModuleBtn = document.getElementById('saveModuleBtn');
    if (saveModuleBtn) saveModuleBtn.addEventListener('click', saveModule);

    const saveCompetencyBtn = document.getElementById('saveCompetencyBtn');
    if (saveCompetencyBtn) saveCompetencyBtn.addEventListener('click', saveCompetency);
});

window.insertTrainerInput = async function(targetId = 'editorContent') {
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
    if (!editor) return;
    const fieldId = `field_${fieldCounter++}`;

    removeEditorPlaceholder(editor);

    const fieldBlock = document.createElement('div');
    fieldBlock.className = 'custom-field-block mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3';
    fieldBlock.id = fieldId;
    fieldBlock.innerHTML = `
    <div class="mb-2 flex items-center justify-between gap-2">
        <strong class="field-label rounded border border-dashed border-slate-300 px-2 py-0.5 text-sm font-semibold text-slate-700" contenteditable="true" style="cursor: text;">${label}</strong>
        <div class="flex items-center gap-1">
            <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="addInputFieldInside('${fieldId}')" title="Add Input Field">
                <i class="fas fa-plus-circle text-xs"></i>
            </button>
            <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="editFieldContent('${fieldId}', true)" title="Edit Content">
                <i class="fas fa-edit text-xs"></i>
            </button>
            <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" onclick="deleteField('${fieldId}')" title="Delete Field">
                <i class="fas fa-trash text-xs"></i>
            </button>
        </div>
    </div>
    <div class="field-content min-h-[56px] rounded-lg bg-white p-3 text-sm text-slate-700 shadow-sm" contenteditable="true" style="border:2px solid #2563eb; cursor: text;" onclick="editFieldContent('${fieldId}')"></div>
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
    if (!contentDiv) return;

    const placeholder = contentDiv.querySelector('em');
    if (placeholder) placeholder.remove();

    const inputId = `input_${Date.now()}`;
    const inputHtml = `
<div class="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2" id="${inputId}" contenteditable="false">
    <span class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500" style="cursor: pointer;" title="Click to remove bullet" onclick="this.remove()">&bull;</span>
    <input type="text" class="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Enter value here...">
    <button class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" type="button" onclick="document.getElementById('${inputId}').remove()" title="Remove Input">
        <i class="fas fa-times text-xs"></i>
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

        contentDiv.setAttribute('contenteditable', 'false');
        contentDiv.style.border = '1px solid #cbd5e1';
        contentDiv.style.backgroundColor = 'white';
        
        // If content is empty, show placeholder
        if (contentDiv.innerHTML.trim() === '' || contentDiv.innerHTML.trim() === '<br>') {
            contentDiv.innerHTML = '<em style="color: #64748b;">Click "Edit" or click here to add content...</em>';
        }
    } else {
        if (contentDiv.querySelector('em')) {
            contentDiv.innerHTML = '';
        }

        contentDiv.setAttribute('contenteditable', 'true');
        contentDiv.style.border = '2px solid #2563eb';
        contentDiv.style.backgroundColor = '#ffffff';
        contentDiv.focus();

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

window.insertTable = function(targetId = 'editorContent') {
    const editor = document.getElementById(targetId);
    if (!editor) return;
    removeEditorPlaceholder(editor);

    const tableId = `table_${Date.now()}`;
    const block = document.createElement('div');
    block.className = 'custom-field-block mb-3 rounded-xl border border-slate-200 bg-white p-3';
    block.innerHTML = `
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <strong contenteditable="true" class="field-label rounded border border-dashed border-slate-300 px-2 py-0.5 text-sm font-semibold text-slate-700" style="cursor: text;">Table Title</strong>
            <div class="flex flex-wrap items-center gap-1">
                <button class="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="addTableRow('${tableId}')" title="Add Row"><i class="fas fa-plus"></i> Row</button>
                <button class="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="addTableCol('${tableId}')" title="Add Column"><i class="fas fa-plus"></i> Col</button>
                <button class="inline-flex items-center gap-1 rounded-md border border-sky-200 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="addTableCheckboxCol('${tableId}')" title="Add Checkbox Column"><i class="fas fa-check-square"></i> Checkbox</button>
                <button class="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" onclick="this.closest('.custom-field-block').remove()" title="Delete Table"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div class="overflow-x-auto rounded-lg border border-slate-200">
            <table class="min-w-full border-collapse text-sm" id="${tableId}" style="background-color: white;">
                <thead>
                    <tr>
                        <th class="border border-slate-200 bg-slate-50 px-2 py-2 text-left font-semibold text-slate-700"><span contenteditable="true">Header 1</span> <button contenteditable="false" class="ml-2 inline-flex h-5 w-5 items-center justify-center rounded border border-red-200 text-red-700 hover:bg-red-50" onclick="deleteTableCol(this)" title="Delete Column">&times;</button></th>
                        <th class="border border-slate-200 bg-slate-50 px-2 py-2 text-left font-semibold text-slate-700"><span contenteditable="true">Header 2</span> <button contenteditable="false" class="ml-2 inline-flex h-5 w-5 items-center justify-center rounded border border-red-200 text-red-700 hover:bg-red-50" onclick="deleteTableCol(this)" title="Delete Column">&times;</button></th>
                        <th class="table-actions-header border border-slate-200 bg-slate-50 px-2 py-2 text-center font-semibold text-slate-700" style="width: 1%;" contenteditable="false">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="border border-slate-200 px-2 py-2 align-top" contenteditable="true"></td>
                        <td class="border border-slate-200 px-2 py-2 align-top" contenteditable="true"></td>
                        <td class="border border-slate-200 px-2 py-2 text-center" contenteditable="false"><button class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50" onclick="deleteTableRow(this)" title="Delete Row"><i class="fas fa-trash-alt text-xs"></i></button></td>
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
        cell.className = 'border border-slate-200 px-2 py-2 align-top';
        if (referenceRow && referenceRow.cells[i].querySelector('input[type="checkbox"]')) {
            cell.contentEditable = "false";
            cell.style.textAlign = "center";
            cell.innerHTML = '<input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:ring-blue-500" style="cursor: pointer;">';
        } else {
            cell.contentEditable = "true";
        }
    }
    const actionCell = row.insertCell();
    actionCell.className = 'border border-slate-200 px-2 py-2 text-center';
    actionCell.contentEditable = false;
    actionCell.innerHTML = '<button class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50" onclick="deleteTableRow(this)" title="Delete Row"><i class="fas fa-trash-alt text-xs"></i></button>';
};

window.addTableCheckboxCol = function(tableId) {
    const table = document.getElementById(tableId);
    const headerRow = table.tHead.rows[0];
    const actionsHeader = headerRow.querySelector('.table-actions-header');

    const th = document.createElement('th');
    th.className = 'border border-slate-200 bg-slate-50 px-2 py-2 text-center font-semibold text-slate-700';
    th.style.textAlign = "center";
    th.style.width = "50px";
    th.innerHTML = `<span contenteditable="true">Check</span> <button contenteditable="false" class="ml-2 inline-flex h-5 w-5 items-center justify-center rounded border border-red-200 text-red-700 hover:bg-red-50" onclick="deleteTableCol(this)" title="Delete Column">&times;</button>`;
    
    if (actionsHeader) {
        headerRow.insertBefore(th, actionsHeader);
    } else {
        headerRow.appendChild(th);
    }

    const colIndex = Array.from(headerRow.children).indexOf(th);
    for(let i=0; i<table.tBodies[0].rows.length; i++) {
        const row = table.tBodies[0].rows[i];
        const cell = row.insertCell(colIndex);
        cell.contentEditable = "false";
        cell.className = 'border border-slate-200 px-2 py-2 text-center';
        cell.style.textAlign = "center";
        cell.innerHTML = '<input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:ring-blue-500" style="cursor: pointer;">';
    }
};

window.addTableCol = function(tableId) {
    const table = document.getElementById(tableId);
    const headerRow = table.tHead.rows[0];
    const actionsHeader = headerRow.querySelector('.table-actions-header');

    const th = document.createElement('th');
    th.className = 'border border-slate-200 bg-slate-50 px-2 py-2 text-left font-semibold text-slate-700';
    const headerText = "Header " + (headerRow.cells.length);
    th.innerHTML = `<span contenteditable="true">${headerText}</span> <button contenteditable="false" class="ml-2 inline-flex h-5 w-5 items-center justify-center rounded border border-red-200 text-red-700 hover:bg-red-50" onclick="deleteTableCol(this)" title="Delete Column">&times;</button>`;
    
    if (actionsHeader) {
        headerRow.insertBefore(th, actionsHeader);
    } else {
        headerRow.appendChild(th);
    }

    const colIndex = Array.from(headerRow.children).indexOf(th);
    for(let i=0; i<table.tBodies[0].rows.length; i++) {
        const row = table.tBodies[0].rows[i];
        const cell = row.insertCell(colIndex);
        cell.className = 'border border-slate-200 px-2 py-2 align-top';
        cell.contentEditable = "true";
    }
};

window.insertInteractiveQuestion = async function(targetId = 'editorContent') {
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

    const editor = document.getElementById(targetId);
    if (!editor) return;
    const uniqueId = 'interactive_q_' + Date.now();

    removeEditorPlaceholder(editor);

    let optionsHtml = '';
    options.forEach((opt, index) => {
        const optionId = `${uniqueId}_${index}`;
        optionsHtml += `
        <div class="flex items-center gap-2">
            <input class="h-4 w-4 border-slate-300 text-blue-600 focus-visible:ring-blue-500" type="radio" name="${uniqueId}" id="${optionId}">
            <label class="text-sm text-slate-700" for="${optionId}">${opt}</label>
        </div>
        `;
    });

    const questionBlock = document.createElement('div');
    questionBlock.className = 'my-3 rounded-xl border border-blue-200 bg-blue-50 p-4';
    questionBlock.innerHTML = `
    <h6 class="mb-2 text-sm font-semibold text-blue-800">Quick Check: ${question}</h6>
    <div class="space-y-2 pl-1">
        ${optionsHtml}
    </div>
`;

    editor.appendChild(questionBlock);
};

window.insertCheckboxList = function(targetId = 'editorContent') {
    const editor = document.getElementById(targetId);
    if (!editor) return;

    removeEditorPlaceholder(editor);

    const listId = `checklist_${Date.now()}`;
    const block = document.createElement('div');
    block.className = 'custom-field-block mb-3 rounded-xl border border-slate-200 bg-white p-3';
    block.innerHTML = `
        <div class="mb-2 flex items-center justify-between gap-2">
            <strong contenteditable="true" class="field-label rounded border border-dashed border-slate-300 px-2 py-0.5 text-sm font-semibold text-slate-700" style="cursor: text;">Checklist</strong>
            <div class="flex items-center gap-1">
                <button class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="addChecklistItem('${listId}')" title="Add Item"><i class="fas fa-plus text-xs"></i></button>
                <button class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" onclick="this.closest('.custom-field-block').remove()" title="Delete List"><i class="fas fa-trash text-xs"></i></button>
            </div>
        </div>
        <div id="${listId}" class="space-y-2">
            <div class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <input class="h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:ring-blue-500" type="checkbox">
                <label class="w-full border-b border-dashed border-slate-300 text-sm text-slate-700" contenteditable="true" style="cursor: text;">Task Item 1</label>
                <button class="inline-flex h-7 w-7 items-center justify-center rounded border border-red-200 text-red-700 hover:bg-red-50" onclick="this.closest('div.flex').remove()">&times;</button>
            </div>
        </div>
    `;
    editor.appendChild(block);
};

window.addChecklistItem = function(listId) {
    const list = document.getElementById(listId);
    if (!list) return;
    
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2';
    div.innerHTML = `
        <input class="h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:ring-blue-500" type="checkbox">
        <label class="w-full border-b border-dashed border-slate-300 text-sm text-slate-700" contenteditable="true" style="cursor: text;">New Item</label>
        <button class="inline-flex h-7 w-7 items-center justify-center rounded border border-red-200 text-red-700 hover:bg-red-50" onclick="this.closest('div.flex').remove()">&times;</button>
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
                    uniqueQuals.push({
                        id: b.qualification_id,
                        name: b.course_name,
                        courseCode: b.course_code || ''
                    });
                }
            });

            const select = document.getElementById('qualificationSelect');
            select.innerHTML = '<option value="">Select Qualification</option>';
            uniqueQuals.forEach(q => {
                const option = document.createElement('option');
                option.value = q.id;
                option.textContent = q.name;
                option.dataset.courseCode = q.courseCode;
                select.appendChild(option);
            });

            if (uniqueQuals.length === 1) {
                select.value = uniqueQuals[0].id;
                select.classList.add('hidden');
                
                let label = document.getElementById('autoQualLabel');
                if (!label) {
                    label = document.createElement('p');
                    label.id = 'autoQualLabel';
                    label.className = 'mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700';
                    select.parentNode.insertBefore(label, select);
                }
                label.textContent = uniqueQuals[0].name;
                label.classList.remove('hidden');
                
                select.dispatchEvent(new Event('change'));
            } else {
                select.classList.remove('hidden');
                const label = document.getElementById('autoQualLabel');
                if (label) label.classList.add('hidden');
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
    if (!container) return;
    container.innerHTML = `
        <div class="col-span-full rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            <i class="fas fa-circle-notch animate-spin mr-2"></i> Loading modules...
        </div>
    `;

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/modules.php?action=list`, {
            params: {
                qualification_id: qualificationId,
                type: competencyType,
                trainer_id: trainerId
            }
        });
        container.innerHTML = '';

        if (response.data.success && response.data.data.length > 0) {
            currentModules = response.data.data;
            const spineColors = ['#34495e', '#2980b9', '#27ae60', '#8e44ad', '#c0392b', '#d35400'];

            response.data.data.forEach((module, index) => {
                const color = spineColors[index % spineColors.length];

                container.innerHTML += `
                <article class="min-w-0 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
                    <div class="flex min-h-[220px]">
                        <div style="width: 18px; background-color: ${color}; position: relative; flex-shrink: 0; box-shadow: inset -2px 0 5px rgba(0,0,0,0.15);">
                            <div style="position:absolute; top:14px; bottom:14px; left:4px; width:1px; background:rgba(255,255,255,0.35);"></div>
                            <div style="position:absolute; top:14px; bottom:14px; left:8px; width:1px; background:rgba(255,255,255,0.35);"></div>
                        </div>

                        <div class="flex min-w-0 flex-1 flex-col">
                            <div class="flex-1 p-4">
                                <h5 class="truncate text-base font-semibold text-slate-900">${module.module_title}</h5>
                                <div class="my-2 h-[3px] w-10 rounded-full" style="background-color: ${color};"></div>
                                <p class="min-h-[3.5rem] text-sm text-slate-600" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${module.module_description || 'No description available.'}</p>
                                <div class="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                                    <i class="fas fa-bookmark"></i> ${module.lessons ? module.lessons.length : 0} Outcomes
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
                                <button class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="openViewModuleModal(${module.module_id})" title="Open module">
                                    <i class="fas fa-book-open"></i> Open
                                </button>
                                <div class="flex items-center gap-1">
                                    <button class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="editModule(${module.module_id})" title="Edit module">
                                        <i class="fas fa-edit text-xs"></i>
                                    </button>
                                    <button class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" onclick="deleteModule(${module.module_id})" title="Delete module">
                                        <i class="fas fa-trash text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div> 
                </article>
                `;
            });
        } else {
            container.innerHTML = `
                <div class="col-span-full rounded-xl border border-blue-100 bg-blue-50 px-4 py-5 text-sm text-blue-700">
                    No ${competencyType} competency modules found. Create one to get started.
                </div>
            `;
        }

        if (currentViewedModuleId) {
            openViewModuleModal(currentViewedModuleId);
        }
    } catch (error) {
        console.error('Error loading modules:', error);
        container.innerHTML = '<div class="col-span-full rounded-xl border border-red-100 bg-red-50 px-4 py-5 text-sm text-red-700">Error loading modules.</div>';
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
    const user = JSON.parse(localStorage.getItem('user'));
    const payload = {
        qualification_id: qualificationId,
        competency_type: currentCompetencyType,
        module_title: title, 
        module_description: description,
        trainer_id: trainerId,
        user_id: user?.user_id
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
    const user = JSON.parse(localStorage.getItem('user'));
    const payload = {
        module_id: moduleId,
        lesson_title: title,
        lesson_description: description,
        trainer_id: trainerId,
        user_id: user?.user_id
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
    currentCompetencyType = type === 'common' || type === 'basic' ? type : 'core';
    setActiveModuleTab(currentCompetencyType);
    document.getElementById('createModuleForm').reset();
    document.getElementById('moduleId').value = '';
    const typeName = currentCompetencyType.charAt(0).toUpperCase() + currentCompetencyType.slice(1);
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
    const typeName = currentCompetencyType.charAt(0).toUpperCase() + currentCompetencyType.slice(1);
    document.getElementById('moduleModalTitle').textContent = `Edit ${typeName} Competency Module`;
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
    setActiveLessonTab('content');
    
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
                coreManager.classList.remove('hidden');
                fileManager.classList.add('hidden');
                renderLessonContentsList(data.contents || []);
            } else { // basic or common
                coreManager.classList.add('hidden');
                fileManager.classList.remove('hidden');
                const fileContainer = document.getElementById('currentLessonFileContainer');
                const fileLink = document.getElementById('currentLessonFileLink');
                if (data.lesson_file_path) {
                    fileLink.href = LESSON_UPLOADS_URL + data.lesson_file_path;
                    fileLink.textContent = data.lesson_file_path;
                    fileContainer.classList.remove('hidden');
                } else {
                    fileContainer.classList.add('hidden');
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
            document.getElementById('fileContentManager').classList.add('hidden');
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
        container.innerHTML = '<div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">No information sheets added yet.</div>';
        return;
    }
    contents.forEach(item => {
        container.innerHTML += `
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span class="inline-flex items-center gap-2 text-sm text-slate-700"><i class="fas fa-file-alt text-blue-600"></i>${item.title}</span>
                <div class="flex items-center gap-1">
                    <button class="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="openContentEditor('content', ${item.content_id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" onclick="deleteContentItem('content', ${item.content_id})">
                        <i class="fas fa-trash text-xs"></i>
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
        container.innerHTML = '<div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">No task sheets added yet.</div>';
        return;
    }
    taskSheets.forEach(item => {
        container.innerHTML += `
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span class="inline-flex items-center gap-2 text-sm text-slate-700"><i class="fas fa-tasks text-blue-600"></i>${item.title}</span>
                <div class="flex items-center gap-1">
                    <button class="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="openContentEditor('task', ${item.task_sheet_id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" onclick="deleteContentItem('task', ${item.task_sheet_id})">
                        <i class="fas fa-trash text-xs"></i>
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
    
    // Clear content blocks
    const contentItemsContainer = document.getElementById('editorContentItems');
    const noMessage = document.getElementById('noContentBlocksMessage');
    contentItemsContainer.innerHTML = '';
    noMessage.style.display = 'block';
    
    document.getElementById('contentEditorModalLabel').textContent = `${itemId ? 'Edit' : 'Add'} ${type === 'content' ? 'Information Sheet' : 'Task Sheet'}`;

    if (itemId) {
        // Fetch existing content to edit
        const response = await axios.get(`${API_BASE_URL}/role/trainer/modules.php?action=get-${type}&id=${itemId}`);
        if (response.data.success) {
            const item = response.data.data;
            document.getElementById('editorItemTitle').value = item.title;
            
            if (item.content) {
                // Create a single content block with the existing content
                addContentBlockItem();
                const firstBlock = contentItemsContainer.querySelector('.content-block');
                if (firstBlock) {
                    const editor = firstBlock.querySelector('.content-editor');
                    editor.innerHTML = item.content;
                }
            }
        } else {
            Swal.fire('Error', 'Error fetching content: ' + response.data.message, 'error');
            return;
        }
    }

    contentEditorModal.show();
}

/**
 * Add a content block item to the editor
 */
window.addContentBlockItem = function() {
    const container = document.getElementById('editorContentItems');
    const noMessage = document.getElementById('noContentBlocksMessage');
    
    if (noMessage) noMessage.style.display = 'none';

    const itemId = Date.now();
    const html = `
        <div class="content-block bg-white p-3 rounded-md border border-slate-200 space-y-2" data-item-id="${itemId}">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-600"><i class="fas fa-grip-vertical mr-1"></i>Content Block</span>
                <button type="button" onclick="removeContentBlockItem(${itemId})" class="text-xs text-red-600 hover:text-red-700 font-semibold">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>

            <!-- Content Title -->
            <div>
                <input type="text" class="content-title w-full text-xs px-2 py-1 border border-slate-200 rounded" placeholder="e.g., Introduction to Safety">
            </div>

            <!-- Rich Text Editor with Inline Images -->
            <div class="rich-text-content">
                <div class="flex gap-2 mb-2 pb-2 border-b border-slate-200">
                    <button type="button" class="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300" title="Upload and insert image" onclick="triggerImageUploadForEditor('${itemId}')">
                        <i class="fas fa-image mr-1"></i> Insert Image
                    </button>
                    <small class="text-xs text-slate-500 flex items-center">Drag images into the editor to position them alongside text</small>
                </div>
                <div class="content-editor w-full min-h-32 px-3 py-2 border border-slate-200 rounded bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                     contenteditable="true" 
                     data-item-id="${itemId}"
                     style="word-wrap: break-word; overflow-wrap: break-word;">
                </div>
                <input type="file" class="editor-image-file hidden" accept="image/*" data-item-id="${itemId}">
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);

    const contentBlock = container.querySelector(`[data-item-id="${itemId}"]`);
    const editor = contentBlock.querySelector('.content-editor');
    const imageFile = contentBlock.querySelector('.editor-image-file');

    // Setup rich text editor with image handling
    setupRichTextEditor(itemId, editor, imageFile);
}

/**
 * Remove a content block item
 */
window.removeContentBlockItem = function(itemId) {
    const block = document.querySelector(`.content-block[data-item-id="${itemId}"]`);
    if (block) {
        block.remove();
        const container = document.getElementById('editorContentItems');
        if (container.children.length === 0) {
            const noMessage = document.getElementById('noContentBlocksMessage');
            if (noMessage) noMessage.style.display = 'block';
        }
    }
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
    qDiv.className = 'question-item mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white';
    qDiv.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
            <strong class="text-sm font-semibold text-slate-800">Question ${qIndex + 1}</strong>
            <button type="button" class="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" onclick="this.closest('.question-item').remove()">Remove</button>
        </div>
        <div class="question-body space-y-2 p-3">
            <input type="text" class="question-text w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Enter question" value="${questionText}">
            <select class="question-type w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onchange="toggleOptions(this)">
                <option value="multiple_choice" ${questionType === 'multiple_choice' ? 'selected' : ''}>Multiple Choice</option>
                <option value="true_false" ${questionType === 'true_false' ? 'selected' : ''}>True/False</option>
            </select>
            <div class="options-list space-y-2">
                ${optionsHtml}
            </div>
            <button type="button" class="add-option-btn inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${questionType === 'true_false' ? 'hidden' : ''}" onclick="addOption(this, ${qIndex})">+ Add Option</button>
        </div>
    `;

    container.appendChild(qDiv);
}

window.createOptionHtml = function(qIndex, oIndex, text, isCorrect) {
    return `
        <div class="option-item flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <button class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" type="button" onclick="this.closest('.option-item').remove()">X</button>
            <input type="text" class="option-text w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Option text" value="${text}">
            <div class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-1.5" title="Mark as correct answer">
                <input class="h-4 w-4 border-slate-300 text-blue-600 focus-visible:ring-blue-500" type="radio" name="correct_answer_${qIndex}" ${isCorrect ? 'checked' : ''}>
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
    const questionBody = select.closest('.question-body');
    const addBtn = questionBody.querySelector('.add-option-btn');
    const optionsList = questionBody.querySelector('.options-list');

    if (select.value === 'true_false') {
        addBtn.classList.add('hidden');
        optionsList.innerHTML = `
            ${createOptionHtml(0, 0, 'True', false)}
            ${createOptionHtml(0, 1, 'False', false)}
        `;

        const qIndex = Array.from(document.getElementById('questionsContainer').children).indexOf(select.closest('.question-item'));
        optionsList.querySelectorAll('input[type="radio"]').forEach(r => r.name = `correct_answer_${qIndex}`);
    } else {
        addBtn.classList.remove('hidden');
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

    // Gather content from all content blocks
    let fullContent = '';
    const contentBlocks = document.querySelectorAll('.content-block');
    
    contentBlocks.forEach(block => {
        const blockTitle = block.querySelector('.content-title').value;
        const editor = block.querySelector('.content-editor');
        
        // Add block title if provided
        if (blockTitle) {
            fullContent += `<h3 style="margin-top: 1.5rem; margin-bottom: 0.5rem; font-weight: 600; font-size: 1rem;">${blockTitle}</h3>`;
        }
        
        // Add editor content
        const editorContent = editor.innerHTML;
        fullContent += editorContent;
        fullContent += '<br/>';
    });

    const action = `save-${itemType}`;
    const user = JSON.parse(localStorage.getItem('user'));
    const payload = {
        lesson_id: lessonId,
        title: title,
        content: fullContent,
        trainer_id: trainerId,
        user_id: user?.user_id
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
        const user = JSON.parse(localStorage.getItem('user'));
        const formData = new FormData();
        formData.append('lesson_id', lessonId);
        formData.append('posting_date', postingDate);
        formData.append('deadline', deadline);
        formData.append('quiz', JSON.stringify(questions)); // Send quiz as JSON string
        formData.append('trainer_id', trainerId);
        formData.append('user_id', user?.user_id);

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
                <div class="rounded-lg border border-slate-200 bg-white p-3">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div class="min-w-0">
                            <h6 class="text-sm font-semibold text-slate-900">${comp.lesson_title}</h6>
                            <p class="mt-1 text-xs text-slate-500">${comp.lesson_description || ''}</p>
                        </div>
                        <div class="flex flex-wrap items-center gap-1">
                            <button class="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="openManageLessonModal(${comp.lesson_id})">
                                <i class="fas fa-cog"></i> Manage
                            </button>
                            <button class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="editCompetency(${comp.lesson_id}, ${moduleId})">
                                <i class="fas fa-edit text-xs"></i>
                            </button>
                            <button class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" onclick="deleteCompetency(${comp.lesson_id})">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        list.innerHTML = '<div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">No learning outcomes added yet.</div>';
    }

    viewModuleModal.show();
}

// ============================================================================
// NEW: UNIFIED MODULE UPLOAD FUNCTIONALITY
// ============================================================================

let outcomesCounter = 0;

/**
 * Open the unified module upload modal
 */
function openUnifiedModuleUploadModal(competencyType) {
    const modal = document.getElementById('unifiedModuleUploadModal');
    if (!modal) return;

    // Reset form
    document.getElementById('unifiedModuleUploadForm').reset();
    outcomesCounter = 0;
    document.getElementById('learningOutcomesContainer').innerHTML = '';
    document.getElementById('noOutcomesMessage').style.display = 'block';

    // Store competency type
    modal.dataset.competencyType = competencyType;
    
    const moduleModal = new SimpleModal(modal);
    moduleModal.show();
}

/**
 * Add a learning outcome row with all its components (quiz, task sheets, content)
 */
function addLearningOutcomeRow() {
    const container = document.getElementById('learningOutcomesContainer');
    const noMessage = document.getElementById('noOutcomesMessage');
    
    if (noMessage) noMessage.style.display = 'none';

    const outcomeId = outcomesCounter++;
    const outcomeHtml = `
        <div class="rounded-lg border border-slate-300 bg-white p-4" id="outcome-${outcomeId}">
            <!-- Outcome Header -->
            <div class="mb-4 flex items-center justify-between">
                <h6 class="text-sm font-bold text-slate-900">Learning Outcome ${outcomeId + 1}</h6>
                <button type="button" onclick="removeLearningOutcome(${outcomeId})" class="rounded-md p-1 text-red-600 hover:bg-red-50">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>

            <!-- Outcome Basic Info -->
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2 mb-4">
                <div>
                    <label class="mb-1.5 block text-xs font-semibold text-slate-700">Outcome Title <span class="text-red-500">*</span></label>
                    <input type="text" class="outcome-title w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="e.g., Introduction to Welding Safety" required>
                </div>
                <div>
                    <label class="mb-1.5 block text-xs font-semibold text-slate-700">Order</label>
                    <input type="number" class="outcome-order w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value="${outcomeId}" min="0">
                </div>
            </div>

            <div class="mb-4">
                <label class="mb-1.5 block text-xs font-semibold text-slate-700">Outcome Description</label>
                <textarea class="outcome-description w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" rows="2" placeholder="Describe what learners will achieve..."></textarea>
            </div>

            <!-- Tabs for outcome components -->
            <div class="mb-4 border-b border-slate-200">
                <div class="flex gap-2" role="tablist">
                    <button type="button" role="tab" aria-selected="true" class="outcome-tab px-3 py-2 text-xs font-semibold text-blue-700 border-b-2 border-blue-600 bg-blue-50" data-tab="content-${outcomeId}">
                        <i class="fas fa-book-open mr-1"></i> Content
                    </button>
                    <button type="button" role="tab" aria-selected="false" class="outcome-tab px-3 py-2 text-xs font-semibold text-slate-600 border-b-2 border-transparent hover:text-slate-900" data-tab="quiz-${outcomeId}">
                        <i class="fas fa-question-circle mr-1"></i> Quiz
                    </button>
                    <button type="button" role="tab" aria-selected="false" class="outcome-tab px-3 py-2 text-xs font-semibold text-slate-600 border-b-2 border-transparent hover:text-slate-900" data-tab="tasks-${outcomeId}">
                        <i class="fas fa-tasks mr-1"></i> Task Sheets
                    </button>
                </div>
            </div>

            <!-- Content Tab -->
            <div class="outcome-tab-content mb-4 p-3 rounded-md bg-slate-50" id="content-${outcomeId}" data-tab-pane="content">
                <div class="flex items-center justify-between mb-3">
                    <h6 class="text-xs font-bold text-slate-900">Learning Materials</h6>
                    <button type="button" onclick="addContentItem(${outcomeId})" class="text-xs text-blue-600 hover:text-blue-700 font-semibold">+ Add Content</button>
                </div>
                <div class="outcome-content-items space-y-2"></div>
            </div>

            <!-- Quiz Tab -->
            <div class="outcome-tab-content mb-4 p-3 rounded-md bg-slate-50 hidden" id="quiz-${outcomeId}" data-tab-pane="quiz">
                <div class="flex items-center justify-between mb-3">
                    <h6 class="text-xs font-bold text-slate-900">Quiz Questions</h6>
                    <button type="button" onclick="addQuizQuestion(${outcomeId})" class="text-xs text-blue-600 hover:text-blue-700 font-semibold">+ Add Question</button>
                </div>
                <div class="outcome-quiz-items space-y-3"></div>
            </div>

            <!-- Task Sheets Tab -->
            <div class="outcome-tab-content mb-4 p-3 rounded-md bg-slate-50 hidden" id="tasks-${outcomeId}" data-tab-pane="tasks">
                <div class="flex items-center justify-between mb-3">
                    <h6 class="text-xs font-bold text-slate-900">Task Sheets</h6>
                    <button type="button" onclick="addTaskSheet(${outcomeId})" class="text-xs text-blue-600 hover:text-blue-700 font-semibold">+ Add Task</button>
                </div>
                <div class="outcome-task-items space-y-2"></div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', outcomeHtml);

    // Bind tab switching
    const tabButtons = document.querySelectorAll(`#outcome-${outcomeId} .outcome-tab`);
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchOutcomeTab(outcomeId, tabId);
        });
    });
}

/**
 * Switch tabs within a learning outcome
 */
function switchOutcomeTab(outcomeId, tabId) {
    // Deselect all tabs and hide all panes
    const outcomeEl = document.getElementById(`outcome-${outcomeId}`);
    outcomeEl.querySelectorAll('.outcome-tab').forEach(btn => {
        btn.setAttribute('aria-selected', 'false');
        btn.classList.remove('text-blue-700', 'border-blue-600', 'bg-blue-50');
        btn.classList.add('text-slate-600', 'border-transparent');
    });
    outcomeEl.querySelectorAll('.outcome-tab-content').forEach(pane => pane.classList.add('hidden'));

    // Select active tab and show pane
    const activeBtn = outcomeEl.querySelector(`.outcome-tab[data-tab="${tabId}"]`);
    const activePane = document.getElementById(tabId);
    
    if (activeBtn && activePane) {
        activeBtn.setAttribute('aria-selected', 'true');
        activeBtn.classList.remove('text-slate-600', 'border-transparent');
        activeBtn.classList.add('text-blue-700', 'border-blue-600', 'bg-blue-50');
        activePane.classList.remove('hidden');
    }
}

/**
 * Add a content item to a learning outcome
 */
function addContentItem(outcomeId) {
    const container = document.querySelector(`#outcome-${outcomeId} .outcome-content-items`);
    if (!container) return;

    const itemId = Date.now();
    const html = `
        <div class="content-item bg-white p-3 rounded-md border border-slate-200 space-y-2 cursor-move hover:shadow-md transition-shadow" data-item-id="${itemId}" draggable="true">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-600"><i class="fas fa-grip-vertical mr-1"></i>Content Block</span>
                <button type="button" onclick="removeContentItem(${outcomeId}, ${itemId})" class="text-xs text-red-600 hover:text-red-700 font-semibold">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>

            <!-- Content Title -->
            <div>
                <input type="text" class="content-title w-full text-xs px-2 py-1 border border-slate-200 rounded" placeholder="e.g., Welding Tools Overview">
            </div>

            <!-- Rich Text Editor with Inline Images -->
            <div class="rich-text-content">
                <div class="flex gap-2 mb-2 pb-2 border-b border-slate-200">
                    <button type="button" class="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300" title="Upload and insert image" onclick="triggerImageUploadForEditor('${itemId}')">
                        <i class="fas fa-image mr-1"></i> Insert Image
                    </button>
                    <small class="text-xs text-slate-500 flex items-center">Drag images into the editor to position them alongside text</small>
                </div>
                <div class="content-editor w-full min-h-32 px-3 py-2 border border-slate-200 rounded bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                     contenteditable="true" 
                     data-item-id="${itemId}"
                     style="word-wrap: break-word; overflow-wrap: break-word;">
                </div>
                <input type="file" class="editor-image-file hidden" accept="image/*" data-item-id="${itemId}">
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);

    const contentItem = container.querySelector(`[data-item-id="${itemId}"]`);
    const editor = contentItem.querySelector('.content-editor');
    const imageFile = contentItem.querySelector('.editor-image-file');

    // Setup rich text editor with image handling
    setupRichTextEditor(itemId, editor, imageFile);

    // Add drag and drop listeners for the content item container
    setupContentDragDrop(outcomeId);
}

/**
 * Setup rich text editor with image drag-drop and inline positioning
 */
function setupRichTextEditor(itemId, editor, imageFileInput) {
    // Handle image file input change
    imageFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            Swal.fire('Error', 'Image must be less than 5MB', 'error');
            return;
        }

        const dataUrl = await fileToDataUrl(file);
        insertImageIntoEditor(itemId, dataUrl, file.name);
    });

    // Handle drag and drop into editor
    editor.addEventListener('dragover', (e) => {
        // Only highlight for file drops, not for internal image repositioning
        if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            e.stopPropagation();
            editor.classList.add('bg-blue-50', 'border-blue-400');
        }
    });

    editor.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        editor.classList.remove('bg-blue-50', 'border-blue-400');
    });

    editor.addEventListener('drop', async (e) => {
        // Only process file drops, not internal image repositioning
        if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            e.stopPropagation();
            editor.classList.remove('bg-blue-50', 'border-blue-400');

            const files = e.dataTransfer.files;
            for (let file of files) {
                if (file.type.startsWith('image/')) {
                    if (file.size > 5 * 1024 * 1024) {
                        Swal.fire('Error', `Image "${file.name}" must be less than 5MB`, 'error');
                        continue;
                    }
                    const dataUrl = await fileToDataUrl(file);
                    insertImageIntoEditor(itemId, dataUrl, file.name);
                }
            }
        }
    });

    // Prevent accidental navigation when dropping
    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            // Allow Ctrl+Enter for line breaks
            document.execCommand('insertLineBreak', false, null);
            e.preventDefault();
        }
    });

    // Setup image handles for dragging within editor
    editor.addEventListener('mouseenter', setupImageDragHandles);
}

/**
 * Convert file to base64 data URL
 */
function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
    });
}

/**
 * Remove a content item
 */
function removeContentItem(outcomeId, itemId) {
    document.querySelector(`.content-item[data-item-id="${itemId}"]`)?.remove();
}

/**
 * Trigger image file upload dialog for rich text editor
 */
function triggerImageUploadForEditor(itemId) {
    // Support both .content-item (learning outcomes) and .content-block (edit modal)
    let contentItem = document.querySelector(`.content-item[data-item-id="${itemId}"]`);
    if (!contentItem) {
        contentItem = document.querySelector(`.content-block[data-item-id="${itemId}"]`);
    }
    if (contentItem) {
        const fileInput = contentItem.querySelector('.editor-image-file');
        if (fileInput) fileInput.click();
    }
}

/**
 * Insert image into rich text editor
 */
function insertImageIntoEditor(itemId, dataUrl, filename) {
    // Support both .content-item (learning outcomes) and .content-block (edit modal)
    let contentItem = document.querySelector(`.content-item[data-item-id="${itemId}"]`);
    if (!contentItem) {
        contentItem = document.querySelector(`.content-block[data-item-id="${itemId}"]`);
    }
    if (!contentItem) return;
    
    const editor = contentItem.querySelector('.content-editor');
    
    // Create image wrapper with positioning - constrain to 40% of editor width
    const imgWrapper = document.createElement('span');
    imgWrapper.contentEditable = 'false';
    imgWrapper.className = 'editor-image-wrapper';
    imgWrapper.draggable = true;
    imgWrapper.style.cssText = 'display: block; position: relative; float: right; margin: 0 0 1rem 1.5rem; user-select: none; max-width: 40%; width: 300px;';
    imgWrapper.dataset.position = 'right'; // Track position
    
    // Create image element
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = 'display: block; height: 200px; width: 100%; border-radius: 4px; border: 2px solid #cbd5e1; cursor: move; user-select: none; box-sizing: border-box;';
    img.draggable = false;
    
    // Add position toggle button (left/right)
    const positionBtn = document.createElement('button');
    positionBtn.type = 'button';
    positionBtn.innerHTML = '<i class="fas fa-align-left"></i>';
    positionBtn.title = 'Change position (left/right)';
    positionBtn.style.cssText = 'position: absolute; bottom: 4px; left: 4px; width: 28px; height: 28px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: none; z-index: 18; padding: 0;';
    positionBtn.onclick = (e) => {
        e.stopPropagation();
        const newPosition = imgWrapper.dataset.position === 'right' ? 'left' : 'right';
        imgWrapper.dataset.position = newPosition;
        
        if (newPosition === 'left') {
            imgWrapper.style.float = 'left';
            imgWrapper.style.margin = '0 1.5rem 1rem 0';
            positionBtn.innerHTML = '<i class="fas fa-align-right"></i>';
        } else {
            imgWrapper.style.float = 'right';
            imgWrapper.style.margin = '0 0 1rem 1.5rem';
            positionBtn.innerHTML = '<i class="fas fa-align-left"></i>';
        }
    };
    
    // Add delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.style.cssText = 'position: absolute; top: 4px; right: 4px; width: 28px; height: 28px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; display: none; z-index: 20; padding: 0;';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        imgWrapper.remove();
    };
    
    // Add resize handles (Google Docs style)
    const handles = {
        tl: document.createElement('div'), // top-left
        tr: document.createElement('div'), // top-right
        bl: document.createElement('div'), // bottom-left
        br: document.createElement('div'), // bottom-right
        tm: document.createElement('div'), // top-middle
        bm: document.createElement('div'), // bottom-middle
        lm: document.createElement('div'), // left-middle
        rm: document.createElement('div'), // right-middle
    };
    
    Object.values(handles).forEach(handle => {
        handle.style.cssText = 'position: absolute; width: 8px; height: 8px; background: #3b82f6; border: 2px solid white; border-radius: 1px; display: none; z-index: 15; box-shadow: 0 0 2px rgba(0,0,0,0.3);';
    });
    
    // Position handles
    handles.tl.style.cssText += 'top: -5px; left: -5px; cursor: nwse-resize;';
    handles.tr.style.cssText += 'top: -5px; right: -5px; cursor: nesw-resize;';
    handles.bl.style.cssText += 'bottom: -5px; left: -5px; cursor: nesw-resize;';
    handles.br.style.cssText += 'bottom: -5px; right: -5px; cursor: nwse-resize;';
    handles.tm.style.cssText += 'top: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize;';
    handles.bm.style.cssText += 'bottom: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize;';
    handles.lm.style.cssText += 'top: 50%; left: -5px; transform: translateY(-50%); cursor: ew-resize;';
    handles.rm.style.cssText += 'top: 50%; right: -5px; transform: translateY(-50%); cursor: ew-resize;';
    
    imgWrapper.appendChild(img);
    imgWrapper.appendChild(positionBtn);
    imgWrapper.appendChild(deleteBtn);
    Object.values(handles).forEach(handle => imgWrapper.appendChild(handle));
    
    // Show/hide buttons and handles on hover
    imgWrapper.addEventListener('mouseenter', () => {
        deleteBtn.style.display = 'flex';
        positionBtn.style.display = 'flex';
        img.style.borderColor = '#3b82f6';
        Object.values(handles).forEach(handle => handle.style.display = 'block');
    });
    
    imgWrapper.addEventListener('mouseleave', (e) => {
        if (!e.buttons) { // Only hide if not dragging
            deleteBtn.style.display = 'none';
            positionBtn.style.display = 'none';
            img.style.borderColor = '#cbd5e1';
            Object.values(handles).forEach(handle => handle.style.display = 'none');
        }
    });
    
    // Setup drag to reposition
    setupImageDragInEditor(imgWrapper, editor);
    
    // Setup resize handles
    setupImageResize(imgWrapper, img, handles, editor);
    
    // Insert into editor
    editor.focus();
    const selection = document.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.insertNode(imgWrapper);
        range.setStartAfter(imgWrapper);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        editor.appendChild(imgWrapper);
    }
}

/**
 * Setup image drag functionality within editor
 */
function setupImageDragInEditor(imgWrapper, editor) {
    let draggedImage = null;
    
    imgWrapper.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        draggedImage = imgWrapper;
        e.dataTransfer.effectAllowed = 'move';
        // Use a special data type to identify internal image drag
        e.dataTransfer.setData('application/x-internal-image', 'true');
        imgWrapper.style.opacity = '0.7';
    });
    
    imgWrapper.addEventListener('dragend', () => {
        imgWrapper.style.opacity = '1';
        draggedImage = null;
    });
    
    editor.addEventListener('dragover', (e) => {
        // Check for internal image drag
        if (e.dataTransfer.types.includes('application/x-internal-image')) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            editor.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
        }
        // Check for file drag
        else if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            editor.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        }
    });
    
    editor.addEventListener('dragleave', (e) => {
        if (e.target === editor) {
            editor.style.backgroundColor = 'white';
        }
    });
    
    editor.addEventListener('drop', (e) => {
        // Handle internal image reordering
        if (e.dataTransfer.types.includes('application/x-internal-image') && draggedImage) {
            e.preventDefault();
            e.stopPropagation();
            editor.style.backgroundColor = 'white';
            
            const selection = document.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                // Remove from old position
                draggedImage.remove();
                // Insert at new position
                range.insertNode(draggedImage);
            }
            draggedImage.style.opacity = '1';
            draggedImage = null;
        }
        // Let the file drop handler take care of new image uploads
    }, true);
}

/**
 * Setup image resize handles (Google Docs style)
 */
function setupImageResize(imgWrapper, img, handles, editor) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight;
    
    const startResize = (e, handle) => {
        if (e.button !== 0) return; // Only left mouse button
        e.preventDefault();
        e.stopPropagation();
        
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = img.width;
        startHeight = img.height;
        
        // Highlight handles
        Object.values(handles).forEach(h => h.style.backgroundColor = '#1e40af');
        
        const onMouseMove = (moveEvent) => {
            if (!isResizing) return;
            
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            const aspect = startHeight / startWidth;
            
            // Get editor bounds for constraint
            const editorRect = editor.getBoundingClientRect();
            const maxWidth = editorRect.width * 0.4; // 40% of editor width max
            
            // Determine which handle is being dragged
            const handleClass = handle === handles.br ? 'br' :
                               handle === handles.bl ? 'bl' :
                               handle === handles.tr ? 'tr' :
                               handle === handles.tl ? 'tl' :
                               handle === handles.rm ? 'rm' :
                               handle === handles.lm ? 'lm' :
                               handle === handles.bm ? 'bm' : 'tm';
            
            let newWidth = startWidth;
            let newHeight = startHeight;
            
            // Calculate new dimensions based on handle
            if (handleClass.includes('r')) {
                newWidth = Math.max(50, startWidth + dx);
            } else if (handleClass.includes('l')) {
                newWidth = Math.max(50, startWidth - dx);
            }
            
            if (handleClass.includes('b')) {
                newHeight = Math.max(50, startHeight + dy);
            } else if (handleClass.includes('t')) {
                newHeight = Math.max(50, startHeight - dy);
            }
            
            // Maintain aspect ratio for corner handles
            if (handleClass.length === 2) {
                newHeight = newWidth * aspect;
            }
            
            // Constrain width to max 40% of editor width
            if (newWidth > maxWidth) {
                newWidth = maxWidth;
                if (handleClass.length === 2) {
                    newHeight = newWidth * aspect;
                }
            }
            
            img.style.width = newWidth + 'px';
            img.style.height = newHeight + 'px';
        };
        
        const onMouseUp = () => {
            isResizing = false;
            Object.values(handles).forEach(h => h.style.backgroundColor = '#3b82f6');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    
    // Attach resize handlers to all handles
    Object.values(handles).forEach(handle => {
        handle.addEventListener('mousedown', (e) => startResize(e, handle));
    });
}

/**
 * Setup image drag handles for all images in editor
 */
function setupImageDragHandles() {
    // This function handles hover effects for images in the editor
    document.querySelectorAll('.editor-image-wrapper').forEach(wrapper => {
        wrapper.addEventListener('mouseenter', () => {
            const deleteBtn = wrapper.querySelector('button');
            if (deleteBtn) deleteBtn.style.display = 'flex';
        });
        wrapper.addEventListener('mouseleave', () => {
            const deleteBtn = wrapper.querySelector('button');
            if (deleteBtn) deleteBtn.style.display = 'none';
        });
    });
}

/**
 * Setup drag and drop for content items
 */
function setupContentDragDrop(outcomeId) {
    const container = document.querySelector(`#outcome-${outcomeId} .outcome-content-items`);
    if (!container) return;

    const items = container.querySelectorAll('.content-item');
    
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            item.classList.add('opacity-50');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('opacity-50');
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(item);
            } else {
                container.insertBefore(item, afterElement);
            }
        });
    });
}

/**
 * Trigger image file upload dialog for main editor
 */
/**
 * Get element after which to drop
 */
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.content-item:not(.opacity-50)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * Add a quiz question to a learning outcome
 */
function addQuizQuestion(outcomeId) {
    const container = document.querySelector(`#outcome-${outcomeId} .outcome-quiz-items`);
    if (!container) return;

    const questionId = Date.now();
    const html = `
        <div class="quiz-question bg-white p-3 rounded-md border border-slate-200 space-y-2" data-question-id="${questionId}">
            <div class="flex items-start justify-between">
                <input type="text" class="quiz-question-text flex-1 text-xs px-2 py-1 border border-slate-200 rounded" placeholder="Enter question text...">
                <button type="button" onclick="removeQuizQuestion(${outcomeId}, ${questionId})" class="ml-2 text-xs text-red-600 hover:text-red-700 font-semibold">Remove</button>
            </div>
            <select class="quiz-type w-full text-xs px-2 py-1 border border-slate-200 rounded">
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
            </select>
            <div class="quiz-options space-y-1"></div>
            <button type="button" onclick="addQuizOption(${outcomeId}, ${questionId})" class="text-xs text-blue-600 hover:text-blue-700 font-semibold">+ Add Option</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    addQuizOption(outcomeId, questionId); // Add default option
}

/**
 * Add an option to a quiz question
 */
function addQuizOption(outcomeId, questionId) {
    const optionsContainer = document.querySelector(`.quiz-question[data-question-id="${questionId}"] .quiz-options`);
    if (!optionsContainer) return;

    const optionId = Date.now();
    const html = `
        <div class="quiz-option flex gap-2 items-center" data-option-id="${optionId}">
            <input type="text" class="option-text flex-1 text-xs px-2 py-1 border border-slate-200 rounded" placeholder="Option text">
            <label class="flex items-center gap-1 text-xs">
                <input type="checkbox" class="option-correct" style="width: 14px; height: 14px;">
                <span>Correct</span>
            </label>
            <button type="button" onclick="removeQuizOption(${questionId}, ${optionId})" class="text-red-600 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    optionsContainer.insertAdjacentHTML('beforeend', html);
}

/**
 * Remove a quiz question
 */
function removeQuizQuestion(outcomeId, questionId) {
    document.querySelector(`.quiz-question[data-question-id="${questionId}"]`)?.remove();
}

/**
 * Remove a quiz option
 */
function removeQuizOption(questionId, optionId) {
    document.querySelector(`.quiz-question[data-question-id="${questionId}"] .quiz-option[data-option-id="${optionId}"]`)?.remove();
}

/**
 * Add a task sheet to a learning outcome
 */
function addTaskSheet(outcomeId) {
    const container = document.querySelector(`#outcome-${outcomeId} .outcome-task-items`);
    if (!container) return;

    const taskId = Date.now();
    const html = `
        <div class="task-item rounded-lg border border-slate-200 bg-white p-3" data-task-id="${taskId}">
            <div class="mb-3">
                <label class="mb-1.5 block text-xs font-semibold text-slate-700">Title</label>
                <input type="text" class="task-title w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="e.g., Information Sheet 1.1-1">
            </div>

            <div class="mb-2 flex flex-wrap items-center justify-end gap-2">
                <button type="button" class="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="insertTrainerInput('task-editor-${taskId}')">
                    <i class="fas fa-plus-square"></i> Add Field
                </button>
                <button type="button" class="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="insertTable('task-editor-${taskId}')">
                    <i class="fas fa-table"></i> Add Table
                </button>
                <button type="button" class="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="insertInteractiveQuestion('task-editor-${taskId}')">
                    <i class="fas fa-check-circle"></i> Add Quick Check
                </button>
                <button type="button" class="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="insertCheckboxList('task-editor-${taskId}')">
                    <i class="fas fa-list-check"></i> Add Checklist
                </button>
            </div>

            <div id="task-editor-${taskId}" class="task-body-editor min-h-[220px] rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700" contenteditable="true" onfocus="removeEditorPlaceholder(this)">
                <p data-editor-placeholder class="text-xs text-slate-400">Start writing task sheet content here...</p>
            </div>

            <div class="mt-3">
                <button type="button" onclick="removeTaskSheet(${outcomeId}, ${taskId})" class="text-xs font-semibold text-red-600 hover:text-red-700">Remove</button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function getSerializedEditableContent(editor) {
    if (!editor) return '';
    const clone = editor.cloneNode(true);
    clone.querySelectorAll('[data-editor-placeholder]').forEach(node => node.remove());
    const html = clone.innerHTML.trim();
    return html;
}

/**
 * Remove a task sheet
 */
function removeTaskSheet(outcomeId, taskId) {
    document.querySelector(`.task-item[data-task-id="${taskId}"]`)?.remove();
}

/**
 * Remove a learning outcome
 */
function removeLearningOutcome(outcomeId) {
    const outcomeEl = document.getElementById(`outcome-${outcomeId}`);
    if (outcomeEl) {
        outcomeEl.remove();
        // Show "no outcomes" message if container is empty
        const container = document.getElementById('learningOutcomesContainer');
        if (container && container.children.length === 0) {
            document.getElementById('noOutcomesMessage').style.display = 'block';
        }
    }
}

/**
 * Collect and validate form data, then upload complete module
 */
async function uploadCompleteModule() {
    const modal = document.getElementById('unifiedModuleUploadModal');
    const competencyType = modal.dataset.competencyType;
    const qualificationIdRaw = document.getElementById('qualificationSelect')?.value || '';
    const qualificationId = parseInt(qualificationIdRaw, 10) || 0;
    const trainer = JSON.parse(localStorage.getItem('trainer') || '{}');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const resolvedTrainerId = parseInt(trainerId || trainer.trainer_id || user.trainer_id || 0, 10) || 0;
    const resolvedUserId = parseInt(user.user_id || 0, 10) || 0;

    // Collect module data
    const moduleTitle = document.getElementById('uplModuleTitle').value.trim();
    const unitCode = document.getElementById('uplUnitCode')?.value.trim() || '';
    const moduleDescription = document.getElementById('uplModuleDescription').value.trim();
    const moduleOrder = parseInt(document.getElementById('uplModuleOrder')?.value, 10) || 0;

    if (!moduleTitle || !qualificationId) {
        Swal.fire('Validation Error', 'Module title and qualification are required', 'error');
        return;
    }
    if (!resolvedTrainerId) {
        Swal.fire('Validation Error', 'Trainer session is missing. Please refresh the page and try again.', 'error');
        return;
    }

    // Collect learning outcomes
    const learningOutcomes = [];
    const outcomeElements = document.querySelectorAll('[id^="outcome-"]');

    for (const outcomeEl of outcomeElements) {
        const outcomeId = parseInt(outcomeEl.id.replace('outcome-', ''));
        const title = outcomeEl.querySelector('.outcome-title').value.trim();
        const description = outcomeEl.querySelector('.outcome-description').value.trim();
        const order = parseInt(outcomeEl.querySelector('.outcome-order').value) || 0;

        if (!title) {
            Swal.fire('Validation Error', 'All learning outcomes must have a title', 'error');
            return;
        }

        // Collect contents with image handling for rich text editor
        const contents = [];
        const contentItems = Array.from(outcomeEl.querySelectorAll('.content-item'));
        for (const [idx, item] of contentItems.entries()) {
            const content = {};
            const title = item.querySelector('.content-title')?.value.trim() || '';
            const editor = item.querySelector('.content-editor');
            
            if (!editor) continue;

            // Get HTML content from rich text editor
            const editorHTML = editor.innerHTML.trim();
            
            // Collect images from the editor
            const images = [];
            const imageWrappers = editor.querySelectorAll('.editor-image-wrapper');
            
            for (const wrapper of imageWrappers) {
                const img = wrapper.querySelector('.editor-image');
                if (img && img.src) {
                    images.push({
                        src: img.src,
                        filename: img.alt || 'image'
                    });
                }
            }

            // If there's text content or images
            if (title || editorHTML) {
                content.title = title;
                content.text = editorHTML;
                content.type = 'rich-text';
                content.has_images = images.length > 0;
                
                // Store images data
                if (images.length > 0) {
                    content.images = images;
                }
            }

            if (Object.keys(content).length > 0) {
                content.display_order = idx;
                contents.push(content);
            }
        }

        // Collect quiz questions
        const quiz = [];
        outcomeEl.querySelectorAll('.quiz-question').forEach(questionEl => {
            const text = questionEl.querySelector('.quiz-question-text').value.trim();
            const type = questionEl.querySelector('.quiz-type').value;
            const options = [];

            questionEl.querySelectorAll('.quiz-option').forEach(optionEl => {
                const optionText = optionEl.querySelector('.option-text').value.trim();
                const isCorrect = optionEl.querySelector('.option-correct').checked;
                if (optionText) {
                    options.push({ text: optionText, is_correct: isCorrect });
                }
            });

            if (text && options.length > 0) {
                quiz.push({ text, type, options });
            }
        });

        // Collect task sheets
        const taskSheets = [];
        outcomeEl.querySelectorAll('.task-item').forEach(taskEl => {
            const title = taskEl.querySelector('.task-title').value.trim();
            const content = getSerializedEditableContent(taskEl.querySelector('.task-body-editor'));
            if (title || content) {
                taskSheets.push({ title, content });
            }
        });

        learningOutcomes.push({
            title,
            description,
            outcome_order: order,
            is_required: 1,
            quiz_instructions: '',
            task_instructions: '',
            contents,
            quiz,
            task_sheets: taskSheets
        });
    }

    if (learningOutcomes.length === 0) {
        Swal.fire('Validation Error', 'Add at least one learning outcome', 'error');
        return;
    }

    // Show loading
    const btn = document.querySelector('#unifiedModuleUploadModal button[onclick="uploadCompleteModule()"]');
    if (!btn) {
        Swal.fire('Error', 'Upload button not found. Please refresh and try again.', 'error');
        return;
    }
    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
        const payload = {
            module_title: moduleTitle,
            unit_code: unitCode,
            module_description: moduleDescription,
            module_order: moduleOrder,
            competency_type: competencyType,
            qualification_id: qualificationId,
            trainer_id: resolvedTrainerId,
            user_id: resolvedUserId,
            learning_outcomes: learningOutcomes
        };

        const response = await axios.post(`${API_BASE_URL}/role/trainer/modules.php?action=upload-complete-module`, payload);

        if (response.data.success) {
            Swal.fire('Success!', 'Module uploaded successfully with all learning outcomes, quizzes, and task sheets!', 'success');
            
            // Close modal
            const moduleModal = new SimpleModal(modal);
            moduleModal.hide();

            // Reload modules
            loadDataForTab(currentCompetencyType);
        } else {
            Swal.fire('Error', response.data.message || 'Failed to upload module', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        Swal.fire('Error', 'Failed to upload module: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
}
