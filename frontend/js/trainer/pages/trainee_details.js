const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/Hohoo-ville/uploads/trainees/';
let contentModal = null;
let documentModal = null;
let documentZoom = 1;
let activeDocumentUrl = '';

class SimpleModal {
    constructor(element) {
        this.element = element;
        this.backdrop = element.querySelector('[data-modal-backdrop]');
        this.closeButtons = Array.from(element.querySelectorAll('[data-modal-close]'));
        this.bindEvents();
    }

    bindEvents() {
        if (this.backdrop) {
            this.backdrop.addEventListener('click', () => this.hide());
        }
        this.closeButtons.forEach((btn) => btn.addEventListener('click', () => this.hide()));
        this.element.addEventListener('click', (event) => {
            if (event.target === this.element) this.hide();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !this.element.classList.contains('hidden')) {
                this.hide();
            }
        });
    }

    show() {
        this.element.classList.remove('hidden');
        this.element.classList.add('flex');
        document.body.classList.add('overflow-hidden');
    }

    hide() {
        this.element.classList.add('hidden');
        this.element.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
        if (this.element.id === 'documentModal') {
            resetDocumentPreview();
            activeDocumentUrl = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    initSidebar();
    initUserMenu();
    initLogout();
    initTopTabs();
    initCompetencyTabs();

    const trainerNameEl = document.getElementById('trainerName');
    if (trainerNameEl) trainerNameEl.textContent = user.username || 'Trainer';

    const contentModalEl = document.getElementById('contentModal');
    if (contentModalEl) contentModal = new SimpleModal(contentModalEl);
    const documentModalEl = document.getElementById('documentModal');
    if (documentModalEl) documentModal = new SimpleModal(documentModalEl);

    initDocumentZoomControls();

    const urlParams = new URLSearchParams(window.location.search);
    const traineeId = urlParams.get('id') || urlParams.get('trainee_id');
    const tabParam = urlParams.get('tab');

    if (traineeId) {
        loadTraineeDetails(traineeId);
    } else {
        const container = document.getElementById('profile-content');
        if (container) {
            container.innerHTML = '<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">No trainee ID provided.</div>';
        }
    }

    if (tabParam) setActiveTopTab(tabParam);
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
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden', 'opacity-0');
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

function initTopTabs() {
    document.querySelectorAll('.top-tab-btn').forEach(button => {
        button.addEventListener('click', () => setActiveTopTab(button.dataset.topTab));
    });
    setActiveTopTab('profile');
}

function initCompetencyTabs() {
    document.querySelectorAll('.competency-tab-btn').forEach(button => {
        button.addEventListener('click', () => setActiveCompetencyTab(button.dataset.competencyTab));
    });
    setActiveCompetencyTab('core');
}

function setActiveTopTab(tabName) {
    const target = tabName === 'attendance' || tabName === 'progress' ? tabName : 'profile';

    document.querySelectorAll('.top-tab-btn').forEach(button => {
        const active = button.dataset.topTab === target;
        if (active) {
            button.classList.add('border-blue-200', 'bg-white', 'text-blue-700', 'font-semibold');
            button.classList.remove('border-transparent', 'bg-transparent', 'text-slate-600', 'font-medium');
        } else {
            button.classList.remove('border-blue-200', 'bg-white', 'text-blue-700', 'font-semibold');
            button.classList.add('border-transparent', 'bg-transparent', 'text-slate-600', 'font-medium');
        }
    });

    document.querySelectorAll('.top-pane').forEach(pane => {
        const active = pane.dataset.topPane === target;
        pane.classList.toggle('hidden', !active);
        pane.classList.toggle('block', active);
    });
}

function setActiveCompetencyTab(tabName) {
    const target = tabName === 'common' || tabName === 'basic' ? tabName : 'core';

    document.querySelectorAll('.competency-tab-btn').forEach(button => {
        const active = button.dataset.competencyTab === target;
        if (active) {
            button.classList.add('border-blue-200', 'bg-white', 'text-blue-700', 'font-semibold');
            button.classList.remove('border-transparent', 'bg-transparent', 'text-slate-600', 'font-medium');
        } else {
            button.classList.remove('border-blue-200', 'bg-white', 'text-blue-700', 'font-semibold');
            button.classList.add('border-transparent', 'bg-transparent', 'text-slate-600', 'font-medium');
        }
    });

    document.querySelectorAll('.competency-pane').forEach(pane => {
        const active = pane.dataset.competencyPane === target;
        pane.classList.toggle('hidden', !active);
        pane.classList.toggle('block', active);
    });
}

function initDocumentZoomControls() {
    const zoomInBtn = document.getElementById('docZoomInBtn');
    const zoomOutBtn = document.getElementById('docZoomOutBtn');
    const zoomResetBtn = document.getElementById('docZoomResetBtn');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => setDocumentZoom(documentZoom + 0.1));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => setDocumentZoom(documentZoom - 0.1));
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => setDocumentZoom(1));
}

