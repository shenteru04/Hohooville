const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function () {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    initSidebar();
    initUserMenu();
    initLogout();

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

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.clear();
        window.location.href = '/Hohoo-ville/frontend/login.html';
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
