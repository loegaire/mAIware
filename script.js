// --- MOCK DISASSEMBLY DATA ---
// (We keep this for now, as requested)
const mockDisassemblyBenign = [
    `<span class="addr">0x401000</span> <span class="op">PUSH</span> <span class="args">ebp</span> <span class="comment">; setup stack frame</span>`,
    `<span class="addr">0x401001</span> <span class="op">MOV</span> <span class="args">ebp, esp</span>`,
    `<span class="addr">0x401003</span> <span class="op">SUB</span> <span class="args">esp, 48h</span>`,
    `<span class="addr">0x40100C</span> <span class="op">CALL</span> <span class="args">0x4012A0</span> <span class="comment">; initialize_string</span>`,
    `<span class="addr">0x401015</span> <span class="op">CALL</span> <span class="args">0x4013F0</span> <span class="comment">; get_user_input</span>`,
    `<span class="addr">0x40101E</span> <span class="op">CALL</span> <span class="args">0x4015D0</span> <span class="comment">; print_output</span>`,
    `<span class="addr">0x401028</span> <span class="op">RETN</span>`,
    `<span class="addr">...</span>`,
];
const mockDisassemblySuspicious = [
    `<span class="addr">0x401000</span> <span class="op">PUSH</span> <span class="args">ebp</span>`,
    `<span class="addr">0x401003</span> <span class="op">SUB</span> <span class="args">esp, 80h</span>`,
    `<span class="addr">0x40100D</span> <span class="op">CALL</span> <span class="args">0x4012A0</span> <span class="comment">; read_file_to_buffer</span>`,
    `<span class="addr">0x40101B</span> <span class="op">REP</span> <span class="op">MOVSB</span> <span class="comment">; unsafe buffer write</span>`,
    `<span class="addr">0x401020</span> <span class="op">JGE</span> <span class="args">0x401030</span> <span class="comment">; jump if overflow</span>`,
    `<span class="addr">0x401028</span> <span class="op">RETN</span>`,
    `<span class="addr">...</span>`,
];
const mockDisassemblyMalware = [
    `<span class="addr">0x401000</span> <span class="op">PUSH</span> <span class="args">ebp</span> <span class="comment">; setup stack frame</span>`,
    `<span class="addr">0x40100B</span> <span class="op">CALL</span> <span class="args">0x4011B0</span> <span class="comment">; kernel32.LoadLibraryA</span>`,
    `<span class="addr">0x401013</span> <span class="op">PUSH</span> <span class="string">"CreateRemoteThread"</span>`,
    `<span class="addr">0x401019</span> <span class="op">CALL</span> <span class="args">0x4011C0</span> <span class="comment">; kernel32.GetProcAddress</span>`,
    `<span class="addr">0x401028</span> <span class="op">CALL</span> <span class="args">0x4012F0</span> <span class="comment">; decrypt_payload</span>`,
    `<span class="addr">0x401034</span> <span class="op">CALL</span> <span class="args">[ebp-24h]</span> <span class="comment">; call CreateRemoteThread</span>`,
    `<span class="addr">0x401037</span> <span class="op">JMP</span> <span class="args">0x40102D</span> <span class="comment">; loop?</span>`,
    `<span class="addr">...</span>`,
];

// --- REMOVED MOCK GRAPH DATA ---
// const mockGraphSafe = ... (DELETED)
// const mockGraphSuspicious = ... (DELETED)
// const mockGraphMalware = ... (DELETED)

// --- NAVIGATION STATE ---
let scanHistory = [];
let currentHistoryIndex = -1;

// --- ELEMENT REFERENCES ---
const initialState = document.getElementById('initial-state');
const analyzingState = document.getElementById('analyzing-state');
const resultState = document.getElementById('result-state');

const analyzingFilename = document.getElementById('analyzing-filename');
const resultIcon = document.getElementById('result-icon');
const resultText = document.getElementById('result-text');
const resultFilename = document.getElementById('result-filename');
const resultDetails = document.getElementById('result-details');
const nonPeResultWrapper = document.getElementById('non-pe-result');
const nonPeFilename = document.getElementById('non-pe-filename');
const nonPeHashSha256 = document.getElementById('non-pe-hash-sha256');
const nonPeHashMd5 = document.getElementById('non-pe-hash-md5');

const bodyEl = document.body;
let animationWrapper = null;

