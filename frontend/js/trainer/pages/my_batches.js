const API_BASE_URL = window.location.origin + '/hohoo-ville/api';
let currentTrainerId = null; // To store trainer ID
let currentBatches = []; // Store batches for reference
let currentUserId = null;

document.addEventListener('DOMContentLoaded', async function() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = '../../../login.html';
        return;
    }
    currentUserId = user.user_id;

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
        #content .table-responsive, #content table { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
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

    // Remove Attendance and Grading pages from sidebar
    if (sidebar) {
        const ul = sidebar.querySelector('ul');
        if (ul) {
            ul.innerHTML = '';
            const menuItems = [
                { href: '/Hohoo-ville/frontend/html/trainer/trainer_dashboard.html', icon: 'fas fa-home', text: 'Dashboard' },
                { href: 'my_batches.html', icon: 'fas fa-users', text: 'My Batches' },
                { href: 'modules.html', icon: 'fas fa-book', text: 'Modules' },
                { href: 'progress_chart.html', icon: 'fas fa-chart-line', text: 'Progress Chart' },
                { href: 'achievement_chart.html', icon: 'fas fa-trophy', text: 'Achievement Chart' },
                { href: 'reports.html', icon: 'fas fa-file-alt', text: 'Reports' }
            ];
            const currentPage = window.location.pathname.split('/').pop();
            menuItems.forEach(item => {
                const li = document.createElement('li');
                li.className = 'nav-item mb-1';
                const isActive = currentPage === item.href ? 'active' : '';
                li.innerHTML = `<a class="nav-link ${isActive}" href="${item.href}"><i class="${item.icon} me-2"></i> ${item.text}</a>`;
                ul.appendChild(li);
            });
        }
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            const t = response.data.data;
            if (t.first_name && t.last_name) {
                document.getElementById('trainerName').textContent = `${t.first_name} ${t.last_name}`;
            }
            currentTrainerId = response.data.data.trainer_id;
            loadBatches(currentTrainerId);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '../../../login.html';
        });
    }
});

async function loadBatches(trainerId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_batches.php?trainer_id=${trainerId}`);
        if (response.data.success) {
            currentBatches = response.data.data;
            renderBatchesTable(response.data.data);
        } else {
            document.getElementById('batchesTableBody').innerHTML = `<tr><td colspan="5" class="text-center text-danger">${response.data.message || 'No batches assigned.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading batches:', error);
        document.getElementById('batchesTableBody').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load batches.</td></tr>';
    }
}

