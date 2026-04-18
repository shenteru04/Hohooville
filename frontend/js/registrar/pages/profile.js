const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
let currentUserId = 0;

document.addEventListener('DOMContentLoaded', async function () {
    await ensureSwal();

    const user = getStoredUser();
    if (!user) {
        window.location.href = '../../../login.html';
        return;
    }

    currentUserId = resolveUserId(user);

    initSidebar();
    initUserDropdown();
    initLogout();
    setupProfileImageUpload(user);
    initPasswordForm();
    initPasswordToggle();
    hydrateHeaderUser(user);
    loadProfile(currentUserId);

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function (event) {
            event.preventDefault();
            updateProfile(currentUserId);
        });
    }
});

function getStoredUser() {
    try {
        const parsed = JSON.parse(localStorage.getItem('user') || 'null');
        if (parsed && typeof parsed === 'object' && parsed.user && typeof parsed.user === 'object') {
            return parsed.user;
        }
        return parsed;
    } catch (error) {
        console.warn('Failed to parse user from localStorage:', error);
        return null;
    }
}

function resolveUserId(user) {
    if (!user || typeof user !== 'object') return 0;
    const raw = user.user_id ?? user.userId ?? user.id ?? user.user?.user_id ?? user.user?.userId ?? user.user?.id ?? 0;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : 0;
}

function getDisplayName(userLike) {
    if (!userLike || typeof userLike !== 'object') return 'Registrar';
    return [
        userLike.first_name,
        userLike.last_name
    ].filter(Boolean).join(' ').trim() || userLike.full_name || userLike.name || userLike.username || 'Registrar';
}

function hydrateHeaderUser(userLike) {
    const userName = document.getElementById('userName');
    if (userName) userName.textContent = getDisplayName(userLike);
}

function persistUserPatch(patch) {
    try {
        const raw = JSON.parse(localStorage.getItem('user') || 'null');
        if (raw && typeof raw === 'object' && raw.user && typeof raw.user === 'object') {
            raw.user = { ...raw.user, ...patch };
            localStorage.setItem('user', JSON.stringify(raw));
            return;
        }
        const user = raw && typeof raw === 'object' ? raw : {};
        const next = { ...user, ...patch };
        localStorage.setItem('user', JSON.stringify(next));
    } catch {
        const user = getStoredUser() || {};
        const next = { ...user, ...patch };
        localStorage.setItem('user', JSON.stringify(next));
    }
}

function notify(type, message) {
    if (window.Swal) {
        Swal.fire(type === 'error' ? 'Error' : 'Success', message, type);
        return;
    }
    alert(message);
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
        document.body.classList.remove('overflow-hidden');
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
            document.body.classList.remove('overflow-hidden');
        }
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
        if (!event.target.closest('#userDropdownMenu') && !event.target.closest('#userDropdown')) {
            menu.classList.add('hidden');
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
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '../../../login.html';
            }
        });
    });
}

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

async function loadProfile(userId) {
    try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({ action: 'get' });
        if (userId) params.set('user_id', String(userId));
        const response = await axios.get(`${API_BASE_URL}/role/registrar/profile.php?${params.toString()}`, token
            ? { headers: { Authorization: `Bearer ${token}` } }
            : undefined);
        if (!response.data || !response.data.success) {
            throw new Error(response.data?.message || 'Failed to load profile');
        }

        const data = response.data.data || {};
        currentUserId = Number(data.user_id || userId || 0);
        document.getElementById('userId').value = data.user_id || userId || '';
        document.getElementById('firstName').value = data.first_name || '';
        document.getElementById('lastName').value = data.last_name || '';
        document.getElementById('email').value = data.email || '';
        document.getElementById('phone').value = data.phone_number || '';

        const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Registrar';
        document.getElementById('headerName').textContent = fullName;
        document.getElementById('displayEmail').textContent = data.email || 'N/A';
        document.getElementById('displayPhone').textContent = data.phone_number || 'N/A';
        document.getElementById('profileAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;

        persistUserPatch({
            user_id: Number(data.user_id || userId || 0),
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email || '',
            username: data.username || undefined
        });
        hydrateHeaderUser(getStoredUser());
    } catch (error) {
        const serverMessage = error?.response?.data?.message;
        console.error('Error loading profile:', serverMessage || error?.message || error);
        notify('error', serverMessage || error.message || 'Failed to load profile.');
    }
}

async function updateProfile(userId) {
    const data = {
        user_id: userId,
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone_number: document.getElementById('phone').value
    };

    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_BASE_URL}/role/registrar/profile.php?action=update`, data, token
            ? { headers: { Authorization: `Bearer ${token}` } }
            : undefined);
        if (response.data.success) {
            notify('success', 'Profile updated successfully');
            loadProfile(userId);
        } else {
            notify('error', response.data.message ? `Error: ${response.data.message}` : 'Failed to update profile.');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        notify('error', 'Failed to update profile.');
    }
}

function initPasswordForm() {
    const form = document.getElementById('passwordForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitBtn = document.getElementById('submitPasswordBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        }

        const data = {
            user_id: currentUserId,
            current_password: document.getElementById('currentPassword')?.value || '',
            new_password: document.getElementById('newPassword')?.value || '',
            confirm_password: document.getElementById('confirmPassword')?.value || ''
        };

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_BASE_URL}/role/registrar/profile.php?action=change-password`,
                data,
                token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
            );
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to change password');
            }

            form.reset();
            notify('success', 'Password changed successfully');
        } catch (error) {
            console.error('Error changing password:', error);
            notify('error', error.message || 'Failed to change password');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Update Password';
            }
        }
    });

    const resetBtn = document.getElementById('resetPasswordBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', (event) => {
            event.preventDefault();
            form.reset();
        });
    }
}

function initPasswordToggle() {
    const toggleButtons = document.querySelectorAll('.password-toggle');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            
            const targetId = button.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = button.querySelector('i');
            
            if (!input || !icon) return;
            
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            icon.classList.toggle('fa-eye', isPassword);
            icon.classList.toggle('fa-eye-slash', !isPassword);
        });
    });
}

function setupProfileImageUpload(user) {
    const fileInput = document.getElementById('profileImageInput');
    const preview = document.getElementById('profileImagePreview');
    const uploadBtn = document.getElementById('uploadProfileImageBtn');
    const profileImageForm = document.getElementById('profileImageForm');

    if (!fileInput || !preview) return;

    // Click on image to select file
    preview.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show preview
        const reader = new FileReader();
        reader.onload = (event) => {
            preview.src = event.target.result;
        };
        reader.readAsDataURL(file);

        // Enable upload button
        uploadBtn.disabled = false;
    });

    // Handle form submission
    profileImageForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = fileInput.files[0];
        if (!file) {
            if (window.Swal) {
                Swal.fire('Error', 'Please select an image file', 'error');
            }
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="animate-spin fas fa-spinner mr-2"></i> Uploading...';

        try {
            const response = await uploadProfileImage(file, 'registrar', currentUserId);

            if (window.Swal) {
                Swal.fire('Success', 'Profile photo updated successfully!', 'success');
            }

            // Update preview with uploaded image URL
            preview.src = response.url;
            fileInput.value = '';
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Upload Photo';

        } catch (error) {
            console.error('Error uploading profile image:', error);
            if (window.Swal) {
                Swal.fire('Error', error.message || 'Failed to upload profile photo', 'error');
            }
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Upload Photo';
        }
    });
}
