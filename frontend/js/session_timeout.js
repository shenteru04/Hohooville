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

function hasSweetAlert2() {
    return typeof window.Swal !== 'undefined' && typeof window.Swal.fire === 'function';
}

function hasSweetAlert1() {
    return typeof window.swal === 'function';
}

// Initialize session timeout on page load
document.addEventListener('DOMContentLoaded', initializeSessionTimeout);

async function initializeSessionTimeout() {
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

    if (handleStartupSessionState()) {
        return;
    }

    startInactivityMonitoring();
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
    window.location.href = loginUrl;
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
