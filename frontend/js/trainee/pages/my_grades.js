const API_BASE_URL = window.location.origin + '/Hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }
    document.getElementById('traineeName').textContent = user.username;

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

    const idToLoad = user.trainee_id || user.user_id;
    if (idToLoad) {
        loadGrades(idToLoad);
        setupCertificatesTab(idToLoad);
    } else {
        document.getElementById('core').innerHTML = '<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">User ID not found.</div>';
    }
});

// Load certificates for the Certificates tab
function setupCertificatesTab(traineeId) {
    const certTab = document.getElementById('certificates-tab');
    if (!certTab) return;
    certTab.addEventListener('click', function () {
        loadCertificates(traineeId);
    });
}

async function loadCertificates(traineeId) {
    const certContainer = document.getElementById('certificates');
    if (!certContainer) return;
    certContainer.innerHTML = '<div class="text-center py-10"><div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>';
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainee/certificates.php?trainee_id=${traineeId}`);
        if (response.data.success) {
            const certs = response.data.data;
            if (!certs.length) {
                certContainer.innerHTML = '<div class="bg-gray-50 border border-gray-200 text-gray-600 rounded-lg p-4 text-center my-3">No certificates issued yet.</div>';
                return;
            }
            let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
            certs.forEach(cert => {
                html += `
                <div class="h-full">
                    <div class="bg-white border border-green-200 shadow-sm rounded-lg h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200">
                        <div class="p-6 flex-grow">
                            <h6 class="font-bold text-blue-600 mb-3 text-lg">${cert.module_title}</h6>
                            <span class="inline-block px-2 py-1 text-xs font-semibold tracking-wide text-blue-800 bg-blue-100 rounded-full mb-2">${cert.competency_type || 'Core'}</span><br>
                            <span class="inline-block px-2 py-1 text-xs font-semibold tracking-wide text-green-800 bg-green-100 rounded-full mb-2">Issued: ${cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : 'N/A'}</span>
                            <div class="mt-3">
                                ${cert.certificate_file ? `<a href="/Hohoo-ville/uploads/certificates/${encodeURIComponent(cert.certificate_file)}" target="_blank" class="inline-flex items-center px-3 py-2 border border-blue-500 text-sm leading-4 font-medium rounded-md text-blue-500 bg-white hover:bg-blue-50 focus:outline-none transition"><i class="fas fa-download mr-2"></i>View Certificate</a>` : '<span class="text-gray-500 text-sm">Certificate file not found</span>'}
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            html += '</div>';
            certContainer.innerHTML = html;
        } else {
            certContainer.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">${response.data.message || 'Failed to load certificates.'}</div>`;
        }
    } catch (error) {
        certContainer.innerHTML = '<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">Failed to load certificates.</div>';
    }
}

