document.addEventListener('DOMContentLoaded', () => {
    const qualificationsList = document.getElementById('qualificationsList');
    const batchesList = document.getElementById('batchesList');
    // IMPORTANT: Adjust this base URL to match your backend API's location.
    const apiBaseUrl = 'api';

    // Check for application submission status
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'submitted') {
        // Ensure bootstrap is loaded before trying to use it
        if (typeof bootstrap !== 'undefined') {
            showSubmissionSuccessModal();
            // Clean up the URL to prevent the modal from showing on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            console.warn('Bootstrap not found, cannot display submission modal.');
        }
    }

    const fetchQualifications = async () => {
        try {
            // This endpoint should return a JSON array of active qualifications.
            // Example: GET /Hohoo-ville/api/qualifications.php?action=getActive
            const response = await axios.get(`${apiBaseUrl}/qualifications.php?action=getActive`);
            qualificationsList.innerHTML = ''; // Clear spinner

            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                response.data.forEach(q => {
                    const card = document.createElement('div');
                    card.className = 'card shadow-sm mb-3 border-0';
                    card.innerHTML = `
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">
                                <div class="d-flex align-items-start text-break flex-grow-1">
                                    <i class="fas fa-certificate text-primary me-3 fa-lg mt-1"></i>
                                    <div>
                                        <h6 class="fw-bold mb-1">${q.qualification_name}</h6>
                                        <small class="text-muted">${q.duration ? q.duration + ' hours' : 'Duration not specified'}</small>
                                    </div>
                                </div>
                                <span class="badge bg-primary rounded-pill text-nowrap">Available</span>
                            </div>
                        </div>
                    `;
                    qualificationsList.appendChild(card);
                });
            } else {
                qualificationsList.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>No qualifications currently available. Please check back later.</div>';
            }
        } catch (error) {
            console.error('Error fetching qualifications:', error);
            qualificationsList.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle me-2"></i>Could not load qualifications at this time.</div>';
        }
    };

    const fetchOpenBatches = async () => {
        try {
            // This endpoint should return a JSON array of open/ongoing batches.
            // Example: GET /Hohoo-ville/api/batches.php?action=getOpen
            const response = await axios.get(`${apiBaseUrl}/batches.php?action=getOpen`);
            batchesList.innerHTML = ''; // Clear spinner

            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                response.data.forEach(batch => {
                    const statusColor = batch.status === 'open' ? 'success' : batch.status === 'closed' ? 'danger' : 'warning';
                    const card = document.createElement('div');
                    card.className = 'card shadow-sm mb-3 border-0';
                    card.innerHTML = `
                        <div class="card-body">
                            <h5 class="card-title fw-bold mb-2">
                                <i class="fas fa-graduation-cap me-2 text-primary"></i>${batch.batch_name}
                            </h5>
                            <hr class="my-2">
                            <p class="card-text mb-2">
                                <small class="text-muted"><strong>Course:</strong> ${batch.qualification_name}</small>
                            </p>
                            <p class="card-text mb-2">
                                <small class="text-muted"><i class="fas fa-clock me-2"></i><strong>Schedule:</strong> ${batch.schedule ? batch.schedule : 'To be announced'}</small>
                            </p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span><strong>Status:</strong></span>
                                <span class="badge bg-${statusColor} rounded-pill">${batch.status.toUpperCase()}</span>
                            </div>
                        </div>
                    `;
                    batchesList.appendChild(card);
                });
            } else {
                batchesList.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>No open batches right now. Please check back soon for the next schedule!</div>';
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            batchesList.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle me-2"></i>Could not load batch information at this time.</div>';
        }
    };
    /**
     * Back to top button functionality
     */
    const backToTopButton = document.querySelector('.back-to-top');
    if (backToTopButton) {
        const toggleBackToTop = () => {
            if (window.scrollY > 100) {
                backToTopButton.classList.add('active');
            } else {
                backToTopButton.classList.remove('active');
            }
        };
        window.addEventListener('scroll', toggleBackToTop);
    }

    /**
     * Featured Courses Modal functionality
     */
    const courseModal = document.getElementById('courseModal');
    if (courseModal) {
        courseModal.addEventListener('show.bs.modal', function (event) {
            // Card that triggered the modal
            const card = event.relatedTarget;

            // Extract info from data-* attributes
            const title = card.getAttribute('data-course-title');
            const description = card.getAttribute('data-course-description');
            const galleryImages = JSON.parse(card.getAttribute('data-course-gallery') || '[]');

            // Update the modal's content
            const modalTitle = courseModal.querySelector('#courseModalLabel');
            const modalDescription = courseModal.querySelector('#courseModalDescription');
            const modalGallery = courseModal.querySelector('#courseModalGallery');

            modalTitle.textContent = title;
            modalDescription.textContent = description;

            // Clear previous gallery images and populate
            modalGallery.innerHTML = '';
            if (galleryImages && galleryImages.length > 0) {
                galleryImages.forEach(imgUrl => {
                    const col = document.createElement('div');
                    col.className = 'col-6 col-md-4';
                    col.innerHTML = `<a href="${imgUrl}" target="_blank" title="View full image"><img src="${imgUrl}" class="img-fluid rounded shadow-sm" style="width: 100%; height: 200px; object-fit: cover;" alt="${title} gallery image"></a>`;
                    modalGallery.appendChild(col);
                });
            } else {
                modalGallery.innerHTML = '<p class="text-muted">No gallery images available for this course.</p>';
            }
        });
    }

    fetchQualifications();
    fetchOpenBatches();
});

function showSubmissionSuccessModal() {
    // Create modal HTML dynamically
    const modalHtml = `
    <div class="modal fade" id="submissionSuccessModal" tabindex="-1" aria-labelledby="submissionSuccessModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow-lg">
          <div class="modal-header bg-success text-white border-0">
            <h5 class="modal-title" id="submissionSuccessModalLabel"><i class="fas fa-check-circle me-2"></i> Application Submitted!</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center py-4">
            <p class="lead">Thank you for your application!</p>
            <p>Your submission has been received. Please wait for an email or text message from the registrar regarding the status of your application and the next steps.</p>
          </div>
          <div class="modal-footer border-0">
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Got it!</button>
          </div>
        </div>
      </div>
    </div>
    `;

    // Add modal to body and show it
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const successModalEl = document.getElementById('submissionSuccessModal');
    const successModal = new bootstrap.Modal(successModalEl);
    successModal.show();

    // Clean up modal from DOM after it's hidden to keep the DOM clean
    successModalEl.addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
}