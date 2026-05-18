const NOTIF_API_URL = '/Hohoo-ville/api/notifications.php';
const NOTIFICATION_POLL_INTERVAL_MS = 10000;
const NOTIFICATION_SOUND_FILE_URL = '/Hohoo-ville/frontend/audio/notification.mp3';
const NOTIFICATION_RECENT_SOUND_WINDOW_MS = 30000;

let notificationPollInterval;
let currentUser = null;
let currentUserRole = null;
let latestNotifications = [];
let notificationDomObserver = null;
let unreadNotificationIds = new Set();
let hasHydratedNotifications = false;
let notificationAudioUnlocked = false;
let notificationAudioUnlockBound = false;
let notificationChimeSource = null;
let notificationChimeTemplate = null;
let notificationAudioContext = null;
let pendingNotificationChime = false;
let notificationChimeFrameId = null;

document.addEventListener('DOMContentLoaded', function () {
    const user = getStoredUser();
    currentUser = user || null;
    currentUserRole = detectCurrentRole(user);

    observeNotificationMount();
    setupNotificationAudioUnlock();
    setupNotificationRefreshTriggers();

    if (user && user.user_id) {
        checkNotifications(user.user_id);
        notificationPollInterval = setInterval(() => checkNotifications(user.user_id), NOTIFICATION_POLL_INTERVAL_MS);
    }

    refreshHeaderProfileChip();

    document.addEventListener('click', function (e) {
        const btn = e.target.closest('#notificationBtn');
        const dropdown = document.getElementById('notificationDropdown');
        const backdrop = document.getElementById('notificationBackdrop');

        if (btn) {
            if (dropdown) {
                if (dropdown.classList.contains('hidden')) {
                    dropdown.classList.remove('hidden', 'scale-95', 'opacity-0');
                    dropdown.classList.add('scale-100', 'opacity-100');
                    if (backdrop) {
                        backdrop.classList.remove('hidden');
                    }
                    requestAnimationFrame(() => {
                        dropdown.classList.add('scale-100', 'opacity-100');
                    });
                } else {
                    closeDropdown(dropdown, backdrop);
                }
            }
            e.stopPropagation();
        } else if (
            (dropdown && !dropdown.classList.contains('hidden') && !e.target.closest('#notificationDropdown')) ||
            (backdrop && e.target === backdrop)
        ) {
            closeDropdown(dropdown, backdrop);
        }
    });
});

function getStoredUser() {
    try {
        const raw = JSON.parse(localStorage.getItem('user') || 'null');
        if (raw && typeof raw === 'object' && raw.user && typeof raw.user === 'object') {
            return raw.user;
        }
        return raw;
    } catch (error) {
        console.debug('Could not parse stored user:', error);
        return null;
    }
}

function getAuthConfig(extraHeaders = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        ...extraHeaders
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return Object.keys(headers).length ? { headers } : {};
}

function buildNotificationRequestUrl(userId) {
    return `${NOTIF_API_URL}?action=get&user_id=${encodeURIComponent(userId)}&_ts=${Date.now()}`;
}

function getClearedNotificationStorageKey() {
    const userId = currentUser?.user_id || getStoredUser()?.user_id || 'guest';
    return `clearedNotifications:${userId}`;
}

function getClearedNotificationIds() {
    try {
        const raw = JSON.parse(localStorage.getItem(getClearedNotificationStorageKey()) || '[]');
        if (!Array.isArray(raw)) {
            return new Set();
        }

        return new Set(raw.map((value) => String(value)));
    } catch (error) {
        return new Set();
    }
}

function saveClearedNotificationIds(ids) {
    const values = Array.from(ids).slice(-500);
    localStorage.setItem(getClearedNotificationStorageKey(), JSON.stringify(values));
}

