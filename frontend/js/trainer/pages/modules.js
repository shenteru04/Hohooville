const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const LESSON_UPLOADS_URL = window.location.origin + '/Hohoo-ville/uploads/lessons/';

async function ensureSwal() {
    if (typeof window.Swal !== 'undefined') return;
    await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
    });
}

let moduleModal, competencyModal, manageLessonModal, viewModuleModal, contentEditorModal, unifiedModuleUploadModal, moduleTraineeStatusModal;
let currentModules = [];
let currentCompetencyType = 'core';
let currentViewedModuleId = null;
let fieldCounter = 0;
let runtimeIdCounter = 0;
let trainerId = null;
let traineeProgressRoster = [];
let selectedProgressTraineeId = null;
const traineeProgressCache = new Map();
const modalStack = [];

function nextRuntimeId() {
    runtimeIdCounter += 1;
    return runtimeIdCounter;
}

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

async function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        await ensureSwal();
        
        Swal.fire({
            title: 'Logout Confirmation',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Logout',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.clear();
                window.location.href = '/Hohoo-ville/frontend/login.html';
            }
        });
    });
}

function initModuleTabs() {
    ['core', 'common', 'basic', 'trainees'].forEach(type => {
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
    const target = ['core', 'common', 'basic', 'trainees'].includes(type) ? type : 'core';
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

function competencyTypeSupportsTaskSheets(type = 'core') {
    return String(type || 'core').toLowerCase() === 'core';
}

function updateLessonTaskSheetVisibility(competencyType = 'core') {
    const supportsTaskSheets = competencyTypeSupportsTaskSheets(competencyType);
    const taskTab = document.getElementById('task-sheet-tab');
    const taskPane = document.getElementById('task-sheet-pane');

    if (taskTab) taskTab.classList.toggle('hidden', !supportsTaskSheets);
    if (taskPane) taskPane.classList.toggle('hidden', !supportsTaskSheets);

    if (!supportsTaskSheets && document.querySelector('.lesson-tab-btn[aria-selected="true"]')?.dataset.lessonTab === 'task-sheet') {
        setActiveLessonTab('content');
    }
}

function setActiveLessonTab(type) {
    const taskSheetAllowed = !document.getElementById('task-sheet-tab')?.classList.contains('hidden');
    const allowed = taskSheetAllowed ? ['content', 'quiz', 'task-sheet'] : ['content', 'quiz'];
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
    if (!qualificationId || !trainerId) {
        if (type === 'trainees') {
            resetTraineeProgressTab('Select a qualification to load trainees.');
        } else {
            const emptyMessage = 'Select a qualification to see modules.';
            const targets = {
                core: 'modulesListCore',
                common: 'modulesListCommon',
                basic: 'modulesListBasic'
            };
            const container = document.getElementById(targets[type] || 'modulesListCore');
            if (container) {
                container.innerHTML = `
                    <div class="col-span-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                        ${emptyMessage}
                    </div>
                `;
            }
        }
        return Promise.resolve();
    }

    if (type === 'trainees') {
        return loadTraineeProgressRoster(qualificationId);
    }

    document.getElementById('modulesListCore').innerHTML = '';
    document.getElementById('modulesListCommon').innerHTML = '';
    document.getElementById('modulesListBasic').innerHTML = '';
    if (qualificationId && trainerId) {
        return loadModules(qualificationId, type, trainerId);
    }
    return Promise.resolve();
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

    const moduleTraineeStatusEl = document.getElementById('moduleTraineeStatusModal');
    if (moduleTraineeStatusEl) {
        moduleTraineeStatusModal = new SimpleModal(moduleTraineeStatusEl, {
            onHide: () => {
                resetModuleTraineeStatusModal();
            }
        });
    }

    const contentEditorEl = document.getElementById('contentEditorModal');
    if (contentEditorEl) {
        contentEditorModal = new SimpleModal(contentEditorEl, {
            onHide: () => {
                document.getElementById('editorItemId').value = '';
                document.getElementById('editorItemType').value = '';
                document.getElementById('editorItemTitle').value = '';
                const contentItemsContainer = document.getElementById('editorContentItems');
                const noMessage = document.getElementById('noContentBlocksMessage');
                if (contentItemsContainer) contentItemsContainer.innerHTML = '';
                if (noMessage) noMessage.style.display = 'block';
            }
        });
    }

    const unifiedModuleUploadEl = document.getElementById('unifiedModuleUploadModal');
    if (unifiedModuleUploadEl) {
        unifiedModuleUploadModal = new SimpleModal(unifiedModuleUploadEl, {
            onHide: () => {
                resetUnifiedModuleUploadForm();
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
            currentModules = [...response.data.data].sort((left, right) => {
                const leftDraft = (left.module_status || 'published') === 'draft' ? 0 : 1;
                const rightDraft = (right.module_status || 'published') === 'draft' ? 0 : 1;
                if (leftDraft !== rightDraft) return leftDraft - rightDraft;
                return (Number(left.module_order) || 0) - (Number(right.module_order) || 0)
                    || Number(left.module_id) - Number(right.module_id);
            });
            const spineColors = ['#34495e', '#2980b9', '#27ae60', '#8e44ad', '#c0392b', '#d35400'];

            currentModules.forEach((module, index) => {
                const color = spineColors[index % spineColors.length];
                const moduleStatus = getModuleWorkflowMeta(module);
                const primaryAction = moduleStatus.status === 'draft'
                    ? `openUnifiedModuleUploadModal('${competencyType}', ${module.module_id})`
                    : `openViewModuleModal(${module.module_id})`;
                const primaryLabel = moduleStatus.status === 'draft' ? 'Continue Draft' : 'Open';
                const editLabel = moduleStatus.status === 'draft' ? 'Continue editing draft' : 'Edit module';

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
                                <div class="mt-3 flex flex-wrap items-center gap-2">
                                    <div class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                                        <i class="fas fa-bookmark"></i> ${module.lessons ? module.lessons.length : 0} Outcomes
                                    </div>
                                    <div class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${moduleStatus.badgeClasses}">
                                        <i class="${moduleStatus.icon}"></i> ${moduleStatus.label}
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
                                <button class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="${primaryAction}" title="${primaryLabel}">
                                    <i class="fas ${moduleStatus.status === 'draft' ? 'fa-pen-to-square' : 'fa-book-open'}"></i> ${primaryLabel}
                                </button>
                                <div class="flex items-center gap-1">
                                    <button class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" onclick="openModuleTraineeStatusModal(${module.module_id})" title="View trainee quiz status" aria-label="View trainee quiz status">
                                        <i class="fas fa-user text-xs"></i>
                                    </button>
                                    <button class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onclick="editModule(${module.module_id})" title="${editLabel}">
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

function getSelectedQualificationName() {
    const select = document.getElementById('qualificationSelect');
    const option = select?.options?.[select.selectedIndex];
    if (option && option.value) {
        return option.textContent.trim();
    }
    return 'Selected Qualification';
}

function resetTraineeProgressTab(message = 'Select a qualification to load trainees.') {
    traineeProgressRoster = [];
    selectedProgressTraineeId = null;
    traineeProgressCache.clear();

    const rosterEl = document.getElementById('traineeProgressRoster');
    const titleEl = document.getElementById('traineeProgressDetailTitle');
    const subtitleEl = document.getElementById('traineeProgressDetailSubtitle');
    const summaryEl = document.getElementById('traineeProgressSummary');
    const emptyEl = document.getElementById('traineeProgressEmpty');
    const timelineEl = document.getElementById('traineeProgressTimeline');

    if (rosterEl) {
        rosterEl.innerHTML = `
            <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                ${escapeHtml(message)}
            </div>
        `;
    }
    if (titleEl) titleEl.textContent = 'Trainee Progress Details';
    if (subtitleEl) subtitleEl.textContent = 'Select a trainee to inspect their module sequence.';
    if (summaryEl) summaryEl.innerHTML = '';
    if (emptyEl) {
        emptyEl.textContent = 'Select a trainee from the list to view completed outcomes and current lackings.';
        emptyEl.classList.remove('hidden');
    }
    if (timelineEl) {
        timelineEl.innerHTML = '';
        timelineEl.classList.add('hidden');
    }
}

function showTraineeProgressRosterLoading() {
    const rosterEl = document.getElementById('traineeProgressRoster');
    if (rosterEl) {
        rosterEl.innerHTML = `
            <div class="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                <i class="fas fa-circle-notch mr-2 animate-spin text-blue-500"></i> Loading trainees...
            </div>
        `;
    }

    const summaryEl = document.getElementById('traineeProgressSummary');
    const emptyEl = document.getElementById('traineeProgressEmpty');
    const timelineEl = document.getElementById('traineeProgressTimeline');
    if (summaryEl) summaryEl.innerHTML = '';
    if (emptyEl) {
        emptyEl.textContent = 'Preparing trainee progress details...';
        emptyEl.classList.remove('hidden');
    }
    if (timelineEl) {
        timelineEl.innerHTML = '';
        timelineEl.classList.add('hidden');
    }
}

function showTraineeProgressDetailLoading(trainee = null) {
    const titleEl = document.getElementById('traineeProgressDetailTitle');
    const subtitleEl = document.getElementById('traineeProgressDetailSubtitle');
    const summaryEl = document.getElementById('traineeProgressSummary');
    const emptyEl = document.getElementById('traineeProgressEmpty');
    const timelineEl = document.getElementById('traineeProgressTimeline');
    const traineeName = trainee ? getModuleTraineeDisplayName(trainee) : 'Trainee Progress Details';

    if (titleEl) titleEl.textContent = traineeName;
    if (subtitleEl) subtitleEl.textContent = `Loading sequenced module progress for ${getSelectedQualificationName()}...`;
    if (summaryEl) {
        summaryEl.innerHTML = [
            buildModuleTraineeSummaryCard({
                title: 'Completed Modules',
                value: '...',
                subtitle: 'Checking finished modules',
                classes: 'border-emerald-100 bg-emerald-50'
            }),
            buildModuleTraineeSummaryCard({
                title: 'In Progress',
                value: '...',
                subtitle: 'Checking active work',
                classes: 'border-blue-100 bg-blue-50'
            }),
            buildModuleTraineeSummaryCard({
                title: 'Locked / Pending',
                value: '...',
                subtitle: 'Reviewing remaining modules',
                classes: 'border-amber-100 bg-amber-50'
            }),
            buildModuleTraineeSummaryCard({
                title: 'Outcome Completion',
                value: '...',
                subtitle: 'Calculating tracked outcomes',
                classes: 'border-slate-200 bg-slate-50'
            })
        ].join('');
    }
    if (emptyEl) {
        emptyEl.textContent = 'Loading trainee progress details...';
        emptyEl.classList.remove('hidden');
    }
    if (timelineEl) {
        timelineEl.innerHTML = '';
        timelineEl.classList.add('hidden');
    }
}

function renderTraineeProgressRoster() {
    const rosterEl = document.getElementById('traineeProgressRoster');
    if (!rosterEl) return;

    if (!Array.isArray(traineeProgressRoster) || traineeProgressRoster.length === 0) {
        rosterEl.innerHTML = `
            <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No trainees are assigned to this qualification yet.
            </div>
        `;
        return;
    }

    rosterEl.innerHTML = traineeProgressRoster.map((trainee, index) => {
        const active = Number(trainee.trainee_id) === Number(selectedProgressTraineeId);
        return `
            <button
                type="button"
                class="w-full rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    active
                        ? 'border-blue-200 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60'
                }"
                data-trainee-progress-item="${Number(trainee.trainee_id) || 0}"
                onclick="selectTraineeProgressTrainee(${Number(trainee.trainee_id) || 0})"
            >
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="truncate text-sm font-semibold ${active ? 'text-blue-900' : 'text-slate-900'}">${escapeHtml(getModuleTraineeDisplayName(trainee))}</p>
                        ${trainee.email ? `<p class="mt-1 truncate text-xs ${active ? 'text-blue-700' : 'text-slate-500'}">${escapeHtml(trainee.email)}</p>` : ''}
                    </div>
                    <span class="inline-flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-full ${active ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-600'} px-2 text-xs font-semibold">
                        ${index + 1}
                    </span>
                </div>
                <div class="mt-3 flex items-center justify-between gap-2">
                    <span class="text-xs ${active ? 'text-blue-700' : 'text-slate-500'}">Click to inspect status</span>
                    ${trainee.trainee_school_id ? `<span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}">${escapeHtml(trainee.trainee_school_id)}</span>` : ''}
                </div>
            </button>
        `;
    }).join('');
}

function getTraineeProgressModuleStatusMeta(status = 'not_started') {
    const map = {
        completed: {
            badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            card: 'border-emerald-200 bg-emerald-50/50',
            label: 'Completed'
        },
        in_progress: {
            badge: 'border-blue-200 bg-blue-50 text-blue-700',
            card: 'border-blue-200 bg-blue-50/50',
            label: 'In Progress'
        },
        locked: {
            badge: 'border-amber-200 bg-amber-50 text-amber-700',
            card: 'border-amber-200 bg-amber-50/50',
            label: 'Locked'
        },
        not_started: {
            badge: 'border-slate-200 bg-slate-100 text-slate-700',
            card: 'border-slate-200 bg-white',
            label: 'Not Started'
        }
    };

    return map[status] || map.not_started;
}

function getTraineeProgressOutcomeStatusMeta(status = 'not_started') {
    const map = {
        completed: {
            badge: 'bg-emerald-100 text-emerald-700',
            label: 'Completed'
        },
        in_progress: {
            badge: 'bg-blue-100 text-blue-700',
            label: 'Partial'
        },
        not_started: {
            badge: 'bg-amber-100 text-amber-700',
            label: 'Lacking'
        },
        not_tracked: {
            badge: 'bg-slate-100 text-slate-600',
            label: 'No Activity'
        }
    };

    return map[status] || map.not_started;
}

async function loadTraineeProgressRoster(qualificationId) {
    const parsedQualificationId = Number(qualificationId || 0);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!parsedQualificationId || !user?.user_id) {
        resetTraineeProgressTab('Select a qualification to load trainees.');
        return;
    }

    showTraineeProgressRosterLoading();
    selectedProgressTraineeId = null;
    traineeProgressRoster = [];
    traineeProgressCache.clear();

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/modules.php?action=get-qualification-trainee-roster`, {
            params: {
                qualification_id: parsedQualificationId,
                user_id: user.user_id
            }
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to load trainees.');
        }

        traineeProgressRoster = Array.isArray(response.data.data) ? response.data.data : [];
        renderTraineeProgressRoster();

        if (!traineeProgressRoster.length) {
            const titleEl = document.getElementById('traineeProgressDetailTitle');
            const subtitleEl = document.getElementById('traineeProgressDetailSubtitle');
            const emptyEl = document.getElementById('traineeProgressEmpty');
            const timelineEl = document.getElementById('traineeProgressTimeline');
            const summaryEl = document.getElementById('traineeProgressSummary');

            if (titleEl) titleEl.textContent = 'Trainee Progress Details';
            if (subtitleEl) subtitleEl.textContent = `No trainees found for ${getSelectedQualificationName()}.`;
            if (summaryEl) summaryEl.innerHTML = '';
            if (emptyEl) {
                emptyEl.textContent = 'No trainees are assigned to this qualification yet.';
                emptyEl.classList.remove('hidden');
            }
            if (timelineEl) {
                timelineEl.innerHTML = '';
                timelineEl.classList.add('hidden');
            }
            return;
        }

        await window.selectTraineeProgressTrainee(traineeProgressRoster[0].trainee_id);
    } catch (error) {
        console.error('Error loading trainee progress roster:', error);
        resetTraineeProgressTab(error.response?.data?.message || error.message || 'Unable to load trainees.');
    }
}

function renderTraineeProgressDetail(data = {}) {
    const trainee = data.trainee || {};
    const summary = data.summary || {};
    const modules = Array.isArray(data.modules) ? data.modules : [];

    const titleEl = document.getElementById('traineeProgressDetailTitle');
    const subtitleEl = document.getElementById('traineeProgressDetailSubtitle');
    const summaryEl = document.getElementById('traineeProgressSummary');
    const emptyEl = document.getElementById('traineeProgressEmpty');
    const timelineEl = document.getElementById('traineeProgressTimeline');

    if (titleEl) titleEl.textContent = getModuleTraineeDisplayName(trainee);
    if (subtitleEl) {
        const subtitleParts = [
            getSelectedQualificationName(),
            `${Number(summary.total_modules || 0)} published ${Number(summary.total_modules || 0) === 1 ? 'module' : 'modules'} in sequence`
        ];
        if (trainee.trainee_school_id) subtitleParts.unshift(trainee.trainee_school_id);
        if (trainee.email) subtitleParts.push(trainee.email);
        subtitleEl.textContent = subtitleParts.join(' - ');
    }

    if (summaryEl) {
        summaryEl.innerHTML = [
            buildModuleTraineeSummaryCard({
                title: 'Completed Modules',
                value: String(summary.completed_modules || 0),
                subtitle: `${summary.total_modules || 0} total modules`,
                classes: 'border-emerald-100 bg-emerald-50'
            }),
            buildModuleTraineeSummaryCard({
                title: 'In Progress',
                value: String(summary.in_progress_modules || 0),
                subtitle: `${summary.not_started_modules || 0} not started`,
                classes: 'border-blue-100 bg-blue-50'
            }),
            buildModuleTraineeSummaryCard({
                title: 'Locked Modules',
                value: String(summary.locked_modules || 0),
                subtitle: 'Waiting on earlier sequence items',
                classes: 'border-amber-100 bg-amber-50'
            }),
            buildModuleTraineeSummaryCard({
                title: 'Outcome Completion',
                value: `${summary.completed_outcomes || 0}/${summary.tracked_outcomes || 0}`,
                subtitle: `${summary.completion_percentage || 0}% of tracked outcomes completed`,
                classes: 'border-slate-200 bg-slate-50'
            })
        ].join('');
    }

    if (!modules.length) {
        if (emptyEl) {
            emptyEl.textContent = 'No published modules were found for this qualification yet.';
            emptyEl.classList.remove('hidden');
        }
        if (timelineEl) {
            timelineEl.innerHTML = '';
            timelineEl.classList.add('hidden');
        }
        return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    if (timelineEl) timelineEl.classList.remove('hidden');

    timelineEl.innerHTML = modules.map((module) => {
        const statusMeta = getTraineeProgressModuleStatusMeta(module.progress_status);
        const competencyLabel = `${String(module.competency_type || 'core').charAt(0).toUpperCase()}${String(module.competency_type || 'core').slice(1)}`;
        const trackedLabel = Number(module.tracked_outcomes || 0) > 0
            ? `${module.completed_outcomes || 0}/${module.tracked_outcomes || 0} tracked outcomes completed`
            : 'No quiz or task sheet attached yet';
        const untrackedLabel = Number(module.untracked_outcomes || 0) > 0
            ? `${module.untracked_outcomes} outcome${Number(module.untracked_outcomes) === 1 ? '' : 's'} without tracked activity`
            : 'All outcomes have tracked activity';

        const outcomesHtml = Array.isArray(module.outcomes) && module.outcomes.length
            ? module.outcomes.map((outcome) => {
                const outcomeMeta = getTraineeProgressOutcomeStatusMeta(outcome.status);
                const completedLine = Array.isArray(outcome.completed_items) && outcome.completed_items.length
                    ? `<p class="mt-2 text-xs text-emerald-700"><span class="font-semibold">Completed:</span> ${escapeHtml(outcome.completed_items.join(', '))}</p>`
                    : '';
                const missingLine = Array.isArray(outcome.missing_items) && outcome.missing_items.length
                    ? `<p class="mt-1 text-xs text-amber-700"><span class="font-semibold">Lacking:</span> ${escapeHtml(outcome.missing_items.join(', '))}</p>`
                    : '';
                const noActivityLine = !outcome.tracked
                    ? '<p class="mt-2 text-xs text-slate-500">No quiz or task sheet attached to this outcome yet.</p>'
                    : '';

                return `
                    <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div class="flex flex-wrap items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="text-sm font-semibold text-slate-900">Outcome ${Number(outcome.sequence_no || 0)}: ${escapeHtml(outcome.lesson_title || 'Untitled Outcome')}</p>
                                ${completedLine}
                                ${missingLine}
                                ${noActivityLine}
                            </div>
                            <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${outcomeMeta.badge}">
                                ${escapeHtml(outcomeMeta.label)}
                            </span>
                        </div>
                    </div>
                `;
            }).join('')
            : `
                <div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500">
                    No learning outcomes found in this module.
                </div>
            `;

        return `
            <article class="overflow-hidden rounded-2xl border ${statusMeta.card} shadow-sm">
                <div class="border-b border-slate-200/80 px-4 py-4 sm:px-5">
                    <div class="flex flex-wrap items-start justify-between gap-4">
                        <div class="flex items-start gap-3">
                            <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                                ${Number(module.sequence_no || 0)}
                            </div>
                            <div class="min-w-0">
                                <div class="flex flex-wrap items-center gap-2">
                                    <h5 class="text-base font-semibold text-slate-900">${escapeHtml(module.module_title || 'Untitled Module')}</h5>
                                    <span class="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">${escapeHtml(competencyLabel)}</span>
                                    <span class="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${statusMeta.badge}">${escapeHtml(statusMeta.label)}</span>
                                </div>
                                ${module.module_description ? `<p class="mt-2 text-sm text-slate-600">${escapeHtml(module.module_description)}</p>` : ''}
                            </div>
                        </div>
                        <div class="min-w-[180px] rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-right">
                            <p class="text-lg font-bold text-slate-900">${Number(module.completion_percentage || 0)}%</p>
                            <p class="text-xs text-slate-500">${escapeHtml(trackedLabel)}</p>
                        </div>
                    </div>
                    <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tracked Progress</p>
                            <p class="mt-1 text-sm font-semibold text-slate-900">${escapeHtml(trackedLabel)}</p>
                        </div>
                        <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Remaining Lackings</p>
                            <p class="mt-1 text-sm font-semibold text-slate-900">${Number(module.lacking_outcomes || 0)} outcome${Number(module.lacking_outcomes || 0) === 1 ? '' : 's'} lacking</p>
                        </div>
                        <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Extra Context</p>
                            <p class="mt-1 text-sm font-semibold text-slate-900">${escapeHtml(untrackedLabel)}</p>
                        </div>
                    </div>
                </div>
                <div class="space-y-3 bg-slate-50 px-4 py-4 sm:px-5">
                    ${outcomesHtml}
                </div>
            </article>
        `;
    }).join('');
}

window.selectTraineeProgressTrainee = async function(traineeId) {
    const parsedTraineeId = Number(traineeId || 0);
    const qualificationId = Number(document.getElementById('qualificationSelect')?.value || 0);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!parsedTraineeId || !qualificationId || !user?.user_id) return;

    selectedProgressTraineeId = parsedTraineeId;
    renderTraineeProgressRoster();

    const selectedTrainee = traineeProgressRoster.find((trainee) => Number(trainee.trainee_id) === parsedTraineeId) || null;
    const cacheKey = `${qualificationId}:${parsedTraineeId}`;

    if (traineeProgressCache.has(cacheKey)) {
        renderTraineeProgressDetail(traineeProgressCache.get(cacheKey));
        return;
    }

    showTraineeProgressDetailLoading(selectedTrainee);

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/modules.php?action=get-trainee-sequenced-progress`, {
            params: {
                qualification_id: qualificationId,
                trainee_id: parsedTraineeId,
                user_id: user.user_id
            }
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to load trainee progress.');
        }

        traineeProgressCache.set(cacheKey, response.data.data || {});
        renderTraineeProgressDetail(response.data.data || {});
    } catch (error) {
        console.error('Error loading trainee sequenced progress:', error);

        const titleEl = document.getElementById('traineeProgressDetailTitle');
        const subtitleEl = document.getElementById('traineeProgressDetailSubtitle');
        const summaryEl = document.getElementById('traineeProgressSummary');
        const emptyEl = document.getElementById('traineeProgressEmpty');
        const timelineEl = document.getElementById('traineeProgressTimeline');

        if (titleEl) titleEl.textContent = selectedTrainee ? getModuleTraineeDisplayName(selectedTrainee) : 'Trainee Progress Details';
        if (subtitleEl) subtitleEl.textContent = 'Unable to load trainee progress.';
        if (summaryEl) summaryEl.innerHTML = '';
        if (emptyEl) {
            emptyEl.textContent = error.response?.data?.message || error.message || 'Unable to load trainee progress.';
            emptyEl.classList.remove('hidden');
        }
        if (timelineEl) {
            timelineEl.innerHTML = '';
            timelineEl.classList.add('hidden');
        }
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
    openUnifiedModuleUploadModal(currentCompetencyType, id);
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
    updateLessonTaskSheetVisibility('core');
    
    // Reset all panes
    document.getElementById('lessonContentsList').innerHTML = '';
    document.getElementById('taskSheetsList').innerHTML = '';
    document.getElementById('questionsContainer').innerHTML = '';
    document.getElementById('lessonFileUpload').value = '';
    document.getElementById('lessonResourceUrl').value = '';
    document.getElementById('postingDate').value = '';
    document.getElementById('currentLessonFileContainer').classList.add('hidden');
    document.getElementById('currentLessonResourceContainer').classList.add('hidden');
    const deadlineInput = document.getElementById('quizDeadline');
    if (deadlineInput) deadlineInput.value = '';

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/modules.php?action=get-lesson-details&lesson_id=${lessonId}`);
        if (response.data.success) {
            const data = response.data.data;
            const competencyType = data.competency_type;
            document.getElementById('manageLessonModal').dataset.competencyType = competencyType;
            updateLessonTaskSheetVisibility(competencyType);

            const coreManager = document.getElementById('coreContentManager');
            const fileManager = document.getElementById('fileContentManager');
            const fileContainer = document.getElementById('currentLessonFileContainer');
            const fileLink = document.getElementById('currentLessonFileLink');
            const resourceContainer = document.getElementById('currentLessonResourceContainer');
            const resourceLink = document.getElementById('currentLessonResourceLink');
            const resourceInput = document.getElementById('lessonResourceUrl');

            coreManager.classList.remove('hidden');
            fileManager.classList.remove('hidden');
            renderLessonContentsList(data.contents || [], data.lesson_file_path || '', data.lesson_resource_url || '');
            if (resourceInput) resourceInput.value = data.lesson_resource_url || '';

            if (data.lesson_file_path) {
                fileLink.href = getLessonMaterialFileUrl(data.lesson_file_path);
                fileLink.textContent = formatLessonMaterialFileName(data.lesson_file_path);
                fileContainer.classList.remove('hidden');
            } else {
                fileContainer.classList.add('hidden');
            }

            if (data.lesson_resource_url) {
                const resourceMeta = getLessonResourceDisplayMeta(data.lesson_resource_url);
                resourceLink.href = resourceMeta.url;
                resourceLink.textContent = resourceMeta.displayText;
                resourceContainer.classList.remove('hidden');
            } else {
                resourceContainer.classList.add('hidden');
            }

            renderTaskSheetsList(data.task_sheets || []);
            document.getElementById('postingDate').value = data.posting_date || '';
            if (deadlineInput && data.deadline) deadlineInput.value = data.deadline;

            if (data.quiz && data.quiz.length > 0) {
                data.quiz.forEach(q => addQuestion(q));
            }
        } else {
            // Still show the modal but with empty lists on failure
            renderLessonContentsList([], '', '');
            document.getElementById('fileContentManager').classList.remove('hidden');
            renderTaskSheetsList([]);
            Swal.fire('Error', 'Could not load lesson details: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error loading lesson details:', error);
        Swal.fire('Error', 'Failed to load lesson details', 'error');
    }

    manageLessonModal.show();
}

function formatLessonMaterialFileName(filePath = '') {
    const cleaned = String(filePath || '').split('/').pop().split('\\').pop();
    return cleaned || 'Uploaded learning material';
}

function getLessonMaterialFileUrl(filePath = '') {
    const cleaned = String(filePath || '').split('/').filter(Boolean).map(part => encodeURIComponent(part)).join('/');
    return `${LESSON_UPLOADS_URL}${cleaned}`;
}

function normalizeLessonResourceUrlInput(value = '') {
    const trimmedValue = String(value || '').trim();
    if (!trimmedValue) return '';

    const normalizedValue = /^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue.replace(/^\/+/, '')}`;

    try {
        const parsedUrl = new URL(normalizedValue);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return '';
        }
        return parsedUrl.toString();
    } catch (error) {
        return '';
    }
}

function getLessonResourceDisplayMeta(resourceUrl = '') {
    const normalizedUrl = normalizeLessonResourceUrlInput(resourceUrl);
    if (!normalizedUrl) {
        return {
            url: '',
            label: 'Lesson Link',
            helper: 'External lesson resource',
            displayText: ''
        };
    }

    try {
        const parsedUrl = new URL(normalizedUrl);
        const host = parsedUrl.hostname.replace(/^www\./i, '');
        const isVideoResource = /(^|\.)youtube\.com$/i.test(parsedUrl.hostname)
            || /(^|\.)youtu\.be$/i.test(parsedUrl.hostname)
            || /(^|\.)vimeo\.com$/i.test(parsedUrl.hostname)
            || /\.(mp4|webm|ogg|mov)(?:$|\?)/i.test(parsedUrl.pathname);

        const pathText = parsedUrl.pathname && parsedUrl.pathname !== '/' ? parsedUrl.pathname : '';
        const displayText = `${host}${pathText}` || normalizedUrl;

        return {
            url: normalizedUrl,
            label: isVideoResource ? 'Video Lesson' : 'Lesson Link',
            helper: host || 'External lesson resource',
            displayText
        };
    } catch (error) {
        return {
            url: normalizedUrl,
            label: 'Lesson Link',
            helper: 'External lesson resource',
            displayText: normalizedUrl
        };
    }
}

function renderLessonContentsList(contents, lessonFilePath = '', lessonResourceUrl = '') {
    const container = document.getElementById('lessonContentsList');
    container.innerHTML = '';
    if (lessonFilePath) {
        const displayName = formatLessonMaterialFileName(lessonFilePath);
        container.innerHTML += `
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <div class="min-w-0">
                    <span class="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><i class="fas fa-file-lines text-blue-600"></i>${escapeHtml(displayName)}</span>
                    <p class="mt-1 text-xs text-slate-500">Uploaded learning material</p>
                </div>
                <a href="${getLessonMaterialFileUrl(lessonFilePath)}" target="_blank" class="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    <i class="fas fa-eye"></i> Open File
                </a>
            </div>
        `;
    }

    const resourceMeta = getLessonResourceDisplayMeta(lessonResourceUrl);
    if (resourceMeta.url) {
        const resourceIcon = resourceMeta.label === 'Video Lesson' ? 'fa-circle-play text-emerald-600' : 'fa-link text-emerald-600';
        const resourceActionLabel = resourceMeta.label === 'Video Lesson' ? 'Open Video' : 'Open Link';
        container.innerHTML += `
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div class="min-w-0">
                    <span class="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><i class="fas ${resourceIcon}"></i>${escapeHtml(resourceMeta.displayText)}</span>
                    <p class="mt-1 text-xs text-slate-500">${escapeHtml(resourceMeta.label)} from ${escapeHtml(resourceMeta.helper)}</p>
                </div>
                <a href="${escapeHtml(resourceMeta.url)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                    <i class="fas fa-arrow-up-right-from-square"></i> ${resourceActionLabel}
                </a>
            </div>
        `;
    }

    if (contents.length === 0 && !lessonFilePath && !resourceMeta.url) {
        container.innerHTML = '<div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">No learning materials or information sheets added yet.</div>';
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
    if (contentItemsContainer) contentItemsContainer.innerHTML = '';
    if (noMessage) noMessage.style.display = 'block';

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

    const itemId = nextRuntimeId();
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

function normalizeLessonQuestionData(data = null) {
    const questionText = String(data?.question_text ?? data?.text ?? '').trim();
    const questionType = String(data?.question_type ?? data?.type ?? 'multiple_choice').trim() === 'true_false'
        ? 'true_false'
        : 'multiple_choice';

    let options = Array.isArray(data?.options)
        ? data.options.map(option => ({
            option_text: String(option?.option_text ?? option?.text ?? '').trim(),
            is_correct: option?.is_correct == 1 || option?.is_correct === true
        })).filter(option => option.option_text !== '')
        : [];

    if (questionType === 'true_false') {
        const normalizedCorrect = options.find(option => option.is_correct)?.option_text?.trim().toLowerCase() || '';
        return {
            questionText,
            questionType,
            options: [
                { option_text: 'TRUE', is_correct: normalizedCorrect === 'true' },
                { option_text: 'FALSE', is_correct: normalizedCorrect === 'false' }
            ]
        };
    }

    if (!options.length) {
        options = [
            { option_text: '', is_correct: false },
            { option_text: '', is_correct: false }
        ];
    }

    return { questionText, questionType, options };
}

function renderLessonTrueFalseOptions(optionsList, qIndex, correctAnswer = '') {
    const normalizedCorrect = String(correctAnswer || '').trim().toLowerCase();
    optionsList.innerHTML = `
        ${createOptionHtml(qIndex, 0, 'TRUE', normalizedCorrect === 'true')}
        ${createOptionHtml(qIndex, 1, 'FALSE', normalizedCorrect === 'false')}
    `;
}

function refreshLessonQuestionIndices() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;

    Array.from(container.querySelectorAll('.question-item')).forEach((questionItem, index) => {
        const title = questionItem.querySelector('.lesson-question-label');
        if (title) title.textContent = `Question ${index + 1}`;

        const addButton = questionItem.querySelector('.add-option-btn');
        if (addButton) addButton.setAttribute('onclick', `addOption(this, ${index})`);

        questionItem.querySelectorAll('.option-item input[type="radio"]').forEach(radio => {
            radio.name = `correct_answer_${index}`;
        });
    });
}

window.removeLessonQuestion = function(button) {
    button.closest('.question-item')?.remove();
    refreshLessonQuestionIndices();
}

window.addQuestion = function(data = null) {
    const container = document.getElementById('questionsContainer');
    if (!container) return;

    const qIndex = container.children.length;
    const normalized = normalizeLessonQuestionData(data);

    let optionsHtml = '';
    normalized.options.forEach((opt, oIndex) => {
        optionsHtml += createOptionHtml(qIndex, oIndex, opt.option_text, opt.is_correct);
    });

    const qDiv = document.createElement('div');
    qDiv.className = 'question-item mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white';
    qDiv.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
            <strong class="lesson-question-label text-sm font-semibold text-slate-800">Question ${qIndex + 1}</strong>
            <button type="button" class="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" onclick="removeLessonQuestion(this)">Remove</button>
        </div>
        <div class="question-body space-y-2 p-3">
            <input type="text" class="question-text w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Enter question" value="${escapeHtml(normalized.questionText)}">
            <select class="question-type w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onchange="toggleOptions(this)">
                <option value="multiple_choice" ${normalized.questionType === 'multiple_choice' ? 'selected' : ''}>Multiple Choice</option>
                <option value="true_false" ${normalized.questionType === 'true_false' ? 'selected' : ''}>True/False</option>
            </select>
            <div class="options-list space-y-2">
                ${optionsHtml}
            </div>
            <button type="button" class="add-option-btn inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${normalized.questionType === 'true_false' ? 'hidden' : ''}" onclick="addOption(this, ${qIndex})">+ Add Option</button>
        </div>
    `;

    container.appendChild(qDiv);

    if (normalized.questionType === 'true_false') {
        const optionsList = qDiv.querySelector('.options-list');
        const correctAnswer = normalized.options.find(option => option.is_correct)?.option_text || '';
        renderLessonTrueFalseOptions(optionsList, qIndex, correctAnswer);
        const addButton = qDiv.querySelector('.add-option-btn');
        if (addButton) {
            addButton.classList.add('hidden');
            addButton.style.display = 'none';
        }
    }

    refreshLessonQuestionIndices();
}

window.createOptionHtml = function(qIndex, oIndex, text, isCorrect) {
    return `
        <div class="option-item flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <button class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" type="button" onclick="this.closest('.option-item').remove()">X</button>
            <input type="text" class="option-text w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Option text" value="${escapeHtml(text)}">
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
    const qIndex = Array.from(document.getElementById('questionsContainer').children).indexOf(select.closest('.question-item'));

    if (select.value === 'true_false') {
        addBtn.classList.add('hidden');
        addBtn.style.display = 'none';
        renderLessonTrueFalseOptions(optionsList, qIndex);
    } else {
        addBtn.classList.remove('hidden');
        addBtn.style.display = '';
        if (optionsList.children.length < 2) {
            optionsList.innerHTML = `
                ${createOptionHtml(qIndex, 0, '', false)}
                ${createOptionHtml(qIndex, 1, '', false)}
            `;
        }
    }

    refreshLessonQuestionIndices();
}

function getQuizTemplateCsv() {
    return [
        'question_text,question_type,option_1,option_2,option_3,option_4,correct_answer',
        '"What should a trainee wear before welding?","multiple_choice","Welding helmet","Slippers","Loose scarf","Open sandals","1"',
        '"Safety goggles protect the eyes.","true_false","TRUE","FALSE","","","TRUE"'
    ].join('\r\n');
}

window.downloadQuizTemplate = function() {
    const blob = new Blob([getQuizTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quiz_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current);
    return {
        values,
        hasUnclosedQuote: inQuotes
    };
}

function normalizeQuizTemplateHeader(header) {
    return header.trim().toLowerCase().replace(/\s+/g, '_');
}

function normalizeImportedQuestionType(rawType) {
    const normalized = String(rawType || '').trim().toLowerCase();
    if (['multiple_choice', 'multiple-choice', 'multiple choice', 'mcq'].includes(normalized)) {
        return 'multiple_choice';
    }
    if (['true_false', 'true-false', 'true false', 'boolean'].includes(normalized)) {
        return 'true_false';
    }
    return '';
}

function resolveCorrectAnswerIndex(correctAnswer, options) {
    const token = String(correctAnswer || '').trim();
    if (!token) return -1;

    if (/^\d+$/.test(token)) {
        const numericIndex = parseInt(token, 10) - 1;
        if (numericIndex >= 0 && numericIndex < options.length) return numericIndex;
    }

    if (/^[A-Z]$/i.test(token)) {
        const alphaIndex = token.toUpperCase().charCodeAt(0) - 65;
        if (alphaIndex >= 0 && alphaIndex < options.length) return alphaIndex;
    }

    const optionMatch = token.match(/^option[\s_-]?(\d+)$/i);
    if (optionMatch) {
        const optionIndex = parseInt(optionMatch[1], 10) - 1;
        if (optionIndex >= 0 && optionIndex < options.length) return optionIndex;
    }

    return options.findIndex(option => option.trim().toLowerCase() === token.toLowerCase());
}

function buildQuizTemplateImportError(errors) {
    const visibleErrors = errors.slice(0, 8);
    const remainingCount = errors.length - visibleErrors.length;
    const messageLines = [
        `${errors.length} issue(s) found in the quiz template:`,
        ...visibleErrors.map(error => `- ${error}`)
    ];

    if (remainingCount > 0) {
        messageLines.push(`- ...and ${remainingCount} more issue(s).`);
    }

    return messageLines.join('\n');
}

function parseQuizTemplateCsv(csvText) {
    const parsedLines = csvText
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((line, index) => ({
            line,
            lineNumber: index + 1
        }))
        .filter(item => item.line.trim() !== '');

    if (parsedLines.length < 2) {
        throw new Error('The quiz template is empty. Add at least one question row.');
    }

    const headerLine = parsedLines[0];
    const headerParse = parseCsvLine(headerLine.line);
    if (headerParse.hasUnclosedQuote) {
        throw new Error(`Line ${headerLine.lineNumber}: the header row has an unmatched quote.`);
    }

    const headers = headerParse.values.map(normalizeQuizTemplateHeader);
    const questionColumn = headers.find(header => ['question_text', 'question'].includes(header));
    const typeColumn = headers.find(header => ['question_type', 'type'].includes(header));
    const correctColumn = headers.find(header => ['correct_answer', 'answer_key', 'answer'].includes(header));
    const optionColumns = headers
        .map((header, index) => ({ header, index }))
        .filter(item => /^option_?\d+$/.test(item.header))
        .sort((left, right) => {
            const leftNumber = parseInt(left.header.replace(/\D/g, ''), 10);
            const rightNumber = parseInt(right.header.replace(/\D/g, ''), 10);
            return leftNumber - rightNumber;
        });

    if (!questionColumn || !typeColumn || !correctColumn || optionColumns.length < 2) {
        throw new Error('Template columns must include question_text, question_type, at least option_1 and option_2, and correct_answer.');
    }

    const questions = [];
    const errors = [];

    for (let rowIndex = 1; rowIndex < parsedLines.length; rowIndex += 1) {
        const { line, lineNumber } = parsedLines[rowIndex];
        const parsedLine = parseCsvLine(line);

        if (parsedLine.hasUnclosedQuote) {
            errors.push(`Line ${lineNumber}: unmatched quote detected.`);
            continue;
        }

        const values = parsedLine.values;
        if (values.length > headers.length) {
            errors.push(`Line ${lineNumber}: found ${values.length} columns but the template expects ${headers.length}. Check for extra commas or missing quotes.`);
            continue;
        }

        const row = {};
        headers.forEach((header, index) => {
            row[header] = (values[index] || '').trim();
        });

        const questionText = row[questionColumn];
        const rowHasContent = Object.values(row).some(value => value !== '');

        if (!questionText) {
            if (rowHasContent) {
                errors.push(`Line ${lineNumber}: question_text is required.`);
            }
            continue;
        }

        const questionType = normalizeImportedQuestionType(row[typeColumn]);
        if (!questionType) {
            errors.push(`Line ${lineNumber}: question_type must be multiple_choice or true_false.`);
            continue;
        }

        const rawOptions = optionColumns.map(item => row[item.header] || '');
        let options = rawOptions.filter(Boolean);

        if (questionType === 'true_false') {
            const extraTrueFalseOptions = rawOptions.slice(2).filter(Boolean);
            if (extraTrueFalseOptions.length > 0) {
                errors.push(`Line ${lineNumber}: true_false rows may only use option_1 and option_2.`);
                continue;
            }

            const firstOption = String(rawOptions[0] || '').trim();
            const secondOption = String(rawOptions[1] || '').trim();

            if (!firstOption && !secondOption) {
                options = ['TRUE', 'FALSE'];
            } else if (!firstOption || !secondOption) {
                errors.push(`Line ${lineNumber}: true_false rows must either leave option_1 and option_2 blank or set them to TRUE and FALSE.`);
                continue;
            } else {
                const normalizedFirst = firstOption.toUpperCase();
                const normalizedSecond = secondOption.toUpperCase();

                if (normalizedFirst !== 'TRUE' || normalizedSecond !== 'FALSE') {
                    errors.push(`Line ${lineNumber}: true_false rows must use option_1=TRUE and option_2=FALSE.`);
                    continue;
                }

                options = ['TRUE', 'FALSE'];
            }
        }

        if (options.length < 2) {
            errors.push(`Line ${lineNumber}: each question needs at least two options.`);
            continue;
        }

        const correctIndex = resolveCorrectAnswerIndex(row[correctColumn], options);
        if (correctIndex < 0) {
            errors.push(`Line ${lineNumber}: correct_answer must match an option number, letter, or exact option text.`);
            continue;
        }

        questions.push({
            text: questionText,
            type: questionType,
            options: options.map((optionText, optionIndex) => ({
                text: optionText,
                is_correct: optionIndex === correctIndex
            }))
        });
    }

    if (errors.length > 0) {
        throw new Error(buildQuizTemplateImportError(errors));
    }

    if (!questions.length) {
        throw new Error('No valid questions were found in the uploaded template.');
    }

    return questions;
}

async function replaceQuizQuestionsFromTemplate(questions, target = 'lesson', outcomeId = null) {
    const container = target === 'lesson'
        ? document.getElementById('questionsContainer')
        : document.querySelector(`#outcome-${outcomeId} .outcome-quiz-items`);

    if (!container) {
        throw new Error('Quiz container not found.');
    }

    if (container.children.length > 0) {
        const result = await Swal.fire({
            title: 'Replace current quiz?',
            text: 'Importing a premade quiz will replace the questions already added here.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Replace Quiz',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#2563eb'
        });

        if (!result.isConfirmed) {
            return false;
        }
    }

    container.innerHTML = '';

    questions.forEach(question => {
        if (target === 'lesson') {
            addQuestion({
                question_text: question.text,
                question_type: question.type,
                options: question.options.map(option => ({
                    option_text: option.text,
                    is_correct: option.is_correct ? 1 : 0
                }))
            });
            return;
        }

        addQuizQuestion(outcomeId, question);
    });

    await Swal.fire('Imported', `${questions.length} question(s) were arranged successfully.`, 'success');
    return true;
}

async function importQuizTemplateFile(file, target = 'lesson', outcomeId = null) {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
        throw new Error('Please upload the premade quiz using the CSV template file.');
    }

    const fileText = await file.text();
    const questions = parseQuizTemplateCsv(fileText);
    await replaceQuizQuestionsFromTemplate(questions, target, outcomeId);
}

window.handleLessonQuizTemplateSelected = async function(input) {
    const file = input?.files?.[0];
    try {
        await importQuizTemplateFile(file, 'lesson');
    } catch (error) {
        Swal.fire('Import Error', error.message || 'Failed to import the premade quiz.', 'error');
    } finally {
        if (input) input.value = '';
    }
}

window.handleOutcomeQuizTemplateSelected = async function(outcomeId, input) {
    const file = input?.files?.[0];
    try {
        await importQuizTemplateFile(file, 'outcome', outcomeId);
    } catch (error) {
        Swal.fire('Import Error', error.message || 'Failed to import the premade quiz.', 'error');
    } finally {
        if (input) input.value = '';
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
        formData.append('lesson_resource_url', document.getElementById('lessonResourceUrl')?.value.trim() || '');

        const fileInput = document.getElementById('lessonFileUpload');
        if (fileInput.files.length > 0) {
            formData.append('lesson_file', fileInput.files[0]);
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

function buildModuleTraineeSummaryCard({ title, value, subtitle, classes = '' } = {}) {
    return `
        <div class="rounded-xl border px-4 py-3 ${classes}">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-600">${escapeHtml(title ?? '')}</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">${escapeHtml(value ?? '')}</p>
            <p class="mt-1 text-xs text-slate-500">${escapeHtml(subtitle ?? '')}</p>
        </div>
    `;
}

function getModuleTraineeDisplayName(trainee = {}) {
    const fullName = [trainee.first_name, trainee.last_name]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(' ');

    if (fullName) return fullName;
    if (trainee.email) return String(trainee.email);
    if (trainee.trainee_id) return `Trainee #${trainee.trainee_id}`;
    return 'Unnamed trainee';
}

function renderModuleTraineeGroupList(containerId, trainees = [], groupKey = 'answered', totalQuizzes = 0) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const groupStyles = {
        answered: {
            card: 'border-emerald-200 bg-white',
            badge: 'bg-emerald-100 text-emerald-700',
            meta: 'text-emerald-700'
        },
        lacking: {
            card: 'border-amber-200 bg-white',
            badge: 'bg-amber-100 text-amber-700',
            meta: 'text-amber-700'
        },
        no_answer: {
            card: 'border-slate-200 bg-white',
            badge: 'bg-slate-100 text-slate-700',
            meta: 'text-slate-600'
        }
    };

    const style = groupStyles[groupKey] || groupStyles.no_answer;

    if (!Array.isArray(trainees) || trainees.length === 0) {
        container.innerHTML = `
            <div class="rounded-lg border border-dashed border-slate-300 bg-white/80 px-3 py-4 text-center text-xs text-slate-500">
                No trainees in this group.
            </div>
        `;
        return;
    }

    container.innerHTML = trainees.map((trainee) => {
        const answered = Number(trainee.answered_quizzes || 0);
        const remaining = Math.max(0, Number(trainee.remaining_quizzes || 0));
        let progressLabel = 'No quiz answers yet';

        if (totalQuizzes > 0 && groupKey === 'answered') {
            progressLabel = `${answered}/${totalQuizzes} quizzes answered`;
        } else if (totalQuizzes > 0 && groupKey === 'lacking') {
            progressLabel = `${answered}/${totalQuizzes} answered, ${remaining} lacking`;
        } else if (totalQuizzes > 0) {
            progressLabel = `0/${totalQuizzes} quizzes answered`;
        }

        return `
            <div class="rounded-lg border px-3 py-3 shadow-sm ${style.card}">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="truncate text-sm font-semibold text-slate-900">${escapeHtml(getModuleTraineeDisplayName(trainee))}</p>
                        ${trainee.email ? `<p class="mt-1 truncate text-xs text-slate-500">${escapeHtml(trainee.email)}</p>` : ''}
                    </div>
                    ${trainee.trainee_school_id ? `<span class="inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[11px] font-semibold ${style.badge}">${escapeHtml(trainee.trainee_school_id)}</span>` : ''}
                </div>
                <p class="mt-3 text-xs font-medium ${style.meta}">${escapeHtml(progressLabel)}</p>
            </div>
        `;
    }).join('');
}

function resetModuleTraineeStatusModal() {
    const titleEl = document.getElementById('moduleTraineeStatusTitle');
    const subtitleEl = document.getElementById('moduleTraineeStatusSubtitle');
    const summaryEl = document.getElementById('moduleTraineeStatusSummary');
    const emptyEl = document.getElementById('moduleTraineeStatusEmpty');
    const groupsEl = document.getElementById('moduleTraineeStatusGroups');

    if (titleEl) titleEl.textContent = 'Trainee Quiz Status';
    if (subtitleEl) subtitleEl.textContent = 'Loading trainee quiz summary...';
    if (summaryEl) summaryEl.innerHTML = '';
    if (emptyEl) {
        emptyEl.textContent = '';
        emptyEl.classList.add('hidden');
    }
    if (groupsEl) groupsEl.classList.remove('hidden');

    const listIds = ['moduleAnsweredList', 'moduleLackingList', 'moduleNoAnswerList'];
    listIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `
                <div class="rounded-lg border border-dashed border-slate-300 bg-white/80 px-3 py-4 text-center text-xs text-slate-500">
                    Waiting for data...
                </div>
            `;
        }
    });

    const countMap = {
        moduleAnsweredCount: '0',
        moduleLackingCount: '0',
        moduleNoAnswerCount: '0'
    };
    Object.entries(countMap).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function showModuleTraineeStatusLoading(moduleTitle = '') {
    resetModuleTraineeStatusModal();

    const titleEl = document.getElementById('moduleTraineeStatusTitle');
    const subtitleEl = document.getElementById('moduleTraineeStatusSubtitle');
    const summaryEl = document.getElementById('moduleTraineeStatusSummary');

    if (titleEl) titleEl.textContent = moduleTitle || 'Trainee Quiz Status';
    if (subtitleEl) subtitleEl.textContent = 'Loading trainee quiz summary...';
    if (summaryEl) {
        summaryEl.innerHTML = [
            buildModuleTraineeSummaryCard({
                title: 'Assigned Trainees',
                value: '...',
                subtitle: 'Fetching assigned learners',
                classes: 'border-blue-100 bg-blue-50'
            }),
            buildModuleTraineeSummaryCard({
                title: 'Quizzes in Module',
                value: '...',
                subtitle: 'Checking module quiz items',
                classes: 'border-emerald-100 bg-emerald-50'
            }),
            buildModuleTraineeSummaryCard({
                title: 'Module Status',
                value: '...',
                subtitle: 'Preparing trainee summary',
                classes: 'border-slate-200 bg-slate-50'
            })
        ].join('');
    }
}

function renderModuleTraineeStatusModal(data = {}) {
    const module = data.module || {};
    const summary = data.summary || {};
    const groups = data.groups || {};
    const totalTrainees = Number(summary.total_trainees || 0);
    const totalQuizzes = Number(summary.total_quizzes || 0);
    const answeredCount = Number(summary.answered_count || 0);
    const lackingCount = Number(summary.lacking_count || 0);
    const noAnswerCount = Number(summary.no_answer_count || 0);
    const moduleStatus = (module.module_status || 'published') === 'draft' ? 'Draft' : 'Published';

    const titleEl = document.getElementById('moduleTraineeStatusTitle');
    const subtitleEl = document.getElementById('moduleTraineeStatusSubtitle');
    const summaryEl = document.getElementById('moduleTraineeStatusSummary');
    const emptyEl = document.getElementById('moduleTraineeStatusEmpty');
    const groupsEl = document.getElementById('moduleTraineeStatusGroups');

    if (titleEl) titleEl.textContent = module.module_title || 'Trainee Quiz Status';
    if (subtitleEl) {
        const subtitleParts = [
            `${totalTrainees} assigned ${totalTrainees === 1 ? 'trainee' : 'trainees'}`,
            `${totalQuizzes} ${totalQuizzes === 1 ? 'quiz' : 'quizzes'} tracked`,
            moduleStatus
        ];
        subtitleEl.textContent = subtitleParts.join(' - ');
    }

    if (summaryEl) {
        summaryEl.innerHTML = [
            buildModuleTraineeSummaryCard({
                title: 'Assigned Trainees',
                value: String(totalTrainees),
                subtitle: totalTrainees === 1 ? '1 trainee can access this module' : `${totalTrainees} trainees can access this module`,
                classes: 'border-blue-100 bg-blue-50'
            }),
            buildModuleTraineeSummaryCard({
                title: 'Quizzes in Module',
                value: String(totalQuizzes),
                subtitle: totalQuizzes === 0 ? 'Add a quiz to track answers here' : `${totalQuizzes} quiz ${totalQuizzes === 1 ? 'lesson is' : 'lessons are'} included`,
                classes: 'border-emerald-100 bg-emerald-50'
            }),
            buildModuleTraineeSummaryCard({
                title: 'Module Status',
                value: moduleStatus,
                subtitle: moduleStatus === 'Draft' ? 'Draft modules may not be visible to trainees yet' : 'Published modules are visible to trainees',
                classes: 'border-slate-200 bg-slate-50'
            })
        ].join('');
    }

    const countElements = {
        moduleAnsweredCount: answeredCount,
        moduleLackingCount: lackingCount,
        moduleNoAnswerCount: noAnswerCount
    };
    Object.entries(countElements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value);
    });

    if (emptyEl) {
        emptyEl.classList.add('hidden');
        emptyEl.textContent = '';
    }
    if (groupsEl) groupsEl.classList.remove('hidden');

    if (totalTrainees === 0) {
        if (emptyEl) {
            emptyEl.textContent = 'No trainees are assigned to this module yet.';
            emptyEl.classList.remove('hidden');
        }
        if (groupsEl) groupsEl.classList.add('hidden');
        return;
    }

    if (totalQuizzes === 0) {
        if (emptyEl) {
            emptyEl.textContent = 'This module does not have any quizzes yet. Add a quiz to at least one learning outcome to track trainee answers here.';
            emptyEl.classList.remove('hidden');
        }
        if (groupsEl) groupsEl.classList.add('hidden');
        return;
    }

    renderModuleTraineeGroupList('moduleAnsweredList', groups.answered || [], 'answered', totalQuizzes);
    renderModuleTraineeGroupList('moduleLackingList', groups.lacking || [], 'lacking', totalQuizzes);
    renderModuleTraineeGroupList('moduleNoAnswerList', groups.no_answer || [], 'no_answer', totalQuizzes);
}

window.openModuleTraineeStatusModal = async function(moduleId) {
    if (!moduleTraineeStatusModal) return;

    const requestedModuleId = Number(moduleId || 0);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const selectedModule = currentModules.find((module) => Number(module.module_id) === requestedModuleId);

    if (!requestedModuleId) {
        Swal.fire('Missing Input', 'Module ID is required.', 'warning');
        return;
    }

    if (!user?.user_id) {
        Swal.fire('Session Error', 'User session is missing. Please refresh the page and try again.', 'error');
        return;
    }

    showModuleTraineeStatusLoading(selectedModule?.module_title || 'Trainee Quiz Status');
    moduleTraineeStatusModal.show();

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/modules.php?action=get-module-trainee-quiz-status`, {
            params: {
                module_id: requestedModuleId,
                user_id: user.user_id
            }
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to load trainee quiz summary.');
        }

        renderModuleTraineeStatusModal(response.data.data || {});
    } catch (error) {
        console.error('Error loading module trainee quiz status:', error);

        const emptyEl = document.getElementById('moduleTraineeStatusEmpty');
        const groupsEl = document.getElementById('moduleTraineeStatusGroups');
        const subtitleEl = document.getElementById('moduleTraineeStatusSubtitle');

        if (subtitleEl) subtitleEl.textContent = 'Unable to load trainee quiz summary.';
        if (emptyEl) {
            emptyEl.textContent = error.response?.data?.message || error.message || 'Unable to load trainee quiz summary.';
            emptyEl.classList.remove('hidden');
        }
        if (groupsEl) groupsEl.classList.add('hidden');
    }
}

// ============================================================================
// NEW: UNIFIED MODULE UPLOAD FUNCTIONALITY
// ============================================================================

let outcomesCounter = 0;
function getModuleWorkflowMeta(module = {}) {
    const status = module.module_status || 'published';
    if (status === 'draft') {
        return {
            status,
            label: 'Draft',
            icon: 'fas fa-pen',
            badgeClasses: 'border-amber-200 bg-amber-50 text-amber-700'
        };
    }

    return {
        status: 'published',
        label: 'Published',
        icon: 'fas fa-check-circle',
        badgeClasses: 'border-emerald-200 bg-emerald-50 text-emerald-700'
    };
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function refreshLearningOutcomeLabels() {
    document.querySelectorAll('#learningOutcomesContainer [id^="outcome-"]').forEach((outcomeEl, index) => {
        const heading = outcomeEl.querySelector('.outcome-heading');
        if (heading) heading.textContent = `Learning Outcome ${index + 1}`;

        const orderInput = outcomeEl.querySelector('.outcome-order');
        if (orderInput && !orderInput.value.trim()) {
            orderInput.value = String(index);
        }
    });
}

function resetUnifiedModuleUploadForm() {
    const form = document.getElementById('unifiedModuleUploadForm');
    if (form) form.reset();

    outcomesCounter = 0;

    const modal = document.getElementById('unifiedModuleUploadModal');
    if (modal) {
        delete modal.dataset.competencyType;
        delete modal.dataset.moduleId;
        delete modal.dataset.moduleStatus;
    }

    const outcomesContainer = document.getElementById('learningOutcomesContainer');
    if (outcomesContainer) outcomesContainer.innerHTML = '';

    const noMessage = document.getElementById('noOutcomesMessage');
    if (noMessage) noMessage.style.display = 'block';

    const titleEl = document.getElementById('unifiedModuleUploadTitle');
    if (titleEl) titleEl.textContent = 'Upload Complete Module';

    const subtitleEl = document.getElementById('unifiedModuleUploadSubtitle');
    if (subtitleEl) subtitleEl.textContent = 'Build the module, attach learning files, and save a draft any time.';

    const moduleIdEl = document.getElementById('uplModuleId');
    if (moduleIdEl) moduleIdEl.value = '';

    const moduleStatusEl = document.getElementById('uplModuleStatus');
    if (moduleStatusEl) moduleStatusEl.value = 'published';

    setUnifiedModuleActionState({ moduleId: '', status: 'published' });
}

function setUnifiedModuleActionState({ moduleId = '', status = 'published' } = {}) {
    const isExistingModule = Boolean(String(moduleId || '').trim());
    const isDraft = status === 'draft';

    const titleEl = document.getElementById('unifiedModuleUploadTitle');
    if (titleEl) {
        if (isExistingModule && isDraft) titleEl.textContent = 'Continue Draft Module';
        else if (isExistingModule) titleEl.textContent = 'Edit Complete Module';
        else titleEl.textContent = 'Upload Complete Module';
    }

    const subtitleEl = document.getElementById('unifiedModuleUploadSubtitle');
    if (subtitleEl) {
        if (isExistingModule && isDraft) subtitleEl.textContent = 'Update the draft, attach learning files, then publish when ready.';
        else if (isExistingModule) subtitleEl.textContent = 'Review and update the full module structure from one form.';
        else subtitleEl.textContent = 'Build the module, attach learning files, and save a draft any time.';
    }

    const draftBtn = document.getElementById('saveDraftModuleBtn');
    if (draftBtn) {
        const shouldShowDraft = !isExistingModule || isDraft;
        draftBtn.classList.toggle('hidden', !shouldShowDraft);
        draftBtn.innerHTML = `<i class="fas fa-save"></i> ${shouldShowDraft && isDraft ? 'Save Draft Changes' : 'Save Draft'}`;
        draftBtn.dataset.defaultLabel = draftBtn.innerHTML;
    }

    const publishBtn = document.getElementById('publishModuleBtn');
    if (publishBtn) {
        if (isExistingModule && isDraft) {
            publishBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Publish Module';
        } else if (isExistingModule) {
            publishBtn.innerHTML = '<i class="fas fa-check"></i> Save Changes';
        } else {
            publishBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Module';
        }
        publishBtn.dataset.defaultLabel = publishBtn.innerHTML;
    }
}

function renderOutcomeDocumentState(outcomeId, existingPath = '', uploadedFile = null) {
    const outcomeEl = document.getElementById(`outcome-${outcomeId}`);
    if (!outcomeEl) return;

    const preview = outcomeEl.querySelector('.outcome-file-preview');
    const emptyState = outcomeEl.querySelector('.outcome-file-empty');
    const fileNameEl = outcomeEl.querySelector('.outcome-file-name');
    const fileMetaEl = outcomeEl.querySelector('.outcome-file-meta');
    const fileLinkEl = outcomeEl.querySelector('.outcome-file-link');
    const hiddenPathEl = outcomeEl.querySelector('.outcome-existing-file-path');

    const fileName = uploadedFile?.name || existingPath.split('/').pop() || '';
    const hasFile = Boolean(fileName);

    if (hiddenPathEl && !uploadedFile) {
        hiddenPathEl.value = existingPath || '';
    }

    if (preview) preview.classList.toggle('hidden', !hasFile);
    if (emptyState) emptyState.classList.toggle('hidden', hasFile);

    if (!hasFile) return;

    if (fileNameEl) fileNameEl.textContent = fileName;

    if (fileMetaEl) {
        fileMetaEl.textContent = uploadedFile
            ? `Selected locally: ${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB`
            : 'Saved in this module';
    }

    if (fileLinkEl) {
        if (uploadedFile) {
            fileLinkEl.classList.add('hidden');
            fileLinkEl.removeAttribute('href');
        } else if (existingPath) {
            fileLinkEl.href = LESSON_UPLOADS_URL + existingPath;
            fileLinkEl.classList.remove('hidden');
        } else {
            fileLinkEl.classList.add('hidden');
            fileLinkEl.removeAttribute('href');
        }
    }
}

function bindOutcomeDocumentInput(outcomeId) {
    const outcomeEl = document.getElementById(`outcome-${outcomeId}`);
    if (!outcomeEl) return;

    const fileInput = outcomeEl.querySelector('.outcome-material-file');
    if (!fileInput) return;

    fileInput.addEventListener('change', () => {
        const selectedFile = fileInput.files[0] || null;
        renderOutcomeDocumentState(
            outcomeId,
            selectedFile ? '' : (outcomeEl.querySelector('.outcome-existing-file-path')?.value || ''),
            selectedFile
        );
    });
}

function renderOutcomeResourceState(outcomeId, resourceUrl = '') {
    const outcomeEl = document.getElementById(`outcome-${outcomeId}`);
    if (!outcomeEl) return;

    const inputEl = outcomeEl.querySelector('.outcome-resource-url');
    const preview = outcomeEl.querySelector('.outcome-resource-preview');
    const emptyState = outcomeEl.querySelector('.outcome-resource-empty');
    const titleEl = outcomeEl.querySelector('.outcome-resource-title');
    const metaEl = outcomeEl.querySelector('.outcome-resource-meta');
    const linkEl = outcomeEl.querySelector('.outcome-resource-link');
    const normalizedUrl = normalizeLessonResourceUrlInput(resourceUrl || inputEl?.value || '');
    const hasResource = Boolean(normalizedUrl);

    if (preview) preview.classList.toggle('hidden', !hasResource);
    if (emptyState) emptyState.classList.toggle('hidden', hasResource);

    if (!hasResource) {
        if (linkEl) {
            linkEl.classList.add('hidden');
            linkEl.removeAttribute('href');
        }
        return;
    }

    const resourceMeta = getLessonResourceDisplayMeta(normalizedUrl);
    if (titleEl) titleEl.textContent = resourceMeta.displayText;
    if (metaEl) metaEl.textContent = `${resourceMeta.label} from ${resourceMeta.helper}`;
    if (linkEl) {
        linkEl.href = resourceMeta.url;
        linkEl.textContent = resourceMeta.label === 'Video Lesson' ? 'Open video' : 'Open link';
        linkEl.classList.remove('hidden');
    }
}

function bindOutcomeResourceInput(outcomeId) {
    const outcomeEl = document.getElementById(`outcome-${outcomeId}`);
    if (!outcomeEl) return;

    const inputEl = outcomeEl.querySelector('.outcome-resource-url');
    if (!inputEl) return;

    inputEl.addEventListener('input', () => {
        renderOutcomeResourceState(outcomeId, inputEl.value);
    });

    inputEl.addEventListener('blur', () => {
        const normalizedUrl = normalizeLessonResourceUrlInput(inputEl.value);
        if (normalizedUrl) {
            inputEl.value = normalizedUrl;
        }
        renderOutcomeResourceState(outcomeId, inputEl.value);
    });
}

async function openUnifiedModuleUploadModal(competencyType, moduleId = null) {
    const modal = document.getElementById('unifiedModuleUploadModal');
    if (!modal || !unifiedModuleUploadModal) return;

    resetUnifiedModuleUploadForm();
    modal.dataset.competencyType = competencyType;
    if (moduleId) modal.dataset.moduleId = String(moduleId);

    if (moduleId) {
        try {
            const response = await axios.get(`${API_BASE_URL}/role/trainer/modules.php?action=get-module-structure&module_id=${moduleId}`);
            if (!response.data.success || !response.data.data) {
                Swal.fire('Error', response.data.message || 'Failed to load module details.', 'error');
                return;
            }

            populateUnifiedModuleUploadForm(response.data.data, competencyType);
        } catch (error) {
            console.error('Error loading module structure:', error);
            Swal.fire('Error', 'Failed to load the module for editing.', 'error');
            return;
        }
    } else {
        setUnifiedModuleActionState({ moduleId: '', status: 'published' });
        addLearningOutcomeRow();
    }

    unifiedModuleUploadModal.show();
}

function populateUnifiedModuleUploadForm(moduleData, competencyType) {
    const modal = document.getElementById('unifiedModuleUploadModal');
    if (!modal) return;

    modal.dataset.competencyType = competencyType || moduleData.competency_type || currentCompetencyType;
    modal.dataset.moduleId = String(moduleData.module_id || '');
    modal.dataset.moduleStatus = moduleData.module_status || 'published';

    const moduleIdEl = document.getElementById('uplModuleId');
    if (moduleIdEl) moduleIdEl.value = moduleData.module_id || '';

    const moduleStatusEl = document.getElementById('uplModuleStatus');
    if (moduleStatusEl) moduleStatusEl.value = moduleData.module_status || 'published';

    document.getElementById('uplModuleTitle').value = moduleData.module_title || '';
    document.getElementById('uplUnitCode').value = moduleData.unit_code || '';
    document.getElementById('uplModuleDescription').value = moduleData.module_description || '';
    document.getElementById('uplModuleOrder').value = moduleData.module_order || 0;

    const outcomes = Array.isArray(moduleData.learning_outcomes) ? moduleData.learning_outcomes : [];
    outcomes.forEach(outcome => addLearningOutcomeRow(outcome));

    if (!outcomes.length) {
        addLearningOutcomeRow();
    }

    setUnifiedModuleActionState({
        moduleId: moduleData.module_id || '',
        status: moduleData.module_status || 'published'
    });
}

function addLearningOutcomeRow(outcomeData = null) {
    const container = document.getElementById('learningOutcomesContainer');
    const noMessage = document.getElementById('noOutcomesMessage');

    if (!container) return;
    if (noMessage) noMessage.style.display = 'none';

    const outcomeId = outcomesCounter++;
    const existingFilePath = outcomeData?.lesson_file_path || '';
    const existingResourceUrl = outcomeData?.lesson_resource_url || '';
    const supportsTaskSheets = competencyTypeSupportsTaskSheets(
        document.getElementById('unifiedModuleUploadModal')?.dataset.competencyType || currentCompetencyType
    );
    const taskTabHtml = supportsTaskSheets
        ? `
                    <button type="button" role="tab" aria-selected="false" class="outcome-tab border-b-2 border-transparent px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900" data-tab="tasks-${outcomeId}">
                        <i class="fas fa-tasks mr-1"></i> Task Sheets
                    </button>
        `
        : '';
    const taskPaneHtml = supportsTaskSheets
        ? `
            <div class="outcome-tab-content mb-4 hidden rounded-md bg-slate-50 p-3" id="tasks-${outcomeId}" data-tab-pane="tasks">
                <div class="mb-3 flex items-center justify-between">
                    <h6 class="text-xs font-bold text-slate-900">Task Sheets</h6>
                    <button type="button" onclick="addTaskSheet(${outcomeId})" class="text-xs font-semibold text-blue-600 hover:text-blue-700">+ Add Task</button>
                </div>
                <div class="outcome-task-items space-y-2"></div>
            </div>
        `
        : '';

    const outcomeHtml = `
        <div class="rounded-lg border border-slate-300 bg-white p-4" id="outcome-${outcomeId}">
            <input type="hidden" class="outcome-lesson-id" value="${outcomeData?.lesson_id || ''}">
            <div class="mb-4 flex items-center justify-between">
                <h6 class="outcome-heading text-sm font-bold text-slate-900">Learning Outcome ${container.children.length + 1}</h6>
                <button type="button" onclick="removeLearningOutcome(${outcomeId})" class="rounded-md p-1 text-red-600 hover:bg-red-50">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>

            <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                    <label class="mb-1.5 block text-xs font-semibold text-slate-700">Outcome Title <span class="text-red-500">*</span></label>
                    <input type="text" class="outcome-title w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="e.g., Introduction to Welding Safety" required value="${escapeHtml(outcomeData?.lesson_title || outcomeData?.title || '')}">
                </div>
                <div>
                    <label class="mb-1.5 block text-xs font-semibold text-slate-700">Order</label>
                    <input type="number" class="outcome-order w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value="${outcomeData?.outcome_order ?? container.children.length}" min="0">
                </div>
            </div>

            <div class="mb-4">
                <label class="mb-1.5 block text-xs font-semibold text-slate-700">Outcome Description</label>
                <textarea class="outcome-description w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" rows="2" placeholder="Describe what learners will achieve...">${escapeHtml(outcomeData?.lesson_description || outcomeData?.description || '')}</textarea>
            </div>

            <div class="mb-4 border-b border-slate-200">
                <div class="flex gap-2" role="tablist">
                    <button type="button" role="tab" aria-selected="true" class="outcome-tab border-b-2 border-blue-600 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700" data-tab="content-${outcomeId}">
                        <i class="fas fa-book-open mr-1"></i> Content
                    </button>
                    <button type="button" role="tab" aria-selected="false" class="outcome-tab border-b-2 border-transparent px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900" data-tab="quiz-${outcomeId}">
                        <i class="fas fa-question-circle mr-1"></i> Quiz
                    </button>
                    ${taskTabHtml}
                </div>
            </div>

            <div class="outcome-tab-content mb-4 rounded-md bg-slate-50 p-3" id="content-${outcomeId}" data-tab-pane="content">
                <div class="mb-3 rounded-lg border border-dashed border-blue-200 bg-white p-3">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h6 class="text-xs font-bold text-slate-900">Learning Materials</h6>
                            <p class="mt-1 text-xs text-slate-500">Attach one PDF or Word document and/or paste a video or lesson link for this outcome, then add optional rich-text notes below.</p>
                        </div>
                        <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                            <i class="fas fa-paperclip"></i> Choose File
                            <input type="file" class="outcome-material-file hidden" accept=".pdf,.doc,.docx">
                        </label>
                    </div>
                    <input type="hidden" class="outcome-existing-file-path" value="${escapeHtml(existingFilePath)}">
                    <div class="outcome-file-preview ${existingFilePath ? '' : 'hidden'} mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="min-w-0">
                                <p class="outcome-file-name truncate text-sm font-semibold text-slate-800"></p>
                                <p class="outcome-file-meta text-xs text-slate-500"></p>
                            </div>
                            <a href="#" target="_blank" class="outcome-file-link hidden text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline">Open file</a>
                        </div>
                    </div>
                    <p class="outcome-file-empty ${existingFilePath ? 'hidden' : ''} mt-3 text-xs text-slate-500">No PDF or DOC file attached yet.</p>

                    <div class="mt-3 border-t border-dashed border-slate-200 pt-3">
                        <label class="mb-1.5 block text-xs font-semibold text-slate-700">Video or Lesson Link</label>
                        <input type="url" class="outcome-resource-url w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="https://www.youtube.com/watch?v=..." value="${escapeHtml(existingResourceUrl)}">
                        <div class="outcome-resource-preview ${existingResourceUrl ? '' : 'hidden'} mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <div class="min-w-0">
                                    <p class="outcome-resource-title truncate text-sm font-semibold text-slate-800"></p>
                                    <p class="outcome-resource-meta text-xs text-slate-500"></p>
                                </div>
                                <a href="#" target="_blank" rel="noopener" class="outcome-resource-link hidden text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline">Open link</a>
                            </div>
                        </div>
                        <p class="outcome-resource-empty ${existingResourceUrl ? 'hidden' : ''} mt-3 text-xs text-slate-500">No video or external lesson link added yet.</p>
                    </div>
                </div>

                <div class="mb-3 flex items-center justify-between">
                    <h6 class="text-xs font-bold text-slate-900">Rich Text Notes</h6>
                    <button type="button" onclick="addContentItem(${outcomeId})" class="text-xs font-semibold text-blue-600 hover:text-blue-700">+ Add Content</button>
                </div>
                <div class="outcome-content-items space-y-2"></div>
            </div>

            <div class="outcome-tab-content mb-4 hidden rounded-md bg-slate-50 p-3" id="quiz-${outcomeId}" data-tab-pane="quiz">
                <div class="mb-3 rounded-lg border border-blue-100 bg-white p-3">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h6 class="text-xs font-bold text-slate-900">Premade Quiz Upload</h6>
                            <p class="mt-1 text-xs text-slate-500">Use the CSV template for your premade quiz and answer key. For <code>true_false</code>, set <code>option_1</code> to <code>TRUE</code>, <code>option_2</code> to <code>FALSE</code>, leave <code>option_3</code> and <code>option_4</code> blank, and set <code>correct_answer</code> to <code>TRUE</code> or <code>FALSE</code>. Multiple choice rows can still use 1, A, or the exact option text.</p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" onclick="downloadQuizTemplate()" class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                                <i class="fas fa-file-arrow-down"></i> Download Template
                            </button>
                            <button type="button" onclick="document.querySelector('#outcome-${outcomeId} .outcome-quiz-template-input').click()" class="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                                <i class="fas fa-file-upload"></i> Import Premade Quiz
                            </button>
                        </div>
                    </div>
                    <input type="file" class="outcome-quiz-template-input hidden" accept=".csv,text/csv" onchange="handleOutcomeQuizTemplateSelected(${outcomeId}, this)">
                </div>
                <div class="mb-3 flex items-center justify-between">
                    <h6 class="text-xs font-bold text-slate-900">Quiz Questions</h6>
                    <button type="button" onclick="addQuizQuestion(${outcomeId})" class="text-xs font-semibold text-blue-600 hover:text-blue-700">+ Add Question</button>
                </div>
                <div class="outcome-quiz-items space-y-3"></div>
            </div>

            ${taskPaneHtml}
        </div>
    `;

    container.insertAdjacentHTML('beforeend', outcomeHtml);

    document.querySelectorAll(`#outcome-${outcomeId} .outcome-tab`).forEach(btn => {
        btn.addEventListener('click', function() {
            switchOutcomeTab(outcomeId, this.getAttribute('data-tab'));
        });
    });

    bindOutcomeDocumentInput(outcomeId);
    bindOutcomeResourceInput(outcomeId);
    renderOutcomeDocumentState(outcomeId, existingFilePath);
    renderOutcomeResourceState(outcomeId, existingResourceUrl);

    const contents = Array.isArray(outcomeData?.contents) ? outcomeData.contents : [];
    contents.forEach(content => addContentItem(outcomeId, content));

    const quizItems = Array.isArray(outcomeData?.quiz) ? outcomeData.quiz : [];
    quizItems.forEach(question => addQuizQuestion(outcomeId, question));

    if (supportsTaskSheets) {
        const taskSheets = Array.isArray(outcomeData?.task_sheets) ? outcomeData.task_sheets : [];
        taskSheets.forEach(task => addTaskSheet(outcomeId, task));
    }

    refreshLearningOutcomeLabels();
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
function addContentItem(outcomeId, contentData = null) {
    const container = document.querySelector(`#outcome-${outcomeId} .outcome-content-items`);
    if (!container) return;

    const itemId = nextRuntimeId();
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
                <input type="text" class="content-title w-full text-xs px-2 py-1 border border-slate-200 rounded" placeholder="e.g., Welding Tools Overview" value="${escapeHtml(contentData?.title || '')}">
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

    if (editor && contentData) {
        editor.innerHTML = contentData.content || contentData.text || '';
    }

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
function normalizeOutcomeQuizQuestionData(questionData = null) {
    const questionText = String(questionData?.text ?? questionData?.question_text ?? '').trim();
    const questionType = String(questionData?.type ?? questionData?.question_type ?? 'multiple_choice').trim() === 'true_false'
        ? 'true_false'
        : 'multiple_choice';

    let options = Array.isArray(questionData?.options)
        ? questionData.options.map(option => ({
            text: String(option?.text ?? option?.option_text ?? '').trim(),
            is_correct: option?.is_correct == 1 || option?.is_correct === true
        })).filter(option => option.text !== '')
        : [];

    if (questionType === 'true_false') {
        const normalizedCorrect = options.find(option => option.is_correct)?.text?.trim().toLowerCase() || '';
        return {
            text: questionText,
            type: questionType,
            options: [
                { text: 'TRUE', is_correct: normalizedCorrect === 'true' },
                { text: 'FALSE', is_correct: normalizedCorrect === 'false' }
            ]
        };
    }

    return {
        text: questionText,
        type: questionType,
        options
    };
}

function renderOutcomeTrueFalseOptions(questionEl, questionId, options = []) {
    const optionsContainer = questionEl.querySelector('.quiz-options');
    if (!optionsContainer) return;

    const normalizedCorrect = options.find(option => option.is_correct)?.text?.trim().toLowerCase() || '';
    optionsContainer.innerHTML = '';
    addQuizOption(null, questionId, { text: 'TRUE', is_correct: normalizedCorrect === 'true' });
    addQuizOption(null, questionId, { text: 'FALSE', is_correct: normalizedCorrect === 'false' });
}

window.toggleOutcomeQuizOptions = function(select, outcomeId, questionId) {
    const questionEl = select.closest('.quiz-question');
    if (!questionEl) return;

    const addButton = questionEl.querySelector('.add-outcome-option-btn');
    if (select.value === 'true_false') {
        if (addButton) {
            addButton.classList.add('hidden');
            addButton.style.display = 'none';
        }
        renderOutcomeTrueFalseOptions(questionEl, questionId);
    } else {
        if (addButton) {
            addButton.classList.remove('hidden');
            addButton.style.display = '';
        }
        const optionsContainer = questionEl.querySelector('.quiz-options');
        if (optionsContainer && optionsContainer.children.length < 2) {
            optionsContainer.innerHTML = '';
            addQuizOption(outcomeId, questionId);
            addQuizOption(outcomeId, questionId);
        }
    }
}

function addQuizQuestion(outcomeId, questionData = null) {
    const container = document.querySelector(`#outcome-${outcomeId} .outcome-quiz-items`);
    if (!container) return;

    const questionId = nextRuntimeId();
    const normalized = normalizeOutcomeQuizQuestionData(questionData);
    const html = `
        <div class="quiz-question bg-white p-3 rounded-md border border-slate-200 space-y-2" data-question-id="${questionId}">
            <div class="flex items-start justify-between">
                <input type="text" class="quiz-question-text flex-1 text-xs px-2 py-1 border border-slate-200 rounded" placeholder="Enter question text..." value="${escapeHtml(normalized.text)}">
                <button type="button" onclick="removeQuizQuestion(${outcomeId}, ${questionId})" class="ml-2 text-xs text-red-600 hover:text-red-700 font-semibold">Remove</button>
            </div>
            <select class="quiz-type w-full text-xs px-2 py-1 border border-slate-200 rounded" onchange="toggleOutcomeQuizOptions(this, ${outcomeId}, ${questionId})">
                <option value="multiple_choice" ${normalized.type === 'multiple_choice' ? 'selected' : ''}>Multiple Choice</option>
                <option value="true_false" ${normalized.type === 'true_false' ? 'selected' : ''}>True / False</option>
            </select>
            <div class="quiz-options space-y-1"></div>
            <button type="button" onclick="addQuizOption(${outcomeId}, ${questionId})" class="add-outcome-option-btn text-xs text-blue-600 hover:text-blue-700 font-semibold ${normalized.type === 'true_false' ? 'hidden' : ''}">+ Add Option</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    const insertedQuestion = container.querySelector(`.quiz-question[data-question-id="${questionId}"]`);

    if (normalized.type === 'true_false') {
        const addButton = insertedQuestion?.querySelector('.add-outcome-option-btn');
        if (addButton) addButton.style.display = 'none';
        renderOutcomeTrueFalseOptions(insertedQuestion, questionId, normalized.options);
    } else if (Array.isArray(normalized.options) && normalized.options.length) {
        normalized.options.forEach(option => addQuizOption(outcomeId, questionId, option));
    } else {
        addQuizOption(outcomeId, questionId);
    }
}

/**
 * Add an option to a quiz question
 */
function addQuizOption(outcomeId, questionId, optionData = null) {
    const optionsContainer = document.querySelector(`.quiz-question[data-question-id="${questionId}"] .quiz-options`);
    if (!optionsContainer) return;

    const optionId = nextRuntimeId();
    const isCorrect = optionData?.is_correct === true || Number(optionData?.is_correct) === 1;
    const html = `
        <div class="quiz-option flex gap-2 items-center" data-option-id="${optionId}">
            <input type="text" class="option-text flex-1 text-xs px-2 py-1 border border-slate-200 rounded" placeholder="Option text" value="${escapeHtml(optionData?.text || optionData?.option_text || '')}">
            <label class="flex items-center gap-1 text-xs">
                <input type="checkbox" class="option-correct" style="width: 14px; height: 14px;" ${isCorrect ? 'checked' : ''}>
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
function addTaskSheet(outcomeId, taskData = null) {
    const container = document.querySelector(`#outcome-${outcomeId} .outcome-task-items`);
    if (!container) return;

    const taskId = nextRuntimeId();
    const html = `
        <div class="task-item rounded-lg border border-slate-200 bg-white p-3" data-task-id="${taskId}">
            <div class="mb-3">
                <label class="mb-1.5 block text-xs font-semibold text-slate-700">Title</label>
                <input type="text" class="task-title w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="e.g., Information Sheet 1.1-1" value="${escapeHtml(taskData?.title || '')}">
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
                ${taskData?.content ? taskData.content : '<p data-editor-placeholder class="text-xs text-slate-400">Start writing task sheet content here...</p>'}
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
        refreshLearningOutcomeLabels();
    }
}

function collectOutcomeContents(outcomeEl) {
    return Array.from(outcomeEl.querySelectorAll('.content-item')).map((item, idx) => {
        const contentTitle = item.querySelector('.content-title')?.value.trim() || '';
        const editorHTML = item.querySelector('.content-editor')?.innerHTML.trim() || '';
        if (!contentTitle && !editorHTML) return null;

        return {
            title: contentTitle,
            text: editorHTML,
            display_order: idx
        };
    }).filter(Boolean);
}

function collectOutcomeQuiz(outcomeEl) {
    return Array.from(outcomeEl.querySelectorAll('.quiz-question')).map(questionEl => {
        const questionText = questionEl.querySelector('.quiz-question-text')?.value.trim() || '';
        const questionType = questionEl.querySelector('.quiz-type')?.value || 'multiple_choice';
        const options = Array.from(questionEl.querySelectorAll('.quiz-option')).map(optionEl => {
            const optionText = optionEl.querySelector('.option-text')?.value.trim() || '';
            if (!optionText) return null;
            return {
                text: optionText,
                is_correct: Boolean(optionEl.querySelector('.option-correct')?.checked)
            };
        }).filter(Boolean);

        if (!questionText || !options.length) return null;
        return { text: questionText, type: questionType, options };
    }).filter(Boolean);
}

function collectOutcomeTaskSheets(outcomeEl) {
    return Array.from(outcomeEl.querySelectorAll('.task-item')).map(taskEl => {
        const taskTitle = taskEl.querySelector('.task-title')?.value.trim() || '';
        const taskContent = getSerializedEditableContent(taskEl.querySelector('.task-body-editor'));
        if (!taskTitle && !taskContent) return null;
        return { title: taskTitle, content: taskContent };
    }).filter(Boolean);
}

function setUnifiedModuleButtonsBusy(isBusy, status = 'published') {
    const publishBtn = document.getElementById('publishModuleBtn');
    const draftBtn = document.getElementById('saveDraftModuleBtn');

    if (publishBtn) {
        if (!publishBtn.dataset.defaultLabel) publishBtn.dataset.defaultLabel = publishBtn.innerHTML;
        publishBtn.disabled = isBusy;
        if (isBusy && status === 'published') publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        if (!isBusy) publishBtn.innerHTML = publishBtn.dataset.defaultLabel;
    }

    if (draftBtn) {
        if (!draftBtn.dataset.defaultLabel) draftBtn.dataset.defaultLabel = draftBtn.innerHTML;
        draftBtn.disabled = isBusy;
        if (isBusy && status === 'draft') draftBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        if (!isBusy) draftBtn.innerHTML = draftBtn.dataset.defaultLabel;
    }
}

async function uploadCompleteModule(targetStatus = 'published') {
    const modal = document.getElementById('unifiedModuleUploadModal');
    if (!modal) return;

    const competencyType = modal.dataset.competencyType || currentCompetencyType;
    const supportsTaskSheets = competencyTypeSupportsTaskSheets(competencyType);
    const qualificationId = parseInt(document.getElementById('qualificationSelect')?.value || '0', 10) || 0;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const trainer = JSON.parse(localStorage.getItem('trainer') || '{}');
    const resolvedTrainerId = parseInt(trainerId || trainer.trainer_id || user.trainer_id || 0, 10) || 0;
    const resolvedUserId = parseInt(user.user_id || 0, 10) || 0;

    const moduleId = document.getElementById('uplModuleId')?.value.trim() || '';
    const moduleTitle = document.getElementById('uplModuleTitle')?.value.trim() || '';
    const unitCode = document.getElementById('uplUnitCode')?.value.trim() || '';
    const moduleDescription = document.getElementById('uplModuleDescription')?.value.trim() || '';
    const moduleOrder = parseInt(document.getElementById('uplModuleOrder')?.value || '0', 10) || 0;

    if (!qualificationId || !moduleTitle) {
        Swal.fire('Validation Error', 'Module title and qualification are required.', 'error');
        return;
    }

    if (!resolvedTrainerId) {
        Swal.fire('Validation Error', 'Trainer session is missing. Please refresh the page and try again.', 'error');
        return;
    }

    const outcomeElements = Array.from(document.querySelectorAll('#learningOutcomesContainer [id^="outcome-"]'));
    const learningOutcomes = [];
    const formData = new FormData();

    for (const [index, outcomeEl] of outcomeElements.entries()) {
        const title = outcomeEl.querySelector('.outcome-title')?.value.trim() || '';
        const description = outcomeEl.querySelector('.outcome-description')?.value.trim() || '';
        const order = parseInt(outcomeEl.querySelector('.outcome-order')?.value || `${index}`, 10) || 0;
        const lessonId = outcomeEl.querySelector('.outcome-lesson-id')?.value.trim() || '';
        const existingFilePath = outcomeEl.querySelector('.outcome-existing-file-path')?.value.trim() || '';
        const selectedFile = outcomeEl.querySelector('.outcome-material-file')?.files?.[0] || null;
        const lessonResourceUrl = outcomeEl.querySelector('.outcome-resource-url')?.value.trim() || '';

        const hasRichContent = outcomeEl.querySelectorAll('.content-item').length > 0;
        const hasQuizContent = outcomeEl.querySelectorAll('.quiz-question').length > 0;
        const hasTaskContent = supportsTaskSheets && outcomeEl.querySelectorAll('.task-item').length > 0;
        const hasAnything = Boolean(title || description || selectedFile || existingFilePath || lessonResourceUrl || hasRichContent || hasQuizContent || hasTaskContent);

        if (!hasAnything) continue;

        if (!title) {
            Swal.fire('Validation Error', 'Each saved learning outcome needs a title.', 'error');
            return;
        }

        const uploadField = `learning_material_file_${index}`;
        if (selectedFile) formData.append(uploadField, selectedFile);

        learningOutcomes.push({
            lesson_id: lessonId || null,
            title,
            description,
            outcome_order: order,
            is_required: 1,
            quiz_instructions: '',
            task_instructions: '',
            contents: collectOutcomeContents(outcomeEl),
            quiz: collectOutcomeQuiz(outcomeEl),
            task_sheets: supportsTaskSheets ? collectOutcomeTaskSheets(outcomeEl) : [],
            upload_field: uploadField,
            existing_file_path: existingFilePath,
            lesson_resource_url: lessonResourceUrl
        });
    }

    if (targetStatus === 'published' && learningOutcomes.length === 0) {
        Swal.fire('Validation Error', 'Add at least one learning outcome before publishing the module.', 'error');
        return;
    }

    formData.append('module_id', moduleId);
    formData.append('module_title', moduleTitle);
    formData.append('unit_code', unitCode);
    formData.append('module_description', moduleDescription);
    formData.append('module_order', String(moduleOrder));
    formData.append('competency_type', competencyType);
    formData.append('qualification_id', String(qualificationId));
    formData.append('trainer_id', String(resolvedTrainerId));
    formData.append('user_id', String(resolvedUserId));
    formData.append('module_status', targetStatus);
    formData.append('learning_outcomes', JSON.stringify(learningOutcomes));

    setUnifiedModuleButtonsBusy(true, targetStatus);

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainer/modules.php?action=upload-complete-module`, formData);

        if (!response.data.success) {
            Swal.fire('Error', response.data.message || 'Failed to save the module.', 'error');
            return;
        }

        const successMessage = targetStatus === 'draft'
            ? 'Draft saved successfully. You can reopen it any time from the module list.'
            : (moduleId ? 'Module updated successfully.' : 'Module uploaded successfully.');

        await Swal.fire('Success', successMessage, 'success');

        if (unifiedModuleUploadModal) unifiedModuleUploadModal.hide();
        await loadDataForTab(currentCompetencyType);
    } catch (error) {
        console.error('Upload error:', error);
        Swal.fire('Error', 'Failed to save module: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
        setUnifiedModuleButtonsBusy(false, targetStatus);
    }
}
