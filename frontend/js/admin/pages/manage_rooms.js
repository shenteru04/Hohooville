const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;
let currentViewMode = 'classic';
let allRoomsData = [];

document.addEventListener('DOMContentLoaded', async () => {
    await ensureSwal();
    initUserDropdown();
    initRoomActionMenus();
    initLogout();
    initArchiveButton();
    initRoomForm();
    initSearch();
    initViewModeButtons();
    updateViewModeButtons();
    loadRooms();
});

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

function initUserDropdown() {
    const button = document.getElementById('userDropdown');
    const menu = document.getElementById('userDropdownMenu');
    if (!button || !menu) return;

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#userDropdown') && !event.target.closest('#userDropdownMenu')) {
            menu.classList.add('hidden');
        }
    });
}

function initRoomActionMenus() {
    document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-room-actions-wrapper]')) {
            closeRoomActionMenus();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeRoomActionMenus();
        }
    });
}

function closeRoomActionMenus() {
    document.querySelectorAll('[data-room-actions-menu]').forEach((menu) => {
        menu.classList.add('hidden');
    });

    document.querySelectorAll('[data-room-actions-toggle]').forEach((button) => {
        button.setAttribute('aria-expanded', 'false');
    });
}

function toggleRoomActionMenu(event, roomId) {
    event.preventDefault();
    event.stopPropagation();

    const menu = document.querySelector(`[data-room-actions-menu="${roomId}"]`);
    const button = document.querySelector(`[data-room-actions-toggle="${roomId}"]`);
    if (!menu || !button) return;

    const shouldOpen = menu.classList.contains('hidden');
    closeRoomActionMenus();

    if (shouldOpen) {
        menu.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
    }
}

async function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async (event) => {
        event.preventDefault();
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
                if (typeof window.logout === 'function') {
                    window.logout();
                    return;
                }
                localStorage.clear();
                window.location.href = '/Hohoo-ville/frontend/login.html';
            }
        });
    });
}

function initArchiveButton() {
    const form = document.getElementById('roomForm');
    if (!form || document.getElementById('showArchiveModal')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'showArchiveModal';
    button.className = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';
    button.innerHTML = '<i class="fas fa-box-archive"></i> View Archived Rooms';
    form.insertAdjacentElement('beforebegin', button);
    button.addEventListener('click', showArchivedRoomsModal);
}

function initViewModeButtons() {
    const viewModeBtn = document.getElementById('viewModeBtn');
    const classicModeBtn = document.getElementById('classicModeBtn');

    if (viewModeBtn) {
        viewModeBtn.addEventListener('click', () => {
            currentViewMode = 'schedule';
            updateViewModeButtons();
            filterAndDisplayRooms(document.getElementById('searchRooms')?.value || '');
        });
    }

    if (classicModeBtn) {
        classicModeBtn.addEventListener('click', () => {
            currentViewMode = 'classic';
            updateViewModeButtons();
            filterAndDisplayRooms(document.getElementById('searchRooms')?.value || '');
        });
    }
}

function updateViewModeButtons() {
    const viewModeBtn = document.getElementById('viewModeBtn');
    const classicModeBtn = document.getElementById('classicModeBtn');

    if (viewModeBtn) {
        viewModeBtn.className = currentViewMode === 'schedule'
            ? 'inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100'
            : 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';
    }

    if (classicModeBtn) {
        classicModeBtn.className = currentViewMode === 'classic'
            ? 'inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100'
            : 'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';
    }
}

function initSearch() {
    const searchInput = document.getElementById('searchRooms');
    const clearBtn = document.getElementById('clearSearchBtn');

    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            filterAndDisplayRooms(event.target.value || '');
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (!searchInput) return;
            searchInput.value = '';
            filterAndDisplayRooms('');
        });
    }
}

