const NOTIF_API_URL = 'http://localhost/Hohoo-ville/api/role/trainer/notifications.php';

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
        const response = await axios.get(`${NOTIF_API_URL}?action=get-unread&user_id=${userId}`);
        if (response.data.success) {
            updateNotificationUI(response.data.data);
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
    
    // Update Badge Count
    if (badge) {
        if (notifications.length > 0) {
            badge.textContent = notifications.length;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    // Update Dropdown List
    if (list) {
        list.innerHTML = '';
        
        if (notifications.length === 0) {
            list.innerHTML = '<li><span class="dropdown-item text-center small text-muted">No new notifications</span></li>';
        } else {
            // Header
            list.innerHTML += '<li><h6 class="dropdown-header">Alerts Center</h6></li>';
            
            notifications.forEach(notif => {
                const date = new Date(notif.created_at).toLocaleDateString() + ' ' + new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const item = document.createElement('li');
                item.innerHTML = `
                    <a class="dropdown-item d-flex align-items-center" href="#" onclick="handleNotificationClick(event, ${notif.notification_id}, '${notif.link}')">
                        <div class="me-3">
                            <div class="icon-circle bg-primary text-white rounded-circle p-2">
                                <i class="fas fa-file-alt"></i>
                            </div>
                        </div>
                        <div>
                            <div class="small text-muted">${date}</div>
                            <span class="fw-bold d-block">${notif.title || 'Notification'}</span>
                            <span class="small">${notif.message}</span>
                        </div>
                    </a>
                `;
                list.appendChild(item);
            });
        }
    }
}

window.handleNotificationClick = async function(event, id, link) {
    event.preventDefault();
    try {
        await axios.post(`${NOTIF_API_URL}?action=mark-read`, { notification_id: id });
        // Redirect if a link is provided
        if (link) window.location.href = link;
    } catch (error) {
        console.error('Error marking read:', error);
        if (link) window.location.href = link;
    }
};