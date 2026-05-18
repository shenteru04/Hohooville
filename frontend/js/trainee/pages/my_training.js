const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';
const UPLOADS_URL = window.location.origin + '/Hohoo-ville/uploads/';
const LOGIN_URL = '/Hohoo-ville/frontend/login.html';

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

let lessonItemsModal, lessonContentModal, quizModal, quizResultModal;
let authRedirectInProgress = false;
let lessonFileReadingCleanup = null;
let trainingModulesState = [];

// Simple Modal replacement for Tailwind (toggles hidden/flex classes)
class SimpleModal {
    constructor(element) {
        this.element = element;
        this.backdrop = null;
    }
    show() {
        if(!this.element) return;
        this.element.classList.remove('hidden');
        this.element.classList.add('flex');
        // Add backdrop
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 z-40 transition-opacity';
        document.body.appendChild(this.backdrop);
        document.body.classList.add('overflow-hidden');
    }
    hide() {
        if(!this.element) return;
        this.element.classList.add('hidden');
        this.element.classList.remove('flex');
        if(this.backdrop) this.backdrop.remove();
        document.body.classList.remove('overflow-hidden');
        this.element.dispatchEvent(new Event('hidden.bs.modal'));
    }
}

function sanitizeLessonMaterialContent(rawHtml, options = {}) {
    const { allowTaskCheckboxes = false } = options;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = rawHtml || '';

    // Remove active/unsafe nodes that are not needed in trainee view.
    wrapper.querySelectorAll('script, iframe, object, embed, template').forEach(node => node.remove());

    // Remove trainer action buttons and any inline event handlers.
    wrapper.querySelectorAll('button').forEach(btn => btn.remove());
    wrapper.querySelectorAll('*').forEach(el => {
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.toLowerCase().startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        });

        // Materials should be view-only (except allowed task-sheet checkboxes).
        if (el.hasAttribute('contenteditable')) {
            el.setAttribute('contenteditable', 'false');
        }
    });

    // Remove table "Actions" column if present.
    wrapper.querySelectorAll('table').forEach(table => {
        const headers = Array.from(table.querySelectorAll('thead tr:first-child th'));
        let actionIndex = -1;
        headers.forEach((th, idx) => {
            const text = (th.textContent || '').trim().toLowerCase();
            if (text === 'actions' || th.classList.contains('table-actions-header')) {
                actionIndex = idx;
            }
        });

        if (actionIndex >= 0) {
            table.querySelectorAll('tr').forEach(row => {
                const cells = row.children;
                if (cells[actionIndex]) cells[actionIndex].remove();
            });
        }
    });

    // Disable all form controls except task-sheet checkboxes (when allowed).
    wrapper.querySelectorAll('input, textarea, select').forEach(control => {
        const tag = control.tagName.toLowerCase();
        const type = (control.getAttribute('type') || '').toLowerCase();
        const isCheckbox = tag === 'input' && type === 'checkbox';

        if (isCheckbox && allowTaskCheckboxes) {
            control.disabled = false;
            control.classList.add('h-4', 'w-4', 'accent-blue-600', 'cursor-pointer');
        } else {
            control.disabled = true;
            if (tag === 'input' || tag === 'textarea') {
                control.readOnly = true;
            }
            control.classList.add('cursor-not-allowed', 'opacity-90');
        }
    });

    return wrapper.innerHTML;
}

