const API_URL = '/Hohoo-ville/api/role/admin/system_settings.php';
const EMAIL_API_URL = '/Hohoo-ville/api/role/admin/email_templates.php';
const ARCHIVAL_API_URL = '/Hohoo-ville/api/role/admin/user_archival.php';

document.addEventListener('DOMContentLoaded', async () => {
    await ensureSwal();
    initUserDropdown();
    initLogout();
    initTabs();
    initModalDismissers();

    loadHolidays();
    loadEmailTemplates();
    loadCertificateStats();
    loadArchivalData();
});

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

function initUserDropdown() {
    const button = document.getElementById('userDropdown');
    const menu = document.getElementById('userDropdownMenu');
    if (!button || !menu) return;

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#userDropdown') && !event.target.closest('#userDropdownMenu')) {
            menu.classList.add('hidden');
        }
    });
}

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (typeof window.logout === 'function') {
            window.logout();
            return;
        }
        localStorage.clear();
        window.location.href = '/Hohoo-ville/frontend/login.html';
    });
}

function initTabs() {
    initTabGroup('main', '.tab-pane-main');
    initTabGroup('archival', '.tab-pane-archival');
}

function initTabGroup(groupName, paneSelector) {
    const buttons = Array.from(document.querySelectorAll(`[data-tab-group="${groupName}"]`));
    const panes = Array.from(document.querySelectorAll(paneSelector));
    if (!buttons.length || !panes.length) return;

    const activate = (button) => {
        buttons.forEach((btn) => setTabButtonState(btn, btn === button));
        const targetSelector = button.getAttribute('data-tab-target');
        panes.forEach((pane) => pane.classList.add('hidden'));
        const targetPane = targetSelector ? document.querySelector(targetSelector) : null;
        if (targetPane) targetPane.classList.remove('hidden');
    };

    buttons.forEach((button) => {
        button.addEventListener('click', () => activate(button));
    });

    const defaultButton = buttons.find((button) => button.classList.contains('active')) || buttons[0];
    activate(defaultButton);
}

function setTabButtonState(button, isActive) {
    button.classList.toggle('active', isActive);
    button.classList.toggle('bg-blue-600', isActive);
    button.classList.toggle('text-white', isActive);
    button.classList.toggle('border-blue-600', isActive);

    button.classList.toggle('border', !isActive);
    button.classList.toggle('border-slate-300', !isActive);
    button.classList.toggle('bg-white', !isActive);
    button.classList.toggle('text-slate-700', !isActive);
    button.classList.toggle('hover:bg-slate-50', !isActive);
}

function initModalDismissers() {
    document.querySelectorAll('[data-modal-hide]').forEach((button) => {
        button.addEventListener('click', () => {
            hideModal(button.getAttribute('data-modal-hide'));
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        ['holidayModal', 'emailTemplateModal'].forEach((id) => {
            const modal = document.getElementById(id);
            if (modal && !modal.classList.contains('hidden')) {
                hideModal(id);
            }
        });
    });
}

function showModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
}

function hideModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
}

function showLoadingRow(colspan, text = 'Loading...') {
    return `<tr><td colspan="${colspan}" class="px-4 py-6 text-center text-sm text-slate-500">${text}</td></tr>`;
}

function showErrorRow(colspan, text = 'Error loading data.') {
    return `<tr><td colspan="${colspan}" class="px-4 py-6 text-center text-sm text-rose-600">${text}</td></tr>`;
}

function showEmptyRow(colspan, text = 'No records found.') {
    return `<tr><td colspan="${colspan}" class="px-4 py-6 text-center text-sm text-slate-500">${text}</td></tr>`;
}

function roleBadge(role) {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'admin') return '<span class="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Admin</span>';
    if (normalized === 'trainer') return '<span class="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Trainer</span>';
    if (normalized === 'trainee') return '<span class="inline-flex rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">Trainee</span>';
    return `<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">${role || 'Unknown'}</span>`;
}

function holidayTypeBadge(type) {
    return `<span class="inline-flex rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold capitalize text-sky-700">${type || 'N/A'}</span>`;
}

function safeText(value) {
    if (value === null || value === undefined || value === '') return 'N/A';
    return String(value);
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

function showAlert(title, text, icon) {
    if (window.Swal) {
        Swal.fire({ title, text, icon });
        return;
    }
    alert(`${title}: ${text}`);
}

function showToast(text, icon = 'success') {
    if (window.Swal) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            timer: 2200,
            showConfirmButton: false,
            icon,
            title: text
        });
        return;
    }
    alert(text);
}

