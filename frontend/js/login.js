const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.user_id && user.role) {
        // If we are already on the login page but have a user, redirect to dashboard
        redirectToDashboard(user.role);
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.querySelector('button[type="submit"]');
    const errorAlert = document.getElementById('loginError');

    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }

    // Disable button to prevent multiple submissions
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Logging in...';
    if(errorAlert) errorAlert.style.display = 'none';

    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login.php`, {
            email: email,
            password: password
        });

        if (response.data.success) {
            const user = response.data.data;

            // Security Check: Prevent Archived or Inactive users from logging in
            if (user.is_archived == 1) {
                showError('Your account has been archived. Access denied.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                return;
            }

            if (user.status === 'inactive') {
                showError('Your account is inactive. Please contact the administrator.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                return;
            }

            // Save user session
            localStorage.setItem('user', JSON.stringify(user));
            if (user.token) localStorage.setItem('token', user.token);

            // Redirect
            redirectToDashboard(user.role);
        } else {
            showError(response.data.message || 'Login failed');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('An error occurred during login. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

function redirectToDashboard(role) {
    let path = '';
    switch(role) {
        case 'admin': path = 'html/admin/admin_dashboard.html'; break;
        case 'trainer': path = 'html/trainer/trainer_dashboard.html'; break;
        case 'trainee': path = 'html/trainee/trainee_dashboard.html'; break;
        case 'registrar': path = 'html/registrar/registrar_dashboard.html'; break;
        default: return;
    }
    
    // Prevent infinite redirect loop
    window.location.href = path;
}

function showError(msg) {
    alert(msg); // Simple fallback, can be replaced with DOM element update
}