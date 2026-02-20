document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    const loginForm = document.getElementById('loginForm');
    const otpForm = document.getElementById('otpForm');
    const messageDiv = document.getElementById('message');
    
    // CAPTCHA State
    let captchaAnswer = 0;

    // Check if user is already logged in and redirect
    const token = localStorage.getItem('token');
    if (token) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.role) {
            redirectToDashboard(user.role);
            return; // Stop further execution
        }
    }

    // Initialize CAPTCHA
    generateCaptcha();

    // Handle Login Submit
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const captchaInput = document.getElementById('captchaInput').value;
        
        // Basic client-side CAPTCHA check (Server will also verify for Trainer/Trainee)
        if (parseInt(captchaInput) !== captchaAnswer) {
            showMessage('Incorrect CAPTCHA answer. Please try again.', 'danger');
            generateCaptcha();
            return;
        }

        const submitButton = loginForm.querySelector('button[type="submit"]');

        // Reset message
        messageDiv.style.display = 'none';
        messageDiv.textContent = '';

        // Disable button and show spinner
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';

        try {
            const response = await axios.post(window.location.origin + '/hohoo-ville/api/authentication/Authentication.php?action=login', {
                username: username,
                password: password,
                captcha_input: parseInt(captchaInput),
                captcha_challenge: captchaAnswer
            });

            if (response.data && response.data.success) {
                // Check if OTP is required (Admin/Registrar)
                if (response.data.data.require_otp) {
                    sessionStorage.setItem('temp_user_id', response.data.data.user_id);
                    sessionStorage.setItem('temp_otp_token', response.data.data.otp_token);
                    showOtpForm();
                    return;
                }

                // Standard Login (Trainer/Trainee)
                const { user, token } = response.data.data;
                completeLogin(user, token);

            } else {
                // This case might happen if API returns 200 OK but with success: false
                showMessage((response.data && response.data.message) ? response.data.message : 'An unexpected error occurred.', 'danger');
                generateCaptcha();
            }

        } catch (error) {
            // This is the crucial part: logging the error to the console.
            console.error('Login failed:', error); 

            if (error.response) {
                // The request was made and the server responded with a status code outside of 2xx
                const errorMsg = (error.response.data && error.response.data.message) ? error.response.data.message : 'Invalid credentials or server error.';
                showMessage(errorMsg, 'danger');
            } else if (error.request) {
                // The request was made but no response was received
                showMessage('No response from server. Please check your network connection.', 'danger');
            } else {
                // Something happened in setting up the request that triggered an Error
                showMessage('An error occurred. Please try again.', 'danger');
            }
            generateCaptcha();
        } finally {
            // Re-enable button and restore text
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Login';
        }
    });

    // Handle OTP Submit
    otpForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const otp = document.getElementById('otpInput').value;
        const userId = sessionStorage.getItem('temp_user_id');
        const btn = otpForm.querySelector('button[type="submit"]');

        if (!otp || !userId) {
            showMessage('Please enter the OTP.', 'warning');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = 'Verifying...';

        try {
            const response = await axios.post(window.location.origin + '/hohoo-ville/api/authentication/Authentication.php?action=verify-otp', {
                user_id: userId,
                otp: otp,
                otp_token: sessionStorage.getItem('temp_otp_token')
            });

            if (response.data.success) {
                const { user, token } = response.data.data;
                sessionStorage.removeItem('temp_user_id');
                sessionStorage.removeItem('temp_otp_token');
                completeLogin(user, token);
            } else {
                showMessage(response.data.message, 'danger');
            }
        } catch (error) {
            console.error('OTP Verification failed:', error);
            const msg = error.response?.data?.message || 'Verification failed';
            showMessage(msg, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Verify OTP';
        }
    });

    document.getElementById('backToLogin').addEventListener('click', function() {
        otpForm.style.display = 'none';
        loginForm.style.display = 'block';
        messageDiv.style.display = 'none';
        generateCaptcha();
    });

    function generateCaptcha() {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        captchaAnswer = num1 + num2;
        document.getElementById('captchaQuestion').textContent = `${num1} + ${num2} = ?`;
        document.getElementById('captchaInput').value = '';
        document.getElementById('captchaInput').placeholder = 'Enter sum';
    }

    function showOtpForm() {
        loginForm.style.display = 'none';
        otpForm.style.display = 'block';
        messageDiv.style.display = 'none';
        showMessage('OTP sent! Please check your database/email.', 'info');
    }

    function completeLogin(user, token) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        redirectToDashboard(user.role);
    }

    function showMessage(msg, type) {
        if (typeof Swal !== 'undefined') {
            let icon = 'info';
            let title = 'Info';
            
            if (type === 'danger') {
                icon = 'error';
                title = 'Error';
            } else if (type === 'success') {
                icon = 'success';
                title = 'Success';
            } else if (type === 'warning') {
                icon = 'warning';
                title = 'Warning';
            }
            Swal.fire({ title: title, text: msg, icon: icon });
        } else {
            messageDiv.textContent = msg;
            messageDiv.className = `alert alert-${type}`;
            messageDiv.style.display = 'block';
        }
    }

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