const disassemblyWrapper = document.getElementById('disassembly-wrapper');
const disassemblyCodeEl = document.getElementById('disassembly-code');
const disassemblyFilenameEl = document.getElementById('disassembly-filename');

// Analysis Details elements
const analysisDetailsWrapper = document.getElementById('analysis-details-wrapper');
const progressBarFill = document.getElementById('progress-bar-fill');
const scorePercentage = document.getElementById('score-percentage');
const detailsReasoning = document.getElementById('details-reasoning'); // We'll reuse this
const detailsHashSha256 = document.getElementById('details-hash-sha256');
const detailsHashMd5 = document.getElementById('details-hash-md5');
const detailsSystemIp = document.getElementById('details-system-ip');
const detailsRecommendation = document.getElementById('details-recommendation');
const detailsVendor = document.getElementById('details-vendor');
const detailsSignature = document.getElementById('details-signature');
const fileInternalsWrapper = document.getElementById('file-internals-wrapper');
const entropyBarsContainer = document.getElementById('entropy-bars-container');
const keyStringsContainer = document.getElementById('key-strings-container');

// History Panel elements
const historyBtn = document.getElementById('history-btn');
const historyPanel = document.getElementById('history-panel');
const historyCloseBtn = document.getElementById('history-close-btn');
const historyOverlay = document.getElementById('history-overlay');
const historyListEl = document.querySelector('.history-list');

// Scroll Zone elements
const scrollZoneTop = document.getElementById('scroll-zone-top');
const scrollZoneBottom = document.getElementById('scroll-zone-bottom');

// Graph Panel elements
const graphWrapper = document.getElementById('graph-wrapper');
const callGraphEl = document.getElementById('call-graph');

// Stats elements
const statsWrapper = document.getElementById('stats-wrapper');


// --- STATE ---
let disassemblyInterval = null;
let scrollInterval = null; // For auto-scrolling
let currentGraphLines = []; // Renamed from currentLines to avoid conflict
let currentFileMetadata = null;
let lastScanResult = null;

// 1. Listen for the 'scan-started' message from the backend
window.electronAPI.onScanStarted((filename) => {
  console.log(`UI: Received scan-started for ${filename}`);

    // If user is viewing a result, don't auto-switch to analyzing.
    if (bodyEl.classList.contains('is-showing-result') || bodyEl.classList.contains('is-non-pe')) {
        console.log('UI: Result is being viewed; deferring analyzing UI switch');
        return;
    }

  // 1. Set UI to "Analyzing" state
  initialState.classList.remove('active'); //
  analyzingState.classList.add('active'); //
  analyzingFilename.textContent = filename; //
  disassemblyFilenameEl.textContent = filename; //

  currentFileMetadata = { filename, isPe: true };
  lastScanResult = null;
  nonPeResultWrapper.classList.remove('active');
  bodyEl.classList.remove('is-non-pe');

  // 2. Update body class to show disassembly
  bodyEl.classList.remove('is-showing-result'); //
  bodyEl.classList.add('is-analyzing'); //
  removeAnimationClasses(); //
  
  // 3. Populate disassembly with a "suspicious" default and start animation
  // (We don't know the result yet, so we pick one)
  populateDisassembly(mockDisassemblySuspicious); //
  startDisassemblyAnimation(); //

  // 4. Clear old results
  clearResultData();
});

// 2. Listen for the 'scan-result' message
window.electronAPI.onScanResult((scanResult) => {
  console.log("UI: Received scan-result:", scanResult);

  clearInterval(disassemblyInterval); //
  disassemblyInterval = null; //

  // Add to history
  scanHistory.push(scanResult);
  currentHistoryIndex = scanHistory.length - 1;

    // If a result is already being viewed, do not auto-advance UI.
    if (bodyEl.classList.contains('is-showing-result') || bodyEl.classList.contains('is-non-pe')) {
        updateNavigationButtons();
        return;
    }

    bodyEl.classList.remove('is-analyzing'); //
    bodyEl.classList.add('is-showing-result'); //

    analyzingState.classList.remove('active'); //
    resultState.classList.add('active'); //

    lastScanResult = scanResult;
    renderScanResult();
    updateNavigationButtons();
});

window.electronAPI.onScanFileMetadata((metadata) => {
  if (!metadata || typeof metadata !== 'object') {
    return;
  }

  currentFileMetadata = metadata;

  if (lastScanResult && metadata.filename === lastScanResult.detected_filename) {
    renderScanResult();
  }
});

