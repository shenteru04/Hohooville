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

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../../../login.html';
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
