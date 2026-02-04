const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user')) || { user_id: 1 };
    
    // Remove Attendance and Grading pages from sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        const links = sidebar.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href') || '';
            if (href.includes('attendance') || href.includes('grading') || href.includes('my_trainees.html')) {
                const parent = link.closest('li') || link;
                parent.remove();
            }
        });

        // Add Progress Chart link
        const ul = sidebar.querySelector('ul');
        if (ul && !ul.querySelector('a[href="progress_chart.html"]')) {
            const newLi = document.createElement('li');
            newLi.className = 'nav-item';
            newLi.innerHTML = `
                <a class="nav-link" href="progress_chart.html">
                    <i class="fas fa-chart-bar me-2"></i>
                    <span>Progress Chart</span>
                </a>
            `;
            ul.appendChild(newLi);
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