function renderScanResult() {
  if (!lastScanResult) {
    return;
  }

  const metadataMatches = currentFileMetadata && currentFileMetadata.filename === lastScanResult.detected_filename;
  const isNonPe = metadataMatches && currentFileMetadata.isPe === false;

  if (isNonPe) {
    renderNonPeResult(lastScanResult);
    return;
  }

  renderPeResult(lastScanResult);
}

function ensureAnimationWrapper() {
  if (animationWrapper) {
    return;
  }

  animationWrapper = document.createElement('div');
  animationWrapper.className = 'animation-swarm';
  for (let i = 0; i < 10; i++) {
    const particle = document.createElement('span');
    animationWrapper.appendChild(particle);
  }
  bodyEl.prepend(animationWrapper);
}

function renderPeResult(scanResult) {
  removeAnimationClasses();
  bodyEl.classList.remove('is-non-pe');
  nonPeResultWrapper.classList.remove('active');

  let resultIconClass = 'fas fa-check-circle'; //
  let resultMockDisassembly = mockDisassemblyBenign; //
  let resultBodyClass = 'result-safe-active'; //
  let resultScannerClass = 'result-safe'; //
  let resultProgressClass = 'progress-bar-green'; //
  let resultScoreClass = 'score-green'; //
  let recommendation = 'You can safely run this file.'; //

  if (scanResult.classification.includes('Malware')) {
    resultIconClass = 'fas fa-bug';
    resultMockDisassembly = mockDisassemblyMalware;
    resultBodyClass = 'result-malware-active'; //
    resultScannerClass = 'result-malware'; //
    resultProgressClass = 'progress-bar-red'; //
    resultScoreClass = 'score-red'; //
    recommendation = 'DO NOT OPEN. Quarantine this file immediately.'; //
  } else if (scanResult.classification.includes('Suspicious')) {
    resultIconClass = 'fas fa-exclamation-triangle'; //
    resultMockDisassembly = mockDisassemblySuspicious; //
    resultBodyClass = 'result-suspicious-active'; //
    resultScannerClass = 'result-suspicious'; //
    resultProgressClass = 'progress-bar-yellow'; //
    resultScoreClass = 'score-yellow'; //
    recommendation = 'Be cautious. Only run if you trust the source.'; //
  }

  ensureAnimationWrapper();
  bodyEl.classList.add(resultBodyClass); //

  resultState.className = `scanner-state active ${resultScannerClass}`; //
  resultIcon.className = `result-icon ${resultIconClass}`; //
  resultText.textContent = scanResult.classification; //

  let detailsText = `Scanned ${scanResult.detected_filename}.`;
  if (scanResult.malware_family) {
    detailsText = `Family: ${scanResult.malware_family}`;
  }
  resultDetails.textContent = detailsText;
  resultFilename.textContent = scanResult.detected_filename; //

  progressBarFill.className = 'progress-bar-fill'; //
  scorePercentage.className = 'score-percentage'; //
  progressBarFill.classList.add(resultProgressClass); //
  const rawConfidence = Number(scanResult.confidence_score);
  const confidenceValue = Number.isFinite(rawConfidence) ? rawConfidence * 100 : 0;
  progressBarFill.style.width = `${confidenceValue}%`; //
  scorePercentage.textContent = `${Math.round(confidenceValue)}%`; //
  scorePercentage.classList.add(resultScoreClass); //

  detailsReasoning.textContent = `Filetype: ${scanResult.key_findings.file_type}. Packer: ${scanResult.key_findings.packer_detected}.`; //
  const hashData = scanResult.file_hashes || {};
  detailsHashSha256.textContent = hashData.sha256 || 'Not available'; //
  detailsHashMd5.textContent = hashData.md5 || 'Not available'; //
  updateSystemIpDisplay();
  detailsRecommendation.textContent = recommendation;

  populateVendor(scanResult.vendor); //
  populateSignature(scanResult.key_findings.signature); //
  populateEntropyBars(scanResult.key_findings.section_entropy || []); //
  populateKeyStrings(scanResult.key_findings.key_strings || [], scanResult.classification); //

  populateDisassembly(resultMockDisassembly); //

  const apiList = scanResult.key_findings.api_imports || [];
  const graphData = generateGraphData(apiList, scanResult.classification);
  drawCallGraph(graphData);

    // Generate QR for PE report
    generatePeQr(scanResult);
}

