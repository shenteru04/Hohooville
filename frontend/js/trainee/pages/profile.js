const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const TRAINEE_PROFILE_IMAGES_URL = window.location.origin + '/Hohoo-ville/uploads/profile_images/';
const TRAINEE_UPLOADS_URL = window.location.origin + '/Hohoo-ville/uploads/trainees/';
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

function formatDateValue(value) {
    if (!value) return '';

    const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const date = new Date(normalizedValue);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function joinProfileParts(parts, separator = ' ') {
    return parts.filter((part) => part && String(part).trim() !== '').join(separator);
}

function buildFullName(profile) {
    return joinProfileParts([
        profile.first_name,
        profile.middle_name,
        profile.last_name,
        profile.extension_name
    ]);
}

function getProfilePhotoUrl(profile, fallbackName) {
    if (profile.photo_url) {
        return profile.photo_url.startsWith('http')
            ? profile.photo_url
            : `${window.location.origin}${profile.photo_url}`;
    }

    if (profile.profile_image) {
        return TRAINEE_PROFILE_IMAGES_URL + encodeURIComponent(profile.profile_image);
    }

    if (profile.photo_file) {
        return TRAINEE_UPLOADS_URL + encodeURIComponent(profile.photo_file);
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || 'Trainee')}&background=random&color=fff`;
}

function setTraineeProfileImages(imageUrl) {
    ['headerTraineePhoto', 'userProfileImage'].forEach((id) => {
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

document.addEventListener('DOMContentLoaded', function() {

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'trainee') {
        // window.location.href = '/Hohoo-ville/frontend/login.html';
        console.error("Not a trainee or not logged in.");
        return;
    }

    // Sidebar Logic (Tailwind)
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

    function toggleSidebar() {
        const isClosed = sidebar.classList.contains('-translate-x-full');
        if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
            setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10);
        } else {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
        }
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', toggleSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // User Dropdown Logic
    const userMenuBtn = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }

    setupUserNav(user);
    loadProfileData(user.trainee_id);

    document.getElementById('profileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveProfileData(user.trainee_id);
    });

    // Setup profile image upload
    setupProfileImageUpload(user);

    initPasswordForm(user);
    initPasswordToggle();
});

function setupUserNav(user) {
    if (user) {
        const traineeNameEl = document.getElementById('traineeName');
        if (traineeNameEl) {
            traineeNameEl.textContent = user.username || 'Trainee';
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
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
    }
}

async function loadProfileData(traineeId) {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/role/trainee/profile.php`, {
            params: {
                action: 'get',
                trainee_id: traineeId
            },
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.data.success) {
            const profile = response.data.data || {};

            // Basic Information
            const fullName = buildFullName(profile) || profile.username || 'Trainee';
            const photoUrl = getProfilePhotoUrl(profile, fullName);

            document.getElementById('headerTraineeName').textContent = fullName;
            document.getElementById('headerTraineeCourse').textContent = profile.course_name || 'N/A';
            currentProfileImageUrl = profile.photo_url || profile.profile_image || profile.photo_file ? photoUrl : '';
            setTraineeProfileImages(photoUrl);
            setProfileImageStatus('Click the camera icon to change your profile photo.');

            document.getElementById('profileSex').textContent = profile.sex || 'N/A';
            document.getElementById('profileCivilStatus').textContent = profile.civil_status || 'N/A';
            document.getElementById('profileBirthdate').textContent = formatDateValue(profile.birthdate) || 'N/A';
            document.getElementById('profileAge').textContent = profile.age || 'N/A';
            document.getElementById('profileBirthplace').textContent = joinProfileParts([profile.birthplace_city, profile.birthplace_province], ', ') || 'N/A';
            document.getElementById('profileNationality').textContent = profile.nationality || 'N/A';
            document.getElementById('profileEducation').textContent = profile.educational_attainment || 'N/A';

            document.getElementById('profileSchoolId').textContent = profile.trainee_school_id || 'N/A';
            document.getElementById('profileUsername').textContent = profile.username || 'N/A';
            document.getElementById('profileBatch').textContent = profile.batch_name || 'N/A';
            document.getElementById('profileScholarship').textContent = profile.scholarship_type || 'No Scholarship';
            document.getElementById('profileEnrollmentDate').textContent = profile.formatted_enrollment_date || profile.enrollment_date || 'N/A';

            document.getElementById('firstName').value = profile.first_name || '';
            document.getElementById('lastName').value = profile.last_name || '';
            document.getElementById('email').value = profile.email || '';
            document.getElementById('phone').value = profile.phone_number || '';
            document.getElementById('facebook').value = profile.facebook_account || '';
            document.getElementById('address').value = profile.address || '';
            document.getElementById('qualification').value = profile.qualification || profile.course_name || '';
            document.getElementById('sex').value = profile.sex || '';
            document.getElementById('birthdate').value = formatDateValue(profile.birthdate);

        } else {
            Swal.fire('Error', 'Could not load profile data: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        Swal.fire('Error', error.response?.data?.message || 'An error occurred while fetching your profile.', 'error');
    }
}

async function saveProfileData(traineeId) {
    const saveBtn = document.getElementById('saveProfileBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="animate-spin fas fa-spinner mr-2"></i> Saving...';

    const payload = {
        trainee_id: traineeId,
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone_number: document.getElementById('phone').value,
        facebook_account: document.getElementById('facebook').value
    };

    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_BASE_URL}/role/trainee/profile.php?action=update`, payload, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.data.success) {
            Swal.fire('Success', 'Profile updated successfully!', 'success');
            loadProfileData(traineeId);
        } else {
            Swal.fire('Error', 'Error updating profile: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        Swal.fire('Error', error.response?.data?.message || 'An error occurred while saving your profile.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Changes';
    }
}

function initPasswordForm(user) {
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
            user_id: user.user_id,
            current_password: document.getElementById('currentPassword')?.value || '',
            new_password: document.getElementById('newPassword')?.value || '',
            confirm_password: document.getElementById('confirmPassword')?.value || ''
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/role/trainee/profile.php?action=change-password`, data);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to change password');
            }

            form.reset();
            Swal.fire('Success', 'Password changed successfully', 'success');
        } catch (error) {
            console.error('Error changing password:', error);
            Swal.fire('Error', error.message || 'Failed to change password', 'error');
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
    const headerPhoto = document.getElementById('headerTraineePhoto');

    if (!fileInput || !changePhotoButton || !headerPhoto) return;

    const openFilePicker = () => {
        if (changePhotoButton.disabled) return;
        fileInput.click();
    };

    changePhotoButton.addEventListener('click', openFilePicker);
    headerPhoto.addEventListener('click', openFilePicker);
    headerPhoto.classList.add('cursor-pointer');

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const previousImageUrl = currentProfileImageUrl || headerPhoto.src;
        const previewUrl = URL.createObjectURL(file);
        setTraineeProfileImages(previewUrl);
        setProfileImageStatus('Uploading profile photo...', 'loading');
        setProfileImageButtonLoading(true);

        try {
            const response = await uploadProfileImage(
                file,
                'trainee',
                user.user_id,
                user.trainee_id
            );

            await ensureSwal();
            currentProfileImageUrl = response.url;
            setTraineeProfileImages(response.url);
            setProfileImageStatus('Profile photo updated successfully.', 'success');
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Profile photo updated',
                showConfirmButton: false,
                timer: 1800,
                timerProgressBar: true
            });

            if (typeof window.refreshHeaderProfileChip === 'function') {
                window.refreshHeaderProfileChip();
            }

        } catch (error) {
            console.error('Error uploading profile image:', error);
            await ensureSwal();
            setTraineeProfileImages(previousImageUrl);
            setProfileImageStatus(error.message || 'Failed to upload profile photo.', 'error');
            Swal.fire('Error', error.message || 'Failed to upload profile photo', 'error');
        } finally {
            URL.revokeObjectURL(previewUrl);
            fileInput.value = '';
            setProfileImageButtonLoading(false);
        }
    });
}