function renderBatchesTable(data) {
    const tbody = document.getElementById('batchesTableBody');
    tbody.innerHTML = '';

    if (data && data.length > 0) {
        data.forEach(batch => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.dataset.batchId = batch.batch_id;
            row.innerHTML = `
                <td>${batch.batch_name}</td>
                <td>${batch.course_name}</td>
                <td>${batch.schedule || '<span class="text-muted">TBA</span>'}</td>
                <td>${batch.room || '<span class="text-muted">TBA</span>'}</td>
                <td><span class="badge bg-${batch.status === 'open' ? 'success' : 'secondary'}">${batch.status}</span></td>
            `;
            tbody.appendChild(row);

            row.addEventListener('click', function() {
                if (this.classList.contains('table-active')) {
                    // If already active, deactivate it and hide the trainee list
                    this.classList.remove('table-active');
                    document.getElementById('traineesContainer').classList.add('d-none');
                } else {
                    // Otherwise, activate it and load the trainees
                    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
                    this.classList.add('table-active');
                    loadTraineesForBatch(this.dataset.batchId);
                }
            });
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No batches assigned.</td></tr>';
    }
}

async function loadTraineesForBatch(batchId) {
    const traineesContainer = document.getElementById('traineesContainer');
    const traineesBody = document.getElementById('traineesTableBody');
    traineesContainer.classList.remove('d-none');
    traineesBody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm"></div> Loading trainees...</td></tr>';

    // Setup Download Button
    const downloadBtn = document.getElementById('downloadAttendanceBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => generateAttendancePDF(batchId);
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_trainees.php?action=list&trainer_id=${currentTrainerId}&batch_id=${batchId}`);
        if (response.data.success) {
            renderTraineesTable(response.data.data);
        } else {
            traineesBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${response.data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading trainees for batch:', error);
        traineesBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load trainees.</td></tr>';
    }
}

function renderTraineesTable(trainees) {
    const tbody = document.getElementById('traineesTableBody');
    tbody.innerHTML = '';
    if (trainees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No approved trainees found in this batch.</td></tr>';
        return;
    }

    trainees.forEach(trainee => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="fw-bold">${trainee.full_name}</div>
                <div class="text-muted small">${trainee.email}</div>
            </td>
            <td>${trainee.batch_name}</td>
            <td>${trainee.course_name || '<span class="text-muted">N/A</span>'}</td>
            <td><span class="badge bg-success">${trainee.enrollment_status}</span></td>
            <td>
                <a href="trainee_details.html?id=${trainee.trainee_id}" class="btn btn-sm btn-outline-primary" title="View Trainee Details">
                    <i class="fas fa-eye me-1"></i> View
                </a>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function generateAttendancePDF(batchId) {
    const btn = document.getElementById('downloadAttendanceBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Generating...';
    btn.disabled = true;
    let wrapper = null;
    let fixStyle = null;
    const originalScroll = window.scrollY || 0;

    try {
        await ensurePdfLibs();
        // 1. Get Batch Info
        const batch = currentBatches.find(b => b.batch_id == batchId);
        if (!batch) throw new Error("Batch details not found.");

        // 2. Get Trainer Info (for NTTC)
        const trainerRes = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get&user_id=${currentUserId}`);
        const trainer = trainerRes.data.success ? trainerRes.data.data : {};
        const trainerFullName = `${trainer.first_name || ''} ${trainer.last_name || ''}`.toUpperCase();

        // 3. Get Trainees
        const traineesRes = await axios.get(`${API_BASE_URL}/role/trainer/my_trainees.php?action=list&trainer_id=${currentTrainerId}&batch_id=${batchId}`);
        const trainees = traineesRes.data.success ? traineesRes.data.data : [];

        // 4. Build PDF pages from template

        // --- PATCH: Always render 25 rows per page, even if no trainees ---
        const template = document.getElementById('attendanceSheetTemplate');
        if (!template) {
            throw new Error('Attendance sheet template not found.');
        }

        const rowsPerPage = 25;
        const totalPages = Math.max(1, Math.ceil(Math.max(trainees.length, 1) / rowsPerPage));
        const A4_WIDTH_PX = 794;
        const A4_HEIGHT_PX = 1123;

        wrapper = document.createElement('div');
        wrapper.id = 'pdf-render-wrapper';
        wrapper.style.position = 'absolute';
        wrapper.style.left = '0';
        wrapper.style.top = '0';
        wrapper.style.width = `${A4_WIDTH_PX}px`;
        wrapper.style.background = '#fff';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.zIndex = '9999';
        wrapper.style.minHeight = `${totalPages * A4_HEIGHT_PX}px`;

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            const page = template.cloneNode(true);
            page.removeAttribute('id');
            page.style.display = 'block';
            page.style.width = `${A4_WIDTH_PX}px`;
            page.style.boxSizing = 'border-box';
            page.style.pageBreakAfter = pageIndex === totalPages - 1 ? 'auto' : 'always';
            page.style.pageBreakInside = 'avoid';

            console.log('[PDF] Batch:', batch);
            const setText = (selector, value) => {
                const el = page.querySelector(selector);
                if (el) el.textContent = value;
            };

            console.log('[PDF] Trainer:', trainer);
            setText('#pdfProgramName', batch.course_name || batch.qualification_name || 'N/A');
            setText('#pdfDateStart', batch.start_date || 'TBA');
            setText('#pdfDateEnd', batch.end_date || 'TBA');
            setText('#pdfDuration', batch.duration || '');
            console.log('[PDF] Trainees:', trainees);
            setText('#pdfTrainerName', trainerFullName);
            setText('#pdfNttcNumber', trainer.nttc_no || 'N/A');
            setText('#pdfValidityDate', '');
            setText('#pdfDate', new Date().toLocaleDateString());
            setText('#pdfFooterTrainer', trainerFullName);
            setText('#pdfFooterRegistrar', '');
            console.log('[PDF] Template:', template);

            // Normalize image sources so html2canvas can load them
            page.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('src');
                if (!src) return;
                if (src.startsWith('http') || src.startsWith('data:')) return;
                img.src = new URL(src, window.location.href).href;
            });

            const tbody = page.querySelector('#pdfTableBody');
            if (tbody) {
                tbody.innerHTML = '';
                const startIndex = pageIndex * rowsPerPage;
                const pageTrainees = trainees.slice(startIndex, startIndex + rowsPerPage);
                for (let i = 0; i < rowsPerPage; i++) {
                    const t = pageTrainees[i];
                    const row = document.createElement('tr');
                    row.style.height = '21px';
                    const name = t ? t.full_name.toUpperCase() : '';
                    const phone = t ? (t.phone_number || '') : '';
                    const email = t ? (t.email || '') : '';
                    const rowNumber = startIndex + i + 1;
                    row.innerHTML = `
                        <td style="border:1px solid #000;text-align:center;font-size:10px;">${rowNumber}</td>
                        <td style="border:1px solid #000;padding:0 4px;font-size:10px;">${name}</td>
                        <td style="border:1px solid #000;text-align:center;font-size:10px;">${phone}</td>
                        <td style="border:1px solid #000;text-align:center;font-size:10px;">${email}</td>
                        <td style="border:1px solid #000;"></td>
                        <td style="border:1px solid #000;"></td>
                        <td style="border:1px solid #000;"></td>
                        <td style="border:1px solid #000;"></td>
                    `;
                    tbody.appendChild(row);
                }
            }
            wrapper.appendChild(page);
        }

        document.body.appendChild(wrapper);

        // Force-reset table display properties for PDF rendering to override conflicting global styles
        fixStyle = document.createElement('style');
        fixStyle.id = 'pdf-fix-style';
        fixStyle.innerHTML = `
            #pdf-render-wrapper table { display: table !important; }
            #pdf-render-wrapper thead { display: table-header-group !important; }
            #pdf-render-wrapper tbody { display: table-row-group !important; }
            #pdf-render-wrapper tr { display: table-row !important; }
            #pdf-render-wrapper th, #pdf-render-wrapper td { display: table-cell !important; }
        `;
        document.head.appendChild(fixStyle);

        window.scrollTo(0, 0);
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }
        await waitForImages(wrapper);
        // Give the browser a moment to render everything after image loads and style injections
        await new Promise(resolve => setTimeout(resolve, 100));
        await new Promise(resolve => requestAnimationFrame(resolve));

        // 5. Generate PDF (manual: html2canvas + jsPDF)
        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas not available');
        }
        const jsPDF = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null;
        if (!jsPDF) {
            throw new Error('jsPDF not available');
        }

        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pages = Array.from(wrapper.children);

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const canvas = await html2canvas(page, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const maxWidth = pdfWidth - margin * 2;
            const maxHeight = pdfHeight - margin * 2;
            const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
            const renderWidth = canvas.width * ratio;
            const renderHeight = canvas.height * ratio;
            const x = (pdfWidth - renderWidth) / 2;
            const y = (pdfHeight - renderHeight) / 2;

            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', x, y, renderWidth, renderHeight);
        }

        pdf.save(`Attendance_${batch.batch_name.replace(/\s+/g, '_')}.pdf`);

    } catch (error) {
        console.error('PDF Generation Error:', error);
        Swal.fire({title: 'Error', text: 'Failed to generate PDF. Please try again.', icon: 'error'});
    } finally {
        if (wrapper && wrapper.parentElement) {
            wrapper.parentElement.removeChild(wrapper);
        }
        if (fixStyle && fixStyle.parentElement) {
            fixStyle.parentElement.removeChild(fixStyle);
        }
        window.scrollTo(0, originalScroll);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function waitForImages(container) {
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length === 0) return;
    await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    }));
}

async function ensurePdfLibs() {
    const promises = [];
    if (typeof html2canvas === 'undefined') {
        promises.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'));
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
        promises.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'));
    }
    if (promises.length) {
        await Promise.all(promises);
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = Array.from(document.scripts).find(s => s.src === src);
        if (existing) {
            if (existing.dataset.loaded === 'true') return resolve();
            existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener('error', reject, { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.loaded = 'false';
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}
