const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    // Load profile data
    loadProfile();

    // Handle Form Submit
    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating...';

            const data = {
                user_id: document.getElementById('userId').value,
                first_name: document.getElementById('firstName').value,
                last_name: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value
            };

            try {
                const response = await axios.post(`${API_BASE_URL}/role/admin/profile.php?action=update`, data);
                if (response.data.success) {
                    Swal.fire('Success', 'Profile updated successfully', 'success');
                    // Update display name
                    const fullName = `${data.first_name} ${data.last_name}`;
                    document.getElementById('headerName').textContent = fullName;
                    document.getElementById('displayEmail').textContent = data.email;
                    document.getElementById('displayPhone').textContent = data.phone || 'N/A';
                    updateAvatar(fullName);
                } else {
                    Swal.fire('Error', 'Error: ' + response.data.message, 'error');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                Swal.fire('Error', 'Failed to update profile', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save me-1"></i> Save Changes';
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '../../login.html';
        });
    }

    // Inject Sidebar CSS (W3.CSS Reference Style)
    const ms = document.createElement('style');
    ms.innerHTML = `
        #sidebar {
            width: 200px;
            position: fixed;
            z-index: 1050;
            top: 0;
            left: 0;
            height: 100vh;
            overflow-y: auto;
            background-color: #fff;
            box-shadow: 0 2px 5px 0 rgba(0,0,0,0.16), 0 2px 10px 0 rgba(0,0,0,0.12);
            display: block;
        }
        .main-content, #content, .content-wrapper {
            margin-left: 200px !important;
            transition: margin-left .4s;
        }
        #sidebarCloseBtn {
            display: none;
            width: 100%;
            text-align: left;
            padding: 8px 16px;
            background: none;
            border: none;
            font-size: 18px;
        }
        #sidebarCloseBtn:hover { background-color: #ccc; }
        
        @media (max-width: 991.98px) {
            #sidebar { display: none; }
            .main-content, #content, .content-wrapper { margin-left: 0 !important; }
            #sidebarCloseBtn { display: block; }
        }
        .table-responsive, table { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    `;
    document.head.appendChild(ms);

    // Sidebar Logic
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (!document.getElementById('sidebarCloseBtn')) {
            const closeBtn = document.createElement('button');
            closeBtn.id = 'sidebarCloseBtn';
            closeBtn.innerHTML = 'Close &times;';
            closeBtn.addEventListener('click', () => {
                sidebar.style.display = 'none';
            });
            sidebar.insertBefore(closeBtn, sidebar.firstChild);
        }
    }

    // Open Button Logic
    let sc = document.getElementById('sidebarCollapse');
    if (!sc) {
        const nb = document.querySelector('.navbar');
        if (nb) {
            const c = nb.querySelector('.container-fluid') || nb;
            const b = document.createElement('button');
            b.id = 'sidebarCollapse';
            b.className = 'btn btn-outline-primary me-2 d-lg-none';
            b.type = 'button';
            b.innerHTML = '&#9776;';
            c.insertBefore(b, c.firstChild);
            sc = b;
        }
    }
    if (sc) {
        const nb = sc.cloneNode(true);
        if(sc.parentNode) sc.parentNode.replaceChild(nb, sc);
        nb.addEventListener('click', () => {
            if (sidebar) sidebar.style.display = 'block';
        });
    }
});

async function loadProfile() {
    try {
        // In a real app, get ID from localStorage or token. Defaulting to 1 for demo.
        const user = JSON.parse(localStorage.getItem('user')) || { user_id: 1 };
        
        const response = await axios.get(`${API_BASE_URL}/role/admin/profile.php?action=get&id=${user.user_id}`);
        if (response.data.success) {
            const data = response.data.data;
            document.getElementById('userId').value = data.user_id;
            document.getElementById('firstName').value = data.first_name;
            document.getElementById('lastName').value = data.last_name;
            document.getElementById('email').value = data.email;
            document.getElementById('phone').value = data.phone_number;
            
            // Update new UI elements
            const fullName = `${data.first_name} ${data.last_name}`;
            document.getElementById('headerName').textContent = fullName;
            document.getElementById('headerRole').textContent = (data.role_name || 'User').toUpperCase();
            
            document.getElementById('displayEmail').textContent = data.email;
            document.getElementById('displayPhone').textContent = data.phone_number || 'N/A';
            document.getElementById('displayUsername').textContent = data.username;
            
            updateAvatar(fullName);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function updateAvatar(name) {
    const avatarImg = document.getElementById('profileAvatar');
    if (avatarImg) {
        avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
    }
}