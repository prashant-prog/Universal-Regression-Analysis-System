/* 
  Universal Regression System - API Client
  Connects to Python Flask Backend
*/

// --- DOM Elements ---
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const fileInfo = document.getElementById('file-info');
const xSelect = document.getElementById('x-variable');
const ySelect = document.getElementById('y-variable');
const columnSelection = document.getElementById('column-selection');
const trainBtn = document.getElementById('train-btn');
const predictGroup = document.getElementById('prediction-input-group');
const predictBtn = document.getElementById('predict-btn');
const predictInput = document.getElementById('predict-x');
const equationDisplay = document.getElementById('equation-display');

// Stats Elements
const valSlope = document.getElementById('val-slope');
const valIntercept = document.getElementById('val-intercept');
const valR2 = document.getElementById('val-r2');
const valPrediction = document.getElementById('val-prediction');

// Graph Element
const graphContainer = document.querySelector('.canvas-wrapper');

// --- Event Listeners ---

// Drag & Drop
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.querySelector('.upload-box').classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
    dropZone.querySelector('.upload-box').classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.querySelector('.upload-box').classList.remove('dragover');
    if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) uploadFile(e.target.files[0]);
});

trainBtn.addEventListener('click', trainModel);
predictBtn.addEventListener('click', makePrediction);

// --- API Interactions ---

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    fileInfo.innerHTML = `<span>Uploading...</span>`;
    fileInfo.classList.remove('hidden');

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        // Update UI
        fileInfo.innerHTML = `<span>${data.filename}</span> <span>✅ Loaded</span>`;
        populateDropdowns(data.columns);
        columnSelection.classList.remove('disabled');
        trainBtn.classList.remove('disabled');

    } catch (err) {
        fileInfo.innerHTML = `<span style="color:red">Error: ${err.message}</span>`;
    }
}

function populateDropdowns(columns) {
    xSelect.innerHTML = '<option value="" disabled selected>Select Independent (X)</option>';
    ySelect.innerHTML = '<option value="" disabled selected>Select Target (Y)</option>';

    columns.forEach(col => {
        xSelect.innerHTML += `<option value="${col}">${col}</option>`;
        ySelect.innerHTML += `<option value="${col}">${col}</option>`;
    });
}

async function trainModel() {
    const xKey = xSelect.value;
    const yKey = ySelect.value;

    if (!xKey || !yKey) return alert("Please select both X and Y variables.");
    if (xKey === yKey) return alert("X and Y variables must be different.");

    trainBtn.innerText = "Analyzing...";
    trainBtn.classList.add('disabled');

    try {
        const response = await fetch('/train', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x_column: xKey, y_column: yKey })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        // Update Stats
        valSlope.innerText = data.m.toFixed(4);
        valIntercept.innerText = data.c.toFixed(2);
        valR2.innerText = data.r2.toFixed(4);
        equationDisplay.innerText = `y = ${data.m.toFixed(2)}x + ${data.c > 0 ? '+' : ''}${data.c.toFixed(2)}`;

        // Render Graph Image
        graphContainer.innerHTML = `<img src="data:image/png;base64,${data.plot_url}" class="graph-img">`;

        predictGroup.classList.remove('disabled');

    } catch (err) {
        alert("Analysis Error: " + err.message);
    } finally {
        trainBtn.innerText = "Analyze Data 🚀";
        trainBtn.classList.remove('disabled');
    }
}

async function makePrediction() {
    const val = predictInput.value;
    if (!val) return;

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: val })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        valPrediction.innerText = data.prediction.toFixed(2);

    } catch (err) {
        alert("Prediction Error: " + err.message);
    }
}
