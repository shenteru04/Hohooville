const API_BASE_URL = window.location.origin + '/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);
    }

    loadQualifications();

    document.getElementById('createQualificationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const payload = {
            qualification_name: document.getElementById('courseName').value,
            ctpr_number: document.getElementById('ctprNumber').value,
            duration: document.getElementById('duration').value,
            training_cost: document.getElementById('trainingCost').value,
            description: document.getElementById('description').value
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/role/registrar/qualifications.php?action=create`, payload);
            if (response.data.success) {
                Swal.fire('Success', 'Qualification submitted for approval successfully!', 'success');
                this.reset();
                loadQualifications();
            } else {
                Swal.fire('Error', 'Error: ' + response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error creating qualification:', error);
            Swal.fire('Error', 'An error occurred while creating the qualification.', 'error');
        }
    });

    // Inject Sidebar CSS (W3.CSS Reference Style)
    const ms = document.createElement('style');
    ms.innerHTML = `
        #sidebar {
            width: 200px;
            position: fixed;
            z-index: 1050;
            top: 0;
            left: 0;
            height: 100vh;
            overflow-y: auto;
            background-color: #fff;
            box-shadow: 0 2px 5px 0 rgba(0,0,0,0.16), 0 2px 10px 0 rgba(0,0,0,0.12);
            display: block;
        }
        .main-content, #content, .content-wrapper {
            margin-left: 200px !important;
            transition: margin-left .4s;
        }
        #sidebarCloseBtn {
            display: none;
            width: 100%;
            text-align: left;
            padding: 8px 16px;
            background: none;
            border: none;
            font-size: 18px;
        }
        #sidebarCloseBtn:hover { background-color: #ccc; }
        
        @media (max-width: 991.98px) {
            #sidebar { display: none; }
            .main-content, #content, .content-wrapper { margin-left: 0 !important; }
            #sidebarCloseBtn { display: block; }
        }
        .table-responsive, table { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    `;
    document.head.appendChild(ms);

    // Sidebar Logic
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (!document.getElementById('sidebarCloseBtn')) {
            const closeBtn = document.createElement('button');
            closeBtn.id = 'sidebarCloseBtn';
            closeBtn.innerHTML = 'Close &times;';
            closeBtn.addEventListener('click', () => {
                sidebar.style.display = 'none';
            });
            sidebar.insertBefore(closeBtn, sidebar.firstChild);
        }
    }

    // Open Button Logic
    let sc = document.getElementById('sidebarCollapse');
    if (!sc) {
        const nb = document.querySelector('.navbar');
        if (nb) {
            const c = nb.querySelector('.container-fluid') || nb;
            const b = document.createElement('button');
            b.id = 'sidebarCollapse';
            b.className = 'btn btn-outline-primary me-2 d-lg-none';
            b.type = 'button';
            b.innerHTML = '&#9776;';
            c.insertBefore(b, c.firstChild);
            sc = b;
        }
    }
    if (sc) {
        const nb = sc.cloneNode(true);
        if(sc.parentNode) sc.parentNode.replaceChild(nb, sc);
        nb.addEventListener('click', () => {
            if (sidebar) sidebar.style.display = 'block';
        });
    }
});

async function loadQualifications() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/registrar/qualifications.php?action=list`);
        const tbody = document.getElementById('qualificationsTableBody');
        tbody.innerHTML = '';
        if (response.data.success) {
            response.data.data.forEach(q => {
                tbody.innerHTML += `
                    <tr>
                        <td>${q.course_name}</td>
                        <td>${q.ctpr_number || 'N/A'}</td>
                        <td>${q.duration || 'N/A'}</td>
                        <td>${q.training_cost ? '₱' + parseFloat(q.training_cost).toFixed(2) : 'N/A'}</td>
                        <td><span class="badge bg-success">${q.status}</span></td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading qualifications:', error);
    }
}