function addClearedNotificationIds(ids) {
    const nextIds = getClearedNotificationIds();
    ids.forEach((id) => {
        if (id !== undefined && id !== null && String(id).trim() !== '') {
            nextIds.add(String(id));
        }
    });
    saveClearedNotificationIds(nextIds);
}

function filterClearedNotifications(notifications) {
    const clearedIds = getClearedNotificationIds();
    if (clearedIds.size === 0) {
        return Array.isArray(notifications) ? notifications : [];
    }

    return (Array.isArray(notifications) ? notifications : []).filter((item) => !clearedIds.has(String(item.id)));
}

function buildNotificationChimeSource() {
    if (notificationChimeSource) {
        return notificationChimeSource;
    }

    const sampleRate = 22050;
    const duration = 0.22;
    const frameCount = Math.floor(sampleRate * duration);
    const bytesPerSample = 2;
    const dataSize = frameCount * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeString = (offset, text) => {
        for (let index = 0; index < text.length; index += 1) {
            view.setUint8(offset + index, text.charCodeAt(index));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let index = 0; index < frameCount; index += 1) {
        const time = index / sampleRate;
        const envelope = Math.pow(1 - (time / duration), 2);
        const waveform = (
            (0.55 * Math.sin(2 * Math.PI * 880 * time))
            + (0.25 * Math.sin(2 * Math.PI * 1320 * time))
        ) * envelope;
        const sample = Math.max(-1, Math.min(1, waveform));
        view.setInt16(offset, Math.round(sample * 32767), true);
        offset += bytesPerSample;
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    notificationChimeSource = `data:audio/wav;base64,${window.btoa(binary)}`;
    return notificationChimeSource;
}

function getNotificationChimeTemplate() {
    if (!notificationChimeTemplate) {
        notificationChimeTemplate = new Audio(NOTIFICATION_SOUND_FILE_URL);
        notificationChimeTemplate.preload = 'auto';
        notificationChimeTemplate.volume = 0.45;
        notificationChimeTemplate.load();
    }

    return notificationChimeTemplate;
}

function getNotificationAudioContext() {
    if (notificationAudioContext) {
        return notificationAudioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return null;
    }

    try {
        notificationAudioContext = new AudioContextClass();
    } catch (error) {
        notificationAudioContext = null;
    }

    return notificationAudioContext;
}

function setupNotificationAudioUnlock() {
    if (notificationAudioUnlockBound) {
        return;
    }

    notificationAudioUnlockBound = true;
    document.addEventListener('pointerdown', handleNotificationAudioUnlock, { passive: true });
    document.addEventListener('keydown', handleNotificationAudioUnlock);
}

function teardownNotificationAudioUnlock() {
    if (!notificationAudioUnlockBound) {
        return;
    }

    document.removeEventListener('pointerdown', handleNotificationAudioUnlock);
    document.removeEventListener('keydown', handleNotificationAudioUnlock);
    notificationAudioUnlockBound = false;
}

async function handleNotificationAudioUnlock() {
    await unlockNotificationAudio();
}

async function unlockNotificationAudio() {
    if (notificationAudioUnlocked) {
        teardownNotificationAudioUnlock();
        return true;
    }

    const template = getNotificationChimeTemplate();
    const audioContext = getNotificationAudioContext();
    let unlocked = false;

    try {
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        unlocked = Boolean(audioContext && audioContext.state === 'running');
    } catch (error) {
        unlocked = false;
    }

    try {
        template.muted = true;
        template.currentTime = 0;
        await template.play();
        template.pause();
        template.currentTime = 0;
        template.muted = false;
        unlocked = true;
    } catch (error) {
        template.pause();
        template.currentTime = 0;
        template.muted = false;
    }

    if (!unlocked) {
        return false;
    }

    notificationAudioUnlocked = true;
    teardownNotificationAudioUnlock();
    if (pendingNotificationChime) {
        pendingNotificationChime = false;
        queueNotificationChimePlayback();
    }
    return true;
}

function playNotificationChimeWithAudioContext() {
    const audioContext = getNotificationAudioContext();
    if (!audioContext || audioContext.state !== 'running') {
        return false;
    }

    try {
        const now = audioContext.currentTime;
        const masterGain = audioContext.createGain();
        masterGain.gain.setValueAtTime(0.0001, now);
        masterGain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        masterGain.connect(audioContext.destination);

        const primary = audioContext.createOscillator();
        primary.type = 'sine';
        primary.frequency.setValueAtTime(880, now);
        primary.frequency.exponentialRampToValueAtTime(1320, now + 0.18);
        primary.connect(masterGain);

        const harmonic = audioContext.createOscillator();
        harmonic.type = 'triangle';
        harmonic.frequency.setValueAtTime(1320, now);
        harmonic.frequency.exponentialRampToValueAtTime(1760, now + 0.18);

        const harmonicGain = audioContext.createGain();
        harmonicGain.gain.setValueAtTime(0.045, now);
        harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        harmonic.connect(harmonicGain);
        harmonicGain.connect(masterGain);

        primary.start(now);
        harmonic.start(now);
        primary.stop(now + 0.32);
        harmonic.stop(now + 0.28);
        return true;
    } catch (error) {
        return false;
    }
}

function playStandaloneNotificationChime() {
    const fallbackChime = new Audio(NOTIFICATION_SOUND_FILE_URL);
    fallbackChime.preload = 'auto';
    fallbackChime.volume = 0.45;
    const playback = fallbackChime.play();
    if (playback && typeof playback.catch === 'function') {
        playback.catch(() => {});
    }
}

function createNotificationChimeInstance() {
    const template = getNotificationChimeTemplate();
    const chime = template.cloneNode(true);
    chime.preload = 'auto';
    chime.volume = 0.45;
    chime.muted = false;
    return chime;
}

function queueNotificationChimePlayback() {
    if (notificationChimeFrameId !== null) {
        cancelAnimationFrame(notificationChimeFrameId);
    }

    notificationChimeFrameId = requestAnimationFrame(() => {
        notificationChimeFrameId = null;
        playNotificationChime();
    });
}

function playNotificationChime() {
    if (!notificationAudioUnlocked) {
        pendingNotificationChime = true;
        return;
    }

    const chime = createNotificationChimeInstance();

    try {
        chime.currentTime = 0;
        const playback = chime.play();
        if (playback && typeof playback.catch === 'function') {
            playback.catch(() => {
                playStandaloneNotificationChime();
            });
        }
    } catch (error) {
        playStandaloneNotificationChime();
    }
}

function getUnreadNotificationIds(notifications) {
    return new Set(
        notifications
            .filter((item) => !item.is_read && item.id !== undefined && item.id !== null)
            .map((item) => String(item.id))
    );
}

function parseNotificationTimestamp(value) {
    if (!value) {
        return null;
    }

    const normalizedValue = String(value).trim().replace(' ', 'T');
    const parsed = new Date(normalizedValue);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed;
    }

    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function hasRecentUnreadNotifications(notifications) {
    const now = Date.now();

    return notifications.some((item) => {
        if (item.is_read) {
            return false;
        }

        const timestamp = parseNotificationTimestamp(item.created_at || item.time);
        if (!timestamp) {
            return false;
        }

        return Math.abs(now - timestamp.getTime()) <= NOTIFICATION_RECENT_SOUND_WINDOW_MS;
    });
}

function syncNotificationSoundState(notifications) {
    const nextUnreadIds = getUnreadNotificationIds(notifications);

    if (!hasHydratedNotifications) {
        unreadNotificationIds = nextUnreadIds;
        hasHydratedNotifications = true;
        return hasRecentUnreadNotifications(notifications);
    }

    const hasNewUnread = Array.from(nextUnreadIds).some((id) => !unreadNotificationIds.has(id));
    unreadNotificationIds = nextUnreadIds;

    return hasNewUnread;
}

function detectCurrentRole(user) {
    if (user?.role) return user.role;

    const path = window.location.pathname.toLowerCase();
    if (path.includes('/trainer/')) return 'trainer';
    if (path.includes('/registrar/')) return 'registrar';
    if (path.includes('/trainee/')) return 'trainee';
    if (path.includes('/admin/')) return 'admin';
    return null;
}

function getHeaderButton() {
    return document.getElementById('userMenuButton') || document.getElementById('userDropdown');
}

function getHeaderNameElement() {
    return document.getElementById('userName')
        || document.getElementById('trainerName')
        || document.getElementById('traineeName');
}

function getDisplayName(profileData, fallbackUser = null) {
    const candidates = [
        [profileData?.first_name, profileData?.last_name].filter(Boolean).join(' ').trim(),
        profileData?.full_name,
        profileData?.name,
        profileData?.username,
        [fallbackUser?.first_name, fallbackUser?.last_name].filter(Boolean).join(' ').trim(),
        fallbackUser?.full_name,
        fallbackUser?.name,
        fallbackUser?.username,
        'User'
    ];

    return candidates.find((value) => typeof value === 'string' && value.trim() !== '') || 'User';
}

function shouldReplaceHeaderName(nameEl) {
    if (!nameEl) return false;

    const currentText = String(nameEl.textContent || '').trim();
    const placeholders = ['User', 'Admin', 'Registrar', 'Trainer', 'Trainee', 'Loading...'];

    return currentText === '' || placeholders.includes(currentText);
}

function getFallbackAvatarUrl(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;
}

function ensureHeaderProfileImage(button) {
    if (!button) return null;

    let image = button.querySelector('#userProfileImage') || button.querySelector('img[data-header-profile-image="true"]');
    if (image) return image;

    image = document.createElement('img');
    image.id = 'userProfileImage';
    image.setAttribute('data-header-profile-image', 'true');
    image.alt = 'Profile';
    image.className = 'h-6 w-6 rounded-full object-cover border border-blue-100 shrink-0';
    image.src = getFallbackAvatarUrl('User');

    const icon = button.querySelector('.fa-user-circle');
    if (icon && icon.parentNode) {
        icon.replaceWith(image);
    } else {
        button.insertBefore(image, button.firstChild);
    }

    return image;
}

function getProfileEndpoint(role, userId) {
    if (!role || !userId) return '';

    const queryKey = role === 'admin' ? 'id' : 'user_id';
    return `${window.location.origin}/Hohoo-ville/api/role/${role}/profile.php?action=get&${queryKey}=${encodeURIComponent(userId)}`;
}

function getProfileImageUrl(profileData, fallbackName) {
    if (profileData?.photo_url) {
        return profileData.photo_url.startsWith('http')
            ? profileData.photo_url
            : `${window.location.origin}${profileData.photo_url}`;
    }

    if (profileData?.profile_image) {
        return `/Hohoo-ville/uploads/profile_images/${encodeURIComponent(profileData.profile_image)}`;
    }

    if (profileData?.photo_file) {
        return `/Hohoo-ville/uploads/trainees/${encodeURIComponent(profileData.photo_file)}`;
    }

    return getFallbackAvatarUrl(fallbackName);
}

async function refreshHeaderProfileChip() {
    try {
        const user = currentUser || getStoredUser();
        const role = currentUserRole || detectCurrentRole(user);
        const button = getHeaderButton();
        const nameEl = getHeaderNameElement();

        if (!user || !button || !role || !user.user_id) return;

        const imageEl = ensureHeaderProfileImage(button);
        const fallbackName = getDisplayName(null, user);

        if (nameEl && shouldReplaceHeaderName(nameEl)) {
            nameEl.textContent = fallbackName;
        }
        if (imageEl) {
            imageEl.src = getFallbackAvatarUrl(fallbackName);
        }

        const endpoint = getProfileEndpoint(role, user.user_id);
        if (!endpoint) return;

        const response = await axios.get(endpoint, getAuthConfig());
        if (!response.data?.success || !response.data?.data) {
            return;
        }

        const profileData = response.data.data;
        const displayName = getDisplayName(profileData, user);
        const imageUrl = getProfileImageUrl(profileData, displayName);

        if (nameEl && shouldReplaceHeaderName(nameEl)) {
            nameEl.textContent = displayName;
        }
        if (imageEl) {
            imageEl.src = imageUrl;
        }
    } catch (error) {
        console.debug('Header profile image load skipped:', error);
    }
}

window.refreshHeaderProfileChip = refreshHeaderProfileChip;

function observeNotificationMount() {
    if (notificationDomObserver || !document.body || hasNotificationUI()) return;

    notificationDomObserver = new MutationObserver(() => {
        if (!hasNotificationUI()) {
            return;
        }

        notificationDomObserver.disconnect();
        notificationDomObserver = null;
        renderNotificationUI(latestNotifications);
    });

    notificationDomObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function hasNotificationUI() {
    return Boolean(
        document.getElementById('notificationBadge')
        || document.getElementById('notificationList')
    );
}

function closeDropdown(dropdown, backdrop) {
    if (dropdown) {
        dropdown.classList.remove('scale-100', 'opacity-100');
        dropdown.classList.add('scale-95', 'opacity-0');
    }
    if (backdrop) {
        backdrop.classList.add('hidden');
    }
    setTimeout(() => {
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    }, 200);
}

function setupNotificationRefreshTriggers() {
    window.addEventListener('focus', () => {
        if (currentUser?.user_id) {
            checkNotifications(currentUser.user_id);
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && currentUser?.user_id) {
            checkNotifications(currentUser.user_id);
        }
    });
}

async function checkNotifications(userId) {
    try {
        const response = await axios.get(
            buildNotificationRequestUrl(userId),
            getAuthConfig()
        );
        const items = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data?.data) ? response.data.data : [];

        updateNotificationUI(items);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.warn('Notification API not found. Polling stopped.');
            clearInterval(notificationPollInterval);
        }
    }
}

function updateNotificationUI(notifications) {
    latestNotifications = filterClearedNotifications(filterNotificationsByRole(notifications, currentUserRole));
    const shouldPlayChime = syncNotificationSoundState(latestNotifications);
    renderNotificationUI(latestNotifications);
    if (shouldPlayChime) {
        queueNotificationChimePlayback();
    }
}

function renderNotificationUI(notifications) {
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');

    if (!badge && !list) {
        return;
    }

    const unreadCount = notifications.filter((item) => !item.is_read).length;

    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = String(unreadCount);
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    if (!list) {
        return;
    }

    list.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between gap-3 px-4 py-2 border-b border-gray-200 text-sm font-semibold text-gray-700';
    header.innerHTML = `
        <span>Notifications</span>
        <div class="flex flex-wrap items-center justify-end gap-3">
            ${notifications.length > 0 ? '<button type="button" id="clearNotificationsBtn" class="text-xs font-medium text-slate-500 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Clear notifications</button>' : ''}
            ${unreadCount > 0 ? '<button type="button" id="markAllReadNotifications" class="text-xs font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Mark all as read</button>' : ''}
        </div>
    `;

    list.appendChild(header);

    const clearBtn = header.querySelector('#clearNotificationsBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearNotifications);
    }

    const markAllBtn = header.querySelector('#markAllReadNotifications');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', handleMarkAllNotificationsRead);
    }

    if (!notifications.length) {
        const emptyState = document.createElement('div');
        emptyState.className = 'px-4 py-3 text-center text-sm text-gray-500';
        emptyState.textContent = 'No notifications';
        list.appendChild(emptyState);
        return;
    }

    notifications.forEach((notif) => {
        const timestamp = notif.time || notif.created_at || null;
        const dateObj = timestamp ? new Date(timestamp) : null;
        const date = dateObj && !Number.isNaN(dateObj.getTime())
            ? `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Just now';

        const item = document.createElement('a');
        item.href = notif.link || '#';
        item.className = `block px-4 py-3 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-0 ${!notif.is_read ? 'bg-blue-50' : ''}`;

        item.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div class="flex-grow">
                    <h6 class="text-sm font-semibold text-gray-800 ${!notif.is_read ? 'font-bold' : ''}">${notif.title || 'Notification'}</h6>
                    <p class="text-sm text-gray-600 mt-1">${notif.message || ''}</p>
                    <p class="text-xs text-gray-500 mt-1">${date}</p>
                </div>
                ${!notif.is_read ? '<div class="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>' : ''}
            </div>
        `;
        item.addEventListener('click', (event) => handleNotificationClick(event, notif.id, notif.link));
        list.appendChild(item);
    });
}

