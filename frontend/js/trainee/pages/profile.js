const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainees/';

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

document.addEventListener('DOMContentLoaded', function() {

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'trainee') {
        // window.location.href = '../../../../login.html';
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
                        window.location.href = '../../../../login.html';
                    }
                });
            });
        }
    }
}

async function loadProfileData(traineeId) {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/profile/get_profile.php`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.data.success) {
            const profile = response.data.profile;

            // Basic Information
            const fullName = [profile.first_name, profile.middle_name, profile.last_name, profile.extension_name].filter(Boolean).join(' ');
            document.getElementById('headerTraineeName').textContent = fullName;
            document.getElementById('headerTraineeCourse').textContent = profile.course_name || 'N/A';

            document.getElementById('profileSex').textContent = profile.sex || 'N/A';
            document.getElementById('profileCivilStatus').textContent = profile.civil_status || 'N/A';
            document.getElementById('profileBirthdate').textContent = profile.birthdate ? new Date(profile.birthdate).toLocaleDateString() : 'N/A';
            document.getElementById('profileAge').textContent = profile.age || 'N/A';
            document.getElementById('profileBirthplace').textContent = `${profile.birthplace_city || ''}, ${profile.birthplace_province || ''}`.replace(/^, |, $/g, '') || 'N/A';
            document.getElementById('profileNationality').textContent = profile.nationality || 'N/A';
            document.getElementById('profileEducation').textContent = profile.educational_attainment || 'N/A';

            
            if (profile.photo_file) {
                document.getElementById('headerTraineePhoto').src = UPLOADS_URL + encodeURIComponent(profile.photo_file);
            } else {
                document.getElementById('headerTraineePhoto').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff`;
            }

            document.getElementById('profileSex').textContent = profile.sex || 'N/A';
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
            document.getElementById('birthdate').value = profile.birthdate ? new Date(profile.birthdate).toLocaleDateString() : '';

        } else {
            Swal.fire('Error', 'Could not load profile data: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        Swal.fire('Error', 'An error occurred while fetching your profile.', 'error');
    }
}

async function saveProfileData(traineeId) {
    const saveBtn = document.getElementById('saveProfileBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="animate-spin fas fa-spinner mr-2"></i> Saving...';

    const payload = {
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone_number: document.getElementById('phone').value,
        address: document.getElementById('address').value
    };

    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_BASE_URL}/profile/update_profile.php`, payload, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.success) {
            Swal.fire('Success', 'Profile updated successfully!', 'success');
            // Update header name if changed
            const user = JSON.parse(localStorage.getItem('user'));
            // This is a bit complex, let's simplify. We don't need to re-fetch username if it's not editable.
            // The username is not on the form, so it won't change.
            // Let's just reload the profile data to be safe.
            loadProfileData(traineeId);
        } else {
            Swal.fire('Error', 'Error updating profile: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        Swal.fire('Error', 'An error occurred while saving your profile.', 'error');
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
            Swal.fire('Error', 'Please select an image file', 'error');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="animate-spin fas fa-spinner mr-2"></i> Uploading...';

        try {
            const response = await uploadProfileImage(
                file,
                'trainee',
                user.user_id,
                user.trainee_id
            );

            await ensureSwal();
            Swal.fire('Success', 'Profile photo updated successfully!', 'success');

            // Update preview with uploaded image URL
            preview.src = response.url;
            fileInput.value = '';
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Upload Photo';

        } catch (error) {
            console.error('Error uploading profile image:', error);
            await ensureSwal();
            Swal.fire('Error', error.message || 'Failed to upload profile photo', 'error');
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Upload Photo';
        }
    });
}