function filterRooms(searchQuery = '') {
    const normalizedQuery = String(searchQuery || '').trim().toLowerCase();
    if (!normalizedQuery) return [...allRoomsData];

    return allRoomsData.filter((room) => {
        const roomName = String(room.room_name || '').toLowerCase();
        const roomDescription = String(room.room_description || '').toLowerCase();
        const scheduledClasses = String(room.scheduled_classes || '').toLowerCase();
        const nextSchedule = String(room.next_schedule || '').toLowerCase();

        return roomName.includes(normalizedQuery)
            || roomDescription.includes(normalizedQuery)
            || scheduledClasses.includes(normalizedQuery)
            || nextSchedule.includes(normalizedQuery);
    });
}

function filterAndDisplayRooms(searchQuery = '') {
    displayRooms(filterRooms(searchQuery));
}

function initRoomForm() {
    const form = document.getElementById('roomForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const roomName = document.getElementById('roomName')?.value?.trim();
        const roomDescription = document.getElementById('roomDescription')?.value?.trim() || '';

        if (!roomName) {
            showAlert('Missing Field', 'Room name is required.', 'warning');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/admin/rooms.php?action=create`, {
                room_name: roomName,
                room_description: roomDescription
            });

            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Error creating room.');
            }

            showAlert('Room Created', 'The room was created successfully.', 'success');
            form.reset();
            loadRooms();
        } catch (error) {
            console.error('Create room error:', error);
            showAlert('Error', error.response?.data?.message || error.message || 'Error creating room.', 'error');
        }
    });
}

function showAlert(title, text, icon) {
    if (window.Swal) {
        Swal.fire({ title, text, icon });
        return;
    }
    alert(`${title}: ${text}`);
}

async function showArchivedRoomsModal() {
    let archivedRooms = [];
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/rooms.php?action=archived`);
        archivedRooms = Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
        archivedRooms = [];
    }

    const html = archivedRooms.length
        ? archivedRooms.map((room) => `
            <div class="mb-2 flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div class="text-left">
                    <p class="font-semibold text-slate-800">${escapeHtml(room.room_name || '')}</p>
                    <p class="text-xs text-slate-500">${escapeHtml(room.room_description || 'No description')}</p>
                </div>
                <button class="restore-room-btn inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700" data-room-id="${room.room_id}" data-room-name="${escapeHtml(room.room_name || '')}">
                    <i class="fas fa-undo"></i> Restore
                </button>
            </div>
        `).join('')
        : '<div class="py-3 text-sm text-slate-500">No archived rooms found.</div>';

    Swal.fire({
        title: 'Archived Rooms',
        html,
        showCloseButton: true,
        showConfirmButton: false,
        width: '52rem',
        didOpen: () => {
            const container = Swal.getHtmlContainer();
            if (!container) return;

            container.querySelectorAll('.restore-room-btn').forEach((button) => {
                button.addEventListener('click', async () => {
                    const roomId = button.getAttribute('data-room-id');
                    const roomName = button.getAttribute('data-room-name') || 'this room';

                    const result = await Swal.fire({
                        title: 'Restore Room?',
                        text: `Restore "${roomName}" and make it available again?`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Restore',
                        confirmButtonColor: '#059669'
                    });

                    if (!result.isConfirmed) return;

                    try {
                        const response = await axios.post(`${API_BASE_URL}/admin/rooms.php?action=unarchive`, { room_id: roomId });
                        if (!response.data?.success) {
                            throw new Error(response.data?.message || 'Failed to restore room.');
                        }
                        showAlert('Restored', 'The room has been restored successfully.', 'success');
                        loadRooms();
                    } catch (error) {
                        showAlert('Error', error.response?.data?.message || error.message || 'Failed to restore room.', 'error');
                    }
                });
            });
        }
    });
}