function renderNonPeResult(scanResult) {
  removeAnimationClasses();
  bodyEl.classList.add('is-non-pe');
  resultState.className = 'scanner-state active';
  resultIcon.className = 'result-icon fas fa-file';
  resultText.textContent = '';
  resultDetails.textContent = '';
  resultFilename.textContent = '';

  const hashData = scanResult.file_hashes || {};
  nonPeFilename.textContent = scanResult.detected_filename || '';
  nonPeHashSha256.textContent = hashData.sha256 || 'Not available';
  nonPeHashMd5.textContent = hashData.md5 || 'Not available';

  detailsHashSha256.textContent = hashData.sha256 || 'Not available';
  detailsHashMd5.textContent = hashData.md5 || 'Not available';

  nonPeResultWrapper.classList.add('active');

  callGraphEl.innerHTML = '';
  currentGraphLines.forEach(line => line.remove());
  currentGraphLines = [];
  entropyBarsContainer.innerHTML = '';
  keyStringsContainer.innerHTML = '';

    // Hide QR for non-PE
    clearQr();
}

/**
 * Clears all dynamic result data to prepare for the next scan.
 */
function clearResultData() {
    // Clear scanner panel
    resultText.textContent = '';
    resultDetails.textContent = '';
    resultFilename.textContent = '';
    nonPeResultWrapper.classList.remove('active');
    nonPeFilename.textContent = '';
    nonPeHashSha256.textContent = '...';
    nonPeHashMd5.textContent = '...';
    bodyEl.classList.remove('is-non-pe');

    // Clear analysis panel
    progressBarFill.style.width = `0%`;
    scorePercentage.textContent = `0%`;
    detailsReasoning.textContent = '...';
    detailsHashSha256.textContent = '...';
    detailsHashMd5.textContent = '...';
    if (detailsSystemIp) {
        detailsSystemIp.textContent = 'Detecting...';
    }
    detailsRecommendation.textContent = '...';

    // Clear vendor
    detailsVendor.innerHTML = `
        <h4>Vendor Analysis</h4>
        <div class="vendor-info">
            <i class="fas fa-question-circle"></i>
            <span>Scanning...</span>
        </div>`;
    
    // Clear signature
    detailsSignature.innerHTML = `
        <h4>Digital Signature</h4>
        <div class="signature-info">
            <i class="fas fa-question-circle"></i>
            <span>Checking...</span>
        </div>`;
    
    // Clear internals
    entropyBarsContainer.innerHTML = '';
    keyStringsContainer.innerHTML = '';
    
    // Clear graph
    callGraphEl.innerHTML = '';
    currentGraphLines.forEach(line => line.remove());
    currentGraphLines = [];
}

// --- QR helpers ---
function clearQr() {
    const qrSection = document.getElementById('qr-section');
    const qrEl = document.getElementById('qr-code');
    if (qrEl) qrEl.innerHTML = '';
    if (qrSection) qrSection.style.display = 'none';
}

function generatePeQr(scanResult) {
    const qrSection = document.getElementById('qr-section');
    const qrEl = document.getElementById('qr-code');
    if (!qrEl || !qrSection || typeof QRCode === 'undefined') return;

    // Build a compact JSON report that fits in a QR
    const report = {
        filename: scanResult.detected_filename,
        classification: scanResult.classification,
        confidence: Number(scanResult.confidence_score),
        family: scanResult.malware_family || null,
        vendor: (scanResult.vendor && scanResult.vendor.name) ? scanResult.vendor.name : null,
        hashes: {
            sha256: scanResult.file_hashes?.sha256 || null,
            md5: scanResult.file_hashes?.md5 || null
        },
        ts: Date.now()
    };

    // Show section and render
    qrSection.style.display = 'block';
    qrEl.innerHTML = '';
    const json = JSON.stringify(report);
    try {
        new QRCode(qrEl, { text: json, width: 160, height: 160, colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.M });
    } catch (e) {
        console.warn('QR generation failed', e);
        qrEl.textContent = 'QR unavailable';
    }
}

// --- VENDOR UI FUNCTION (IMPLEMENTED) ---
function populateVendor(vendor) {
    if (!vendor) return;
    const icon = vendor.icon || 'fas fa-question-circle'; //
    const name = vendor.name || 'Unknown'; //
    detailsVendor.innerHTML = `
        <h4>Vendor Analysis</h4> <div class="vendor-info"> <i class="${icon}"></i>
            <span>${name}</span>
        </div>
    `;
}

