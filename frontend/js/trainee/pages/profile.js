const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/hohoo-ville/uploads/trainees/';

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

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
});

function setupUserNav(user) {
    if (user) {
        const traineeNameEl = document.getElementById('traineeName');
        if (traineeNameEl) {
            traineeNameEl.textContent = user.username || 'Trainee';
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.clear();
                window.location.href = '../../../../login.html';
            });
        }
    }
}

async function loadProfileData(traineeId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainee/training.php?action=get-profile&trainee_id=${traineeId}`);
        if (response.data.success) {
            const profile = response.data.data;

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
        trainee_id: traineeId,
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        facebook: document.getElementById('facebook').value
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainee/training.php?action=update-profile`, payload);

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