function setDocumentZoom(value) {
    const zoomLayer = document.getElementById('documentZoomLayer');
    const zoomLabel = document.getElementById('docZoomLabel');
    if (!zoomLayer) return;

    documentZoom = Math.max(0.5, Math.min(3, Number(value.toFixed(2))));
    zoomLayer.style.transform = `scale(${documentZoom})`;
    if (zoomLabel) zoomLabel.textContent = `${Math.round(documentZoom * 100)}%`;
}

function resetDocumentPreview() {
    const imageEl = document.getElementById('documentPreviewImage');
    const frameEl = document.getElementById('documentPreviewFrame');
    const fallbackEl = document.getElementById('documentPreviewFallback');
    const downloadLink = document.getElementById('documentPreviewDownloadLink');

    if (imageEl) {
        imageEl.classList.add('hidden');
        imageEl.removeAttribute('src');
    }
    if (frameEl) {
        frameEl.classList.add('hidden');
        frameEl.removeAttribute('src');
    }
    if (fallbackEl) fallbackEl.classList.add('hidden');
    if (downloadLink) downloadLink.setAttribute('href', '#');

    setDocumentZoom(1);
}

function openDocumentModal(url, title) {
    if (!documentModal || !url) return;

    const modalTitle = document.getElementById('documentModalTitle');
    const openBtn = document.getElementById('docOpenNewTabBtn');
    const imageEl = document.getElementById('documentPreviewImage');
    const frameEl = document.getElementById('documentPreviewFrame');
    const fallbackEl = document.getElementById('documentPreviewFallback');
    const downloadLink = document.getElementById('documentPreviewDownloadLink');

    resetDocumentPreview();
    activeDocumentUrl = url;
    if (modalTitle) modalTitle.textContent = title || 'Submitted Document';
    if (openBtn) openBtn.href = url;
    if (downloadLink) downloadLink.href = url;

    const cleanUrl = url.split('?')[0].toLowerCase();
    const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg|avif)$/i.test(cleanUrl);
    const isPdf = /\.pdf$/i.test(cleanUrl);
    const likelyUnsupportedInline = /\.(doc|docx|ppt|pptx|xls|xlsx|csv)$/i.test(cleanUrl);

    if (isImage && imageEl) {
        imageEl.src = url;
        imageEl.classList.remove('hidden');
    } else if (isPdf && frameEl) {
        frameEl.src = url;
        frameEl.classList.remove('hidden');
    } else if (likelyUnsupportedInline) {
        if (fallbackEl) fallbackEl.classList.remove('hidden');
    } else if (frameEl) {
        // Try iframe preview for any browser-supported file.
        frameEl.src = url;
        frameEl.classList.remove('hidden');
        frameEl.onerror = () => {
            frameEl.classList.add('hidden');
            if (fallbackEl) fallbackEl.classList.remove('hidden');
        };
    } else if (fallbackEl) {
        fallbackEl.classList.remove('hidden');
    }

    documentModal.show();
}

