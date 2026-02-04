const API_BASE_URL = 'http://localhost/hohoo-ville/api';

document.addEventListener('DOMContentLoaded', function() {
    loadCertificates();
    loadFormData();

    const form = document.getElementById('certificateForm');
    if (form) {
        form.addEventListener('submit', handleAddCertificate);
    }
});

async function loadFormData() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/certificates.php?action=get-form-data`);
        if (response.data.success) {
            const { trainees, courses } = response.data.data;

            const traineeSelect = document.getElementById('traineeSelect');
            traineeSelect.innerHTML = '<option value="">Select Trainee</option>';
            trainees.forEach(t => {
                traineeSelect.innerHTML += `<option value="${t.trainee_id}">${t.last_name}, ${t.first_name}</option>`;
            });

            const courseSelect = document.getElementById('courseSelect');
            courseSelect.innerHTML = '<option value="">Select Course</option>';
            courses.forEach(c => {
                courseSelect.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading form data:', error);
    }
}

async function loadCertificates() {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/certificates.php?action=list`);
        if (response.data.success) {
            const tbody = document.querySelector('#certificatesTable tbody');
            tbody.innerHTML = '';
            
            if (response.data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No certificates found</td></tr>';
                return;
            }

            response.data.data.forEach(cert => {
                tbody.innerHTML += `
                    <tr>
                        <td>${cert.certificate_id}</td>
                        <td>${cert.last_name}, ${cert.first_name}</td>
                        <td>${cert.course_name}</td>
                        <td>${cert.issue_date}</td>
                        <td>${cert.validity_date || 'N/A'}</td>
                        <td><span class="badge bg-${cert.certificate_status === 'valid' ? 'success' : 'danger'}">${cert.certificate_status}</span></td>
                        <td>
                            <button class="btn btn-primary btn-sm me-1" onclick="printCertificate(${cert.certificate_id})" title="Print PDF"><i class="fas fa-print"></i></button>
                            <button class="btn btn-danger btn-sm" onclick="deleteCertificate(${cert.certificate_id})" title="Delete"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading certificates:', error);
    }
}

async function handleAddCertificate(e) {
    e.preventDefault();
    const data = {
        trainee_id: document.getElementById('traineeSelect').value,
        course_id: document.getElementById('courseSelect').value,
        issue_date: document.getElementById('issueDate').value,
        validity_date: document.getElementById('validityDate').value
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/role/admin/certificates.php?action=add`, data);
        if (response.data.success) {
            alert('Certificate generated successfully');
            document.getElementById('certificateForm').reset();
            loadCertificates();
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error adding certificate:', error);
        alert('Failed to generate certificate');
    }
}

window.deleteCertificate = async function(id) {
    if (!confirm('Are you sure you want to delete this certificate?')) return;
    try {
        await axios.delete(`${API_BASE_URL}/role/admin/certificates.php?action=delete&id=${id}`);
        loadCertificates();
    } catch (error) {
        console.error('Error deleting certificate:', error);
    }
};

window.printCertificate = async function(id) {
    try {
        const response = await axios.get(`${API_BASE_URL}/role/admin/certificates.php?action=get&id=${id}`);
        if (response.data.success) {
            const cert = response.data.data;
            
            // Populate Template
            document.getElementById('certTraineeName').textContent = `${cert.first_name} ${cert.last_name}`;
            document.getElementById('certCourseName').textContent = cert.course_name;
            document.getElementById('certDuration').textContent = cert.duration || 'N/A';
            document.getElementById('certDate').textContent = new Date(cert.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            // Generate PDF
            const element = document.getElementById('certificateTemplate');
            const opt = {
                margin: 0.2,
                filename: `Certificate_${cert.last_name}_${cert.first_name}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
            };

            html2pdf().set(opt).from(element).save();
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate certificate PDF');
    }
};