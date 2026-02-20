/**
 * SIDEBAR COMPONENT LOADER & CONTROLLER
 * Dynamically loads and manages the sidebar across all admin pages
 */

class SidebarManager {
    constructor() {
        this.sidebarContainer = null;
        this.sidebar = null;
        this.toggleBtn = null;
        this.mainContent = null;
        this.isCollapsed = false;
        this.isMobile = false;
        
        this.init();
    }

    /**
     * Initialize sidebar on page load
     */
    init() {
        this.loadSidebar();
        this.setupEventListeners();
        this.setActiveLink();
        this.checkMobileView();
        this.loadCollapsedState();
    }

    /**
     * Load sidebar HTML from component file
     */
    loadSidebar() {
        this.sidebarContainer = document.getElementById('sidebar-container');
        
        if (!this.sidebarContainer) {
            console.error('Error: #sidebar-container element not found in HTML');
            return;
        }

        // Determine the correct path to sidebar component
        const sidebarPath = this.getSidebarPath();

        fetch(sidebarPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load sidebar: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                this.sidebarContainer.innerHTML = html;
                
                // Cache DOM elements after sidebar is loaded
                this.sidebar = document.getElementById('sidebar');
                this.toggleBtn = document.getElementById('sidebar-toggle');
                
                // Create main content wrapper if needed
                this.setupMainLayout();
                
                // Normalize links based on current page location
                this.normalizeLinks();

                // Re-setup event listeners now that DOM is loaded
                this.setupEventListeners();
                
                // Set active link
                this.setActiveLink();
                
                // Restore collapsed state if saved
                this.applyCollapsedState();
                // Load top navigation notification component
                this.loadNotification();
            })
            .catch(error => {
                console.error('Sidebar loading error:', error);
                this.sidebarContainer.innerHTML = '<p style="padding: 20px; color: red;">Failed to load sidebar</p>';
            });
    }

    /**
     * Normalize sidebar links so they work both from /admin/ and /admin/pages/
     */
    normalizeLinks() {
        const currentPath = window.location.pathname;
        const inPages = currentPath.includes('/pages/');

        const navLinks = this.sidebarContainer.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const dataPage = link.getAttribute('data-page');
            let href = link.getAttribute('href') || '';

            // Normalize dashboard link
            if (dataPage === 'dashboard') {
                if (currentPath.includes('/admin/')) {
                    href = inPages ? '../admin_dashboard.html' : './admin_dashboard.html';
                } else if (currentPath.includes('/registrar/')) {
                    href = inPages ? '../registrar_dashboard.html' : './registrar_dashboard.html';
                } else if (currentPath.includes('/trainer/')) {
                    href = inPages ? '../trainer_dashboard.html' : './trainer_dashboard.html';
                }
                link.setAttribute('href', href);
                return;
            }

            // For other admin pages, ensure correct path
            if (inPages) {
                // If we're already in /admin/pages/, links should be plain filenames
                link.setAttribute('href', `${dataPage}.html`);
            } else {
                // From /admin/ root, links to pages must include the pages/ folder
                link.setAttribute('href', `pages/${dataPage}.html`);
            }
        });

        // Normalize logout button if present
        const logoutBtn = this.sidebarContainer.querySelector('.btn-logout');
        if (logoutBtn) {
            // leave onclick handler as logout(), but ensure logout() will redirect correctly
        }
    }

    /**
     * Determine the correct path to sidebar component based on current page location
     */
    getSidebarPath() {
        const currentPath = window.location.pathname;
        
        // Check how deep we are in the directory structure
        
        // Generic check: If we're in a /pages/ subdirectory, go up 2 levels
        if (currentPath.includes('/pages/')) {
            return '../components/sidebar.html';
        }
        
        // Default: assuming we're in the root of the role directory (e.g., /admin/ or /registrar/)
        return './components/sidebar.html';
    }

    /**
     * Setup the main layout with sidebar and content areas
     */
    setupMainLayout() {
        let mainContent = document.querySelector('.main-content');
        
        if (!mainContent) {
            // Create wrapper for existing content
            mainContent = document.createElement('div');
            mainContent.className = 'main-content';
            
            // Move all body content (except sidebar-container and sidebar) to main-content
            const children = Array.from(document.body.children);
            children.forEach(child => {
                if (child.id !== 'sidebar-container' && !child.id.includes('sidebar')) {
                    mainContent.appendChild(child);
                }
            });
            
            document.body.appendChild(mainContent);
        }
        
        this.mainContent = mainContent;
    }

    /**
     * Setup event listeners for sidebar functionality
     */
    setupEventListeners() {
        this.sidebar = document.getElementById('sidebar');
        this.toggleBtn = document.getElementById('sidebar-toggle');

        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Setup group (submenu) toggles
        const groupToggles = this.sidebarContainer.querySelectorAll('.nav-group-toggle');
        groupToggles.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const group = btn.closest('.nav-group');
                if (!group) return;
                const isOpen = group.classList.toggle('open');
                btn.setAttribute('aria-expanded', String(isOpen));
            });
        });

        // Close sidebar on mobile when a link is clicked
        if (this.isMobile) {
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (this.isMobile && this.sidebar.classList.contains('mobile-open')) {
                        this.sidebar.classList.remove('mobile-open');
                    }
                });
            });
        }

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Toggle sidebar collapse/expand
     */
    toggleSidebar() {
        if (this.isMobile) {
            // On mobile, toggle visibility
            this.sidebar.classList.toggle('mobile-open');
        } else {
            // On desktop, toggle collapse state
            this.isCollapsed = !this.isCollapsed;
            this.sidebar.classList.toggle('collapsed');
            this.mainContent?.classList.toggle('sidebar-collapsed');
            
            // Save state to localStorage
            localStorage.setItem('sidebarCollapsed', JSON.stringify(this.isCollapsed));
        }
    }

    /**
     * Set active link based on current page
     */
    setActiveLink() {
        // Wait for sidebar to be loaded
        const checkSidebar = setInterval(() => {
            const navLinks = document.querySelectorAll('.nav-link');
            
            if (navLinks.length === 0) return;
            
            clearInterval(checkSidebar);
            
            const currentPage = this.getCurrentPageName();
            
            navLinks.forEach(link => {
                const dataPage = link.getAttribute('data-page');
                const href = link.getAttribute('href');
                
                // Check both data-page attribute and href
                if (dataPage === currentPage || this.isCurrentPage(href)) {
                    link.classList.add('active');
                    // open parent group so active child is visible
                    const parentGroup = link.closest('.nav-group');
                    if (parentGroup) {
                        parentGroup.classList.add('open');
                        const toggleBtn = parentGroup.querySelector('.nav-group-toggle');
                        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
                    }
                } else {
                    link.classList.remove('active');
                }
            });
        }, 100);

        // Clear interval after 2 seconds to prevent infinite loop
        setTimeout(() => clearInterval(checkSidebar), 2000);
    }

    /**
     * Get current page name from URL or document title
     */
    getCurrentPageName() {
        const pathname = window.location.pathname;
        
        // Extract filename without extension
        const filename = pathname.split('/').pop().replace('.html', '');
        
        // Convert to expected format (e.g., admin_dashboard -> dashboard)
        if (filename.includes('admin_dashboard')) return 'dashboard';
        if (filename.includes('registrar_dashboard')) return 'dashboard';
        if (filename.includes('user_management')) return 'user_management';
        if (filename.includes('analytics')) return 'analytics';
        if (filename.includes('reports')) return 'reports';
        if (filename.includes('system_settings')) return 'system_settings';
        if (filename.includes('roles_permissions')) return 'roles_permissions';
        if (filename.includes('activity_logs')) return 'activity_logs';
        if (filename.includes('approval_queue')) return 'approval_queue';
        if (filename.includes('manage_qualifications')) return 'manage_qualifications';
        if (filename.includes('view_batches')) return 'view_batches';
        if (filename.includes('view_trainees')) return 'view_trainees';
        if (filename.includes('view_trainers')) return 'view_trainers';
        
        return filename;
    }

    /**
     * Check if a link is for the current page
     */
    isCurrentPage(href) {
        if (!href) return false;
        const currentPath = window.location.pathname;
        return currentPath.includes(href);
    }

    /**
     * Check if device is mobile
     */
    checkMobileView() {
        this.isMobile = window.innerWidth <= 768;
    }

    /**
     * Handle window resize events
     */
    handleResize() {
        const wasMobile = this.isMobile;
        this.checkMobileView();

        // If switching from mobile to desktop or vice versa
        if (wasMobile !== this.isMobile) {
            if (this.sidebar) {
                // Reset mobile open state when changing view
                if (this.sidebar.classList.contains('mobile-open')) {
                    this.sidebar.classList.remove('mobile-open');
                }
            }
        }
    }

    /**
     * Load collapsed state from localStorage
     */
    loadCollapsedState() {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState !== null) {
            this.isCollapsed = JSON.parse(savedState);
        }
    }

    /**
     * Apply collapsed state to sidebar
     */
    applyCollapsedState() {
        if (!this.isMobile && this.isCollapsed) {
            if (this.sidebar) {
                this.sidebar.classList.add('collapsed');
            }
            if (this.mainContent) {
                this.mainContent.classList.add('sidebar-collapsed');
            }
        }
    }

    /**
     * Load notification component into the top navbar
     */
    loadNotification() {
        try {
            const navContainer = document.querySelector('.navbar .container-fluid .ms-auto');
            if (!navContainer) return;

            const path = this.getNotificationPath();
            fetch(path)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to load notification component');
                    return res.text();
                })
                .then(html => {
                    // Insert before the user dropdown
                    navContainer.insertAdjacentHTML('afterbegin', html);
                    // Setup polling & events
                    const role = this.detectRole();
                    this.setupNotificationPolling(role);
                    this.attachNotificationEvents();
                })
                .catch(err => {
                    console.warn('Notification component load error:', err);
                });
        } catch (e) {
            console.warn('loadNotification error', e);
        }
    }

    getNotificationPath() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/pages/')) return '../components/notification.html';
        return './components/notification.html';
    }

    getNotificationsPagePath(role) {
        const currentPath = window.location.pathname;
        // For admin
        if (role === 'admin') {
            if (currentPath.includes('/pages/')) return './notifications.html';
            return './pages/notifications.html';
        }
        // For registrar
        if (role === 'registrar') {
            if (currentPath.includes('/registrar/pages/')) return './notifications.html';
            if (currentPath.includes('/pages/')) return '../registrar/pages/notifications.html';
            return './pages/notifications.html';
        }
        // default
        return './pages/notifications.html';
    }

    detectRole() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/admin/')) return 'admin';
        if (path.includes('/registrar/')) return 'registrar';
        return 'admin';
    }

    setupNotificationPolling(role) {
        // Initial fetch
        this.fetchNotifications(role);
        // Poll every 15 seconds
        setInterval(() => this.fetchNotifications(role), 15000);
    }

    fetchNotifications(role) {
        const badge = document.getElementById('notificationBadge');
        const list = document.getElementById('notificationList');

        const url = `${window.location.origin}/hohoo-ville/api/notifications.php?action=get&role=${encodeURIComponent(role)}`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch notifications');
                return res.json();
            })
            .then(data => {
                if (!Array.isArray(data)) return;
                this.renderNotifications(data);
            })
            .catch(err => {
                // No op on failure; API may not exist yet
                console.debug('Notifications fetch error:', err);
            });
    }

    renderNotifications(items) {
        const badge = document.getElementById('notificationBadge');
        const list = document.getElementById('notificationList');
        if (!list || !badge) return;

        if (items.length === 0) {
            list.innerHTML = '<div class="list-group-item text-center small text-muted">No new notifications</div>';
            badge.style.display = 'none';
            badge.textContent = '0';
            return;
        }

        // Build list
        list.innerHTML = '';
        let unreadCount = 0;
        items.forEach(item => {
            const isUnread = !item.is_read;
            if (isUnread) unreadCount++;

            const a = document.createElement('a');
            a.href = item.link || '#';
            a.className = 'list-group-item list-group-item-action d-flex align-items-start';
            a.dataset.notificationId = item.id || '';

            const content = `
                <div class="me-2">
                    <div class="small text-muted">${item.time || ''}</div>
                </div>
                <div class="flex-grow-1">
                    <div class="small ${isUnread ? 'fw-bold' : 'text-muted'}">${item.message}</div>
                </div>
            `;
            a.innerHTML = content;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const id = a.dataset.notificationId;
                if (id) this.markNotificationRead(id);
                if (item.link) window.location.href = item.link;
            });

            list.appendChild(a);
        });

        // Update badge
        if (unreadCount > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = String(unreadCount);
        } else {
            badge.style.display = 'none';
            badge.textContent = '0';
        }
    }

    markNotificationRead(id) {
        const url = `${window.location.origin}/hohoo-ville/api/notifications.php?action=markRead&id=${encodeURIComponent(id)}`;
        fetch(url).catch(() => {});
        // Optimistically decrement badge
        const badge = document.getElementById('notificationBadge');
        if (badge && badge.style.display !== 'none') {
            const cur = parseInt(badge.textContent || '0', 10) || 0;
            const next = Math.max(0, cur - 1);
            badge.textContent = String(next);
            if (next === 0) badge.style.display = 'none';
        }
    }

    attachNotificationEvents() {
        // View all click
        const viewAll = document.getElementById('viewAllNotifications');
        if (viewAll) {
            viewAll.addEventListener('click', (e) => {
                e.preventDefault();
                const role = this.detectRole();
                const p = this.getNotificationsPagePath(role);
                window.location.href = p;
            });
        }
        // Mark all as read
        const markAllBtn = document.getElementById('markAllRead');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const role = this.detectRole();
                const url = `${window.location.origin}/hohoo-ville/api/notifications.php?action=markAll&role=${encodeURIComponent(role)}`;
                fetch(url).then(() => {
                    // update UI
                    const badge = document.getElementById('notificationBadge');
                    if (badge) { badge.style.display = 'none'; badge.textContent = '0'; }
                    const list = document.getElementById('notificationList');
                    if (list) {
                        Array.from(list.querySelectorAll('.list-group-item')).forEach(li => li.classList.remove('fw-bold'));
                    }
                }).catch(() => {});
            });
        }
    }

    // Public helper to create a notification via API
    createNotification(payload) {
        // payload: { target_role, target_user_id, actor_id, message, link }
        try {
            fetch(`${window.location.origin}/hohoo-ville/api/notifications.php?action=create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {});
        } catch (e) {
            console.debug('createNotification error', e);
        }
    }
}

/**
 * Logout function
 */
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear session/localStorage if needed
        sessionStorage.clear();
        
        // Redirect to login page (path depends on current location)
        const currentPath = window.location.pathname;
        const redirectPath = currentPath.includes('/pages/') ? '../../../login.html' : '../../login.html';
        window.location.href = redirectPath;
    }
}

/**
 * Initialize sidebar when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SidebarManager();
    });
} else {
    new SidebarManager();
}
