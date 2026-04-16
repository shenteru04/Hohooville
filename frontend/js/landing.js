document.addEventListener('DOMContentLoaded', () => {
    const qualificationsList = document.getElementById('qualificationsList');
    const batchesList = document.getElementById('batchesList');
    const apiBaseUrl = 'api';

    setupMobileMenu();
    setupBackToTop();
    setupCourseCards();
    setupCourseModalEvents();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'submitted') {
        showSubmissionSuccessModal();
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchQualifications(qualificationsList, apiBaseUrl);
    fetchOpenBatches(batchesList, apiBaseUrl);
});

function setupMobileMenu() {
    const menuButton = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (!menuButton || !mobileMenu) return;

    menuButton.addEventListener('click', () => {
        const expanded = menuButton.getAttribute('aria-expanded') === 'true';
        menuButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        mobileMenu.classList.toggle('hidden');
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            menuButton.setAttribute('aria-expanded', 'false');
        });
    });
}

function setupBackToTop() {
    const backToTopButton = document.querySelector('.back-to-top');
    if (!backToTopButton) return;

    const toggleBackToTop = () => {
        if (window.scrollY > 100) backToTopButton.classList.add('active');
        else backToTopButton.classList.remove('active');
    };

    window.addEventListener('scroll', toggleBackToTop);
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function setupCourseCards() {
    const cards = document.querySelectorAll('.course-card');
    cards.forEach((card) => {
        card.addEventListener('click', () => openCourseModal(card));
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openCourseModal(card);
            }
        });
        if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
    });
}

function setupCourseModalEvents() {
    const courseModal = document.getElementById('courseModal');
    if (!courseModal) return;

    courseModal.querySelectorAll('[data-modal-close="courseModal"]').forEach((button) => {
        button.addEventListener('click', () => closeModal('courseModal'));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (!courseModal.classList.contains('hidden')) closeModal('courseModal');
            const successModal = document.getElementById('submissionSuccessModal');
            if (successModal && !successModal.classList.contains('hidden')) closeModal('submissionSuccessModal', true);
        }
    });
}

function openCourseModal(card) {
    const courseModal = document.getElementById('courseModal');
    if (!courseModal || !card) return;

    const title = card.getAttribute('data-course-title') || 'Course Details';
    const description = card.getAttribute('data-course-description') || 'No description available.';
    let galleryImages = [];

    try {
        galleryImages = JSON.parse(card.getAttribute('data-course-gallery') || '[]');
    } catch (_error) {
        galleryImages = [];
    }

    const modalTitle = document.getElementById('courseModalLabel');
    const modalDescription = document.getElementById('courseModalDescription');
    const modalGallery = document.getElementById('courseModalGallery');

    if (modalTitle) modalTitle.textContent = title;
    if (modalDescription) modalDescription.textContent = description;
    if (modalGallery) {
        modalGallery.innerHTML = '';
        if (galleryImages.length > 0) {
            galleryImages.forEach((imgUrl) => {
                const item = document.createElement('a');
                item.href = imgUrl;
                item.target = '_blank';
                item.rel = 'noopener noreferrer';
                item.className = 'block overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm';
                item.innerHTML = `
                    <img src="${escapeHtml(imgUrl)}" class="h-44 w-full object-cover transition-transform duration-200 hover:scale-105" alt="${escapeHtml(title)} gallery image">
                `;
                modalGallery.appendChild(item);
            });
        } else {
            modalGallery.innerHTML = '<p class="text-sm text-slate-500">No gallery images available for this course.</p>';
        }
    }

    openModal('courseModal');
}