function enhanceLessonPreviewLayout(root) {
    if (!root) {
        return;
    }

    root.querySelectorAll('table').forEach((table) => {
        table.classList.add('lesson-preview-table');

        if (!table.parentElement || !table.parentElement.classList.contains('lesson-preview-table-wrap')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'lesson-preview-table-wrap';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });

    root.querySelectorAll('img').forEach((image) => {
        image.loading = 'lazy';
        image.classList.add('h-auto', 'max-w-full');
    });

    root.querySelectorAll('a').forEach((link) => {
        link.classList.add('break-all');
    });
}

function wrapLessonPreviewContent(contentHtml, extraClasses = '') {
    const classes = ['lesson-preview-prose'];
    if (extraClasses) {
        classes.push(extraClasses);
    }

    return `
        <div class="lesson-preview-shell rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
            <article class="${classes.join(' ')}" data-lesson-preview="true">${contentHtml}</article>
        </div>
    `;
}

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch (error) {
        console.error('Failed to parse stored user session:', error);
        return null;
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function getRequestConfig(config = {}) {
    return {
        ...config,
        headers: {
            ...(config.headers || {}),
            ...getAuthHeaders()
        }
    };
}

function encodeInlineValue(value) {
    return encodeURIComponent(String(value ?? ''));
}

function decodeInlineValue(value) {
    try {
        return decodeURIComponent(String(value ?? ''));
    } catch (error) {
        return String(value ?? '');
    }
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatQuizScoreValue(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return '0';
    }

    return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2);
}

function formatRetryLabel(count) {
    const retries = Math.max(0, Number(count || 0));
    return `${retries} ${retries === 1 ? 'retry' : 'retries'} left`;
}

function getQuizMeta(lesson = {}) {
    const hasScore = lesson.score !== null && lesson.score !== undefined && lesson.score !== '';
    const score = hasScore ? Number(lesson.score) : null;
    const totalQuestions = Number(lesson.total_questions || 0);
    const attemptsUsed = Number(lesson.quiz_attempts_used || 0);
    const attemptsLeft = Number(lesson.quiz_attempts_left || 0);
    const maxAttempts = Number(lesson.quiz_max_attempts || 0);
    const isDeadlinePassed = Boolean(lesson.is_deadline_passed)
        || Boolean(lesson.deadline && new Date(lesson.deadline) < new Date());
    const isPerfectScore = Boolean(lesson.quiz_is_perfect)
        || (score !== null && totalQuestions > 0 && score >= totalQuestions);
    const canRetry = Boolean(lesson.can_retry_quiz);

    return {
        hasScore,
        score,
        totalQuestions,
        attemptsUsed,
        attemptsLeft,
        maxAttempts,
        isDeadlinePassed,
        isPerfectScore,
        canRetry
    };
}

function buildQuizActionButton(lesson) {
    if (!lesson.has_quiz) {
        return '';
    }

    const quizMeta = getQuizMeta(lesson);
    const scoreText = quizMeta.hasScore
        ? `${formatQuizScoreValue(quizMeta.score)}/${quizMeta.totalQuestions || 'N/A'}`
        : '';

    if (quizMeta.hasScore && quizMeta.isPerfectScore) {
        return `<button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 cursor-not-allowed opacity-80"><i class="fas fa-check-circle mr-1"></i> Perfect Score (${scoreText})</button>`;
    }

    if (quizMeta.isDeadlinePassed) {
        const deadlineLabel = quizMeta.hasScore ? `Best ${scoreText}` : 'Deadline Passed';
        return `<button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 cursor-not-allowed opacity-80"><i class="fas fa-times-circle mr-1"></i> ${deadlineLabel}</button>`;
    }

    if (quizMeta.hasScore && quizMeta.canRetry) {
        return `<button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-amber-500 hover:bg-amber-600 focus:outline-none transition" onclick="startQuiz(${lesson.lesson_id})"><i class="fas fa-rotate-right mr-1"></i> Retake Quiz (${scoreText}) - ${formatRetryLabel(quizMeta.attemptsLeft)}</button>`;
    }

    if (quizMeta.hasScore) {
        return `<button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-slate-500 cursor-not-allowed opacity-80"><i class="fas fa-flag-checkered mr-1"></i> Best Score (${scoreText})</button>`;
    }

    return `<button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition" onclick="startQuiz(${lesson.lesson_id})"><i class="fas fa-question-circle mr-1"></i> Take Quiz</button>`;
}

function resolveQuizState(lesson) {
    const quizMeta = getQuizMeta(lesson);

    if (!lesson.has_quiz) {
        return 'none';
    }

    if (quizMeta.hasScore && quizMeta.isPerfectScore) {
        return 'perfect';
    }

    if (quizMeta.isDeadlinePassed) {
        return 'expired';
    }

    if (!quizMeta.canRetry && quizMeta.hasScore) {
        return 'attempts-finished';
    }

    return 'available';
}

function findLessonById(lessonId, modules = trainingModulesState) {
    const normalizedLessonId = Number(lessonId);
    if (!Array.isArray(modules) || !Number.isFinite(normalizedLessonId)) {
        return null;
    }

    for (const module of modules) {
        const lessons = Array.isArray(module?.lessons) ? module.lessons : [];
        const match = lessons.find((lesson) => Number(lesson.lesson_id) === normalizedLessonId);
        if (match) {
            return match;
        }
    }

    return null;
}

function patchLessonQuizState(lessonId, result = {}) {
    const lesson = findLessonById(lessonId);
    if (!lesson) {
        return false;
    }

    lesson.score = result.best_score;
    lesson.total_questions = result.total_questions;
    lesson.quiz_attempts_used = result.attempts_used;
    lesson.quiz_attempts_left = result.attempts_left;
    lesson.quiz_max_attempts = result.max_attempts;
    lesson.quiz_is_perfect = Boolean(result.is_perfect);
    lesson.can_retry_quiz = Boolean(result.can_retry);

    return true;
}

function getLessonFileUrl(filePath = '') {
    const normalized = String(filePath || '')
        .split('/')
        .filter(Boolean)
        .map(part => encodeURIComponent(part))
        .join('/');
    return `${UPLOADS_URL}lessons/${normalized}`;
}

function getLessonFileName(filePath = '') {
    const fileName = String(filePath || '').split('/').pop().split('\\').pop();
    return fileName || 'Uploaded learning material';
}

function getLessonFileExtension(filePath = '') {
    const fileName = getLessonFileName(filePath);
    const lastDot = fileName.lastIndexOf('.');
    return lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
}

function normalizeLessonResourceUrl(resourceUrl = '') {
    const trimmedValue = String(resourceUrl || '').trim();
    if (!trimmedValue) {
        return '';
    }

    const normalizedValue = /^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue.replace(/^\/+/, '')}`;

    try {
        const parsedUrl = new URL(normalizedValue);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return '';
        }
        return parsedUrl.toString();
    } catch (error) {
        return '';
    }
}

function extractYouTubeVideoId(parsedUrl) {
    const host = parsedUrl.hostname.replace(/^www\./i, '').toLowerCase();
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

    if (host === 'youtu.be') {
        return pathSegments[0] || '';
    }

    if (host.endsWith('youtube.com')) {
        if (parsedUrl.pathname === '/watch') {
            return parsedUrl.searchParams.get('v') || '';
        }

        if (['embed', 'shorts', 'live'].includes(pathSegments[0])) {
            return pathSegments[1] || '';
        }
    }

    return '';
}

function extractVimeoVideoId(parsedUrl) {
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    for (let index = pathSegments.length - 1; index >= 0; index -= 1) {
        if (/^\d+$/.test(pathSegments[index])) {
            return pathSegments[index];
        }
    }
    return '';
}

function getLessonResourceInfo(resourceUrl = '') {
    const normalizedUrl = normalizeLessonResourceUrl(resourceUrl);
    if (!normalizedUrl) {
        return {
            url: '',
            host: '',
            displayName: '',
            type: 'link',
            label: 'Lesson Link',
            openLabel: 'Open Link',
            embedUrl: ''
        };
    }

    try {
        const parsedUrl = new URL(normalizedUrl);
        const host = parsedUrl.hostname.replace(/^www\./i, '');
        const pathText = parsedUrl.pathname && parsedUrl.pathname !== '/' ? parsedUrl.pathname : '';
        const displayName = `${host}${pathText}` || normalizedUrl;
        const youtubeVideoId = extractYouTubeVideoId(parsedUrl);
        const vimeoVideoId = extractVimeoVideoId(parsedUrl);

        if (youtubeVideoId) {
            return {
                url: normalizedUrl,
                host,
                displayName,
                type: 'youtube',
                label: 'Video Lesson',
                openLabel: 'Open Video',
                embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(youtubeVideoId)}?rel=0`
            };
        }

        if (vimeoVideoId && /(^|\.)vimeo\.com$/i.test(parsedUrl.hostname)) {
            return {
                url: normalizedUrl,
                host,
                displayName,
                type: 'vimeo',
                label: 'Video Lesson',
                openLabel: 'Open Video',
                embedUrl: `https://player.vimeo.com/video/${encodeURIComponent(vimeoVideoId)}`
            };
        }

        if (/\.(mp4|webm|ogg|mov)(?:$|\?)/i.test(parsedUrl.pathname)) {
            return {
                url: normalizedUrl,
                host,
                displayName,
                type: 'direct-video',
                label: 'Video Lesson',
                openLabel: 'Open Video',
                embedUrl: ''
            };
        }

        return {
            url: normalizedUrl,
            host,
            displayName,
            type: 'link',
            label: 'Lesson Link',
            openLabel: 'Open Link',
            embedUrl: ''
        };
    } catch (error) {
        return {
            url: '',
            host: '',
            displayName: '',
            type: 'link',
            label: 'Lesson Link',
            openLabel: 'Open Link',
            embedUrl: ''
        };
    }
}