function openHolidayModal() {
    setValue('holidayName', '');
    setValue('holidayDate', '');
    setValue('holidayType', 'national');
    setValue('holidayDesc', '');
    showModal('holidayModal');
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

async function saveHoliday() {
    const name = document.getElementById('holidayName')?.value?.trim();
    const date = document.getElementById('holidayDate')?.value;
    const type = document.getElementById('holidayType')?.value || 'national';
    const desc = document.getElementById('holidayDesc')?.value?.trim() || '';

    if (!name || !date) {
        showAlert('Missing Fields', 'Please provide holiday name and date.', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'save-holiday');
    formData.append('holiday_name', name);
    formData.append('holiday_date', date);
    formData.append('holiday_type', type);
    formData.append('description', desc);

    try {
        const response = await axios.post(API_URL, formData);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to save holiday');
        }
        hideModal('holidayModal');
        loadHolidays();
        showToast('Holiday saved successfully.');
    } catch (error) {
        console.error('Error saving holiday:', error);
        showAlert('Error', error.message || 'Failed to save holiday.', 'error');
    }
}

async function loadHolidays() {
    const tbody = document.getElementById('holidaysBody');
    if (!tbody) return;
    tbody.innerHTML = showLoadingRow(5);

    try {
        const response = await axios.get(API_URL, { params: { action: 'get-holidays' } });
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to load holidays');
        }

        const holidays = Array.isArray(response.data.data) ? response.data.data : [];
        if (!holidays.length) {
            tbody.innerHTML = showEmptyRow(5, 'No holidays found.');
            return;
        }

        tbody.innerHTML = holidays.map((holiday) => `
            <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 text-sm text-slate-700">${formatDate(holiday.holiday_date)}</td>
                <td class="px-3 py-3 text-sm text-slate-900">${safeText(holiday.holiday_name)}</td>
                <td class="px-3 py-3 text-sm">${holidayTypeBadge(holiday.holiday_type)}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${safeText(holiday.description)}</td>
                <td class="px-3 py-3 text-sm">
                    <button type="button" class="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100" onclick="deleteHoliday(${holiday.holiday_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading holidays:', error);
        tbody.innerHTML = showErrorRow(5, error.message || 'Error loading holidays.');
    }
}

async function deleteHoliday(id) {
    const result = await Swal.fire({
        title: 'Delete Holiday?',
        text: 'Are you sure you want to delete this holiday?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it',
        confirmButtonColor: '#dc2626'
    });
    if (!result.isConfirmed) return;

    const formData = new FormData();
    formData.append('action', 'delete-holiday');
    formData.append('holiday_id', id);

    try {
        const response = await axios.post(API_URL, formData);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to delete holiday');
        }
        loadHolidays();
        showToast('Holiday deleted.');
    } catch (error) {
        console.error('Error deleting holiday:', error);
        showAlert('Error', error.message || 'Failed to delete holiday.', 'error');
    }
}

async function loadEmailTemplates() {
    const list = document.getElementById('templatesList');
    if (!list) return;
    list.innerHTML = '<div class="px-4 py-3 text-center text-sm text-slate-500">Loading templates...</div>';

    try {
        const response = await axios.get(`${EMAIL_API_URL}?action=list`);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to load templates');
        }

        const templates = Array.isArray(response.data.data) ? response.data.data : [];
        if (!templates.length) {
            list.innerHTML = '<div class="px-4 py-3 text-center text-sm text-slate-500">No templates found.</div>';
            return;
        }

        list.innerHTML = templates.map((t) => `
            <a href="#" class="block px-4 py-3 transition hover:bg-slate-50" onclick="event.preventDefault(); openTemplateModal(${t.template_id});">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="text-sm font-semibold text-blue-700"><i class="fas fa-envelope-open-text mr-2"></i>${safeText(t.template_name)}</p>
                        <p class="mt-1 text-sm text-slate-600">${safeText(t.subject)}</p>
                    </div>
                    <span class="text-xs text-slate-500">${t.updated_at ? new Date(t.updated_at).toLocaleDateString() : ''}</span>
                </div>
            </a>
        `).join('');
    } catch (error) {
        console.error('Error loading templates:', error);
        list.innerHTML = `<div class="px-4 py-3 text-center text-sm text-rose-600">${safeText(error.message)}</div>`;
    }
}

async function openTemplateModal(id) {
    try {
        const response = await axios.get(`${EMAIL_API_URL}?action=get&id=${id}`);
        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Failed to fetch template');
        }

        const t = response.data.data;
        setValue('templateId', t.template_id || '');
        setValue('templateName', t.template_name || '');
        setValue('templateSubject', t.subject || '');

        const decoder = document.createElement('textarea');
        decoder.innerHTML = t.body_html || '';
        setValue('templateBody', decoder.value);

        const vars = Array.isArray(t.variables) ? t.variables : [];
        const variableHtml = vars.map((v) => `<span class="mr-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{{${v}}}</span>`).join('');
        const templateVariables = document.getElementById('templateVariables');
        if (templateVariables) templateVariables.innerHTML = variableHtml || 'None';

        showModal('emailTemplateModal');
    } catch (error) {
        console.error('Error fetching template:', error);
        showAlert('Error', error.message || 'Failed to load template.', 'error');
    }
}

async function saveTemplate() {
    const payload = {
        template_id: document.getElementById('templateId')?.value || '',
        subject: document.getElementById('templateSubject')?.value || '',
        body_html: document.getElementById('templateBody')?.value || ''
    };

    try {
        const response = await axios.post(`${EMAIL_API_URL}?action=update`, payload);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to update template');
        }
        hideModal('emailTemplateModal');
        loadEmailTemplates();
        showToast('Template updated successfully.');
    } catch (error) {
        console.error('Error updating template:', error);
        showAlert('Error', error.message || 'Failed to update template.', 'error');
    }
}