function setDocumentLink(linkEl, fileName, title) {
    if (!linkEl) return;
    const hasFile = Boolean(fileName);

    if (!hasFile) {
        linkEl.href = '#';
        linkEl.classList.add('pointer-events-none', 'opacity-50');
        linkEl.onclick = null;
        return;
    }

    const fileUrl = UPLOADS_URL + encodeURIComponent(fileName);
    linkEl.href = fileUrl;
    linkEl.classList.remove('pointer-events-none', 'opacity-50');
    linkEl.onclick = (event) => {
        event.preventDefault();
        openDocumentModal(fileUrl, title);
    };
}

async function loadTraineeDetails(traineeId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/trainee_details.php?trainee_id=${traineeId}`);
        if (response.data.success) {
            populateTraineeData(response.data.data);
        } else {
            const container = document.getElementById('profile-content');
            if (container) container.innerHTML = `<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">${response.data.message}</div>`;
        }
    } catch (error) {
        console.error('Error loading trainee details:', error);
        const container = document.getElementById('profile-content');
        if (container) container.innerHTML = '<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Failed to load trainee details.</div>';
    }
}

function populateTraineeData(details) {
    const profile = details.profile;
    if (!profile) {
        const container = document.getElementById('profile-content');
        if (container) container.innerHTML = '<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Trainee profile data not found.</div>';
        return;
    }

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text || 'N/A';
    };

    const fullName = `${profile.first_name || ''} ${profile.middle_name || ''} ${profile.last_name || ''} ${profile.extension_name || ''}`
        .replace(/\s+/g, ' ')
        .trim();

    setText('headerTraineeName', fullName);
    setText('headerTraineeCourse', profile.course_name);

    const photoEl = document.getElementById('headerTraineePhoto');
    if (photoEl) {
        if (profile.photo_file) {
            photoEl.src = UPLOADS_URL + encodeURIComponent(profile.photo_file);
        } else {
            photoEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;
        }
    }

    setText('profileFullName', fullName);
    setText('profileEmail', profile.email);
    setText('profilePhone', profile.phone_number);
    setText('profileFacebook', profile.facebook_account);
    setText('profileAddress', [profile.house_no_street, profile.barangay, profile.city_municipality, profile.province].filter(Boolean).join(', '));

    setText('profileSex', profile.sex);
    setText('profileCivilStatus', profile.civil_status);
    setText('profileBirthdate', profile.birthdate);
    setText('profileAge', profile.age);
    setText('profileBirthplace', [profile.birthplace_city, profile.birthplace_province].filter(Boolean).join(', '));
    setText('profileNationality', profile.nationality);

    setText('profileEducation', profile.educational_attainment);
    setText('profileEmployment', profile.employment_status);
    setText('profileSchoolId', profile.trainee_school_id);
    setText('profileBatch', profile.batch_name);
    setText('profileScholarship', profile.scholarship_type);
    setText('profileEnrollStatus', profile.enrollment_status);

    const linkId = document.getElementById('linkValidId');
    const linkCert = document.getElementById('linkBirthCert');

    setDocumentLink(linkId, profile.valid_id_file, 'Valid ID');
    setDocumentLink(linkCert, profile.birth_cert_file, 'Birth Certificate');

    const attendance = details.attendance_summary || {};
    setText('attPresent', attendance.present || 0);
    setText('attAbsent', attendance.absent || 0);
    setText('attLate', attendance.late || 0);

    const progressData = details.training_progress || [];
    renderProgressAccordion('progressAccordionCore', progressData.filter(module => module.competency_type === 'core'), 'Core');
    renderProgressAccordion('progressAccordionCommon', progressData.filter(module => module.competency_type === 'common'), 'Common');
    renderProgressAccordion('progressAccordionBasic', progressData.filter(module => module.competency_type === 'basic'), 'Basic');
}

