const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;

document.addEventListener('DOMContentLoaded', async () => {
    await ensureSwal();
    initUserDropdown();
    initLogout();
    initProfileForm();
    loadProfile();
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

function initProfileForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        }

        const data = {
            user_id: document.getElementById('userId')?.value || '',
            first_name: document.getElementById('firstName')?.value?.trim() || '',
            last_name: document.getElementById('lastName')?.value?.trim() || '',
            email: document.getElementById('email')?.value?.trim() || '',
            phone: document.getElementById('phone')?.value?.trim() || ''
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/role/admin/profile.php?action=update`, data);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to update profile');
            }

            const fullName = formatName(data.first_name, data.last_name);
            setText('headerName', fullName);
            setText('displayEmail', data.email || 'N/A');
            setText('displayPhone', data.phone || 'N/A');
            setText('userName', data.first_name || 'Admin');
            updateAvatar(fullName);

            if (window.Swal) {
                Swal.fire('Success', 'Profile updated successfully', 'success');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            if (window.Swal) {
                Swal.fire('Error', error.message || 'Failed to update profile', 'error');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            }
        }
    });
}

async function loadProfile() {
    try {
        const userId = getCurrentUserId();
        const response = await axios.get(`${API_BASE_URL}/role/admin/profile.php?action=get&id=${encodeURIComponent(userId)}`);
        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Failed to load profile');
        }

        const data = response.data.data;
        const firstName = data.first_name || '';
        const lastName = data.last_name || '';
        const fullName = formatName(firstName, lastName);

        setValue('userId', data.user_id || userId);
        setValue('firstName', firstName);
        setValue('lastName', lastName);
        setValue('email', data.email || '');
        setValue('phone', data.phone_number || data.phone || '');

        setText('headerName', fullName || 'Admin');
        setText('headerRole', String(data.role_name || 'User').toUpperCase());
        setText('displayEmail', data.email || 'N/A');
        setText('displayPhone', data.phone_number || data.phone || 'N/A');
        setText('displayUsername', data.username || 'N/A');
        setText('userName', firstName || data.username || 'Admin');

        updateAvatar(fullName || data.username || 'Admin User');
    } catch (error) {
        console.error('Error loading profile:', error);
        if (window.Swal) {
            Swal.fire('Error', 'Failed to load profile data', 'error');
        }
    }
}

function getCurrentUserId() {
    const raw = localStorage.getItem('user');
    if (!raw) return 1;

    try {
        const user = JSON.parse(raw);
        const id = user?.user_id || user?.id || user?.uid;
        return Number(id) || 1;
    } catch (error) {
        return 1;
    }
}

function formatName(firstName, lastName) {
    return `${firstName || ''} ${lastName || ''}`.trim();
}

function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function updateAvatar(name) {
    const avatarImg = document.getElementById('profileAvatar');
    if (!avatarImg) return;
    avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
}