function clearLessonFileReadingCleanup() {
    if (typeof lessonFileReadingCleanup === 'function') {
        lessonFileReadingCleanup();
    }
    lessonFileReadingCleanup = null;
}

function resetLessonContentPresentation() {
    clearLessonFileReadingCleanup();

    const footer = document.getElementById('lessonContentFooter');
    const submitBtn = document.getElementById('submitTaskSheetBtn');
    const unsubmitBtn = document.getElementById('unsubmitTaskSheetBtn');
    const answerQuizBtn = document.getElementById('answerQuizNowBtn');
    const openLessonFileBtn = document.getElementById('openLessonFileBtn');
    const statusNote = document.getElementById('lessonContentStatusNote');

    if (footer) footer.style.display = 'none';
    if (submitBtn) submitBtn.style.display = 'none';
    if (unsubmitBtn) {
        unsubmitBtn.style.display = 'none';
        unsubmitBtn.classList.add('hidden');
    }
    if (answerQuizBtn) {
        answerQuizBtn.style.display = 'none';
        answerQuizBtn.classList.add('hidden');
        answerQuizBtn.dataset.lessonId = '';
    }
    if (openLessonFileBtn) {
        openLessonFileBtn.classList.add('hidden');
        openLessonFileBtn.removeAttribute('href');
        openLessonFileBtn.textContent = 'Open File';
    }
    if (statusNote) {
        statusNote.classList.add('hidden');
        statusNote.textContent = '';
    }
}

function unlockAnswerQuizButton() {
    const answerQuizBtn = document.getElementById('answerQuizNowBtn');
    const statusNote = document.getElementById('lessonContentStatusNote');
    if (!answerQuizBtn) return;

    answerQuizBtn.classList.remove('hidden');
    answerQuizBtn.style.display = 'inline-flex';
    if (statusNote) {
        statusNote.textContent = 'You reached the end of the material. You can answer the quiz now.';
        statusNote.classList.remove('hidden');
    }
}

function setupLessonFileReadingGate(lessonId, quizState) {
    clearLessonFileReadingCleanup();

    const answerQuizBtn = document.getElementById('answerQuizNowBtn');
    const statusNote = document.getElementById('lessonContentStatusNote');
    const modalBody = document.getElementById('lessonContentBody');

    if (!answerQuizBtn || !modalBody) return;

    answerQuizBtn.classList.add('hidden');
    answerQuizBtn.style.display = 'none';
    answerQuizBtn.dataset.lessonId = String(lessonId || '');

    if (quizState === 'perfect') {
        if (statusNote) {
            statusNote.textContent = 'You already reached a perfect score for this quiz.';
            statusNote.classList.remove('hidden');
        }
        return;
    }

    if (quizState === 'attempts-finished') {
        if (statusNote) {
            statusNote.textContent = 'You already used all available quiz attempts for this lesson.';
            statusNote.classList.remove('hidden');
        }
        return;
    }

    if (quizState === 'expired') {
        if (statusNote) {
            statusNote.textContent = 'The quiz deadline for this lesson has already passed.';
            statusNote.classList.remove('hidden');
        }
        return;
    }

    if (quizState !== 'available') {
        return;
    }

    if (statusNote) {
        statusNote.textContent = 'Scroll to the bottom of the material to unlock the quiz.';
        statusNote.classList.remove('hidden');
    }

    const maybeUnlock = () => {
        const remaining = modalBody.scrollHeight - modalBody.scrollTop - modalBody.clientHeight;
        if (remaining <= 24) {
            unlockAnswerQuizButton();
            clearLessonFileReadingCleanup();
        }
    };

    modalBody.addEventListener('scroll', maybeUnlock);
    const timeoutId = window.setTimeout(maybeUnlock, 150);
    requestAnimationFrame(maybeUnlock);

    lessonFileReadingCleanup = () => {
        modalBody.removeEventListener('scroll', maybeUnlock);
        window.clearTimeout(timeoutId);
    };
}

function renderUnsupportedLessonFilePreview(fileUrl, extension) {
    return `
        <div class="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Inline preview for .${escapeHtml(extension || 'file')} is limited on this device. Use <strong>Open File</strong> below to view the original document.
        </div>
        <div class="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
            Preview unavailable for this file type.
            <div class="mt-4">
                <a href="${fileUrl}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 rounded-md border border-blue-300 bg-white px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50">
                    <i class="fas fa-arrow-up-right-from-square"></i> Open Original File
                </a>
            </div>
        </div>
    `;
}

function extractPlainTextFromLegacyDoc(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let raw = '';

    for (let index = 0; index < bytes.length; index += 1) {
        const code = bytes[index];
        raw += (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126))
            ? String.fromCharCode(code)
            : ' ';
    }

    const segments = raw
        .replace(/\0/g, ' ')
        .split(/[\r\n]+/)
        .map(segment => segment.replace(/\s+/g, ' ').trim())
        .filter(segment => segment.length >= 25);

    return segments.join('\n\n').trim();
}

async function renderPdfPreview(fileUrl) {
    const modalBody = document.getElementById('lessonContentBody');
    if (!modalBody) return;

    if (!window.pdfjsLib) {
        modalBody.innerHTML = renderUnsupportedLessonFilePreview(fileUrl, 'pdf');
        return;
    }

    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    modalBody.innerHTML = '<div class="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Loading PDF preview...</div>';

    const pdf = await window.pdfjsLib.getDocument(fileUrl).promise;
    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'space-y-5';
    modalBody.innerHTML = '';
    modalBody.appendChild(pagesContainer);

    const availableWidth = Math.max(Math.min(modalBody.clientWidth - 32, 900), 280);

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = availableWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = 'w-full rounded-lg border border-slate-200 shadow-sm';

        const wrapper = document.createElement('div');
        wrapper.className = 'rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200';
        wrapper.innerHTML = `<p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Page ${pageNumber}</p>`;
        wrapper.appendChild(canvas);
        pagesContainer.appendChild(wrapper);

        await page.render({ canvasContext: context, viewport }).promise;
    }
}