async function loadGrades(traineeId) {
    try {
        // Use training endpoint to get granular lesson status (Quiz & Task Sheets)
        const response = await axios.get(`${API_BASE_URL}/role/trainee/training.php?action=get-lessons&trainee_id=${traineeId}`);
        
        if (response.data.success) {
            // Clear existing content in tabs
            ['core', 'common', 'basic'].forEach(type => {
                const container = document.getElementById(type);
                if (container) container.innerHTML = '';
            });

            response.data.data.forEach(module => {
                const type = (module.competency_type || 'core').toLowerCase();
                const container = document.getElementById(type);

                if (container) {
                    let lessonsHtml = '';
                    let moduleCompetent = true;
                    let hasLessons = false;

                    if (module.lessons && module.lessons.length > 0) {
                        hasLessons = true;
                        module.lessons.forEach(lesson => {
                        // Calculate progress based on Quiz and Task Sheet completion
                        let totalItems = 0;
                        let completedItems = 0;

                        // Check Quiz
                        let quizText = 'N/A';
                        if (lesson.has_quiz) {
                            totalItems++;
                            if (lesson.score !== null) {
                                completedItems++;
                                quizText = `Score: ${lesson.score}/${lesson.total_questions}`;
                            } else {
                                quizText = 'Pending';
                            }
                        }

                        // Check Task Sheet
                        let taskText = 'N/A';
                        if (lesson.task_sheets && lesson.task_sheets.length > 0) {
                            totalItems++;
                            if (lesson.task_sheet_status) {
                                completedItems++;
                                taskText = 'Submitted';
                            } else {
                                taskText = 'Pending';
                            }
                        }

                        // Calculate percentage
                        let progressVal = 0;
                        if (totalItems > 0) {
                            progressVal = (completedItems / totalItems) * 100;
                        } else {
                            progressVal = 0; // No requirements = Pending
                        }

                        const isCompetent = progressVal === 100 && totalItems > 0;
                        if (!isCompetent) moduleCompetent = false;
                        const badgeClass = isCompetent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
                        const remarks = isCompetent ? 'Competent' : 'In Progress';

                        lessonsHtml += `
                            <div class="p-4 border-b border-gray-100 last:border-0">
                                <div class="flex justify-between items-center mb-2">
                                    <h6 class="font-bold mb-0 text-blue-600">${lesson.lesson_title}</h6>
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}">${remarks}</span>
                                </div>
                                
                                <div class="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                                    <div class="flex items-center"><i class="fas fa-pen mr-2 text-gray-400"></i> Quiz: <span class="font-semibold ml-1 text-gray-700">${quizText}</span></div>
                                    <div class="flex items-center"><i class="fas fa-tasks mr-2 text-gray-400"></i> Task Sheet: <span class="font-semibold ml-1 text-gray-700">${taskText}</span></div>
                                </div>

                                <div class="flex items-center">
                                    <div class="flex-grow mr-4">
                                        <div class="w-full bg-gray-200 rounded-full h-2">
                                            <div class="${isCompetent ? 'bg-green-500' : 'bg-yellow-400'} h-2 rounded-full transition-all duration-500" 
                                                 style="width: ${progressVal}%"></div>
                                        </div>
                                    </div>
                                    <span class="font-bold text-sm text-gray-600">${Math.round(progressVal)}%</span>
                                </div>
                            </div>`;
                        });
                    } else {
                        lessonsHtml = '<div class="p-4 text-gray-500 text-sm italic">No learning outcomes available.</div>';
                        moduleCompetent = false;
                    }

                    const moduleBadge = (hasLessons && moduleCompetent) 
                        ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Competent</span>' 
                        : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In Progress</span>';

                    container.innerHTML += `
                        <details class="group mb-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <summary class="flex items-center justify-between w-full p-4 text-left cursor-pointer list-none bg-white hover:bg-gray-50 transition-colors focus:outline-none">
                                <div class="flex items-center gap-3">
                                    <i class="fas fa-folder-open text-blue-500 group-open:rotate-12 transition-transform"></i>
                                    <span class="font-bold text-gray-800">${module.module_title}</span>
                                </div>
                                <div class="flex items-center gap-3">
                                    ${moduleBadge}
                                    <i class="fas fa-chevron-down text-gray-400 transition-transform group-open:rotate-180"></i>
                                </div>
                            </summary>
                            <div class="border-t border-gray-100 bg-gray-50/50">
                                ${lessonsHtml}
                            </div>
                        </details>`;
                }
            });
            
            // Handle empty states for tabs
            ['core', 'common', 'basic'].forEach(type => {
                const container = document.getElementById(type);
                if (container && container.innerHTML === '') {
                    container.innerHTML = `<div class="bg-gray-50 border border-gray-200 text-gray-500 rounded-lg p-6 text-center my-4">No ${type} competencies found.</div>`;
                }
            });
        }
    } catch (error) {
        console.error('Error loading grades:', error);
        const coreContainer = document.getElementById('core');
        if (coreContainer) coreContainer.innerHTML = '<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">Failed to load progress data.</div>';
    }
}