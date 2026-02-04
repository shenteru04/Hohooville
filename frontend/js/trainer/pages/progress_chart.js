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
        } else {
            console.error("Could not retrieve trainer ID.");
            alert("Error: Could not verify trainer identity. Some features might not work.");
        }
    } catch (error) {
        console.error("Error fetching trainer ID:", error);
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