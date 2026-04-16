const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
let currentTrainerId = null;
let currentBatches = [];
let currentUserId = null;

document.addEventListener('DOMContentLoaded', async function () {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }
    currentUserId = user.user_id;

    initSidebar();
    initUserMenu();
    initLogout();

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            const trainer = response.data.data;
            if (trainer.first_name && trainer.last_name) {
                document.getElementById('trainerName').textContent = `${trainer.first_name} ${trainer.last_name}`;
            } else {
                document.getElementById('trainerName').textContent = user.username || 'Trainer';
            }
            currentTrainerId = trainer.trainer_id;
            loadBatches(currentTrainerId);
        }
    } catch (error) {
        console.error('Error fetching trainer ID:', error);
    }
});

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    if (!sidebar) return;

    function openSidebar() {
        sidebar.classList.remove('-translate-x-full');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('hidden');
            requestAnimationFrame(() => sidebarOverlay.classList.remove('opacity-0'));
        }
        document.body.classList.add('overflow-hidden');
    }

    function closeSidebar() {
        sidebar.classList.add('-translate-x-full');
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
        }
        document.body.classList.remove('overflow-hidden');
    }

    function toggleSidebar() {
        if (sidebar.classList.contains('-translate-x-full')) openSidebar();
        else closeSidebar();
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', toggleSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            document.body.classList.remove('overflow-hidden');
            if (sidebarOverlay) {
                sidebarOverlay.classList.add('hidden', 'opacity-0');
            }
        }
    });
}

function initUserMenu() {
    const userMenuButton = document.getElementById('userMenuButton');
    const userMenuDropdown = document.getElementById('userMenuDropdown');
    if (!userMenuButton || !userMenuDropdown) return;

    userMenuButton.addEventListener('click', function (event) {
        event.stopPropagation();
        userMenuDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', function (event) {
        if (!event.target.closest('#userMenuDropdown')) {
            userMenuDropdown.classList.add('hidden');
        }
    });
}

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.clear();
        window.location.href = '/Hohoo-ville/frontend/login.html';
    });
}

async function loadBatches(trainerId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_batches.php?trainer_id=${trainerId}`);
        const tbody = document.getElementById('batchesTableBody');
        if (!tbody) return;

        if (response.data.success) {
            currentBatches = response.data.data;
            renderBatchesTable(response.data.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-red-600">${response.data.message || 'No batches assigned.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading batches:', error);
        const tbody = document.getElementById('batchesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-red-600">Failed to load batches.</td></tr>';
        }
    }
}

function renderBatchesTable(data) {
    const tbody = document.getElementById('batchesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-500">No batches assigned.</td></tr>';
        return;
    }

    data.forEach(batch => {
        const row = document.createElement('tr');
        row.className = 'cursor-pointer hover:bg-slate-50 transition-colors';
        row.dataset.batchId = batch.batch_id;

        const statusClass = String(batch.status).toLowerCase() === 'open'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-700';

        row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-slate-900">${batch.batch_name || 'N/A'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${batch.course_name || 'N/A'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${batch.schedule || '<span class="text-slate-400">TBA</span>'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${formatRoomValue(batch.room)}</td>
            <td class="px-4 py-3 text-sm">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass}">${batch.status || 'N/A'}</span>
            </td>
        `;

        row.addEventListener('click', function () {
            const isActive = row.classList.contains('bg-blue-50');
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('bg-blue-50'));

            if (isActive) {
                document.getElementById('traineesContainer').classList.add('hidden');
            } else {
                row.classList.add('bg-blue-50');
                loadTraineesForBatch(batch.batch_id);
            }
        });

        tbody.appendChild(row);
    });
}

function formatRoomValue(room) {
    const value = String(room ?? '').trim();
    if (!value || value.toLowerCase() === 'null' || value === '0') {
        return '<span class="text-slate-400">TBA</span>';
    }
    return value;
}

