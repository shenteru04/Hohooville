const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

// SweetAlert2 modal HTML injection (if not already loaded)
(function injectSweetAlert2() {
    if (!window.Swal) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        script.onload = function() {
            // SweetAlert2 loaded
        };
        document.head.appendChild(script);
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    loadRooms();
    // Add Archive Rooms button above the form
    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'btn btn-secondary mb-3';
    archiveBtn.id = 'showArchiveModal';
    archiveBtn.textContent = 'View Archived Rooms';
    const form = document.getElementById('roomForm');
    form.parentNode.insertBefore(archiveBtn, form);
    archiveBtn.addEventListener('click', async function() {
        let archivedRooms = [];
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/rooms.php?action=archived`);
            archivedRooms = response.data.data || [];
        } catch (error) {
            archivedRooms = [];
        }
        Swal.fire({
            title: 'Archived Rooms',
            html: archivedRooms.length > 0 ?
                archivedRooms.map(room => `
                    <div class="d-flex justify-content-between align-items-center border p-2 mb-2 rounded">
                        <div>
                            <strong>${room.room_name}</strong><br>
                            <small class="text-muted">${room.room_description || 'No description'}</small>
                        </div>
                        <button class="btn btn-sm btn-success restore-room-btn" data-room-id="${room.room_id}" title="Restore Room">
                            <i class="fas fa-undo"></i> Restore
                        </button>
                    </div>
                `).join('') :
                '<div>No archived rooms found.</div>',
            showCloseButton: true,
            width: '800px',
            didOpen: () => {
                const swalContainer = Swal.getHtmlContainer();
                if (!swalContainer) return;

                swalContainer.querySelectorAll('.restore-room-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const roomId = this.getAttribute('data-room-id');
                        const roomName = this.closest('.d-flex').querySelector('strong').textContent;

                        Swal.fire({
                            title: 'Restore Room?',
                            text: `Are you sure you want to restore "${roomName}"? It will become available for use again.`,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, restore it!',
                            confirmButtonColor: '#28a745',
                            cancelButtonText: 'Cancel'
                        }).then(async (result) => {
                            if (result.isConfirmed) {
                                try {
                                    const response = await axios.post(`${API_BASE_URL}/admin/rooms.php?action=unarchive`, { room_id: roomId });
                                    if (response.data && response.data.success) {
                                        Swal.fire('Restored!', 'The room has been restored successfully.', 'success');
                                        loadRooms();
                                    } else {
                                        Swal.fire('Error', response.data.message || 'Failed to restore the room.', 'error');
                                    }
                                } catch (error) {
                                    Swal.fire('Error', error.response?.data?.message || 'An unexpected error occurred.', 'error');
                                }
                            }
                        });
                    });
                });
            }
        });
    });
    document.getElementById('roomForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const roomName = document.getElementById('roomName').value;
        const roomDescription = document.getElementById('roomDescription').value;
            try {
                const response = await axios.post(`${API_BASE_URL}/admin/rooms.php?action=create`, {
                    room_name: roomName,
                    room_description: roomDescription
                });
                if (response.data && response.data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Room Created',
                        text: 'The room was created successfully!'
                    });
                    loadRooms();
                    this.reset();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.data && response.data.message ? response.data.message : 'Error creating room.'
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error creating room.'
                });
        }
    });
});

async function loadRooms() {
    const roomList = document.getElementById('roomList');
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/rooms.php?action=list`);
        const rooms = response.data.data || [];
        roomList.innerHTML = '<h4>Existing Rooms</h4>' + rooms.map(room => `
            <div class="border p-2 mb-2">
                <strong>${room.room_name}</strong><br><small class="text-muted">${room.room_description || ''}</small>
                <div class="mt-2">
                    <button class="btn btn-sm btn-primary edit-room-btn" data-room-id="${room.room_id}" data-room-name="${room.room_name}" data-room-description="${room.room_description}">Edit</button>
                    <button class="btn btn-sm btn-warning archive-room-btn" data-room-id="${room.room_id}">Archive</button>
                </div>
            </div>
        `).join('');
        // Archive Modal button event
        document.querySelectorAll('.edit-room-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const roomId = this.getAttribute('data-room-id');
                const roomName = this.getAttribute('data-room-name');
                const roomDescription = this.getAttribute('data-room-description');
                Swal.fire({
                    title: 'Edit Room',
                    html: `
                        <input id="swal-room-name" class="swal2-input" placeholder="Room Name" value="${roomName}">
                        <textarea id="swal-room-description" class="swal2-input" placeholder="Room Description">${roomDescription}</textarea>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Save',
                    preConfirm: () => {
                        const newRoomName = document.getElementById('swal-room-name').value;
                        if (!newRoomName) {
                            Swal.showValidationMessage('Room name is required.');
                            return false;
                        }
                        return {
                            room_name: newRoomName,
                            room_description: document.getElementById('swal-room-description').value
                        };
                    }
                }).then(async result => {
                    if (result.isConfirmed) {
                        try {
                            const response = await axios.post(`${API_BASE_URL}/admin/rooms.php?action=update`, {
                                room_id: roomId,
                                room_name: result.value.room_name,
                                room_description: result.value.room_description
                            });
                            if (response.data && response.data.success) {
                                Swal.fire('Saved!', 'Room updated successfully.', 'success');
                                loadRooms();
                            } else {
                                Swal.fire('Error', response.data.message || 'Failed to update room.', 'error');
                            }
                        } catch (error) {
                            Swal.fire('Error', 'An error occurred while updating the room.', 'error');
                        }
                    }
                });
            });
        });
        document.querySelectorAll('.archive-room-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const roomId = this.getAttribute('data-room-id');
                Swal.fire({
                    title: 'Archive Room?',
                    text: 'Are you sure you want to archive this room?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, archive it!'
                }).then(async result => {
                    if (result.isConfirmed) {
                        try {
                            const response = await axios.post(`${API_BASE_URL}/admin/rooms.php?action=archive`, { room_id: roomId }, {
                                headers: { 'Content-Type': 'application/json' }
                            });
                            if (response.data && response.data.success) {
                                Swal.fire('Archived!', 'Room archived successfully.', 'success');
                                loadRooms();
                            } else {
                                Swal.fire('Error', response.data && response.data.message ? response.data.message : 'Failed to archive room.', 'error');
                            }
                        } catch (error) {
                            const errorMessage = error.response?.data?.message || 'An unexpected error occurred while archiving the room.';
                            Swal.fire('Unable to Archive', errorMessage, 'error');
                        }
                    }
                });
            });
        });
    } catch (error) {
        document.getElementById('roomList').innerHTML = 'Error loading rooms.';
    }
}
