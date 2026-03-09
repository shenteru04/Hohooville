/**
 * Session Timeout Manager
 * Automatically logs out users after specified idle time
 */

let sessionTimeoutMinutes = 60; // Default timeout
let inactivityTimer = null;
let warningTimer = null;
let lastActivityTime = Date.now();
let isWarningShown = false;

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
    // Clear existing timers
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    
    // Hide warning if shown
    isWarningShown = false;
    closeWarning();
    
    // Update last activity time
    lastActivityTime = Date.now();
    
    // Calculate timeouts
    const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
    const warningTimeMs = Math.max(
        (sessionTimeoutMinutes - 1) * 60 * 1000,
        timeoutMs - 60000 // Show warning 1 minute before logout
    );
    
    // Set warning timer (1 minute before logout)
    warningTimer = setTimeout(() => {
        if (!isWarningShown) {
            isWarningShown = true;
            showTimeoutWarning();
        }
    }, warningTimeMs);
    
    // Set logout timer
    inactivityTimer = setTimeout(() => {
        performLogout();
    }, timeoutMs);
}

function showTimeoutWarning() {
    // Check if SweetAlert2 is available
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Session Timeout Warning',
            html: `Your session will expire in <strong>1 minute</strong> due to inactivity.<br>Click "Continue" to stay logged in.`,
            icon: 'warning',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showCancelButton: true,
            confirmButtonText: 'Continue',
            cancelButtonText: 'Logout Now',
            didOpen: (modal) => {
                // Store modal reference for closing later
                window.timeoutModalOpen = true;
            },
            willClose: (result) => {
                window.timeoutModalOpen = false;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // User clicked Continue - reset the timer
                isWarningShown = false;
                resetInactivityTimer();
            } else {
                // User clicked Logout Now or closed dialog
                performLogout();
            }
        });
    } else {
        // Fallback if SweetAlert is not available
        const userWantsToStay = confirm('Your session will expire in 1 minute due to inactivity. Click OK to stay logged in.');
        if (userWantsToStay) {
            isWarningShown = false;
            resetInactivityTimer();
        } else {
            performLogout();
        }
    }
}

function closeWarning() {
    // Close any open warning dialogs
    if (typeof Swal !== 'undefined' && window.timeoutModalOpen) {
        Swal.close();
        window.timeoutModalOpen = false;
    }
}

function performLogout() {
    // Clear all local storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Show logout message
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Session Expired',
            text: 'Your session has expired due to inactivity. You will be redirected to the login page.',
            icon: 'info',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then(() => {
            redirect();
        });
    } else {
        alert('Your session has expired due to inactivity.');
        redirect();
    }
}

function redirect() {
    // Redirect to login page
    const loginUrl = window.location.origin + '/hohoo-ville/frontend/login.html';
    window.location.href = loginUrl;
}

// Optional: Expose functions to window for external control
window.resetSessionTimeout = resetInactivityTimer;
window.getSessionTimeoutMinutes = () => sessionTimeoutMinutes;
window.setSessionTimeoutMinutes = (minutes) => {
    sessionTimeoutMinutes = minutes;
    resetInactivityTimer();
};
