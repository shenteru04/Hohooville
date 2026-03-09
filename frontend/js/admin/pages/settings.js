const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;

document.addEventListener('DOMContentLoaded', async () => {
    await ensureSwal();
    initUserDropdown();
    initLogout();
    bindAccountSettingsForm();
    bindSystemSettingsForm();
    bindQuickActions();
    loadSystemSettings();
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

function bindAccountSettingsForm() {
    const accountForm = document.getElementById('accountSettingsForm');
    if (!accountForm) return;

    accountForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const currentPass = document.getElementById('currentPassword')?.value || '';
        const newPass = document.getElementById('newPassword')?.value || '';
        const confirmPass = document.getElementById('confirmPassword')?.value || '';

        if (newPass !== confirmPass) {
            showAlert('New passwords do not match.', 'warning');
            return;
        }

        const userId = getCurrentUserId();
        try {
            const response = await axios.post(`${API_BASE_URL}/role/admin/settings.php?action=change-password`, {
                user_id: userId,
                current_password: currentPass,
                new_password: newPass
            });

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to change password');
            }

            showAlert('Password changed successfully.', 'success');
            accountForm.reset();
        } catch (error) {
            console.error('Error changing password:', error);
            showAlert(error.response?.data?.message || error.message || 'Failed to change password.', 'danger');
        }
    });
}

function bindSystemSettingsForm() {
    const systemForm = document.getElementById('systemSettingsForm');
    if (!systemForm) return;

    systemForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const settings = {
            session_timeout: document.getElementById('sessionTimeout')?.value || 60,
            email_notifications: document.getElementById('emailNotifications')?.checked ? '1' : '0'
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/role/admin/settings.php?action=update-system`, settings);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to save settings');
            }
            showAlert('System settings saved successfully.', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            showAlert(error.message || 'Failed to save settings.', 'danger');
        }
    });
}

function bindQuickActions() {
    const backupBtn = document.getElementById('backupDataBtn');
    if (backupBtn) {
        backupBtn.addEventListener('click', async () => {
            const originalLabel = backupBtn.innerHTML;
            try {
                backupBtn.disabled = true;
                backupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Backing up...';

                const response = await axios.post(`${API_BASE_URL}/role/admin/settings.php?action=backup-database`);
                if (!response.data.success) {
                    throw new Error(response.data.message || 'Backup failed');
                }

                const blob = new Blob([response.data.data || ''], { type: 'text/sql' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_${new Date().toISOString().slice(0, 10)}.sql`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                showAlert('Database backup downloaded successfully.', 'success');
            } catch (error) {
                console.error('Backup failed:', error);
                showAlert(error.message || 'Backup failed.', 'danger');
            } finally {
                backupBtn.disabled = false;
                backupBtn.innerHTML = originalLabel;
            }
        });
    }

    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            showAlert('Cache cleared (simulated).', 'info');
        });
    }
}

async function loadSystemSettings() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/settings.php?action=get-system-settings`);
        if (!response.data.success || !response.data.data) return;

        const settings = response.data.data;
        setValue('sessionTimeout', settings.session_timeout || 60);

        const emailCheckbox = document.getElementById('emailNotifications');
        if (emailCheckbox) emailCheckbox.checked = String(settings.email_notifications) === '1';
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function getCurrentUserId() {
    const raw = localStorage.getItem('user');
    if (!raw) return 1;

    try {
        const user = JSON.parse(raw);
        return Number(user?.user_id || user?.id || user?.uid) || 1;
    } catch (error) {
        return 1;
    }
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function showAlert(message, type) {
    let icon = 'info';
    let title = 'Info';

    if (type === 'success') {
        icon = 'success';
        title = 'Success';
    } else if (type === 'danger') {
        icon = 'error';
        title = 'Error';
    } else if (type === 'warning') {
        icon = 'warning';
        title = 'Warning';
    }

    if (typeof window.Swal !== 'undefined') {
        Swal.fire({
            title,
            text: message,
            icon,
            timer: 2500,
            showConfirmButton: false
        });
        return;
    }

    alert(message);
}
