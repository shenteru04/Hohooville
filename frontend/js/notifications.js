const NOTIF_API_URL = '/Hohoo-ville/api/notifications.php';

let notificationPollInterval;
let currentUser = null;
let currentUserRole = null;

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    currentUser = user || null;
    currentUserRole = user?.role || null;

    if (user && user.user_id) {
        // Initial check
        checkNotifications(user.user_id);
        
        // Poll every 30 seconds
        notificationPollInterval = setInterval(() => checkNotifications(user.user_id), 30000);
    }

    // Dropdown toggle logic
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('#notificationBtn');
        const dropdown = document.getElementById('notificationDropdown');
        
        if (btn) {
            if (dropdown) {
                if (dropdown.classList.contains('hidden')) {
                    dropdown.classList.remove('hidden');
                    // Small delay to allow display:block to apply before transition
                    requestAnimationFrame(() => {
                        dropdown.classList.remove('scale-95', 'opacity-0');
                        dropdown.classList.add('scale-100', 'opacity-100');
                    });
                } else {
                    closeDropdown(dropdown);
                }
            }
            e.stopPropagation();
        } else {
            // Close if clicked outside
            if (dropdown && !dropdown.classList.contains('hidden') && !e.target.closest('#notificationDropdown')) {
                closeDropdown(dropdown);
            }
        }
    });
});

function closeDropdown(dropdown) {
    dropdown.classList.remove('scale-100', 'opacity-100');
    dropdown.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        dropdown.classList.add('hidden');
    }, 200);
}

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
    const filteredNotifications = filterNotificationsByRole(notifications, currentUserRole);
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');
    
    // Count unread notifications
    const unreadCount = filteredNotifications.filter(n => !n.is_read).length;
    
    // Update Badge Count
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'inline-flex'; // Use flex to better center content
        } else {
            badge.style.display = 'none';
        }
    }

    // Update Dropdown List with Tailwind classes
    if (list) {
        list.innerHTML = '';
        
        if (filteredNotifications.length === 0) {
            list.innerHTML = '<div class="px-4 py-3 text-center text-sm text-gray-500">No notifications</div>';
        } else {
            const header = document.createElement('div');
            header.className = 'px-4 py-2 border-b border-gray-200 text-sm font-semibold text-gray-700';
            header.textContent = 'Notifications';
            list.appendChild(header);

            filteredNotifications.forEach(notif => {
                const dateObj = new Date(notif.time);
                const date = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const item = document.createElement('a');
                item.href = notif.link || '#';
                item.className = `block px-4 py-3 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-0 ${!notif.is_read ? 'bg-blue-50' : ''}`;
                
                item.innerHTML = `
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex-grow">
                            <h6 class="text-sm font-semibold text-gray-800 ${!notif.is_read ? 'font-bold' : ''}">${notif.title || 'Notification'}</h6>
                            <p class="text-sm text-gray-600 mt-1">${notif.message}</p>
                            <p class="text-xs text-gray-500 mt-1">${date}</p>
                        </div>
                        ${!notif.is_read ? '<div class="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>' : ''}
                    </div>
                `;
                item.addEventListener('click', (e) => handleNotificationClick(e, notif.id, notif.link));
                list.appendChild(item);
            });
        }
    }
}

function filterNotificationsByRole(notifications, role) {
    if (!Array.isArray(notifications) || !role) return notifications || [];
    return notifications.filter(notif => isLinkAllowedForRole(notif.link, role));
}

function isLinkAllowedForRole(link, role) {
    if (!link) return true;
    const path = String(link).toLowerCase();
    const roleMatch = ['admin', 'registrar', 'trainer', 'trainee'].find(r => path.includes(`/html/${r}/`));
    if (!roleMatch) return true;
    return roleMatch === role;
}

window.handleNotificationClick = async function(event, id, link) {
    event.preventDefault();
    event.stopPropagation();
    try {
        await axios.get(`${NOTIF_API_URL}?action=markRead&id=${id}`);
        // Redirect if a link is provided
        if (link && isLinkAllowedForRole(link, currentUserRole)) {
            window.location.href = link;
        }
    } catch (error) {
        console.error('Error marking read:', error);
        if (link && isLinkAllowedForRole(link, currentUserRole)) {
            window.location.href = link;
        }
    }
};
