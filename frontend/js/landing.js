document.addEventListener('DOMContentLoaded', () => {
    const qualificationsList = document.getElementById('qualificationsList');
    const batchesList = document.getElementById('batchesList');
    // IMPORTANT: Adjust this base URL to match your backend API's location.
    const apiBaseUrl = 'api';

    const fetchQualifications = async () => {
        try {
            // This endpoint should return a JSON array of active qualifications.
            // Example: GET /Hohoo-ville/api/qualifications.php?action=getActive
            const response = await axios.get(`${apiBaseUrl}/qualifications.php?action=getActive`);
            qualificationsList.innerHTML = ''; // Clear spinner

            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                // We'll use a more modern card-based UI instead of a simple list.
                response.data.forEach(q => {
                    const card = document.createElement('div');
                    card.className = 'card shadow-sm mb-3';
                    card.innerHTML = `
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="d-flex align-items-center text-break">
                                    <i class="fas fa-award text-primary me-3 fa-lg"></i>
                                    <span class="fw-bold">${q.qualification_name}</span>
                                </div>
                                <span class="badge bg-secondary rounded-pill ms-3">${q.duration || 'N/A'}</span>
                            </div>
                        </div>
                    `;
                    qualificationsList.appendChild(card);
                });
            } else {
                qualificationsList.innerHTML = '<p class="text-muted">No qualifications currently available. Please check back later.</p>';
            }
        } catch (error) {
            console.error('Error fetching qualifications:', error);
            qualificationsList.innerHTML = '<p class="text-danger">Could not load qualifications at this time.</p>';
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
                    const card = document.createElement('div');
                    card.className = 'card batch-card mb-3';
                    card.innerHTML = `
                        <div class="card-body">
                            <h5 class="card-title">${batch.batch_name}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">${batch.qualification_name}</h6>
                            <p class="card-text mb-1"><i class="fas fa-calendar-day me-2"></i><strong>Schedule:</strong> ${batch.schedule || 'To be announced'}</p>
                            <p class="card-text"><i class="fas fa-info-circle me-2"></i><strong>Status:</strong> <span class="badge bg-success">${batch.status.toUpperCase()}</span></p>
                        </div>`;
                    batchesList.appendChild(card);
                });
            } else {
                batchesList.innerHTML = '<p class="text-muted">No open batches right now. Please check back soon for the next schedule!</p>';
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            batchesList.innerHTML = '<p class="text-danger">Could not load batch information at this time.</p>';
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
                    col.innerHTML = `<a href="${imgUrl}" target="_blank" title="View full image"><img src="${imgUrl}" class="img-fluid rounded shadow-sm" alt="${title} gallery image"></a>`;
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