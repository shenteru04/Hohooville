// API Configuration
const API_BASE_URL = 'http://localhost/hohoo-ville/api';

// Global variable to store batches for editing
let currentBatches = [];

// Axios Instance Configuration
let apiClient;

function initApiClient() {
    apiClient = axios.create({
        baseURL: API_BASE_URL,
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

function initializePage() {
    initApiClient();
    loadBatches();
    loadQualifications();
    
    const addBatchForm = document.getElementById('addBatchForm');
    if (addBatchForm) {
        addBatchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const batchId = this.dataset.id;
            if (batchId) {
                updateBatch(batchId);
            } else {
                addBatch();
            }
        });
    }

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetForm);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof axios === 'undefined') {
        // Dynamically load Axios if not present
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/axios/dist/axios.min.js';
        script.onload = initializePage;
        script.onerror = function() {
            alert('System Error: Could not load Axios library. Please check your internet connection.');
        };
        document.head.appendChild(script);
    } else {
        initializePage();
    }
});

async function loadBatches() {
    try {
        const response = await apiClient.get('/role/admin/batches.php?action=list');
        if (response.data.success) {
            renderBatchesTable(response.data.data);
        } else {
            alert('Error loading batches: ' + (response.data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

async function loadQualifications() {
    try {
        const response = await apiClient.get('/role/admin/manage_qualifications.php?action=list');
        if (response.data.success) {
            const qualificationSelect = document.getElementById('qualificationSelect');
            if (qualificationSelect) {
                qualificationSelect.innerHTML = '<option value="">Select Qualification</option>';
                // Only show active qualifications
                const activeQualifications = response.data.data.filter(q => q.status === 'active');
                activeQualifications.forEach(q => {
                    qualificationSelect.innerHTML += `<option value="${q.course_id}">${q.course_name}</option>`;
                });
            }
        } else {
            alert('Error loading qualifications: ' + (response.data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading qualifications:', error);
    }
}

function renderBatchesTable(data) {
    currentBatches = data; // Store data for edit functionality
    const tbody = document.getElementById('batchesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    data.forEach(batch => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${batch.batch_id}</td>
            <td>${batch.batch_name}</td>
            <td>${batch.course_name || 'N/A'}</td>
            <td>${batch.start_date}</td>
            <td>${batch.end_date}</td>
            <td>${batch.status}</td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editBatch(${batch.batch_id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteBatch(${batch.batch_id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addBatch() {
    const data = {
        course_id: document.getElementById('qualificationSelect').value,
        batch_name: document.getElementById('batchName').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        status: document.getElementById('status').value
    };

    try {
        const response = await apiClient.post('/role/admin/batches.php?action=add', data);
        if (response.data.success) {
            alert('Batch added successfully');
            resetForm();
            loadBatches();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error adding batch:', error);
        alert('Error adding batch');
    }
}

async function updateBatch(id) {
    const data = {
        batch_id: id,
        course_id: document.getElementById('qualificationSelect').value,
        batch_name: document.getElementById('batchName').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        status: document.getElementById('status').value
    };

    try {
        const response = await apiClient.post('/role/admin/batches.php?action=update', data);
        if (response.data.success) {
            alert('Batch updated successfully');
            resetForm();
            loadBatches();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error updating batch:', error);
        alert('Error updating batch');
    }
}

async function deleteBatch(id) {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    
    try {
        const response = await apiClient.delete(`/role/admin/batches.php?action=delete&id=${id}`);
        if (response.data.success) {
            alert('Batch deleted successfully');
            loadBatches();
        } else {
            alert('Error deleting batch');
        }
    } catch (error) {
        console.error('Error deleting batch:', error);
        alert('Error deleting batch');
    }
}

function editBatch(id) {
    const batch = currentBatches.find(b => b.batch_id == id);
    if (!batch) return;

    const form = document.getElementById('addBatchForm');
    if (!form) return;

    const qualificationSelect = document.getElementById('qualificationSelect');
    if (qualificationSelect) {
        qualificationSelect.value = batch.course_id;
    }

    document.getElementById('batchName').value = batch.batch_name;
    document.getElementById('startDate').value = batch.start_date;
    document.getElementById('endDate').value = batch.end_date;
    document.getElementById('status').value = batch.status;
    
    // Store ID on the form for the update function
    form.dataset.id = id;
    
    // Change button text to indicate edit mode
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.textContent = 'Update Batch';
    
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    document.getElementById('formTitle').textContent = 'Edit Batch';
}

function resetForm() {
    const form = document.getElementById('addBatchForm');
    if (form) {
        form.reset();
        delete form.dataset.id;
    }
    
    document.getElementById('submitBtn').textContent = 'Create Batch';
    document.getElementById('formTitle').textContent = 'Create New Batch';
    document.getElementById('cancelBtn').style.display = 'none';
}