async function loadRooms() {
    const roomList = document.getElementById('roomList');
    if (!roomList) return;

    roomList.innerHTML = '<p class="text-sm text-slate-500">Loading rooms...</p>';

    try {
        const response = await axios.get(`${API_BASE_URL}/admin/rooms.php?action=schedules`);
        const rooms = Array.isArray(response.data?.data) ? response.data.data : [];
        allRoomsData = rooms;

        if (!rooms.length) {
            roomList.innerHTML = `
                <article class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No rooms found.
                </article>
            `;
            return;
        }

        filterAndDisplayRooms(document.getElementById('searchRooms')?.value || '');
    } catch (error) {
        console.error('Load rooms error:', error);
        roomList.innerHTML = '<p class="text-sm text-rose-600">Error loading rooms.</p>';
    }
}

function displayRooms(rooms) {
    const roomList = document.getElementById('roomList');
    if (!roomList) return;

    if (!rooms.length) {
        roomList.innerHTML = `
            <article class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No rooms match the current filters.
            </article>
        `;
        return;
    }

    if (currentViewMode === 'schedule') {
        displayScheduleView(rooms);
    } else {
        displayClassicView(rooms);
    }

    bindRoomActionButtons();
}

function displayClassicView(rooms) {
    const roomList = document.getElementById('roomList');

    roomList.innerHTML = `
        <h3 class="mb-3 text-base font-semibold text-slate-900">Existing Rooms (${rooms.length})</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${rooms.map((room) => {
                const activeClasses = room.active_classes || 0;
                return `
                    <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex-1">
                                <p class="font-semibold text-slate-900">${escapeHtml(room.room_name || '')}</p>
                                <p class="mt-1 text-sm text-slate-600">${escapeHtml(room.room_description || 'No description')}</p>
                            </div>
                            <div class="flex items-start gap-2">
                                ${activeClasses > 0 ? `<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">${activeClasses} active</span>` : ''}
                                <div class="relative shrink-0" data-room-actions-wrapper>
                                    <button
                                        type="button"
                                        class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                        data-room-actions-toggle="${room.room_id}"
                                        aria-haspopup="true"
                                        aria-expanded="false"
                                        aria-controls="roomActionsMenu-${room.room_id}"
                                        aria-label="Open room actions"
                                        onclick="toggleRoomActionMenu(event, ${room.room_id})"
                                    >
                                        <i class="fas fa-ellipsis-vertical"></i>
                                    </button>
                                    <div
                                        id="roomActionsMenu-${room.room_id}"
                                        class="absolute right-0 top-full z-30 mt-2 hidden w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80"
                                        data-room-actions-menu="${room.room_id}"
                                    >
                                        <div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            Actions
                                        </div>
                                        <button
                                            type="button"
                                            class="view-room-btn flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                                            data-room-id="${room.room_id}"
                                            onclick="closeRoomActionMenus()"
                                        >
                                            <i class="fas fa-eye w-4 text-center text-blue-500"></i>
                                            <span>Details</span>
                                        </button>
                                        <button
                                            type="button"
                                            class="edit-room-btn flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                            data-room-id="${room.room_id}"
                                            data-room-name="${escapeHtml(room.room_name || '')}"
                                            data-room-description="${escapeHtml(room.room_description || '')}"
                                            onclick="closeRoomActionMenus()"
                                        >
                                            <i class="fas fa-pen w-4 text-center text-slate-500"></i>
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            type="button"
                                            class="archive-room-btn flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                                            data-room-id="${room.room_id}"
                                            onclick="closeRoomActionMenus()"
                                        >
                                            <i class="fas fa-box-archive w-4 text-center text-amber-500"></i>
                                            <span>Archive</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ${room.next_schedule ? `<p class="mt-2 text-xs text-slate-500"><i class="fas fa-clock mr-1"></i> Next: ${escapeHtml(room.next_schedule)}</p>` : ''}
                    </article>
                `;
            }).join('')}
        </div>
    `;
}

