const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const TRAINER_PROFILE_IMAGES_URL = `${window.location.origin}/Hohoo-ville/uploads/profile_images/`;
let currentProfileImageUrl = '';

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

document.addEventListener('DOMContentLoaded', function () {
    const user = getStoredUser();
    const userId = resolveUserId(user);

    if (!user || !userId) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    initSidebar();
    initUserMenu();
    initLogout();
    setupProfileImageUpload(user);
    initPasswordForm();
    initPasswordToggle();

    const trainerNameEl = document.getElementById('trainerName');
    if (trainerNameEl) trainerNameEl.textContent = user.username || 'Trainer';

    loadProfile(userId);

    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            updateProfile(userId);
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
        console.warn('Failed to parse stored user:', error);
        return null;
    }
}

function resolveUserId(user) {
    if (!user || typeof user !== 'object') return 0;

    const rawId = user.user_id ?? user.userId ?? user.id ?? 0;
    const userId = Number(rawId);
    return Number.isFinite(userId) && userId > 0 ? userId : 0;
}

function getRequestErrorMessage(error, fallbackMessage) {
    return error?.response?.data?.message || error?.message || fallbackMessage;
}

function getTrainerProfileImageUrl(profile, fallbackName) {
    if (profile?.photo_url) {
        return profile.photo_url.startsWith('http')
            ? profile.photo_url
            : `${window.location.origin}${profile.photo_url}`;
    }

    if (profile?.profile_image) {
        return TRAINER_PROFILE_IMAGES_URL + encodeURIComponent(profile.profile_image);
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || 'Trainer')}&background=2563eb&color=fff`;
}

function setTrainerProfileImages(imageUrl) {
    const ids = ['profileAvatar', 'userProfileImage'];

    ids.forEach((id) => {
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

function formatQualificationDisplay(profile) {
    if (!profile || typeof profile !== 'object') return '';

    if (Array.isArray(profile.qualifications) && profile.qualifications.length) {
        const names = profile.qualifications
            .map((item) => String(item?.qualification_name || '').trim())
            .filter(Boolean);

        if (names.length) {
            return Array.from(new Set(names)).join('\n');
        }
    }

    const qualificationNames = String(profile.qualification_names || '').trim();
    if (qualificationNames) {
        return qualificationNames
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean)
            .join('\n');
    }

    return String(profile.qualification || profile.qualification_name || profile.specialization || '').trim();
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
        if (sidebar.classList.contains('-translate-x-full')) {
            openSidebar();
        } else {
            closeSidebar();
        }
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', toggleSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            document.body.classList.remove('overflow-hidden');
            if (sidebarOverlay) {
                sidebarOverlay.classList.add('hidden', 'opacity-0');
            }
        }
    });
}

function initUserMenu() {
    const userMenuButton = document.getElementById('userMenuButton');
    const userMenuDropdown = document.getElementById('userMenuDropdown');
    if (!userMenuButton || !userMenuDropdown) return;

    userMenuButton.addEventListener('click', function (event) {
        event.stopPropagation();
        userMenuDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', function (event) {
        if (!event.target.closest('#userMenuDropdown')) {
            userMenuDropdown.classList.add('hidden');
        }
    });
}

async function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async function (event) {
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

async function loadProfile(userId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get&user_id=${userId}`);
        if (!response.data.success) return;

        const data = response.data.data;
        const firstName = data.first_name || '';
        const lastName = data.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Trainer';

        document.getElementById('firstName').value = firstName;
        document.getElementById('lastName').value = lastName;
        document.getElementById('email').value = data.user_email || data.email || '';
        document.getElementById('phone_number').value = data.phone_number || '';
        document.getElementById('address').value = data.address || '';
        document.getElementById('qualification').value = formatQualificationDisplay(data);

        document.getElementById('headerName').textContent = fullName;
        document.getElementById('trainerName').textContent = fullName;
        const imageUrl = getTrainerProfileImageUrl(data, fullName);
        currentProfileImageUrl = data.photo_url || data.profile_image ? imageUrl : '';
        setTrainerProfileImages(imageUrl);
        setProfileImageStatus('Click the camera icon to change your profile photo.');
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function updateProfile(userId) {
    const payload = {
        user_id: userId,
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone_number: document.getElementById('phone_number').value.trim(),
        address: document.getElementById('address').value.trim()
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainer/profile.php?action=update`, payload);
        if (response.data.success) {
            if (window.Swal) {
                Swal.fire('Success', 'Profile updated successfully.', 'success');
            } else {
                alert('Profile updated successfully.');
            }
        } else if (window.Swal) {
            Swal.fire('Error', response.data.message || 'Could not update profile.', 'error');
        } else {
            alert(`Error: ${response.data.message || 'Could not update profile.'}`);
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        const message = getRequestErrorMessage(error, 'An error occurred while updating profile.');
        if (window.Swal) {
            Swal.fire('Error', message, 'error');
        } else {
            alert(message);
        }
    }
}

function initPasswordForm() {
    const form = document.getElementById('passwordForm');
    if (!form) return;

    const user = getStoredUser();
    const userId = resolveUserId(user);
    if (!userId) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await ensureSwal();

        const submitBtn = document.getElementById('submitPasswordBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        }

        const data = {
            user_id: userId,
            current_password: document.getElementById('currentPassword')?.value || '',
            new_password: document.getElementById('newPassword')?.value || '',
            confirm_password: document.getElementById('confirmPassword')?.value || ''
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/role/trainer/profile.php?action=change-password`, data);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to change password');
            }

            form.reset();

            if (window.Swal) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Password Updated',
                    text: 'Password changed successfully.',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#16a34a'
                });
            } else {
                alert('Password changed successfully');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            const message = getRequestErrorMessage(error, 'Failed to change password');
            if (window.Swal) {
                Swal.fire('Error', message, 'error');
            } else {
                alert(message);
            }
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
    const changePhotoButton = document.getElementById('changeProfileImageBtn');
    const profileAvatar = document.getElementById('profileAvatar');
    const userId = resolveUserId(user);

    if (!fileInput || !changePhotoButton || !profileAvatar || !userId) return;

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
        setTrainerProfileImages(previewUrl);
        setProfileImageStatus('Uploading profile photo...', 'loading');
        setProfileImageButtonLoading(true);

        try {
            const response = await uploadProfileImage(file, 'trainer', userId);
            currentProfileImageUrl = response.url;
            setTrainerProfileImages(response.url);
            setProfileImageStatus('Profile photo updated successfully.', 'success');

            await ensureSwal();
            if (window.Swal) {
                Swal.fire({
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
            setTrainerProfileImages(previousImageUrl);
            setProfileImageStatus(error.message || 'Failed to upload profile photo.', 'error');
            await ensureSwal();
            if (window.Swal) {
                Swal.fire('Error', error.message || 'Failed to upload profile photo', 'error');
            }
        } finally {
            URL.revokeObjectURL(previewUrl);
            fileInput.value = '';
            setProfileImageButtonLoading(false);
        }
    });
}
