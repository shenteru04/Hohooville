document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    // Check if user is already logged in and redirect
    const token = localStorage.getItem('token');
    if (token) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.role) {
            redirectToDashboard(user.role);
            return; // Stop further execution
        }
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        // Reset message
        messageDiv.style.display = 'none';
        messageDiv.textContent = '';

        // Disable button and show spinner
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';

        try {
            const response = await axios.post('http://localhost/hohoo-ville/api/authentication/Authentication.php?action=login', {
                username: username,
                password: password
            });

            if (response.data && response.data.success) {
                const { user, token } = response.data.data;
                
                // Store user info and token
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('token', token);

                // Redirect to the appropriate dashboard
                redirectToDashboard(user.role);

            } else {
                // This case might happen if API returns 200 OK but with success: false
                messageDiv.textContent = (response.data && response.data.message) ? response.data.message : 'An unexpected error occurred.';
                messageDiv.style.display = 'block';
            }

        } catch (error) {
            // This is the crucial part: logging the error to the console.
            console.error('Login failed:', error); 

            if (error.response) {
                // The request was made and the server responded with a status code outside of 2xx
                const errorMsg = (error.response.data && error.response.data.message) ? error.response.data.message : 'Invalid credentials or server error.';
                messageDiv.textContent = errorMsg;
            } else if (error.request) {
                // The request was made but no response was received
                messageDiv.textContent = 'No response from server. Please check your network connection.';
            } else {
                // Something happened in setting up the request that triggered an Error
                messageDiv.textContent = 'An error occurred. Please try again.';
            }
            messageDiv.style.display = 'block';
        } finally {
            // Re-enable button and restore text
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Login';
        }
    });

    function redirectToDashboard(role) {
        switch (role) {
            case 'admin':
                window.location.href = './html/admin/admin_dashboard.html';
                break;
            case 'trainer':
                window.location.href = './html/trainer/trainer_dashboard.html';
                break;
            case 'trainee':
                // Assuming a trainee dashboard exists at this path
                window.location.href = './html/trainee/trainee_dashboard.html';
                break;
            case 'registrar':
                window.location.href = './html/registrar/registrar_dashboard.html';
                break;
            default:
                // Fallback if role is unknown
                console.error('Unknown user role:', role);
                messageDiv.textContent = 'Login successful, but your user role is not configured for redirection.';
                messageDiv.style.display = 'block';
        }
    }
});