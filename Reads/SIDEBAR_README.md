# 🎯 HOHOO-VILLE Admin Dashboard - Sidebar Component

## 📋 Overview

This is a **production-ready, reusable sidebar component** for the admin dashboard. It's built with **pure HTML, CSS, and JavaScript** (no frameworks required).

**Key Features:**
✅ Single source of truth for navigation  
✅ Automatic active link highlighting  
✅ Collapse/expand toggle functionality  
✅ Mobile responsive  
✅ Dark theme with modern UI  
✅ Smooth animations  
✅ localStorage persistence  
✅ No dependencies (pure JS)

---

## 📁 File Structure

```
frontend/
├── html/admin/
│   ├── admin_dashboard.html          ← Updated ✅
│   ├── components/
│   │   └── sidebar.html              ← NEW: Sidebar markup
│   └── pages/
│       ├── TEMPLATE.html             ← NEW: Implementation guide
│       ├── user_management.html      ← Updated ✅
│       ├── analytics.html
│       ├── reports.html
│       ├── system_settings.html
│       ├── roles_permissions.html
│       ├── activity_logs.html
│       ├── approval_queue.html
│       ├── manage_qualifications.html
│       ├── view_batches.html
│       ├── view_trainees.html
│       └── view_trainers.html
├── css/admin/
│   └── sidebar.css                   ← NEW: Sidebar styling
└── js/
    └── sidebar.js                    ← NEW: Sidebar loader & controller
```

---

## 🚀 Quick Start

### Step 1: Add Sidebar Container
In your page `<body>`, add this single line:

```html
<div id="sidebar-container"></div>
```

### Step 2: Wrap Your Content
Wrap all your page content in:

```html
<div class="main-content">
    <!-- Your navbar, containers, modals, etc. -->
</div>
```

### Step 3: Include Required CSS
In your `<head>`:

```html
<link rel="stylesheet" href="../../../css/admin/sidebar.css">
```

### Step 4: Load Sidebar Script
Before closing `</body>`:

```html
<script src="../../../js/sidebar.js"></script>
```

---

## 💡 Complete Minimal Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Admin Page</title>
    
    <!-- Bootstrap & Icons (Optional but recommended) -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- REQUIRED: Sidebar CSS -->
    <link rel="stylesheet" href="../../../css/admin/sidebar.css">
</head>
<body>
    <!-- REQUIRED: Sidebar Container -->
    <div id="sidebar-container"></div>

    <!-- Main content wrapper -->
    <div class="main-content">
        <div class="container-fluid mt-4">
            <h1>Welcome to My Page</h1>
            <!-- Your page content -->
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    
    <!-- REQUIRED: Sidebar Loader -->
    <script src="../../../js/sidebar.js"></script>
</body>
</html>
```

---

## 🎨 Features Explained

### 1. **Automatic Active Link Highlighting**
The sidebar automatically detects your current page and highlights the active link.

**How it works:**
- It reads `window.location.pathname`
- Matches it against the `data-page` attributes in sidebar navigation
- Adds the `.active` class automatically

**Supported pages:**
- dashboard
- user_management
- analytics
- reports
- system_settings
- roles_permissions
- activity_logs
- approval_queue
- manage_qualifications
- view_batches
- view_trainees
- view_trainers

### 2. **Collapse/Expand Toggle**
Click the hamburger menu (☰) to collapse the sidebar.

**Desktop:** Sidebar collapses to icon-only view  
**Mobile:** Sidebar slides in/out

**State persists:** Your collapse preference is saved in localStorage

### 3. **Mobile Responsive**
- On mobile devices (≤768px), the sidebar slides in from the left
- Click a menu item to auto-close the sidebar
- Top navbar shows hamburger button for toggling

### 4. **Logout Button**
The logout button is included in the sidebar footer. It calls the `logout()` function.

**Default behavior:** Redirects to login page  
**You can customize:** Edit the `logout()` function in `sidebar.js`

---

## 🔧 Customization

### Change Logout Behavior
Edit `frontend/js/sidebar.js`:

```javascript
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Your custom logic here
        // Example: Clear user data, call API, etc.
        sessionStorage.clear();
        window.location.href = '../../login.html';
    }
}
```

### Change Colors
The sidebar uses CSS variables. Edit `frontend/css/admin/sidebar.css`:

```css
* {
    --primary-color: #2563eb;        /* Change this to your brand color */
    --bg-dark: #1f2937;              /* Sidebar background */
    --text-light: #f3f4f6;           /* Text color */
    --hover-bg: #2d3748;             /* Hover background */
}
```

### Change Sidebar Width
```css
* {
    --sidebar-width: 280px;          /* Desktop width */
    --sidebar-width-collapsed: 80px; /* Collapsed width */
}
```

### Edit Sidebar Navigation
Edit `frontend/html/admin/components/sidebar.html`:

Add/remove navigation items:
```html
<li class="nav-item">
    <a href="your_page.html" class="nav-link" data-page="your_page">
        <span class="nav-icon">🎯</span>
        <span class="nav-text">Your Page</span>
    </a>
