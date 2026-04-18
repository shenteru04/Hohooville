const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api/authentication/Authentication.php`;

document.addEventListener('DOMContentLoaded', function() {
    const elements = {
        forgotPasswordForm: document.getElementById('forgot-password-form'),
        resetPasswordForm: document.getElementById('reset-password-form'),
        emailInput: document.getElementById('email'),
        otpInput: document.getElementById('otp'),
        newPasswordInput: document.getElementById('new-password'),
        confirmPasswordInput: document.getElementById('confirm-password'),
        sendOtpBtn: document.getElementById('sendOtpBtn'),
        resetPasswordBtn: document.getElementById('resetPasswordBtn'),
        backToEmailBtn: document.getElementById('backToEmailBtn'),
        message: document.getElementById('message'),
        successCard: document.getElementById('success-card')
    };

    let resetData = {}; // To store user_id and otp_token

    // Handle Forgot Password (Step 1)
    elements.forgotPasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearMessage(elements);
        const email = elements.emailInput.value.trim();

        if (!email) {
            showMessage(elements, 'Please enter your email address.', 'warning');
            return;
        }

        setButtonLoading(elements.sendOtpBtn, true, 'Sending verification code');

        try {
            const response = await axios.post(`${API_BASE_URL}?action=forgot-password`, { email });

            if (response.data.success) {
                resetData.user_id = response.data.data.user_id;
                resetData.otp_token = response.data.data.otp_token;

                elements.forgotPasswordForm.classList.add('hidden');
                elements.resetPasswordForm.classList.remove('hidden');
                elements.otpInput.focus();
                showMessage(elements, 'Verification code sent! Check your email.', 'success');
            } else {
                showMessage(elements, response.data.message || 'Failed to send verification code.', 'danger');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            const message = error.response?.data?.message || 'An error occurred. Please try again.';
            showMessage(elements, message, 'danger');
        } finally {
            setButtonLoading(elements.sendOtpBtn, false);
        }
    });

    // Handle Reset Password (Step 2)
    elements.resetPasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearMessage(elements);

        const otp = elements.otpInput.value.trim();
        const newPassword = elements.newPasswordInput.value;
        const confirmPassword = elements.confirmPasswordInput.value;

        if (!otp || !newPassword || !confirmPassword) {
            showMessage(elements, 'Please complete all fields.', 'warning');
            return;
        }

        if (otp.length !== 6) {
            showMessage(elements, 'Please enter the complete 6-digit code.', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage(elements, 'Passwords do not match.', 'warning');
            return;
        }

        if (newPassword.length < 8) {
            showMessage(elements, 'Password must be at least 8 characters long.', 'warning');
            return;
        }

        setButtonLoading(elements.resetPasswordBtn, true, 'Resetting password');

        const payload = {
            user_id: resetData.user_id,
            otp_token: resetData.otp_token,
            otp: otp,
            new_password: newPassword
        };

        try {
            const response = await axios.post(`${API_BASE_URL}?action=confirm-reset-password`, payload);

            if (response.data.success) {
                elements.resetPasswordForm.classList.add('hidden');
                elements.successCard.classList.remove('hidden');
            } else {
                showMessage(elements, response.data.message || 'Failed to reset password.', 'danger');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            const message = error.response?.data?.message || 'An error occurred. Please try again.';
            showMessage(elements, message, 'danger');
        } finally {
            setButtonLoading(elements.resetPasswordBtn, false);
        }
    });

    // Back to Email button
    elements.backToEmailBtn.addEventListener('click', function(e) {
        e.preventDefault();
        elements.resetPasswordForm.classList.add('hidden');
        elements.forgotPasswordForm.classList.remove('hidden');
        clearMessage(elements);
        elements.resetPasswordForm.reset();
        elements.emailInput.focus();
        resetData = {};
    });

    // OTP input formatter - only allow numbers and limit to 6 digits
    elements.otpInput.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').slice(0, 6);
    });

    function setButtonLoading(button, isLoading, label = '') {
        if (!button) return;

        if (isLoading) {
            if (!button.dataset.originalHtml) {
                button.dataset.originalHtml = button.innerHTML;
            }

            button.disabled = true;
            button.innerHTML = `
                <span class="inline-flex items-center gap-2">
                    <span class="spin inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span>
                    <span>${label}...</span>
                </span>
            `;
            return;
        }

        button.disabled = false;
        if (button.dataset.originalHtml) {
            button.innerHTML = button.dataset.originalHtml;
        }
    }

    function clearMessage(elements) {
        elements.message.hidden = true;
        elements.message.className = 'message-banner mt-3 hidden rounded-lg border px-3 py-2 text-xs sm:mt-5 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm';
        elements.message.textContent = '';
    }

    function showMessage(elements, message, type = 'info') {
        const variants = {
            danger: 'border-rose-200 bg-rose-50 text-rose-700',
            warning: 'border-amber-200 bg-amber-50 text-amber-700',
            success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            info: 'border-teal-200 bg-teal-50 text-teal-700'
        };

        clearMessage(elements);
        elements.message.textContent = message;
        elements.message.className = `message-banner mt-3 rounded-lg border px-3 py-2 text-xs sm:mt-5 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm ${variants[type] || variants.info}`;
        elements.message.hidden = false;
    }
});