function displayScheduleView(rooms) {
    const roomList = document.getElementById('roomList');

    roomList.innerHTML = `
        <h3 class="mb-3 text-base font-semibold text-slate-900">Room Schedule Overview (${rooms.length})</h3>
        <div class="space-y-3">
            ${rooms.map((room) => {
                const activeClasses = room.active_classes || 0;
                return `
                    <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex-1">
                                <div class="flex items-center gap-3">
                                    <h4 class="text-base font-semibold text-slate-900">${escapeHtml(room.room_name || '')}</h4>
                                    ${activeClasses > 0 ? `<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">${activeClasses} class${activeClasses !== 1 ? 'es' : ''}</span>` : '<span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">No active classes</span>'}
                                </div>
                                <p class="mt-1 text-sm text-slate-600">${escapeHtml(room.room_description || 'No description')}</p>
                                ${room.next_schedule ? `<p class="mt-2 text-xs text-blue-600"><i class="fas fa-calendar-alt mr-1"></i> Next: <strong>${escapeHtml(room.next_schedule)}</strong></p>` : ''}
                            </div>
                            <div class="relative shrink-0" data-room-actions-wrapper>
                                <button
                                    type="button"
                                    class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                    data-room-actions-toggle="${room.room_id}"
                                    aria-haspopup="true"
                                    aria-expanded="false"
                                    aria-controls="roomActionsMenu-${room.room_id}"
                                    aria-label="Open room actions"
                                    onclick="toggleRoomActionMenu(event, ${room.room_id})"
                                >
                                    <i class="fas fa-ellipsis-vertical"></i>
                                </button>
                                <div
                                    id="roomActionsMenu-${room.room_id}"
                                    class="absolute right-0 top-full z-30 mt-2 hidden w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80"
                                    data-room-actions-menu="${room.room_id}"
                                >
                                    <div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Actions
                                    </div>
                                    <button
                                        type="button"
                                        class="view-room-btn flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                                        data-room-id="${room.room_id}"
                                        onclick="closeRoomActionMenus()"
                                    >
                                        <i class="fas fa-list w-4 text-center text-blue-500"></i>
                                        <span>View Schedule</span>
                                    </button>
                                    <button
                                        type="button"
                                        class="edit-room-btn flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                        data-room-id="${room.room_id}"
                                        data-room-name="${escapeHtml(room.room_name || '')}"
                                        data-room-description="${escapeHtml(room.room_description || '')}"
                                        onclick="closeRoomActionMenus()"
                                    >
                                        <i class="fas fa-pen w-4 text-center text-slate-500"></i>
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        type="button"
                                        class="archive-room-btn flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                        data-room-id="${room.room_id}"
                                        onclick="closeRoomActionMenus()"
                                    >
                                        <i class="fas fa-box-archive w-4 text-center text-slate-500"></i>
                                        <span>Archive</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </article>
                `;
            }).join('')}
        </div>
    `;
}