async function handleMarkAllNotificationsRead(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!currentUser?.user_id) {
        return;
    }

    try {
        await axios.get(
            `${NOTIF_API_URL}?action=markAll&user_id=${encodeURIComponent(currentUser.user_id)}`,
            getAuthConfig()
        );

        latestNotifications = latestNotifications.map((item) => ({
            ...item,
            is_read: 1
        }));
        unreadNotificationIds = new Set();
        renderNotificationUI(latestNotifications);
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

async function handleClearNotifications(event) {
    event.preventDefault();
    event.stopPropagation();

    const visibleNotificationIds = latestNotifications
        .map((item) => item?.id)
        .filter((id) => id !== undefined && id !== null);

    if (visibleNotificationIds.length === 0) {
        return;
    }

    addClearedNotificationIds(visibleNotificationIds);
    latestNotifications = [];
    unreadNotificationIds = new Set();
    renderNotificationUI(latestNotifications);

    if (!currentUser?.user_id) {
        return;
    }

    try {
        await axios.get(
            `${NOTIF_API_URL}?action=clearAll&user_id=${encodeURIComponent(currentUser.user_id)}`,
            getAuthConfig()
        );
    } catch (error) {
        console.error('Error clearing notifications:', error);
    }
}

function filterNotificationsByRole(notifications, role) {
    if (!Array.isArray(notifications) || !role) return notifications || [];
    return notifications.filter((notif) => isLinkAllowedForRole(notif.link, role));
}

function markNotificationReadLocally(id) {
    if (!id) {
        return;
    }

    latestNotifications = latestNotifications.map((item) => (
        Number(item.id) === Number(id)
            ? { ...item, is_read: 1 }
            : item
    ));
    unreadNotificationIds = getUnreadNotificationIds(latestNotifications);
    renderNotificationUI(latestNotifications);
}

function isLinkAllowedForRole(link, role) {
    if (!link) return true;
    const path = String(link).toLowerCase();
    const roleMatch = ['admin', 'registrar', 'trainer', 'trainee'].find((itemRole) => path.includes(`/html/${itemRole}/`));
    if (!roleMatch) return true;
    return roleMatch === role;
}

window.handleNotificationClick = async function (event, id, link) {
    event.preventDefault();
    event.stopPropagation();

    try {
        if (id && currentUser?.user_id) {
            markNotificationReadLocally(id);
            await axios.get(
                `${NOTIF_API_URL}?action=markRead&id=${encodeURIComponent(id)}&user_id=${encodeURIComponent(currentUser.user_id)}`,
                getAuthConfig()
            );
        }
    } catch (error) {
        console.error('Error marking read:', error);
        if (currentUser?.user_id) {
            checkNotifications(currentUser.user_id);
        }
    }

    if (link && isLinkAllowedForRole(link, currentUserRole)) {
        window.location.href = link;
    }
};
