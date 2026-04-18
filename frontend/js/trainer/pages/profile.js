const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';

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
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
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

    loadProfile(user.user_id);

    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            updateProfile(user.user_id);
        });
    }
});

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
        document.getElementById('gender').value = data.gender || '';
        document.getElementById('birthday').value = data.birthday || '';
        document.getElementById('address').value = data.address || '';
        document.getElementById('qualification').value = data.qualification || data.specialization || '';

        document.getElementById('headerName').textContent = fullName;
        document.getElementById('trainerName').textContent = fullName;
        document.getElementById('profileAvatar').src =
            `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=2563eb&color=fff`;
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function updateProfile(userId) {
    const payload = {
        user_id: userId,
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        specialization: document.getElementById('qualification').value.trim()
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
        if (window.Swal) {
            Swal.fire('Error', 'An error occurred while updating profile.', 'error');
        } else {
            alert('An error occurred while updating profile.');
        }
    }
}

function initPasswordForm() {
    const form = document.getElementById('passwordForm');
    if (!form) return;

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitBtn = document.getElementById('submitPasswordBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        }

        const data = {
            user_id: user.user_id,
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
                Swal.fire('Success', 'Password changed successfully', 'success');
            } else {
                alert('Password changed successfully');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            if (window.Swal) {
                Swal.fire('Error', error.message || 'Failed to change password', 'error');
            } else {
                alert(error.message || 'Failed to change password');
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
            await ensureSwal();
            if (window.Swal) {
                Swal.fire('Error', 'Please select an image file', 'error');
            }
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="animate-spin fas fa-spinner mr-2"></i> Uploading...';

        try {
            const response = await uploadProfileImage(file, 'trainer', user.user_id);

            await ensureSwal();
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
            await ensureSwal();
            if (window.Swal) {
                Swal.fire('Error', error.message || 'Failed to upload profile photo', 'error');
            }
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Upload Photo';
        }
    });
}