function renderProgressAccordion(containerId, modules, competencyName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!modules || modules.length === 0) {
        container.innerHTML = `<div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">No ${competencyName} competency progress found.</div>`;
        return;
    }

    container.innerHTML = '';

    modules.forEach(module => {
        let lessonsHtml = '';
        if (module.lessons && module.lessons.length > 0) {
            module.lessons.forEach(lesson => {
                let quizHtml = '<span class="text-slate-500">Not taken</span>';
                if (lesson.quiz) {
                    const score = Number(lesson.quiz.score || 0);
                    const maxScore = Number(lesson.quiz.max_score || 0);
                    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                    const badgeClass = percentage >= 75
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700';

                    quizHtml = `Score: <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}">${score}/${maxScore || 'N/A'}</span> on ${new Date(lesson.quiz.date_recorded).toLocaleDateString()}`;
                }

                let tasksHtml = '<p class="text-sm text-slate-500">No task sheets submitted.</p>';
                if (lesson.task_sheets && lesson.task_sheets.length > 0) {
                    tasksHtml = '<ul class="space-y-2">';
                    lesson.task_sheets.forEach(task => {
                        const content = task.submitted_content ? btoa(unescape(encodeURIComponent(task.submitted_content))) : '';
                        let statusClass = 'bg-slate-100 text-slate-700';
                        if (task.status === 'submitted') statusClass = 'bg-blue-100 text-blue-700';
                        if (task.status === 'approved') statusClass = 'bg-emerald-100 text-emerald-700';
                        if (task.status === 'rejected') statusClass = 'bg-red-100 text-red-700';
                        const grade = task.grade ? ` | Grade: <strong>${task.grade}</strong>` : '';

                        tasksHtml += `
                            <li class="text-sm text-slate-700">
                                <a href="#" class="text-blue-700 hover:underline" onclick="showTaskSheetContent(event, '${content}', '${escapeSingleQuote(task.title || '')}')">
                                    <i class="fas fa-file-alt mr-1 text-slate-500"></i>${task.title || 'Task Sheet'}
                                </a>
                                <span class="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass}">${task.status || 'N/A'}</span>
                                <span class="text-slate-500">${grade}</span>
                            </li>
                        `;
                    });
                    tasksHtml += '</ul>';
                }

                lessonsHtml += `
                    <div class="border-t border-slate-200 p-4">
                        <h6 class="text-sm font-semibold text-slate-900 mb-2">${lesson.lesson_title || 'Untitled Lesson'}</h6>
                        <div class="space-y-3">
                            <div class="text-sm text-slate-700">
                                <i class="fas fa-question-circle mr-2 text-blue-600"></i><strong>Quiz:</strong> ${quizHtml}
                            </div>
                            <div>
                                <div class="text-sm text-slate-700 mb-1">
                                    <i class="fas fa-tasks mr-2 text-blue-600"></i><strong>Task Sheets:</strong>
                                </div>
                                <div class="pl-6">${tasksHtml}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            lessonsHtml = '<div class="border-t border-slate-200 p-4 text-sm text-slate-500">No lessons in this module.</div>';
        }

        container.innerHTML += `
            <details class="group rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <summary class="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                    <span class="font-semibold text-slate-900">${module.module_title || 'Untitled Module'}</span>
                    <i class="fas fa-chevron-down text-slate-400 transition-transform group-open:rotate-180"></i>
                </summary>
                <div class="bg-slate-50">${lessonsHtml}</div>
            </details>
        `;
    });
}

function showTaskSheetContent(event, contentBase64, title) {
    event.preventDefault();

    const modalTitle = document.getElementById('contentModalTitle');
    const modalBody = document.getElementById('contentModalBody');
    if (!modalTitle || !modalBody || !contentModal) return;

    modalTitle.textContent = title || 'Task Sheet';
    try {
        if (contentBase64) {
            const decodedContent = decodeURIComponent(escape(atob(contentBase64)));
            modalBody.innerHTML = decodedContent;
        } else {
            modalBody.innerHTML = '<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">No content submitted.</div>';
        }
    } catch (error) {
        console.error('Error decoding base64 content', error);
        modalBody.innerHTML = '<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Could not display content. It might be corrupted.</div>';
    }

    contentModal.show();
}

function escapeSingleQuote(text) {
    return String(text || '').replace(/'/g, "\\'");
}

window.showTaskSheetContent = showTaskSheetContent;
