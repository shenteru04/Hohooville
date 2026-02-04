const API_BASE_URL = 'http://localhost/hohoo-ville/api';

// Axios Instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
});

document.addEventListener('DOMContentLoaded', function() {
    loadFilters();
    loadGrades();

    document.getElementById('filterBtn').addEventListener('click', loadGrades);
});

async function loadFilters() {
    try {
        const response = await apiClient.get('/role/admin/grades.php?action=get-filters');
        if (response.data.success) {
            const { batches, courses, trainees } = response.data.data;

            const batchSelect = document.getElementById('batchFilter');
            batches.forEach(b => {
                batchSelect.innerHTML += `<option value="${b.batch_id}">${b.batch_name}</option>`;
            });

            const courseSelect = document.getElementById('courseFilter');
            courses.forEach(c => {
                courseSelect.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`;
            });

            const traineeSelect = document.getElementById('traineeFilter');
            trainees.forEach(t => {
                traineeSelect.innerHTML += `<option value="${t.trainee_id}">${t.last_name}, ${t.first_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading filters:', error);
    }
}

async function loadGrades() {
    const batchId = document.getElementById('batchFilter').value;
    const courseId = document.getElementById('courseFilter').value;
    const traineeId = document.getElementById('traineeFilter').value;

    try {
        const response = await apiClient.get('/role/admin/grades.php?action=list', {
            params: { batch_id: batchId, course_id: courseId, trainee_id: traineeId }
        });

        if (response.data.success) {
            renderGradesTable(response.data.data);
        } else {
            alert('Error loading grades: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error loading grades:', error);
        alert('Error loading grades');
    }
}

function renderGradesTable(data) {
    const tbody = document.getElementById('gradesTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No grades found</td></tr>';
        return;
    }

    data.forEach(grade => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${grade.trainee_name}</td>
            <td>${grade.course_name}</td>
            <td>${grade.total_grade}</td>
            <td>${grade.remarks}</td>
            <td>${new Date(grade.date_recorded).toLocaleDateString()}</td>
        `;
        tbody.appendChild(row);
    });
}