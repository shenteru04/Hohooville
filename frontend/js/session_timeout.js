/**
 * Session Timeout Manager
 * Automatically logs out users after specified idle time
 */

const SESSION_TIMEOUT_LAST_ACTIVITY_KEY = 'session_timeout_last_activity_at';
const SESSION_TIMEOUT_EXPIRES_AT_KEY = 'session_timeout_expires_at';
const SESSION_TIMEOUT_EXPIRED_AT_KEY = 'session_timeout_expired_at';
const SESSION_TIMEOUT_AUTH_KEYS = ['token', 'user', 'trainer'];

let sessionTimeoutMinutes = 60; // Default timeout
let inactivityTimer = null;
let warningTimer = null;
let lastActivityTime = Date.now();
let isWarningShown = false;
let isSessionExpired = false;
let activityListenersBound = false;
let browserNavigationGuardInstalled = false;
let browserNavigationGuardUrl = '';
let browserNavigationPromptOpen = false;
let serverSessionValidationTimer = null;
let serverSessionValidationInProgress = false;
const SERVER_SESSION_VALIDATION_INTERVAL_MS = 30000;

function hasSweetAlert2() {
    return typeof window.Swal !== 'undefined' && typeof window.Swal.fire === 'function';
}

function hasSweetAlert1() {
    return typeof window.swal === 'function';
}

// Initialize session timeout on page load
document.addEventListener('DOMContentLoaded', initializeSessionTimeout);

// Browser back/forward navigation can restore a page from bfcache without
// rerunning DOMContentLoaded, so re-check the session when that happens.
window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;

    if (handleStartupSessionState()) {
        return;
    }

    if (enforceRolePageAccess()) {
        return;
    }

    verifyServerSession().then((isValid) => {
        if (!isValid || isSessionExpired || !hasStoredSession()) {
            return;
        }

        installBrowserNavigationGuard();
        startServerSessionValidation();
    });
});

// Handle every shared logout control before page-specific click handlers can
// clear local storage.
document.addEventListener('click', async (event) => {
    const logoutControl = event.target.closest('#logoutBtn, [data-logout]');
    if (!logoutControl) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (!window.confirm('Are you sure you want to log out?')) return;

    await invalidateServerSession();
    clearAuthenticatedSession();
    redirect();
}, true);

async function initializeSessionTimeout() {
    if (handleStartupSessionState()) {
        return;
    }

    if (enforceRolePageAccess()) {
        return;
    }

    if (!(await verifyServerSession())) {
        return;
    }

    // Install this before any optional settings request. Trainer and trainee
    // accounts are not allowed to read admin settings, so waiting for that
    // request could leave a short window where browser Back was unguarded.
    installBrowserNavigationGuard();

    try {
        // Fetch the session timeout setting from admin settings
        const apiBase = `${window.location.origin}/Hohoo-ville/api`;
        const response = await fetch(`${apiBase}/role/admin/settings.php?action=get-system-settings`);
        const data = await response.json();
        
        if (data.success && data.data.session_timeout) {
            sessionTimeoutMinutes = parseInt(data.data.session_timeout, 10);
        }
    } catch (error) {
        console.warn('Could not load session timeout settings, using default:', error);
    }

    if (isSessionExpired || !hasStoredSession()) {
        return;
    }

    startInactivityMonitoring();
    startServerSessionValidation();
}

function enforceRolePageAccess() {
    const path = window.location.pathname.toLowerCase();
    const roleSegments = ['admin', 'registrar', 'trainer', 'trainee'];
    const pageRole = roleSegments.find((role) => path.includes(`/html/${role}/`));
    if (!pageRole) {
        return false;
    }

    let storedUser;
    try {
        storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    } catch (error) {
        storedUser = null;
    }

    const currentUser = storedUser?.user && typeof storedUser.user === 'object'
        ? storedUser.user
        : storedUser;
    const userRole = String(currentUser?.role || '').toLowerCase();
    if (!userRole || userRole === pageRole) {
        return false;
    }

    const dashboardPaths = {
        admin: 'html/admin/admin_dashboard.html',
        registrar: 'html/registrar/registrar_dashboard.html',
        trainer: 'html/trainer/trainer_dashboard.html',
        trainee: 'html/trainee/trainee_dashboard.html'
    };
    const dashboardUrl = `${window.location.origin}/Hohoo-ville/frontend/${dashboardPaths[userRole] || 'login.html'}`;
    window.location.replace(dashboardUrl);
    return true;
}

// The API stores one active session ID per account. An older browser receives
// a 401 after another login changes that ID, then returns to the login page.
async function verifyServerSession() {
    if (isSessionExpired || !hasStoredSession() || serverSessionValidationInProgress) return !isSessionExpired;

    serverSessionValidationInProgress = true;
    try {
        const response = await fetch(`${window.location.origin}/Hohoo-ville/api/authentication/Authentication.php?action=verify`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            cache: 'no-store'
        });
        if (response.status === 401) {
            expireSessionReplacedByNewLogin();
            return false;
        }
        return true;
    } catch (error) {
        // Do not sign out a valid user because of a temporary network issue.
        console.warn('Could not verify active server session:', error);
        return true;
    } finally {
        serverSessionValidationInProgress = false;
    }
}