async function loadEligibleTrainees() {
    const tbody = document.getElementById('eligibleBody');
    const card = document.getElementById('eligibleCard');
    if (!tbody || !card) return;

    card.classList.remove('hidden');
    tbody.innerHTML = showLoadingRow(4);

    try {
        const response = await axios.get(`${API_URL}?action=get-eligible-trainees`);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to load eligible trainees');
        }

        const trainees = Array.isArray(response.data.data) ? response.data.data : [];
        if (!trainees.length) {
            tbody.innerHTML = showEmptyRow(4, 'No eligible trainees found.');
            return;
        }

        tbody.innerHTML = trainees.map((t) => `
            <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 text-sm text-slate-700"><input type="checkbox" class="trainee-checkbox h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" value="${t.trainee_id}" data-course="${t.qualification_id}"></td>
                <td class="px-3 py-3 text-sm text-slate-900">${safeText(t.first_name)} ${safeText(t.last_name)}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${safeText(t.qualification_name)}</td>
                <td class="px-3 py-3 text-sm text-slate-700">${t.final_score ? Number(t.final_score).toFixed(2) : 'N/A'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading eligible trainees:', error);
        tbody.innerHTML = showErrorRow(4, error.message || 'Error loading eligible trainees.');
    }
}

function toggleAllCheckboxes(source) {
    document.querySelectorAll('.trainee-checkbox').forEach((cb) => {
        cb.checked = Boolean(source.checked);
    });
}

async function generateCertificates() {
    const selected = [];
    document.querySelectorAll('.trainee-checkbox:checked').forEach((cb) => {
        selected.push({
            trainee_id: cb.value,
            qualification_id: cb.getAttribute('data-course')
        });
    });

    if (!selected.length) {
        showAlert('No Selection', 'Please select at least one trainee.', 'warning');
        return;
    }

    const result = await Swal.fire({
        title: 'Generate Certificates?',
        text: `Generate certificates for ${selected.length} trainees?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Generate'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await axios.post(`${API_URL}?action=generate-certificates`, { trainees: selected });
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to generate certificates');
        }
        loadEligibleTrainees();
        loadCertificateStats();
        showToast('Certificates generated successfully.');
    } catch (error) {
        console.error('Error generating certificates:', error);
        showAlert('Error', error.message || 'Failed to generate certificates.', 'error');
    }
}

async function loadCertificateStats() {
    const container = document.getElementById('certificateStats');
    if (!container) return;

    try {
        const response = await axios.get(`${API_URL}?action=get-certificate-stats`);
        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Unable to load certificate stats');
        }
        const total = Number(response.data.data.total_issued || 0);
        container.innerHTML = `
            <p class="text-3xl font-bold text-slate-900">${total}</p>
            <p class="mt-1 text-sm text-slate-500">Total Certificates Issued</p>
        `;
    } catch (error) {
        console.error('Error loading certificate stats:', error);
        container.innerHTML = `<p class="text-sm text-rose-600">${safeText(error.message)}</p>`;
    }
}

