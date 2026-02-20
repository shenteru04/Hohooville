const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
let traineesModal;
let currentBatchTrainees = [];

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    traineesModal = new bootstrap.Modal(document.getElementById('viewTraineesModal'));
    loadBatches();

    // Sidebar Logic (Same as view_trainees.js)
    const ms = document.createElement('style');
    ms.innerHTML = `
        #sidebar { width: 200px; position: fixed; z-index: 1050; top: 0; left: 0; height: 100vh; overflow-y: auto; background-color: #fff; box-shadow: 0 2px 5px 0 rgba(0,0,0,0.16); display: block; }
        .main-content, #content, .content-wrapper { margin-left: 200px !important; transition: margin-left .4s; }
        @media (max-width: 991.98px) { #sidebar { display: none; } .main-content, #content, .content-wrapper { margin-left: 0 !important; } }
    `;
    document.head.appendChild(ms);

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (!document.getElementById('sidebarCloseBtn')) {
            const closeBtn = document.createElement('button');
            closeBtn.id = 'sidebarCloseBtn';
            closeBtn.innerHTML = 'Close &times;';
            closeBtn.style.cssText = 'display: none; width: 100%; text-align: left; padding: 8px 16px; background: none; border: none; font-size: 18px;';
            closeBtn.addEventListener('click', () => sidebar.style.display = 'none');
            sidebar.insertBefore(closeBtn, sidebar.firstChild);
            
            // Show close button on mobile
            if (window.innerWidth <= 991) closeBtn.style.display = 'block';
            window.addEventListener('resize', () => {
                closeBtn.style.display = window.innerWidth <= 991 ? 'block' : 'none';
            });
        }
    }

    let sc = document.getElementById('sidebarCollapse');
    if (sc) {
        sc.addEventListener('click', () => {
            if (sidebar) sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../../../login.html';
    });

    // Modal Search Listener
    const searchInput = document.getElementById('modalSearchInput');
    if(searchInput) {
        searchInput.addEventListener('keyup', filterModalTrainees);
    }
});

async function loadBatches() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainees.php?action=get-batches`);
        if (response.data.success) {
            renderBatchesTable(response.data.data);
        } else {
            Swal.fire('Error', 'Error loading batches: ' + response.data.message, 'error');
        }
    } catch (error) {
        console.error('Error loading batches:', error);
        document.getElementById('batchesTableBody').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load batches.</td></tr>';
    }
}

function renderBatchesTable(data) {
    const tbody = document.getElementById('batchesTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No batches found</td></tr>';
        return;
    }

    data.forEach(batch => {
        const row = document.createElement('tr');
        const count = batch.enrolled_count || 0;
        const badgeClass = batch.status === 'open' ? 'success' : 'secondary';
        
        row.innerHTML = `
            <td>${batch.batch_name}</td>
            <td><span class="badge bg-${badgeClass}">${batch.status.toUpperCase()}</span></td>
            <td>
                <span class="badge bg-info text-dark">${count} Trainees</span>
                ${count >= 25 ? '<span class="badge bg-danger ms-1">FULL</span>' : ''}
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewBatchTrainees(${batch.batch_id}, '${batch.batch_name}')">
                    <i class="fas fa-users me-1"></i> View Trainees
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.viewBatchTrainees = async function(batchId, batchName) {
    document.getElementById('modalBatchName').textContent = batchName;
    document.getElementById('modalTraineeCount').textContent = '0';
    document.getElementById('modalSearchInput').value = ''; // Reset search

    const tbody = document.getElementById('modalTraineesBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    traineesModal.show();

    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/trainees.php?action=get-batch-trainees&batch_id=${batchId}`);
        if (response.data.success) {
            currentBatchTrainees = response.data.data;
            document.getElementById('modalTraineeCount').textContent = currentBatchTrainees.length;
            renderModalTrainees(currentBatchTrainees);
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${response.data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching batch trainees:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading data.</td></tr>';
    }
};

function renderModalTrainees(data) {
    const tbody = document.getElementById('modalTraineesBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No trainees found.</td></tr>';
        return;
    }

    data.forEach(t => {
        const avatarUrl = `https://ui-avatars.com/api/?name=${t.first_name}+${t.last_name}&background=random&size=32`;
        const statusBadge = t.status === 'active' 
            ? '<span class="badge bg-success">Active</span>' 
            : `<span class="badge bg-secondary">${t.status}</span>`;

        tbody.innerHTML += `
            <tr>
                <td class="align-middle">${t.trainee_school_id || '<span class="text-muted">N/A</span>'}</td>
                <td class="align-middle">
                    <div class="d-flex align-items-center">
                        <img src="${avatarUrl}" class="rounded-circle me-2" width="32" height="32" alt="Avatar">
                        <div>
                            <div class="fw-bold">${t.last_name}, ${t.first_name}</div>
                        </div>
                    </div>
                </td>
                <td class="align-middle">${t.email}</td>
                <td class="align-middle text-center">${statusBadge}</td>
            </tr>
        `;
    });
}

function filterModalTrainees() {
    const term = document.getElementById('modalSearchInput').value.toLowerCase();
    const filtered = currentBatchTrainees.filter(t => 
        (t.first_name && t.first_name.toLowerCase().includes(term)) ||
        (t.last_name && t.last_name.toLowerCase().includes(term)) ||
        (t.email && t.email.toLowerCase().includes(term)) ||
        (t.trainee_school_id && t.trainee_school_id.toLowerCase().includes(term))
    );
    renderModalTrainees(filtered);
}