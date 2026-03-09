/**
 * Shared sidebar loader/controller for Admin and Registrar pages.
 * Works without Bootstrap JS APIs.
 */
class SidebarManager {
    constructor() {
        this.sidebarContainer = null;
        this.sidebar = null;
        this.mainContent = null;
        this.sidebarOverlay = null;
        this.isMobile = false;
        this.isCollapsed = false;
        this.notificationPollInterval = null;
        this.role = this.detectRole();

        this.init();
    }

    init() {
        this.checkMobileView();
        this.loadCollapsedState();
        this.loadSidebar();
    }

    loadSidebar() {
        this.sidebarContainer = document.getElementById('sidebar-container');
        if (!this.sidebarContainer) return;

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
                this.loadNotification();
            })
            .catch((error) => {
                console.warn('Sidebar loading error:', error);
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
        const navLinks = this.sidebarContainer.querySelectorAll('.nav-link[data-page]');

        navLinks.forEach((link) => {
            const page = link.getAttribute('data-page');
            if (!page) return;

            let href = '';
            if (page === 'dashboard') {
                const dashboardFile = this.role === 'registrar' ? 'registrar_dashboard.html' : 'admin_dashboard.html';
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
                this.notificationPollInterval = setInterval(() => this.fetchNotifications(), 15000);
            })
            .catch((error) => {
                console.warn('Notification component load error:', error);
            });
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

    fetchNotifications() {
        const list = document.getElementById('notificationList');
        if (!list) return;

        fetch(`${this.getNotificationApiBase()}?action=get&role=${encodeURIComponent(this.role)}`)
            .then((response) => {
                if (!response.ok) throw new Error('Failed to fetch notifications');
                return response.json();
            })
            .then((items) => {
                this.renderNotifications(Array.isArray(items) ? items : []);
            })
            .catch((error) => {
                console.debug('Notifications fetch error:', error);
            });
    }

    renderNotifications(items) {
        const badge = document.getElementById('notificationBadge');
        const list = document.getElementById('notificationList');
        if (!badge || !list) return;

        if (!items.length) {
            list.innerHTML = '<div class="px-4 py-3 text-center text-sm text-slate-500">No notifications</div>';
            badge.classList.add('hidden');
            badge.textContent = '0';
            return;
        }

        const unreadCount = items.filter((item) => !item.is_read).length;
        badge.textContent = String(unreadCount);
        badge.classList.toggle('hidden', unreadCount <= 0);
        badge.classList.toggle('inline-flex', unreadCount > 0);

        list.innerHTML = '';
        items.forEach((item) => {
            const row = document.createElement('a');
            row.href = item.link || '#';
            row.className = `block border-b border-slate-100 px-4 py-3 text-sm transition hover:bg-slate-50 ${item.is_read ? 'text-slate-700' : 'bg-blue-50 font-semibold text-slate-900'}`;
            row.innerHTML = `
                <div class="flex items-start justify-between gap-3">
                    <div class="leading-5">${item.message || 'Notification'}</div>
                    <div class="shrink-0 text-[11px] text-slate-500">${item.time || ''}</div>
                </div>
            `;
            row.onclick = (event) => {
                event.preventDefault();
                if (item.id) this.markNotificationRead(item.id);
                if (item.link) window.location.href = item.link;
            };
            list.appendChild(row);
        });
    }

    markNotificationRead(id) {
        fetch(`${this.getNotificationApiBase()}?action=markRead&id=${encodeURIComponent(id)}`).catch(() => {});
    }

    markAllNotificationsRead() {
        fetch(`${this.getNotificationApiBase()}?action=markAll&role=${encodeURIComponent(this.role)}`)
            .then(() => this.fetchNotifications())
            .catch(() => {});
    }

    attachNotificationEvents() {
        const button = document.getElementById('notificationBtn');
        const dropdown = document.getElementById('notificationDropdown');
        const viewAll = document.getElementById('viewAllNotifications');
        const markAllRead = document.getElementById('markAllRead');
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
    }
}

function logout() {
    if (window.confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        const inPages = window.location.pathname.includes('/pages/');
        window.location.href = inPages ? '../../../login.html' : '../../login.html';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SidebarManager());
} else {
    new SidebarManager();
}
