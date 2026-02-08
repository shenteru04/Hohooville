const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    loadSystemSettings();
    
    // Account Settings Form
    const accountForm = document.getElementById('accountSettingsForm');
    if (accountForm) {
        accountForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const currentPass = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confirmPass = document.getElementById('confirmPassword').value;

            if (newPass !== confirmPass) {
                showAlert('New passwords do not match!', 'warning');
                return;
            }

            // Get user ID from local storage or default to 1
            const user = JSON.parse(localStorage.getItem('user')) || { user_id: 1 };

            try {
                const response = await axios.post(`${API_BASE_URL}/role/admin/settings.php?action=change-password`, {
                    user_id: user.user_id,
                    current_password: currentPass,
                    new_password: newPass
                });

                if (response.data.success) {
                    showAlert('Password changed successfully', 'success');
                    accountForm.reset();
                } else {
                    showAlert('Error: ' + response.data.message, 'danger');
                }
            } catch (error) {
                console.error('Error changing password:', error);
                const msg = error.response?.data?.message || 'Failed to change password';
                showAlert(msg, 'danger');
            }
        });
    }

    // System Settings Form
    const systemForm = document.getElementById('systemSettingsForm');
    if (systemForm) {
        systemForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const settings = {
                default_batch_size: document.getElementById('defaultBatchSize').value,
                session_timeout: document.getElementById('sessionTimeout').value,
                email_notifications: document.getElementById('emailNotifications').checked ? '1' : '0'
            };

            try {
                const response = await axios.post(`${API_BASE_URL}/role/admin/settings.php?action=update-system`, settings);
                if (response.data.success) {
                    showAlert('System settings saved successfully', 'success');
                } else {
                    showAlert('Error saving settings', 'danger');
                }
            } catch (error) {
                console.error('Error saving settings:', error);
                showAlert('Failed to save settings', 'danger');
            }
        });
    }

    // Quick Actions
    const backupBtn = document.getElementById('backupDataBtn');
    if (backupBtn) {
        backupBtn.addEventListener('click', async function() {
            try {
                backupBtn.disabled = true;
                backupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Backing up...';
                
                const response = await axios.post(`${API_BASE_URL}/role/admin/settings.php?action=backup-database`);
                if (response.data.success) {
                    const blob = new Blob([response.data.data], { type: 'text/sql' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `backup_${new Date().toISOString().slice(0,10)}.sql`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    showAlert('Database backup downloaded successfully', 'success');
                }
            } catch (error) {
                console.error('Backup failed:', error);
                showAlert('Backup failed', 'danger');
            } finally {
                backupBtn.disabled = false;
                backupBtn.textContent = 'Backup Data';
            }
        });
    }

    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', function() {
            showAlert('Cache cleared (simulated)', 'info');
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '../../login.html';
        });
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
});

async function loadSystemSettings() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/settings.php?action=get-system-settings`);
        if (response.data.success) {
            const settings = response.data.data;
            if (document.getElementById('defaultBatchSize')) 
                document.getElementById('defaultBatchSize').value = settings.default_batch_size || 20;
            if (document.getElementById('sessionTimeout')) 
                document.getElementById('sessionTimeout').value = settings.session_timeout || 60;
            if (document.getElementById('emailNotifications')) 
                document.getElementById('emailNotifications').checked = settings.email_notifications == '1';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function showAlert(message, type) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-notification');
    existingAlerts.forEach(alert => alert.remove());

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-notification`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '80px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.style.maxWidth = '500px';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}