const API_BASE_URL = `${window.location.origin}/Hohoo-ville/api`;

document.addEventListener('DOMContentLoaded', async () => {
    await ensureSwal();
    initUserDropdown();
    initLogout();
    initArchiveButton();
    initRoomForm();
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

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (typeof window.logout === 'function') {
            window.logout();
            return;
        }
        localStorage.clear();
        window.location.href = '/Hohoo-ville/frontend/login.html';
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
    form.parentNode.insertBefore(button, form);

    button.addEventListener('click', showArchivedRoomsModal);
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
        const response = await axios.get(`${API_BASE_URL}/admin/rooms.php?action=list`);
        const rooms = Array.isArray(response.data?.data) ? response.data.data : [];

        if (!rooms.length) {
            roomList.innerHTML = `
                <article class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No rooms found.
                </article>
            `;
            return;
        }

        roomList.innerHTML = `
            <h3 class="mb-3 text-base font-semibold text-slate-900">Existing Rooms</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${rooms.map((room) => `
                    <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p class="font-semibold text-slate-900">${escapeHtml(room.room_name || '')}</p>
                        <p class="mt-1 text-sm text-slate-600">${escapeHtml(room.room_description || 'No description')}</p>
                        <div class="mt-3 flex flex-wrap gap-2">
                            <button type="button" class="edit-room-btn inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100" data-room-id="${room.room_id}" data-room-name="${escapeHtml(room.room_name || '')}" data-room-description="${escapeHtml(room.room_description || '')}">
                                <i class="fas fa-pen"></i> Edit
                            </button>
                            <button type="button" class="archive-room-btn inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100" data-room-id="${room.room_id}">
                                <i class="fas fa-box-archive"></i> Archive
                            </button>
                        </div>
                    </article>
                `).join('')}
            </div>
        `;

        bindRoomActionButtons();
    } catch (error) {
        console.error('Load rooms error:', error);
        roomList.innerHTML = '<p class="text-sm text-rose-600">Error loading rooms.</p>';
    }
}

function bindRoomActionButtons() {
    document.querySelectorAll('.edit-room-btn').forEach((button) => {
        button.addEventListener('click', async () => {
            const roomId = button.getAttribute('data-room-id');
            const roomName = button.getAttribute('data-room-name') || '';
            const roomDescription = button.getAttribute('data-room-description') || '';

            const result = await Swal.fire({
                title: 'Edit Room',
                html: `
                    <input id="swal-room-name" class="swal2-input" placeholder="Room Name" value="${roomName}">
                    <textarea id="swal-room-description" class="swal2-textarea" placeholder="Room Description">${roomDescription}</textarea>
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

            if (!result.isConfirmed || !result.value) return;

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
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