// --- SIGNATURE UI FUNCTION (IMPLEMENTED) ---
function populateSignature(signature) {
    if (!signature) return;
    let icon = signature.icon || 'fas fa-question-circle';
    let cssClass = `sig-${signature.level || 'unknown'}`; // 'sig-verified', 'sig-untrusted', 'sig-unknown'

    detailsSignature.innerHTML = `
        <h4>Digital Signature</h4> <div class="signature-info ${cssClass}"> <i class="${icon}"></i>
            <span>${signature.name}</span>
        </div>
    `;
}

// --- ENTROPY BARS UI FUNCTION (IMPLEMENTED) ---
function populateEntropyBars(sections) {
    entropyBarsContainer.innerHTML = ''; // Clear old bars
    if (!sections || sections.length === 0) {
        entropyBarsContainer.innerHTML = '<p class="hash-text">No PE sections found to analyze.</p>';
        return;
    }

    sections.forEach(section => { //
        const value = section.entropy; //
        const width = (value / 8.0) * 100; // Entropy is 0-8
        let cssClass = 'low';
        
        if (value > 6.0) cssClass = 'medium';
        if (value > 7.0) cssClass = 'high';
        if (value > 7.8) cssClass = 'packed'; // Match style.css

        const row = document.createElement('div');
        row.className = 'entropy-bar-row';
        row.innerHTML = `
            <span class="entropy-bar-label">${section.name}</span> <div class="entropy-bar-bg">
                <div class="entropy-bar-fill ${cssClass}" style="width: ${width}%">
                    <span class="entropy-bar-value">${value.toFixed(2)}</span>
                </div>
            </div>
        `;
        entropyBarsContainer.appendChild(row);
    });
}

// --- KEY STRINGS UI FUNCTION (IMPLEMENTED) ---
function populateKeyStrings(strings, classification) {
    keyStringsContainer.innerHTML = ''; // Clear old strings
    if (!strings || strings.length === 0) {
        keyStringsContainer.innerHTML = '<span class="key-string-tag">No notable strings found.</span>';
        return;
    }
    
    const tagClass = classification.includes('Benign') ? 'benign' : 'suspicious'; //

    strings.forEach(str => { //
        const tag = document.createElement('span');
        tag.className = `key-string-tag ${tagClass}`;
        tag.textContent = str;
        keyStringsContainer.appendChild(tag);
    });
}

function updateSystemIpDisplay() {
    if (!detailsSystemIp || !window.electronAPI || typeof window.electronAPI.getSystemIp !== 'function') {
        return;
    }

    detailsSystemIp.textContent = 'Detecting...';

    window.electronAPI.getSystemIp()
        .then((ip) => {
            if (!ip) {
                detailsSystemIp.textContent = 'Unavailable';
                return;
            }

            detailsSystemIp.textContent = ip;
        })
        .catch(() => {
            detailsSystemIp.textContent = 'Unavailable';
        });
}

function removeAnimationClasses() {
    bodyEl.classList.remove('result-safe-active');
    bodyEl.classList.remove('result-suspicious-active');
    bodyEl.classList.remove('result-malware-active');
}

// --- Disassembly Functions ---

function populateDisassembly(codeLines) {
    disassemblyCodeEl.innerHTML = '';
    codeLines.forEach((line, index) => {
        const lineEl = document.createElement('span');
        lineEl.className = 'disassembly-line';
        lineEl.id = `line-${index}`;
        lineEl.innerHTML = line;
        disassemblyCodeEl.appendChild(lineEl);
    });
}

function startDisassemblyAnimation() {
    if (disassemblyInterval) {
        clearInterval(disassemblyInterval);
    }
    let currentLine = 0;
    const totalLines = disassemblyCodeEl.children.length;

    disassemblyInterval = setInterval(() => {
        const prevLine = document.querySelector('.disassembly-line.active');
        if (prevLine) {
            prevLine.classList.remove('active');
        }

        const lineEl = document.getElementById(`line-${currentLine}`);
        if (lineEl) {
            lineEl.classList.add('active');
            lineEl.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }
        currentLine = (currentLine + 1) % totalLines;
    }, 150);
}

/**
 * This function was MOVED here from jsonsamples.js
 * Dynamically generates the graph data based on API imports.
 * @param {string[]} apiImports - Array of API names (e.g., ['CreateRemoteThread'])
 * @param {string} classification - 'Benign', 'Suspicious', or 'Malware'
 * @returns {object} A graph object with 'nodes' and 'edges' arrays.
 */
