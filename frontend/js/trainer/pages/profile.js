const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user')) || { user_id: 1 };
    
    if (!user || !localStorage.getItem('user')) {
        window.location.href = '../../../login.html';
        return;
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

    // Remove Attendance and Grading pages from sidebar
    if (sidebar) {
        const ul = sidebar.querySelector('ul');
        if (ul) {
            ul.innerHTML = '';
            const menuItems = [
                { href: '/Hohoo-ville/frontend/html/trainer/trainer_dashboard.html', icon: 'fas fa-home', text: 'Dashboard' },
                { href: 'my_batches.html', icon: 'fas fa-users', text: 'My Batches' },
                { href: 'modules.html', icon: 'fas fa-book', text: 'Modules' },
                { href: 'progress_chart.html', icon: 'fas fa-chart-line', text: 'Progress Chart' },
                { href: 'achievement_chart.html', icon: 'fas fa-trophy', text: 'Achievement Chart' },
                { href: 'reports.html', icon: 'fas fa-file-alt', text: 'Reports' }
            ];
            const currentPage = window.location.pathname.split('/').pop();
            menuItems.forEach(item => {
                const li = document.createElement('li');
                li.className = 'nav-item mb-1';
                const isActive = currentPage === item.href ? 'active' : '';
                li.innerHTML = `<a class="nav-link ${isActive}" href="${item.href}"><i class="${item.icon} me-2"></i> ${item.text}</a>`;
                ul.appendChild(li);
            });
        }
    }

    loadProfile(user.user_id);

    // Make fields editable on click (optional, or just use form)
    // For now, fields are readonly in HTML, let's remove readonly via JS if we want editing, 
    // or assume the HTML provided was just for display. 
    // The HTML provided has inputs, so let's add a save button logic if needed.
    // Since the HTML didn't have a save button, I'll assume it's view-only for now or add one dynamically.
    
    // Adding a save button dynamically for this fix
    const form = document.getElementById('profileForm');
    const btnDiv = document.createElement('div');
    btnDiv.className = 'mt-3 text-end';
    btnDiv.innerHTML = '<button type="submit" class="btn btn-primary">Save Changes</button>';
    form.appendChild(btnDiv);

    // Enable editing
    document.querySelectorAll('#profileForm input').forEach(input => input.removeAttribute('readonly'));

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        updateProfile(user.user_id);
    });
});

async function loadProfile(userId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get&user_id=${userId}`);
        if (response.data.success) {
            const data = response.data.data;
            document.getElementById('firstName').value = data.first_name;
            document.getElementById('lastName').value = data.last_name;
            document.getElementById('email').value = data.email;
            document.getElementById('specialization').value = data.specialization || '';
            
            document.getElementById('headerName').textContent = `${data.first_name} ${data.last_name}`;
            document.getElementById('profileAvatar').src = `https://ui-avatars.com/api/?name=${data.first_name}+${data.last_name}&background=random`;

            // Update Dropdown Name
            const dropdownName = document.getElementById('trainerName');
            if (dropdownName) {
                dropdownName.textContent = `${data.first_name} ${data.last_name}`;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function updateProfile(userId) {
    const data = {
        user_id: userId,
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        specialization: document.getElementById('specialization').value,
        phone_number: '' // Add phone field to HTML if needed
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainer/profile.php?action=update`, data);
        if (response.data.success) alert('Profile updated successfully');
        else alert('Error: ' + response.data.message);
    } catch (error) {
        console.error('Error updating profile:', error);
    }
}