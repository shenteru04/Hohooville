/**
 * Shared sidebar loader/controller for Admin and Registrar pages.
 * Works without Bootstrap JS APIs.
 */
const __HOHOO_SIDEBAR_GUARD_COMMENT = true;

if (window.__HohooSidebarLoaded) {
    // Sidebar already loaded on this page — skip re-execution to avoid redeclaration errors.
} else {
    window.__HohooSidebarLoaded = true;

    const NOTIFICATION_POLL_INTERVAL_MS = 10000;
    const NOTIFICATION_SOUND_FILE_URL = '/Hohoo-ville/frontend/audio/notification.mp3';
    const NOTIFICATION_RECENT_SOUND_WINDOW_MS = 30000;

class SidebarManager {
    constructor() {
        this.sidebarContainer = null;
        this.sidebar = null;
        this.mainContent = null;
        this.sidebarOverlay = null;
        this.isMobile = false;
        this.isCollapsed = false;
        this.notificationPollInterval = null;
        this.unreadNotificationIds = new Set();
        this.notificationsInitialized = false;
        this.notificationAudioUnlocked = false;
        this.notificationAudioUnlockBound = false;
        this.notificationChimeSource = null;
        this.notificationChimeTemplate = null;
        this.notificationAudioContext = null;
        this.pendingNotificationChime = false;
        this.notificationChimeFrameId = null;
        this.latestNotifications = [];
        this.role = this.detectRole();
        this.handleVisibilityRefresh = this.handleVisibilityRefresh.bind(this);

        this.init();
    }

    init() {
        this.checkMobileView();
        this.loadCollapsedState();
        this.setupNotificationAudioUnlock();
        this.setupNotificationRefreshTriggers();
        this.loadSidebar();
    }

    loadSidebar() {
        this.sidebarContainer = document.getElementById('sidebar-container');
        if (!this.sidebarContainer) return;

        // Create Schedule supplies an embedded sidebar while the shared
        // component loads. Populate it through the same profile loader used
        // by all other Admin pages so it never remains on the User placeholder.
        this.sidebar = this.sidebarContainer.querySelector('#sidebar');
        if (this.sidebar) {
            this.mainContent = document.querySelector('.main-content');
            this.loadUserProfileInSidebar();
        }

        fetch(this.getSidebarPath())
            .then((response) => {
                if (!response.ok) throw new Error(`Failed to load sidebar: ${response.status}`);
                return response.text();
            })
            .then((html) => {
                this.sidebarContainer.innerHTML = html;
                this.sidebar = document.getElementById('sidebar');
                this.mainContent = document.querySelector('.main-content');
                this.ensureSidebarOverlay();
                this.normalizeLinks();
                this.setActiveLink();
                this.setupEventListeners();
                this.applyCollapsedState();
                this.loadUserProfileInSidebar();
                this.loadNotification();
                window.refreshHeaderProfileChip = () => this.loadUserProfileInSidebar();
            })
            .catch((error) => {
                console.warn('Sidebar loading error:', error);
                this.sidebar = this.sidebarContainer.querySelector('#sidebar');
                if (this.sidebar) {
                    this.mainContent = document.querySelector('.main-content');
                    this.ensureSidebarOverlay();
                    this.normalizeLinks();
                    this.setActiveLink();
                    this.setupEventListeners();
                    this.applyCollapsedState();
                    this.loadUserProfileInSidebar();
                    this.loadNotification();
                    window.refreshHeaderProfileChip = () => this.loadUserProfileInSidebar();
                    return;
                }

                this.sidebarContainer.innerHTML = '<div style="padding: 1rem; color: #b91c1c;">Failed to load sidebar.</div>';
            });
    }

    ensureSidebarOverlay() {
        let overlay = document.getElementById('sidebarOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sidebarOverlay';
            overlay.className = 'fixed inset-0 z-30 hidden bg-slate-900/40 opacity-0 transition-opacity lg:hidden';
            document.body.appendChild(overlay);
        }
        this.sidebarOverlay = overlay;
    }

    setupEventListeners() {
        if (!this.sidebarContainer) return;

        const sidebarCollapse = document.getElementById('sidebarCollapse');
        const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
        const sidebarToggle = document.getElementById('sidebar-toggle');

        if (sidebarCollapse) {
            sidebarCollapse.onclick = () => this.openMobileSidebar();
        }
        if (sidebarCloseBtn) {
            sidebarCloseBtn.onclick = () => this.closeMobileSidebar();
        }
        if (this.sidebarOverlay) {
            this.sidebarOverlay.onclick = () => this.closeMobileSidebar();
        }
        if (sidebarToggle) {
            sidebarToggle.onclick = () => this.toggleDesktopCollapse();
        }

        const groupToggles = this.sidebarContainer.querySelectorAll('.nav-group-toggle');
        groupToggles.forEach((button, index) => {
            const key = `sidebarGroup:${this.role}:${index}`;
            const storedOpen = localStorage.getItem(key);
            const group = button.closest('.nav-group');
            const submenu = group ? group.querySelector('.nav-submenu') : null;
            const shouldOpen = storedOpen === '1';
            if (group) group.classList.toggle('open', shouldOpen);
            if (submenu) submenu.classList.toggle('hidden', !shouldOpen);
            button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');

            button.onclick = () => {
                const nextOpen = !group.classList.contains('open');
                group.classList.toggle('open', nextOpen);
                if (submenu) submenu.classList.toggle('hidden', !nextOpen);
                button.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
                localStorage.setItem(key, nextOpen ? '1' : '0');
            };
        });

        const navLinks = this.sidebarContainer.querySelectorAll('.nav-link');
        navLinks.forEach((link) => {
            link.onclick = () => this.closeMobileSidebar();
        });

        window.onresize = () => this.handleResize();
    }

    normalizeLinks() {
        const inPages = window.location.pathname.includes('/pages/');
        const dashboardFile = this.role === 'registrar' ? 'registrar_dashboard.html' : 'admin_dashboard.html';
        const homeLinks = this.sidebarContainer.querySelectorAll('[data-sidebar-home]');
        const navLinks = this.sidebarContainer.querySelectorAll('.nav-link[data-page]');

        homeLinks.forEach((link) => {
            link.setAttribute('href', inPages ? `../${dashboardFile}` : `./${dashboardFile}`);
        });

        navLinks.forEach((link) => {
            const page = link.getAttribute('data-page');
            if (!page) return;

            let href = '';
            if (page === 'dashboard') {
                href = inPages ? `../${dashboardFile}` : `./${dashboardFile}`;
            } else {
                href = inPages ? `${page}.html` : `pages/${page}.html`;
            }
            link.setAttribute('href', href);
        });
    }

    setActiveLink() {
        const currentPage = this.getCurrentPageName();
        const navLinks = this.sidebarContainer.querySelectorAll('.nav-link[data-page]');

        navLinks.forEach((link) => {
            const isActive = link.getAttribute('data-page') === currentPage;
            link.classList.toggle('active', isActive);

            if (isActive) {
                link.classList.add('bg-blue-50', 'text-blue-700', 'ring-1', 'ring-blue-100', 'font-semibold');
                const icon = link.querySelector('.nav-icon');
                if (icon) icon.classList.add('text-blue-600');

                const parentGroup = link.closest('.nav-group');
                if (parentGroup) {
                    parentGroup.classList.add('open');
                    const submenu = parentGroup.querySelector('.nav-submenu');
                    const toggleBtn = parentGroup.querySelector('.nav-group-toggle');
                    if (submenu) submenu.classList.remove('hidden');
                    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
                }
            } else {
                link.classList.remove('bg-blue-50', 'text-blue-700', 'ring-1', 'ring-blue-100', 'font-semibold');
                const icon = link.querySelector('.nav-icon');
                if (icon) icon.classList.remove('text-blue-600');
            }
        });
    }

    openMobileSidebar() {
        if (!this.sidebar) return;
        this.sidebar.classList.remove('-translate-x-full');
        if (this.sidebarOverlay) {
            this.sidebarOverlay.classList.remove('hidden');
            requestAnimationFrame(() => this.sidebarOverlay.classList.remove('opacity-0'));
        }
        document.body.classList.add('overflow-hidden');
    }

    closeMobileSidebar() {
        if (!this.sidebar) return;
        this.sidebar.classList.add('-translate-x-full');
        if (this.sidebarOverlay) {
            this.sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => this.sidebarOverlay.classList.add('hidden'), 300);
        }
        document.body.classList.remove('overflow-hidden');
    }

    toggleDesktopCollapse() {
        if (!this.sidebar || this.isMobile) return;
        this.isCollapsed = !this.isCollapsed;
        this.sidebar.classList.toggle('collapsed', this.isCollapsed);
        localStorage.setItem(`sidebarCollapsed:${this.role}`, this.isCollapsed ? '1' : '0');
    }

    checkMobileView() {
        this.isMobile = window.innerWidth < 1024;
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.checkMobileView();
        if (wasMobile !== this.isMobile && !this.isMobile) {
            this.closeMobileSidebar();
        }
    }

    loadCollapsedState() {
        this.isCollapsed = localStorage.getItem(`sidebarCollapsed:${this.role}`) === '1';
    }

    applyCollapsedState() {
        if (!this.sidebar || this.isMobile) return;
        this.sidebar.classList.toggle('collapsed', this.isCollapsed);
    }

    getSidebarPath() {
        return window.location.pathname.includes('/pages/') ? '../components/sidebar.html' : './components/sidebar.html';
    }

    getCurrentPageName() {
        const filename = (window.location.pathname.split('/').pop() || '').replace('.html', '');
        if (filename === 'admin_dashboard' || filename === 'registrar_dashboard') return 'dashboard';
        return filename;
    }

    detectRole() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/registrar/')) return 'registrar';
        return 'admin';
    }

    getStoredUser() {
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

    getCurrentUserId() {
        const user = this.getStoredUser();
        const value = user?.user_id ?? user?.userId ?? user?.id ?? 0;
        const userId = Number(value);
        return Number.isFinite(userId) && userId > 0 ? userId : 0;
    }

    getAuthHeaders(extraHeaders = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            ...extraHeaders
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return headers;
    }

    buildNotificationRequestUrl(userId) {
        return `${this.getNotificationApiBase()}?action=get&user_id=${encodeURIComponent(userId)}&_ts=${Date.now()}`;
    }

    getClearedNotificationStorageKey() {
        const userId = this.getCurrentUserId() || 'guest';
        return `clearedNotifications:${userId}`;
    }

    getClearedNotificationIds() {
        try {
            const raw = JSON.parse(localStorage.getItem(this.getClearedNotificationStorageKey()) || '[]');
            if (!Array.isArray(raw)) {
                return new Set();
            }

            return new Set(raw.map((value) => String(value)));
        } catch (error) {
            return new Set();
        }
    }

    saveClearedNotificationIds(ids) {
        const values = Array.from(ids).slice(-500);
        localStorage.setItem(this.getClearedNotificationStorageKey(), JSON.stringify(values));
    }

    addClearedNotificationIds(ids) {
        const nextIds = this.getClearedNotificationIds();
        ids.forEach((id) => {
            if (id !== undefined && id !== null && String(id).trim() !== '') {
                nextIds.add(String(id));
            }
        });
        this.saveClearedNotificationIds(nextIds);
    }

    filterClearedNotifications(items) {
        const clearedIds = this.getClearedNotificationIds();
        if (clearedIds.size === 0) {
            return Array.isArray(items) ? items : [];
        }

        return (Array.isArray(items) ? items : []).filter((item) => !clearedIds.has(String(item.id)));
    }

    getDisplayName(profileData, fallbackUser = null) {
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

    getFallbackAvatarUrl(name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;
    }

    shouldReplaceHeaderName(nameEl) {
        if (!nameEl) return false;

        const currentText = String(nameEl.textContent || '').trim();
        const placeholders = ['User', 'Admin', 'Registrar', 'Trainer', 'Trainee', 'Loading...'];

        return currentText === '' || placeholders.includes(currentText);
    }

    getProfileEndpoint(userId) {
        const queryKey = this.role === 'admin' ? 'id' : 'user_id';
        return `${window.location.origin}/Hohoo-ville/api/role/${this.role}/profile.php?action=get&${queryKey}=${encodeURIComponent(userId)}`;
    }

    getProfileImageUrl(profileData, fallbackName) {
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

        return this.getFallbackAvatarUrl(fallbackName);
    }

    ensureHeaderProfileElements() {
        const button = document.getElementById('userDropdown') || document.getElementById('userMenuButton');
        if (!button) {
            return { button: null, image: null, name: null };
        }

        let image = button.querySelector('#userProfileImage') || button.querySelector('img[data-header-profile-image="true"]');
        if (!image) {
            const icon = button.querySelector('.fa-user-circle');
            image = document.createElement('img');
            image.id = 'userProfileImage';
            image.setAttribute('data-header-profile-image', 'true');
            image.alt = 'Profile';
            image.className = 'h-6 w-6 rounded-full object-cover border border-blue-100 shrink-0';
            image.src = this.getFallbackAvatarUrl('User');

            if (icon && icon.parentNode) {
                icon.replaceWith(image);
            } else {
                button.insertBefore(image, button.firstChild);
            }
        }

        const name = document.getElementById('userName')
            || document.getElementById('trainerName')
            || document.getElementById('traineeName')
            || button.querySelector('span');

        return { button, image, name };
    }

    loadNotification() {
        const headerActions = document.querySelector('[data-header-actions]')
            || document.querySelector('.header-actions')
            || document.querySelector('.navbar .container-fluid .ms-auto')
            || document.querySelector('.navbar .container-fluid .d-flex.align-items-center');
        if (!headerActions) return;

        fetch(this.getNotificationPath())
            .then((response) => {
                if (!response.ok) throw new Error(`Failed to load notification component: ${response.status}`);
                return response.text();
            })
            .then((html) => {
                if (!headerActions.querySelector('#notification-container')) {
                    headerActions.insertAdjacentHTML('afterbegin', html);
                }
                this.attachNotificationEvents();
                this.fetchNotifications();
                if (this.notificationPollInterval) clearInterval(this.notificationPollInterval);
                this.notificationPollInterval = setInterval(() => this.fetchNotifications(), NOTIFICATION_POLL_INTERVAL_MS);
            })
            .catch((error) => {
                console.warn('Notification component load error:', error);
            });
    }

    async loadUserProfileInSidebar() {
        try {
            const user = this.getStoredUser();
            if (!user) return;

            const nameEl = document.getElementById('sidebarUserName');
            const roleEl = document.getElementById('sidebarUserRole');
            const imgEl = document.getElementById('sidebarUserProfileImage');
            const headerProfile = this.ensureHeaderProfileElements();
            const fallbackName = this.getDisplayName(null, user);

            if (nameEl) {
                nameEl.textContent = fallbackName;
            }
            if (roleEl) {
                roleEl.textContent = this.role.charAt(0).toUpperCase() + this.role.slice(1);
            }
            if (headerProfile.name && this.shouldReplaceHeaderName(headerProfile.name)) {
                headerProfile.name.textContent = fallbackName;
            }
            if (imgEl) {
                imgEl.src = this.getFallbackAvatarUrl(fallbackName);
            }
            if (headerProfile.image) {
                headerProfile.image.src = this.getFallbackAvatarUrl(fallbackName);
            }

            // Fetch profile image from API
            const userId = this.getCurrentUserId();
            if (imgEl && userId) {
                const response = await fetch(this.getProfileEndpoint(userId), {
                    headers: this.getAuthHeaders()
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        const profileData = data.data;
                        const displayName = this.getDisplayName(profileData, user);
                        const imageUrl = this.getProfileImageUrl(profileData, displayName);

                        if (nameEl) {
                            nameEl.textContent = displayName;
                        }
                        if (headerProfile.name && this.shouldReplaceHeaderName(headerProfile.name)) {
                            headerProfile.name.textContent = displayName;
                        }
                        if (imgEl) {
                            imgEl.src = imageUrl;
                        }
                        if (headerProfile.image) {
                            headerProfile.image.src = imageUrl;
                        }
                    } else if (user.first_name) {
                        const imageUrl = this.getFallbackAvatarUrl(user.first_name);
                        imgEl.src = imageUrl;
                        if (headerProfile.image) {
                            headerProfile.image.src = imageUrl;
                        }
                    }
                }
            }
        } catch (error) {
            console.log('Could not load sidebar profile image:', error);
        }
    }

    getNotificationPath() {
        return window.location.pathname.includes('/pages/') ? '../components/notification.html' : './components/notification.html';
    }

    getNotificationsPagePath() {
        const inPages = window.location.pathname.includes('/pages/');
        if (this.role === 'registrar') {
            return inPages ? './notifications.html' : './pages/notifications.html';
        }
        return inPages ? './notifications.html' : './pages/notifications.html';
    }

    getNotificationApiBase() {
        return `${window.location.origin}/Hohoo-ville/api/notifications.php`;
    }

    buildNotificationChimeSource() {
        if (this.notificationChimeSource) {
            return this.notificationChimeSource;
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

        this.notificationChimeSource = `data:audio/wav;base64,${window.btoa(binary)}`;
        return this.notificationChimeSource;
    }

    getNotificationChimeTemplate() {
        if (!this.notificationChimeTemplate) {
            this.notificationChimeTemplate = new Audio(NOTIFICATION_SOUND_FILE_URL);
            this.notificationChimeTemplate.preload = 'auto';
            this.notificationChimeTemplate.volume = 0.45;
            this.notificationChimeTemplate.load();
        }

        return this.notificationChimeTemplate;
    }

    getNotificationAudioContext() {
        if (this.notificationAudioContext) {
            return this.notificationAudioContext;
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            return null;
        }

        try {
            this.notificationAudioContext = new AudioContextClass();
        } catch (error) {
            this.notificationAudioContext = null;
        }

        return this.notificationAudioContext;
    }

    setupNotificationAudioUnlock() {
        if (this.notificationAudioUnlockBound) {
            return;
        }

        this.boundNotificationAudioUnlock = this.handleNotificationAudioUnlock.bind(this);
        this.notificationAudioUnlockBound = true;
        document.addEventListener('pointerdown', this.boundNotificationAudioUnlock, { passive: true });
        document.addEventListener('keydown', this.boundNotificationAudioUnlock);
    }

    teardownNotificationAudioUnlock() {
        if (!this.notificationAudioUnlockBound || !this.boundNotificationAudioUnlock) {
            return;
        }

        document.removeEventListener('pointerdown', this.boundNotificationAudioUnlock);
        document.removeEventListener('keydown', this.boundNotificationAudioUnlock);
        this.notificationAudioUnlockBound = false;
    }

    async handleNotificationAudioUnlock() {
        await this.unlockNotificationAudio();
    }

    async unlockNotificationAudio() {
        if (this.notificationAudioUnlocked) {
            this.teardownNotificationAudioUnlock();
            return true;
        }

        const template = this.getNotificationChimeTemplate();
        const audioContext = this.getNotificationAudioContext();
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

        this.notificationAudioUnlocked = true;
        this.teardownNotificationAudioUnlock();
        if (this.pendingNotificationChime) {
            this.pendingNotificationChime = false;
            this.queueNotificationChimePlayback();
        }
        return true;
    }

    playNotificationChimeWithAudioContext() {
        const audioContext = this.getNotificationAudioContext();
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

    playStandaloneNotificationChime() {
        const fallbackChime = new Audio(NOTIFICATION_SOUND_FILE_URL);
        fallbackChime.preload = 'auto';
        fallbackChime.volume = 0.45;
        const playback = fallbackChime.play();
        if (playback && typeof playback.catch === 'function') {
            playback.catch(() => {});
        }
    }

    createNotificationChimeInstance() {
        const template = this.getNotificationChimeTemplate();
        const chime = template.cloneNode(true);
        chime.preload = 'auto';
        chime.volume = 0.45;
        chime.muted = false;
        return chime;
    }

    queueNotificationChimePlayback() {
        if (this.notificationChimeFrameId !== null) {
            cancelAnimationFrame(this.notificationChimeFrameId);
        }

        this.notificationChimeFrameId = requestAnimationFrame(() => {
            this.notificationChimeFrameId = null;
            this.playNotificationChime();
        });
    }

    playNotificationChime() {
        if (!this.notificationAudioUnlocked) {
            this.pendingNotificationChime = true;
            return;
        }

        const chime = this.createNotificationChimeInstance();

        try {
            chime.currentTime = 0;
            const playback = chime.play();
            if (playback && typeof playback.catch === 'function') {
                playback.catch(() => {
                    this.playStandaloneNotificationChime();
                });
            }
        } catch (error) {
            this.playStandaloneNotificationChime();
        }
    }

    getUnreadNotificationIds(items) {
        return new Set(
            items
                .filter((item) => !item.is_read && item.id !== undefined && item.id !== null)
                .map((item) => String(item.id))
        );
    }

    parseNotificationTimestamp(value) {
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

    hasRecentUnreadNotifications(items) {
        const now = Date.now();

        return items.some((item) => {
            if (item.is_read) {
                return false;
            }

            const timestamp = this.parseNotificationTimestamp(item.created_at || item.time);
            if (!timestamp) {
                return false;
            }

            return Math.abs(now - timestamp.getTime()) <= NOTIFICATION_RECENT_SOUND_WINDOW_MS;
        });
    }

    syncNotificationSoundState(items) {
        const nextUnreadIds = this.getUnreadNotificationIds(items);

        if (!this.notificationsInitialized) {
            this.unreadNotificationIds = nextUnreadIds;
            this.notificationsInitialized = true;
            return this.hasRecentUnreadNotifications(items);
        }

        const hasNewUnread = Array.from(nextUnreadIds).some((id) => !this.unreadNotificationIds.has(id));
        this.unreadNotificationIds = nextUnreadIds;

        return hasNewUnread;
    }

    fetchNotifications() {
        const list = document.getElementById('notificationList');
        if (!list) return;

        const userId = this.getCurrentUserId();
        if (!userId) return;

        fetch(this.buildNotificationRequestUrl(userId), {
            headers: this.getAuthHeaders(),
            cache: 'no-store'
        })
            .then((response) => {
                if (!response.ok) throw new Error('Failed to fetch notifications');
                return response.json();
            })
            .then((items) => {
                const notificationItems = Array.isArray(items)
                    ? items
                    : Array.isArray(items?.data) ? items.data : [];
                this.renderNotifications(notificationItems);
            })
            .catch((error) => {
                console.debug('Notifications fetch error:', error);
            });
    }

    handleVisibilityRefresh() {
        if (document.visibilityState && document.visibilityState !== 'visible') {
            return;
        }

        this.fetchNotifications();
    }

    setupNotificationRefreshTriggers() {
        window.addEventListener('focus', this.handleVisibilityRefresh);
        document.addEventListener('visibilitychange', this.handleVisibilityRefresh);
    }

    renderNotifications(items) {
        const badge = document.getElementById('notificationBadge');
        const list = document.getElementById('notificationList');
        if (!badge || !list) return;

        this.latestNotifications = this.filterClearedNotifications(Array.isArray(items) ? items : []);
        const shouldPlayChime = this.syncNotificationSoundState(this.latestNotifications);

        if (!this.latestNotifications.length) {
            list.innerHTML = '<div class="px-4 py-3 text-center text-sm text-slate-500">No notifications</div>';
            badge.classList.add('hidden');
            badge.textContent = '0';
            if (shouldPlayChime) {
                this.queueNotificationChimePlayback();
            }
            return;
        }

        const unreadCount = this.latestNotifications.filter((item) => !item.is_read).length;
        badge.textContent = String(unreadCount);
        badge.classList.toggle('hidden', unreadCount <= 0);
        badge.classList.toggle('inline-flex', unreadCount > 0);

        list.innerHTML = '';
        this.latestNotifications.forEach((item) => {
            const row = document.createElement('a');
            row.href = item.link || '#';
            row.className = `block border-b border-slate-100 px-4 py-3 text-sm transition hover:bg-slate-50 ${item.is_read ? 'text-slate-700' : 'bg-blue-50 font-semibold text-slate-900'}`;
            row.innerHTML = `
                <div class="flex items-start justify-between gap-3">
                    <div class="leading-5">${item.message || 'Notification'}</div>
                    <div class="shrink-0 text-[11px] text-slate-500">${item.time || ''}</div>
                </div>
            `;
            row.onclick = async (event) => {
                event.preventDefault();
                if (item.id) await this.markNotificationRead(item.id);
                if (item.link) window.location.href = item.link;
            };
            list.appendChild(row);
        });

        if (shouldPlayChime) {
            this.queueNotificationChimePlayback();
        }
    }

    markNotificationRead(id) {
        const userId = this.getCurrentUserId();
        if (!userId || !id) return Promise.resolve();

        this.latestNotifications = this.latestNotifications.map((item) => (
            Number(item.id) === Number(id)
                ? { ...item, is_read: 1 }
                : item
        ));
        this.unreadNotificationIds = this.getUnreadNotificationIds(this.latestNotifications);
        this.renderNotifications(this.latestNotifications);

        return fetch(`${this.getNotificationApiBase()}?action=markRead&id=${encodeURIComponent(id)}&user_id=${encodeURIComponent(userId)}`, {
            headers: this.getAuthHeaders()
        })
            .catch(() => this.fetchNotifications());
    }

    markAllNotificationsRead() {
        const userId = this.getCurrentUserId();
        if (!userId) return;

        fetch(`${this.getNotificationApiBase()}?action=markAll&user_id=${encodeURIComponent(userId)}`, {
            headers: this.getAuthHeaders()
        })
            .then(() => this.fetchNotifications())
            .catch(() => {});
    }

    clearNotifications(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const visibleNotificationIds = this.latestNotifications
            .map((item) => item?.id)
            .filter((id) => id !== undefined && id !== null);

        if (visibleNotificationIds.length === 0) {
            return;
        }

        this.addClearedNotificationIds(visibleNotificationIds);
        this.latestNotifications = [];
        this.unreadNotificationIds = new Set();
        this.renderNotifications([]);

        const userId = this.getCurrentUserId();
        if (!userId) return;

        fetch(`${this.getNotificationApiBase()}?action=clearAll&user_id=${encodeURIComponent(userId)}`, {
            headers: this.getAuthHeaders()
        }).catch(() => {});
    }

    attachNotificationEvents() {
        const button = document.getElementById('notificationBtn');
        const dropdown = document.getElementById('notificationDropdown');
        const viewAll = document.getElementById('viewAllNotifications');
        const markAllRead = document.getElementById('markAllRead');
        const clearNotificationsBtn = document.getElementById('clearNotifications');
        if (!button || !dropdown) return;

        const closeDropdown = () => {
            dropdown.classList.remove('opacity-100', 'scale-100');
            dropdown.classList.add('opacity-0', 'scale-95');
            button.setAttribute('aria-expanded', 'false');
            setTimeout(() => dropdown.classList.add('hidden'), 180);
        };

        const openDropdown = () => {
            dropdown.classList.remove('hidden');
            requestAnimationFrame(() => {
                dropdown.classList.remove('opacity-0', 'scale-95');
                dropdown.classList.add('opacity-100', 'scale-100');
            });
            button.setAttribute('aria-expanded', 'true');
        };

        button.onclick = (event) => {
            event.stopPropagation();
            if (dropdown.classList.contains('hidden')) openDropdown();
            else closeDropdown();
        };

        document.addEventListener('click', (event) => {
            if (!event.target.closest('#notification-container')) {
                if (!dropdown.classList.contains('hidden')) closeDropdown();
            }
        });

        if (viewAll) {
            viewAll.onclick = (event) => {
                event.preventDefault();
                window.location.href = this.getNotificationsPagePath();
            };
        }

        if (markAllRead) {
            markAllRead.onclick = (event) => {
                event.preventDefault();
                this.markAllNotificationsRead();
            };
        }

        if (clearNotificationsBtn) {
            clearNotificationsBtn.onclick = (event) => {
                this.clearNotifications(event);
            };
        }
    }
}

async function ensureSwal() {
    if (typeof window.Swal !== 'undefined') return;
    await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
    });
}

async function logout() {
    await ensureSwal();
    
    Swal.fire({
        title: 'Logout Confirmation',
        text: 'Are you sure you want to logout?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Logout',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        allowOutsideClick: false,
        allowEscapeKey: false
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            window.location.href = '/Hohoo-ville/frontend/login.html';
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SidebarManager());
} else {
    new SidebarManager();
}

}