async function renderDocxPreview(fileUrl) {
    const modalBody = document.getElementById('lessonContentBody');
    if (!modalBody) return;

    if (!window.mammoth) {
        modalBody.innerHTML = renderUnsupportedLessonFilePreview(fileUrl, 'docx');
        return;
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error('Failed to load the DOCX file.');
    }

    const arrayBuffer = await response.arrayBuffer();
    const result = await window.mammoth.convertToHtml({ arrayBuffer });
    const previewHtml = result.value && result.value.trim()
        ? result.value
        : '<p class="text-slate-500">This document does not contain previewable text.</p>';

    modalBody.innerHTML = wrapLessonPreviewContent(sanitizeLessonMaterialContent(previewHtml));
    enhanceLessonPreviewLayout(modalBody);
}

async function renderLegacyDocPreview(fileUrl) {
    const modalBody = document.getElementById('lessonContentBody');
    if (!modalBody) return;

    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error('Failed to load the DOC file.');
    }

    const arrayBuffer = await response.arrayBuffer();
    const extractedText = extractPlainTextFromLegacyDoc(arrayBuffer);

    if (!extractedText) {
        modalBody.innerHTML = renderUnsupportedLessonFilePreview(fileUrl, 'doc');
        return;
    }

    modalBody.innerHTML = `
        <div class="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Legacy .doc preview is shown as simplified text. If the formatting looks incomplete, use <strong>Open File</strong>.
        </div>
        ${wrapLessonPreviewContent(`<pre>${escapeHtml(extractedText)}</pre>`)}
    `;
    enhanceLessonPreviewLayout(modalBody);
}

async function renderLessonFilePreview(filePath) {
    const fileUrl = getLessonFileUrl(filePath);
    const extension = getLessonFileExtension(filePath);
    const modalBody = document.getElementById('lessonContentBody');

    if (!modalBody) return;

    if (extension === 'pdf') {
        await renderPdfPreview(fileUrl);
        return;
    }

    if (extension === 'docx') {
        await renderDocxPreview(fileUrl);
        return;
    }

    if (extension === 'doc') {
        await renderLegacyDocPreview(fileUrl);
        return;
    }

    modalBody.innerHTML = renderUnsupportedLessonFilePreview(fileUrl, extension);
}

async function renderLessonResourcePreview(resourceUrl) {
    const modalBody = document.getElementById('lessonContentBody');
    if (!modalBody) return;

    const resourceInfo = getLessonResourceInfo(resourceUrl);
    if (!resourceInfo.url) {
        modalBody.innerHTML = `
            <div class="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                The saved lesson link is invalid or unavailable.
            </div>
        `;
        return;
    }

    if (resourceInfo.type === 'youtube' || resourceInfo.type === 'vimeo') {
        modalBody.innerHTML = `
            <div class="space-y-4">
                <div class="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
                    <iframe
                        src="${escapeHtml(resourceInfo.embedUrl)}"
                        title="${escapeHtml(resourceInfo.displayName || 'Lesson video')}"
                        class="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen
                        referrerpolicy="strict-origin-when-cross-origin"></iframe>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                    <p class="font-semibold text-slate-900">${escapeHtml(resourceInfo.label)}</p>
                    <p class="mt-1 break-all">${escapeHtml(resourceInfo.displayName || resourceInfo.url)}</p>
                    <p class="mt-2 text-xs text-slate-500">If the provider blocks embedded playback, use the button below to open the original video.</p>
                </div>
            </div>
        `;
        return;
    }

    if (resourceInfo.type === 'direct-video') {
        modalBody.innerHTML = `
            <div class="space-y-4">
                <div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
                    <video class="h-auto w-full" controls playsinline preload="metadata">
                        <source src="${escapeHtml(resourceInfo.url)}">
                        Your browser does not support inline video playback.
                    </video>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                    <p class="font-semibold text-slate-900">${escapeHtml(resourceInfo.displayName || 'Linked video lesson')}</p>
                    <p class="mt-1 text-xs text-slate-500">Use the button below if you want to open the video in a separate tab.</p>
                </div>
            </div>
        `;
        return;
    }

    modalBody.innerHTML = `
        <div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 shadow-sm">
            <div class="flex items-start gap-4">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                    <i class="fas fa-link text-lg"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-900">${escapeHtml(resourceInfo.label)}</p>
                    <p class="mt-1 break-all text-sm text-slate-700">${escapeHtml(resourceInfo.displayName || resourceInfo.url)}</p>
                    <p class="mt-2 text-xs text-slate-500">This learning material is hosted externally. Open the link below to continue reading or watching it.</p>
                </div>
            </div>
        </div>
    `;
}

function showPageAlert(message, tone = 'error') {
    const alertEl = document.getElementById('trainingPageAlert');
    if (!alertEl) {
        return;
    }

    const variants = {
        error: 'border-red-200 bg-red-50 text-red-700',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-700',
        info: 'border-blue-200 bg-blue-50 text-blue-700'
    };

    alertEl.className = `mb-6 rounded-xl border px-4 py-3 text-sm ${variants[tone] || variants.error}`;
    alertEl.textContent = message;
    alertEl.classList.remove('hidden');
}

function clearPageAlert() {
    const alertEl = document.getElementById('trainingPageAlert');
    if (!alertEl) {
        return;
    }

    alertEl.textContent = '';
    alertEl.classList.add('hidden');
}

function redirectToLogin(clearStoredSession = true) {
    if (clearStoredSession) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.clear();
    }

    window.location.href = LOGIN_URL;
}

function handleAuthError(error, fallbackMessage = 'Your session expired. Please log in again.') {
    const status = error?.response?.status;
    if (status !== 401 && status !== 403) {
        return false;
    }

    const message = error?.response?.data?.message || fallbackMessage;
    showPageAlert(message, 'warning');

    if (authRedirectInProgress) {
        return true;
    }

    authRedirectInProgress = true;

    const completeRedirect = () => redirectToLogin(true);
    if (typeof swal === 'function') {
        swal({
            title: 'Session expired',
            text: message,
            type: 'warning'
        }, completeRedirect);
    } else {
        window.alert(message);
        completeRedirect();
    }

    return true;
}