function startServerSessionValidation() {
    if (serverSessionValidationTimer || isSessionExpired) return;
    serverSessionValidationTimer = setInterval(verifyServerSession, SERVER_SESSION_VALIDATION_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') verifyServerSession();
    });
}

function expireSessionReplacedByNewLogin() {
    if (isSessionExpired) return;
    isSessionExpired = true;
    clearTimers();
    if (serverSessionValidationTimer) clearInterval(serverSessionValidationTimer);
    serverSessionValidationTimer = null;
    clearAuthenticatedSession();
    showSessionReplacedMessage();
}

// Keep browser Back/Forward navigation on the current authenticated page.
function installBrowserNavigationGuard() {
    if (browserNavigationGuardInstalled || !hasStoredSession() || isSessionExpired) {
        return;
    }

    browserNavigationGuardInstalled = true;
    browserNavigationGuardUrl = window.location.href;
    history.pushState({ ...(history.state || {}), sessionNavigationGuard: true }, document.title, browserNavigationGuardUrl);
    window.addEventListener('popstate', handleBrowserNavigation);
}

function handleBrowserNavigation(event) {
    if (isSessionExpired || !hasStoredSession()) {
        return;
    }

    // Ignore the popstate generated by the guard's own history.go(1).
    if (event.state?.sessionNavigationGuard) {
        return;
    }

    // A Back navigation has already moved the history pointer. Reverse it
    // immediately so repeated Back clicks cannot consume older page entries.
    history.go(1);

    // Repeated arrow clicks while the prompt is open must not move the page
    // away before the user chooses an explicit action.
    if (browserNavigationPromptOpen) {
        return;
    }

    browserNavigationPromptOpen = true;

    const stayLoggedIn = () => {
        browserNavigationPromptOpen = false;
        resetInactivityTimer();
    };
    const logOut = async () => {
        await invalidateServerSession();
        clearAuthenticatedSession();
        browserNavigationPromptOpen = false;
        redirect();
    };

    if (hasSweetAlert2()) {
        Swal.fire({
            title: 'Leave this session?',
            text: 'Do you want to stay logged in or log out securely?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Log out',
            cancelButtonText: 'Stay logged in',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then((result) => {
            if (result.isConfirmed) {
                logOut();
            } else {
                stayLoggedIn();
            }
        });
        return;
    }

    if (window.confirm('You used browser navigation. Press OK to log out, or Cancel to stay logged in.')) {
        logOut();
    } else {
        stayLoggedIn();
    }
}

function startInactivityMonitoring() {
    bindActivityListeners();

    const storedExpiresAt = getStoredTimestamp(SESSION_TIMEOUT_EXPIRES_AT_KEY);
    if (storedExpiresAt !== null) {
        scheduleLogoutAt(storedExpiresAt);
        return;
    }

    const expiresAt = storeSessionDeadline(Date.now());
    scheduleLogoutAt(expiresAt);
}

function bindActivityListeners() {
    if (activityListenersBound) {
        return;
    }

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];

    activityEvents.forEach((event) => {
        document.addEventListener(event, resetInactivityTimer, true);
    });

    window.addEventListener('storage', handleSessionStorageChange);
    activityListenersBound = true;
}

function resetInactivityTimer() {
    if (isSessionExpired || !hasStoredSession()) {
        return;
    }

    clearTimers();
    isWarningShown = false;
    closeWarning();

    const expiresAt = storeSessionDeadline(Date.now());
    scheduleLogoutAt(expiresAt);
}

function showTimeoutWarning() {
    performLogout();
}

function closeWarning() {
    // Close any open warning dialogs
    if (hasSweetAlert2() && window.timeoutModalOpen) {
        Swal.close();
        window.timeoutModalOpen = false;
    } else if (hasSweetAlert1() && window.timeoutModalOpen && typeof window.swal.close === 'function') {
        window.swal.close();
        window.timeoutModalOpen = false;
    }
}

function performLogout() {
    if (isSessionExpired) {
        return;
    }

    expireCurrentSession();
    showSessionExpiredMessage();
}

function handleStartupSessionState() {
    const expiredAt = getStoredTimestamp(SESSION_TIMEOUT_EXPIRED_AT_KEY);
    if (expiredAt !== null) {
        expireCurrentSession(expiredAt);
        showSessionExpiredMessage();
        return true;
    }

    if (!hasStoredSession()) {
        redirect();
        return true;
    }

    const expiresAt = getStoredTimestamp(SESSION_TIMEOUT_EXPIRES_AT_KEY);
    if (expiresAt !== null && Date.now() >= expiresAt) {
        performLogout();
        return true;
    }

    return false;
}

function expireCurrentSession(expiredAt = Date.now()) {
    if (isSessionExpired) {
        return;
    }

    isSessionExpired = true;
    clearTimers();
    localStorage.setItem(SESSION_TIMEOUT_EXPIRED_AT_KEY, String(expiredAt));
    clearAuthenticatedSession();
}

async function invalidateServerSession() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        await fetch(`${window.location.origin}/Hohoo-ville/api/authentication/Authentication.php?action=logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            keepalive: true
        });
    } catch (error) {
        // Local credentials are still removed; the server token will expire.
        console.warn('Server logout could not be completed:', error);
    }
}

function showSessionExpiredMessage() {
    const message = `Your ${sessionTimeoutMinutes}-minute session expired due to inactivity. Click OK to log in again.`;

    if (hasSweetAlert2()) {
        window.timeoutModalOpen = true;
        Swal.fire({
            title: 'Session Expired',
            text: message,
            icon: 'warning',
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonText: 'OK'
        }).then(() => {
            window.timeoutModalOpen = false;
            redirect();
        });
        return;
    } else if (hasSweetAlert1()) {
        window.timeoutModalOpen = true;
        swal({
            title: 'Session Expired',
            text: message,
            type: 'warning',
            confirmButtonText: 'OK'
        }, function() {
            window.timeoutModalOpen = false;
            redirect();
        });
        return;
    }

    alert(message);
    redirect();
}

function showSessionReplacedMessage() {
    const message = 'This account was signed in from another browser or device. Please log in again if you need to continue.';
    if (hasSweetAlert2()) {
        Swal.fire({
            title: 'Session Ended',
            text: message,
            icon: 'info',
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonText: 'Go to Login'
        }).then(redirect);
        return;
    }
    alert(message);
    redirect();
}

function scheduleLogoutAt(expiresAt) {
    if (isSessionExpired) {
        return;
    }

    clearTimers();

    const remainingMs = Math.max(expiresAt - Date.now(), 0);
    if (remainingMs === 0) {
        performLogout();
        return;
    }

    inactivityTimer = setTimeout(() => {
        if (isSessionExpired) {
            return;
        }

        isWarningShown = true;
        performLogout();
    }, remainingMs);
}

function clearTimers() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    inactivityTimer = null;
    warningTimer = null;
}

function getTimeoutMs() {
    return Math.max(sessionTimeoutMinutes, 1) * 60 * 1000;
}

function storeSessionDeadline(referenceTime = Date.now()) {
    const expiresAt = referenceTime + getTimeoutMs();
    lastActivityTime = referenceTime;
    localStorage.setItem(SESSION_TIMEOUT_LAST_ACTIVITY_KEY, String(referenceTime));
    localStorage.setItem(SESSION_TIMEOUT_EXPIRES_AT_KEY, String(expiresAt));
    localStorage.removeItem(SESSION_TIMEOUT_EXPIRED_AT_KEY);
    return expiresAt;
}

function getStoredTimestamp(key) {
    const rawValue = localStorage.getItem(key);
    if (rawValue === null) {
        return null;
    }

    const timestamp = Number(rawValue);
    return Number.isFinite(timestamp) ? timestamp : null;
}

function hasStoredSession() {
    return Boolean(localStorage.getItem('token') && localStorage.getItem('user'));
}

function clearAuthenticatedSession() {
    SESSION_TIMEOUT_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(SESSION_TIMEOUT_LAST_ACTIVITY_KEY);
    localStorage.removeItem(SESSION_TIMEOUT_EXPIRES_AT_KEY);
    sessionStorage.clear();
}

function handleSessionStorageChange(event) {
    if (event.key === SESSION_TIMEOUT_EXPIRED_AT_KEY && event.newValue && !isSessionExpired) {
        expireCurrentSession(Number(event.newValue) || Date.now());
        showSessionExpiredMessage();
        return;
    }

    if ((event.key === 'token' || event.key === 'user') && !hasStoredSession() && !isSessionExpired) {
        redirect();
        return;
    }

    if (event.key === SESSION_TIMEOUT_EXPIRES_AT_KEY && event.newValue && !isSessionExpired) {
        const expiresAt = getStoredTimestamp(SESSION_TIMEOUT_EXPIRES_AT_KEY);
        if (expiresAt !== null) {
            scheduleLogoutAt(expiresAt);
        }
    }
}

function redirect() {
    const loginUrl = `${window.location.origin}/Hohoo-ville/frontend/login.html`;
    window.location.replace(loginUrl);
}

// Optional: Expose functions to window for external control
window.resetSessionTimeout = resetInactivityTimer;
window.getSessionTimeoutMinutes = () => sessionTimeoutMinutes;
window.setSessionTimeoutMinutes = (minutes) => {
    sessionTimeoutMinutes = minutes;
    if (!hasStoredSession() || isSessionExpired) {
        return;
    }

    const lastStoredActivity = getStoredTimestamp(SESSION_TIMEOUT_LAST_ACTIVITY_KEY) ?? Date.now();
    const expiresAt = storeSessionDeadline(lastStoredActivity);
    if (expiresAt <= Date.now()) {
        performLogout();
        return;
    }

    scheduleLogoutAt(expiresAt);
};
