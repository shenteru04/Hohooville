const API_URL = '/Hohoo-ville/api/role/admin/system_settings.php';
const EMAIL_API_URL = '/Hohoo-ville/api/role/admin/email_templates.php';
const ARCHIVAL_API_URL = '/Hohoo-ville/api/role/admin/user_archival.php';

document.addEventListener('DOMContentLoaded', function() {
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.clear();
                window.location.href = '/hohoo-ville/frontend/login.html';
            });
        }
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    loadHolidays();
    loadEmailTemplates();
    loadCertificateStats();
    loadArchivalData();
    // Initialize other tabs if needed

    // Fix for overlapping tabs: Force hide other tabs when one is shown
    const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabEls.forEach(tabEl => {
        tabEl.addEventListener('show.bs.tab', function (event) {
            const targetSelector = event.target.getAttribute('data-bs-target');
            const targetPane = document.querySelector(targetSelector);
            
            // Find the parent tab-content to scope the cleanup
            const tabContent = targetPane.closest('.tab-content');
            if (tabContent) {
                tabContent.querySelectorAll('.tab-pane.active').forEach(pane => {
                    if (pane !== targetPane) pane.classList.remove('active', 'show');
                });
            }
        });
    });
});

// --- Holidays Functions ---

function openHolidayModal() {
    // Reset form fields
    document.getElementById('holidayName').value = '';
    document.getElementById('holidayDate').value = '';
    document.getElementById('holidayType').value = 'national';
    document.getElementById('holidayDesc').value = '';
    
    // Show modal using Bootstrap 5 API
    const modalEl = document.getElementById('holidayModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function saveHoliday() {
    const name = document.getElementById('holidayName').value;
    const date = document.getElementById('holidayDate').value;
    const type = document.getElementById('holidayType').value;
    const desc = document.getElementById('holidayDesc').value;

    if (!name || !date) {
        Swal.fire('Missing Fields', 'Please fill in the required fields (Name and Date).', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'save-holiday');
    formData.append('holiday_name', name);
    formData.append('holiday_date', date);
    formData.append('holiday_type', type);
    formData.append('description', desc);

    axios.post(API_URL, formData)
        .then(response => {
            if (response.data.success) {
                Swal.fire('Success', 'Holiday saved successfully!', 'success');
                
                // Close modal
                const modalEl = document.getElementById('holidayModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                
                // Reload table
                loadHolidays();
            } else {
                Swal.fire('Error', 'Error: ' + response.data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error saving holiday:', error);
            Swal.fire('Error', 'An error occurred while saving.', 'error');
        });
}

function loadHolidays() {
    const tbody = document.getElementById('holidaysBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

    axios.get(API_URL, { params: { action: 'get-holidays' } })
        .then(response => {
            if (response.data.success) {
                const holidays = response.data.data;
                tbody.innerHTML = '';
                
                if (holidays.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No holidays found.</td></tr>';
                    return;
                }

                holidays.forEach(holiday => {
                    const row = `
                        <tr>
                            <td>${formatDate(holiday.holiday_date)}</td>
                            <td>${holiday.holiday_name}</td>
                            <td><span class="badge bg-info text-dark">${holiday.holiday_type}</span></td>
                            <td>${holiday.description || '-'}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="deleteHoliday(${holiday.holiday_id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    tbody.innerHTML += row;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load data.</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error loading holidays:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading data.</td></tr>';
        });
}

async function deleteHoliday(id) {
    const result = await Swal.fire({
        title: 'Delete Holiday?',
        text: "Are you sure you want to delete this holiday?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;

    const formData = new FormData();
    formData.append('action', 'delete-holiday');
    formData.append('holiday_id', id);

    axios.post(API_URL, formData)
        .then(response => {
            if (response.data.success) {
                loadHolidays();
            } else {
                Swal.fire('Error', 'Error: ' + response.data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting holiday:', error);
        });
}

// Helper
function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// --- Email Templates Functions ---

function loadEmailTemplates() {
    const list = document.getElementById('templatesList');
    // Only show loading if empty to avoid flickering on reloads
    if (!list.children.length || list.children[0].textContent === 'Loading...') {
        list.innerHTML = '<div class="text-center p-3 text-muted">Loading templates...</div>';
    }

    axios.get(`${EMAIL_API_URL}?action=list`)
        .then(response => {
            if (response.data.success) {
                const templates = response.data.data;
                list.innerHTML = '';
                
                if (templates.length === 0) {
                    list.innerHTML = '<div class="text-center p-3 text-muted">No templates found.</div>';
                    return;
                }

                templates.forEach(t => {
                    const item = document.createElement('a');
                    item.href = '#';
                    item.className = 'list-group-item list-group-item-action';
                    item.onclick = (e) => { e.preventDefault(); openTemplateModal(t.template_id); };
                    item.innerHTML = `
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1 text-primary"><i class="fas fa-envelope-open-text me-2"></i>${t.template_name}</h6>
                            <small class="text-muted">Last updated: ${new Date(t.updated_at).toLocaleDateString()}</small>
                        </div>
                        <p class="mb-1 text-truncate text-secondary">${t.subject}</p>
                    `;
                    list.appendChild(item);
                });
            } else {
                list.innerHTML = `<div class="text-center p-3 text-danger">Error: ${response.data.message}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading templates:', error);
            list.innerHTML = '<div class="text-center p-3 text-danger">Failed to load templates.</div>';
        });
}

function openTemplateModal(id) {
    axios.get(`${EMAIL_API_URL}?action=get&id=${id}`)
        .then(response => {
            if (response.data.success) {
                const t = response.data.data;
                document.getElementById('templateId').value = t.template_id;
                document.getElementById('templateName').value = t.template_name;
                document.getElementById('templateSubject').value = t.subject;
                
                // Decode HTML entities to show raw HTML tags for editing
                const tempTextArea = document.createElement('textarea');
                tempTextArea.innerHTML = t.body_html || '';
                document.getElementById('templateBody').value = tempTextArea.value;
                
                // Format variables for display
                const vars = t.variables || [];
                const varHtml = vars.map(v => `<span class="badge bg-light text-dark border me-1">{{${v}}}</span>`).join(' ');
                document.getElementById('templateVariables').innerHTML = varHtml || 'None';

                const modal = new bootstrap.Modal(document.getElementById('emailTemplateModal'));
                modal.show();
            }
        })
        .catch(error => console.error('Error fetching template:', error));
}

function saveTemplate() {
    const id = document.getElementById('templateId').value;
    const subject = document.getElementById('templateSubject').value;
    const body = document.getElementById('templateBody').value;

    axios.post(`${EMAIL_API_URL}?action=update`, { template_id: id, subject: subject, body_html: body })
        .then(response => {
            if (response.data.success) {
                Swal.fire('Success', 'Template updated successfully', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('emailTemplateModal'));
                modal.hide();
                loadEmailTemplates();
            } else {
                Swal.fire('Error', 'Error: ' + response.data.message, 'error');
            }
        })
        .catch(error => Swal.fire('Error', 'Failed to update template', 'error'));
}

// --- Certificates Functions ---

function loadEligibleTrainees() {
    const tbody = document.getElementById('eligibleBody');
    const card = document.getElementById('eligibleCard');
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    card.style.display = 'block';

    axios.get(`${API_URL}?action=get-eligible-trainees`)
        .then(response => {
            if (response.data.success) {
                const trainees = response.data.data;
                tbody.innerHTML = '';
                
                if (trainees.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No eligible trainees found.</td></tr>';
                    return;
                }

                trainees.forEach(t => {
                    tbody.innerHTML += `
                        <tr>
                            <td><input type="checkbox" class="trainee-checkbox form-check-input" value="${t.trainee_id}" data-course="${t.qualification_id}"></td>
                            <td>${t.first_name} ${t.last_name}</td>
                            <td>${t.qualification_name}</td>
                            <td>${t.final_score ? parseFloat(t.final_score).toFixed(2) : 'N/A'}</td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${response.data.message}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('Error loading eligible trainees:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading data.</td></tr>';
        });
}

function toggleAllCheckboxes(source) {
    const checkboxes = document.querySelectorAll('.trainee-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

async function generateCertificates() {
    const selected = [];
    document.querySelectorAll('.trainee-checkbox:checked').forEach(cb => {
        selected.push({
            trainee_id: cb.value,
            qualification_id: cb.getAttribute('data-course')
        });
    });

    if (selected.length === 0) {
        Swal.fire('No Selection', 'Please select at least one trainee.', 'warning');
        return;
    }

    const result = await Swal.fire({
        title: 'Generate Certificates?',
        text: `Generate certificates for ${selected.length} trainees?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Generate'
    });
    if (!result.isConfirmed) return;

    axios.post(`${API_URL}?action=generate-certificates`, { trainees: selected })
        .then(response => {
            if (response.data.success) {
                Swal.fire('Success', 'Certificates generated successfully!', 'success');
                loadEligibleTrainees();
                loadCertificateStats();
            } else {
                Swal.fire('Error', 'Error: ' + response.data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error generating certificates:', error);
            Swal.fire('Error', 'An error occurred.', 'error');
        });
}

function loadCertificateStats() {
    axios.get(`${API_URL}?action=get-certificate-stats`)
        .then(response => {
            if (response.data.success) {
                const stats = response.data.data;
                const container = document.getElementById('certificateStats');
                if (container) {
                    container.innerHTML = `<h3 class="mb-0">${stats.total_issued}</h3><small class="text-muted">Total Certificates Issued</small>`;
                }
            }
        })
        .catch(console.error);
}

// Expose functions to global scope for HTML onclick attributes
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
window.editUserFromSettings = function(userId) {
    Swal.fire('Info', 'To edit this user, please go to User Management page. Inactive users can be edited there.', 'info');
    // Optionally redirect to user management
    // window.location.href = 'user_management.html';
};

// --- User Archival Functions ---

function loadArchivalData() {
    // Fetch stats
    axios.get(`${ARCHIVAL_API_URL}?action=get-archival-status`)
        .then(res => {
            if(res.data.success) {
                document.getElementById('archivedTraineesCount').innerText = res.data.data.archived_trainees;
                document.getElementById('archivedTrainersCount').innerText = res.data.data.archived_trainers;
                document.getElementById('inactiveUsersCount').innerText = res.data.data.inactive_users;
            }
        })
        .catch(console.error);

    // Fetch inactive users from user management system
    loadInactiveUsers();

    // Fetch lists
    axios.get(`${ARCHIVAL_API_URL}?action=list-archived&type=both`)
        .then(res => {
            if(res.data.success) {
                renderArchivedTable('archivedTraineesBody', res.data.data.archived_trainees, 'trainee');
                renderArchivedTable('archivedTrainersBody', res.data.data.archived_trainers, 'trainer');
            }
        })
        .catch(console.error);
}

function loadInactiveUsers() {
    const tbody = document.getElementById('inactiveUsersBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    axios.get('/Hohoo-ville/api/role/admin/user_management.php?action=list')
        .then(res => {
            if(res.data.success) {
                // Only show inactive users that are NOT archived (is_archived = 0)
                const users = res.data.data.filter(u => u.status === 'inactive' && (!u.is_archived || u.is_archived == 0));
                renderInactiveUsersTable(users);
            }
        })
        .catch(err => {
            console.error('Error loading inactive users:', err);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading data</td></tr>';
        });
}

function renderInactiveUsersTable(users) {
    const tbody = document.getElementById('inactiveUsersBody');
    tbody.innerHTML = '';
    
    if(users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No inactive users found. (Archived users appear in Archived section)</td></tr>';
        return;
    }
    
    let rows = '';
    users.forEach(user => {
        const roleClass = user.role_name === 'admin' ? 'badge-danger' : 
                         user.role_name === 'trainer' ? 'badge-warning' : 
                         user.role_name === 'trainee' ? 'badge-info' : 'badge-secondary';
        
        rows += `
            <tr>
                <td><strong>${user.username}</strong></td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="badge ${roleClass}">${user.role_name || 'Unknown'}</span></td>
                <td><span class="badge bg-secondary">Inactive</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editUserFromSettings(${user.user_id})" title="Edit this user">
                        <i class="fas fa-edit me-1"></i> Edit
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = rows;
}

async function reactivateUser(userId) {
    const result = await Swal.fire({
        title: 'Reactivate User?',
        text: "Are you sure you want to reactivate this user?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Reactivate'
    });
    if (!result.isConfirmed) return;
    
    axios.get(`/Hohoo-ville/api/role/admin/user_management.php?action=reactivate&id=${userId}`)
        .then(res => {
            if(res.data.success) {
                Swal.fire('Success', 'User reactivated successfully!', 'success');
                loadArchivalData();
            } else {
                Swal.fire('Error', 'Error: ' + res.data.message, 'error');
            }
        })
        .catch(err => {
            console.error('Error reactivating user:', err);
            Swal.fire('Error', 'An error occurred while reactivating the user.', 'error');
        });
}

function renderArchivedTable(tbodyId, data, type) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    if(data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No archived records found.</td></tr>';
        return;
    }
    let rows = '';
    data.forEach(item => {
        rows += `
            <tr>
                <td><strong>${item.username}</strong></td>
                <td>${item.email || 'N/A'}</td>
                <td><span class="badge ${type === 'trainer' ? 'bg-warning' : 'bg-info'} text-dark">${type.charAt(0).toUpperCase() + type.slice(1)}</span></td>
                <td>${item.archived_at ? formatDate(item.archived_at) : 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="restoreUser(${item.user_id}, '${type}')">
                        <i class="fas fa-trash-restore me-1"></i> Unarchive
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = rows;
}

async function restoreUser(userId, type) {
    const result = await Swal.fire({
        title: 'Unarchive User?',
        text: "Are you sure you want to unarchive this user?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Unarchive'
    });
    if (!result.isConfirmed) return;
    
    // Use the reactivate endpoint from user_management
    axios.get(`/Hohoo-ville/api/role/admin/user_management.php?action=reactivate&id=${userId}`)
        .then(res => {
            if(res.data.success) {
                Swal.fire('Success', 'User unarchived successfully!', 'success');
                loadArchivalData();
            } else {
                Swal.fire('Error', 'Error: ' + res.data.message, 'error');
            }
        })
        .catch(err => {
            console.error(err);
            Swal.fire('Error', 'An error occurred while unarchiving user.', 'error');
        });
}