// Notification Modal Handler
let currentNotification = null;

document.addEventListener('DOMContentLoaded', function() {
    const notificationModal = document.getElementById('notificationModal');
    const closeButtons = document.querySelectorAll('#closeNotificationModal, #closeNotificationModalBtn');
    
    if (closeButtons.length > 0) {
        closeButtons.forEach(btn => {
            btn.addEventListener('click', closeNotificationModal);
        });
    }
    
    // Close modal when clicking outside
    if (notificationModal) {
        window.addEventListener('click', function(event) {
            if (event.target === notificationModal) {
                closeNotificationModal();
            }
        });
    }
    
    // Handle mark as read
    const markAsReadCheckbox = document.getElementById('markAsReadCheckbox');
    if (markAsReadCheckbox) {
        markAsReadCheckbox.addEventListener('change', function() {
            if (currentNotification && this.checked) {
                markNotificationAsRead(currentNotification.id);
            }
        });
    }
});

function openNotificationModal(notification) {
    if (!notification) return;
    
    currentNotification = notification;
    const modal = document.getElementById('notificationModal');
    
    if (!modal) return;
    
    // Update modal content
    const title = document.getElementById('modalNotificationTitle');
    const message = document.getElementById('modalNotificationMessage');
    const description = document.getElementById('modalNotificationDescription');
    const time = document.getElementById('modalNotificationTime');
    const icon = document.getElementById('modalNotificationIcon');
    const details = document.getElementById('modalNotificationDetails');
    const actions = document.getElementById('modalNotificationActions');
    const checkboxContainer = document.getElementById('markAsReadCheckbox');
    
    // Set title
    if (title) title.textContent = notification.title || 'Notification';
    
    // Set message
    if (message) message.textContent = notification.message || 'No message';
    
    // Set description
    if (description) description.textContent = notification.description || '';
    
    // Set timestamp
    if (time) time.textContent = formatNotificationTime(notification.created_at || notification.time);
    
    // Set icon based on notification type
    if (icon) {
        icon.className = 'fas mr-2';
        switch(notification.type) {
            case 'success':
                icon.classList.add('fa-check-circle', 'text-green-500');
                break;
            case 'warning':
                icon.classList.add('fa-exclamation-circle', 'text-yellow-500');
                break;
            case 'error':
                icon.classList.add('fa-times-circle', 'text-red-500');
                break;
            default:
                icon.classList.add('fa-info-circle', 'text-blue-500');
        }
    }
    
    // Set mark as read checkbox
    if (checkboxContainer) {
        checkboxContainer.checked = notification.is_read == 1;
    }
    
    // Show/hide details if available
    if (details) {
        if (notification.details) {
            details.classList.remove('hidden');
            details.innerHTML = `<p class="text-sm text-slate-700">${notification.details}</p>`;
        } else {
            details.classList.add('hidden');
        }
    }
    
    // Show/hide actions if available
    if (actions) {
        if (notification.actions) {
            actions.classList.remove('hidden');
            // Actions could be displayed here as needed
        } else {
            actions.classList.add('hidden');
        }
    }
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = 'auto';
    }
    currentNotification = null;
}

function formatNotificationTime(timestamp) {
    if (!timestamp) return 'Just now';
    
    const notificationDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now - notificationDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    // For older dates, show the actual date
    return notificationDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function markNotificationAsRead(notificationId) {
    if (!notificationId) return;

    let userId = '';
    try {
        const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
        const normalizedUser = storedUser && typeof storedUser === 'object' && storedUser.user
            ? storedUser.user
            : storedUser;
        userId = normalizedUser?.user_id || normalizedUser?.userId || normalizedUser?.id || '';
    } catch (error) {
        console.debug('Could not parse stored user for notifications modal:', error);
    }

    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const query = userId
        ? `action=markRead&id=${encodeURIComponent(notificationId)}&user_id=${encodeURIComponent(userId)}`
        : `action=markRead&id=${encodeURIComponent(notificationId)}`;

    fetch(`/Hohoo-ville/api/notifications.php?${query}`, {
        method: 'GET',
        headers
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && currentNotification) {
            currentNotification.is_read = 1;
        }
    })
    .catch(error => console.error('Error marking notification as read:', error));
}

// Export function to be called from other scripts
window.showNotificationModal = openNotificationModal;
window.closeNotificationModalFunc = closeNotificationModal;
