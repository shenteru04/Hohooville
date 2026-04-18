/**
 * Session Timeout Manager
 * Automatically logs out users after specified idle time
 */

let sessionTimeoutMinutes = 60; // Default timeout
let inactivityTimer = null;
let warningTimer = null;
let lastActivityTime = Date.now();
let isWarningShown = false;
let isSessionExpired = false;

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
        
        // Start monitoring inactivity
        startInactivityMonitoring();
    } catch (error) {
        console.warn('Could not load session timeout settings, using default:', error);
        // Use default and still start monitoring
        startInactivityMonitoring();
    }
}

function startInactivityMonitoring() {
    // Activity events to track
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
    
    activityEvents.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
    
    // Set initial timer
    resetInactivityTimer();
}

function resetInactivityTimer() {
    if (isSessionExpired) {
        return;
    }

    // Clear existing timers
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    
    // Hide warning if shown
    isWarningShown = false;
    closeWarning();
    
    // Update last activity time
    lastActivityTime = Date.now();
    
    // Use the configured value as the exact inactivity duration.
    const timeoutMs = Math.max(sessionTimeoutMinutes, 1) * 60 * 1000;

    inactivityTimer = setTimeout(() => {
        if (isSessionExpired) {
            return;
        }

        isWarningShown = true;
        performLogout();
    }, timeoutMs);
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

    isSessionExpired = true;

    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);

    // Clear all local storage
    localStorage.clear();
    sessionStorage.clear();
    
    const message = `Your ${sessionTimeoutMinutes}-minute session expired due to inactivity. Click OK to log in again.`;

    // Show logout message
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
    } else {
        alert(message);
        redirect();
    }
}

function redirect() {
    // Redirect to login page
    const loginUrl = window.location.origin + '/Hohoo-ville/frontend/login.html';
    window.location.href = loginUrl;
}

// Optional: Expose functions to window for external control
window.resetSessionTimeout = resetInactivityTimer;
window.getSessionTimeoutMinutes = () => sessionTimeoutMinutes;
window.setSessionTimeoutMinutes = (minutes) => {
    sessionTimeoutMinutes = minutes;
    resetInactivityTimer();
};
