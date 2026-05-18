const AUTH_ENDPOINT = `${window.location.origin}/hohoo-ville/api/authentication/Authentication.php`;
const REMEMBERED_USERNAME_KEY = 'remembered_username';
const SESSION_TIMEOUT_LAST_ACTIVITY_KEY = 'session_timeout_last_activity_at';
const SESSION_TIMEOUT_EXPIRES_AT_KEY = 'session_timeout_expires_at';
const SESSION_TIMEOUT_EXPIRED_AT_KEY = 'session_timeout_expired_at';

document.addEventListener('DOMContentLoaded', () => {
    if (redirectIfLoggedIn()) {
        return;
    }

    const elements = {
        loginForm: document.getElementById('loginForm'),
        otpForm: document.getElementById('otpForm'),
        username: document.getElementById('username'),
        password: document.getElementById('password'),
        captchaQuestion: document.getElementById('captchaQuestion'),
        captchaInput: document.getElementById('captchaInput'),
        refreshCaptcha: document.getElementById('refreshCaptcha'),
        rememberMe: document.getElementById('rememberMe'),
        loginSubmit: document.getElementById('loginSubmit'),
        otpSubmit: document.getElementById('otpSubmit'),
        otpInput: document.getElementById('otpInput'),
        message: document.getElementById('message'),
        backToLogin: document.getElementById('backToLogin'),
        togglePassword: document.getElementById('togglePassword'),
        eyeIcon: document.getElementById('eyeIcon')
    };

    if (!elements.loginForm || !elements.otpForm) {
        return;
    }

    let captchaAnswer = 0;

    restoreRememberedUsername(elements);
    generateCaptcha(elements, (value) => {
        captchaAnswer = value;
    });

    elements.loginForm.addEventListener('submit', (event) => handleLogin(event, elements, () => captchaAnswer, (value) => {
        captchaAnswer = value;
    }));
    elements.otpForm.addEventListener('submit', (event) => handleOtp(event, elements, (value) => {
        captchaAnswer = value;
    }));
    elements.refreshCaptcha?.addEventListener('click', () => generateCaptcha(elements, (value) => {
        captchaAnswer = value;
    }));
    elements.backToLogin?.addEventListener('click', () => showLoginForm(elements, (value) => {
        captchaAnswer = value;
    }));
    elements.togglePassword?.addEventListener('click', () => togglePasswordVisibility(elements));
    elements.otpInput?.addEventListener('input', () => {
        elements.otpInput.value = elements.otpInput.value.replace(/\D/g, '').slice(0, 6);
    });
});