function generateGraphData(apiImports, classification) {
    let nodes = [];
    let edges = [];
    const nodeSpacing = 150;
    const startY = 100;
    const startX = 250;

    // 1. Add the Main Entry Point node
    nodes.push({ 
        id: 'main-entry', 
        label: 'main()', 
        class: 'node-entry', 
        pos: { top: `${startY + (apiImports.length / 2) * (nodeSpacing / 2)}px`, left: '50px' } 
    });

    if (!apiImports || apiImports.length === 0) {
        // Benign/Empty graph
        nodes.push({ id: 'benign-1', label: 'ReadFile', class: 'node-std', pos: { top: `${startY}px`, left: `${startX}px` } });
        nodes.push({ id: 'benign-2', label: 'WriteFile', class: 'node-std', pos: { top: `${startY + nodeSpacing / 2}px`, left: `${startX}px` } });
        edges.push({ from: 'main-entry', to: 'benign-1', options: { color: '#888' } });
        edges.push({ from: 'main-entry', to: 'benign-2', options: { color: '#888' } });
    } else {
        // Suspicious/Malware graph
        apiImports.forEach((apiName, index) => {
            let nodeClass = 'node-api'; // Default
            let edgeColor = '#888'; // Default

            if (classification === 'Malware') {
                nodeClass = 'node-malicious';
                edgeColor = '#e74c3c'; // Malware red
            } else if (classification === 'Suspicious') {
                nodeClass = 'node-suspicious';
                edgeColor = '#f1c40f'; // Suspicious yellow
            } else {
                // Benign
                nodeClass = 'node-std';
                edgeColor = '#888';
            }


            const nodeId = `api-${index}`;
            const yPos = startY + (index * (nodeSpacing-50)); // Make them a bit closer
            const xPos = startX + (index % 2 === 0 ? 0 : 150); // Stagger them

            // Add the API node
            nodes.push({
                id: nodeId,
                label: apiName,
                class: nodeClass,
                pos: { top: `${yPos}px`, left: `${xPos}px` }
            });

            // Add the edge from main
            edges.push({
                from: 'main-entry',
                to: nodeId,
                options: { color: edgeColor }
            });
        });
    }

    return { nodes, edges };
}

// --- Graph Drawing ---
function drawCallGraph(graphData) {
    // 1. Clear previous graph (both nodes and lines)
    callGraphEl.innerHTML = '';
    currentGraphLines.forEach(line => line.remove());
    currentGraphLines = [];

    if (!graphData || !graphData.nodes || !graphData.edges) {
        console.error("Invalid graph data received", graphData);
        return;
    }

    // 2. Create and place all nodes
    graphData.nodes.forEach(node => {
        const nodeEl = document.createElement('div');
        nodeEl.id = node.id;
        nodeEl.className = `graph-node ${node.class}`;
        nodeEl.style.top = node.pos.top;
        nodeEl.style.left = node.pos.left;
        nodeEl.textContent = node.label;
        callGraphEl.appendChild(nodeEl);
    });

    // 3. Draw all edges (must be done *after* nodes are in DOM)
    // Use a slight timeout to ensure DOM is ready
    setTimeout(() => {
        graphData.edges.forEach(edge => {
            try {
                const line = new LeaderLine(
                    document.getElementById(edge.from),
                    document.getElementById(edge.to),
                    {
                        color: edge.options.color,
                        path: edge.options.path || 'straight',
                        startSocket: edge.options.startSocket || 'auto',
                        endSocket: edge.options.endSocket || 'auto',
                        endPlug: 'arrow1',
                        size: 3,
                        endPlugSize: 1.5,
                    }
                );
                currentGraphLines.push(line);
            } catch(e) {
                console.error("Could not draw line:", e);
            }
        });
    }, 500); // 500ms timeout to let CSS fade-in finish
}