document.addEventListener('DOMContentLoaded', function() {
    const user = getStoredUser();
    if (!user || user.role !== 'trainee' || !user.trainee_id) {
        redirectToLogin(true);
        return;
    }

    document.getElementById('traineeName').textContent = user.username || user.full_name || 'Trainee';

    // Sidebar Logic (Tailwind)
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

    function toggleSidebar() {
        const isClosed = sidebar.classList.contains('-translate-x-full');
        if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
            setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10);
        } else {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
        }
    }

    if (sidebarCollapse) sidebarCollapse.addEventListener('click', toggleSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);
    
    // User Dropdown Logic
    const userMenuBtn = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }

    lessonItemsModal = new SimpleModal(document.getElementById('lessonItemsModal'));
    lessonContentModal = new SimpleModal(document.getElementById('lessonContentModal'));
    quizModal = new SimpleModal(document.getElementById('quizModal'));
    quizResultModal = new SimpleModal(document.getElementById('quizResultModal'));

    loadTrainingData();

    document.getElementById('submitQuizBtn').addEventListener('click', submitQuiz);
    document.getElementById('submitTaskSheetBtn').addEventListener('click', submitTaskSheet);
    document.getElementById('unsubmitTaskSheetBtn').addEventListener('click', unsubmitTaskSheet);
    document.getElementById('answerQuizNowBtn').addEventListener('click', () => {
        const lessonId = document.getElementById('answerQuizNowBtn').dataset.lessonId;
        if (!lessonId) return;
        lessonContentModal.hide();
        startQuiz(lessonId);
    });
    document.getElementById('lessonContentModal').addEventListener('hidden.bs.modal', resetLessonContentPresentation);
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await logoutWithConfirmation();
    });
});

async function logoutWithConfirmation() {
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
            redirectToLogin(true);
        }
    });
}

async function loadTrainingData(options = {}) {
    const { forceFresh = false, suppressAlerts = false } = options;

    try {
        if (!suppressAlerts) {
            clearPageAlert();
        }

        const params = new URLSearchParams({ action: 'get-lessons' });
        const requestConfig = forceFresh
            ? getRequestConfig({
                headers: {
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache',
                    Expires: '0'
                }
            })
            : getRequestConfig();

        if (forceFresh) {
            params.set('_ts', Date.now().toString());
        }

        const response = await axios.get(
            `${API_BASE_URL}/role/trainee/training.php?${params.toString()}`,
            requestConfig
        );
        if (response.data.success) {
            trainingModulesState = Array.isArray(response.data.data) ? response.data.data : [];
            renderModules(trainingModulesState);
            return trainingModulesState;
        } else {
            trainingModulesState = [];
            if (!suppressAlerts) {
                showPageAlert(response.data.message, 'warning');
            }
            document.getElementById('accordionCore').innerHTML = `<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">${response.data.message}</div>`;
        }
    } catch (error) {
        if (handleAuthError(error)) {
            return [];
        }
        console.error('Error loading training data:', error);
        trainingModulesState = [];
        if (!suppressAlerts) {
            showPageAlert('Failed to load training modules.', 'error');
        }
        document.getElementById('accordionCore').innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">Failed to load training modules.</div>`;
    }

    return trainingModulesState;
}

