/**
 * Profile Image Upload Utility
 * Shared utility for handling profile image uploads across all roles
 */

const PROFILE_IMAGE_UPLOAD_URL = '/Hohoo-ville/api/utils/upload_profile_image.php';
const PROFILE_IMAGES_URL = '/Hohoo-ville/uploads/profile_images/';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload profile image for a user
 * @param {File} file - The image file to upload
 * @param {string} role - The user role (admin, registrar, trainer, trainee)
 * @param {number} userId - The user ID
 * @param {number} identifier - Optional identifier (trainer_id for trainer, trainee_id for trainee)
 * @returns {Promise<Object>} Response with filename and url
 */
async function uploadProfileImage(file, role, userId, identifier = null) {
    if (!file) {
        throw new Error('No file selected');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds maximum limit (5MB)');
    }

    const formData = new FormData();
    formData.append('profile_image', file);
    formData.append('role', role);
    formData.append('user_id', userId);
    if (identifier) {
        formData.append('identifier', identifier);
    }

    try {
        const response = await axios.post(PROFILE_IMAGE_UPLOAD_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if (response.data.success) {
            return response.data;
        } else {
            throw new Error(response.data.message || 'Upload failed');
        }
    } catch (error) {
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    }
}

/**
 * Initialize profile image upload functionality
 * @param {string} inputId - ID of the file input element
 * @param {string} previewId - ID of the preview image element
 * @param {Function} onUploadSuccess - Callback function when upload succeeds
 */
function initProfileImageUpload(inputId, previewId, onUploadSuccess = null) {
    const fileInput = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    if (!fileInput) {
        console.error(`File input element with ID "${inputId}" not found`);
        return;
    }

    // Handle file selection
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show preview
        const reader = new FileReader();
        reader.onload = (event) => {
            if (preview) {
                preview.src = event.target.result;
            }
        };
        reader.readAsDataURL(file);
    });

    // Handle drag and drop
    if (preview) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            preview.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            preview.addEventListener(eventName, () => {
                preview.classList.add('border-blue-500', 'bg-blue-50');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            preview.addEventListener(eventName, () => {
                preview.classList.remove('border-blue-500', 'bg-blue-50');
            }, false);
        });

        preview.addEventListener('drop', async (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            }
        }, false);
    }
}

/**
 * Get profile image URL
 * @param {string} filename - The filename returned from upload
 * @returns {string} Full URL to the image
 */
function getProfileImageUrl(filename) {
    if (!filename) return null;
    return PROFILE_IMAGES_URL + encodeURIComponent(filename);
}

/**
 * Create profile image preview HTML
 * @param {string} imageUrl - URL of the image
 * @param {string} name - Name of the user for fallback
 * @returns {string} HTML for the image preview
 */
function createProfileImagePreview(imageUrl, name = 'User') {
    if (imageUrl) {
        return `<img src="${imageUrl}" alt="${name}" class="h-24 w-24 rounded-2xl object-cover ring-2 ring-blue-100" />`;
    }
    return `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff" alt="${name}" class="h-24 w-24 rounded-2xl object-cover ring-2 ring-blue-100" />`;
}
