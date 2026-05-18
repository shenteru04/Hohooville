const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;
let currentProfileImageUrl = '';

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
            if (!currentProfileImageUrl) updateAvatar(fullName || 'Admin');

            if (typeof window.Swal !== 'undefined') {
                Swal.fire('Success', 'Profile updated successfully', 'success');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            if (typeof window.Swal !== 'undefined') {
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

        if (data.profile_image) {
            currentProfileImageUrl = resolveProfileImageUrl(data.profile_image);
            setProfileImageSources(currentProfileImageUrl);
        } else {
            currentProfileImageUrl = '';
            updateAvatar(fullName || data.username || 'Admin User');
        }

        setProfileImageStatus('Click the camera icon to change your profile photo.');
    } catch (error) {
        console.error('Error loading profile:', error);
        if (window.Swal) {
            window.Swal.fire('Error', 'Failed to load profile data', 'error');
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

function resolveProfileImageUrl(profileImage) {
    if (!profileImage) return '';
    return profileImage.startsWith('http')
        ? profileImage
        : `/Hohoo-ville/uploads/profile_images/${profileImage}`;
}

function setProfileImageSources(imageUrl) {
    ['profileAvatar', 'userProfileImage'].forEach((id) => {
        const image = document.getElementById(id);
        if (image) {
            image.src = imageUrl;
        }
    });
}

function setProfileImageStatus(message, tone = 'muted') {
    const status = document.getElementById('profileImageStatusText');
    if (!status) return;

    const toneClassMap = {
        muted: 'text-slate-500',
        loading: 'text-blue-600',
        success: 'text-emerald-600',
        error: 'text-red-500'
    };

    status.className = `mt-2 text-xs ${toneClassMap[tone] || toneClassMap.muted}`;
    status.textContent = message;
}

function setProfileImageButtonLoading(isLoading) {
    const button = document.getElementById('changeProfileImageBtn');
    if (!button) return;

    button.disabled = isLoading;
    button.classList.toggle('cursor-wait', isLoading);
    button.classList.toggle('opacity-80', isLoading);
    button.innerHTML = isLoading
        ? '<i class="fas fa-spinner fa-spin text-sm"></i>'
        : '<i class="fas fa-camera text-sm"></i>';
}

function updateAvatar(name) {
    const avatarImg = document.getElementById('profileAvatar');
    if (!avatarImg) return;
    currentProfileImageUrl = '';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
    setProfileImageSources(avatarUrl);
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
                window.Swal.fire('Success', 'Password changed successfully', 'success');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            if (window.Swal) {
                window.Swal.fire('Error', error.message || 'Failed to change password', 'error');
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
    const changePhotoButton = document.getElementById('changeProfileImageBtn');
    const profileAvatar = document.getElementById('profileAvatar');

    if (!fileInput || !changePhotoButton || !profileAvatar) return;

    const openFilePicker = () => {
        if (changePhotoButton.disabled) return;
        fileInput.click();
    };

    changePhotoButton.addEventListener('click', openFilePicker);
    profileAvatar.addEventListener('click', openFilePicker);
    profileAvatar.classList.add('cursor-pointer');

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const previousImageUrl = currentProfileImageUrl || profileAvatar.src;
        const previewUrl = URL.createObjectURL(file);
        setProfileImageSources(previewUrl);
        setProfileImageStatus('Uploading profile photo...', 'loading');
        setProfileImageButtonLoading(true);

        try {
            const userId = getCurrentUserId();
            const response = await uploadProfileImage(file, 'admin', userId);
            currentProfileImageUrl = response.url;
            setProfileImageSources(response.url);
            setProfileImageStatus('Profile photo updated successfully.', 'success');

            if (window.Swal) {
                window.Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Profile photo updated',
                    showConfirmButton: false,
                    timer: 1800,
                    timerProgressBar: true
                });
            }

            if (typeof window.refreshHeaderProfileChip === 'function') {
                window.refreshHeaderProfileChip();
            }

        } catch (error) {
            console.error('Error uploading profile image:', error);
            setProfileImageSources(previousImageUrl);
            setProfileImageStatus(error.message || 'Failed to upload profile photo.', 'error');
            if (window.Swal) {
                window.Swal.fire('Error', error.message || 'Failed to upload profile photo', 'error');
            }
        } finally {
            URL.revokeObjectURL(previewUrl);
            fileInput.value = '';
            setProfileImageButtonLoading(false);
        }
    });
}