// --- History Panel Logic ---
async function loadHistory() {
  if (!historyListEl) return;
  
  historyListEl.innerHTML = '<li class="history-item-loading">Loading...</li>';

  try {
    const historyData = await window.electronAPI.getHistory();

    if (!historyData || historyData.length === 0) {
      historyListEl.innerHTML = '<li class="history-item-empty">No scan history found.</li>';
      return;
    }

    historyListEl.innerHTML = '';

    historyData.forEach(scan => {
      const li = document.createElement('li');
      li.className = 'history-item';

      // Determine classification icon
      let statusIcon = 'fas fa-check-circle';
      let classType = 'safe';
      if (scan.classification.includes('Malware')) {
        statusIcon = 'fas fa-bug';
        classType = 'malware';
      } else if (scan.classification.includes('Suspicious')) {
        statusIcon = 'fas fa-exclamation-triangle';
        classType = 'suspicious';
      }

      // Determine file type icon based on extension
      const filename = scan.detected_filename || '';
      const ext = filename.split('.').pop().toLowerCase();
      let fileTypeIcon = 'fas fa-file';
      
      if (['exe', 'dll', 'sys', 'msi'].includes(ext)) {
        fileTypeIcon = 'fas fa-cog'; // Executable
      } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
        fileTypeIcon = 'fas fa-image'; // Image
      } else if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'go', 'rs', 'php', 'rb'].includes(ext)) {
        fileTypeIcon = 'fas fa-code'; // Code
      } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
        fileTypeIcon = 'fas fa-file-alt'; // Document
      } else if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
        fileTypeIcon = 'fas fa-file-archive'; // Archive
      } else if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) {
        fileTypeIcon = 'fas fa-file-audio'; // Audio
      } else if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'].includes(ext)) {
        fileTypeIcon = 'fas fa-file-video'; // Video
      } else if (['html', 'htm', 'css', 'xml', 'json'].includes(ext)) {
        fileTypeIcon = 'fas fa-file-code'; // Web file
      }

      const scanDate = new Date(scan.scanDate).toLocaleString();
      const hashSha256 = scan.file_hashes?.sha256 || 'N/A';
      const hashDisplay = hashSha256.substring(0, 16) + '...'; // Show first 16 chars

      li.innerHTML = `
        <div class="history-icon-wrapper">
          <div class="history-icon ${classType}">
            <i class="${statusIcon}"></i>
          </div>
          <div class="history-file-type">
            <i class="${fileTypeIcon}"></i>
          </div>
        </div>
        <div class="history-details">
          <span class="history-filename" title="${filename}">${filename}</span>
          <span class="history-classification ${classType}">${scan.classification}</span>
          <span class="history-hash" title="${hashSha256}">SHA256: ${hashDisplay}</span>
        </div>
        <span class="history-date">${scanDate}</span>
      `;
      
      historyListEl.appendChild(li);
    });

  } catch (err) {
    console.error('Failed to load history:', err);
    historyListEl.innerHTML = '<li class="history-item-empty">Error loading history.</li>';
  }
}

function toggleHistoryPanel() {
  bodyEl.classList.toggle('is-history-open');
  
  // ADD THIS: If we are opening the panel, load the history
  if (bodyEl.classList.contains('is-history-open')) {
    loadHistory();
  }
}

historyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleHistoryPanel();
});
historyCloseBtn.addEventListener('click', toggleHistoryPanel);
historyOverlay.addEventListener('click', toggleHistoryPanel);


// --- Auto-scroll Logic ---
function startScrolling(direction) {
    if (scrollInterval) {
        clearInterval(scrollInterval);
    }
    scrollInterval = setInterval(() => {
        window.scrollBy(0, direction * 10); // 10 pixels at a time
    }, 20); // every 20ms
}

function stopScrolling() {
    clearInterval(scrollInterval);
    scrollInterval = null;
}

scrollZoneTop.addEventListener('mouseenter', () => {
    startScrolling(-1); // Scroll Up
    scrollZoneTop.classList.add('scrolling');
});
scrollZoneTop.addEventListener('mouseleave', () => {
    stopScrolling();
    scrollZoneTop.classList.remove('scrolling');
});

scrollZoneBottom.addEventListener('mouseenter', () => {
    startScrolling(1); // Scroll Down
    scrollZoneBottom.classList.add('scrolling');
});
scrollZoneBottom.addEventListener('mouseleave', () => {
    stopScrolling();
    scrollZoneBottom.classList.remove('scrolling');
});


// --- Chart instances ---
let malwareTypesChart = null;
let topMalwareChart = null;

