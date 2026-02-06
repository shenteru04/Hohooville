const API_BASE_URL = 'http://localhost/hohoo-ville/api';
let selectedCell = null;
let currentTrainerId = null;

document.addEventListener('DOMContentLoaded', async function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        // Using absolute path for robustness
        window.location.href = '/Hohoo-ville/frontend/login.html';
        return;
    }

    // Fetch trainer ID to be used in API calls
    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/profile.php?action=get-trainer-id&user_id=${user.user_id}`);
        if (response.data.success) {
            currentTrainerId = response.data.data.trainer_id;
            // Once we have the trainer ID, load their saved charts
            loadSavedChartsList();

            // Inject new UI for live chart generation
            const chartControlsContainer = document.querySelector('.card-body'); // A plausible container
            if (chartControlsContainer) {
                const liveChartControls = document.createElement('div');
                liveChartControls.className = 'border-bottom pb-3 mb-3';
                liveChartControls.innerHTML = `
                    <h6 class="text-success">Live Progress Chart</h6>
                    <p class="small text-muted">Generate a chart from a batch to track real-time competency status. Learning outcomes completed by all trainees will be highlighted in green.</p>
                    <div class="d-flex gap-2 align-items-center">
                        <select id="batchSelectForChart" class="form-select" style="max-width: 400px;"></select>
                        <button id="generateLiveChartBtn" class="btn btn-success">
                            <i class="fas fa-sync-alt me-2"></i>Generate
                        </button>
                    </div>
                `;
                // Prepend it to the container
                chartControlsContainer.prepend(liveChartControls);

                document.getElementById('generateLiveChartBtn').addEventListener('click', generateLiveChart);
                loadBatchesForChart(currentTrainerId);
            }
        } else {
            const msg = response.data.message || "Trainer profile not found.";
            console.error("Could not retrieve trainer ID:", msg, response.data);
            alert("Error: " + msg);
        }
    } catch (error) {
        console.error("Error fetching trainer ID:", error);
        if (error.response && error.response.data && error.response.data.message) {
             alert("Error: " + error.response.data.message);
        }
    }

    // File Upload Handler
    document.getElementById('excelInput').addEventListener('change', handleFileUpload);

    // Track selected cell for Quick Tools
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'TD' && e.target.closest('.tesda-table')) {
            selectedCell = e.target;
            // Highlight logic could go here
        }
    });
});

async function loadBatchesForChart(trainerId) {
    if (!trainerId) return;
    try {
        // This endpoint needs to exist and list batches for a trainer.
        // Re-using an endpoint from another page's logic.
        const response = await axios.get(`${API_BASE_URL}/role/trainer/my_batches.php?trainer_id=${trainerId}`);
        const select = document.getElementById('batchSelectForChart');
        if (response.data.success) {
            select.innerHTML = '<option value="">Select a batch to generate live chart...</option>';
            response.data.data.forEach(batch => {
                select.innerHTML += `<option value="${batch.batch_id}">${batch.batch_name} - ${batch.course_name}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Could not load batches.</option>';
        }
    } catch (error) {
        console.error('Error loading batches for chart:', error);
        document.getElementById('batchSelectForChart').innerHTML = '<option value="">Error loading batches.</option>';
    }
}

/**
 * Fetches live data for a batch and renders the progress chart.
 * This requires a new API endpoint: /role/trainer/progress_chart.php?action=get-batch-data
 * The API should return a JSON object with the following structure:
 * {
 *   "success": true,
 *   "data": {
 *     "trainees": [ { "trainee_id": 1, "full_name": "John Doe" }, ... ],
 *     "outcomes": [ { "outcome_id": 101, "outcome_title": "Install PVC", "module_title": "Perform Roughing-in" }, ... ],
 *     "completion_status": [ { "trainee_id": 1, "outcome_id": 101, "mark": "✓" }, ... ],
 *     "all_outcomes_completed": [ 102, 105, ... ] // Array of outcome_ids completed by ALL trainees in the batch
 *   }
 * }
 */