async function loadTraineesForBatch(batchId) {
    const traineesContainer = document.getElementById('traineesContainer');
    const traineesBody = document.getElementById('traineesTableBody');
    if (!traineesContainer || !traineesBody) return;

    traineesContainer.classList.remove('hidden');
    traineesBody.innerHTML = `
        <tr>
            <td colspan="6" class="px-4 py-6 text-center text-sm text-slate-500">
                <i class="fas fa-circle-notch animate-spin mr-2"></i> Loading trainees...
            </td>
        </tr>
    `;

    const downloadBtn = document.getElementById('downloadAttendanceBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => generateAttendancePDF(batchId);
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_trainees.php?action=list&trainer_id=${currentTrainerId}&batch_id=${batchId}`);
        if (response.data.success) {
            renderTraineesTable(response.data.data || []);
        } else {
            traineesBody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-red-600">Error: ${response.data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading trainees for batch:', error);
        traineesBody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-red-600">Failed to load trainees.</td></tr>';
    }
}

function renderTraineesTable(trainees) {
    const tbody = document.getElementById('traineesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!trainees.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-slate-500">No approved trainees found in this batch.</td></tr>';
        return;
    }

    trainees.forEach(trainee => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3">
                <p class="text-sm font-semibold text-slate-900">${trainee.full_name || 'N/A'}</p>
                <p class="text-xs text-slate-500">${trainee.email || ''}</p>
            </td>
            <td class="px-4 py-3 text-sm text-slate-700">${trainee.batch_name || 'N/A'}</td>
            <td class="px-4 py-3 text-sm text-slate-700">${trainee.course_name || '<span class="text-slate-400">N/A</span>'}</td>
            <td class="px-4 py-3 text-sm text-slate-600">${trainee.formatted_enrollment_date || trainee.enrollment_date || 'N/A'}</td>
            <td class="px-4 py-3 text-sm">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">${trainee.enrollment_status || 'Approved'}</span>
            </td>
            <td class="px-4 py-3 text-sm">
                <a href="trainee_details.html?id=${trainee.trainee_id}" class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50" title="View Trainee Details">
                    <i class="fas fa-eye"></i> View
                </a>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function generateAttendancePDF(batchId) {
    const btn = document.getElementById('downloadAttendanceBtn');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Generating...';
    btn.disabled = true;

    let wrapper = null;
    let fixStyle = null;
    const originalScroll = window.scrollY || 0;

    try {
        await ensurePdfLibs();

        const batch = currentBatches.find(b => String(b.batch_id) === String(batchId));
        if (!batch) throw new Error('Batch details not found.');

        const trainerRes = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get&user_id=${currentUserId}`);
        const trainer = trainerRes.data.success ? trainerRes.data.data : {};
        const trainerFullName = `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim().toUpperCase();

        const traineesRes = await axios.get(`${API_BASE_URL}/role/trainer/my_trainees.php?action=list&trainer_id=${currentTrainerId}&batch_id=${batchId}`);
        const trainees = traineesRes.data.success ? traineesRes.data.data : [];

        const template = document.getElementById('attendanceSheetTemplate');
        if (!template) throw new Error('Attendance sheet template not found.');

        const rowsPerPage = 25;
        const totalPages = Math.max(1, Math.ceil(Math.max(trainees.length, 1) / rowsPerPage));
        const a4WidthPx = 794;
        const a4HeightPx = 1123;

        wrapper = document.createElement('div');
        wrapper.id = 'pdf-render-wrapper';
        wrapper.style.position = 'absolute';
        wrapper.style.left = '0';
        wrapper.style.top = '0';
        wrapper.style.width = `${a4WidthPx}px`;
        wrapper.style.background = '#fff';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.zIndex = '9999';
        wrapper.style.minHeight = `${totalPages * a4HeightPx}px`;

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            const page = template.cloneNode(true);
            page.removeAttribute('id');
            page.style.display = 'block';
            page.style.width = `${a4WidthPx}px`;
            page.style.boxSizing = 'border-box';
            page.style.pageBreakAfter = pageIndex === totalPages - 1 ? 'auto' : 'always';
            page.style.pageBreakInside = 'avoid';

            const setText = (selector, value) => {
                const el = page.querySelector(selector);
                if (el) el.textContent = value;
            };

            setText('#pdfProgramName', batch.course_name || batch.qualification_name || 'N/A');
            setText('#pdfDateStart', batch.start_date || 'TBA');
            setText('#pdfDateEnd', batch.end_date || 'TBA');
            setText('#pdfDuration', batch.duration || '');
            setText('#pdfTrainerName', trainerFullName || 'N/A');
            setText('#pdfNttcNumber', trainer.nttc_no || 'N/A');
            setText('#pdfValidityDate', '');
            setText('#pdfDate', new Date().toLocaleDateString());
            setText('#pdfFooterTrainer', trainerFullName || 'N/A');
            setText('#pdfFooterRegistrar', '');

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
                    const trainee = pageTrainees[i];
                    const rowNumber = startIndex + i + 1;
                    const row = document.createElement('tr');
                    row.style.height = '21px';
                    row.innerHTML = `
                        <td style="border:1px solid #000;text-align:center;font-size:10px;">${rowNumber}</td>
                        <td style="border:1px solid #000;padding:0 4px;font-size:10px;">${trainee ? String(trainee.full_name || '').toUpperCase() : ''}</td>
                        <td style="border:1px solid #000;text-align:center;font-size:10px;">${trainee ? (trainee.phone_number || '') : ''}</td>
                        <td style="border:1px solid #000;text-align:center;font-size:10px;">${trainee ? (trainee.email || '') : ''}</td>
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
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await waitForImages(wrapper);
        await new Promise(resolve => setTimeout(resolve, 100));
        await new Promise(resolve => requestAnimationFrame(resolve));

        if (typeof html2canvas === 'undefined') throw new Error('html2canvas not available');
        const jsPDF = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null;
        if (!jsPDF) throw new Error('jsPDF not available');

        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pages = Array.from(wrapper.children);

        for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i], {
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

        const batchName = String(batch.batch_name || 'batch').replace(/\s+/g, '_');
        pdf.save(`Attendance_${batchName}.pdf`);
    } catch (error) {
        console.error('PDF Generation Error:', error);
        Swal.fire({ title: 'Error', text: 'Failed to generate PDF. Please try again.', icon: 'error' });
    } finally {
        if (wrapper && wrapper.parentElement) wrapper.parentElement.removeChild(wrapper);
        if (fixStyle && fixStyle.parentElement) fixStyle.parentElement.removeChild(fixStyle);
        window.scrollTo(0, originalScroll);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function waitForImages(container) {
    const images = Array.from(container.querySelectorAll('img'));
    if (!images.length) return;

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
    if (promises.length) await Promise.all(promises);
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = Array.from(document.scripts).find(script => script.src === src);
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
