const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    
    // Account Settings Form
    const accountForm = document.getElementById('accountSettingsForm');
    if (accountForm) {
        accountForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const currentPass = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confirmPass = document.getElementById('confirmPassword').value;

            if (newPass !== confirmPass) {
                alert('New passwords do not match!');
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
                    alert('Password changed successfully');
                    accountForm.reset();
                } else {
                    alert('Error: ' + response.data.message);
                }
            } catch (error) {
                console.error('Error changing password:', error);
                const msg = error.response?.data?.message || 'Failed to change password';
                alert(msg);
            }
        });
    }

    // System Settings Form
    const systemForm = document.getElementById('systemSettingsForm');
    if (systemForm) {
        systemForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            try {
                // Mock API call
                const response = await axios.post(`${API_BASE_URL}/role/admin/settings.php?action=update-system`, {});
                if (response.data.success) {
                    alert('System settings saved successfully');
                }
            } catch (error) {
                console.error('Error saving settings:', error);
            }
        });
    }

    // Quick Actions
    const actions = ['backupDataBtn', 'clearCacheBtn', 'resetSettingsBtn'];
    actions.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', function() {
                alert(this.textContent + ' executed successfully (Mock)');
            });
        }
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '../../login.html';
        });
    }
});