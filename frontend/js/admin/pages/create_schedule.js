// The shared scheduling page reads this before it initializes.
window.SCHEDULE_WORKFLOW_ROLE = 'admin';

function getCreateScheduleStoredUser() {
    try {
        const parsedUser = JSON.parse(localStorage.getItem('user') || 'null');
        return parsedUser?.user && typeof parsedUser.user === 'object'
            ? parsedUser.user
            : parsedUser;
    } catch (error) {
        return null;
    }
}

function getCreateScheduleDisplayName(user) {
    const candidates = [
        [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim(),
        user?.full_name,
        user?.name,
        user?.username
    ];

    return candidates.find((value) => typeof value === 'string' && value.trim() !== '') || 'Admin';
}

function hydrateCreateScheduleSidebarProfile() {
    const user = getCreateScheduleStoredUser();
    if (!user) return;

    const displayName = getCreateScheduleDisplayName(user);
    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarRole = document.getElementById('sidebarUserRole');
    const sidebarImage = document.getElementById('sidebarUserProfileImage');

    if (sidebarName) sidebarName.textContent = displayName;
    if (sidebarRole) sidebarRole.textContent = 'Admin';
    if (sidebarImage) {
        sidebarImage.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
        sidebarImage.alt = `${displayName} profile`;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateCreateScheduleSidebarProfile);
} else {
    hydrateCreateScheduleSidebarProfile();
}