// --- Function to create/recreate charts ---
window.recreateCharts = function() {
    // Check if light theme is active
    const isLightTheme = document.body.classList.contains('light-theme');
    
    // Set colors based on theme
    const chartLegendColor = isLightTheme ? '#6c757d' : '#e0e0e0';
    const chartAxesColor = isLightTheme ? '#6c757d' : '#aaa';
    const chartGridColor = isLightTheme ? '#dee2e6' : '#444444';

    // Destroy existing charts if they exist
    if (malwareTypesChart) {
        malwareTypesChart.destroy();
    }
    if (topMalwareChart) {
        topMalwareChart.destroy();
    }

    // Create Malware Types Chart (Doughnut)
    const typesCtx = document.getElementById('malwareTypesChart');
    if (typesCtx) {
        malwareTypesChart = new Chart(typesCtx, {
            type: 'doughnut',
            data: {
                labels: ['PE (exe/dll)', 'JavaScript', 'VBS', 'Macro', 'Other'],
                datasets: [{
                    label: 'Submission Types',
                    data: [65, 15, 8, 7, 5],
                    backgroundColor: [
                        '#007bff', // Blue
                        '#f1c40f', // Yellow
                        '#e74c3c', // Red
                        '#9b59b6', // Purple
                        '#34495e'  // Gray
                    ],
                    borderColor: '#2a2a2e',
                    borderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: chartLegendColor,
                            boxWidth: 20
                        }
                    }
                }
            }
        });
    }

    // Create Top Malware Chart (Line)
    const topMalwareCtx = document.getElementById('topMalwareChart');
    if (topMalwareCtx) {
        topMalwareChart = new Chart(topMalwareCtx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
                datasets: [
                    {
                        label: 'Zeus',
                        data: [120, 150, 130, 180, 160],
                        borderColor: '#e74c3c',
                        backgroundColor: '#e74c3c20',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'WannaCry',
                        data: [80, 90, 110, 100, 130],
                        borderColor: '#007bff',
                        backgroundColor: '#007bff20',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Emotet',
                        data: [50, 60, 80, 70, 90],
                        borderColor: '#f1c40f',
                        backgroundColor: '#f1c40f20',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: chartLegendColor
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: chartAxesColor },
                        grid: { color: chartGridColor + '50' }
                    },
                    y: {
                        ticks: { color: chartAxesColor },
                        grid: { color: chartGridColor }
                    }
                }
            }
        });
    }
};

// --- NAVIGATION FUNCTIONS ---
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-scan-btn');
    const nextBtn = document.getElementById('next-scan-btn');
    const navInfo = document.getElementById('nav-info');
    
    if (!prevBtn || !nextBtn) return;
    
    // Disable/enable buttons based on position
    prevBtn.disabled = currentHistoryIndex <= 0;
    nextBtn.disabled = currentHistoryIndex >= scanHistory.length - 1;
    
    // Update info text
    if (navInfo && scanHistory.length > 0) {
        navInfo.textContent = `${currentHistoryIndex + 1} of ${scanHistory.length}`;
    }
}

function showPreviousScan() {
    if (currentHistoryIndex > 0) {
        currentHistoryIndex--;
        lastScanResult = scanHistory[currentHistoryIndex];
        renderScanResult();
        updateNavigationButtons();
    }
}

function showNextScan() {
    if (currentHistoryIndex < scanHistory.length - 1) {
        currentHistoryIndex++;
        lastScanResult = scanHistory[currentHistoryIndex];
        renderScanResult();
        updateNavigationButtons();
    }
}

// Initialize history from electron-store on load
async function initializeScanHistory() {
    try {
        const storedHistory = await window.electronAPI.getHistory();
        if (storedHistory && Array.isArray(storedHistory)) {
            scanHistory = storedHistory;
            currentHistoryIndex = scanHistory.length - 1;
        }
    } catch (error) {
        console.error('Failed to load scan history:', error);
    }
}

// --- Run on Page Load ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Animate Stat Cards
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const target = +stat.getAttribute('data-target');
        const duration = 2000;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = target / steps;
        let current = 0;

        const updateCount = () => {
            current += increment;
            if (current < target) {
                stat.textContent = Math.ceil(current).toLocaleString();
                setTimeout(updateCount, stepTime);
            } else {
                stat.textContent = target.toLocaleString();
            }
        };
        updateCount();
    });

    // 2. Create the charts
    recreateCharts();
    
    // 3. Initialize scan history
    initializeScanHistory();
    
    // 4. Setup navigation button handlers
    const prevBtn = document.getElementById('prev-scan-btn');
    const nextBtn = document.getElementById('next-scan-btn');
    
    if (prevBtn) prevBtn.addEventListener('click', showPreviousScan);
    if (nextBtn) nextBtn.addEventListener('click', showNextScan);
});
