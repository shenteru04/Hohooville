const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const resetPasswordForm = document.getElementById('reset-password-form');

    const emailCard = document.getElementById('email-card');
    const resetCard = document.getElementById('reset-card');
    const successCard = document.getElementById('success-card');
    const alertContainer = document.getElementById('alert-container');

    let resetData = {}; // To store user_id and otp_token

    // Handle Forgot Password (Step 1)
    forgotPasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';

        try {
            const response = await axios.post(`${API_BASE_URL}/authentication/Authentication.php?action=forgot-password`, { email });

            if (response.data.success) {
                resetData.user_id = response.data.data.user_id;
                resetData.otp_token = response.data.data.otp_token;

                emailCard.classList.add('d-none');
                resetCard.classList.remove('d-none');
                clearAlert();
            } else {
                showAlert(response.data.message, 'danger');
            }
        } catch (error) {
            const message = error.response?.data?.message || 'An error occurred. Please try again.';
            showAlert(message, 'danger');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Send OTP';
        }
    });

    // Handle Reset Password (Step 2)
    resetPasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const otp = document.getElementById('otp').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            showAlert('Passwords do not match.', 'warning');
            return;
        }

        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Resetting...';

        const payload = {
            user_id: resetData.user_id,
            otp_token: resetData.otp_token,
            otp: otp,
            new_password: newPassword
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/authentication/Authentication.php?action=confirm-reset-password`, payload);

            if (response.data.success) {
                resetCard.classList.add('d-none');
                successCard.classList.remove('d-none');
                clearAlert();
            } else {
                showAlert(response.data.message, 'danger');
            }
        } catch (error) {
            const message = error.response?.data?.message || 'An error occurred. Please try again.';
            showAlert(message, 'danger');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Reset Password';
        }
    });

    function showAlert(message, type = 'danger') {
        alertContainer.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
    }

    function clearAlert() {
        alertContainer.innerHTML = '';
    }
});