async function fetchQualifications(container, apiBaseUrl) {
    if (!container) return;
    try {
        const response = await axios.get(`${apiBaseUrl}/qualifications.php?action=getActive`);
        container.innerHTML = '';

        if (Array.isArray(response.data) && response.data.length > 0) {
            response.data.forEach((qualification) => {
                const card = document.createElement('div');
                card.className = 'mb-3 rounded-xl border border-blue-100 bg-white p-4 shadow-sm';
                card.innerHTML = `
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div class="flex min-w-0 flex-1 items-start gap-3">
                            <i class="fas fa-certificate mt-1 text-blue-600"></i>
                            <div>
                                <h4 class="text-sm font-semibold text-slate-900">${escapeHtml(qualification.qualification_name || 'Untitled Qualification')}</h4>
                                <p class="text-xs text-slate-500">${escapeHtml(qualification.duration ? `${qualification.duration} hours` : 'Duration not specified')}</p>
                            </div>
                        </div>
                        <span class="inline-flex shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">Available</span>
                    </div>
                `;
                container.appendChild(card);
            });
            return;
        }

        container.innerHTML = `
            <div class="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <i class="fas fa-info-circle mr-2"></i>No qualifications currently available. Please check back later.
            </div>
        `;
    } catch (error) {
        console.error('Error fetching qualifications:', error);
        container.innerHTML = `
            <div class="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <i class="fas fa-exclamation-circle mr-2"></i>Could not load qualifications at this time.
            </div>
        `;
    }
}

async function fetchOpenBatches(container, apiBaseUrl) {
    if (!container) return;
    try {
        const response = await axios.get(`${apiBaseUrl}/batches.php?action=getOpen`);
        container.innerHTML = '';

        if (Array.isArray(response.data) && response.data.length > 0) {
            response.data.forEach((batch) => {
                const status = String(batch.status || '').toLowerCase();
                const statusClasses = status === 'open'
                    ? 'bg-emerald-100 text-emerald-700'
                    : status === 'closed'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700';

                const card = document.createElement('div');
                card.className = 'batch-card mb-3 rounded-xl border border-blue-100 bg-white p-4 shadow-sm';
                card.innerHTML = `
                    <h4 class="mb-2 text-base font-bold text-slate-900">
                        <i class="fas fa-graduation-cap mr-2 text-blue-600"></i>${escapeHtml(batch.batch_name || 'Unnamed Batch')}
                    </h4>
                    <p class="text-sm text-slate-600"><strong>Course:</strong> ${escapeHtml(batch.qualification_name || 'N/A')}</p>
                    <p class="mt-1 text-sm text-slate-600"><i class="fas fa-clock mr-2"></i><strong>Schedule:</strong> ${escapeHtml(batch.schedule || 'To be announced')}</p>
                    <div class="mt-3 flex items-center justify-between">
                        <span class="text-sm font-medium text-slate-700">Status:</span>
                        <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses}">${escapeHtml((batch.status || 'N/A').toUpperCase())}</span>
                    </div>
                `;
                container.appendChild(card);
            });
            return;
        }

        container.innerHTML = `
            <div class="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <i class="fas fa-info-circle mr-2"></i>No open batches right now. Please check back soon for the next schedule.
            </div>
        `;
    } catch (error) {
        console.error('Error fetching batches:', error);
        container.innerHTML = `
            <div class="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <i class="fas fa-exclamation-circle mr-2"></i>Could not load batch information at this time.
            </div>
        `;
    }
}

function showSubmissionSuccessModal() {
    const modalHtml = `
        <div class="fixed inset-0 z-[70] hidden items-center justify-center p-4" id="submissionSuccessModal" aria-hidden="true">
            <div class="absolute inset-0 bg-slate-900/60" data-modal-close="submissionSuccessModal"></div>
            <div class="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
                <div class="flex items-center justify-between rounded-t-2xl bg-emerald-600 px-5 py-4 text-white">
                    <h5 class="text-lg font-semibold"><i class="fas fa-check-circle mr-2"></i>Application Submitted!</h5>
                    <button type="button" class="rounded p-1 text-white/90 hover:bg-white/20" data-modal-close="submissionSuccessModal" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="px-5 py-6 text-center">
                    <p class="text-lg font-semibold text-slate-900">Thank you for your application!</p>
                    <p class="mt-3 text-sm text-slate-600">Your submission has been received. Please wait for an email or text message from the registrar regarding the status of your application and the next steps.</p>
                </div>
                <div class="flex justify-end border-t border-slate-200 px-5 py-4">
                    <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" data-modal-close="submissionSuccessModal">
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('submissionSuccessModal');
    if (!modal) return;

    modal.querySelectorAll('[data-modal-close="submissionSuccessModal"]').forEach((button) => {
        button.addEventListener('click', () => closeModal('submissionSuccessModal', true));
    });

    openModal('submissionSuccessModal');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');
}

function closeModal(modalId, removeAfterClose = false) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
    if (removeAfterClose) modal.remove();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
