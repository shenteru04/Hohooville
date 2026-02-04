const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
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
                    alert('Profile updated successfully');
                    // Update display name
                    const fullName = `${data.first_name} ${data.last_name}`;
                    document.getElementById('headerName').textContent = fullName;
                    document.getElementById('displayEmail').textContent = data.email;
                    document.getElementById('displayPhone').textContent = data.phone || 'N/A';
                    updateAvatar(fullName);
                } else {
                    alert('Error: ' + response.data.message);
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('Failed to update profile');
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