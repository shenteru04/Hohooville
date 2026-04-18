const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;

document.addEventListener('DOMContentLoaded', async () => {
    await ensureSwal();
    initUserDropdown();
    initLogout();
    initProfileForm();
    setupProfileImageUpload();
    initPasswordForm();
    initPasswordToggle();
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
                if (typeof window.logout === 'function') {
                    window.logout();
                    return;
                }
                localStorage.clear();
                window.location.href = '/Hohoo-ville/frontend/login.html';
            }
        });
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
            user_id: document.getElementById('userId')?.value || '',
            current_password: document.getElementById('currentPassword')?.value || '',
            new_password: document.getElementById('newPassword')?.value || '',
            confirm_password: document.getElementById('confirmPassword')?.value || ''
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/role/admin/profile.php?action=change-password`, data);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to change password');
            }

            // Clear form
            form.reset();

            if (window.Swal) {
                Swal.fire('Success', 'Password changed successfully', 'success');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            if (window.Swal) {
                Swal.fire('Error', error.message || 'Failed to change password', 'error');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Update Password';
            }
        }
    });

    // Reset button handler
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

function setupProfileImageUpload() {
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
            const userId = getCurrentUserId();
            const response = await uploadProfileImage(file, 'admin', userId);

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