function redirectIfLoggedIn() {
    if (localStorage.getItem(SESSION_TIMEOUT_EXPIRED_AT_KEY)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('trainer');
        return false;
    }

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
        return false;
    }

    try {
        const user = JSON.parse(storedUser);
        if (user && user.role) {
            redirectToDashboard(user.role);
            return true;
        }
    } catch (error) {
        console.error('Unable to parse stored user session:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }

    return false;
}

function restoreRememberedUsername(elements) {
    const rememberedUsername = localStorage.getItem(REMEMBERED_USERNAME_KEY);
    if (!rememberedUsername) {
        return;
    }

    elements.username.value = rememberedUsername;
    elements.rememberMe.checked = true;
}

async function handleLogin(event, elements, getCaptchaAnswer, setCaptchaAnswer) {
    event.preventDefault();
    clearMessage(elements);

    const username = elements.username.value.trim();
    const password = elements.password.value;
    const captchaValue = elements.captchaInput.value.trim();
    const captchaInput = Number(captchaValue);

    if (!username || !password || !captchaValue || Number.isNaN(captchaInput)) {
        showMessage(elements, 'Please complete all fields before signing in.', 'danger');
        return;
    }

    if (captchaInput !== getCaptchaAnswer()) {
        showMessage(elements, 'The security answer is incorrect. Please try again.', 'danger');
        generateCaptcha(elements, setCaptchaAnswer);
        elements.captchaInput.focus();
        return;
    }

    setButtonLoading(elements.loginSubmit, true, 'Checking credentials');

    try {
        const response = await axios.post(`${AUTH_ENDPOINT}?action=login`, {
            username,
            password,
            captcha_input: captchaInput,
            captcha_challenge: getCaptchaAnswer()
        });

        if (response.data?.success) {
            if (response.data.data?.require_otp) {
                persistRememberedUsername(elements.rememberMe.checked, username);
                sessionStorage.setItem('temp_user_id', response.data.data.user_id);
                sessionStorage.setItem('temp_otp_token', response.data.data.otp_token);
                showOtpForm(elements);
                showMessage(elements, 'Verification code sent. Enter the 6-digit OTP to continue.', 'info');
                return;
            }

            const { user, token } = response.data.data;
            persistRememberedUsername(elements.rememberMe.checked, username);
            completeLogin(user, token);
            return;
        }

        showMessage(elements, response.data?.message || 'Login failed. Please try again.', 'danger');
        generateCaptcha(elements, setCaptchaAnswer);
    } catch (error) {
        console.error('Login failed:', error);

        if (error.response?.data?.message) {
            showMessage(elements, error.response.data.message, 'danger');
        } else if (error.request) {
            showMessage(elements, 'No response from server. Please check your connection and try again.', 'danger');
        } else {
            showMessage(elements, 'An unexpected error occurred while signing in.', 'danger');
        }

        generateCaptcha(elements, setCaptchaAnswer);
    } finally {
        setButtonLoading(elements.loginSubmit, false);
    }
}

async function handleOtp(event, elements, setCaptchaAnswer) {
    event.preventDefault();
    clearMessage(elements);

    const otp = elements.otpInput.value.trim();
    const userId = sessionStorage.getItem('temp_user_id');
    const otpToken = sessionStorage.getItem('temp_otp_token');

    if (!otp || !userId || !otpToken) {
        showMessage(elements, 'Please enter the OTP to continue.', 'warning');
        return;
    }

    if (otp.length !== 6) {
        showMessage(elements, 'Please enter the full 6-digit OTP.', 'warning');
        return;
    }

    setButtonLoading(elements.otpSubmit, true, 'Verifying code');

    try {
        const response = await axios.post(`${AUTH_ENDPOINT}?action=verify-otp`, {
            user_id: userId,
            otp,
            otp_token: otpToken
        });

        if (response.data?.success) {
            sessionStorage.removeItem('temp_user_id');
            sessionStorage.removeItem('temp_otp_token');

            const { user, token } = response.data.data;
            completeLogin(user, token);
            return;
        }

        showMessage(elements, response.data?.message || 'Verification failed. Please try again.', 'danger');
    } catch (error) {
        console.error('OTP verification failed:', error);
        showMessage(elements, error.response?.data?.message || 'Verification failed. Please try again.', 'danger');
    } finally {
        setButtonLoading(elements.otpSubmit, false);
    }
}

function generateCaptcha(elements, setCaptchaAnswer = null) {
    const firstNumber = Math.floor(Math.random() * 10) + 1;
    const secondNumber = Math.floor(Math.random() * 10) + 1;
    const answer = firstNumber + secondNumber;

    elements.captchaQuestion.textContent = `${firstNumber} + ${secondNumber}`;
    elements.captchaInput.value = '';
    elements.captchaInput.placeholder = 'Type the answer';

    if (typeof setCaptchaAnswer === 'function') {
        setCaptchaAnswer(answer);
    }
}

function showOtpForm(elements) {
    elements.loginForm.classList.add('hidden');
    elements.otpForm.classList.remove('hidden');
    elements.otpInput.value = '';
    requestAnimationFrame(() => elements.otpInput.focus());
}

function showLoginForm(elements, setCaptchaAnswer) {
    elements.otpForm.classList.add('hidden');
    elements.loginForm.classList.remove('hidden');
    sessionStorage.removeItem('temp_user_id');
    sessionStorage.removeItem('temp_otp_token');
    clearMessage(elements);
    generateCaptcha(elements, setCaptchaAnswer);
    requestAnimationFrame(() => elements.username.focus());
}

function togglePasswordVisibility(elements) {
    const isHidden = elements.password.type === 'password';
    elements.password.type = isHidden ? 'text' : 'password';
    elements.eyeIcon.classList.toggle('fa-eye', !isHidden);
    elements.eyeIcon.classList.toggle('fa-eye-slash', isHidden);
    elements.togglePassword.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
}

function persistRememberedUsername(shouldRemember, username) {
    if (shouldRemember) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
        return;
    }

    localStorage.removeItem(REMEMBERED_USERNAME_KEY);
}

function setButtonLoading(button, isLoading, label = '') {
    if (!button) {
        return;
    }

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
    elements.message.className = 'message-banner mt-5 rounded-2xl border px-4 py-3 text-sm';
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
    elements.message.className = `message-banner mt-5 rounded-2xl border px-4 py-3 text-sm ${variants[type] || variants.info}`;
    elements.message.hidden = false;
}

function completeLogin(user, token) {
    clearSessionTimeoutState();
    localStorage.setItem('user', JSON.stringify(user));
    if (token) {
        localStorage.setItem('token', token);
    }
    redirectToDashboard(user.role);
}

function clearSessionTimeoutState() {
    localStorage.removeItem(SESSION_TIMEOUT_LAST_ACTIVITY_KEY);
    localStorage.removeItem(SESSION_TIMEOUT_EXPIRES_AT_KEY);
    localStorage.removeItem(SESSION_TIMEOUT_EXPIRED_AT_KEY);
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
            window.location.href = './html/trainee/trainee_dashboard.html';
            break;
        case 'registrar':
            window.location.href = './html/registrar/registrar_dashboard.html';
            break;
        default:
            console.error('Unknown user role:', role);
    }
}