async function showRoomDetailsModal(roomId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/rooms.php?action=room-detail&room_id=${roomId}`);

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Failed to load room details.');
        }

        const roomInfo = response.data.data || {};
        const schedules = Array.isArray(roomInfo.scheduled_classes) ? roomInfo.scheduled_classes : [];

        let schedulesHtml = '';
        if (schedules.length > 0) {
            schedulesHtml = `
                <div class="mt-4 max-h-96 overflow-y-auto">
                    <h4 class="mb-2 font-semibold text-slate-900">Scheduled Classes:</h4>
                    <div class="space-y-2">
                        ${schedules.map((schedule) => `
                            <div class="rounded-lg border-l-4 ${schedule.status === 'open' ? 'border-l-green-500 bg-green-50' : 'border-l-slate-500 bg-slate-50'} p-3">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <p class="font-semibold text-slate-900">${escapeHtml(schedule.batch_name || '')}</p>
                                        <p class="text-sm text-slate-600">${escapeHtml(schedule.qualification_name || 'Unknown qualification')}</p>
                                        ${schedule.trainer_name ? `<p class="text-xs text-slate-500"><i class="fas fa-user-tie mr-1"></i> Trainer: ${escapeHtml(schedule.trainer_name)}</p>` : ''}
                                        ${schedule.schedule ? `<p class="text-xs text-slate-500"><i class="fas fa-calendar mr-1"></i> Schedule: ${escapeHtml(schedule.schedule)}</p>` : ''}
                                    </div>
                                    <span class="rounded-full ${schedule.status === 'open' ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-800'} px-2 py-1 text-xs font-semibold">${escapeHtml(schedule.status || '')}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            schedulesHtml = '<p class="mt-4 text-sm text-slate-500">No scheduled classes in this room yet.</p>';
        }

        Swal.fire({
            title: escapeHtml(roomInfo.room_name || 'Room Details'),
            html: `
                <div class="text-left">
                    <p class="mb-3 text-sm text-slate-600">${escapeHtml(roomInfo.room_description || 'No description provided')}</p>
                    ${schedulesHtml}
                </div>
            `,
            showCloseButton: true,
            showConfirmButton: false,
            width: '52rem'
        });
    } catch (error) {
        console.error('Show room details error:', error);
        showAlert('Error', error.response?.data?.message || error.message || 'Failed to load room details.', 'error');
    }
}

function bindRoomActionButtons() {
    document.querySelectorAll('.view-room-btn').forEach((button) => {
        button.addEventListener('click', async () => {
            const roomId = button.getAttribute('data-room-id');
            if (roomId) await showRoomDetailsModal(roomId);
        });
    });

    document.querySelectorAll('.edit-room-btn').forEach((button) => {
        button.addEventListener('click', async () => {
            const roomId = button.getAttribute('data-room-id');
            const roomName = button.getAttribute('data-room-name') || '';
            const roomDescription = button.getAttribute('data-room-description') || '';

            const result = await Swal.fire({
                title: 'Edit Room',
                html: `
                    <input id="swal-room-name" class="swal2-input" placeholder="Room Name" value="${escapeHtml(roomName)}">
                    <textarea id="swal-room-description" class="swal2-textarea" placeholder="Room Description">${escapeHtml(roomDescription)}</textarea>
                `,
                showCancelButton: true,
                confirmButtonText: 'Save',
                preConfirm: () => {
                    const newRoomName = document.getElementById('swal-room-name')?.value?.trim();
                    const newRoomDescription = document.getElementById('swal-room-description')?.value?.trim() || '';
                    if (!newRoomName) {
                        Swal.showValidationMessage('Room name is required.');
                        return false;
                    }
                    return { room_name: newRoomName, room_description: newRoomDescription };
                }
            });

            if (!result.isConfirmed || !result.value || !roomId) return;

            try {
                const response = await axios.post(`${API_BASE_URL}/admin/rooms.php?action=update`, {
                    room_id: roomId,
                    room_name: result.value.room_name,
                    room_description: result.value.room_description
                });

                if (!response.data?.success) {
                    throw new Error(response.data?.message || 'Failed to update room.');
                }

                showAlert('Saved', 'Room updated successfully.', 'success');
                loadRooms();
            } catch (error) {
                showAlert('Error', error.response?.data?.message || error.message || 'Failed to update room.', 'error');
            }
        });
    });

    document.querySelectorAll('.archive-room-btn').forEach((button) => {
        button.addEventListener('click', async () => {
            const roomId = button.getAttribute('data-room-id');
            if (!roomId) return;

            const result = await Swal.fire({
                title: 'Archive Room?',
                text: 'Are you sure you want to archive this room?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Archive'
            });

            if (!result.isConfirmed) return;

            try {
                const response = await axios.post(`${API_BASE_URL}/admin/rooms.php?action=archive`, { room_id: roomId }, {
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.data?.success) {
                    throw new Error(response.data?.message || 'Failed to archive room.');
                }

                showAlert('Archived', 'Room archived successfully.', 'success');
                loadRooms();
            } catch (error) {
                showAlert('Error', error.response?.data?.message || error.message || 'An unexpected error occurred while archiving the room.', 'error');
            }
        });
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