function renderModules(modules) {
    const coreContainer = document.getElementById('accordionCore');
    const commonContainer = document.getElementById('accordionCommon');
    const basicContainer = document.getElementById('accordionBasic');

    coreContainer.innerHTML = '';
    commonContainer.innerHTML = '';
    basicContainer.innerHTML = '';

    if (modules.length === 0) {
        coreContainer.innerHTML = '<div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative">No training modules are available at this time.</div>';
        return;
    }

    modules.forEach(module => {
        let lessonsHtml = '';
        if (module.lessons && module.lessons.length > 0) {
            module.lessons.forEach(lesson => {
                const quizButtonHtml = buildQuizActionButton(lesson);

                lessonsHtml += `
                    <div class="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div class="flex items-center">
                            <i class="fas fa-book-reader mr-3 text-blue-500"></i>
                            <span class="text-gray-700 font-medium">${lesson.lesson_title}</span>
                        </div>
                        <div class="flex items-center gap-2 w-96">
                            <button class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition flex-1" onclick="viewLessonItems(${lesson.lesson_id}, '${encodeInlineValue(lesson.lesson_title)}')">
                                <i class="fas fa-folder-open mr-1"></i> View Materials
                            </button>
                            <div class="flex-1">
                                ${quizButtonHtml}
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            lessonsHtml = '<div class="p-4 text-gray-500 text-sm italic">No learning outcomes in this module yet.</div>';
        }

        const moduleHtml = `
            <details class="group mb-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <summary class="flex items-center justify-between w-full p-4 text-left cursor-pointer list-none bg-white hover:bg-gray-50 transition-colors focus:outline-none">
                    <span class="font-bold text-gray-800">${module.module_title}</span>
                    <i class="fas fa-chevron-down text-gray-400 transition-transform group-open:rotate-180"></i>
                </summary>
                <div class="border-t border-gray-100 bg-white">
                    ${lessonsHtml}
                </div>
            </details>
        `;

        if (module.competency_type === 'core') coreContainer.innerHTML += moduleHtml;
        else if (module.competency_type === 'common') commonContainer.innerHTML += moduleHtml;
        else if (module.competency_type === 'basic') basicContainer.innerHTML += moduleHtml;
    });
}

window.viewLessonItems = async function(lessonId, encodedLessonTitle) {
    const lessonTitle = decodeInlineValue(encodedLessonTitle);
    document.getElementById('lessonItemsTitle').textContent = lessonTitle;
    const contentsList = document.getElementById('lessonItemsContentsList');
    const taskSheetsList = document.getElementById('lessonItemsTaskSheetsList');
    
    contentsList.innerHTML = '<div class="text-center py-4"><div class="animate-spin inline-block w-4 h-4 border-2 border-blue-500 rounded-full border-t-transparent"></div> Loading...</div>';
    taskSheetsList.innerHTML = '<div class="text-center py-4"><div class="animate-spin inline-block w-4 h-4 border-2 border-blue-500 rounded-full border-t-transparent"></div> Loading...</div>';

    lessonItemsModal.show();

    try {
        let lesson = findLessonById(lessonId);
        if (!lesson) {
            await loadTrainingData({ forceFresh: true, suppressAlerts: true });
            lesson = findLessonById(lessonId);
        }

        if (lesson) {
            renderLessonItems(lesson);
        } else {
            contentsList.innerHTML = '<div class="bg-yellow-100 text-yellow-700 p-3 rounded">Lesson not found.</div>';
            taskSheetsList.innerHTML = '';
        }
    } catch (error) {
        if (handleAuthError(error)) {
            return;
        }
        console.error('Error loading lesson items:', error);
        contentsList.innerHTML = '<div class="bg-red-100 text-red-700 p-3 rounded">Error loading materials.</div>';
        taskSheetsList.innerHTML = '';
    }
}

function renderLessonItems(lesson) {
    const contentsList = document.getElementById('lessonItemsContentsList');
    const taskSheetsList = document.getElementById('lessonItemsTaskSheetsList');
    const quizState = resolveQuizState(lesson);
    const lessonResourceInfo = getLessonResourceInfo(lesson.lesson_resource_url);

    // Render Information Sheets
    contentsList.innerHTML = '';
    if (lesson.lesson_file_path) {
        const uploadedFileName = getLessonFileName(lesson.lesson_file_path);
        contentsList.innerHTML += `
            <button class="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors flex items-center gap-3" onclick="viewLessonFile(${lesson.lesson_id}, '${encodeInlineValue(uploadedFileName)}', '${encodeInlineValue(lesson.lesson_file_path)}', '${quizState}')">
                <i class="fas fa-file-lines text-blue-500"></i>
                <span class="text-gray-700">${escapeHtml(uploadedFileName)}</span>
                <span class="ml-auto inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Uploaded File</span>
            </button>
        `;
    }

    if (lessonResourceInfo.url) {
        const resourceIcon = lessonResourceInfo.label === 'Video Lesson' ? 'fa-circle-play text-emerald-500' : 'fa-link text-emerald-500';
        const resourceBadge = lessonResourceInfo.label === 'Video Lesson' ? 'Video Link' : 'External Link';
        contentsList.innerHTML += `
            <button class="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-emerald-50 transition-colors flex items-center gap-3" onclick="viewLessonResourceLink(${lesson.lesson_id}, '${encodeInlineValue(lessonResourceInfo.displayName || lessonResourceInfo.url)}', '${encodeInlineValue(lessonResourceInfo.url)}', '${quizState}')">
                <i class="fas ${resourceIcon}"></i>
                <span class="text-gray-700">${escapeHtml(lessonResourceInfo.displayName || lessonResourceInfo.url)}</span>
                <span class="ml-auto inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">${escapeHtml(resourceBadge)}</span>
            </button>
        `;
    }

    if (lesson.lesson_contents && lesson.lesson_contents.length > 0) {
        lesson.lesson_contents.forEach(item => {
            contentsList.innerHTML += `
                <button class="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center" onclick="viewContent('content', ${item.content_id}, '${encodeInlineValue(item.title)}')">
                    <i class="fas fa-file-alt mr-3 text-blue-500"></i> <span class="text-gray-700">${item.title}</span>
                </button>
            `;
        });
    } else if (!lesson.lesson_file_path && !lessonResourceInfo.url) {
        contentsList.innerHTML = '<div class="text-gray-500 text-sm p-3 italic">No learning materials available.</div>';
    }

    // Render Task Sheets
    taskSheetsList.innerHTML = '';
    if (lesson.task_sheets && lesson.task_sheets.length > 0) {
        lesson.task_sheets.forEach(item => {
            const isSubmitted = item.is_submitted ? true : false;
            const statusBadge = isSubmitted ? '<span class="ml-auto inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Submitted</span>' : '';
            taskSheetsList.innerHTML += `
                <button class="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center" onclick="viewContent('task', ${item.task_sheet_id}, '${encodeInlineValue(item.title)}', ${lesson.lesson_id}, ${isSubmitted})">
                    <i class="fas fa-tasks mr-3 ${isSubmitted ? 'text-green-500' : 'text-blue-500'}"></i> <span class="text-gray-700">${item.title}</span> ${statusBadge}
                </button>
            `;
        });
    } else {
        taskSheetsList.innerHTML = '<div class="text-gray-500 text-sm p-3 italic">No task sheets available.</div>';
    }

}

window.viewContent = async function(type, id, encodedTitle, lessonId = null, isSubmitted = false) {
    const modalTitle = document.getElementById('lessonContentTitle');
    const modalBody = document.getElementById('lessonContentBody');
    const modalFooter = document.getElementById('lessonContentFooter');
    const title = decodeInlineValue(encodedTitle);
    
    modalTitle.textContent = title;
    modalBody.innerHTML = '<div class="text-center p-10"><div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>';
    modalBody.scrollTop = 0;
    resetLessonContentPresentation();
    
    lessonItemsModal.hide();
    lessonContentModal.show();

    try {
        const action = type === 'content' ? 'get-lesson-content' : 'get-task-sheet';
        const response = await axios.get(
            `${API_BASE_URL}/role/trainee/training.php?action=${action}&id=${id}`,
            getRequestConfig()
        );
        
        if (response.data.success) {
            const allowTaskCheckboxes = type === 'task' && !isSubmitted;
            modalBody.innerHTML = wrapLessonPreviewContent(
                sanitizeLessonMaterialContent(response.data.data.content, { allowTaskCheckboxes })
            );
            enhanceLessonPreviewLayout(modalBody);
            
            if (type === 'task') {
                modalFooter.style.display = 'flex';
                const submitBtn = document.getElementById('submitTaskSheetBtn');
                const unsubmitBtn = document.getElementById('unsubmitTaskSheetBtn');
                
                submitBtn.dataset.lessonId = lessonId;
                submitBtn.dataset.taskSheetId = id;
                unsubmitBtn.dataset.lessonId = lessonId;
                unsubmitBtn.dataset.taskSheetId = id;

                if (isSubmitted) {
                    submitBtn.style.display = 'none';
                    submitBtn.classList.add('hidden');
                    unsubmitBtn.style.display = 'inline-flex';
                    unsubmitBtn.classList.remove('hidden');
                } else {
                    submitBtn.style.display = 'inline-flex';
                    submitBtn.classList.remove('hidden');
                    unsubmitBtn.style.display = 'none';
                    unsubmitBtn.classList.add('hidden');
                }
            }
        } else {
            modalBody.innerHTML = `<div class="bg-yellow-100 text-yellow-700 p-4 rounded">${response.data.message}</div>`;
        }
    } catch (error) {
        if (handleAuthError(error)) {
            lessonContentModal.hide();
            return;
        }
        console.error('Error loading content:', error);
        modalBody.innerHTML = '<div class="bg-red-100 text-red-700 p-4 rounded">Failed to load content.</div>';
    }
    
    // Handle back button behavior
    lessonContentModal.element.addEventListener('hidden.bs.modal', function () {
        // When content modal closes, re-open items modal if it wasn't closed explicitly
        // This is a bit tricky with Bootstrap modals. 
        // Better to just let user reopen items from main list.
    }, { once: true });
}

window.viewLessonFile = async function(lessonId, encodedTitle, encodedFilePath, quizState = 'none') {
    const modalTitle = document.getElementById('lessonContentTitle');
    const modalBody = document.getElementById('lessonContentBody');
    const modalFooter = document.getElementById('lessonContentFooter');
    const openLessonFileBtn = document.getElementById('openLessonFileBtn');
    const title = decodeInlineValue(encodedTitle);
    const filePath = decodeInlineValue(encodedFilePath);
    const fileUrl = getLessonFileUrl(filePath);

    modalTitle.textContent = title;
    modalBody.innerHTML = '<div class="text-center p-10"><div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>';
    modalBody.scrollTop = 0;
    resetLessonContentPresentation();

    if (openLessonFileBtn) {
        openLessonFileBtn.href = fileUrl;
        openLessonFileBtn.textContent = 'Open File';
        openLessonFileBtn.classList.remove('hidden');
    }

    modalFooter.style.display = 'flex';
    lessonItemsModal.hide();
    lessonContentModal.show();

    try {
        await renderLessonFilePreview(filePath);
        setupLessonFileReadingGate(lessonId, quizState);
    } catch (error) {
        console.error('Error loading lesson file preview:', error);
        modalBody.innerHTML = `
            <div class="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                Failed to load the uploaded material preview. You can still use <strong>Open File</strong> below to view the original document.
            </div>
        `;
    }
}

window.viewLessonResourceLink = async function(lessonId, encodedTitle, encodedResourceUrl, quizState = 'none') {
    const modalTitle = document.getElementById('lessonContentTitle');
    const modalBody = document.getElementById('lessonContentBody');
    const modalFooter = document.getElementById('lessonContentFooter');
    const openLessonFileBtn = document.getElementById('openLessonFileBtn');
    const title = decodeInlineValue(encodedTitle);
    const resourceUrl = decodeInlineValue(encodedResourceUrl);
    const resourceInfo = getLessonResourceInfo(resourceUrl);

    modalTitle.textContent = title;
    modalBody.innerHTML = '<div class="text-center p-10"><div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>';
    modalBody.scrollTop = 0;
    resetLessonContentPresentation();

    if (openLessonFileBtn && resourceInfo.url) {
        openLessonFileBtn.href = resourceInfo.url;
        openLessonFileBtn.textContent = resourceInfo.openLabel;
        openLessonFileBtn.classList.remove('hidden');
    }

    modalFooter.style.display = 'flex';
    lessonItemsModal.hide();
    lessonContentModal.show();

    try {
        await renderLessonResourcePreview(resourceUrl);
        setupLessonFileReadingGate(lessonId, quizState);
    } catch (error) {
        console.error('Error loading lesson resource preview:', error);
        const fallbackAction = resourceInfo.openLabel || 'Open Link';
        modalBody.innerHTML = `
            <div class="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                Failed to load the lesson link preview. You can still use <strong>${escapeHtml(fallbackAction)}</strong> below to view the original resource.
            </div>
        `;
    }
}

window.startQuiz = async function(lessonId) {
    const container = document.getElementById('quizQuestionsContainer');
    const quizTitle = document.getElementById('quizTitle');
    const quizAttemptMeta = document.getElementById('quizAttemptMeta');
    container.innerHTML = '<div class="text-center p-10"><div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>';
    quizTitle.textContent = 'Quiz';
    if (quizAttemptMeta) {
        quizAttemptMeta.textContent = '';
        quizAttemptMeta.classList.add('hidden');
    }
    
    // Store lessonId for submission
    document.getElementById('quizForm').dataset.lessonId = lessonId;
    
    quizModal.show();

    try {
        const response = await axios.get(
            `${API_BASE_URL}/role/trainee/training.php?action=get-quiz&lesson_id=${lessonId}`,
            getRequestConfig()
        );
        
        if (response.data.success) {
            const quizPayload = response.data.data || {};
            const questions = Array.isArray(quizPayload.questions) ? quizPayload.questions : [];
            const quizStatus = quizPayload.quiz_status || {};
            const attemptsUsed = Number(quizStatus.attempts_used || 0);
            const attemptsLeft = Number(quizStatus.attempts_left || 0);
            const maxAttempts = Number(quizStatus.max_attempts || 0);
            const bestScore = quizStatus.best_score;
            const totalQuestions = Number(quizStatus.total_questions || questions.length || 0);

            if (maxAttempts > 0) {
                quizTitle.textContent = `Quiz - Attempt ${Math.min(attemptsUsed + 1, maxAttempts)} of ${maxAttempts}`;
            }

            if (quizAttemptMeta) {
                const metaParts = [];
                if (bestScore !== null && bestScore !== undefined) {
                    metaParts.push(`Best score: ${formatQuizScoreValue(bestScore)} / ${totalQuestions || 'N/A'}`);
                }
                if (maxAttempts > 0) {
                    metaParts.push(`Attempts used: ${attemptsUsed} of ${maxAttempts}`);
                }
                if (attemptsUsed > 0) {
                    metaParts.push(formatRetryLabel(attemptsLeft));
                }

                if (metaParts.length > 0) {
                    quizAttemptMeta.textContent = metaParts.join(' | ');
                    quizAttemptMeta.classList.remove('hidden');
                }
            }

            container.innerHTML = '';
            
            if (questions.length === 0) {
                container.innerHTML = '<div class="bg-blue-100 text-blue-700 p-4 rounded">No questions found for this quiz.</div>';
                return;
            }

            questions.forEach((q, index) => {
                let optionsHtml = '';
                q.options.forEach(opt => {
                    optionsHtml += `
                        <div class="flex items-center mb-2">
                            <input class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500" type="radio" name="q_${q.question_id}" id="opt_${opt.option_id}" value="${opt.option_id}">
                            <label class="ml-2 text-sm font-medium text-gray-900" for="opt_${opt.option_id}">${opt.option_text}</label>
                        </div>
                    `;
                });

                container.innerHTML += `
                    <div class="mb-4">
                        <h6 class="font-bold text-gray-800 mb-2">${index + 1}. ${q.question_text}</h6>
                        <div class="ml-4">${optionsHtml}</div>
                    </div>
                `;
            });
        } else {
            container.innerHTML = `<div class="bg-yellow-100 text-yellow-700 p-4 rounded">${response.data.message}</div>`;
        }
    } catch (error) {
        if (handleAuthError(error)) {
            quizModal.hide();
            return;
        }
        console.error('Error loading quiz:', error);
        container.innerHTML = '<div class="bg-red-100 text-red-700 p-4 rounded">Failed to load quiz.</div>';
    }
}

function submitQuiz() {
    const lessonId = document.getElementById('quizForm').dataset.lessonId;
    const container = document.getElementById('quizQuestionsContainer');
    
    // Collect answers
    const answers = {};
    const questions = container.querySelectorAll('input[type="radio"]:checked');
    
    questions.forEach(input => {
        const questionId = input.name.replace('q_', '');
        answers[questionId] = input.value;
    });

    // If no answers, ask for confirmation
    if (Object.keys(answers).length === 0) {
        swal({
            title: 'No answers selected',
            text: "You haven't answered any questions. Are you sure you want to submit?",
            type: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, submit'
        }, function(willSubmit) {
            if (willSubmit) {
                performQuizSubmission(lessonId, answers);
            }
        });
    } else {
        performQuizSubmission(lessonId, answers);
    }
}

async function performQuizSubmission(lessonId, answers) {
    const btn = document.getElementById('submitQuizBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white rounded-full border-t-transparent mr-2"></span> Submitting...';

    try {
        const response = await axios.post(
            `${API_BASE_URL}/role/trainee/training.php?action=submit-quiz`,
            {
                lesson_id: lessonId,
                answers: answers
            },
            getRequestConfig()
        );

        if (response.data.success) {
            quizModal.hide();
            
            // Show result modal
            const result = response.data.data;
            const numericLessonId = Number(lessonId);
            if (patchLessonQuizState(numericLessonId, result)) {
                renderModules(trainingModulesState);
            }

            document.getElementById('quizResultScore').textContent = `${formatQuizScoreValue(result.score)} / ${result.total_questions}`;
            
            const percentageEl = document.getElementById('quizResultPercentage');
            const attemptNoteEl = document.getElementById('quizResultAttemptNote');
            percentageEl.textContent = `${result.percentage}%`;
            
            if (result.percentage >= 80) {
                percentageEl.className = 'text-xl text-green-600 font-bold';
                percentageEl.innerHTML += ' <br><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Passed</span>';
            } else {
                percentageEl.className = 'text-xl text-red-600 font-bold';
                percentageEl.innerHTML += ' <br><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Failed</span>';
            }

            if (attemptNoteEl) {
                if (result.is_perfect) {
                    attemptNoteEl.textContent = 'Perfect score reached. This quiz is now complete.';
                } else if (Number(result.attempts_left) > 0) {
                    attemptNoteEl.textContent = `Best score so far: ${formatQuizScoreValue(result.best_score)} / ${result.total_questions}. You still have ${formatRetryLabel(result.attempts_left)}.`;
                } else {
                    attemptNoteEl.textContent = `Best score recorded: ${formatQuizScoreValue(result.best_score)} / ${result.total_questions}. You already used all ${result.max_attempts} attempts.`;
                }
            }
            
            quizResultModal.show();
            
            // Refresh the main list with a fresh request to confirm server-side quiz state.
            loadTrainingData({ forceFresh: true, suppressAlerts: true });
        } else {
            swal('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        if (handleAuthError(error)) {
            return;
        }
        console.error('Error submitting quiz:', error);
        swal('Error', 'Failed to submit quiz.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Quiz';
    }
}

async function submitTaskSheet() {
    const btn = document.getElementById('submitTaskSheetBtn');
    const lessonId = btn.dataset.lessonId;
    const taskSheetId = btn.dataset.taskSheetId;

    // Capture the state of the task sheet
    const contentContainer = document.getElementById('lessonContentBody');
    
    // Sync checkbox state to attribute for serialization
    contentContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb.checked) {
            cb.setAttribute('checked', 'checked');
        } else {
            cb.removeAttribute('checked');
        }
    });

    // Sync text input state
    contentContainer.querySelectorAll('input[type="text"], textarea').forEach(input => {
        input.setAttribute('value', input.value);
        if (input.tagName === 'TEXTAREA') {
            input.innerHTML = input.value;
        }
    });

    const content = contentContainer.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white rounded-full border-t-transparent mr-2"></span> Submitting...';

    try {
        const response = await axios.post(
            `${API_BASE_URL}/role/trainee/training.php?action=submit-task-sheet`,
            {
                lesson_id: lessonId,
                task_sheet_id: taskSheetId,
                submitted_content: content
            },
            getRequestConfig()
        );

        if (response.data.success) {
            swal('Success', 'Task sheet submitted successfully!', 'success');
            lessonContentModal.hide();
            loadTrainingData();
        } else {
            swal('Error', 'Error: ' + response.data.message, 'error');
        }
    } catch (error) {
        if (handleAuthError(error)) {
            return;
        }
        console.error('Error submitting task sheet:', error);
        swal('Error', 'Failed to submit task sheet.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Task Sheet';
    }
}

function unsubmitTaskSheet() {
    const btn = document.getElementById('unsubmitTaskSheetBtn');
    const lessonId = btn.dataset.lessonId;
    const taskSheetId = btn.dataset.taskSheetId;

    swal({
        title: 'Unsubmit Task Sheet?',
        text: "Your previous submission will be removed.",
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, unsubmit'
    }, function(willDelete) {
        if (!willDelete) {
            console.log('Unsubmit cancelled');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white rounded-full border-t-transparent mr-2"></span> Unsubmitting...';

        try {
            const payload = {
                lesson_id: parseInt(lessonId),
                task_sheet_id: parseInt(taskSheetId)
            };

            axios.post(
                `${API_BASE_URL}/role/trainee/training.php?action=unsubmit-task-sheet`,
                payload,
                getRequestConfig()
            )
                .then(response => {
                    if (response.data.success) {
                        swal('Success', 'Task sheet unsubmitted successfully.', 'success');
                        lessonContentModal.hide();
                        loadTrainingData();
                    } else {
                        swal('Error', 'Error: ' + response.data.message, 'error');
                    }
                })
                .catch(error => {
                    if (handleAuthError(error)) {
                        return;
                    }
                    console.error('Error unsubmitting:', error.response?.data || error.message);
                    swal('Error', 'Failed to unsubmit: ' + (error.response?.data?.message || error.message), 'error');
                })
                .finally(() => {
                    btn.disabled = false;
                    btn.textContent = 'Unsubmit';
                });
        } catch (error) {
            console.error('Error in unsubmit:', error);
            swal('Error', 'An error occurred: ' + error.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Unsubmit';
        }
    });
}