async function generateLiveChart() {
    const batchId = document.getElementById('batchSelectForChart').value;
    if (!batchId) {
        alert('Please select a batch.');
        return;
    }

    const btn = document.getElementById('generateLiveChartBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Generating...';

    try {
        // This is the new API endpoint we need
        const response = await axios.get(`${API_BASE_URL}/role/trainer/progress_chart.php?action=get-batch-data&batch_id=${batchId}`);
        if (response.data.success) {
            renderLiveChart(response.data.data);
        } else {
            alert('Error generating chart: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error generating live chart:', error);
        alert('An error occurred while generating the live chart.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Generate';
    }
}

async function loadSavedChartsList() {
    if (!currentTrainerId) return;

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/progress_chart.php?action=list&trainer_id=${currentTrainerId}`);
        if (response.data.success) {
            const select = document.getElementById('savedChartsSelect');
            select.innerHTML = '<option value="">Load a saved chart...</option>'; // Reset dropdown
            response.data.data.forEach(chart => {
                const option = document.createElement('option');
                option.value = chart.chart_id;
                // Format date for better readability
                const updatedDate = new Date(chart.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                option.textContent = `${chart.title} (Updated: ${updatedDate})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading saved charts list:', error);
    }
}

async function loadSelectedChart() {
    const select = document.getElementById('savedChartsSelect');
    const chartId = select.value;

    if (!chartId) {
        return; // Do nothing if the placeholder is selected
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/role/trainer/progress_chart.php?action=get&id=${chartId}&trainer_id=${currentTrainerId}`);
        if (response.data.success) {
            const chart = response.data.data;
            document.getElementById('chartTitle').value = chart.title;
            document.getElementById('currentChartId').value = chart.chart_id;
            renderChart(chart.chart_content);
            alert(`Chart "${chart.title}" loaded successfully.`);
        } else {
            alert('Error loading chart: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error loading selected chart:', error);
        alert('Failed to load the selected chart.');
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        
        // Assume first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to HTML
        const html = XLSX.utils.sheet_to_html(worksheet, {
            id: 'progressTable',
            editable: false // We will add contenteditable manually for control
        });

        renderChart(html);
    };
    reader.readAsArrayBuffer(file);
}

function renderChart(htmlContent) {
    const container = document.getElementById('chartContainer');
    container.innerHTML = htmlContent;

    // Post-process the table to make it TESDA-compliant and editable
    const table = container.querySelector('table');
    if (table) {
        table.classList.add('tesda-table');
        
        // Make cells editable
        const cells = table.querySelectorAll('td, th');
        cells.forEach(cell => {
            cell.setAttribute('contenteditable', 'true');
            
            // Center align cells that look like progress marks (short text)
            if (cell.innerText.length <= 3) {
                cell.classList.add('progress-mark');
            }
        });

        // Try to identify header rows to style them
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, index) => {
            if (index < 4) { // Assume first 4 rows are headers based on TESDA format
                row.style.fontWeight = 'bold';
                row.style.backgroundColor = '#f8f9fa';
                row.style.textAlign = 'center';
            }
        });
    }
}

function renderLiveChart(data) {
    const { trainees, outcomes, completion_status, all_outcomes_completed } = data;

    if (!trainees || !outcomes || trainees.length === 0 || outcomes.length === 0) {
        document.getElementById('chartContainer').innerHTML = '<div class="alert alert-warning">Not enough data to generate a chart. Ensure the batch has trainees and the qualification has learning outcomes.</div>';
        return;
    }

    // Group outcomes by module
    const modules = outcomes.reduce((acc, outcome) => {
        const moduleTitle = outcome.module_title || 'Uncategorized';
        acc[moduleTitle] = acc[moduleTitle] || [];
        acc[moduleTitle].push(outcome);
        return acc;
    }, {});
    const moduleNames = Object.keys(modules);

    // --- Build Header ---
    let headerRow1 = `<tr><th rowspan="3">NO.</th><th rowspan="3" style="width: 200px;">NAME OF TRAINEE</th><th colspan="${outcomes.length}">CORE COMPETENCIES</th></tr>`;
    
    let headerRow2 = `<tr>`;
    moduleNames.forEach(moduleName => {
        headerRow2 += `<th colspan="${modules[moduleName].length}">${moduleName}</th>`;
    });
    headerRow2 += `</tr>`;

    let headerRow3 = `<tr>`;
    outcomes.forEach(outcome => {
        const isCompleted = all_outcomes_completed.includes(outcome.outcome_id);
        const style = isCompleted ? 'style="background-color: #1cc88a; color: white;"' : '';
        headerRow3 += `<th ${style} data-outcome-id="${outcome.outcome_id}">${outcome.outcome_title}</th>`;
    });
    headerRow3 += `</tr>`;

    // --- Build Body ---
    let bodyHtml = '';
    trainees.forEach((trainee, index) => {
        bodyHtml += `<tr data-trainee-id="${trainee.trainee_id}">`;
        bodyHtml += `<td class="text-center">${index + 1}</td>`;
        bodyHtml += `<td>${trainee.full_name}</td>`;
        
        outcomes.forEach(outcome => {
            const status = completion_status.find(s => s.trainee_id == trainee.trainee_id && s.outcome_id == outcome.outcome_id);
            const mark = status ? status.mark : ''; // e.g., '✓' or 'IP'
            let markClass = '';
            if (mark === '✓') markClass = 'text-success fw-bold';
            if (mark === 'IP') markClass = 'text-warning';

            bodyHtml += `<td class="progress-mark ${markClass}">${mark}</td>`;
        });
        bodyHtml += `</tr>`;
    });

    const tableHtml = `
        <table class="tesda-table" id="progressTable">
            <thead>${headerRow1}${headerRow2}${headerRow3}</thead>
            <tbody>${bodyHtml}</tbody>
        </table>
    `;

    // Use the existing renderChart function to inject the HTML and make it editable
    renderChart(tableHtml);
}

function generateEIMTemplate() {
    const institution = "HOHOO-VILLE TRAINING CENTER";
    const address = "123 Tech Street, Innovation City";
    
    const html = `
        <div class="tesda-header">
            <h3>${institution}</h3>
            <p>${address}</p>
            <h2>ACHIEVEMENT CHART</h2>
            <h3>Electrical Installation and Maintenance (EIM) NC II</h3>
        </div>
        <table class="tesda-table" id="progressTable">
            <thead>
                <tr>
                    <th rowspan="3" style="width: 30px;">NO.</th>
                    <th rowspan="3" style="width: 200px;">NAME OF TRAINEE</th>
                    <th colspan="10">CORE COMPETENCIES</th>
                </tr>
                <tr>
                    <!-- Unit 1 -->
                    <th colspan="6">Perform roughing-in activities, wiring and cabling works</th>
                    <!-- Unit 2 -->
                    <th colspan="4">Install electrical protective devices</th>
                </tr>
                <tr>
                    <!-- Elements for Unit 1 -->
                    <th>Install PVC conduits</th>
                    <th>Install wire ways</th>
                    <th>Install aux cabinet</th>
                    <th>Cable pulling</th>
                    <th>Wiring layout</th>
                    <th>Notify completion</th>
                    
                    <!-- Elements for Unit 2 -->
                    <th>Plan installation</th>
                    <th>Install fuses/breakers</th>
                    <th>Install lighting fixtures</th>
                    <th>Notify completion</th>
                </tr>
            </thead>
            <tbody>
                ${generateEmptyRows(10)}
            </tbody>
        </table>
    `;
    
    document.getElementById('chartContainer').innerHTML = html;
    
    // Make cells editable
    document.querySelectorAll('.tesda-table td, .tesda-table th').forEach(cell => {
        cell.setAttribute('contenteditable', 'true');
    });
}

function generateEmptyRows(count) {
    let rows = '';
    for (let i = 1; i <= count; i++) {
        rows += `
            <tr>
                <td class="text-center">${i}</td>
                <td></td> <!-- Name -->
                <!-- 10 Progress Columns -->
                <td class="progress-mark"></td><td class="progress-mark"></td>
                <td class="progress-mark"></td><td class="progress-mark"></td>
                <td class="progress-mark"></td><td class="progress-mark"></td>
                <td class="progress-mark"></td><td class="progress-mark"></td>
                <td class="progress-mark"></td><td class="progress-mark"></td>
            </tr>
        `;
    }
    return rows;
}

function insertSymbol(symbol) {
    if (selectedCell) {
        selectedCell.innerText = symbol;
        // Optional: Color coding
        if (symbol === '✓') selectedCell.style.color = 'green';
        else if (symbol === 'IP') selectedCell.style.color = 'orange';
        else selectedCell.style.color = 'black';
    } else {
        alert('Please click on a cell in the table first.');
    }
}

async function saveChart() {
    const container = document.getElementById('chartContainer');
    const title = document.getElementById('chartTitle').value;
    const chartId = document.getElementById('currentChartId').value;

    if (!title) {
        alert('Please enter a chart title.');
        return;
    }

    // Get HTML content
    // We strip contenteditable attributes before saving to keep it clean, 
    // but for simplicity in this demo, we save as is and re-enable on load.
    const content = container.innerHTML;

    try {
        const response = await axios.post(`${API_BASE_URL}/role/trainer/progress_chart.php?action=save`, {
            chart_id: chartId,
            title: title,
            content: content,
            trainer_id: currentTrainerId
        });

        if (response.data.success) {
            alert('Chart saved successfully!');
            loadSavedChartsList(); // Refresh the list of saved charts
        } else {
            alert('Error: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error saving chart:', error);
        alert('Failed to save chart.');
    }
}