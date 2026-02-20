const NOTIF_API_URL = '/Hohoo-ville/api/notifications.php';

let notificationPollInterval;

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (user && user.user_id) {
        // Initial check
        checkNotifications(user.user_id);
        
        // Poll every 30 seconds
        notificationPollInterval = setInterval(() => checkNotifications(user.user_id), 30000);
    }
});

async function checkNotifications(userId) {
    try {
        const response = await axios.get(`${NOTIF_API_URL}?action=get&user_id=${userId}`);
        if (response.data && response.data.length > 0) {
            updateNotificationUI(response.data);
        } else {
            updateNotificationUI([]);
        }
    } catch (error) {
        // console.error('Error checking notifications:', error);
        if (error.response && error.response.status === 404) {
            console.warn('Notification API not found. Polling stopped.');
            clearInterval(notificationPollInterval);
        }
    }
}

function updateNotificationUI(notifications) {
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');
    
    // Count unread notifications
    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    // Update Badge Count
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    // Update Dropdown List
    if (list) {
        list.innerHTML = '';
        
        if (notifications.length === 0) {
            list.innerHTML = '<div class="list-group-item text-center small text-muted">No notifications</div>';
        } else {
            notifications.forEach(notif => {
                const dateObj = new Date(notif.time);
                const date = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const readClass = notif.is_read ? '' : 'fw-bold';
                const item = document.createElement('div');
                item.className = `list-group-item list-group-item-action ${readClass}`;
                item.style.cursor = 'pointer';
                item.innerHTML = `
                    <div class="d-flex w-100 justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${notif.title || 'Notification'}</h6>
                            <p class="mb-1 small">${notif.message}</p>
                            <small class="text-muted">${date}</small>
                        </div>
                        <span class="badge ${notif.is_read ? 'bg-light text-muted' : 'bg-primary'} flex-shrink-0"></span>
                    </div>
                `;
                item.onclick = (e) => handleNotificationClick(e, notif.id, notif.link);
                list.appendChild(item);
            });
        }
    }
}

window.handleNotificationClick = async function(event, id, link) {
    event.preventDefault();
    event.stopPropagation();
    try {
        await axios.get(`${NOTIF_API_URL}?action=markRead&id=${id}`);
        // Redirect if a link is provided
        if (link) window.location.href = link;
    } catch (error) {
        console.error('Error marking read:', error);
        if (link) window.location.href = link;
    }
};