async function loadArchivalData() {
    try {
        const statusRes = await axios.get(`${ARCHIVAL_API_URL}?action=get-archival-status`);
        if (statusRes.data.success && statusRes.data.data) {
            const data = statusRes.data.data;
            setText('archivedTraineesCount', data.archived_trainees ?? '-');
            setText('archivedTrainersCount', data.archived_trainers ?? '-');
            setText('inactiveUsersCount', data.inactive_users ?? '-');
        }
    } catch (error) {
        console.error('Error loading archival stats:', error);
    }

    await loadInactiveUsers();

    try {
        const archivedRes = await axios.get(`${ARCHIVAL_API_URL}?action=list-archived&type=both`);
        if (archivedRes.data.success && archivedRes.data.data) {
            renderArchivedTable('archivedTraineesBody', archivedRes.data.data.archived_trainees || [], 'trainee');
            renderArchivedTable('archivedTrainersBody', archivedRes.data.data.archived_trainers || [], 'trainer');
        }
    } catch (error) {
        console.error('Error loading archived users:', error);
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

async function loadInactiveUsers() {
    const tbody = document.getElementById('inactiveUsersBody');
    if (!tbody) return;
    tbody.innerHTML = showLoadingRow(5);

    try {
        const response = await axios.get('/Hohoo-ville/api/role/admin/user_management.php?action=list');
        if (!response.data.success || !Array.isArray(response.data.data)) {
            throw new Error(response.data.message || 'Failed to load users');
        }
        const users = response.data.data.filter((user) => user.status === 'inactive' && (!user.is_archived || Number(user.is_archived) === 0));
        renderInactiveUsersTable(users);
    } catch (error) {
        console.error('Error loading inactive users:', error);
        tbody.innerHTML = showErrorRow(5, error.message || 'Error loading inactive users.');
    }
}

function renderInactiveUsersTable(users) {
    const tbody = document.getElementById('inactiveUsersBody');
    if (!tbody) return;

    if (!users.length) {
        tbody.innerHTML = showEmptyRow(5, 'No inactive users found.');
        return;
    }

    tbody.innerHTML = users.map((user) => `
        <tr class="hover:bg-slate-50">
            <td class="px-3 py-3 text-sm font-semibold text-slate-900">${safeText(user.username)}</td>
            <td class="px-3 py-3 text-sm text-slate-700">${safeText(user.email)}</td>
            <td class="px-3 py-3 text-sm">${roleBadge(user.role_name)}</td>
            <td class="px-3 py-3 text-sm"><span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Inactive</span></td>
            <td class="px-3 py-3 text-sm">
                <button type="button" class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100" onclick="editUserFromSettings(${user.user_id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </td>
        </tr>
    `).join('');
}

async function reactivateUser(userId) {
    const result = await Swal.fire({
        title: 'Reactivate User?',
        text: 'Are you sure you want to reactivate this user?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Reactivate'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await axios.get(`/Hohoo-ville/api/role/admin/user_management.php?action=reactivate&id=${userId}`);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to reactivate user');
        }
        await loadArchivalData();
        showToast('User reactivated successfully.');
    } catch (error) {
        console.error('Error reactivating user:', error);
        showAlert('Error', error.message || 'Failed to reactivate user.', 'error');
    }
}

function renderArchivedTable(tbodyId, data, type) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (!Array.isArray(data) || !data.length) {
        tbody.innerHTML = showEmptyRow(5, 'No archived records found.');
        return;
    }

    tbody.innerHTML = data.map((item) => `
        <tr class="hover:bg-slate-50">
            <td class="px-3 py-3 text-sm font-semibold text-slate-900">${safeText(item.username)}</td>
            <td class="px-3 py-3 text-sm text-slate-700">${safeText(item.email)}</td>
            <td class="px-3 py-3 text-sm">${type === 'trainer' ? '<span class="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Trainer</span>' : '<span class="inline-flex rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">Trainee</span>'}</td>
            <td class="px-3 py-3 text-sm text-slate-700">${item.archived_at ? formatDate(item.archived_at) : 'N/A'}</td>
            <td class="px-3 py-3 text-sm">
                <button type="button" class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100" onclick="restoreUser(${item.user_id}, '${type}')">
                    <i class="fas fa-trash-restore"></i> Unarchive
                </button>
            </td>
        </tr>
    `).join('');
}

async function restoreUser(userId) {
    const result = await Swal.fire({
        title: 'Unarchive User?',
        text: 'Are you sure you want to unarchive this user?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Unarchive'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await axios.get(`/Hohoo-ville/api/role/admin/user_management.php?action=reactivate&id=${userId}`);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to unarchive user');
        }
        await loadArchivalData();
        showToast('User unarchived successfully.');
    } catch (error) {
        console.error('Error unarchiving user:', error);
        showAlert('Error', error.message || 'Failed to unarchive user.', 'error');
    }
}

function editUserFromSettings() {
    showAlert('Info', 'To edit this user, please go to User Management page.', 'info');
}

window.openHolidayModal = openHolidayModal;
window.saveHoliday = saveHoliday;
window.deleteHoliday = deleteHoliday;
window.openTemplateModal = openTemplateModal;
window.saveTemplate = saveTemplate;
window.loadEligibleTrainees = loadEligibleTrainees;
window.toggleAllCheckboxes = toggleAllCheckboxes;
window.generateCertificates = generateCertificates;
window.loadArchivalData = loadArchivalData;
window.restoreUser = restoreUser;
window.loadInactiveUsers = loadInactiveUsers;
window.reactivateUser = reactivateUser;
window.editUserFromSettings = editUserFromSettings;