</li>
```

Don't forget to update the `getCurrentPageName()` function in `sidebar.js` to include your new page.

---

## 📱 Responsive Breakpoints

- **Desktop (>768px):** Full sidebar with text labels, collapsible
- **Tablet (481-768px):** Full sidebar, slides on mobile
- **Mobile (<480px):** Optimized for small screens

---

## 🐛 Troubleshooting

### Sidebar not showing?
1. ✅ Check that `<div id="sidebar-container"></div>` exists in HTML
2. ✅ Verify sidebar.css is linked: `<link rel="stylesheet" href="../../../css/admin/sidebar.css">`
3. ✅ Check that sidebar.js is loaded: `<script src="../../../js/sidebar.js"></script>`
4. ✅ Open browser console (F12) and check for errors

### Active link not highlighting?
1. ✅ Verify the page filename matches the sidebar link
2. ✅ Check the `data-page` attribute matches
3. ✅ Look at `getCurrentPageName()` function in sidebar.js - add your page if missing

### Sidebar overlapping content?
1. ✅ Ensure your content is wrapped in `<div class="main-content">`
2. ✅ Check sidebar.css is properly loaded
3. ✅ Make sure no conflicting CSS from Bootstrap

### Logout not working?
1. ✅ Check that `logout()` function is not redefined elsewhere
2. ✅ Verify redirect URL is correct
3. ✅ Check browser console for errors

---

## 📊 How It Works (Technical Details)

### The SidebarManager Class
`sidebar.js` exports a `SidebarManager` class that:

1. **Loads sidebar HTML** via fetch from `components/sidebar.html`
2. **Sets up event listeners** for collapse/expand functionality
3. **Determines current page** and highlights active link
4. **Saves state** to localStorage for persistence
5. **Handles responsive behavior** on window resize

### Activity Flow
```
Page Load
  ↓
Check for #sidebar-container
  ↓
Fetch sidebar.html
  ↓
Insert into DOM
  ↓
Setup Event Listeners
  ↓
Detect Current Page
  ↓
Highlight Active Link
  ↓
Restore Saved State (collapsed/expanded)
  ↓
Ready! ✅
```

---

## 🎯 Implementation Checklist

For each page you want to add the sidebar to:

- [ ] Add `<div id="sidebar-container"></div>` at the start of body
- [ ] Wrap content in `<div class="main-content">`
- [ ] Link `sidebar.css`: `<link rel="stylesheet" href="../../../css/admin/sidebar.css">`
- [ ] Include `sidebar.js` before closing `</body>`
- [ ] (Optional) Add logout button functionality
- [ ] Test on desktop and mobile
- [ ] Check active link highlighting

---

## 📝 Examples

### Already Updated Pages ✅
- `example/admin_dashboard.html` 
- `pages/user_management.html`

### Template for New Pages
See `pages/TEMPLATE.html` for a complete working example

---

## 🚨 Important Notes

1. **Path Structure:** Adjust `../../../` paths based on your file location
   - Files in `/pages/`: use `../../../` to reach `/frontend/`
   - Files in root `/admin/`: use `../../` to reach `/frontend/`

2. **File Permissions:** Ensure all files are readable by the web server

3. **CORS:** If using on different domain, ensure sidebar.html is accessible

4. **Browser Support:** Works on all modern browsers (Chrome, Firefox, Safari, Edge)

---

## 🎨 Sidebar Structure

```
┌─────────────────────────────────┐
│  HOHOO-VILLE                    │
│  Admin Panel         [☰]        │ ← Header with toggle
├─────────────────────────────────┤
│ 📊 Dashboard                    │
│ 👥 User Management              │
│ 📈 Analytics                    │
│ 📋 Reports                      │
│ ⚙️  System Settings              │
│ 🔐 Roles & Permissions          │
│ 📝 Activity Logs                │
│ ✅ Approval Queue                │
│ 🎓 Manage Qualifications        │
│ 📦 View Batches                 │
│ 👨‍🎓 View Trainees                │
│ 👨‍🏫 View Trainers                │
├─────────────────────────────────┤
│ 🚪 Logout                        │ ← Footer
└─────────────────────────────────┘
```

---

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review browser console for errors (F12)
3. Compare your implementation with TEMPLATE.html
4. Check file paths are correct

---

**Last Updated:** February 14, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
